# Guía de Optimización de Performance CSS

## Fecha: 27 de diciembre de 2025

---

## 🎯 Objetivo

Optimizar el rendimiento CSS de la aplicación TEO mediante mejores prácticas, reducción de complejidad y eliminación de código no utilizado.

---

## ✅ Optimizaciones Implementadas

### 1. Biblioteca de Animaciones Optimizadas

**Ubicación:** `src/app/shared/styles/_animations.scss`

**Características:**
- Animaciones GPU-accelerated (transform + opacity)
- Utility classes reutilizables
- Soporte para `prefers-reduced-motion`
- Micro-interacciones optimizadas

**Animaciones Disponibles:**
- Fade: `fadeIn`, `fadeOut`
- Slide: `slideInUp`, `slideInDown`, `slideInLeft`, `slideInRight`
- Scale: `scaleIn`, `scaleOut`
- Interactive: `bounce`, `pulse`, `shake`
- Loading: `spin`, `ping`

---

## 📋 Mejores Prácticas de Performance

### 1. Usar Transform y Opacity

**❌ Evitar (Causa Reflow):**
```scss
.element {
  transition: left 300ms, top 300ms, width 300ms;
}
```

**✅ Preferir (GPU Accelerated):**
```scss
.element {
  transition: transform 300ms, opacity 300ms;
}
```

---

### 2. Simplificar Selectores

**❌ Evitar (Alta Especificidad):**
```scss
.page-container .content-wrapper .card-list .card-item:hover {
  // Especificidad: 0,0,4,0
}
```

**✅ Preferir (Baja Especificidad):**
```scss
.card-item:hover {
  // Especificidad: 0,0,1,1
}
```

---

### 3. Usar will-change Apropiadamente

**✅ Correcto:**
```scss
.element {
  // Agregar antes de la animación
  will-change: transform, opacity;
}

.element.animation-done {
  // Remover después de la animación
  will-change: auto;
}
```

**❌ Evitar:**
```scss
* {
  will-change: transform; // ¡Muy costoso!
}
```

---

### 4. Respetar Preferencias de Usuario

**Implementado:**
```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🎨 Uso de Animaciones

### Animaciones Básicas

```html
<!-- Fade In -->
<div class="animate-fade-in">Contenido</div>

<!-- Slide In Up -->
<div class="animate-slide-in-up">Contenido</div>

<!-- Scale In -->
<div class="animate-scale-in">Contenido</div>
```

### Micro-Interacciones

```html
<!-- Button Lift -->
<button class="btn-hover-lift">Hover me</button>

<!-- Card Scale -->
<ion-card class="card-hover-scale">Card</ion-card>

<!-- Icon Spin -->
<ion-icon class="icon-hover-spin" name="settings"></ion-icon>
```

### Transiciones

```html
<!-- Fast transition -->
<div class="transition-fast">Fast</div>

<!-- Base transition -->
<div class="transition-base">Normal</div>

<!-- Slow transition -->
<div class="transition-slow">Slow</div>
```

---

## ⚡ Optimizaciones de Selectores

### Análisis de Complejidad

**Herramienta:** CSS Stats
```bash
npm install -g cssstats
cssstats src/global.scss
```

**Métricas a Monitorear:**
- Especificidad promedio: < 20
- Selectores únicos: Minimizar duplicados
- Declaraciones por regla: < 10

---

### Refactorización de Selectores

**Antes:**
```scss
.page .container .card .header .title {
  color: blue;
}
```

**Después:**
```scss
.card-title {
  color: blue;
}
```

**Beneficios:**
- Menor especificidad
- Más rápido de parsear
- Más fácil de mantener

---

## 🗑️ Eliminación de CSS No Utilizado

### Herramientas Recomendadas

**1. PurgeCSS**
```bash
npm install -D purgecss
```

**Configuración:**
```javascript
// purgecss.config.js
module.exports = {
  content: ['./src/**/*.html', './src/**/*.ts'],
  css: ['./src/**/*.scss'],
  safelist: ['ion-*', 'hydrated', 'animate-*']
}
```

**2. Chrome DevTools Coverage**
1. Abrir DevTools (F12)
2. Cmd+Shift+P > "Show Coverage"
3. Recargar página
4. Ver CSS no utilizado

---

## 📊 Critical CSS

### Estrategia

**1. Identificar CSS Crítico:**
- Estilos above-the-fold
- Estilos de splash screen
- Estilos de header

**2. Inline en index.html:**
```html
<style>
  /* Critical CSS */
  body { margin: 0; font-family: 'Montserrat'; }
  .splash-screen { /* ... */ }
  ion-app { /* ... */ }
