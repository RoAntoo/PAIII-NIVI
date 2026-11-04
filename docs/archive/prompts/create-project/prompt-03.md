Actúa como un desarrollador senior de Angular 17 con experiencia en aplicaciones empresariales.

Contexto del sistema:
Estoy desarrollando el frontend de una aplicación de gestión de tareas y proyectos. El backend es una API REST en Java (Spring Boot) con autenticación JWT que se envía en el header Authorization. El frontend utiliza Angular 17 con standalone components, Signals para el manejo de estado local y Reactive Forms.

Feature a implementar:
A continuación te detallo la especificación de la feature "Crear un nuevo proyecto":

Restricciones técnicas:
- Utilizar HttpClient para la comunicación con el backend. Asumir que el interceptor JWT ya está configurado y funcionando.
- El servicio para comunicarse con la API debe llamarse ProjectService.
- El componente debe ser standalone y utilizar ChangeDetectionStrategy.OnPush para optimizar el rendimiento.
- Implementar Reactive Forms. Es obligatorio crear validadores sincrónicos personalizados (custom validators) para las reglas de negocio de las fechas (endDate >= startDate, y al crear, endDate >= hoy).
- Manejar los estados de la interfaz (loading, error, éxito) estrictamente utilizando Signals de Angular (`signal`).
- Proveer un manejo de errores robusto en el componente para capturar el error 409 (Conflicto) y mostrar el mensaje de "Recurso duplicado", y los errores 400 (Bad Request).

Formato de salida esperado:
Por favor, genera el código completo y listo para usar de los siguientes archivos:
1. El servicio `project.service.ts` (incluyendo las interfaces de TypeScript necesarias para el request y response).
2. El componente `project-create.component.ts`.
3. El template HTML `project-create.component.html` (utilizando clases de Bootstrap 5 para el maquetado del formulario y los mensajes de error).
