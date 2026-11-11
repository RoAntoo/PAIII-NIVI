# Estado actual — 11 de noviembre de 2026

La referencia vigente es la implementación local del **PR 01**. El [diagnóstico y la evidencia](pr01-base.md) distinguen lo implementado de lo pendiente. ESTADO_REESTRUCTURACION.md y REVISION_BACKEND.md conservan revisiones históricas.

## Funciones y arquitectura

- Angular standalone 21.2.8, Ionic Angular 9.0.10, TypeScript 5.9; RouterOutlet de Angular y ejecución sin Zone.js.
- Java 21, Spring Boot 3.5.7, JPA/Hibernate, H2. El dominio sigue independiente de Spring/JPA/Jackson.
- Cuenta única configurada por entorno, JWT de una hora, sesión en sessionStorage, rutas protegidas y token enviado solo a la API configurada. Sin registro, refresh token ni separación por propietario.
- Proyectos con CRUD, filtros y contadores agregados. Home conserva limit=3 y consulta de cuatro tareas recientes.
- Tareas con CRUD completo, categoría, origen, estados TODO/IN_PROGRESS/DONE y fecha de completado. Completar de nuevo conserva la fecha; reabrir la borra. No se permite crear, editar ni borrar tareas de proyectos cerrados.
- Textos de hasta 255 caracteres, horas enteras positivas, actualizaciones parciales y borrado confirmado. Assignee omitido conserva el valor; null lo elimina.
- Metadatos compatibles de tareas antiguas: MANUAL/GENERAL. UUID de cliente opcional y único como preparación para reintentos; todavía no hay replay idempotente ni sincronización.
- Capacitor core/CLI/Android 8.6.0 y Preferences 8.0.1. Nombre NIVI, appId ar.edu.nivi.app, proyecto Android generado y sincronizado.
- Ajustes persistentes con seis flags. Los módulos futuros indican el PR pendiente. Lugares y offline desactivados inicialmente. Servicio de capacidades separado, sin permisos sensibles al iniciar.
- Tokens NIVI y recursos Bootstrap/iconos empaquetados localmente. Se conserva el diseño general de las páginas.

## Desarrollo y datos

Consultar los README de raíz, frontend y backend. La [guía Android](android-setup.md) documenta SDK/JDK, CORS para https://localhost, URL de API accesible desde emulador/celular y HTTP exclusivamente debug. Las variables de .env.example son referencias; los procesos no cargan esos archivos automáticamente.

Respaldar la base persistente antes de cambiar el esquema. El SQL sigue siendo específico de H2 y posterior a Hibernate. PR 01 incorpora una migración aditiva/repetible de metadatos y un rollback manual probado, conservando los IDs y campos previos. Las verificaciones usaron H2 temporal, sin modificar la base del usuario.

## Verificación

- Base inicial del PR 01: 19 pruebas frontend y 50 backend aprobadas.
- Resultado actual: 33 pruebas frontend y 56 backend aprobadas; build Angular de producción y JAR backend aprobados.
- Capacitor Android generado y sincronizado con Preferences real registrado.
- La compilación del APK se detuvo por falta de SDK Android. No se abrió Android Studio ni se probaron Gradle/release o un celular físico. [Checklist pendiente](android-setup.md).
- Intento de verificación visual del servidor local: timeout en el navegador de pruebas. No se registra como prueba visual aprobada.
- Se mantienen tres warnings CSS y se agrega uno de bundle inicial por los recursos locales (aprox. 829 kB; límite de error 1 MB conservado).
- npm audit online: 60 alertas, 3 críticas, 27 altas, 25 moderadas y 5 bajas. Revisión de dependencias pendiente.
- Sin script de lint. Workflow existente de tests frontend/backend y build web conservado, sin ejecución remota durante este trabajo.
- No se crearon ramas ni commits y no se hicieron push ni PR remotos.

## Pendientes de alcance

El código del PR 01 queda preparado para revisión, con aceptación Android pendiente de APK y prueba física. Voz (PR 02), cámara/OCR/QR (PR 03), lugares (PR 04), recordatorios y offline/sync (PR 05) no están implementados. El CRUD sigue requiriendo backend. Multiusuario, OpenAPI, paginación completa y gestión versionada de todas las migraciones siguen fuera de este incremento.
