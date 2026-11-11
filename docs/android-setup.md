# Android — NIVI PR 01

El proyecto conserva Angular 21 + Ionic 9. Capacitor core/CLI/Android 8.6.0 y Preferences 8.0.1 están fijados en package-lock.json. App ID: `ar.edu.nivi.app`; nombre: **NIVI**; contenido web empaquetado, sin servidor de live reload.

## Requisitos

- Node.js 24 (Capacitor requiere 22 o posterior).
- JDK 21 y Android Studio compatible con el AGP configurado. Build debug verificado localmente con AGP 9.5.1 y Android Studio instalado.
- SDK Android Platform 36, Build Tools, Platform Tools y un emulador o celular con depuración USB. SDK mínimo de la app: API 24 (Android 7).
- Gradle Wrapper 9.6.0 incluido. Su primera ejecución y la descarga de dependencias requieren internet.
- Backend Java 21 y H2 con las variables de autenticación del README configuradas. `.env.example` es referencia: no se carga automáticamente.

La configuración concreta del template instalado está en `frontend/android/variables.gradle` y `gradle/wrapper/gradle-wrapper.properties`. No instalar plugins de los PR siguientes todavía.

## Backend y conectividad

En la terminal del backend, además de `AUTH_USERNAME`, `AUTH_PASSWORD` y `AUTH_JWT_SECRET`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:4200,http://127.0.0.1:4200,https://localhost'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

El WebView empaquetado usa el origen **https://localhost**. Ese es el origen que se habilita en CORS, aunque la API esté en otra IP. El frontend continúa enviando el JWT solamente a la API configurada. La sesión conserva el comportamiento actual en sessionStorage: puede ser necesario volver a iniciar sesión al reiniciar la app; los ajustes se guardan por separado.

Para emulador Android, el host suele alcanzarse por `http://10.0.2.2:8081`. Para celular físico, usar la IP LAN del equipo que ejecuta el backend y conectar ambos a la misma red. `localhost` y `127.0.0.1` en el celular apuntan al propio celular. Verificar que el backend escuche en la interfaz adecuada y que el firewall permita el puerto en la red de desarrollo. También se puede usar `adb reverse tcp:8081 tcp:8081` por USB y configurar `http://127.0.0.1:8081` deliberadamente para ese caso.

Usar HTTPS con certificado válido fuera de la red local. No se desactiva la validación de certificados ni se configura CORS con `*`.

## Sincronización y APK debug

En otra terminal, desde la raíz del repositorio:

```powershell
npm --prefix frontend ci
Set-Location frontend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NIVI_API_URL = 'http://10.0.2.2:8081' # Reemplazar por la IP LAN para celular físico.
$env:NIVI_ALLOW_HTTP = 'true'             # Solo para desarrollo HTTP.
npm run android:build
```

El script ejecuta build Angular, escribe la URL **solo en el bundle generado**, sincroniza Capacitor y ejecuta `assembleDebug`. Salida: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. No se versionan APK, assets generados, cachés, SDK, rutas locales ni claves de firma.

```powershell
npm run android:open # Abrir el proyecto existente en Android Studio.
npm run android:run  # Sincronizar e instalar/ejecutar en un target disponible.
# O instalar el APK ya compilado:
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Después de cambiar código, URL o flags de desarrollo, ejecutar `npm run android:sync` antes de compilar desde Android Studio. El script exige `NIVI_API_URL` para evitar que Android intente usar `/api` en el servidor local del WebView. `npm start` y `npm run build` mantienen las configuraciones web anteriores; `public/runtime-config.js` sigue disponible para despliegues web.

## HTTPS y release

```powershell
$env:NIVI_API_URL = 'https://TU-API-ALCANZABLE'
Remove-Item Env:NIVI_ALLOW_HTTP -ErrorAction SilentlyContinue
npm run android:sync
```

El manifiesto principal rechaza tráfico HTTP. Un manifiesto exclusivo de **debug** permite HTTP; `NIVI_ALLOW_HTTP=true` también habilita contenido mixto en el WebView de desarrollo. `preReleaseBuild` rechaza bundles con HTTP o contenido mixto habilitado. Esta protección está implementada; su ejecución de release aún no se validó. Este PR no configura firma release ni Play Store.

Único permiso declarado: `INTERNET`. Preferences usa SharedPreferences sin permisos de ejecución. No se piden cámara, micrófono, ubicación ni notificaciones al iniciar. El backup Android está desactivado. Preferencias y datos no sincronizados pueden perderse al desinstalar.

## Verificación y registro de dispositivo

Antes de ejecutar este bloque, volvé a la **raíz del repositorio**: los pasos anteriores dejan la terminal en `frontend/`. Desde allí, usá `Set-Location ..`. Los comandos siguientes usan rutas relativas a la raíz.

```powershell
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build
Set-Location backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
.\mvnw.cmd verify '-Dnivi.build.directory=target-audit'
```

No hay script de lint en este repositorio. Si Vitest falla con `EPERM` al renombrar temporales, desde `frontend/` crear `.angular/test-temp` y establecer `TEMP` y `TMP` a esa ruta antes de repetir el mismo comando de tests.

Completar en un celular real antes de aceptar PR 01:

- [ ] Registrar modelo, versión de Android, versión de WebView, fecha y evidencia (capturas/video).
- [ ] Instalar APK; verificar nombre NIVI y autenticación con el backend alcanzable.
- [ ] Crear un proyecto abierto y la tarea «Comprar tornillos»; editar categoría/título y marcarla completada. Verificar contadores y fecha de finalización.
- [ ] Eliminar otra tarea con confirmación; cancelar primero para verificar que no se borra.
- [ ] Cerrar/abrir; volver a iniciar sesión si corresponde y recuperar tareas del backend.
- [ ] Cambiar una preferencia, forzar cierre, abrir y comprobar que persiste.
- [ ] Apagar el backend: lista/guardado/borrado informan errores y no muestran éxito. Reiniciar y reintentar.
- [ ] Verificar que los módulos futuros indiquen su disponibilidad pendiente y que ninguno solicite permisos.
- [ ] Verificar navegación Atrás, teclado, scroll y áreas táctiles en pantalla pequeña.

**Estado verificado (11/11/2026):** Android Studio y SDK 36 instalados. `cap sync android` y `assembleDebug` aprobados con Preferences real, JDK 21, AGP 9.5.1 y Gradle 9.6.0. APK en `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (4,923,581 bytes), firma v2 verificada y nombre NIVI confirmado. El bundle usa `http://10.0.2.2:8081` para el backend del emulador; para celular físico debe recompilarse con la IP LAN o un backend HTTPS alcanzable. ADB no detecta dispositivos. La ejecución y el checklist físico siguen pendientes.

Referencias oficiales consultadas: [entorno de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup), [instalación](https://capacitorjs.com/docs/getting-started), [configuración](https://capacitorjs.com/docs/config) y [Preferences](https://capacitorjs.com/docs/apis/preferences). Las versiones efectivas son las fijadas en este repositorio.
