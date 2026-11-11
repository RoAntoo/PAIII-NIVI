# Frontend NIVI

Angular 21 standalone, Ionic 9 y Capacitor 8. Requiere Node.js 24. Desde este directorio:

```powershell
npm ci
npm start
npm test -- --watch=false
npm run build
```

Se conservan npm run start:ionic y npm run build:ionic. No hay script de lint.

features/projects y features/tasks reúnen modelos, acceso HTTP y páginas. Home compone sus consultas. features/auth contiene el login; core/auth conserva la sesión, protege rutas y agrega JWT exclusivamente a peticiones de la API configurada. shared/ui mantiene el modal de confirmación accesible. Se conserva RouterOutlet de Angular y la ejecución sin Zone.js.

El backend requiere AUTH_USERNAME, AUTH_PASSWORD y AUTH_JWT_SECRET; ver ../README.md. La sesión se guarda en sessionStorage y se limpia al cerrar sesión, vencer o recibir 401. No se guardan contraseñas. Volver a abrir la app puede requerir login; los ajustes persisten de forma independiente.

environment.ts configura producción (/api); environment.development.ts usa http://127.0.0.1:8081. public/runtime-config.js permite definir window.NIVI_CONFIG = { apiUrl: 'https://TU-API' } sin recompilar la web. Se carga después del elemento base. Esa configuración es pública y no debe contener secretos. El despliegue web necesita proxy /api y fallback SPA; consultar el README raíz.

## Android — PR 01

Capacitor core/CLI/Android 8.6.0 y Preferences 8.0.1 fijados. Proyecto nativo en android/, appId ar.edu.nivi.app, appName NIVI. El build Angular se empaqueta desde dist/frontend-tareas-proyectos/browser.

```powershell
$env:NIVI_API_URL = 'http://10.0.2.2:8081' # Emulador; usar IP LAN para celular.
$env:NIVI_ALLOW_HTTP = 'true' # Desarrollo debug exclusivamente.
npm run android:sync
npm run android:open
# Con SDK y JDK 21 disponibles:
npm run android:build
npm run android:run
```

Los scripts Android exigen una API absoluta, preparan solo el bundle generado y conservan public/runtime-config.js. HTTPS por defecto; HTTP solo debug con opt-in. Para release, quitar NIVI_ALLOW_HTTP y usar una API HTTPS. CORS debe permitir el origen https://localhost del WebView.

La guía completa de SDK, JDK, red local, permisos y checklist está en [android-setup.md](../docs/android-setup.md). El proyecto fue generado/sincronizado, pero el APK y las pruebas físicas quedan pendientes porque el entorno de implementación no tiene SDK Android configurado.

## Servicios y pruebas

TaskService centraliza CRUD, validación previa a HTTP, timeout y mapeo compatible de DTO antiguos. Se conservan horas, responsable, estados e IDs. PR 01 incorpora categoría, origen, edición de estado y eliminación confirmada.

SettingsService persiste seis flags con Preferences (SharedPreferences nativo, localStorage web). Sugerencias de lugares y offline empiezan desactivados. Los módulos futuros están señalados como pendientes y no tienen acciones simuladas. DeviceCapabilitiesService combina implementación, preferencia y disponibilidad del plugin; los permisos se pedirán al iniciar cada función cuando esté implementada.

Bootstrap y Bootstrap Icons se empaquetan localmente; no se requieren CDN para mostrar la interfaz. El CRUD necesita conexión hasta PR 05. La paleta usa los tokens NIVI sin rediseñar las páginas existentes.

Verificación PR 01: 41 tests frontend y build de producción aprobados; detalles y limitaciones en [pr01-base.md](../docs/pr01-base.md). Si Vitest falla con EPERM en temporales, crear .angular/test-temp y configurar TEMP/TMP a esa ruta para repetir. Persisten warnings de tamaño CSS y uno de tamaño inicial por los recursos locales. npm audit reportó 60 alertas; su corrección queda en una revisión de dependencias separada.
