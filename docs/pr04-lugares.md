# PR 04 · Sugerencias de lugares cercanos

NIVI clasifica el título de una tarea en el dispositivo. Si activás **Sugerencias de lugares** en Ajustes, al crear o editar una tarea en Android vas a ver una sugerencia para ferreterías, laboratorios o farmacias cuando corresponda. «Retirar los análisis» requiere que confirmes el sentido clínico con la acción **Buscar cerca**. **No me interesa** descarta la sugerencia para esa categoría hasta salir del formulario.

La integración usa Angular 21, TypeScript, Ionic 9, Capacitor 8.6.0 y el plugin Geolocation 8.2.5. El backend existente usa Java 21, Spring Boot 3.5.7, JPA/Hibernate, H2 y autenticación JWT. Se conservan las rutas de tareas y proyectos. [Configuración de Android](android-setup.md) · [Geolocation para Capacitor](https://capacitorjs.com/docs/apis/geolocation)

## Configurar el proveedor

1. En un proyecto de Google Cloud con facturación, habilitá **Places API (New)** y creá una clave de servidor. Restringila a esa API y, si el backend tiene una IP de salida fija, también a esa IP.
2. Definí `GOOGLE_PLACES_API_KEY` en el entorno del proceso del backend, junto con las variables JWT y de CORS. El archivo `backend/.env.example` enumera las variables. El backend puede arrancar sin la clave y, en ese caso, las búsquedas devuelven `503 PLACES_UNCONFIGURED`.
3. Configurá las cuotas por método en Cloud y alertas de presupuesto. La máscara de campos activa los SKU **Nearby Search Pro** y **Place Details Pro**. Revisá la tabla oficial para el área de facturación. [Uso y cuotas](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) · [Precios](https://developers.google.com/maps/billing-and-pricing/pricing)

Un proveedor de puntos de interés basado en OpenStreetMap es una alternativa si se cambia la implementación de `PlacesProvider`, la atribución y el formato de los identificadores guardados.

La aplicación muestra una lista con la atribución de Google Maps y las atribuciones adicionales que devuelve el proveedor. **Abrir en mapas** usa un enlace de Google Maps que Android abre en la app de mapas o el navegador. Las direcciones se muestran si Google las trae. La distancia se calcula en línea recta con las coordenadas devueltas y se omite cuando la ubicación del dispositivo tiene un margen de al menos un kilómetro. El mapa queda en la aplicación externa. [Atribución de Places](https://developers.google.com/maps/documentation/places/web-service/policies) · [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)

El módulo pide acceso a la ubicación aproximada en primer plano al tocar **Buscar cerca**. La solicitud manda coordenadas, radio y categoría. La sugerencia y el texto de la tarea se procesan en el dispositivo. El proxy no registra coordenadas ni almacena resultados. Android deshabilita los logs de Capacitor para que las respuestas del plugin de ubicación queden fuera de Logcat. El frontend sirve `/lugares-politicas.html` con las condiciones y el aviso accesibles desde Ajustes.

## Contrato y cuotas del backend

| Operación autenticada | Comportamiento |
| --- | --- |
| `POST /places/nearby` | Cuerpo JSON con `lat`, `lng`, `category` y `radius` entero en metros de 500 a 5000. Devuelve hasta 8 lugares o `[]`. |
| `GET /places/{id}` | Recupera los datos actuales del lugar al tocar **Ver lugar asociado**. La operación usa el identificador del establecimiento. |

Categorías admitidas y mapeadas en el proveedor.

| Categoría | Tipo en Google Places |
| --- | --- |
| `HARDWARE` | `hardware_store` |
| `LABORATORY` | `medical_lab` |
| `PHARMACY` | `pharmacy` |

Ambas operaciones comparten un límite por instancia de 12 solicitudes en 60 segundos y hasta 2 consultas simultáneas. Un `429` del proveedor pausa las llamadas durante 60 segundos. El proxy usa una máscara de campos explícita, un timeout de conexión de 3 segundos y uno de lectura de 8 segundos. Los errores del proveedor se reducen a códigos recuperables y el cliente ofrece reintentar manualmente. Las respuestas de lugares usan `Cache-Control: no-store` para respetar las condiciones del proveedor. [Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search) · [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details) · [Restricciones de almacenamiento](https://developers.google.com/maps/documentation/places/web-service/policies#pre-fetching-caching-or-storage-of-content)

**Asociar a la tarea** selecciona el lugar en el formulario. El CRUD solo persiste el `placeId` al guardar. En edición, omitir `placeId` conserva el valor y enviarlo como `null` lo quita. La migración H2 `backend/src/main/resources/db/pr04-task-place.sql` agrega una columna nullable y se puede repetir. Para revertir después de volver a la versión anterior del backend, el script `db/rollback/pr04-task-place.sql` elimina la columna y las asociaciones.

## Verificación

Desde la raíz del repositorio en PowerShell.

```powershell
npm.cmd --prefix frontend test -- --watch=false
npm.cmd --prefix frontend run build
Push-Location backend
.\mvnw.cmd verify
Pop-Location
```

Si las pruebas de rutas agotan los cinco segundos de Vitest, podés repetir la suite con una configuración temporal en `frontend/.angular/`.

```powershell
New-Item -ItemType Directory -Path frontend/.angular -Force | Out-Null
Set-Content frontend/.angular/pr04-vitest.config.mjs 'export default { test: { testTimeout: 25000 } };'
npm.cmd --prefix frontend test -- --watch=false --runner-config=.angular/pr04-vitest.config.mjs
```

Para generar e instalar el APK, seguí [la configuración Android](android-setup.md). En un celular físico, con el backend y Places configurados:

- [ ] Activar **Sugerencias de lugares**, crear «Comprar tornillos», tocar **Buscar cerca** y conceder el permiso. Verificar resultados reales, abrir uno en Maps, asociarlo, guardar y volver a ver el lugar desde el formulario de edición.
- [ ] Probar «Hacerme análisis de sangre», «Retirar los análisis» y «Comprar medicamentos». Revisar los resultados de salud donde haya cobertura.
- [ ] Probar «Estudiar para el parcial», «No comprar tornillos», **No me interesa** y la preferencia desactivada. Confirmar que no se solicita ubicación.
- [ ] Denegar el permiso y comprobar que se puede guardar la tarea. Probar también con los servicios de ubicación desactivados, modo avión o un área sin establecimientos.
- [ ] Quitar una asociación y confirmar que sigue ausente al reabrir la tarea. Registrar modelo, versión de Android y evidencia.
