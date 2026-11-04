# SPEC.md — Feature: Actualizar una tarea

## Update-Task
**Actualizar datos de una tarea existente dentro de un proyecto**

---

## Descripción general
El usuario puede editar los campos permitidos de una tarea ya creada: título, horas estimadas y persona asignada. El formulario se pre-carga con los datos actuales de la tarea. Al guardar, se envía un `PUT` al backend y se refleja el cambio en la vista. Esta feature permite mantener la información de las tareas actualizada sin necesidad de eliminar y volver a crear.

---

## Endpoints involucrados

**Obtener tarea actual (para pre-cargar el form):**
```
GET /projects/{projectId}/tasks/{taskId}
Response 200: { id, title, estimateHours, assignee, status, finishedAt, createdAt }
Response 404: tarea o proyecto no encontrado
```

**Actualizar tarea:**
```
PUT /projects/{projectId}/tasks/{taskId}
Body: { title, estimateHours, assignee }
Response 200: TaskResponse actualizado
Response 400: validación fallida (title vacío, estimateHours <= 0)
Response 404: tarea o proyecto no encontrado
Response 409: violación de regla de negocio
```

---

## Restricciones de negocio

- `title` es obligatorio; no puede estar vacío ni ser solo espacios.
- `estimateHours` debe ser un entero mayor a 0.
- `assignee` es opcional; puede quedar vacío (se enviará como `null`).
- **No se puede cambiar el `status` desde este formulario** — eso es responsabilidad de otra feature.
- Si el proyecto está en estado `CLOSED`, el backend rechazará la operación (409); el frontend debe mostrar el error recibido sin reintentar.
- Los campos `finishedAt`, `createdAt` y `status` son de solo lectura: se muestran informativamente pero no se editan aquí.

---

## Lineamientos técnicos

- **Componente:** standalone, `ChangeDetectionStrategy.OnPush`, ubicado en `src/app/features/update-task/`.
- **Formulario:** Reactive Forms con validadores síncronos (`Validators.required`, `Validators.min(1)`).
- **Servicio:** `task.service` en `src/app/service/task.service.ts` — métodos `getTask(projectId, taskId)` y `updateTask(projectId, taskId, dto)`.
- **Routing:** ruta `/projects/:projectId/tasks/:taskId/edit`. Los params se leen con `ActivatedRoute`.
- **Estado de carga:** signals locales para `isLoading`, `isSaving` y `errorMessage`.
- **Estilos:** Bootstrap 5 (cargado de forma global vía CDN de jsDelivr en `index.html` para evitar dependencias locales npm y no sobrecargar el bundle final).
- **Errores HTTP:** el interceptor JWT ya existente maneja el token; el componente solo maneja los errores de respuesta (400, 404, 409) mostrando el mensaje del backend.
- **Navegación post-guardado:** redirigir a `/projects/:projectId/tasks` (listado de tareas del proyecto) al completar exitosamente.

---

## Criterios de aceptación

**CA-1 — Flujo feliz:**
> Dado que el usuario navega a `/projects/3/tasks/7/edit`,
> cuando el componente carga,
> entonces el formulario se pre-llena con el título, horas estimadas y asignado actuales de la tarea.

**CA-2 — Guardado exitoso:**
> Dado que el formulario tiene datos válidos (`title` no vacío, `estimateHours` > 0),
> cuando el usuario hace clic en "Guardar",
> entonces se envía `PUT /projects/3/tasks/7`, se muestra feedback de éxito y se redirige al listado de tareas del proyecto.

**CA-3 — Validación client-side:**
> Dado que el usuario borra el título o ingresa `estimateHours = 0`,
> cuando intenta hacer clic en "Guardar",
> entonces el botón está deshabilitado (o el form muestra errores inline) y no se realiza ningún request al backend.

**CA-4 — Error de validación (400):**
> Dado que el usuario envía datos que no pasan la validación del backend (ej: `estimateHours` con valor negativo que evadió el control del form),
> cuando el backend responde con 400,
> entonces se muestra el mensaje de error indicando qué campo es inválido, sin redirigir ni limpiar el formulario.

**CA-5 — Violación de regla de negocio (409):**
> Dado que el proyecto al que pertenece la tarea está en estado `CLOSED`,
> cuando el usuario intenta guardar,
> entonces el backend responde con 409 y se muestra un mensaje explicando la restricción (ej: "No se puede modificar una tarea de un proyecto cerrado"), sin redirigir ni limpiar el formulario.

**CA-6 — Tarea no encontrada:**
> Dado que el `taskId` o `projectId` no existe en el backend,
> cuando el componente intenta pre-cargar los datos,
> entonces se muestra un mensaje "Tarea no encontrada" y un link para volver al listado de tareas.

**CA-7 — Estado de guardado:**
> Dado que el usuario hace clic en "Guardar",
> cuando el request está en curso,
> entonces el botón muestra un indicador de carga y queda deshabilitado hasta recibir respuesta.

---

## Prompts utilizados
- Agente IA: Claude (claude.ai)
- Prompt principal: ver archivo prompt-06.md adjunto.
