# Propuesta de Normalización de Datos UI/UX

**Fecha:** 26 de Diciembre, 2024
**Estado:** Pendiente de Implementación

## 📋 Resumen de Auditoría

Tras una revisión de la interfaz de usuario, se han identificado diversas áreas donde la consistencia de los datos puede mejorarse para ofrecer una experiencia más profesional y coherente.

## 🔍 Hallazgos y Puntos de Mejora

### 1. Nombres de Estudiantes
*   **Problema:** Existen mezclas de formatos (`APELLIDO NOMBRE` en mayúsculas, `Nombre Apellido` en formato mixto, y casos de `Apellido,Nombre` sin espacio).
*   **Propuesta:** Normalizar todos los nombres al formato **"Apellidos, Nombres"** utilizando *Title Case* (ej: `Castro Pérez, Víctor`).

### 2. Códigos de Cursos
*   **Problema:** Los códigos varían en longitud según la página. En el inicio son muy largos (`EPM-B01-BLQ02-V-2025-20251225`), mientras que en otras partes se usan versiones cortas.
*   **Propuesta:** Estandarizar una visualización corta para headers y listas (ej: `EPM-B01`) y reservar el código completo para detalles técnicos o metadatos internos.

### 3. Formato de Fechas
*   **Problema:** Uso inconsistente de formatos. Algunas vistas muestran `DD/MM/YYYY, HH:mm` y otras incrustan la fecha como `YYYYMMDD` en cadenas de texto.
*   **Propuesta:** Utilizar un estándar regional único (`DD/MM/YYYY`) para toda la información visible al usuario final.

### 4. Consistencia en Badges y Etiquetas
*   **Problema:** Algunos badges están en mayúsculas sostenidas (`PAGADO`, `WEB`) y otros en formato oración (`Pendiente`).
*   **Propuesta:** Definir un estilo único (ej: *MAYÚSCULAS* para estados core y *Capitalized* para etiquetas informativas) mediante clases CSS globales.

### 5. Terminología y Lenguaje
*   **Problema:** Uso del término inglés "Draft" en una aplicación mayoritariamente en español.
*   **Propuesta:** Cambiar "Draft" por **"Seguimiento"** o **"Borradores"**. Además, normalizar los nombres de los cursos para evitar mayúsculas sostenidas en títulos largos.

## 🛠️ Plan de Acción Futuro

1.  **Utilidades Core:** Crear un archivo `src/app/core/utils/formatter.ts` con funciones puras para estas transformaciones.
2.  **Pipes de Angular:** Implementar un `NormalizePipe` para aplicar estas reglas directamente en los templates HTML de forma reactiva.
3.  **Normalización en Origen:** Ajustar los procesos de importación (CSV/JSON) para normalizar los datos antes de guardarlos en el almacenamiento.

---
*Documento preparado para implementación futura.*
