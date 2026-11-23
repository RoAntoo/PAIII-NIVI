package ar.edu.nivi.app;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.List;

@CapacitorPlugin(name = "NiviVoiceRecognition", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class NiviVoiceRecognitionPlugin extends Plugin {
    private static final long LISTEN_TIMEOUT_MS = 45_000;
    private static final long RESULT_TIMEOUT_MS = 10_000;
    private final Handler mainThread = new Handler(Looper.getMainLooper());
    private Session active;
    private boolean inForeground;

    @PluginMethod
    public void available(PluginCall call) {
        mainThread.post(() -> call.resolve(new JSObject().put(
            "available", SpeechRecognizer.isRecognitionAvailable(getContext())
        )));
    }

    @PluginMethod
    public void start(PluginCall call) {
        mainThread.post(() -> startRecognition(call));
    }

    private void startRecognition(PluginCall call) {
        if (!inForeground) {
            call.reject("Activity is not in the foreground", "CANCELED");
            return;
        }
        if (active != null) {
            call.reject("A recognition session is in progress", "BUSY");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission is required", "PERMISSION");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("No recognition service is available", "UNAVAILABLE");
            return;
        }

        Intent options = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "es-AR"))
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            Session session = new Session(call);
            active = session;
            session.recognizer.setRecognitionListener(session);
            mainThread.postDelayed(session.deadline, LISTEN_TIMEOUT_MS);
            session.recognizer.startListening(options);
        } catch (SecurityException exception) {
            rejectStart(call, "PERMISSION");
        } catch (RuntimeException exception) {
            rejectStart(call, "UNAVAILABLE");
        }
    }

    private void rejectStart(PluginCall call, String code) {
        if (active != null) release(active, true);
        call.reject("Could not start speech recognition", code);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        mainThread.post(() -> {
            if (active != null) active.stopListening();
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        mainThread.post(() -> {
            cancelActive();
            call.resolve();
        });
    }

    @Override
    protected void handleOnResume() {
        inForeground = true;
    }

    @Override
    protected void handleOnPause() {
        inForeground = false;
        cancelActive();
    }

    @Override
    protected void handleOnDestroy() {
        inForeground = false;
        cancelActive();
    }

    private void cancelActive() {
        if (active != null) active.fail("CANCELED", true);
    }

    private void release(Session session, boolean cancel) {
        active = null;
        mainThread.removeCallbacks(session.deadline);
        try {
            if (cancel) session.recognizer.cancel();
        } finally {
            session.recognizer.destroy();
        }
    }

    private String errorCode(int error) {
        return switch (error) {
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "PERMISSION";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "LANGUAGE";
            case SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "NETWORK";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "NO_AUDIO";
            case SpeechRecognizer.ERROR_NO_MATCH -> "EMPTY";
            case SpeechRecognizer.ERROR_AUDIO -> "AUDIO";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "BUSY";
            case SpeechRecognizer.ERROR_SERVER, SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "UNAVAILABLE";
            default -> "FAILED";
        };
    }

    private final class Session implements RecognitionListener {
        private final PluginCall call;
        private final SpeechRecognizer recognizer;
        private final Runnable deadline = this::onDeadline;
        private boolean finishing;

        private Session(PluginCall call) {
            this.call = call;
            this.recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        }

        private void stopListening() {
            if (finishing) return;
            awaitResults();
            try {
                recognizer.stopListening();
            } catch (RuntimeException exception) {
                fail("FAILED", true);
            }
        }

        private void awaitResults() {
            finishing = true;
            mainThread.removeCallbacks(deadline);
            mainThread.postDelayed(deadline, RESULT_TIMEOUT_MS);
        }

        private void onDeadline() {
            if (active != this) return;
            if (finishing) fail("TIMEOUT", true);
            else stopListening();
        }

        private void fail(String code, boolean cancel) {
            if (active != this) return;
            release(this, cancel);
            call.reject("Speech recognition ended without a result", code);
        }

        @Override
        public void onResults(Bundle results) {
            if (active != this) return;
            List<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            String transcript = matches == null || matches.isEmpty() ? "" : matches.get(0);
            release(this, false);
            call.resolve(new JSObject().put("transcript", transcript));
        }

        @Override public void onError(int error) { fail(errorCode(error), false); }
        @Override public void onEndOfSpeech() { if (active == this && !finishing) awaitResults(); }
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onPartialResults(Bundle partialResults) {}
        @Override public void onEvent(int eventType, Bundle params) {}
    }
}
