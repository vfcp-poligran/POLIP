# 🔍 AUDITORÍA: Problemas en APK Android - Importación CSV y UI Móvil

**Fecha**: 2025-12-30  
**Versión**: 4.0.1  
**Plataforma**: Android APK

---

## 📋 RESUMEN EJECUTIVO

Se identificaron **3 problemas críticos** en la versión APK que afectan la funcionalidad de creación/edición de cursos en dispositivos móviles:

1. ❌ **Área de importación no visible** en modo edición móvil
2. ❌ **Archivos CSV no se pueden seleccionar** desde el selector de archivos
3. ⚠️ **Solapamiento de botones FAB** en móvil

---

## 🔴 PROBLEMA 1: Área de Importación No Visible en Móvil

### Descripción
Al activar el modo edición en dispositivos móviles (tanto al crear un nuevo curso como al editar uno existente), el área de importación de archivos CSV/JSON **no se muestra en pantalla**.

### Ubicación del Código
**Archivo**: `src/app/pages/cursos/cursos.page.html`  
**Líneas**: 228-276

### Causa Raíz
El área de importación está dentro de un layout de **2 columnas en grid** (`grid-template-columns: 1fr 340px`) que en móvil se colapsa a 1 columna, pero los estilos CSS pueden estar ocultando o colapsando incorrectamente el contenedor.

```html
<!-- LÍNEA 229-276: Sección de Importación -->
<div class="import-side">
  <h4 class="section-title">{{ info.esNuevo ? 'Cargar Estudiantes' : 'Actualizar Datos' }}</h4>
  <div class="import-cloud-grid">
    <!-- Import Personas -->
    <div class="import-cloud-item" (click)="importEstudiantesInput.click()">
      <!-- ... -->
    </div>
    <!-- Import Calificaciones -->
    <div class="import-cloud-item" (click)="importCalificacionesInput.click()">
      <!-- ... -->
    </div>
  </div>
</div>
```

### Análisis CSS
**Archivo**: `src/app/pages/cursos/cursos.page.scss`  
**Líneas**: 554-617

```scss
.import-side {
  // ...
  padding: spacing('xs') spacing('sm'); // Muy compacto en móvil
  
  @include bp.respond-to(md) {
    padding: spacing('sm') 0;
    gap: spacing('xs');
  }
}
```

**Problema detectado**: 
- El padding extremadamente compacto (`spacing('xs')` = 8px) puede hacer que el área sea casi invisible
- No hay verificación de `display` o `visibility` que pudiera estar ocultándolo
- Posible conflicto con el accordion que envuelve esta sección

### 🔧 SOLUCIÓN PROPUESTA

#### Opción A: Aumentar Visibilidad en Móvil (Recomendada)
```scss
.import-side {
  display: flex !important; // Forzar visibilidad
  flex-direction: column;
  gap: spacing('sm'); // Aumentar de 'xs' a 'sm'
  padding: spacing('md'); // Aumentar padding en móvil
  background: rgba($azul-claro, 0.05); // Fondo sutil para visibilidad
  border: 1px solid rgba($azul-claro, 0.2); // Borde para delimitar
  border-radius: $radius-sm;
  
  @include bp.mobile-only {
    padding: spacing('md') spacing('sm');
    min-height: 120px; // Garantizar altura mínima
  }
  
  .section-title {
    font-size: 0.85rem; // Aumentar tamaño de fuente
    font-weight: 600;
    color: $azul-oscuro;
  }
}
```

#### Opción B: Reorganizar Layout para Móvil
Mover el área de importación **fuera del accordion** en móvil y colocarla como sección independiente arriba de todo:

```html
<!-- NUEVO: Sección de importación ANTES del accordion en móvil -->
@if (modoEdicion() && isMobile()) {
  <div class="mobile-import-section">
    <h4>Importar Datos</h4>
    <!-- Contenido de importación aquí -->
  </div>
}

<!-- Accordion existente -->
<ion-accordion-group>
  <!-- ... -->
</ion-accordion-group>
```

---

## 🔴 PROBLEMA 2: Archivos CSV No Reconocidos en Android

### Descripción
El selector de archivos HTML5 (`<input type="file">`) **no permite seleccionar archivos CSV** desde el explorador de archivos de Android, o los archivos CSV no aparecen en la lista.

### Ubicación del Código
**Archivo**: `src/app/pages/cursos/cursos.page.html`  
**Líneas**: 245-248, 264-267

```html
<input type="file" #importEstudiantesInput
  accept=".csv,application/json,text/csv,text/comma-separated-values,application/csv,application/vnd.ms-excel"
  (change)="onEstudiantesFileSelected($event)"
  style="display: block; width: 0; height: 0; opacity: 0; position: absolute; pointer-events: none;" />
```

