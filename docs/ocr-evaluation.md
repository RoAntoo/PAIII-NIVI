# Evaluación de OCR de fotos · NIVI PR 03

El 23 de noviembre de 2026 se procesaron seis fotografías públicas en un emulador Pixel 8 x86_64 con Android 17. Se ejecutó el mismo lector Android incluido en el APK debug, con el modelo latino incorporado de ML Kit Text Recognition v2 16.0.1. Las muestras se eligieron para variar encuadre, contraste, tamaño de letra y escritura. Las fotos quedan en sus respectivas fuentes.

El tiempo incluye decodificación, orientación EXIF e inferencia. Se midió una pasada en el orden de la tabla, con el modelo frío en M1. La columna de líneas cuenta los fragmentos devueltos por ML Kit antes del filtrado en NIVI. Puede incluir texto parcial, precios y encabezados. Cada resultado se revisó visualmente contra la foto.

| Foto | Tipo | Líneas detectadas | Tiempo | Observación |
| --- | --- | ---: | ---: | --- |
| M1 · [Lista de compras, cottonbro studio](https://www.pexels.com/photo/bread-hand-notes-eggs-4057737/) | Manuscrita en letra de imprenta, cerca de la cámara | 3 | 13,5 s | Recuperó los tres productos completos. |
| M2 · [Lista numerada, RDNE Stock project](https://www.pexels.com/photo/to-do-list-on-a-notepad-8581008/) | Manuscrita en cursiva, papel inclinado | 12 | 6,9 s | Recuperó fragmentos que requieren corrección. Confundió letras, omitió tareas e incluyó números de renglones vacíos. |
| M3 · [Lista manuscrita, Alina Rossoshanska](https://www.pexels.com/photo/hand-written-checklist-16791349/) | Manuscrita en tinta tenue, enfoque parcial | 2 | 3,4 s | Los dos fragmentos resultaron ilegibles como tareas. |
| P1 · [Menú, Erik Mclean](https://www.pexels.com/photo/a-close-up-shot-of-a-menu-9268652/) | Impresa, foco selectivo y varias columnas | 29 | 4,5 s | Leyó platos en la zona enfocada. Separó precios de nombres y confundió caracteres en los bordes. |
| P2 · [Menú, RDNE Stock project](https://www.pexels.com/photo/close-up-photo-of-menu-on-wooden-table-top-4921028/) | Impresa, boca abajo y con foco desigual | 7 | 2,7 s | Detectó el encabezado y varios ítems. Confundió letras y omitió las líneas más tenues. |
| P3 · [Menú, Tima Miroshnichenko](https://www.pexels.com/photo/grayscale-photo-of-person-holding-a-menu-6327144/) | Impresa, letra chica, sombra y dos columnas | 76 | 7,0 s | Recuperó varios títulos. Las columnas, las descripciones largas y las sombras produjeron errores. |

El modelo local queda como implementación de PR 03. Dio una lectura útil en la lista manuscrita con letras grandes. Las muestras en cursiva o con enfoque parcial exigieron correcciones importantes. Para la prueba en celular, encuadrar una sola columna con el papel de frente y luz uniforme. La revisión de NIVI permite editar, desmarcar, quitar y agregar renglones.

Se evaluó por documentación Google Cloud Vision con `DOCUMENT_TEXT_DETECTION` como alternativa para manuscritos difíciles. Procesa imágenes de documentos y requiere enviar la foto a Google Cloud, conexión y facturación por imagen. Integrarlo implicaría guardar credenciales en el backend y definir tratamiento y retención de fotos. Queda fuera de esta implementación y no se midió contra el conjunto de prueba. [Documentación de manuscritos](https://docs.cloud.google.com/vision/docs/handwriting), [precios de Cloud Vision](https://cloud.google.com/vision/pricing).

Además de la medición, se importó M1 desde la galería de Android en NIVI. La revisión mostró tres líneas. Se cambió el primer título, se desmarcó el segundo y el backend H2 de prueba confirmó exactamente dos tareas con origen `OCR`.

Queda pendiente repetir la captura de una lista manuscrita en español y su guardado en un celular físico. Para repetir el muestreo, descargar las fotos de sus fichas enlazadas, importarlas por **Elegir de la galería** y revisar los renglones con la foto al lado.
