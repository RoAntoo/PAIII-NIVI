# Contexto del Sistema
Soy una desarrolladora de Angular (version estable vigente) trabajando en una aplicacion de gestion de tareas y proyectos.

* **Backend:** API REST en Java (Spring Boot) con autenticacion JWT en el header Authorization.
* **Frontend:** Angular con standalone components, Bootstrap 5, Reactive Forms y HttpClient con un interceptor JWT ya existente en auth.interceptor.ts.

# Feature a implementar
Editar proyecto existente

# Restricciones tecnicas
* Usar HttpClient con el interceptor JWT ya existente, no generarlo.
* El servicio debe llamarse ProjectService y vivir en src/app/services/
* El componente debe ser standalone con ChangeDetectionStrategy.OnPush
* Ruta: /projects/:id/edit
* El componente carga los datos actuales del proyecto con GET /projects/:id al inicializar y pre-popula el formulario.
* Manejar estados de carga, error 404, error 409 (nombre duplicado) y error de red en el template.
* Validacion sincronica en cliente: campos requeridos y endDate >= startDate
* Al guardar con exito redirigir a /projects

# Archivos a Generar
* update-project.component.ts
* update-project.component.html

# No generar
* El interceptor JWT
* El modulo de routing completo
