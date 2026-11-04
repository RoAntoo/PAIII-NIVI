# Prompt Principal: Home y Navbar Global

**Rol y tecnología:**
Actúa como un desarrollador senior experto en Angular 17 con profunda experiencia en maquetación fluida (SPA) y diseño UI/UX personalizado.

**Contexto del sistema:**
Estoy desarrollando el frontend de una aplicación de gestión de tareas y proyectos. El frontend utiliza Angular 17 con standalone components y enrutamiento nativo. Como base estructural se utiliza Bootstrap 5, pero se requiere sobreescribir su diseño estándar mediante CSS global para implementar una estética basada en colores pasteles.

**Especificación de la feature:**
A continuación, te detallo la especificación exacta de lo que necesito construir:

Feature: Diseñar e implementar la página de inicio y la barra de navegación global con estilo personalizado.
Descripción: El usuario puede acceder a una pantalla de bienvenida centralizada. Además, dispone de una barra de navegación superior fija (Navbar) que actúa como el control maestro de rutas para navegar (SPA).
Endpoints: Errores globales de ruteo: 404 / Redirección automática al inicio si la URL no existe.
Restricciones de negocio:
- Barra de navegación visible y fija en todas las pantallas.
- Accesos en la Navbar respetando rutas en plural (`/projects`, `/projects/new`).
- Home centralizando acciones principales.
  Lineamientos técnicos: Standalone components, Angular 17, RouterModule (`routerLink`, `<router-outlet>`), ChangeDetectionStrategy.OnPush. Bootstrap 5 estructural + CSS personalizado global pastel.
  Diseño visual:
- Navbar: Verde Menta Pastel (`#E8F5E9` / `#A5D6A7` activo).
- Home (Hero): Rosa Pastel (`#FCE4EC` / `#F8BBD0` acentos) centrado con bordes redondeados (15px).
- Textos: Gris oscuro (`#2C3E50`).
  Criterios de aceptación:
1. Navbar pastel se mantiene fija sin recargarse al hacer scroll.
2. Navegación fluida (SPA) al hacer clic en enlaces de la Navbar.
3. Redirección automática al Home si se ingresa una ruta inexistente.
4. Manejo de error 500 con alerta visual si falla el contexto global.

**Restricciones técnicas concretas:**
- La barra de navegación debe implementarse en el `app.component.html` envolviendo al `<router-outlet>`.
- El Home debe ser un standalone component independiente ubicado en `features/home`.
- Las reglas de ruteo deben incluir el fallback global `path: '**', redirectTo: ''`.
- El componente Home debe usar `ChangeDetectionStrategy.OnPush`.

**Formato de salida esperado:**
Generar y entregar el código estructurado de los siguientes archivos:
1. `app.component.html` (Estructura de la Navbar global).
2. `app.routes.ts` (Configuración de rutas normalizadas y redirección 404).
3. `home.component.ts`, `home.component.html` y `home.component.css` (Lógica, vista y estilos pasteles del hero).
