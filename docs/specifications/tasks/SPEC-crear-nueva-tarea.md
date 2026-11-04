# SPEC.md — Crear tarea dentro de un proyecto

## Objetivo
Crear tarea dentro de un proyecto

## Descripción general
El usuario puede crear una nueva tarea asociada a un proyecto existente completando un formulario con los datos requeridos. La feature valida las reglas de negocio del backend antes de enviar el request y muestra feedback claro ante éxito o error. Aporta valor al permitir gestionar el trabajo dentro de cada proyecto de forma rápida y controlada.

## Endpoints involucrados

**POST** `/projects/{projectId}/tasks`

Request body:
```json
{
  "id": null,
  "title": "string",
  "estimateHours": 12,
  "assignee": "string (opcional)",
  "status": "TODO | IN_PROGRESS | DONE"
}
```

Response exitoso: `201 Created`
```json
{
  "id": 1,
  "title": "Create landing page",
  "estimateHours": 12,
  "assignee": "alice",
  "status": "TODO",
  "createdAt": "2026-05-26T10:00:00",
  "finishedAt": null
}
```

Códigos de error:
- `400 Bad Request` — campos requeridos ausentes, estimateHours <= 0
- `404 Not Found` — el proyecto no existe
- `409 Conflict` — el proyecto tiene estado CLOSED

## Restricciones de negocio
- `title` es obligatorio; no puede estar vacío.
- `estimateHours` debe ser mayor a 0.
- `assignee` es opcional (puede enviarse null o vacío).
- `status` debe ser uno de: `TODO`, `IN_PROGRESS`, `DONE`.
- No se puede crear una tarea en un proyecto con estado `CLOSED` → el backend responde 409.
- Si el status enviado es `DONE`, el backend setea automáticamente `finishedAt = now`.
- El proyecto referenciado debe existir → si no, el backend responde 404.

## Lineamientos técnicos
- Componente standalone con `ChangeDetectionStrategy.OnPush`.
- Formulario con **Reactive Forms** (validaciones en `title` y `estimateHours` requeridas en el frontend).
- Estilos con **Bootstrap 5** (integrado de forma global en `index.html` vía CDN de jsDelivr para evitar dependencias locales npm y sobrecarga del bundle).
- Comunicación vía `HttpClient` usando el servicio `TaskService` ubicado en `src/app/service/task.service.ts`.
- El `projectId` se obtiene desde los parámetros de la ruta (`ActivatedRoute`).
- Manejo de tres estados en el template: cargando (submit en progreso), error (mostrar mensaje del backend), éxito (limpiar formulario o redirigir).
- Tras la creación exitosa, redirigir a la vista del proyecto o mostrar mensaje de confirmación.

## Criterios de aceptación

**Escenario 1 — Creación exitosa:**
Dado que el usuario está en el formulario de nueva tarea de un proyecto ACTIVE,
cuando completa `title`, `estimateHours > 0` y selecciona un `status` válido y envía el formulario,
entonces se realiza POST a `/projects/{projectId}/tasks`, se recibe 201 y se muestra un mensaje de éxito.

**Escenario 2 — Proyecto cerrado:**
Dado que el proyecto tiene estado CLOSED,
cuando el usuario intenta crear una tarea en ese proyecto,
entonces el backend responde 409 y el frontend muestra el mensaje "No se pueden agregar tareas a un proyecto cerrado".

**Escenario 3 — Validación en el frontend:**
Dado que el usuario deja `title` vacío o ingresa `estimateHours` menor o igual a 0,
cuando intenta enviar el formulario,
entonces el formulario no realiza ningún request y muestra los errores de validación inline en cada campo.

**Escenario 4 — Proyecto no encontrado:**
Dado que el `projectId` en la URL no corresponde a ningún proyecto existente,
cuando el componente intenta hacer el POST,
entonces el backend responde 404 y el frontend muestra "El proyecto no existe".

**Escenario 5 — Tarea creada con status DONE:**
Dado que el usuario crea una tarea con status `DONE`,
cuando el backend responde 201,
entonces la respuesta incluye `finishedAt` con la fecha y hora actuales (seteado por el backend).

**Escenario 6 — Error inesperado del servidor:**
Dado que el usuario completa el formulario correctamente,
cuando el backend responde con un error inesperado (ej. 500),
entonces se muestra el mensaje "Error al crear la tarea. Revisá los datos e intentá de nuevo."

## Prompts utilizados
- Agente IA: Claude (claude.ai)
- Prompt principal: ver archivo prompt-04.md adjunto.
