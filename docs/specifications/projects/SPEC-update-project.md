# SPEC.md — Editar proyecto existente

## update-project
Editar nombre, fechas y descripción de un proyecto existente

## Descripción general
El usuario puede modificar los datos editables de un proyecto: nombre, fecha de inicio,
fecha de fin y descripción. El formulario se pre-carga con los valores actuales del
proyecto. El backend valida unicidad del nombre y consistencia de fechas; el frontend
debe reflejar esos errores de forma clara. Esta feature permite mantener la información
de los proyectos actualizada sin necesidad de eliminar y recrear.

## Endpoints involucrados

### PUT /projects/{projectId}
- **Auth:** Bearer token en header `Authorization`
- **Request body:**
```json
{
  "name": "Nuevo nombre",
  "startDate": "2025-10-01",
  "endDate": "2025-12-31",
  "description": "Descripción actualizada"
}
```
- **Response 200 OK:** objeto `ProjectResponse` con los datos actualizados
- **Response 400 Bad Request:** campo requerido ausente o fechas inválidas (`ValidationException`)
- **Response 404 Not Found:** el proyecto con ese ID no existe (`ResourceNotFoundException`)
- **Response 409 Conflict:** el nombre ya pertenece a otro proyecto (`DuplicateResourceException`)

> El campo `status` **no** se edita en este endpoint. No incluirlo en el request.

## Restricciones de negocio
- `name` es obligatorio y debe ser único entre todos los proyectos. Si se envía un nombre
  ya usado por otro proyecto, el backend devuelve 409.
- `endDate` debe ser mayor o igual a `startDate`. Si no se cumple, el backend devuelve 400.
- `startDate` y `endDate` son obligatorios.
- `description` es opcional; puede enviarse vacío o null.
- El `status` del proyecto no cambia con esta operación; el formulario no debe mostrarlo
  como campo editable.
- Si el proyecto no existe, el backend devuelve 404 y el frontend debe redirigir o mostrar
  un mensaje de error adecuado.

## Lineamientos técnicos
- **Framework:** Angular (versión estable vigente), standalone components,
  `ChangeDetectionStrategy.OnPush`
- **Formulario:** Reactive Forms — validaciones síncronas en cliente (required, dateRange)
  y manejo de errores asincrónicos desde el servidor (409, 400)
- **Estilos:** Bootstrap 5 (cargado de forma global vía CDN de jsDelivr en `index.html` para evitar dependencias locales npm y no duplicar estilos en el bundle)
- **Comunicación:** `HttpClient` con interceptor JWT existente (`auth.interceptor.ts`)
- **Servicio:** `ProjectService` en `src/app/services/` — método `updateProject(projectId, dto)`
- **Routing:** ruta `/projects/:projectId/edit`; al guardar con éxito redirigir a `/projects` o al
  detalle del proyecto
- **Estado:** el componente carga el proyecto actual con `GET /projects/:projectId` al inicializar
  (o recibe el objeto vía state del router si ya está disponible) y pre-popula el formulario
- **Manejo de errores:** mostrar mensaje inline bajo el campo correspondiente para 400/409;
  mostrar alerta global para 404 y errores de red

## Criterios de aceptación

**CA-1 — Flujo feliz**
Dado que el usuario navega a `/projects/3/edit` y el proyecto existe,
cuando el formulario se carga,
entonces los campos `name`, `startDate`, `endDate` y `description` muestran los valores
actuales del proyecto.

**CA-2 — Guardado exitoso**
Dado que el usuario modificó el nombre a uno único y las fechas son válidas,
cuando hace clic en "Guardar",
entonces el frontend llama a `PUT /projects/3`, recibe 200 y redirige a `/projects`
(o al detalle), mostrando un mensaje de éxito.

**CA-3 — Nombre duplicado**
Dado que el usuario ingresó un nombre que ya usa otro proyecto,
cuando hace clic en "Guardar" y el backend responde 409,
entonces se muestra el mensaje "Ya existe un proyecto con ese nombre" bajo el campo
`name` y el usuario permanece en el formulario.

**CA-4 — Fechas inválidas en cliente**
Dado que el usuario ingresó una `endDate` anterior a `startDate`,
cuando intenta enviar el formulario,
entonces el formulario no hace el request y muestra "La fecha de fin debe ser mayor o
igual a la fecha de inicio" bajo el campo `endDate`.

**CA-5 — Proyecto no encontrado**
Dado que el ID en la URL no corresponde a ningún proyecto,
cuando el componente intenta cargar los datos iniciales,
entonces se muestra un mensaje "Proyecto no encontrado" y se ofrece volver al listado.

**CA-6 — Error de red / servidor**
Dado que el backend no responde (timeout o 500),
cuando el usuario intenta guardar,
entonces se muestra una alerta "Error al guardar. Intentá de nuevo." sin perder los datos
del formulario.

**CA-7 — Diseño visual premium y estructura (Glassmorphism)**
Dado que el usuario accede a la pantalla de edición `/projects/:projectId/edit`,
cuando el formulario se renderiza en la pantalla,
entonces se visualiza como una tarjeta centralizada modal sobre el fondo con bordes redondeados (`border-radius: 20px`), un sombreado suave con tonos pastel y efecto de desenfoque translúcido (Glassmorphism con `backdrop-filter: blur(12px)`), donde los campos de entrada de texto y fecha cuentan con iconos representativos alineados a la izquierda y el campo de descripción cuenta con una caja de edición integrada con barra de herramientas decorativa.

## Prompts utilizados
- Agente IA: Claude (claude.ai)
- Prompt principal: ver archivo prompt-05.md adjunto.
