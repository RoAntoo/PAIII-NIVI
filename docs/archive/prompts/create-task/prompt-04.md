Sos un desarrollador senior de Angular 19 con experiencia en aplicaciones empresariales.

## Contexto del sistema
Estoy desarrollando el frontend de una app de gestión de tareas y proyectos.
El backend es una API REST desarrollada en Java con Spring Boot. No usa autenticación JWT por ahora.
El frontend usa Angular 19 con standalone components, Bootstrap 5 y Reactive Forms.

## Feature a implementar: Crear tarea dentro de un proyecto

### Endpoint
POST /projects/{projectId}/tasks

Request body:
{
"id": null,
"title": "string",
"estimateHours": 12,
"assignee": "string (opcional, puede ser null)",
"status": "TODO | IN_PROGRESS | DONE"
}

Response exitoso: 201 Created con el objeto TaskResponse en el body.
Errores posibles:
- 400: campos inválidos (title vacío, estimateHours <= 0)
- 404: proyecto no encontrado
- 409: proyecto con status CLOSED

### Restricciones de negocio
- title es obligatorio
- estimateHours debe ser mayor a 0
- assignee es opcional
- status debe ser uno de: TODO, IN_PROGRESS, DONE
- No se puede crear tarea en proyecto CLOSED (backend responde 409)
- Si status es DONE, el backend setea finishedAt automáticamente

### Restricciones técnicas
- Componente standalone con ChangeDetectionStrategy.OnPush
- Reactive Forms con validaciones en el frontend para title (required) y estimateHours (required, min 1)
- Estilos con Bootstrap 5
- El servicio debe llamarse TaskService y vivir en src/app/services/task.service.ts
- El componente vive en src/app/features/create-task/
- El projectId se obtiene desde los parámetros de la ruta con ActivatedRoute
- Manejar tres estados en el template: cargando (botón deshabilitado), error (mensaje del backend), éxito (redirigir a la vista del proyecto o mostrar confirmación)
- Mostrar errores de validación inline en cada campo
- Para el error 409 mostrar: "No se pueden agregar tareas a un proyecto cerrado"
- Para el error 404 mostrar: "El proyecto no existe"

### Generar
- task.service.ts con el método createTask(projectId, taskRequest)
- create-task.component.ts (standalone, OnPush)
- create-task.component.html con el formulario Bootstrap

No generar módulos, no generar interceptor de JWT, no generar routing (lo agrego yo)._
