# SPEC: Eliminar un proyecto existente

**Nombre de la feature:**
Eliminar un proyecto existente.

**Descripción general:**
El usuario puede eliminar un proyecto directamente desde el listado de proyectos. Para prevenir eliminaciones accidentales, el sistema solicita una confirmación interactiva antes de proceder. Una vez confirmado, se invoca al backend para eliminar el proyecto (y todas sus tareas asociadas), refrescando la vista del listado de forma inmediata para reflejar los cambios en tiempo real.

**Endpoints involucrados:**
DELETE /projects/{projectId}
- **Auth:** Bearer token en header `Authorization`.
- **Response 200 OK / 204 No Content:** Proyecto eliminado exitosamente.
- **Response 404 Not Found:** El proyecto con el ID especificado no existe o ya fue eliminado.

**Restricciones de negocio:**
- La acción de eliminación debe requerir la confirmación interactiva del usuario.
- Al confirmar la eliminación de un proyecto, se asume el borrado en cascada de todas sus tareas correspondientes.
- La interfaz debe actualizarse inmediatamente después de la eliminación exitosa para evitar inconsistencias visuales.
- Los errores devueltos por el servidor durante la baja deben mostrarse claramente al usuario sin romper el flujo del listado.

**Lineamientos técnicos:**
- **Componentes:**
  - Standalone components, Angular 17.
  - Componente principal: `ProjectListComponent` en `src/app/features/get-projects/` (con archivos `.html` y `.css` independientes).
  - Componente de confirmación: `ConfirmationModalComponent` reusable en `src/app/shared/components/confirmation-modal/` (con archivos `.html` y `.css` independientes).
- **Servicio:** `ProjectService` en `src/app/service/project.service.ts` con método `deleteProject(id: number): Observable<void>`.
- **Manejo del Estado:** El listado refresca su señal `projects` reactivamente volviendo a llamar a `loadProjects()`.
- **Estilos:** Bootstrap 5 con estilos customizados integrando colores pastel y hover micro-animados acordes a la guía de diseño general.

**Lineamientos de diseño visual:**
- **Estilo de botón:** Botón de acción con icono de basura (`bi-trash`) y estilo danger pastelizado (`.btn-danger-custom` con background `#ffebee` y texto `#c62828`).
- **Feedback visual:** Animaciones de transición suave al interactuar con el botón de eliminación.
- **Mensaje de Error:** Alertas del sistema usando el banner de error superior del listado ante fallos de red o rechazos del servidor.

**Criterios de aceptación:**
1. Dado que el usuario visualiza la tarjeta de un proyecto en el listado, cuando presiona el botón "Eliminar", entonces el sistema muestra una ventana emergente de confirmación preguntando si desea borrar el proyecto.
2. Dado que el diálogo de confirmación está abierto, cuando el usuario cancela la acción, entonces no se realiza ninguna petición HTTP y el proyecto permanece intacto.
3. Dado que el usuario confirma la eliminación, cuando la llamada al endpoint HTTP DELETE finaliza con éxito, entonces el proyecto desaparece inmediatamente del listado en pantalla.
4. Dado que el usuario confirma la eliminación, cuando el servidor retorna un error (por ejemplo, error de red o de autenticación), entonces se visualiza una alerta global de error indicando "Error al eliminar el proyecto" junto con el mensaje correspondiente, y el listado no se actualiza erróneamente.

**Prompts utilizados:**
- Agente IA: Gemini 3.5 Flash
- Prompt principal: ver archivo `prompt-delete.md` adjunto.
