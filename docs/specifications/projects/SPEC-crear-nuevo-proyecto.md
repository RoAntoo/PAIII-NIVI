# SPEC: Crear un nuevo proyecto

**Nombre de la feature:**
Crear un nuevo proyecto.

**Descripción general:**
El usuario autenticado puede crear un nuevo proyecto ingresando su nombre, fechas de inicio y fin, estado y una descripción. Esto permite inicializar el contenedor para futuras tareas.

**Endpoints involucrados:**
POST /projects
- Auth: Bearer token en header Authorization.
- Request body: { "id": null, "name": "...", "startDate": "...", "endDate": "...", "status": "...", "description": "..." }
- Response: 201 Created con body ProjectResponse
- Errores: 400 Bad Request (errores de validación), 409 Conflict (nombre duplicado).

**Restricciones de negocio:**
- El nombre del proyecto (Project.name) debe ser único.
- La fecha de fin debe ser mayor o igual a la fecha de inicio (Project.endDate >= Project.startDate).
- Al crear, la fecha de fin debe ser mayor o igual a la fecha actual (endDate >= today).
- Todos los campos requeridos deben estar presentes.

**Lineamientos técnicos:**
Standalone components, Angular 17, Reactive Forms (para manejar las validaciones de fechas), HttpClient con interceptor JWT para la autenticación, manejo de estado de carga/error con Signals. Estilos de maquetado e interfaz basados en Bootstrap 5 (integrado mediante CDN en index.html para optimizar el peso del bundle).

**Lineamientos de diseño visual:**
- **Paleta de colores:** Se utiliza el tema estándar de Bootstrap 5. Color primario (`bg-primary`, `btn-primary`) para encabezados y acciones principales.
- **Layout:** El formulario se presenta centrado en la pantalla dentro de una tarjeta (`card`) contenedora con sombreado sutil (`shadow-sm`) ocupando un ancho mediano (`col-md-8`) para facilitar la lectura.
- **Mensajes de error:** Los errores de validación de campos vacíos o fechas inválidas se muestran inline (texto rojo chico) directamente debajo del input afectado. Los errores globales del backend (400, 409) se muestran en un cuadro de alerta superior (`alert-danger`).
- **Mensajes de sistema:** Los errores de validación de campos vacíos o fechas inválidas se muestran inline (texto rojo chico) directamente debajo del input afectado. Los errores globales del backend (400, 409) se muestran en un cuadro de alerta superior (alert-danger). Los mensajes de éxito (ej. proyecto creado) se muestran en un cuadro de alerta superior verde (alert-success).

**Criterios de aceptación:**
1. Dado que el usuario completa el formulario con datos válidos, cuando envía el formulario, entonces el proyecto se crea exitosamente (HTTP 201), se muestra un mensaje de éxito en pantalla, el formulario se limpia, y tras 2 segundos el usuario es redirigido al listado de proyectos.
2. Dado que el usuario ingresa una fecha de fin anterior a hoy, cuando intenta enviar el formulario, entonces el botón de guardado se deshabilita y se muestra un mensaje de error de validación local.
3. Dado que el usuario ingresa un nombre de proyecto que ya existe, cuando envía el formulario, entonces el backend devuelve un error 409 y se muestra un mensaje de "Recurso duplicado" en la pantalla.
4. Dado que el usuario envía el formulario con datos que el backend rechaza como inválidos, cuando el backend devuelve un error 400, entonces se muestra el mensaje de alerta global: "Error de validación: Revisa los datos ingresados."
5. Dado que el usuario intenta enviar el formulario dejando campos obligatorios vacíos, cuando los campos son tocados, entonces se visualizan los mensajes de error inline correspondientes y el botón de enviar se mantiene deshabilitado.
6. Dado que el usuario completa y envía el formulario correctamente, cuando el backend responde con un error inesperado (HTTP 500 u otro código no contemplado), entonces se muestra un mensaje de alerta global en pantalla con el texto "Ocurrió un error inesperado al intentar crear el proyecto." y el formulario permanece con los datos ingresados (no se limpia ni redirige).

**Prompts utilizados:**
- Agente IA: Gemini (gemini.ai)
- Prompt principal: ver archivo prompt-03.md adjunto.

