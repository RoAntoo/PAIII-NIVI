# Prompt de implementación — Eliminar Proyecto

Implementar la funcionalidad de eliminación de proyectos dentro del listado existente.

## Requerimientos

1. **Servicio Angular:**
   - En el `ProjectService` agregar el método `deleteProject(id: number): Observable<void>` para consumir la API `DELETE /projects/{id}`.

2. **Botón de Acción en UI:**
   - En la tarjeta (`project-card`) de `ProjectListComponent`, añadir un botón de "Eliminar" junto a las opciones de "Ver Tareas" y "Editar".
   - Usar un icono de basura de Bootstrap Icons (`bi-trash`) y un estilo personalizado de color rojo pastel (`.btn-danger-custom`) que mantenga la estética suave y moderna del resto de la aplicación.

3. **Confirmación Interactiva:**
   - Al hacer clic en el botón de eliminar, abrir el componente standalone reutilizable `ConfirmationModalComponent` (ubicado en `src/app/shared/components/confirmation-modal/` y estructurado con archivos `.html` y `.css` independientes).
   - El modal debe ser interactivo, con un diseño moderno (overlay y tarjeta de confirmación custom) y recibir los parámetros de entrada correspondientes para preguntar: *¿Eliminar Proyecto? ¿Estás seguro de que deseas eliminar el proyecto "{nombre}"?*
   - Mostrar de forma destacada la advertencia de que la acción es irreversible y eliminará todas sus tareas asociadas.
   - Ofrecer los botones de acción para "Cancelar" y "Sí, Eliminar" manejando un estado de carga (`isLoading`) durante la eliminación que deshabilite los controles y dibuje un spinner.

4. **Flujo de Éxito:**
   - Si el usuario confirma la eliminación en el modal, se suscribe al servicio de borrado.
   - En la respuesta exitosa, refrescar reactivamente la lista de proyectos en pantalla invocando nuevamente a `loadProjects()`.

5. **Manejo de Errores:**
   - En caso de falla en el borrado (por ejemplo, error de red o de permisos), capturar el error y mostrar un mensaje de alerta en el contenedor superior del componente indicando *"Error al eliminar el proyecto: {mensaje}"*.