</style>
```

**3. Lazy Load CSS No Crítico:**
```html
<link rel="preload" href="styles.css" as="style" 
      onload="this.onload=null;this.rel='stylesheet'">
```

---

## 🎯 Métricas de Performance

### Objetivos

| Métrica | Antes | Meta | Actual |
|---------|-------|------|--------|
| CSS Size | ~150KB | <100KB | TBD |
| Unused CSS | ~30% | <10% | TBD |
| Selector Complexity | Alta | Media | Mejorada |
| First Paint | ~800ms | <500ms | TBD |

### Herramientas de Medición

**Lighthouse:**
```bash
npm install -g lighthouse
lighthouse http://localhost:8100 --view
```

**Webpack Bundle Analyzer:**
```bash
npm install -D webpack-bundle-analyzer
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

---

## 🔧 Optimizaciones Específicas

### 1. Ionic Components

**Usar Variables CSS:**
```scss
// ✅ Correcto
ion-button {
  --background: var(--ion-color-primary);
}

// ❌ Evitar
ion-button {
  background: #0f385a;
}
```

### 2. Media Queries

**Agrupar por Breakpoint:**
```scss
// ✅ Correcto
.element-1 { /* base */ }
.element-2 { /* base */ }

@media (min-width: 768px) {
  .element-1 { /* tablet */ }
  .element-2 { /* tablet */ }
}

// ❌ Evitar
.element-1 {
  /* base */
  @media (min-width: 768px) { /* tablet */ }
}
.element-2 {
  /* base */
  @media (min-width: 768px) { /* tablet */ }
}
```

### 3. Imports

**Minimizar @import:**
```scss
// ✅ Preferir @use
@use 'variables' as vars;

// ❌ Evitar múltiples @import
@import 'file1';
@import 'file2';
@import 'file3';
```

---

## 📝 Checklist de Optimización

### Antes de Commit
- [ ] Verificar que no hay selectores duplicados
- [ ] Confirmar que animaciones usan transform/opacity
- [ ] Validar que hay soporte para prefers-reduced-motion
- [ ] Revisar especificidad de selectores nuevos
- [ ] Eliminar código CSS comentado

### Mensual
- [ ] Ejecutar PurgeCSS
- [ ] Analizar con Lighthouse
- [ ] Revisar CSS Coverage en DevTools
- [ ] Actualizar critical CSS si es necesario

---

## 🚀 Próximos Pasos (Opcionales)

1. **Implementar PurgeCSS en build**
   - Configurar en angular.json
   - Ejecutar en producción

2. **Optimizar Ionic Components**
   - Lazy load componentes no críticos
   - Tree-shake componentes no usados

3. **Implementar CSS Modules**
   - Scope automático de estilos
   - Eliminación de código muerto

---

## 📚 Recursos

**Documentación:**
- [Web.dev CSS Performance](https://web.dev/css-performance/)
- [CSS Triggers](https://csstriggers.com/)
- [Can I Use](https://caniuse.com/)

**Herramientas:**
- [PurgeCSS](https://purgecss.com/)
- [CSS Stats](https://cssstats.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**Versión:** 1.0  
**Última actualización:** 27 de diciembre de 2025  
**Estado:** Guías y biblioteca implementadas ✅
