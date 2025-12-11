# Copilot Instructions - Gestor de Proyectos EPM

## Project Overview
**Gestor de Seguimiento de Proyectos** is an Ionic Angular 20 + Capacitor cross-platform application for educational evaluation management at Politécnico Grancolombiano. Built with standalone components and TypeScript, it supports Web PWA, Android, and iOS deployment.

## Architecture & Key Components

### Core Service Architecture
- **DataService**: Central reactive data management with BehaviorSubjects for `cursos$`, `evaluaciones$`, `uiState$`, and `rubricas$`
- **UnifiedStorageService**: Cross-platform storage abstraction (SQLite on mobile, IndexedDB on web)  
- **StateManagerService**: Evaluation state management with undo/redo functionality
- **SeguimientoService**: Real-time tracking panel communication between components

### Model Structure
All models in `src/app/models/` with barrel export from `index.ts`:
- `Estudiante`: Core student data with `correo` as primary key
- `Evaluacion`: Rubric-based evaluations linking course → delivery → type → student/group
- `RubricaDefinicion`: Multi-level rubric structure with `criterios` and `nivelesDetalle`
- `UIState`: Persistent UI state including `cursoActivo` and `courseStates`

### Evaluation System
**Two-tier evaluation structure**: 
- `PG` (Proyecto Grupal): Group evaluations by `subgrupo`
- `PI` (Proyecto Individual): Individual evaluations by `correo`
- Each supports three deliveries: `E1`, `E2`, `EF`

## Development Workflows

### Build & Deploy Commands
```bash
# Development
npm start                    # ionic serve
npm run build               # production build
npm run build:all          # build + sync all platforms

# Platform-specific
npm run android:sync && npm run android:open
npm run ios:sync && npm run ios:open
```

### Critical Build Script
Use `build-all-platforms.ps1` for full cross-platform deployment - handles cleaning, building, and syncing all target platforms with verification.

## Key Patterns & Conventions

### Reactive Data Flow
Always use service observables for data binding:
```typescript
// ✅ Correct
this.dataService.cursos$.subscribe(cursos => { ... });

// ❌ Avoid
const cursos = this.dataService.getCursos();
```

### Component Communication
- Use `StateManagerService` for evaluation state persistence
- Use `SeguimientoService.seguimientoActual$` for cross-component tracking panel updates
- UI state persists via `DataService.updateUIState()` for F5 resilience

### File Import Patterns
- CSV import via `PapaCSV` with `DataService.importarEstudiantesCSV()`
- Rubric import from `.txt` files with structured parser in `DataService.importarRubrica()`
- All imports include validation and preview before save

### Storage Keys Convention
```typescript
private readonly STORAGE_KEYS = {
  CURSOS: 'gestorCursosData',
  EVALUACIONES: 'evaluacionesData', 
  UI_STATE: 'appUIState',
  RUBRICAS: 'rubricDefinitionsData'
};
```

## Navigation & State Management

### Tab-based Architecture
Main navigation via `tabs.page.ts` with persistent global search and tracking panel. Each tab maintains independent state while sharing reactive services.

### Panel Communication
The right-side tracking panel (`SeguimientoService`) provides real-time evaluation feedback. Update via:
```typescript
this.seguimientoService.setSeguimiento({
  evaluacionGrupal: evalData,
  integranteSeleccionado: student,
  entregaActual: 'E1'
});
```

### Course State Persistence
UI state persists across refreshes via `UIState.courseStates[courseName]` including active delivery, selected groups, and rubric associations.

## Platform-Specific Notes

### Capacitor Configuration
- `appId`: `com.poligran.gestorproyectos`
- `webDir`: `www/browser` 
- Android: Mixed content allowed, debugging enabled
- iOS: Content inset automatic

### PWA Features
- Service worker via Angular
- Offline storage with SQLite/IndexedDB fallback
- Installable via manifest in `/public`

## Common Integration Points

### CSV Data Format
Student CSV requires: `nombre,apellido,curso,pg,pi` headers with validation for existing course structure.

### Rubric Text Format
Structured `.txt` files with `=== TÍTULO ===`, `CRITERIO_X:`, `PESO:`, and `NIVEL_X:` markers. Parser in `DataService.parsearRubricaTexto()`.

### Cross-Component Evaluation Flow
1. Select course → sets `cursoActivo` in UIState  
2. Filter by group → updates `SeguimientoService.grupoSeleccionado$`
3. Click evaluation header → loads rubric and initializes evaluation state
4. Evaluation changes → real-time updates to tracking panel
5. Save → persists to storage and updates all reactive subscribers

When working with evaluations, always consider both PG (group) and PI (individual) modes, and ensure proper state cleanup when switching contexts.
