# Plan de Implementación - Mejoras UI/UX
**Proyecto:** TEO (Gestión Académica)  
**Fecha:** 27 de diciembre de 2025  
**Basado en:** Auditoría UI/UX v1.0

---

## 📋 Resumen Ejecutivo

Este plan detalla la implementación de las mejoras identificadas en la auditoría UI/UX, organizado en **3 fases** con tareas específicas, estimaciones de tiempo y criterios de éxito.

### Métricas de Éxito
| Métrica | Actual | Objetivo | Fase |
|---------|--------|----------|------|
| Instancias `!important` | 150+ | <10 | Fase 1 |
| Uso de `rem` | 60% | 95% | Fase 2 |
| Contraste WCAG AA | 70% | 100% | Fase 2 |
| Duplicación código | Alta | Baja | Fase 1-2 |
| Dark mode | Parcial | Completo | Fase 3 |

---

## 🔴 FASE 1: Limpieza Crítica (1-2 semanas)

### Objetivo
Eliminar deuda técnica crítica que afecta mantenibilidad y debugging.

---

### Tarea 1.1: Eliminar `!important` Innecesarios
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 3-4 días  
**Archivos afectados:** `global.scss`, `tabs.page.scss`, `inicio.page.scss`

#### Subtareas

**1.1.1 Auditar `tabs.page.scss` (100+ instancias)**
```bash
# Buscar todos los !important
grep -n "!important" src/app/tabs/tabs.page.scss > tabs-important-audit.txt
```

**Estrategia de refactorización:**
```scss
// ❌ ANTES
ion-tabs {
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
}

// ✅ DESPUÉS - Opción 1: Mayor especificidad
app-tabs ion-tabs {
  padding: 0;
  margin: 0;
  display: flex;
}

// ✅ DESPUÉS - Opción 2: CSS Custom Properties
ion-tabs {
  --padding: 0;
  --margin: 0;
}
```

**1.1.2 Refactorizar `global.scss` (30+ instancias)**

Casos justificados para mantener `!important`:
- Resets globales de padding/margin en elementos raíz
- Overrides de estilos de Ionic Framework (documentar)

```scss
// ✅ Justificado - Reset global
html, body {
  margin: 0 !important;  // Override de user agent stylesheet
  padding: 0 !important;
}

// ❌ Injustificado - Usar especificidad
.page-header {
  background: blue !important; // ELIMINAR
}
```

**1.1.3 Crear archivo de documentación**
```markdown
# !important Usage Policy

## Casos permitidos:
1. Overrides de user agent stylesheets
2. Overrides de bibliotecas de terceros (Ionic)
3. Utility classes (ej: .hidden { display: none !important; })

## Proceso de aprobación:
- Documentar razón en comentario
- Revisar en code review
```

**Criterios de éxito:**
- ✅ Reducir de 150+ a <20 instancias
- ✅ Documentar las restantes
- ✅ No romper estilos visuales

---

### Tarea 1.2: Consolidar Variables Duplicadas
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 2 días  
**Archivos afectados:** Todos los `.scss`

#### Subtareas

**1.2.1 Identificar duplicados**
```bash
# Buscar definiciones de variables
grep -r "\$azul-oscuro" src/app --include="*.scss"
grep -r "\$azul-claro" src/app --include="*.scss"
```

**Resultado esperado:**
```
src/app/pages/inicio/inicio.page.scss:4:$azul-oscuro: #0f385a;
src/theme/variables.scss:14:--azul-oscuro: #0F385A;
```

**1.2.2 Eliminar variables locales**
```scss
// ❌ ANTES - inicio.page.scss
$azul-oscuro: #0f385a;
$azul-claro: #4a90e2;
$verde-exito: #2dd36f;

.page-header {
  background: $azul-oscuro;
}

// ✅ DESPUÉS - inicio.page.scss
@use '../../theme/variables' as vars;

.page-header {
  background: var(--azul-oscuro);
}
```

