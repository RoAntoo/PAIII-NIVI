# Backend Nivi

Java 21, Spring Boot 3.5.7 y Maven Wrapper. API consumida por frontend/.

## Ejecución y pruebas

Desde backend/:

    ./mvnw verify
    ./mvnw spring-boot:run

En Windows usar mvnw.cmd y configurar JAVA_HOME al JDK 21. Para conservar separados los artefactos históricos, ejecutar verify con -Dnivi.build.directory=target-audit.

Las pruebas usan H2 en memoria y no modifican la base local. Mockito se carga como agente al iniciar la JVM de pruebas, evitando el mecanismo de attach que fallaba en Windows.

## API

- GET y POST /projects
- GET, PUT y DELETE /projects/{projectId}
- GET y POST /projects/{projectId}/tasks
- GET y PUT /projects/{projectId}/tasks/{taskId}

DELETE devuelve 204 y elimina las tareas asociadas en la misma transacción. Los IDs inexistentes o tareas de otro proyecto devuelven 404. Datos malformados devuelven 400; conflictos de negocio, 409. Los errores usan {error, message}.

La edición no cambia estados. En PUT de tareas, assignee null elimina la asignación (omitir ese campo también se deserializa como null). No hay borrado individual de tareas ni prioridades.

## Configuración

SERVER_PORT (8081), DB_URL (H2 de archivo local), DB_USERNAME, DB_PASSWORD, DDL_AUTO (update para el desarrollo actual) y CORS_ALLOWED_ORIGINS (http://localhost:4200). La consola H2 está deshabilitada. Producción del frontend usa /api: el proxy debe retirar ese prefijo antes de reenviar al backend.

## Límites de arquitectura

core/model contiene modelos de negocio sin JPA ni Jackson. core/output define puertos propios. Los casos de uso solo dependen del núcleo; FindAllProjectsUseCase pasa criterios de búsqueda al puerto.

adapter/persistence contiene entidades JPA, repositorios Spring Data, filtros Specification y adaptadores que convierten entidades a objetos de dominio independientes. Las tablas y columnas existentes se conservan. Las cargas de proyecto incluyen sus tareas; la referencia de proyecto de una tarea contiene los datos del proyecto sin cargar recursivamente su colección.

Guardar un proyecto actualiza sus campos y preserva la colección JPA administrada; las escrituras de tareas se realizan mediante ITaskRepository. La eliminación usa la relación JPA con cascada dentro de la transacción. Los mappers reconstruyen registros existentes sin ejecutar validaciones temporales de creación.

Los controladores delegan en casos de uso; el límite transaccional se mantiene en el adaptador HTTP, cubriendo toda la operación. Los adaptadores de persistencia participan de esa transacción y también pueden invocarse de forma transaccional independiente. No hay transacciones Spring dentro del núcleo.

Las migraciones de esquema y la reorganización adicional por módulos funcionales quedan fuera de esta separación. No se cambió el motor de datos ni se incorporaron funciones móviles.
