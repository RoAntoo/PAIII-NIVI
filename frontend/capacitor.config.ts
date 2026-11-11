import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.edu.nivi.app',
  appName: 'NIVI',
  webDir: 'dist/frontend-tareas-proyectos/browser',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: process.env['NIVI_ALLOW_HTTP'] === 'true' },
};

export default config;
