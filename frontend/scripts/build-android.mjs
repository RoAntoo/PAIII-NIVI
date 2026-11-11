import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const windows = process.platform === 'win32';
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || (windows ? join(homedir(), 'AppData/Local/Android/Sdk')
    : process.platform === 'darwin' ? join(homedir(), 'Library/Android/sdk') : join(homedir(), 'Android/Sdk'));
if (!existsSync(sdk) && !existsSync(new URL('../android/local.properties', import.meta.url))) {
  throw new Error('No se encontró Android SDK. Instalalo con Android Studio y configurá ANDROID_HOME (ver docs/android-setup.md).');
}
const result = spawnSync(windows ? 'cmd.exe' : 'sh',
  windows ? ['/d', '/c', 'gradlew.bat assembleDebug'] : ['gradlew', 'assembleDebug'],
  { cwd: new URL('../android/', import.meta.url), stdio: 'inherit',
    env: { ...process.env, ...(existsSync(sdk) ? { ANDROID_HOME: sdk } : {}) } });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
