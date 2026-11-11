# Backend Nivi

Java 21, Spring Boot 3.5.7 y Maven Wrapper. Ver el [estado vigente](../docs/ESTADO_ACTUAL.md).

## Ejecución

Desde backend/, ejecutar ./mvnw verify y ./mvnw spring-boot:run. En Windows usar mvnw.cmd con JAVA_HOME al JDK 21. El build puede aislarse con -Dnivi.build.directory=target-audit.

Para ejecutar la aplicación son obligatorias AUTH_USERNAME, AUTH_PASSWORD (al menos 12 caracteres y hasta 72 bytes UTF-8) y AUTH_JWT_SECRET (al menos 32 bytes aleatorios). No hay valores de acceso por defecto. Las pruebas proporcionan su propia configuración y usan H2 en memoria.

## Autenticación

POST /auth/login recibe {username, password} y devuelve {accessToken, tokenType, expiresAt, username}. El JWT usa HS256, emisor nivi y duración de una hora. La respuesta tiene Cache-Control: no-store. Los demás endpoints requieren Authorization: Bearer <token>; un token inválido o vencido devuelve 401. CORS permite únicamente los orígenes configurados y acepta Authorization y Content-Type.

La cuenta local es única y se configura en el servidor. No hay registro, refresh tokens, revocación de tokens emitidos ni autorización por propietario. Cerrar sesión borra el token del navegador; un token emitido conserva validez hasta expirar. Cambiar la clave de firma invalida los tokens anteriores. Usar HTTPS en el despliegue.

## API de proyectos y tareas

- GET y POST /projects
- GET, PUT y DELETE /projects/{projectId}
- GET /projects/recent-tasks
- GET y POST /projects/{projectId}/tasks
- GET y PUT /projects/{projectId}/tasks/{taskId}

GET /projects acepta status, startDate, endDate y limit opcionales. limit admite valores de 1 a 100 y se aplica en SQL; sin él se conserva el listado completo. Se ordena por ID descendente. Las respuestas de proyecto agregan totalTasks y completedTasks a sus campos anteriores. El listado usa una proyección y agregados, sin cargar entidades ni colecciones de tareas. Home solicita limit=3 y la actividad reciente retorna hasta cuatro tareas.

DELETE devuelve 204 y elimina las tareas asociadas dentro de la misma transacción. Recursos inexistentes o tareas ajenas al proyecto devuelven 404. Datos inválidos (incluidas horas fraccionarias y textos de más de 255 caracteres) devuelven 400; duplicados y operaciones sobre tareas de proyectos cerrados, 409. Los errores conservan {error, message} y agregan code para distinguir validación, duplicados y reglas de negocio.

PUT admite cambios parciales y conserva los campos omitidos. En tareas, assignee omitido conserva la asignación y null explícito la elimina. En proyectos, una descripción vacía permite borrar su contenido; null u omisión conserva el valor. La edición no cambia estados.

## Datos y arquitectura

SERVER_PORT (8081), DB_URL (H2 de archivo local), DB_USERNAME, DB_PASSWORD, DDL_AUTO (update) y CORS_ALLOWED_ORIGINS son configurables. La consola H2 está deshabilitada. Antes de usar una base existente, respaldarla y revisar sus nulos obligatorios según REVISION_BACKEND.md.

El script H2 endurece columnas y normaliza el estado histórico COMPLETED a DONE. Conserva finishedAt y, cuando falta, usa createdAt si existe; no inventa una fecha si ambas son desconocidas. Las verificaciones se ejecutan con bases temporales, sin modificar la base persistente del usuario.

El núcleo no depende de Spring, JPA ni Jackson. Los adaptadores convierten entidades a objetos independientes de la sesión. La consulta individual de proyecto conserva sus tareas; los listados devuelven ProjectSummary con contadores. Las transacciones abarcan las operaciones HTTP y los adaptadores de persistencia. Las pruebas incluyen contrato HTTP, JWT real, cascada, rollback, restricciones de esquema y consultas sin hidratación de entidades.

El SQL de arranque es específico de H2 y no reemplaza un sistema de migraciones versionadas. No se cambió de motor de datos.
