# SPEC: Página de Inicio (Home) y Barra de Navegación Global

**Nombre de la feature:**
Diseñar e implementar la página de inicio y la barra de navegación global con estilo personalizado y componentes dinámicos reactivos.

**Descripción general:**
El usuario puede acceder a una pantalla de bienvenida centralizada que introduce el propósito de la aplicación y ofrece accesos directos. Además, dispone de una barra de navegación superior fija (Navbar) que actúa como el control maestro de rutas para navegar de forma fluida (SPA) por todos los módulos del sistema sin recargar la página.

Adicionalmente, el Home presenta un Dashboard dinámico compuesto por dos secciones:
1. **Sección de Resumen (Izquierda):** Muestra tarjetas interactivas de los primeros 3 proyectos obtenidos del backend, visualizando su estado y barra de progreso.
2. **Sección de Actividad Reciente (Derecha):** Presenta un timeline cronológico interactivo que muestra las últimas 4 tareas añadidas a cualquier proyecto de la plataforma mediante consultas reactivas concurrentes.

**Endpoints involucrados:**
- **Proyectos:** `GET /projects` (Usado para listar los proyectos en la sección de resumen y recolectar sus IDs).
- **Tareas por Proyecto:** `GET /projects/{projectId}/tasks` (Usado en paralelo para consultar las tareas de cada proyecto individualmente).
- **Navegación:** Redirección automática de rutas inexistentes (404) al Home.

**Restricciones de negocio:**
- La barra de navegación debe ser visible y fija en todas las pantallas de la aplicación.
- Los accesos en la Navbar deben respetar las convenciones de rutas en plural del sistema (`/projects`, `/projects/new`).
- La sección de bienvenida ("Hero") debe centralizar las acciones principales del usuario basándose en los módulos disponibles.
- El panel de resumen debe limitar la visualización a los primeros 3 proyectos del backend.
- El timeline de actividad reciente debe limitar la visualización a las 4 tareas más recientes de todos los proyectos creados, ordenadas de más reciente a más antigua.

**Lineamientos técnicos:**
- **Framework:** Standalone components, Angular 17.
- **Navegación SPA:** `RouterModule` mediante `routerLink` y `<router-outlet>`.
- **Rendimiento:** `ChangeDetectionStrategy.OnPush` en conjunto con el sistema de reactividad de Angular (`Signals`) para manejar el estado de carga y visualización de proyectos/tareas.
- **Reactividad:** Uso de observables RxJS combinados mediante `forkJoin` para consultar de forma concurrente las tareas de todos los proyectos disponibles en el backend y aplanar el resultado final.
- **Estilos:** Bootstrap 5 integrado mediante CDN en `index.html` para la estructura y rejilla, anulando su diseño base mediante una paleta personalizada de colores pasteles y animaciones CSS exclusivas del componente.

**Lineamientos de diseño visual:**
- **Paleta de colores pasteles:**
  - Verde Menta Pastel (`#E8F5E9` / `#A5D6A7` para estados activos): Aplicado en la Navbar, botón "Ver Mis Proyectos" e indicadores del timeline.
  - Rosa Pastel (`#FCE4EC` / `#F8BBD0` para acentos): Aplicado en el Hero, botón "Crear Proyecto Nuevo" y badges de tareas pendientes.
  - Texto: Gris oscuro (`#2C3E50`) para legibilidad.
- **Layout:**
  - Navbar fija en el tope superior (`fixed-top`).
  - Contenedor "Hero" con bordes redondeados (`border-radius: 15px`) y sombra suave.
  - Dashboard inferior dividido en 2 columnas: 7/12 para Resumen de Proyectos y 5/12 para Actividad Reciente.
- **Timeline de actividad:** Indicadores visuales circulares de colores diferenciados según el estado de la tarea (Pendiente -> Rosa, En progreso -> Azul, Completada -> Verde) con enlaces interactivos.
- **Mensajes de sistema y errores:** Redirección automática silenciosa al Home en caso de ruteo erróneo. Estados vacíos estilizados con mensajes explicativos y botones de llamada a la acción en caso de que no existan proyectos o tareas.

**Criterios de aceptación:**
1. Dado que el usuario se encuentra en cualquier pantalla de la aplicación, cuando visualiza el tope de la página, entonces la Navbar pastel se mantiene fija en su posición sin desaparecer ni recargarse al hacer scroll.
2. Dado que el usuario hace clic en el enlace "Crear Proyecto" o "Ver Proyectos" de la Navbar, cuando el Router de Angular intercepta la acción, entonces la pantalla cambia instantáneamente al componente correspondiente de forma fluida (SPA) sin pestañeo blanco ni recarga tradicional.
3. Dado que el usuario escribe manualmente una ruta que no existe en la barra de direcciones (ej: `/cualquier-cosa`), cuando presiona Enter, entonces el sistema intercepta el error de ruteo y lo redirige automáticamente a la página de inicio (Home).
4. Dado que existen proyectos en el backend, cuando el usuario accede al Home, entonces la aplicación muestra en la sección de Resumen tarjetas para los primeros 3 proyectos, detallando su nombre, estado (Planificado, En progreso, Cerrado) y una barra de progreso porcentual adaptada a su estado actual.
5. Dado que el usuario hace clic en una tarjeta de proyecto o en el enlace "Ver Tareas", entonces la aplicación redirige al usuario de forma fluida (SPA) a la vista `/projects/:id/tasks` de ese proyecto específico.
6. Dado que existen proyectos con tareas asociadas, cuando el usuario accede al Home, entonces ve las 4 tareas más recientes ordenadas cronológicamente por fecha de creación (de más reciente a más antigua).
7. Dado que el usuario hace clic en el nombre de una tarea en la sección de Actividad Reciente, entonces la aplicación lo redirige directamente a la sección de tareas de su respectivo proyecto.
8. Dado que no existen proyectos en el backend, cuando el usuario accede al Home, entonces en la sección de Resumen ve un estado vacío explicativo con un botón interactivo "Crear Proyecto".
9. Dado que no existen tareas creadas en el backend para los proyectos existentes, cuando el usuario accede al Home, entonces en la sección de Actividad Reciente se visualiza un estado vacío que indica "Sin actividad reciente" con una aclaración descriptiva.

**Prompts utilizados:**
- Agente IA: Gemini (gemini.ai)
- Prompt principal: ver archivo prompt-home.md adjunto en el PR.
