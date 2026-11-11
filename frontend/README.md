> Estado vigente y configuración: ../docs/ESTADO_ACTUAL.md (incluye las correcciones posteriores al merge).

# Frontend Nivi

Ejecutar npm ci, npm start, npm test -- --watch=false y npm run build desde este directorio.

features/projects y features/tasks reúnen domain, data-access y pages. Home compone consultas de esas capacidades. shared/ui contiene componentes reutilizables. Los modelos no dependen de servicios HTTP; las páginas consumen los modelos del módulo. Las rutas conservan las URLs anteriores y heredan parámetros entre límites de carga diferida.

environment.ts configura producción (/api). environment.development.ts se selecciona con fileReplacements para desarrollo (localhost:8081). El despliegue debe configurar proxy /api y fallback SPA. Las dependencias instaladas en la raíz durante el checkout anterior pueden resolver localmente, pero una instalación limpia usa exclusivamente este package-lock.json.
