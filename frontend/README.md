# Frontend Nivi

Angular 21 y Node.js 24. Ejecutar npm ci, npm start, npm test -- --watch=false y npm run build desde este directorio.

features/projects y features/tasks reúnen modelos, acceso HTTP y páginas. Home compone consultas de esas funcionalidades. features/auth contiene el login; core/auth conserva la sesión, protege las rutas y agrega el JWT exclusivamente a peticiones de la API configurada. shared/ui contiene el modal de confirmación con control de foco, Tab, Escape y restauración del foco.

El backend debe tener AUTH_USERNAME, AUTH_PASSWORD y AUTH_JWT_SECRET configurados; consultar ../README.md. La sesión se guarda en sessionStorage y se elimina al cerrar sesión, vencer o recibir 401. No se guardan contraseñas. El retorno después del login se limita a rutas internas.

environment.ts configura producción (/api); environment.development.ts usa http://127.0.0.1:8081. public/runtime-config.js permite definir window.NIVI_CONFIG = { apiUrl: 'https://TU-API' } sin recompilar. Se carga después del elemento base para resolver correctamente las rutas internas. No incluir secretos en ese archivo.

El despliegue debe configurar proxy para /api/projects y /api/auth, retirando /api antes de reenviar al backend, y fallback SPA a index.html. El servidor debe permitir el origen exacto del cliente por CORS.

Home solicita hasta tres proyectos con contadores calculados por el backend. Su progreso usa completedTasks / totalTasks, con 0% cuando no hay tareas. Los textos tienen un máximo de 255 caracteres y las horas son enteros positivos. Los estilos, fuentes e iconos externos siguen usando CDN.

Las pruebas cubren rutas protegidas, sesión y expiración, envío del token, validaciones, errores de guardado, confirmación de borrado, progreso y navegación con teclado. Ver ../docs/ESTADO_ACTUAL.md para los resultados vigentes.

## Integración Ionic — 11 de noviembre de 2026

Ionic Angular 9.0.10 está configurado con componentes standalone y provideIonicAngular. La estructura principal usa IonApp, IonHeader, IonToolbar e IonContent; el acceso usa IonButton e IonSpinner. Los estilos de Ionic están incluidos y conservan la paleta Nivi. Bootstrap continúa dando formato a las páginas existentes.

Se mantiene RouterOutlet de Angular para conservar la destrucción de páginas, las suscripciones y el comportamiento del login; no se incorporó una pila de navegación con caché. Angular continúa funcionando sin cargar Zone.js; el paquete se instala por compatibilidad con los peer dependencies de Ionic.

Desde frontend/: npm run start:ionic (puerto 4200, compatible con CORS local) y npm run build:ionic. También se conservan npm start y npm run build. ionic.config.json identifica el proyecto; los scripts pasan su nombre Angular explícitamente porque Ionic CLI 7 usa app por defecto.

Verificación: 16 pruebas frontend aprobadas y build de producción mediante Ionic CLI aprobado. Se mantienen los tres avisos CSS anteriores. No se agregaron proyectos nativos Android/iOS ni Capacitor; la integración actual es web y no genera un APK.

La auditoría npm de las dependencias instaladas reportó 52 alertas (3 críticas, 22 altas, 25 moderadas y 2 bajas). El informe no atribuye alertas a @ionic/angular; las críticas aparecen en piscina, proxy-addr y tar. Su actualización requiere una revisión de dependencias separada.
