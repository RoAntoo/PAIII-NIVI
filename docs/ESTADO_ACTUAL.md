# Estado actual — 11 de noviembre de 2026

Este documento es la referencia vigente. ESTADO_REESTRUCTURACION.md y REVISION_BACKEND.md conservan diagnósticos y resultados históricos de otras revisiones; no representan el código actual.

## Mejoras aplicadas

- Login local con JWT, API protegida, respuestas 401 y CORS para autenticación. Cuenta única configurada en el servidor; sin registro ni separación por propietario.
- Credenciales obligatorias AUTH_USERNAME, AUTH_PASSWORD y AUTH_JWT_SECRET. Sin contraseñas ni claves productivas dentro del repositorio.
- Sesión del navegador en sessionStorage, cierre de sesión, expiración, protección de rutas y retorno interno después del login. El interceptor no envía el token a servicios externos.
- runtime-config.js se carga después de base, para que la configuración también se resuelva al abrir una ruta interna directamente.
- Estados de tareas unificados: TODO, IN_PROGRESS y DONE. El script H2 normaliza los registros históricos COMPLETED conservando los tiempos conocidos.
- Errores con código de causa: solo DUPLICATE_RESOURCE se muestra como nombre duplicado; los demás conflictos conservan su mensaje.
- Límites de texto de 255 caracteres en cliente y dominio. Las horas fraccionarias se rechazan sin truncamiento. La validación de una actualización ocurre antes de modificar el objeto.
- Se impide crear y editar tareas en proyectos cerrados. Assignee omitido conserva el valor; null explícito lo borra.
- Listado de proyectos mediante ProjectSummary: campos escalares y contadores en una consulta agregada, sin cargar entidades ni colecciones. Filtros existentes conservados, orden por ID descendente y limit opcional entre 1 y 100 aplicado en SQL.
- Home solicita limit=3, calcula el progreso real con totalTasks/completedTasks y mantiene una segunda petición para las cuatro tareas recientes.
- Modal con semántica de diálogo, foco inicial en cancelar, ciclo de Tab, Escape y restauración del foco. Labels de formularios asociados a sus controles.
- 75 archivos generados de backend/target-review retirados del índice Git; copias locales conservadas. Las salidas de compilación siguen ignoradas.
- Workflow de GitHub Actions para pruebas del backend, pruebas del frontend y build de producción.

## Ejecución y datos existentes

Consultar los README de raíz, backend y frontend. La configuración de API sigue siendo pública; nunca debe incluir credenciales. En producción con /api, el proxy debe retirar el prefijo tanto para /projects como para /auth. CORS_ALLOWED_ORIGINS contiene orígenes exactos separados por comas; los locales por defecto son http://localhost:4200 y http://127.0.0.1:4200.

La clave JWT debe ser aleatoria y contener al menos 32 bytes. La contraseña requiere al menos 12 caracteres y hasta 72 bytes UTF-8. No hay cuenta por defecto. El backend falla al arrancar si la configuración no es válida.

Respaldar la base persistente antes de iniciar una versión con cambios de esquema. El SQL sigue siendo específico de H2 y se ejecuta después de Hibernate; endurece columnas y normaliza el alias de estado. No rellena nulos de negocio. No se ejecutó la aplicación sobre la base persistente del usuario durante esta implementación.

## Verificación local

- Backend: Maven verify, 50 pruebas, sin fallos ni errores; JAR generado en target-audit. Incluye login y JWT real, firmas inválidas, expiración, emisor, permisos anónimos, CORS, longitudes, enteros, proyectos cerrados, migración del estado histórico y conteo de consultas/entidades cargadas.
- Frontend: 16 pruebas aprobadas y build de producción aprobado. Incluye rutas, fechas, sesión, token, expiración, guardado fallido sin pérdida de datos, confirmación de borrado, progreso y foco del modal.
- Las pruebas de backend usan H2 en memoria y credenciales exclusivas de test. No se usaron las credenciales ni la base persistente del usuario.
- CI agregada pero pendiente de ejecución remota cuando se publique la rama o el PR.

Se mantienen tres advertencias de presupuesto CSS ya existentes en Home, listado de proyectos y listado de tareas. No se alteraron los límites para ocultarlas. No se hizo una nueva verificación visual en navegador ni se desplegó la aplicación.

## Alcance pendiente

Recursos CDN locales/offline, migraciones versionadas, paginación completa del listado, OpenAPI, gestión de múltiples usuarios, cambios de estado y otras funciones de producto quedan fuera de esta revisión. Ionic Angular 9.0.10 está integrado en el frontend. El backend tiene un único usuario configurable y JWT de una hora; no hay refresh tokens ni revocación individual.

## Integración Ionic — 11 de noviembre de 2026

Ionic Angular 9.0.10 está configurado con componentes standalone y provideIonicAngular. La estructura principal usa IonApp, IonHeader, IonToolbar e IonContent; el acceso usa IonButton e IonSpinner. Los estilos de Ionic están incluidos y conservan la paleta Nivi. Bootstrap continúa dando formato a las páginas existentes.

Se mantiene RouterOutlet de Angular para conservar la destrucción de páginas, las suscripciones y el comportamiento del login; no se incorporó una pila de navegación con caché. Angular continúa funcionando sin cargar Zone.js; el paquete se instala por compatibilidad con los peer dependencies de Ionic.

Desde frontend/: npm run start:ionic (puerto 4200, compatible con CORS local) y npm run build:ionic. También se conservan npm start y npm run build. ionic.config.json identifica el proyecto; los scripts pasan su nombre Angular explícitamente porque Ionic CLI 7 usa app por defecto.

Verificación: 16 pruebas frontend aprobadas y build de producción mediante Ionic CLI aprobado. Se mantienen los tres avisos CSS anteriores. No se agregaron proyectos nativos Android/iOS ni Capacitor; la integración actual es web y no genera un APK.

La auditoría npm de las dependencias instaladas reportó 52 alertas (3 críticas, 22 altas, 25 moderadas y 2 bajas). El informe no atribuye alertas a @ionic/angular; las críticas aparecen en piscina, proxy-addr y tar. Su actualización requiere una revisión de dependencias separada.
