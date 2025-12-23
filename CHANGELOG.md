# Changelog

## [3.5.0] - 2025-12-23

### 🎨 Estandarización Fase 1 - Componentes Compartidos

#### Added
- **Sistema de Breakpoints Responsive** (`src/app/shared/styles/_breakpoints.scss`)
  - Mixins reutilizables: `respond-to()`, `respond-to-max()`, `respond-between()`
  - Helpers semánticos: `mobile-only`, `tablet-only`, `desktop-only`, `mobile-landscape`
  - Alineado con Ionic Grid breakpoints (xs: 0, sm: 576px, md: 768px, lg: 992px, xl: 1200px)
  - Utility classes para ocultar/mostrar elementos por dispositivo

- **Componente Empty State** (`src/app/shared/styles/_empty-state.scss`)
  - Componente base `.empty-state` con diseño centrado
  - Variantes: `.empty-state-fullscreen`, `.empty-state-compact`
  - Responsive automático: Desktop (60px padding) → Tablet (48px) → Mobile (40px)
  - Layout horizontal optimizado para landscape móvil
  - Contenedor helper `.empty-state-container`

- **Sistema de Cards** (`src/app/shared/styles/_card-system.scss`)
  - Estilos base estandarizados para `ion-card`
  - Variantes: `.card-compact`, `.card-flat`, `.card-outlined`, `.card-elevated`, `.card-clickable`, `.card-selected`, `.card-disabled`
  - Helpers de layout: `.card-grid` (responsive grid), `.card-list`
  - Transiciones suaves con hover effects (solo desktop)
  - Responsive: 3 cols (desktop) → 2 cols (tablet) → 1 col (mobile)

- **Variables CSS Globales** (`src/theme/variables.scss`)
  - **Card System Tokens:**
    - `--card-border-radius`, `--card-border-radius-sm`
    - `--card-shadow`, `--card-shadow-hover`, `--card-shadow-sm`
    - `--card-header-padding`, `--card-content-padding`
    - `--card-header-padding-sm`, `--card-content-padding-sm`
  - **Opacity Tokens:**
    - `--opacity-subtle` (0.04), `--opacity-light` (0.08)
    - `--opacity-medium` (0.12), `--opacity-strong` (0.6)
    - `--opacity-disabled` (0.5)

- **Estilos Específicos de Cursos:**
  - `_curso-info-compact.scss` - Información compacta de curso
  - `_ingreso-config.scss` - Configuración de ingreso con contraste mejorado
  - `_verification-panel.scss` - Panel de verificación

#### Changed
- **Página Cursos** (`src/app/pages/cursos/`)
  - Importados componentes compartidos (breakpoints, empty-state, card-system)
  - Eliminadas ~150 líneas de código duplicado
  - Actualizado a usar nuevos mixins de breakpoints
  - Mejorado contraste en sección de información parseada (fondo azul oscuro, texto blanco)

- **Headers Consistentes**
  - Headers idénticos en Cursos y Rúbricas (fondo azul oscuro, texto blanco)
  - Comportamiento responsive coherente: botones en desktop, FABs en mobile/tablet
  - Uso de variables CSS compartidas para padding, margin, border-radius

#### Fixed
- Corregidos errores de sintaxis SASS en mixins de breakpoints
- Solucionadas inconsistencias visuales entre headers de diferentes páginas
- Mejorada accesibilidad táctil en landscape móvil (min-height 44px)

#### Performance
- Reducción de ~550 líneas de código duplicado (proyectado en todas las páginas)
- Archivos CSS más pequeños gracias a reutilización de componentes
- Transiciones optimizadas usando variables CSS

#### Documentation
- Creado análisis completo de estandarización (`standardization-analysis.md`)
- Documentación de verificación responsive (`standardization-phase1-verification.md`)
- Resumen de trabajo completado (`trabajo-completado-resumen.md`)

---

## [3.0.0] - 2025-12-22

### Refactorización Completa - Modelo de Cursos

#### Changed
- **Modelo Curso** (`src/app/models/curso.model.ts`)
  - Renombrado `Cohorte` → `Ingreso` para mejor claridad semántica
  - Añadido campo `anio` para año académico
  - Tipos extensibles: `TipoIngreso` y `TipoBloque` ahora aceptan strings custom
  - Añadida interfaz `Ingreso` con `bloque` y `duracionDias`

- **Modelo Estudiante** (`src/app/models/estudiante.model.ts`)
  - Renombrado `historialCohortes` → `historialIngresos`

- **App State** (`src/app/models/app-state.model.ts`)
  - Actualizado metadata de `cohorte` a `ingreso`

#### Added
- **Utilidad de Parseo** (`src/app/utils/curso-parser.util.ts`)
  - Función `parsearNombreCurso()` para extraer información de nombres CSV
  - Generación automática de códigos: Base, Curso, Único
  - Detección inteligente de bloques y modalidades
  - Tests incluidos

- **UI de Cursos Mejorada**
  - Selector de Bloque visible y funcional
  - Cálculo automático de fechas según bloque
  - Reordenamiento de campos: Ingreso, Bloque, Inicio, Fin
  - Eliminado selector de Año (se usa año actual automáticamente)
  - Contraste mejorado en información parseada

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
