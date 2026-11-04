# Prompt Principal — Feature: Listado de Tareas

Actúa como un desarrollador Frontend experto en Angular.

## Contexto del Sistema
Contamos con una aplicación frontend de gestión conectada a un backend en Java.

## Feature a implementar
Implementar el componente de **Listado de tareas de un proyecto** consumiendo el endpoint correspondiente.

## Especificación de la Tarea
- **Endpoint a consumir:** `GET /projects/:projectId/tasks` (Parámetro de ruta: `projectId`).
- **Visualización:** Mostrar las tareas asociadas al proyecto en formato de tarjetas individuales que incluyan:
  - Título de la tarea
  - Estado de la tarea (`TODO`, `IN_PROGRESS`, `DONE`)
  - Fecha límite (formateada de manera legible)
- **Filtros:** Permitir filtrar localmente las tareas por estado.
- **Estados de la interfaz:** El sistema debe manejar visualmente los siguientes estados:
  - **Cargando:** Indicador de carga activo mientras se consumen los datos del endpoint.
  - **Lista vacía:** Mensaje explícito cuando el proyecto no tiene ninguna tarea registrada.
  - **Sin resultados de filtro:** Mensaje claro si el filtro aplicado no contiene elementos.
  - **Errores de conexión:** Mensaje de error amigable en caso de fallos del servidor o de red.

## Restricciones Técnicas
- Utilizar **Angular 17+** con componentes Standalone.
- Utilizar **Signals** para la reactividad de la vista y filtros.
- Generar el modelo, el servicio correspondiente y el componente visual asociado.
