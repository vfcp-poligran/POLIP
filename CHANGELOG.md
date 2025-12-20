# 📋 CHANGELOG - Sistema de Registro de Novedades

Registro de cambios del proyecto POLI.

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