**1.2.3 Crear archivo de variables compartidas**
```scss
// src/app/shared/styles/_color-tokens.scss
@use '../../theme/variables' as theme;

// Re-exportar como Sass variables para compatibilidad
$azul-oscuro: var(--azul-oscuro);
$azul-claro: var(--azul-claro);
$verde-exito: var(--ion-color-success);

// Nuevas variables semánticas
$color-primary: var(--azul-oscuro);
$color-secondary: var(--azul-claro);
$color-success: var(--verde);
```

**Criterios de éxito:**
- ✅ Una sola fuente de verdad para colores
- ✅ Eliminar 20+ variables duplicadas
- ✅ Builds sin errores

---

### Tarea 1.3: Estandarizar Nomenclatura
**Prioridad:** 🟡 Media  
**Tiempo estimado:** 2-3 días  
**Archivos afectados:** Todos los componentes

#### Subtareas

**1.3.1 Definir convención**

**Decisión:** Usar **inglés** con **BEM modificado**

```scss
// Convención adoptada:
// .block__element--modifier

// ✅ Ejemplos correctos
.course-card { }
.course-card__header { }
.course-card__header--selected { }
.course-card--premium { }

// ❌ Evitar
.cursoCard { }           // camelCase
.curso-card { }          // mezcla idiomas
.course_card_header { }  // underscores
```

**1.3.2 Crear script de migración**
```javascript
// scripts/rename-classes.js
const renames = {
  'grupos-selector-bar': 'group-selector-bar',
  'btn-main-register': 'button-register--primary',
  'cursos-container': 'courses-container'
};

// Ejecutar con: node scripts/rename-classes.js
```

**1.3.3 Actualizar guía de estilo**
```markdown
# CSS Naming Convention

## Block
Componente independiente: `.course-card`

## Element
Parte del componente: `.course-card__header`

## Modifier
Variante del componente: `.course-card--selected`

## Estados
Usar data attributes: `[data-state="loading"]`
```

**Criterios de éxito:**
- ✅ 100% de clases en inglés
- ✅ BEM aplicado consistentemente
- ✅ Guía de estilo documentada

---

## 🟡 FASE 2: Consistencia (2-3 semanas)

### Objetivo
Mejorar consistencia visual, accesibilidad y mantenibilidad del código.

---

### Tarea 2.1: Convertir px a rem
**Prioridad:** 🟡 Media  
**Tiempo estimado:** 4-5 días  
**Archivos afectados:** Todos los `.scss`

#### Subtareas

**2.1.1 Crear función de conversión**
```scss
// src/app/shared/styles/_functions.scss
@function px-to-rem($px, $base: 16) {
  @return calc($px / $base) * 1rem;
}

// Uso
.header {
  padding: px-to-rem(12); // 0.75rem
  font-size: px-to-rem(14); // 0.875rem
}
```

**2.1.2 Actualizar variables de spacing**
```scss
// ❌ ANTES - variables.scss
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;

// ✅ DESPUÉS
--spacing-xs: 0.25rem;  // 4px
--spacing-sm: 0.5rem;   // 8px
--spacing-md: 0.75rem;  // 12px
--spacing-lg: 1rem;     // 16px
--spacing-xl: 1.5rem;   // 24px
--spacing-2xl: 2rem;    // 32px
```

**2.1.3 Reglas de conversión**

| Elemento | Unidad | Razón |
|----------|--------|-------|
| Font sizes | `rem` | Escalabilidad |
| Spacing/padding/margin | `rem` | Escalabilidad |
| Gaps | `rem` | Escalabilidad |
| Borders | `px` | Precisión (1px) |
| Shadows | `px` | Precisión |
| Breakpoints | `px` | Estándar |

**2.1.4 Script de conversión automática**
```bash
# Buscar y reemplazar patrones comunes
sed -i 's/font-size: 14px/font-size: 0.875rem/g' src/**/*.scss
sed -i 's/padding: 16px/padding: 1rem/g' src/**/*.scss
```

**Criterios de éxito:**
- ✅ 95%+ de tipografía en `rem`
- ✅ 90%+ de spacing en `rem`
- ✅ Borders en `px`

---

### Tarea 2.2: Refactorizar Código Duplicado
**Prioridad:** 🟡 Media  
**Tiempo estimado:** 3-4 días  
**Archivos afectados:** `inicio.page.scss`, componentes

