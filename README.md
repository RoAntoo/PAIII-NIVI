# NIVI

NIVI es una aplicación web y Android para organizar proyectos y tareas. Permite cargar tareas a mano, dictar varias de una vez o importarlas desde una foto o una plantilla QR. También permite programar recordatorios en el celular y seguir trabajando con las tareas de un proyecto aunque se corte la conexión.

## Qué podés hacer

| Función | Cómo se usa |
| --- | --- |
| **Proyectos y tareas** | Creá, editá y eliminá proyectos y tareas. Consultá el progreso y la actividad reciente desde Inicio. Cada tarea puede tener categoría, responsable, horas estimadas y estado pendiente, en curso o completada. |
| **Dictado en Android** | Dictá una tarea o una lista enumerada en español. Revisá los títulos antes de guardar. |
| **Fotos y QR en Android** | Extraé tareas de una lista fotografiada o elegí una imagen de la galería. También podés importar una plantilla con el lector QR. Revisá y seleccioná qué tareas guardar. |
| **Lugares cercanos en Android** | Activá **Sugerencias de lugares** para buscar ferreterías, laboratorios o farmacias según la tarea. Podés asociar un resultado a la tarea y abrirlo en Maps. La búsqueda requiere ubicación y un backend configurado con Google Places. |
| **Recordatorios en Android** | Elegí fecha y hora al crear o editar una tarea. La notificación local abre la tarea y se cancela al completarla o borrarla. |
| **Tareas sin conexión** | Activá el modo en **Ajustes**, iniciá sesión con conexión y abrí la lista del proyecto. Después podés crear, editar, completar o borrar sus tareas sin red. Los cambios se guardan en el dispositivo y se sincronizan al recuperar conexión con una sesión válida. Podés revisar los conflictos desde la app. |

La app guarda las preferencias por dispositivo. El servidor usa una cuenta configurada por entorno y emite un JWT de una hora para acceder a los datos.

## Ejecutar en desarrollo

Usá **Node.js 24** y **JDK 21**. Los ejemplos son para PowerShell y parten de la raíz del repositorio. El proyecto incluye el Maven Wrapper.

### 1. Iniciar el backend

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21' # Ajustá la ruta a tu instalación.
$env:AUTH_USERNAME = 'nivi-local'
$env:AUTH_PASSWORD = Read-Host 'Contraseña de prueba (mínimo 12 caracteres)' -MaskInput
$env:AUTH_JWT_SECRET = node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:4200,http://127.0.0.1:4200,https://localhost'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

El backend escucha en el puerto `8081` por defecto y usa H2 de archivo. Iniciá sesión con el usuario y la contraseña que configuraste. La contraseña admite entre 12 caracteres y 72 bytes UTF-8. Los archivos `.env.example` son referencias para configurar el entorno del proceso. Para probar lugares, definí también `GOOGLE_PLACES_API_KEY` en el backend. [Configuración de Google Places](docs/pr04-lugares.md)

### 2. Abrir la versión web

En otra terminal, desde la raíz del repositorio, instalá las dependencias e iniciá Angular.

```powershell
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend start
```

Abrí `http://localhost:4200`. La versión de desarrollo se conecta a `http://127.0.0.1:8081`. Para producción, serví `frontend/dist/frontend-tareas-proyectos/browser/` con fallback a `index.html` y configurá el proxy para quitar el prefijo `/api` antes de reenviar las peticiones al backend. Podés definir otra URL con `window.NIVI_CONFIG.apiUrl` en el `runtime-config.js` publicado. Si el frontend y la API están en orígenes distintos, agregá el origen del frontend a `CORS_ALLOWED_ORIGINS`. Las credenciales y claves van en el backend.

## Generar el APK y probarlo en un celular

Instalá Android SDK Platform 36, Build Tools y Platform Tools. El APK funciona desde **Android 7 (API 24)**. Mantené el backend iniciado, conectá la PC y el celular a la misma red y verificá que el puerto `8081` sea accesible. El origen de Capacitor es `https://localhost`, incluido en la configuración de CORS del ejemplo anterior.

Desde la raíz, después de instalar las dependencias del frontend, reemplazá la IP de ejemplo por la IP Wi‑Fi de la PC que ejecuta el backend.

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NIVI_API_URL = 'http://192.168.1.10:8081'
$env:NIVI_ALLOW_HTTP = 'true'
npm.cmd --prefix frontend run android:build
```

Copiá `frontend/android/app/build/outputs/apk/debug/app-debug.apk` al celular, abrilo e iniciá sesión. Android puede pedir permiso para instalar desde la app con la que abriste el archivo. La URL de la API queda incorporada al APK. Si cambia la IP de la PC, volvé a compilar con la IP nueva. Para el emulador de Android Studio usá `http://10.0.2.2:8081`. El acceso por HTTP está previsto para builds de depuración en la red local. Para una API HTTPS, quitá `NIVI_ALLOW_HTTP` de la terminal y usá su URL HTTPS.

Para probar dictado, OCR y QR, abrí un proyecto y entrá a su lista de tareas. Para probar la sincronización, activá **Tareas sin conexión**, abrí la lista con conexión, activá el modo avión y editá una tarea. Al recuperar conexión, comprobá que el cambio llegue al servidor. [Guía Android](docs/android-setup.md) · [Guion de pruebas y demostración](docs/defensa.md) · [QR de ejemplo](docs/fixtures/nivi-task-v1.png)

## Estructura y verificación

| Directorio | Contenido |
| --- | --- |
| `frontend/` | Angular 21, Ionic 9 y Capacitor 8. Incluye las pantallas, la cola local en IndexedDB y el proyecto nativo en `android/`. |
| `backend/` | API REST en Java 21 y Spring Boot 3.5.7, con persistencia JPA/H2 y un núcleo de dominio independiente del framework. |
| `docs/` | Guías de Android, demostración, módulos y especificaciones. |

Desde la raíz, ejecutá las pruebas y los builds web y de servidor.

```powershell
npm.cmd --prefix frontend test -- --watch=false
npm.cmd --prefix frontend run build
Push-Location backend
.\mvnw.cmd verify
Pop-Location
```

Las pruebas del backend usan H2 en memoria y credenciales propias. GitHub Actions ejecuta ambas suites y genera el build web en cada pull request y en los pushes a `main` y `develop`.
