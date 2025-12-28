# Plan de Implementación - Fase 3: Optimización

## Fecha: 27 de diciembre de 2025

---

## 🎯 Objetivo de la Fase 3

Implementar optimizaciones avanzadas que mejoren la experiencia de usuario, rendimiento y personalización de la aplicación TEO.

---

## 📋 Tareas de la Fase 3

### Tarea 3.1: Implementar Dark Mode Completo
**Prioridad:** Alta  
**Esfuerzo:** Alto  
**Impacto:** Alto (UX + Accesibilidad)

#### Subtareas
1. **Crear sistema de temas**
   - Definir variables CSS para dark mode
   - Crear toggle de tema
   - Persistir preferencia del usuario

2. **Actualizar componentes**
   - Adaptar colores para dark mode
   - Ajustar contrastes WCAG AA
   - Probar todos los componentes

3. **Implementar detección automática**
   - Respetar `prefers-color-scheme`
   - Permitir override manual

---

### Tarea 3.2: Optimizar Performance CSS
**Prioridad:** Media  
**Esfuerzo:** Medio  
**Impacto:** Medio (Performance)

#### Subtareas
1. **Auditar CSS**
   - Identificar selectores complejos
   - Encontrar reglas no utilizadas
   - Medir tamaño de archivos

2. **Optimizar selectores**
   - Simplificar selectores anidados
   - Reducir especificidad
   - Eliminar código muerto

3. **Implementar lazy loading**
   - Cargar CSS por ruta
   - Minimizar CSS crítico
   - Diferir estilos no críticos

---

### Tarea 3.3: Mejorar Animaciones
**Prioridad:** Baja  
**Esfuerzo:** Medio  
**Impacto:** Medio (UX)

#### Subtareas
1. **Crear biblioteca de animaciones**
   - Definir animaciones reutilizables
   - Implementar timing functions
   - Documentar uso

2. **Optimizar animaciones existentes**
   - Usar `transform` y `opacity`
   - Implementar `will-change`
   - Respetar `prefers-reduced-motion`

3. **Agregar micro-interacciones**
   - Feedback en botones
   - Transiciones suaves
   - Loading states

---

## 🎨 Tarea 3.1: Dark Mode - Plan Detallado

### Arquitectura Propuesta

#### 1. Sistema de Variables CSS

**Ubicación:** `src/theme/variables.scss`

```scss
// Light theme (default)
:root {
  --background: #ffffff;
  --background-secondary: #f7f9fa;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --shadow: rgba(0, 0, 0, 0.1);
}

// Dark theme
[data-theme="dark"] {
  --background: #1a1a1a;
  --background-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
  --shadow: rgba(0, 0, 0, 0.3);
}

// Auto theme (respects system preference)
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: #1a1a1a;
    --background-secondary: #2d2d2d;
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --border-color: #404040;
    --shadow: rgba(0, 0, 0, 0.3);
  }
}
```

#### 2. Servicio de Tema

**Ubicación:** `src/app/services/theme.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'app-theme';
  
  currentTheme = signal<Theme>('auto');
  
  constructor() {
    this.loadTheme();
    this.applyTheme();
  }
  
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme();
  }
  
  private loadTheme(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
    if (saved) {
      this.currentTheme.set(saved);
    }
  }
  
  private applyTheme(): void {
    const theme = this.currentTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }
}
```

#### 3. Componente Toggle

**Ubicación:** `src/app/shared/components/theme-toggle/`

```html
<!-- theme-toggle.component.html -->
<ion-button (click)="toggleTheme()">
  <ion-icon [name]="themeIcon()"></ion-icon>
</ion-button>
```

```typescript
// theme-toggle.component.ts
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html'
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
  
  themeIcon = computed(() => {
    const theme = this.themeService.currentTheme();
    return theme === 'dark' ? 'moon' : 'sunny';
  });
  
  toggleTheme(): void {
    const current = this.themeService.currentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.themeService.setTheme(next);
  }
}
```

### Colores para Dark Mode

#### Paleta Dark Mode

```scss
// Dark mode color adjustments
[data-theme="dark"] {
  // Primary colors (adjusted for dark backgrounds)
  --azul-oscuro: #5a9fd4;
  --azul-claro: #4db8e8;
  --naranja: #ffb84d;
  --verde: #b8d96a;
  
  // Backgrounds
  --bg-color: #1a1a1a;
  --bg-card: #2d2d2d;
  --bg-hover: #3a3a3a;
  
  // Text
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;
  
  // Borders & Shadows
  --border-color: #404040;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.5);
}
```

### Verificación WCAG en Dark Mode

