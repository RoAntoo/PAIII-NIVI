package ar.edu.nivi.app;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NiviTaskImport", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
})
public class NiviTaskImportPlugin extends Plugin {
    private static final String[] IMAGE_TYPES = { "image/jpeg", "image/png", "image/webp" };
    private static final long STALE_AFTER_MS = 60 * 60 * 1000L;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final ScanContract scanner = new ScanContract();
    private boolean busy;
    private File cameraFile;

    @PluginMethod
    public void readPhoto(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String source = call.getString("source");
            if ("camera".equals(source)) openCamera(call);
            else if ("gallery".equals(source)) openGallery(call);
            else call.reject("Unknown image source", "IMAGE_FORMAT");
        });
    }

    @PluginMethod
    public void scanQr(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!checkCamera(call) || !begin(call)) return;
            ScanOptions options = new ScanOptions()
                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                .setPrompt("Encuadrá el código QR de NIVI")
                .setBeepEnabled(false)
                .setOrientationLocked(false);
            launch(call, scanner.createIntent(getContext(), options), "qrResult");
        });
    }

    private void openCamera(PluginCall call) {
        if (!checkCamera(call) || !begin(call)) return;
        try {
            cameraFile = temporaryPhoto();
            Uri output = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", cameraFile);
            Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, output)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            capture.setClipData(ClipData.newRawUri("NIVI", output));
            launch(call, capture, "cameraResult");
        } catch (IOException | RuntimeException error) {
            discardCameraFile();
            fail(call, "IMAGE_READ");
        }
    }

    private void openGallery(PluginCall call) {
        if (!begin(call)) return;
        Intent picker = new Intent(Intent.ACTION_GET_CONTENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("image/*")
            .putExtra(Intent.EXTRA_MIME_TYPES, IMAGE_TYPES);
        launch(call, picker, "galleryResult");
    }

    private boolean begin(PluginCall call) {
        if (busy) {
            call.reject("An import is in progress", "BUSY");
            return false;
        }
        busy = true;
        return true;
    }

    private boolean checkCamera(PluginCall call) {
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            call.reject("No camera available", "UNAVAILABLE");
            return false;
        }
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("Camera permission is required", "PERMISSION");
            return false;
        }
        return true;
    }

    private void launch(PluginCall call, Intent intent, String callback) {
        try {
            startActivityForResult(call, intent, callback);
        } catch (SecurityException error) {
            discardCameraFile();
            fail(call, "PERMISSION");
        } catch (RuntimeException error) {
            discardCameraFile();
            fail(call, "UNAVAILABLE");
        }
    }

    @ActivityCallback
    private void cameraResult(PluginCall call, ActivityResult result) {
        File photo = cameraFile;
        cameraFile = null;
        if (!resultReady(call, result)) {
            if (photo != null) photo.delete();
        } else if (photo == null) {
            fail(call, "IMAGE_READ");
        } else {
            io.execute(() -> recognize(call, photo));
        }
    }

    @ActivityCallback
    private void galleryResult(PluginCall call, ActivityResult result) {
        if (!resultReady(call, result)) return;
        Uri selected = result.getData() == null ? null : result.getData().getData();
        if (selected == null || !"content".equals(selected.getScheme())) {
            fail(call, "IMAGE_READ");
            return;
        }
        io.execute(() -> copyAndRecognize(call, selected));
    }

    @ActivityCallback
    private void qrResult(PluginCall call, ActivityResult result) {
        if (!resultReady(call, result)) return;
        String value = scanner.parseResult(result.getResultCode(), result.getData()).getContents();
        if (value == null || value.trim().isEmpty() || value.length() > 1024) {
            fail(call, "QR_FORMAT");
        } else {
            busy = false;
            call.resolve(new JSObject().put("value", value));
        }
    }

    private boolean resultReady(PluginCall call, ActivityResult result) {
        if (call == null) {
            busy = false;
            return false;
        }
        if (result.getResultCode() == Activity.RESULT_OK) return true;
        fail(call, "CANCELED");
        return false;
    }

    private void copyAndRecognize(PluginCall call, Uri uri) {
        File photo = null;
        try {
            photo = temporaryPhoto();
            try (InputStream image = getContext().getContentResolver().openInputStream(uri);
                 FileOutputStream output = new FileOutputStream(photo)) {
                if (image == null) throw new IOException("IMAGE_READ");
                byte[] buffer = new byte[8192];
                long size = 0;
                for (int count; (count = image.read(buffer)) != -1;) {
                    size += count;
                    if (size > OcrImageReader.MAX_BYTES) throw new IOException("IMAGE_LIMIT");
                    output.write(buffer, 0, count);
                }
            }
            recognize(call, photo);
        } catch (IOException | RuntimeException error) {
            if (photo != null) photo.delete();
            String code = "IMAGE_LIMIT".equals(error.getMessage()) ? "IMAGE_LIMIT" : "IMAGE_READ";
            getActivity().runOnUiThread(() -> fail(call, code));
        }
    }

    private void recognize(PluginCall call, File photo) {
        try {
            new OcrImageReader().recognize(photo).addOnCompleteListener(task -> {
                busy = false;
                if (task.isSuccessful()) call.resolve(new JSObject().put("lines", new JSArray(OcrImageReader.lines(task.getResult()))));
                else fail(call, "OCR_FAILED");
            });
        } catch (IOException error) {
            getActivity().runOnUiThread(() -> fail(call, error.getMessage()));
        } catch (RuntimeException error) {
            getActivity().runOnUiThread(() -> fail(call, "OCR_FAILED"));
        } finally {
            photo.delete();
        }
    }

    private File temporaryPhoto() throws IOException {
        File cache = new File(getContext().getCacheDir(), "nivi-ocr");
        if (!cache.isDirectory() && !cache.mkdirs()) throw new IOException("IMAGE_READ");
        File[] leftovers = cache.listFiles();
        if (leftovers != null) {
            long cutoff = System.currentTimeMillis() - STALE_AFTER_MS;
            for (File file : leftovers) {
                if (file.isFile() && file.getName().startsWith("list-") && file.lastModified() < cutoff) file.delete();
            }
        }
        return File.createTempFile("list-", ".jpg", cache);
    }

    private void discardCameraFile() {
        if (cameraFile != null) {
            cameraFile.delete();
            cameraFile = null;
        }
    }

    private void fail(PluginCall call, String code) {
        busy = false;
        call.reject("Task import could not finish", code);
    }

    @Override
    protected void handleOnDestroy() {
        discardCameraFile();
        io.shutdown();
    }
}
