# PR 01 — Diagnóstico, contrato y evidencia

## Diagnóstico previo a los cambios

Inspección del repositorio realizada el 11/11/2026, con árbol de trabajo inicialmente limpio.

| Área | Estado inicial observado |
|---|---|
| Frontend | Angular standalone 21.2.8, TypeScript 5.9, Ionic Angular 9.0.10, RxJS 7.8; RouterOutlet de Angular y ejecución sin Zone.js |
| Entorno | Node 24.14.1, npm 11.21.2; JDK 21 disponible (el Java por defecto del equipo era 26) |
| Móvil | Sin Capacitor ni carpetas Android/iOS. Ionic CLI solo compilaba la web |
| Backend | Java 21, Spring Boot 3.5.7, Maven Wrapper, Spring Data JPA / Hibernate 6.6.33 |
| Datos | H2 2.3.232, archivo local por defecto; Hibernate update y SQL H2 de inicialización; tests con H2 en memoria |
| Autenticación | Cuenta única configurada por entorno, JWT HS256 de una hora, rutas protegidas, sesión web en sessionStorage; sin registro ni separación por propietario |
| API | Proyectos en `/projects`; tareas en `/projects/{projectId}/tasks`; lectura/alta/edición, sin eliminación individual ni actualización de estado |
| Modelo | ID Long generado por servidor, título, horas, responsable, estado TODO/IN_PROGRESS/DONE, createdAt/finishedAt sin zona; sin categoría/origen |
| Pruebas iniciales | 19 frontend y 50 backend aprobadas. Primer intento frontend falló por EPERM de temporales, resuelto usando TEMP/TMP dentro de frontend/.angular/test-temp |
| Android local | Sin SDK detectado en ubicación estándar ni ANDROID_HOME/ANDROID_SDK_ROOT configurados |

## Resultado implementado

- Capacitor core/CLI/Android **8.6.0**, Preferences **8.0.1**, proyecto Android nativo y scripts de sincronización/build/ejecución. No se actualizó Angular ni Ionic.
- Configuración explícita de API para Android, HTTPS por defecto y HTTP de desarrollo limitado a debug. Release rechaza bundles preparados con HTTP. Instrucciones completas en [android-setup.md](android-setup.md).
- Ajustes persistentes de voz, OCR, QR, lugares, recordatorios y offline. Lugares y offline empiezan desactivados. Los seis switches guardan preferencias futuras y muestran «Disponible después de implementar PR…». No hay botones que simulen esas funciones.
- `SettingsService` espera la lectura inicial; recupera datos antiguos, ignora flags desconocidos/tipos inválidos y conserva el valor anterior si el guardado falla. Preferences es real; usa SharedPreferences en Android y localStorage en web.
- Servicio de capacidades separado del almacenamiento y de las páginas; exige implementación, preferencia y plugin disponible antes de habilitar un módulo. Ofrece alternativa manual si falta un plugin.
- CRUD centralizado en TaskService, validación previa a HTTP, timeout de 15 segundos y mapeo DTO → modelo con defaults para respuestas antiguas. La edición omite propiedades no suministradas.
- Categoría editable, origen persistido y preparación de un identificador opcional de cliente. Edición de estado con fecha de completado, reapertura y eliminación individual confirmada. Se conservan proyectos, IDs, horas, responsables y autenticación.
- Nombre visible NIVI y tokens amarillo `#F7EFC6`, ciruela `#4B1D45`, verde `#12B892`, sin rediseño de páginas. Bootstrap y sus iconos se empaquetan localmente; se usa fuente de sistema como fallback, sin llamadas obligatorias a Google Fonts.

## Contrato compatible y migración

Rutas conservadas:

```http
GET/POST       /projects/{projectId}/tasks
GET/PUT        /projects/{projectId}/tasks/{taskId}
GET            /projects/recent-tasks
```

Se incorpora `DELETE /projects/{projectId}/tasks/{taskId}` → 204. Recursos faltantes o ajenos al proyecto → 404. Crear, editar, completar o borrar tareas de un proyecto cerrado → 409. Los errores conservan `{error, message, code}`.

`POST` sigue aceptando los campos anteriores. Agrega opcionalmente:

| Campo | Valores / comportamiento |
|---|---|
| source | MANUAL (default), VOZ, OCR, QR; se conserva al editar |
| category | GENERAL (default), COMPRAS, SALUD, ESTUDIO, TRABAJO, OTRA |
| clientRequestId | UUID opcional y único; null para tareas antiguas. Duplicado → 409 DATA_CONFLICT |

