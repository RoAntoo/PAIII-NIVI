package ar.edu.nivi.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import androidx.exifinterface.media.ExifInterface;
import com.google.android.gms.tasks.Task;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Arrays;
import java.util.stream.Collectors;

final class OcrImageReader {
    static final long MAX_BYTES = 20L * 1024 * 1024;
    private static final int MAX_DIMENSION = 12_000;
    private static final long MAX_PIXELS = 80_000_000;
    private static final int MAX_DECODE_SIDE = 2800;
    private static final List<String> FORMATS = Arrays.asList("image/jpeg", "image/png", "image/webp");

    Task<Text> recognize(File file) throws IOException {
        Bitmap bitmap = load(file);
        var recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        try {
            return recognizer.process(InputImage.fromBitmap(bitmap, 0)).addOnCompleteListener(task -> {
                recognizer.close();
                bitmap.recycle();
            });
        } catch (RuntimeException error) {
            recognizer.close();
            bitmap.recycle();
            throw error;
        }
    }

    static List<String> lines(Text text) {
        return text.getTextBlocks().stream()
            .flatMap(block -> block.getLines().stream())
            .map(Text.Line::getText)
            .collect(Collectors.toList());
    }

    private Bitmap load(File file) throws IOException {
        if (file.length() > MAX_BYTES) throw new IOException("IMAGE_LIMIT");
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
        if (bounds.outMimeType == null || !FORMATS.contains(bounds.outMimeType)
            || bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IOException("IMAGE_FORMAT");
        }
        int longest = Math.max(bounds.outWidth, bounds.outHeight);
        if (longest > MAX_DIMENSION || (long) bounds.outWidth * bounds.outHeight > MAX_PIXELS) {
            throw new IOException("IMAGE_LIMIT");
        }

        BitmapFactory.Options decode = new BitmapFactory.Options();
        decode.inSampleSize = 1;
        while ((longest + decode.inSampleSize - 1) / decode.inSampleSize > MAX_DECODE_SIDE) {
            decode.inSampleSize *= 2;
        }
        Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), decode);
        if (bitmap == null) throw new IOException("IMAGE_FORMAT");
        return orient(bitmap, file);
    }

    private Bitmap orient(Bitmap bitmap, File file) {
        ExifInterface exif;
        try {
            exif = new ExifInterface(file);
        } catch (IOException ignored) {
            return bitmap;
        }
        int rotation = exif.getRotationDegrees();
        if (rotation == 0 && !exif.isFlipped()) return bitmap;
        Matrix matrix = new Matrix();
        if (exif.isFlipped()) matrix.setScale(-1, 1);
        matrix.postRotate(rotation);
        try {
            Bitmap oriented = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
            if (oriented != bitmap) bitmap.recycle();
            return oriented;
        } catch (RuntimeException error) {
            bitmap.recycle();
            throw error;
        }
    }
}