#### Subtareas

**2.2.1 Consolidar `.grupos-selector-bar`**
```scss
// ❌ ANTES - Duplicado en inicio.page.scss
.grupos-selector-bar { /* 80 líneas */ }
.grupos-selector-bar-global { /* 80 líneas similares */ }

// ✅ DESPUÉS - Crear mixin compartido
// src/app/shared/styles/_mixins.scss
@mixin group-selector-base {
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.05);
}

// inicio.page.scss
.group-selector {
  @include group-selector-base;
  
  &--global {
    margin-bottom: 1rem;
  }
}
```

**2.2.2 Crear componente de card reutilizable**
```scss
// src/app/shared/styles/_card-variants.scss
@mixin card-base {
  border-radius: var(--rad-md);
  box-shadow: var(--shadow-light);
  background: var(--bg-card);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

@mixin card-interactive {
  @include card-base;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-medium);
  }
}

// Uso
.course-card {
  @include card-interactive;
}
```

**Criterios de éxito:**
- ✅ Reducir duplicación en 40%
- ✅ Crear 5+ mixins reutilizables
- ✅ Documentar mixins

---

### Tarea 2.3: Mejorar Accesibilidad
**Prioridad:** 🔴 Crítica  
**Tiempo estimado:** 3-4 días  
**Archivos afectados:** Todos los componentes

#### Subtareas

**2.3.1 Auditar contraste de colores**
```bash
# Usar herramienta automatizada
npm install -g pa11y
pa11y http://localhost:8100 --standard WCAG2AA
```

**Problemas identificados:**
```scss
// ❌ Falla WCAG AA (3.2:1)
.chip {
  background: rgba(255, 255, 255, 0.2);
  color: white; // sobre fondo oscuro
}

// ✅ Pasa WCAG AA (4.5:1)
.chip {
  background: rgba(255, 255, 255, 0.9);
  color: var(--azul-oscuro);
}
```

**2.3.2 Agregar ARIA labels**
```html
<!-- ❌ ANTES -->
<ion-button (click)="delete()">
  <ion-icon name="trash"></ion-icon>
</ion-button>

<!-- ✅ DESPUÉS -->
<ion-button 
  (click)="delete()" 
  aria-label="Eliminar curso"
  [attr.aria-describedby]="'delete-help-' + course.id">
  <ion-icon name="trash" aria-hidden="true"></ion-icon>
</ion-button>
<span [id]="'delete-help-' + course.id" class="sr-only">
  Esta acción no se puede deshacer
</span>
```

**2.3.3 Implementar skip links**
```html
<!-- app.component.html -->
<a href="#main-content" class="skip-link">
  Saltar al contenido principal
</a>

<nav>...</nav>

<main id="main-content">
  <router-outlet></router-outlet>
</main>
```

```scss
// global.scss
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--azul-oscuro);
  color: white;
  padding: 0.5rem 1rem;
  z-index: 100;
  
  &:focus {
    top: 0;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**2.3.4 Crear checklist de accesibilidad**
```markdown
# Accessibility Checklist

## Contraste
- [ ] Texto normal: 4.5:1 mínimo
- [ ] Texto grande (18px+): 3:1 mínimo
- [ ] Elementos UI: 3:1 mínimo

## Navegación por teclado
- [ ] Todos los elementos interactivos accesibles con Tab
- [ ] Focus visible en todos los elementos
- [ ] Skip links implementados

## ARIA
- [ ] Botones de iconos tienen aria-label
- [ ] Imágenes decorativas tienen aria-hidden
- [ ] Formularios tienen labels asociados

## Testing
- [ ] Testear con lector de pantalla (NVDA/JAWS)
- [ ] Testear navegación solo con teclado
- [ ] Validar con pa11y/axe
```

**Criterios de éxito:**
- ✅ 100% contraste WCAG AA
- ✅ Todos los botones con ARIA labels
- ✅ Skip links funcionales
- ✅ Pasar auditoría pa11y

---

## 🔵 FASE 3: Optimización (1-2 semanas)

### Objetivo
Implementar mejoras de UX y performance.

---

### Tarea 3.1: Implementar Dark Mode Completo
**Prioridad:** 🔵 Baja  
**Tiempo estimado:** 4-5 días  
**Archivos afectados:** `variables.scss`, todos los componentes

#### Subtareas

**3.1.1 Definir paleta dark mode**
```scss
// theme/variables.scss
:root {
  // Light mode (existente)
  --bg-color: #f7f9fa;
  --bg-card: #ffffff;
  --texto-principal: #333333;
  --texto-secundario: #555555;
}

