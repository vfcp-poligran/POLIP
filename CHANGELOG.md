# 📋 CHANGELOG - Sistema de Registro de Novedades

Registro de cambios del proyecto POLI.

---

---

## [Unreleased]

### 2025-12-23

#### 🎨 Refactored (Refactorizado) - Página Cursos
- **Fase 1: Migración a Ion-Segment**
  - Agregado atributo `scrollable` a todos los `ion-segment` para scroll horizontal en móvil
  - Creado `styles/_segment-tabs.scss` (190 líneas) con estilos modernos usando variables y mixins
  - Reemplazado `cursos-tabs.scss` (289 líneas) por sistema modular
  - Implementadas animaciones suaves y hover effects
  - Reducción de código: -99 líneas (-34%)

- **Fase 2: Normalización de Botones CRUD**
  - Creado `constants/button-config.ts` con configuración centralizada de botones
  - Estandarizados iconos: `add-circle-outline`, `checkmark-circle-outline`, `close-circle-outline`, `create-outline`, `trash-outline`
  - Unificados colores: `success` (crear), `primary` (guardar/editar), `medium` (cancelar), `danger` (eliminar)
  - Agregados `aria-label` a todos los botones para accesibilidad
  - Touch targets mínimos de 44px en móvil (WCAG 2.1 Level AAA)

- **Fase 4: Optimización de Estilos SCSS**
  - Creado `styles/_variables.scss` con sistema completo de tokens de diseño:
    - Colores, spacing (8dp grid), tipografía modular
    - Shadows, border radius, transitions
    - Breakpoints de Ionic, z-index scale
  - Creado `styles/_mixins.scss` con 30+ mixins reutilizables:
    - Responsive, layout (flex, grid)
    - Tipografía, efectos visuales
    - Accesibilidad, utilidades
  - Refactorizado `cursos.page.scss` usando variables y mixins
  - Migrado de `@import` (deprecated) a `@use` (Sass 3.0)
  - Migrado de `lighten()` a `color.adjust()` (funciones modernas)

- **Fase 5: Mejoras de Accesibilidad**
  - Expandido `styles/_accessibility.scss` de 117 a 320 líneas
  - Implementado skip link para navegación rápida (`#main-content`)
  - Agregado `role="main"` al contenedor principal
  - Focus visible mejorado para todos los elementos interactivos
  - Clases `.sr-only` y `.sr-only-focusable` para screen readers
  - Soporte para `prefers-reduced-motion` (WCAG 2.1 SC 2.3.3)
  - Soporte para `prefers-contrast: high`
  - Soporte para `prefers-color-scheme: dark` con contraste adecuado
  - Estados de carga accesibles (`aria-busy`)
  - Mensajes de error accesibles (`aria-invalid`)
  - Tooltips que funcionan con teclado
  - **Cumplimiento WCAG 2.1**: Level A (6/6), Level AA (5/5), Level AAA (3/3)

- **Fase 6: Optimización de Rendimiento**
  - Refactorizado `estudiantesFiltrados` computed signal con función pura
  - Separada lógica de mapeo en `mapEstudiantesConNotas()` para mejor testabilidad
  - Optimizada complejidad de O(n²) a O(n) usando Map para lookup de notas
  - Implementado early return para evitar procesamiento innecesario
  - Agregados comentarios de rendimiento y documentación JSDoc
  - Mejorada legibilidad con pasos numerados en comentarios

#### ✨ Added (Agregado)
- `src/app/constants/button-config.ts`: Configuración centralizada de botones CRUD
- `src/app/pages/cursos/styles/_variables.scss`: Sistema de tokens de diseño
- `src/app/pages/cursos/styles/_mixins.scss`: Biblioteca de mixins reutilizables
- `src/app/pages/cursos/styles/_segment-tabs.scss`: Estilos modernos para tabs
- Skip link en `cursos.page.html` para accesibilidad

#### 🔧 Changed (Modificado)
- `cursos.page.html`: 
  - Agregado `scrollable` a todos los `ion-segment`
  - Actualizados todos los botones para usar `BUTTON_CONFIG`
  - Agregado skip link y `role="main"`
- `cursos.page.ts`: 
  - Importado y expuesto `BUTTON_CONFIG`
  - Agregado icono `closeCircleOutline`
- `cursos.page.scss`: 
  - Refactorizado para usar sistema de variables y mixins
  - Actualizado import de tabs a `_segment-tabs`
- `styles/_accessibility.scss`: Expandido con mejoras comprehensivas

#### 📊 Metrics (Métricas)
- **Código reducido**: -99 líneas en estilos de tabs
- **Accesibilidad**: WCAG 2.1 Level AAA compliant
- **Mantenibilidad**: Sistema modular con variables y mixins
- **Progreso**: 4/8 fases completadas (50%)

---

## [Unreleased]

### 2025-12-19

#### ✨ Added (Agregado)
- **Sistema de Novedades**: Nueva funcionalidad completa para registro de novedades de estudiantes
  - `novedad.model.ts`: Interfaces TipoNovedad, Novedad, SyncQueueItem
  - `novedad.service.ts`: CRUD, persistencia, soporte offline, Angular Signals
  - `inicio-draft/`: Página prototipo con panel de control

- **Página Inicio Draft** (`pages/inicio-draft/`)
  - Vista panorama de cursos con cards
  - Búsqueda de estudiantes en todos los cursos
  - Selección múltiple con chips
  - Bottom drawer para registro (alternativa a modal)
  - Action Sheet para selección de tipo (móvil)
  - Lista de novedades pendientes con swipe actions
  - Indicador de modo offline

- **Navegación**
  - Nueva ruta `/tabs/inicio-draft` en `tabs.routes.ts`
  - Botón "Draft" con icono 🔧 en navegación (`tabs.page.ts`)

- **Documentación**
  - `docs/Aprender.md`: Conceptos técnicos y FAQ
  - `docs/contenidotecnico.md`: Implementación técnica
  - `docs/decisions.md`: Decisiones del proyecto
  - `docs/cursos_audit.md`: Auditoría sección Cursos
  - `docs/novedades_design.md`: Diseño GUI propuestas

#### 🔧 Changed (Modificado)
- `tabs/tabs.routes.ts`: Agregada ruta para inicio-draft
- `tabs/tabs.page.ts`: Agregado navigationItem para Draft

#### 🔄 Refactored (Refactorizado)
- **Interfaces de Notas** (`estudiante.model.ts`)
  - Eliminada interface `NotaEntrega` redundante
  - Simplificada `NotaEstudiante` para usar `number` directamente en `e1`, `e2`, `ef`
  - Actualizado parsing CSV con `parseFloat()` en `canvas.service.ts`
  - Tipos actualizados en 7 archivos: `app-state.model.ts`, `data.service.ts`, `cursos.page.ts`, `calificaciones.page.ts`, `tabs.page.ts`
  - Ver: [`docs/refactorizacion-interfaces-notas.md`](docs/refactorizacion-interfaces-notas.md)

#### 📝 Documentation
- Creados 5 archivos de documentación en `docs/`

---

## Convención de Commits

| Prefijo | Descripción |
|---------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `style` | Formato (no afecta código) |
| `refactor` | Refactorización |
| `test` | Tests |
| `chore` | Mantenimiento |

### Ejemplo
```
feat(novedades): implementar sistema de registro
fix(cursos): corregir carga de CSV
docs(readme): actualizar instrucciones
```