`PUT` ahora admite `status` y `category`; omitirlos conserva el valor y null explícito se rechaza. `assignee` omitido conserva el responsable; null lo elimina. Los endpoints de consulta y actividad reciente devuelven todos los campos anteriores más los metadatos nuevos.

Los IDs primarios siguen siendo numéricos del servidor. `clientRequestId` prepara la identificación de futuras operaciones; la UI manual todavía no lo genera. **No se implementan replay idempotente, cola offline ni sincronización.** PR 05 deberá resolver reintentos/recuperación y concurrencia, sin tomar un 409 como éxito automático.

`db/pr01-task-metadata.sql` se ejecuta después de Hibernate y antes de `required-columns.sql`. Agrega columnas, rellena exclusivamente los metadatos faltantes con MANUAL/GENERAL y crea un índice único para client_request_id. La migración admite repetición, no recrea tablas ni cambia IDs. Se prueba también contra un esquema anterior sin esas columnas.

Antes de abrir una base persistente, respaldarla con la aplicación detenida. No se usó la base del usuario para las verificaciones. Para volver al código anterior, detener app, respaldar, aplicar manualmente `db/rollback/pr01-task-metadata.sql` y restaurar la versión anterior antes de arrancar. El rollback conserva las tareas y descarta los tres metadatos nuevos; está probado en H2 temporal.

Se conserva el contrato de fechas existente: los proyectos usan fecha sin hora; createdAt/finishedAt de tareas son LocalDateTime sin zona. Los tiempos nuevos se normalizan a microsegundos para coincidir con H2. No se incorpora dueAt ni se convierten fechas de proyecto en recordatorios: fecha/hora/zona de vencimientos se resolverán al implementar recordatorios.

## Evidencia y pendientes

- Frontend: `npm --prefix frontend test -- --watch=false` → **41 pruebas aprobadas**. Incluye restauración de ajustes con el adaptador web real, errores de storage, DTO antiguos, campos conservados, título vacío bloqueado, fallos de API, reintento y borrado confirmado.
- Backend: desde backend, JDK 21 y `.\mvnw.cmd verify '-Dnivi.build.directory=target-audit'` → **56 pruebas aprobadas**, JAR generado. Incluye HTTP + JPA + H2 reales en tests, migración repetible/rollback, defaults, metadatos, restricción de UUID único, completar/reabrir y borrado, límites por proyecto y proyectos cerrados.
- Web: `npm --prefix frontend run build` → aprobado. Se mantienen tres warnings de presupuesto de CSS de componentes; aparece además un warning de bundle inicial (aprox. 829 kB frente a 500 kB) por incluir los estilos e iconos locales. El límite de error de 1 MB no se modificó.
- Android: `cap add android` y `cap sync android` → aprobados, plugin Preferences registrado. Intento de compilación detenido por ausencia del SDK. **No hay APK generado, Gradle/release verificados ni prueba en Android Studio/celular.**
- Configuración del bundle Android: seis comprobaciones locales aprobadas (URL obligatoria, rechazo de HTTP sin opt-in, credenciales/query rechazadas, HTTPS y HTTP debug aceptados); configuración web pública conservada.
- Navegador: el intento de abrir el servidor local desde la herramienta de navegador terminó en timeout; no se registra como validación visual.
- `npm audit` online: **60 alertas (3 críticas, 27 altas, 25 moderadas, 5 bajas)**. No se ejecutó `npm audit fix` ni se actualizó todo el stack. Se requiere una revisión de dependencias separada; este resultado no certifica ausencia de problemas en producción.
- Sin lint configurado. CI existente de frontend/backend conservada; no se ejecutó CI remota. No se hicieron commits, ramas, push ni creación de PR.

## Aceptación

- [x] Stack y contrato reales registrados, suite inicial ejecutada.
- [x] Base Capacitor/Android generada y sincronizada.
- [x] Ajustes persistentes y capacidades con módulos futuros claramente identificados.
- [x] Contrato compatible, migración y CRUD cubiertos por pruebas automatizadas.
- [x] Documentación de variables, conectividad y build reproducible.
- [ ] Compilar e instalar APK con SDK Android disponible.
- [ ] Verificar CRUD, API y preferencias en celular físico; adjuntar modelo/Android/capturas.
- [ ] Revisión y aceptación final del PR.

El código está preparado para revisión; **PR 01 no cumple todavía los criterios de aceptación Android** hasta completar esas verificaciones. Voz, OCR, QR, lugares, notificaciones y sincronización quedan para PR 02–05.
