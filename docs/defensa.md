# NIVI · Guía de defensa

NIVI ayuda a registrar y organizar tareas sin tener que escribir cada ítem. Una persona puede cargar tareas manualmente, dictarlas, leer una lista con OCR o importar una plantilla QR. También puede buscar lugares cuando una tarea requiere una visita, programar recordatorios y seguir trabajando con las tareas que ya abrió aunque pierda la conexión.

## Arquitectura

- **Frontend** con Angular, Ionic y Capacitor. Android incorpora reconocimiento de voz, lectura de imágenes/QR, ubicación aproximada y notificaciones locales.
- **Backend** con Java 21, Spring Boot, JPA/Hibernate y H2. Las rutas de proyectos y tareas requieren JWT. Las consultas de lugares usan una clave de servidor de Google Places. [Configuración de lugares](pr04-lugares.md)
- **Modo sin conexión** con IndexedDB en el WebView. Cada operación y su cambio visible se guardan en una transacción local. Las tareas y la cola se separan por cuenta y URL del backend.
- **Sincronización** en primer plano, al volver a abrir NIVI, recuperar red o pulsar **Reintentar sincronización**. Las altas conservan un UUID y las ediciones y borrados usan la versión del servidor con `If-Match`. Los fallos transitorios se reintentan con espera creciente hasta cuatro intentos. Un conflicto conserva el cambio local, que se puede revisar y descartar antes de editar la última versión disponible. Los borrados pendientes quedan ocultos aunque se vuelva a cargar la lista.
- **Recordatorios** con `@capacitor/local-notifications`. NIVI guarda el instante en UTC y muestra la fecha y hora local. Revisa los permisos al elegir el recordatorio, cancela el aviso cuando se completa o borra una tarea y reconcilia los avisos al iniciar o volver a primer plano. Desactivar **Recordatorios** en Ajustes cancela los avisos pendientes del dispositivo. Las fechas futuras conservadas pueden reprogramarse al activar el módulo.

## Instalación

Cloná el repositorio y seguí [la guía de Android](android-setup.md) para configurar Node.js, Java 21, Android Studio, SDK y el backend. Definí `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_JWT_SECRET` y `CORS_ALLOWED_ORIGINS` en el proceso del backend. Para la demostración de lugares también hace falta `GOOGLE_PLACES_API_KEY`.

Desde la raíz, en PowerShell:

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend test -- --watch=false
Push-Location backend
.\mvnw.cmd verify
Pop-Location
Push-Location frontend
$env:NIVI_API_URL = 'http://10.0.2.2:8081'
$env:NIVI_ALLOW_HTTP = 'true'
npm.cmd run android:build
Pop-Location
```

La URL de ejemplo apunta al equipo anfitrión desde el emulador. Para un celular usá la IP LAN del backend o un endpoint HTTPS accesible. El APK de depuración se genera en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Para pruebas de frontend con timeouts en rutas, ver [la configuración temporal de Vitest](pr04-lugares.md#verificación).

## Demostración

1. Iniciá sesión y abrí un proyecto en la app. Activá **Tareas sin conexión** en Ajustes. Volvé al proyecto y abrí su lista para guardarla en el dispositivo.
2. Creá una tarea con **Recordarme** y elegí una fecha y hora futuras. Permití notificaciones y mandá la app a segundo plano o quitála de recientes. Tocá la notificación y verificá que abra la tarea. Editá la fecha y comprobá que el aviso anterior se reemplazó.
3. Denegá permiso en Android y probá programar otro aviso. Comprobá que podés guardar la tarea. Completá otra tarea con recordatorio y verificá la cancelación.
4. Con la lista ya abierta, activá modo avión. Creá «Comprar clavos», editá otra tarea, completá una tercera y borrá una cuarta. Revisá el indicador de sincronización y comprobá que la tarea borrada queda oculta.
5. Forzá el cierre y abrí NIVI todavía en modo avión. Verificá la cola y el contenido de la lista. Recuperá red y, si NIVI lo pide, volvé a iniciar sesión. Comprobá en el servidor que los cambios se aplicaron una sola vez y que reintentar conserva el mismo resultado.
6. Cambiá desde otro cliente una tarea que tenga una edición pendiente en el dispositivo. Confirmá que aparece el conflicto. Revisá el listado y descartá el cambio local si querés recuperar la versión del servidor.
7. Repetí el dictado en español, la importación de una lista con OCR/QR y la búsqueda de ferreterías o laboratorios. Verificá los controles de Ajustes, la carga manual y la salida al mapa.

## Límites y seguridad

- Android puede retrasar los avisos por batería o reposo. Se usan alarmas inexactas. Forzar la detención desde Ajustes de Android puede impedir recibir avisos hasta reabrir la app. La experiencia de recordatorios se ofrece en Android.
- El modo offline requiere haber iniciado sesión y abierto el proyecto con conexión. Reiniciar la app sin internet permite el acceso local en este dispositivo. Para sincronizar hace falta una sesión válida y que el backend responda. Los datos pendientes pueden perderse al desinstalar o al borrar los datos de la app.
- Cerrar sesión oculta los datos locales. Los cambios pendientes de la misma cuenta vuelven a estar disponibles cuando se autentica de nuevo. El identificador local de cuenta sirve para abrir el caché. El JWT expira y permanece en `sessionStorage`.
- Se empaqueta un APK de depuración para validar el proyecto. La firma de publicación, sincronización en segundo plano con la app terminada y resolución automática de conflictos quedan para una etapa futura.

## Validación de desarrollo

En un emulador Pixel 8 con Android 17 se observó la entrega de un recordatorio local con NIVI en segundo plano. Al tocarlo, la app abrió la edición de la tarea. En modo avión se creó y completó una tarea y se borró otra. Tras cerrar el proceso y reabrir NIVI, la lista conservó los tres cambios. Al recuperar la red y autenticarse, el servidor devolvió una sola tarea, completada, y el borrado se mantuvo.

La validación en un celular físico y la demo de resultados reales de Google Places siguen pendientes.
