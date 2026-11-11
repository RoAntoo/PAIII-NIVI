# Estado actual — 4 de noviembre de 2026

Este documento sustituye como estado vigente los diagnósticos históricos de ESTADO_REESTRUCTURACION.md y REVISION_BACKEND.md. La base de estos cambios es develop después del merge dc2582c.

## Correcciones

- Dominio sin anotaciones JPA/Jackson. UpdateTaskRequest adapta JSON y presencia de assignee al comando de aplicación puro.
- Restricciones NOT NULL en las entidades JPA correctas y script H2 activo también en las pruebas de actualización de esquema.
- Propiedad de contraseña DB_PASSWORD restaurada.
- Validación de fechas de creación compara fechas de calendario locales. La edición conserva su regla para proyectos históricos.
- Listado con EntityGraph: una consulta para proyectos y tareas, conservando el contenido del modelo de dominio y los filtros Specification.
- Actividad reciente: GET /projects/recent-tasks retorna hasta cuatro tareas, ordenadas por creación e ID descendente, con nombre/ID del proyecto. Home realiza dos peticiones, independientemente del número de proyectos. Se mantiene la respuesta anterior de GET /projects.
- 101 artefactos de backend/target retirados del índice; archivos locales conservados. Las eliminaciones están preparadas en Git, sin commit.
- URL de API configurable mediante public/runtime-config.js; CORS permite únicamente los orígenes configurados.

## Configuración de despliegue y dispositivos

Por defecto desarrollo usa http://127.0.0.1:8081 y producción /api. Para un dispositivo, definir en el archivo runtime-config.js que se entrega con el cliente:

    window.NIVI_CONFIG = { apiUrl: 'https://TU-API' };

Reemplazar TU-API por el servidor real; no usar localhost del teléfono. El valor es público. Para web con /api, el proxy debe retirar el prefijo antes de reenviar al backend. Definir CORS_ALLOWED_ORIGINS como lista de orígenes exactos separados por comas. Los valores locales por defecto son http://localhost:4200 y http://127.0.0.1:4200; los orígenes de la aplicación móvil se agregarán cuando se elija su configuración. No se habilitó un comodín ni se inventó un dominio de despliegue.

Antes de iniciar sobre una base existente, revisar nulos según REVISION_BACKEND.md y respaldar los datos. El SQL es específico de H2 y no cambia de motor ni rellena valores.

## Verificación

Backend: pruebas de arquitectura, esquema previo, CRUD, cascada, rollback, pertenencia, filtros, assignee y conteo de consultas. Frontend: pruebas de rutas y fechas, build optimizado.

Prueba manual real en navegador con H2 temporal en memoria: inicio vacío; proyecto con inicio/fin hoy; alta de tarea; edición para vaciar responsable y comprobación de Sin asignar; filtro de tareas completadas vacío; actividad reciente; cambio de nombre del proyecto; eliminación con confirmación; inicio sin proyecto ni actividad. Los servicios temporales se detienen al terminar. No se tocó la base persistente del usuario.

Los tres avisos de presupuesto CSS existentes no bloquean el build. No se aumentaron artificialmente los límites ni se rediseñó la interfaz. Ionic sigue sin instalarse.