// Dark mode
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --bg-card: #2d2d2d;
    --texto-principal: #e0e0e0;
    --texto-secundario: #b0b0b0;
    
    // Ajustar colores primarios para mejor contraste
    --azul-oscuro: #4a90e2; // Más claro en dark mode
    --azul-claro: #64b5f6;
  }
}

// Clase manual para toggle
body.dark-theme {
  --bg-color: #1a1a1a;
  --bg-card: #2d2d2d;
  --texto-principal: #e0e0e0;
  --texto-secundario: #b0b0b0;
}
```

**3.1.2 Crear servicio de tema**
```typescript
// src/app/services/theme.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDarkMode = signal(false);
  
  constructor() {
    this.loadTheme();
  }
  
  toggleTheme() {
    this.isDarkMode.update(v => !v);
    this.applyTheme();
  }
  
  private loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      this.isDarkMode.set(saved === 'dark');
    } else {
      // Detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode.set(prefersDark.matches);
    }
    this.applyTheme();
  }
  
  private applyTheme() {
    const theme = this.isDarkMode() ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', this.isDarkMode());
    localStorage.setItem('theme', theme);
  }
}
```

**3.1.3 Agregar toggle en UI**
```html
<!-- sistema.page.html -->
<ion-item>
  <ion-icon name="moon" slot="start"></ion-icon>
  <ion-label>
    <h3>Modo Oscuro</h3>
    <p>Tema visual de la aplicación</p>
  </ion-label>
  <ion-toggle 
    [checked]="themeService.isDarkMode()" 
    (ionChange)="themeService.toggleTheme()">
  </ion-toggle>
</ion-item>
```

**3.1.4 Auditar colores hardcodeados**
```bash
# Buscar colores hex hardcodeados
grep -r "#[0-9a-fA-F]\{6\}" src/app --include="*.scss" | grep -v "variables.scss"
```

**Criterios de éxito:**
- ✅ Toggle funcional en UI
- ✅ Persistencia de preferencia
- ✅ Todos los componentes soportan dark mode
- ✅ Contraste adecuado en ambos modos

---

### Tarea 3.2: Optimizar Performance CSS
**Prioridad:** 🔵 Baja  
**Tiempo estimado:** 2-3 días  
**Archivos afectados:** Todos los `.scss`

#### Subtareas

**3.2.1 Reducir anidación**
```scss
// ❌ ANTES - 5 niveles de anidación
.main-content-grid {
  ion-grid {
    .column-container {
      .column-header {
        ion-icon {
          font-size: 1.4rem;
        }
      }
    }
  }
}

