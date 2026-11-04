# Verificación de comentarios de revisión

Base revisada: rama main, commit f810809 (4 de noviembre de 2026). No contiene ProjectRepositoryAdapter, PersistenceMapper, ProjectEntity ni TaskEntity de la revisión citada.

- N+1 (comentario repetido): omitido. El listado actual utiliza ProjectSpecification sobre Project y convierte únicamente campos escalares a respuestas. No existe el recorrido de tareas indicado. Añadir EntityGraph aquí cargaría tareas innecesariamente.
- Columnas obligatorias: aplicado a las entidades reales actuales core/model/Project y Task. Fechas, estado y horas indicados tienen nullable=false; los enums conservan EnumType.STRING.
- Esquema existente: Hibernate update solo no endureció las columnas en la prueba. Se agregó db/required-columns.sql, ejecutado por Spring SQL después del DDL de Hibernate. Es específico de H2, motor actual. No se ejecutó contra la base local del usuario.
- Assignee: el record anterior no distinguía ausencia y null. Se reemplazó por DTO con constructor vacío y setters Jackson que registran presencia; los accesores title(), estimateHours() y assignee() siguen disponibles. El constructor de tres argumentos considera explícito el tercer argumento, incluso null. El caso de uso conserva el responsable omitido y guarda null explícito mediante el repositorio.
- Documentación: se añadieron Javadocs a los métodos nuevos del DTO, caso de uso afectado y tests nuevos. No hay configuración local de CodeRabbit ni un umbral/comando de Docstring Coverage identificable; no se afirma que ese check remoto haya pasado. No se ejecutó la revisión externa opcional.

## Aplicación de restricciones

Antes de desplegar sobre datos existentes, respaldar la base y comprobar:

    SELECT id FROM projects WHERE start_date IS NULL OR end_date IS NULL OR status IS NULL;
    SELECT id FROM tasks WHERE estimate_hours IS NULL OR status IS NULL;

Si existen filas, corregir sus valores de negocio antes del arranque. El script no rellena datos ni elimina filas. H2 puede confirmar cada ALTER por separado: un fallo puede dejar restricciones parcialmente aplicadas; corregidos los datos, se puede repetir el arranque. No constituye una migración hacia otro motor.

## Validación

Maven verify aprobado: 29 pruebas, sin fallos ni errores. Incluye deserialización real y guardado de assignee omitido/null/texto, y actualización de un esquema H2 previamente nullable con comprobación de metadatos. Se usó target-review como salida aislada, H2 en memoria y el agente Mockito al iniciar la JVM. Las pruebas pertenecen a la rama actual, no a la versión de 37 pruebas de la conversación anterior.
