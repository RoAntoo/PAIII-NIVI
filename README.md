# Nivi — proyectos y tareas

Aplicación Angular 21 + Ionic 9 + Capacitor 8 con API Java 21 / Spring Boot 3.5.7. El estado vigente y las decisiones de alcance están en [docs/ESTADO_ACTUAL.md](docs/ESTADO_ACTUAL.md).

PR 01 incorpora el proyecto Android y ajustes persistentes. Consultar [configuración Android](docs/android-setup.md), [diagnóstico y pruebas](docs/pr01-base.md) y [descripción del PR](docs/PR01.md). El APK debug ya se generó y su firma fue verificada; la prueba en celular sigue pendiente.

- **frontend/**: funcionalidades de proyectos, tareas, inicio y autenticación.
- **backend/**: dominio independiente de Spring/JPA, casos de uso y adaptadores HTTP/persistencia.
- **docs/**: especificaciones y revisiones históricas.

## Desarrollo

Requisitos: JDK 21 y Node.js 24. Desde la raíz:

~~~powershell
npm --prefix frontend ci
npm --prefix frontend start
~~~

Antes de iniciar el backend, configurar sus credenciales en la misma terminal:

~~~powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:AUTH_USERNAME = '<tu usuario>'
$env:AUTH_PASSWORD = '<tu contraseña de al menos 12 caracteres>'
$env:AUTH_JWT_SECRET = node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
Set-Location backend
.\mvnw.cmd spring-boot:run
~~~

La contraseña admite hasta 72 bytes UTF-8. La clave de firma requiere al menos 32 bytes aleatorios. No hay credenciales de acceso por defecto. El backend rechaza el arranque sin configuración válida. Las variables se leen del entorno del proceso; un archivo .env no se carga automáticamente.

El frontend muestra un login local y usa un JWT de una hora. Hay una única cuenta configurada por servidor y todos sus proyectos son compartidos: no se implementaron registro, roles de negocio ni separación de datos entre usuarios. La sesión del navegador se conserva en sessionStorage y se limpia al salir o vencer. Usar HTTPS al desplegar fuera del entorno local.

## Verificación

~~~powershell
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build
Set-Location backend
.\mvnw.cmd verify '-Dnivi.build.directory=target-audit'
~~~

Las pruebas usan credenciales exclusivas de test y H2 en memoria. No necesitan configurar secretos personales. GitHub Actions ejecuta las pruebas del backend, las del frontend y el build de producción en cada PR.

## Funciones y despliegue

Alta, consulta, edición y eliminación de proyectos y tareas por proyecto. Estados de tareas: TODO, IN_PROGRESS, DONE; la edición permite completarlas y reabrirlas. No se permite crear, editar ni borrar tareas de proyectos cerrados. Se incorporan categoría y origen con defaults GENERAL/MANUAL, conservando datos e IDs anteriores. No existe prioridad de tareas.

Los textos admiten hasta 255 caracteres y las horas deben ser enteros positivos. El resumen muestra progreso calculado a partir de tareas completadas, con contadores agregados en la base y hasta tres proyectos por petición.

Desarrollo usa http://127.0.0.1:8081; producción usa /api. public/runtime-config.js permite sobrescribir apiUrl sin recompilar. El proxy debe retirar /api antes de reenviar tanto /api/projects como /api/auth al backend y servir index.html como fallback de rutas Angular. Las variables del frontend son públicas y no deben contener contraseñas ni claves de firma.

Bootstrap e iconos se empaquetan localmente y se usa una fuente de sistema si Outfit no está instalada. La interfaz puede cargar sin CDN; el CRUD sigue requiriendo backend hasta PR 05. Los directorios de compilación están ignorados y no se versionan.

Si apiUrl apunta a un origen distinto del frontend, configurar CORS_ALLOWED_ORIGINS en el backend con el origen exacto del frontend (protocolo, host y puerto, sin ruta). Por defecto solo se permiten http://localhost:4200 y http://127.0.0.1:4200. Por ejemplo, para un cliente en https://nivi.example, usar CORS_ALLOWED_ORIGINS=https://nivi.example aunque la API esté en otro dominio.

## Integración Ionic inicial — referencia histórica, anterior al PR 01

Ionic Angular 9.0.10 está configurado con componentes standalone y provideIonicAngular. La estructura principal usa IonApp, IonHeader, IonToolbar e IonContent; el acceso usa IonButton e IonSpinner. Los estilos de Ionic están incluidos y conservan la paleta Nivi. Bootstrap continúa dando formato a las páginas existentes.

Se mantiene RouterOutlet de Angular para conservar la destrucción de páginas, las suscripciones y el comportamiento del login; no se incorporó una pila de navegación con caché. Angular continúa funcionando sin cargar Zone.js; el paquete se instala por compatibilidad con los peer dependencies de Ionic.

Desde frontend/: npm run start:ionic (puerto 4200, compatible con CORS local) y npm run build:ionic. También se conservan npm start y npm run build. ionic.config.json identifica el proyecto; los scripts pasan su nombre Angular explícitamente porque Ionic CLI 7 usa app por defecto.

Verificación: 16 pruebas frontend aprobadas y build de producción mediante Ionic CLI aprobado. Se mantienen los tres avisos CSS anteriores. No se agregaron proyectos nativos Android/iOS ni Capacitor; la integración actual es web y no genera un APK.

La auditoría npm de las dependencias instaladas reportó 52 alertas (3 críticas, 22 altas, 25 moderadas y 2 bajas). El informe no atribuye alertas a @ionic/angular; las críticas aparecen en piscina, proxy-addr y tar. Su actualización requiere una revisión de dependencias separada.
