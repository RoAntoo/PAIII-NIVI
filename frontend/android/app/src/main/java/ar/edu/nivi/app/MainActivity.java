package ar.edu.nivi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NiviVoiceRecognitionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
