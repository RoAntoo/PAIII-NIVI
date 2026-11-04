# Estado de implementación — 4 de noviembre de 2026

## Realizado

- Workspace Angular trasladado a frontend/ con package-lock y configuraciones.
- Capacidades projects, tasks y home; servicios HTTP y modelos separados por capacidad.
- Rutas diferidas por capacidad con herencia explícita de parámetros.
- Templates y CSS extensos extraídos a archivos junto a sus componentes.
- Documentación funcional y prompts fuera del código de aplicación.
- Reglas de ignore para salidas de ambas aplicaciones; tareas de editor actualizadas.
- Entornos seleccionados explícitamente; producción usa /api.
- Build optimizado independiente de la descarga de Google Fonts, manteniendo CDN en ejecución.
- README corregido respecto a estados y funciones existentes.

## Pendiente y bloqueo

El usuario incorporó los fuentes en backend/ durante la implementación. Corresponden a una versión diferente de los artefactos históricos: faltan GET de proyecto por ID, DELETE de proyecto y GET de tareas/listado. Los modelos tienen anotaciones JPA y los repositorios de core extienden Spring Data. El PUT de tareas no comprueba pertenencia al projectId. Es necesario completar compatibilidad y separar persistencia antes de considerar cumplida la arquitectura limpia. Se corrigió la codificación de application.properties a UTF-8 y se habilitó un directorio alternativo de build para verificar los fuentes sin mezclar clases históricas.

Siguiente etapa: completar endpoints y garantías del contrato, separar dominio/JPA y puertos/adaptadores, reorganizar paquetes y límites transaccionales, implementar perfiles/migraciones y verificar integración antes de retirar compilados históricos.

Siguen pendientes las mejoras funcionales del plan: consulta resumida del dashboard (requiere backend), paginación, normalización de validaciones, accesibilidad completa del modal, recursos visuales locales, OpenAPI contrastado y CI de ambas aplicaciones. Esta entrega es la base estructural frontend, no la implementación completa del plan. Ionic no se implementó.

## Verificación

Build de producción aprobado con advertencias de presupuesto CSS en home, listado de tareas y listado de proyectos. Pruebas Angular ejecutadas con temporales dentro del workspace por restricciones del entorno. No se ejecutó integración con servidor.

Resultado Java: los 35 fuentes principales y los 8 archivos de prueba compilaron con JDK 21 en target-audit. El contexto Spring inició sobre H2 en memoria, pero la ejecución no finalizó tras la carga del agente de Mockito; se interrumpió sin dar las pruebas por aprobadas. Frontend: 3 pruebas aprobadas y build de producción aprobado.

## Actualización: corrección funcional del backend

Se completaron GET de proyecto, DELETE con cascada, GET de tareas y GET individual. Se protege la pertenencia de tareas al proyecto, se validan cambios antes de mutar entidades y se delimitan transacciones en las entradas HTTP. Se admite limpiar el responsable con null. Los errores de JSON/tipos devuelven 400, y los conflictos de integridad 409. CORS es configurable y las pruebas utilizan H2 en memoria. Mockito carga su agente al arrancar para resolver el bloqueo previo.

Las observaciones anteriores de endpoints ausentes y pruebas bloqueadas quedan superadas por esta corrección. Se mantiene pendiente la separación completa entre dominio y JPA; esta entrega no pretende implementar esa refactorización ni migraciones, dashboard o Ionic.

Verificación final de esta corrección: Maven verify aprobado con 33 pruebas, 0 fallos y 0 errores; JAR generado en backend/target-audit. La integración se comprobó con MockMvc y H2 en memoria, no mediante una sesión de navegador contra la base real.

## Separación del dominio y JPA

Implementada: modelos de dominio sin anotaciones de persistencia, ProjectEntity/TaskEntity independientes, puertos propios, adaptadores Spring Data y mapper. Los filtros JPA quedaron dentro de persistencia. Las consultas y eliminaciones de los controladores delegan en casos de uso. La transacción HTTP cubre la operación y los adaptadores se incorporan a ella. No se cambiaron tablas ni endpoints.

Se agregaron pruebas de objetos de dominio independientes de la sesión JPA, preservación de tareas al actualizar proyectos, rollback de borrado y filtros por solapamiento de fechas; también se controla que el núcleo no dependa de Spring, JPA, Jackson o adaptadores. Esta sección sustituye las observaciones históricas que marcaban la separación dominio/JPA como pendiente.

Validación final de la separación: Maven verify aprobado con 37 pruebas, sin fallos ni errores, y JAR generado en target-audit. Se verificó con H2 en memoria; no se ejecutó una migración ni se modificó la base local existente.