### Causa Raíz
El atributo `accept` puede no ser compatible con todos los tipos MIME en Android. Algunos dispositivos Android no reconocen ciertos MIME types o extensiones.

**Problemas identificados**:
1. **MIME types redundantes o incorrectos**: `application/csv` no es estándar
2. **Falta de MIME type genérico**: No incluye `*/*` como fallback
3. **Input oculto con `pointer-events: none`**: Puede interferir con el click programático en algunos WebViews

### 🔧 SOLUCIÓN PROPUESTA

#### Solución 1: Usar Capacitor Filesystem Plugin (Recomendada)
Reemplazar el `<input type="file">` HTML por el plugin nativo de Capacitor:

```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

async seleccionarArchivoCSV() {
  try {
    const result = await FilePicker.pickFiles({
      types: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      multiple: false,
      readData: true // Leer contenido directamente
    });
    
    if (result.files && result.files.length > 0) {
      const file = result.files[0];
      const contenido = file.data; // Base64 o texto
      await this.procesarArchivoCSV(contenido, file.name);
    }
  } catch (error) {
    console.error('Error al seleccionar archivo:', error);
    this.toastService.showError('No se pudo seleccionar el archivo');
  }
}
```

**Instalación requerida**:
```bash
npm install @capawesome/capacitor-file-picker
npx cap sync
```

#### Solución 2: Mejorar el Input HTML (Temporal)
Si no se puede usar el plugin nativo inmediatamente:

```html
<input type="file" #importEstudiantesInput
  accept="text/csv,text/comma-separated-values,application/vnd.ms-excel,application/json,*/*"
  (change)="onEstudiantesFileSelected($event)"
  style="position: absolute; left: -9999px; width: 1px; height: 1px;" />
```

**Cambios**:
- ✅ Remover `application/csv` (no estándar)
- ✅ Agregar `*/*` al final como fallback
- ✅ Cambiar ocultamiento de `opacity: 0` a `left: -9999px` (más compatible)
- ✅ Remover `pointer-events: none`

#### Solución 3: Agregar Permisos Explícitos en Android
Verificar que el `AndroidManifest.xml` tenga los permisos correctos:

```xml
<!-- Ya presente en líneas 55-60, verificar que esté activo -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

<!-- Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<!-- Para documentos (CSV, JSON) -->
<uses-permission android:name="android.permission.READ_MEDIA_DOCUMENTS" />
```

---

## ⚠️ PROBLEMA 3: Solapamiento de Botones FAB

### Descripción
Los botones FAB (Floating Action Buttons) en modo edición móvil tienen **solapamiento visual** debido a posicionamiento muy cercano.

### Ubicación del Código
**Archivo**: `src/app/pages/cursos/cursos.page.html`  
**Líneas**: 60-84

```html
<!-- FAB Crear Curso -->
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(95px + env(safe-area-inset-bottom))">
  <!-- ... -->
</ion-fab>

<!-- FABs de edición -->
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(85px + env(safe-area-inset-bottom))">
  <!-- Guardar -->
</ion-fab>
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(149px + env(safe-area-inset-bottom))">
  <!-- Cancelar -->
</ion-fab>
```

### Causa Raíz
- **Diferencia de 10px** entre FAB Crear (95px) y FAB Guardar (85px) es **insuficiente**
- **Diferencia de 64px** entre FAB Guardar (85px) y FAB Cancelar (149px) es adecuada
- Falta de estilos CSS específicos para los FABs que garanticen separación y z-index correcto

### 🔧 SOLUCIÓN PROPUESTA

#### Solución: Aumentar Espaciado y Agregar Estilos CSS

**1. Ajustar posiciones en HTML**:
```html
<!-- FAB Crear Curso: Posición base -->
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(100px + env(safe-area-inset-bottom))"
  class="fab-crear-premium">
  <!-- ... -->
</ion-fab>

<!-- FAB Guardar: +72px desde base tabs (56px FAB + 16px gap) -->
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(128px + env(safe-area-inset-bottom))"
  class="fab-guardar">
  <!-- ... -->
</ion-fab>

<!-- FAB Cancelar: +72px desde Guardar -->
<ion-fab slot="fixed" vertical="bottom" horizontal="end" 
  style="bottom: calc(200px + env(safe-area-inset-bottom))"
  class="fab-cancelar">
  <!-- ... -->
</ion-fab>
```

**2. Agregar estilos CSS en `cursos.page.scss`**:
```scss
// ============================================
// FAB BUTTONS - MOBILE POSITIONING
// ============================================

ion-fab {
  &.fab-crear-premium,
  &.fab-guardar,
  &.fab-cancelar {
    z-index: 1000;
    
    ion-fab-button {
      --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      --transition: transform 0.2s ease, box-shadow 0.2s ease;
      
      &:active {
        transform: scale(0.95);
      }
    }
  }
  
  // Asegurar que no se solapen
  &.fab-guardar {
    z-index: 1001; // Más alto que crear
  }
  
  &.fab-cancelar {
    z-index: 1002; // Más alto que guardar
  }
}

// Responsive: Ajustar tamaño en móviles pequeños
@include bp.mobile-only {
  ion-fab {
    ion-fab-button {
      --size: 48px; // Reducir de 56px a 48px en móvil
      font-size: 1.2rem;
    }
  }
}
```

