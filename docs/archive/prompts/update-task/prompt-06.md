# Prompt Principal — Feature: Actualizar una tarea

## Agente utilizado
Claude (claude.ai)

---

## Prompt

Sos un desarrollador senior de Angular con experiencia en aplicaciones empresariales y arquitectura de componentes standalone.

### Contexto del sistema

Estoy desarrollando el frontend de una app de gestión de tareas y proyectos.
El backend es una API REST hecha en Java (Spring Boot) con los siguientes endpoints relevantes para esta feature:

```
GET  /projects/{projectId}/tasks/{taskId}
PUT  /projects/{projectId}/tasks/{taskId}
     Body: { title, estimateHours, assignee }
```

El frontend usa:
- Angular (versión estable actual) con standalone components
- Bootstrap 5 para estilos
- Reactive Forms para formularios con validaciones
- HttpClient con un interceptor JWT ya existente en `src/app/interceptors/auth.interceptor.ts`
- Signals de Angular para estado local

### Feature a implementar

**Actualizar datos de una tarea existente dentro de un proyecto**

El usuario puede editar título, horas estimadas y asignado de una tarea. El formulario se pre-carga con los datos actuales obtenidos del backend. Al guardar exitosamente, se redirige al detalle del proyecto.

**Endpoints:**
- `GET /projects/{projectId}/tasks/{taskId}` → pre-carga el formulario
- `PUT /projects/{projectId}/tasks/{taskId}` → guarda los cambios

**Restricciones de negocio:**
- `title` obligatorio, no puede ser vacío ni solo espacios
- `estimateHours` entero mayor a 0
- `assignee` opcional, enviar `null` si está vacío
- `status`, `finishedAt` y `createdAt` son de solo lectura, no se editan
- Si el backend responde 400 (validación), mostrar el mensaje de error indicando qué campo es inválido, sin redirigir ni limpiar el formulario
- Si el backend responde 409 (regla de negocio, ej: proyecto CLOSED), mostrar un mensaje explicando la restricción, sin redirigir ni limpiar el formulario
- Ambos errores (400 y 409) deben manejarse por separado en el template, ya que tienen causas distintas

**Criterios de aceptación:**
- El formulario se pre-llena con los datos actuales de la tarea al cargar
- Con datos válidos, al guardar se hace el PUT y se redirige a `/projects/:projectId`
- Con datos inválidos, el botón queda deshabilitado y se muestran errores inline por campo
- Si el backend responde 400, se muestra el mensaje de error de validación sin redirigir ni limpiar el form
- Si el backend responde 409, se muestra un mensaje explicando la regla de negocio violada (ej: "No se puede modificar una tarea de un proyecto cerrado"), sin redirigir ni limpiar el form
- Si la tarea no existe (404), se muestra "Tarea no encontrada" con link para volver al listado
- Mientras el request está en curso, el botón muestra un spinner y queda deshabilitado

### Restricciones técnicas

- Componente standalone con `ChangeDetectionStrategy.OnPush`
- El selector debe ser `app-update-task` y la clase `UpdateTaskComponent`
- Ubicar el componente en `src/app/features/update-task/update-task.component.ts`
- El servicio debe llamarse `TaskService` y vivir en `src/app/service/task.service.ts`
  - Si el servicio ya existe, solo agregar los métodos `getTask(projectId, taskId)` y `updateTask(projectId, taskId, dto)`
- Ruta: `/projects/:projectId/tasks/:taskId/edit`, leer params con `ActivatedRoute`
- Usar signals locales para `isLoading`, `isSaving` y `errorMessage`
- No generar el interceptor JWT (ya existe)
- No generar el módulo de routing (solo indicar cómo registrar la ruta nueva)

### Archivos a generar

1. `src/app/features/update-task/update-task.component.ts`
2. `src/app/features/update-task/update-task.component.html`
3. Métodos nuevos en `src/app/service/task.service.ts`
4. Fragmento de routing para registrar la nueva ruta
