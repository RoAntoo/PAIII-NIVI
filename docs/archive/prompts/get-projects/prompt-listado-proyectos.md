# Prompt Principal — Feature: Listado de Proyectos

Actúa como un desarrollador Frontend experto en Angular.

## Contexto del Sistema
Contamos con una aplicación frontend de gestión conectada a un backend en Java que corre en el puerto `8081`. 

## Feature a implementar
Implementar el componente de **Listado de Proyectos** consumiendo el endpoint correspondiente.

## Especificación de la Tarea
- **Endpoint a consumir:** `GET /projects`
- **Visualización:** Mostrar una grilla de tarjetas. Cada tarjeta debe representar un proyecto y visualizar:
  - Nombre del proyecto
  - Descripción
  - Estado (`PLANNED`, `ACTIVE`, `CLOSED`)
  - Fecha de inicio y fecha de fin (formateadas de manera legible)
- **Filtros:** Permitir filtrar localmente la lista de proyectos por su estado.
- **Botón de navegación:** Cada tarjeta debe incluir un botón/enlace interactivo de navegación que redirija al listado de tareas del proyecto correspondiente (`/projects/:projectId/tasks`).
- **Estados de la interfaz:** El componente debe gestionar de forma visual y limpia los siguientes estados:
  - **Cargando:** Indicador de carga mientras se obtienen los datos.
  - **Lista vacía total:** Mensaje descriptivo si no hay proyectos registrados en absoluto en el sistema.
  - **Lista vacía por filtros:** Mensaje si ningún proyecto coincide con el filtro seleccionado.
  - **Errores del servidor:** Manejo de fallas de conexión o respuestas de error de la API, mostrando una alerta amigable.

## Restricciones Técnicas
- Utilizar **Angular 17+** con componentes Standalone.
- Utilizar **Signals** para la gestión reactiva de estados, filtros y datos.
- Mantener estilos CSS limpios y consistentes.