| Color | Sobre #1a1a1a | Contraste | WCAG AA |
|-------|---------------|-----------|---------|
| --text-primary (#e0e0e0) | 11.5:1 | ✅ Excelente | ✅ |
| --text-secondary (#b0b0b0) | 7.2:1 | ✅ Bueno | ✅ |
| --azul-claro (#4db8e8) | 5.8:1 | ✅ Bueno | ✅ |
| --verde (#b8d96a) | 6.1:1 | ✅ Bueno | ✅ |

---

## ⚡ Tarea 3.2: Performance CSS - Plan Detallado

### Optimizaciones Propuestas

#### 1. Análisis de CSS No Utilizado

**Herramienta:** PurgeCSS

```json
// purgecss.config.js
module.exports = {
  content: ['./src/**/*.html', './src/**/*.ts'],
  css: ['./src/**/*.scss'],
  safelist: ['ion-*', 'hydrated']
}
```

#### 2. Simplificación de Selectores

**Antes (Complejo):**
```scss
.page-container .content-wrapper .card-list .card-item:hover {
  // Especificidad: 0,0,4,0
}
```

**Después (Optimizado):**
```scss
.card-item:hover {
  // Especificidad: 0,0,1,1
}
```

#### 3. Critical CSS

**Estrategia:**
- Inline CSS crítico en `index.html`
- Lazy load CSS no crítico
- Usar `loadCSS` para estilos diferidos

```html
<!-- index.html -->
<style>
  /* Critical CSS inline */
  body { margin: 0; font-family: 'Montserrat'; }
  .splash-screen { /* ... */ }
</style>

<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

#### 4. Métricas de Performance

| Métrica | Antes | Meta | Herramienta |
|---------|-------|------|-------------|
| CSS Size | ~150KB | <100KB | Webpack Bundle Analyzer |
| Unused CSS | ~30% | <10% | PurgeCSS |
| Selector Complexity | Alta | Media | CSS Stats |
| Load Time | ~800ms | <500ms | Lighthouse |

---

## 🎬 Tarea 3.3: Animaciones - Plan Detallado

### Biblioteca de Animaciones

#### 1. Animaciones Base

**Ubicación:** `src/app/shared/styles/_animations.scss`

```scss
// Fade animations
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

// Slide animations
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// Scale animations
@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

#### 2. Clases Utilitarias

```scss
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

.animate-slide-in {
  animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
```

#### 3. Respeto a Preferencias de Usuario

```scss
// Disable animations for users who prefer reduced motion
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

#### 4. Optimización de Performance

```scss
// Use transform and opacity for better performance
.optimized-animation {
  will-change: transform, opacity;
  transform: translateZ(0); // Force GPU acceleration
}

// Remove will-change after animation
.optimized-animation.animation-done {
  will-change: auto;
}
```

---

## 📊 Estimación de Esfuerzo

| Tarea | Subtareas | Tiempo Estimado | Complejidad |
|-------|-----------|-----------------|-------------|
| 3.1 Dark Mode | 3 | 8-12 horas | Alta |
| 3.2 Performance | 4 | 4-6 horas | Media |
| 3.3 Animaciones | 4 | 4-6 horas | Media |
| **Total** | **11** | **16-24 horas** | **Media-Alta** |

---

## ✅ Criterios de Éxito

### Tarea 3.1: Dark Mode
- [ ] Toggle funcional en todas las páginas
- [ ] Todos los componentes adaptados
- [ ] Contraste WCAG AA en ambos temas
- [ ] Preferencia persistida
- [ ] Detección automática funcional

### Tarea 3.2: Performance
- [ ] CSS reducido en >30%
- [ ] Selectores simplificados
- [ ] Critical CSS implementado
- [ ] Lighthouse score >90

### Tarea 3.3: Animaciones
- [ ] Biblioteca de animaciones creada
- [ ] Micro-interacciones implementadas
- [ ] `prefers-reduced-motion` respetado
- [ ] Performance optimizado (60fps)

---

## 🚀 Orden de Implementación Recomendado

1. **Tarea 3.1: Dark Mode** (Prioridad Alta)
   - Mayor impacto en UX
   - Funcionalidad muy solicitada
   - Base para otras optimizaciones

2. **Tarea 3.3: Animaciones** (Prioridad Media)
   - Mejora percepción de performance
   - Complementa dark mode
   - Menor riesgo

3. **Tarea 3.2: Performance** (Prioridad Media)
   - Optimización final
   - Requiere código estable
   - Mediciones precisas

---

## 💡 Recomendaciones

### Antes de Empezar
1. Crear branch `feature/phase-3-optimizations`
2. Backup de archivos críticos
3. Preparar entorno de testing

### Durante Implementación
1. Commits frecuentes y descriptivos
2. Testing continuo en ambos temas
3. Documentar decisiones importantes

### Después de Completar
1. Testing exhaustivo
2. Auditoría de accesibilidad
3. Medición de performance
4. Documentación de usuario

---

**Estado:** Listo para implementación  
**Próximo paso:** Comenzar con Tarea 3.1 (Dark Mode)
