> Estado vigente y configuración: docs/ESTADO_ACTUAL.md (incluye las correcciones posteriores al merge).

# Nivi — proyectos y tareas

Aplicación Angular 21 organizada por capacidades funcionales dentro de un repositorio compartido con el backend Java.

- frontend/: workspace Angular, modelos, acceso HTTP, páginas y componentes compartidos.
- backend/: fuentes Java recuperados; target/ contiene artefactos históricos de una versión distinta. La compatibilidad completa con el frontend está pendiente.
- docs/: arquitectura, especificaciones y material histórico.

## Desarrollo

Desde la raíz:

    npm --prefix frontend ci
    npm --prefix frontend start
    npm --prefix frontend test -- --watch=false
    npm --prefix frontend run build

Desarrollo usa http://localhost:8081. Producción usa /api: el servidor web debe reenviar /api/projects al backend como /projects, y servir index.html como fallback para las rutas Angular. Las variables frontend son públicas y no deben contener credenciales.

Funciones disponibles: alta, consulta, edición y eliminación de proyectos; alta, consulta y edición de tareas por proyecto. Estados de tareas: TODO, IN_PROGRESS, DONE. La edición actual no cambia estados y no existe eliminación individual ni prioridad de tareas.

Los recursos Bootstrap, iconos y fuentes siguen sirviéndose desde CDN. El build no descarga Google Fonts porque se desactivó únicamente el inlining de fuentes; esto no habilita funcionamiento offline.

Consultar docs/ESTADO_REESTRUCTURACION.md para las entregas realizadas y pendientes.