// ✅ DESPUÉS - Selectores planos
.column-header__icon {
  font-size: 1.4rem;
}
```

**3.2.2 Implementar PurgeCSS**
```javascript
// angular.json
{
  "projects": {
    "app": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "optimization": {
                "styles": {
                  "minify": true,
                  "inlineCritical": true
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**3.2.3 Lazy load estilos no críticos**
```typescript
// Cargar estilos de componentes bajo demanda
loadComponent() {
  import('./heavy-component/heavy-component.component.scss');
}
```

**Criterios de éxito:**
- ✅ Anidación máxima: 3 niveles
- ✅ Reducir CSS bundle en 20%
- ✅ Lighthouse Performance >90

---

### Tarea 3.3: Mejorar Animaciones
**Prioridad:** 🔵 Baja  
**Tiempo estimado:** 2 días  
**Archivos afectados:** `global.scss`, componentes

#### Subtareas

**3.3.1 Crear sistema de animaciones**
```scss
// src/app/shared/styles/_animations.scss

// Timing functions
$ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
$ease-in-out-back: cubic-bezier(0.68, -0.55, 0.265, 1.55);

// Duraciones
$duration-fast: 150ms;
$duration-base: 250ms;
$duration-slow: 350ms;

// Animaciones predefinidas
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

// Mixins
@mixin animate-fade-in {
  animation: fade-in $duration-base $ease-out-expo;
}

@mixin animate-hover-lift {
  transition: transform $duration-fast $ease-out-expo;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
}
```

**3.3.2 Aplicar a componentes**
```scss
// course-card
.course-card {
  @include animate-hover-lift;
  
  &--entering {
    @include animate-fade-in;
  }
}
```

**3.3.3 Respetar preferencias de usuario**
```scss
// Deshabilitar animaciones si el usuario lo prefiere
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

**Criterios de éxito:**
- ✅ Animaciones suaves y consistentes
- ✅ Respeta `prefers-reduced-motion`
- ✅ No afecta performance (60fps)

---

## 📊 Cronograma y Recursos

### Timeline Propuesto
```
Semana 1-2: Fase 1 (Limpieza Crítica)
├─ Días 1-4: Eliminar !important
├─ Días 5-6: Consolidar variables
└─ Días 7-9: Estandarizar nomenclatura

Semana 3-5: Fase 2 (Consistencia)
├─ Días 1-5: Convertir px a rem
├─ Días 6-9: Refactorizar duplicados
└─ Días 10-13: Mejorar accesibilidad

Semana 6-7: Fase 3 (Optimización)
├─ Días 1-5: Dark mode
├─ Días 6-8: Performance CSS
└─ Días 9-10: Animaciones
```

### Recursos Necesarios
- **Desarrollador Frontend:** 1 persona tiempo completo
- **Revisor/QA:** 0.5 personas (code reviews)
- **Herramientas:**
  - VS Code con extensiones (Stylelint, Prettier)
  - pa11y / axe DevTools
  - Chrome DevTools (Lighthouse)

---

## ✅ Criterios de Aceptación Global

### Fase 1
- [ ] `!important` reducido de 150+ a <10
- [ ] Variables consolidadas en un solo archivo
- [ ] Nomenclatura 100% en inglés con BEM
- [ ] Builds sin warnings

### Fase 2
- [ ] 95%+ tipografía en `rem`
- [ ] Duplicación de código reducida en 40%
- [ ] 100% contraste WCAG AA
- [ ] Todos los botones con ARIA labels
- [ ] Pasar auditoría pa11y

### Fase 3
- [ ] Dark mode funcional en todos los componentes
- [ ] CSS bundle reducido en 20%
- [ ] Lighthouse Performance >90
- [ ] Animaciones suaves y accesibles

---

## 🔄 Proceso de Implementación

### Por cada tarea:
1. **Crear branch:** `feature/ui-[tarea-numero]`
2. **Implementar cambios**
3. **Testing:**
   - Visual regression testing
   - Accessibility testing (pa11y)
   - Cross-browser testing
4. **Code review**
5. **Merge a `develop`**

### Testing Checklist
```markdown
- [ ] Builds sin errores
- [ ] Estilos visuales intactos
- [ ] Responsive en mobile/tablet/desktop
- [ ] Dark mode (si aplica)
- [ ] Accesibilidad (contraste, ARIA)
- [ ] Performance (Lighthouse)
```

---

## 📚 Recursos y Referencias

### Herramientas
- [Stylelint](https://stylelint.io/) - Linting CSS
- [pa11y](https://pa11y.org/) - Accessibility testing
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Guías
- [BEM Methodology](http://getbem.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Guidelines](https://cssguidelin.es/)
- [Ionic CSS Variables](https://ionicframework.com/docs/theming/css-variables)

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar** este plan con el equipo
2. **Priorizar** tareas según impacto/esfuerzo
3. **Crear issues** en sistema de tracking (GitHub/Jira)
4. **Asignar** recursos y fechas
5. **Comenzar Fase 1** con Tarea 1.1

---

**Fin del Plan de Implementación**

*Este plan es un documento vivo y debe actualizarse según el progreso y feedback del equipo.*