---

## 📊 PRIORIZACIÓN DE SOLUCIONES

| Problema | Prioridad | Impacto | Esfuerzo | Solución Recomendada |
|----------|-----------|---------|----------|---------------------|
| **1. Área Import No Visible** | 🔴 CRÍTICA | Alto | Bajo | Opción A: Aumentar visibilidad CSS |
| **2. CSV No Reconocido** | 🔴 CRÍTICA | Alto | Medio | Solución 1: Capacitor FilePicker |
| **3. Solapamiento FABs** | 🟡 MEDIA | Medio | Bajo | Ajustar posiciones + CSS |

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Soluciones Rápidas (1-2 horas)
1. ✅ Implementar **Solución Problema 3** (FABs)
2. ✅ Implementar **Opción A Problema 1** (CSS import-side)
3. ✅ Implementar **Solución 2 Problema 2** (Mejorar input HTML)

### Fase 2: Solución Definitiva (2-4 horas)
1. ✅ Instalar y configurar `@capawesome/capacitor-file-picker`
2. ✅ Refactorizar `onEstudiantesFileSelected()` y `onCalificacionesFileSelected()`
3. ✅ Agregar permisos Android 13+ para documentos
4. ✅ Testing en dispositivo físico Android

### Fase 3: Validación (1 hora)
1. ✅ Compilar APK de prueba
2. ✅ Probar en dispositivo físico:
   - Crear curso nuevo
   - Importar CSV de estudiantes
   - Importar CSV de calificaciones
   - Verificar visibilidad de todos los elementos
   - Verificar que FABs no se solapen

---

## 🧪 CASOS DE PRUEBA

### Test 1: Visibilidad de Área de Importación
```
DADO que estoy en la página de Cursos en un dispositivo móvil
CUANDO presiono el botón FAB "Crear Curso"
ENTONCES debo ver claramente:
  - Título "Cargar Estudiantes"
  - Botón "Importar (Personas)" con ícono de nube
  - Botón "Importar (Calificaciones)" con ícono de nube
  - Ambos botones deben ser clickeables
```

### Test 2: Selección de Archivo CSV
```
DADO que estoy en modo edición de curso
CUANDO presiono "Importar (Personas)"
ENTONCES el selector de archivos debe:
  - Abrirse correctamente
  - Mostrar archivos .csv en la lista
  - Permitir seleccionar un archivo .csv
  - Cargar el archivo y mostrar su nombre en un chip
```

### Test 3: No Solapamiento de FABs
```
DADO que estoy en modo edición de curso en móvil
CUANDO veo los botones FAB
ENTONCES debo observar:
  - FAB "Guardar" visible y separado del área de tabs
  - FAB "Cancelar" visible y separado de "Guardar"
  - Separación mínima de 64px entre cada FAB
  - Todos los FABs clickeables sin interferencia
```

---

## 📝 NOTAS ADICIONALES

### Consideraciones de Capacitor FilePicker
- **Ventajas**:
  - ✅ Acceso nativo al sistema de archivos
  - ✅ Compatible con Android 13+ sin permisos adicionales
  - ✅ Mejor UX que input HTML
  - ✅ Soporte para múltiples tipos de archivo

- **Desventajas**:
  - ❌ Requiere dependencia adicional
  - ❌ Necesita sincronización con `npx cap sync`
  - ❌ Código específico para cada plataforma

### Alternativas Evaluadas
1. **Capacitor Filesystem**: Requiere permisos más amplios
2. **Ionic Native File Picker**: Deprecado, no recomendado
3. **Input HTML mejorado**: Solución temporal, no ideal para producción

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Aumentar padding y visibilidad de `.import-side` en móvil
- [ ] Agregar background y border a área de importación
- [ ] Ajustar posiciones de FABs (100px, 128px, 200px)
- [ ] Agregar estilos CSS para FABs con z-index
- [ ] Mejorar atributo `accept` del input file
- [ ] Cambiar ocultamiento de input a `left: -9999px`
- [ ] Instalar `@capawesome/capacitor-file-picker`
- [ ] Refactorizar métodos de selección de archivos
- [ ] Agregar permisos Android 13+ en manifest
- [ ] Compilar APK de prueba
- [ ] Probar en dispositivo físico Android
- [ ] Documentar cambios en CHANGELOG.md

---

**Fin de la Auditoría**
