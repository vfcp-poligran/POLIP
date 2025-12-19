# 📋 Plan de Implementación: Sistema de Registro de Novedades (Inicio_draft)

**Fecha**: 2025-12-19  
**Objetivo**: Crear página prototipo `inicio-draft` con sistema de registro de novedades

---

## 🔍 RESPUESTAS A TUS PREGUNTAS

### 1. ¿Las opciones son Tabs de Ionic?

**Respuesta**: **Parcialmente sí, pero con implementación personalizada.**

```typescript
// tabs.routes.ts - Estructura actual
export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,        // Contenedor principal
    children: [
      { path: 'inicio', loadComponent: () => import('...InicioPage') },
      { path: 'cursos', loadComponent: () => import('...CursosPage') },
      { path: 'rubricas', loadComponent: () => import('...RubricasPage') },
      { path: 'calificaciones', loadComponent: () => import('...CalificacionesPage') },
      { path: 'sistema', loadComponent: () => import('...SistemaPage') },
    ],
  },
];
```

**Componentes Ionic utilizados**:
- `IonRouterOutlet` - Para renderizar las páginas hijas
- `IonTabBar` + `IonTabButton` - Para navegación móvil
- Custom navigation buttons - Para desktop

**NO usa** `<ion-tabs>` puro, sino una implementación híbrida con:
- Navegación por tabs en móvil (bottom bar)
- Navegación por botones laterales en desktop

---

### 2. Servicio de Novedades Existente

**Respuesta**: **NO existe un servicio de novedades.**

Servicios encontrados en `d:\POLI\src\app\services\`:
```
backup.service.ts
canvas.service.ts
comment.service.ts        ← Maneja comentarios (no novedades)
course.service.ts
data.service.ts           ← Central, 120KB
evaluation.service.ts
export.service.ts
fullscreen.service.ts
rubric.service.ts
seguimiento.service.ts    ← Tiene EstadoEstudiante básico
state.service.ts
toast.service.ts
unified-storage.service.ts
```

`seguimiento.service.ts` tiene:
```typescript
export type EstadoEstudiante = 'ok' | 'solo' | 'ausente' | null;
```

Pero **NO** tiene historial ni tipos predefinidos. Crearemos un nuevo `novedad.service.ts`.

---

## 🚫 ALTERNATIVAS A MODALES PARA MÓVIL

Según [Ionic Action Sheet](https://ionicframework.com/docs/api/action-sheet) y patrones móviles:

### Opción 1: Action Sheet (Recomendada para acciones rápidas)

```html
<!-- Para seleccionar tipo de novedad -->
<ion-action-sheet
  [isOpen]="actionSheetOpen"
  [header]="'Tipo de Novedad'"
  [buttons]="tiposNovedadButtons"
  (didDismiss)="onActionSheetDismiss($event)">
</ion-action-sheet>
```

**Pros**: Nativo, rápido, no bloquea contenido  
**Contras**: Solo para listas simples, no formularios

---

### Opción 2: Bottom Drawer / Sliding Panel (Recomendada para formularios)

Similar al panel de seguimiento existente (`mobile-seguimiento-panel`):

```html
<div class="registro-drawer" [class.visible]="drawerVisible">
  <div class="drawer-header">
    <span>Registrar Novedad</span>
    <ion-button fill="clear" (click)="cerrarDrawer()">
      <ion-icon name="close-outline"></ion-icon>
    </ion-button>
  </div>
  <div class="drawer-content">
    <!-- Formulario inline -->
  </div>
</div>
```

**Pros**: Contexto visible, formularios complejos  
**Contras**: Requiere más CSS

---

### Opción 3: Expandable Card (Inline)

```html
<ion-card class="novedad-card" [class.expanded]="cardExpanded">
  <ion-card-header (click)="toggleCard()">
    <ion-icon name="add-circle"></ion-icon>
    <span>Nueva Novedad</span>
  </ion-card-header>
  
  @if (cardExpanded) {
    <ion-card-content [@slideInOut]>
      <!-- Formulario -->
    </ion-card-content>
  }
</ion-card>
```

**Pros**: Sin overlay, integrado en el flujo  
**Contras**: Puede desplazar contenido

---

### ✅ PROPUESTA FINAL: Híbrido

1. **Selección de tipo de novedad**: `ion-action-sheet` (móvil) / dropdown (desktop)
2. **Formulario de registro**: Bottom Drawer en móvil / Panel lateral en desktop
3. **Confirmación rápida**: Swipe actions en cards

---

## 📦 CAMBIOS PROPUESTOS

### Archivos Nuevos

---

#### [NEW] [inicio-draft.page.ts](file:///d:/POLI/src/app/pages/inicio-draft/inicio-draft.page.ts)

Nueva página de prototipo con:
- Vista general de cursos con estadísticas
- Registro rápido de novedades
- Historial de novedades

---

#### [NEW] [inicio-draft.page.html](file:///d:/POLI/src/app/pages/inicio-draft/inicio-draft.page.html)

Template con:
- Cards de resumen por curso
- Bottom drawer para registro (móvil)
- Panel lateral para registro (desktop)

---

#### [NEW] [inicio-draft.page.scss](file:///d:/POLI/src/app/pages/inicio-draft/inicio-draft.page.scss)

Estilos responsive para:
- Grid de cursos
- Bottom drawer
- Cards de novedades

---

#### [NEW] [novedad.service.ts](file:///d:/POLI/src/app/services/novedad.service.ts)

Servicio nuevo para:
- CRUD de novedades
- Tipos predefinidos de novedades
- Historial con búsqueda
- Persistencia vía UnifiedStorageService

---

#### [NEW] [novedad.model.ts](file:///d:/POLI/src/app/models/novedad.model.ts)

Interfaces:
```typescript
export interface TipoNovedad {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

export interface Novedad {
  id: string;
  estudianteCorreo: string;
  cursoId: string;
  grupo: string;
  tipoNovedadId: string;
  origen: OrigenMensaje;
  estado: EstadoNovedad;
  descripcion?: string;
  fechaRegistro: Date;
}

export type OrigenMensaje = 'teams' | 'canvas' | 'foro' | 'email' | 'otro';
export type EstadoNovedad = 'en_revision' | 'confirmado' | 'descartado';
```

---

### Archivos Modificados

---

#### [MODIFY] [tabs.routes.ts](file:///d:/POLI/src/app/tabs/tabs.routes.ts)

Agregar ruta para inicio-draft:

```diff
children: [
  {
    path: 'inicio',
    loadComponent: () => import('../pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
+ {
+   path: 'inicio-draft',
+   loadComponent: () => import('../pages/inicio-draft/inicio-draft.page').then((m) => m.InicioDraftPage),
+ },
  // ... resto de rutas
]
```

---

#### [MODIFY] [tabs.page.ts](file:///d:/POLI/src/app/tabs/tabs.page.ts)

Agregar item de navegación temporal para desarrollo:

```diff
public navigationItems: NavigationItem[] = [
  { path: '/tabs/inicio', icon: 'home', iconOutline: 'home-outline', label: 'Inicio' },
+ { path: '/tabs/inicio-draft', icon: 'construct', iconOutline: 'construct-outline', label: 'Draft' },
  // ...
];
```

---

## 🎨 DISEÑO GUI PROPUESTO (Sin Modales)

### Desktop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 [Buscar estudiante...]                         [📊 Stats] [📋 Historial]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ PANORAMA DE CURSOS ───────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ ││
│  │  │ 📚 EPM-B01          │  │ 📚 SO-B02           │  │ 📚 BD-B05       │ ││
│  │  │ ━━━━━━━━━━━━━━━━━━━ │  │ ━━━━━━━━━━━━━━━━━   │  │ ━━━━━━━━━━━━━   │ ││
│  │  │ 24 estudiantes      │  │ 18 estudiantes      │  │ 25 estudiantes  │ ││
│  │  │ 5 grupos           │  │ 4 grupos            │  │ 5 grupos        │ ││
│  │  │ ⚠️ 2 novedades      │  │ ✅ 0 novedades       │  │ ⚠️ 1 novedad     │ ││
│  │  │                     │  │                     │  │                 │ ││
│  │  │ [G1] [G2] [G3] →   │  │ [G1] [G2] [G3] [G4] │  │ [G1] [G2] →     │ ││
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─ REGISTRO RÁPIDO (Panel Lateral Fijo) ──────────────────────────────────┐│
│  │                                                                          ││
│  │  Estudiantes seleccionados:                                              ││
│  │  ┌──────────────────────────────────────────────────────────────────┐   ││
│  │  │ [✕ Juan Pérez - EPM G1] [✕ María López - EPM G1]                 │   ││
│  │  └──────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  │  Tipo de novedad:                                                        ││
│  │  ┌──────────────────────────────────────────┐                           ││
│  │  │ [👤 Trabaja solo] [❌ Ausente] [⚙️ Otro] │                           ││
│  │  └──────────────────────────────────────────┘                           ││
│  │                                                                          ││
│  │  Origen:  [Teams ● ] [Canvas ○] [Foro ○] [Email ○]                      ││
│  │                                                                          ││
│  │  Estado:  [⏳ En revisión ▼]                                             ││
│  │                                                                          ││
│  │                            [Registrar Novedad]                           ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (Sin Modal - Con Bottom Drawer)

```
┌────────────────────────────────┐
│  🔍 Buscar...            ≡    │
├────────────────────────────────┤
│                                │
│  📊 67 estudiantes │ 3 cursos  │
│  ⚠️ 3 novedades pendientes     │
│                                │
│  ┌─ EPM-B01 ───────────────┐   │
│  │ 24 est │ 5 grupos │ ⚠️2  │   │
│  │ [1][2][3][4][5]         │   │
│  └─────────────────────────┘   │
│                                │
│  ┌─ SO-B02 ────────────────┐   │
│  │ 18 est │ 4 grupos │ ✅   │   │
│  │ [1][2][3][4]            │   │
│  └─────────────────────────┘   │
│                                │
│  ┌─ NOVEDADES HOY ─────────┐   │
│  │ 👤 Juan Pérez           │   │
│  │    Trabaja solo ⏳       │──│───(swipe)→ [✓][✗]
│  │ 👤 María López          │   │
│  │    Ausente ⏳            │   │
│  └─────────────────────────┘   │
│                                │
│~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~│  ← FAB trigger
├────────────────────────────────┤
│ ▬▬▬ BOTTOM DRAWER ▬▬▬         │  ← Drag handle
│                                │
│  Estudiantes: [+Buscar...]     │
│  [✕ Juan] [✕ María]           │
│                                │
│  Tipo: [👤Solo] [❌Aus] [+más] │
│                                │
│  Origen: [📱][📧][💬][✉️]       │
│                                │
│  [━━━━━━ Registrar ━━━━━━━]   │
│                                │
└────────────────────────────────┘
```

---

## ✅ VERIFICACIÓN

### Tests Existentes

Solo existen 2 archivos de test:
- `app.component.spec.ts`
- `tabs.page.spec.ts`

No hay tests para servicios ni páginas individuales.

### Plan de Verificación Manual

#### Test 1: Navegación a inicio-draft
1. Ejecutar: `ionic serve`
2. En el navegador, ir a: `http://localhost:8100/tabs/inicio-draft`
3. **Verificar**: La página carga sin errores

#### Test 2: Carga de datos de cursos
1. Navegar a "Cursos" y crear/cargar un curso con CSV
2. Volver a "inicio-draft"
3. **Verificar**: El curso aparece en el panorama con:
   - Número de estudiantes correcto
   - Número de grupos correcto
   - Botones de grupo funcionales

#### Test 3: Registro de novedad (Desktop)
1. Usar la búsqueda para encontrar un estudiante
2. Seleccionar el estudiante (aparece en chips)
3. Seleccionar tipo: "Trabaja solo"
4. Seleccionar origen: "Teams"
5. Click "Registrar Novedad"
6. **Verificar**: 
   - Toast de confirmación
   - Novedad aparece en historial
   - Contador de novedades incrementa

#### Test 4: Registro de novedad (Mobile)
1. Abrir DevTools → Toggle device toolbar (Moto G84)
2. Click en FAB (+) o arrastrar drawer hacia arriba
3. Buscar y seleccionar estudiante
4. Elegir tipo desde action sheet
5. Registrar
6. **Verificar**: Mismo resultado que Test 3

#### Test 5: Cambio de estado de novedad
1. En el historial, hacer swipe en una novedad
2. Click en ✓ (Confirmar)
3. **Verificar**: Estado cambia de ⏳ a ✅

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

```markdown
### Fase 1: Estructura base
- [ ] Crear carpeta `d:\POLI\src\app\pages\inicio-draft\`
- [ ] Crear `inicio-draft.page.ts` (componente standalone)
- [ ] Crear `inicio-draft.page.html` (template básico)
- [ ] Crear `inicio-draft.page.scss` (estilos básicos)
- [ ] Agregar ruta en `tabs.routes.ts`
- [ ] Agregar navegación temporal en `tabs.page.ts`

### Fase 2: Servicio de novedades
- [ ] Crear `novedad.model.ts` con interfaces
- [ ] Crear `novedad.service.ts` con:
  - [ ] Tipos predefinidos
  - [ ] CRUD de novedades
  - [ ] Persistencia con UnifiedStorageService

### Fase 3: Vista panorama de cursos
- [ ] Inyectar DataService para obtener cursos
- [ ] Crear cards de resumen por curso
- [ ] Mostrar grupos como botones
- [ ] Contador de novedades por curso

### Fase 4: Registro de novedades
- [ ] Implementar búsqueda de estudiantes
- [ ] Selector de tipo (action sheet móvil / chips desktop)
- [ ] Selector de origen
- [ ] Bottom drawer para móvil
- [ ] Panel lateral para desktop

### Fase 5: Historial
- [ ] Lista de novedades recientes
- [ ] Swipe actions para cambiar estado
- [ ] Filtros por curso/tipo/fecha
```

---

## ❓ DECISIONES PENDIENTES

Antes de implementar, necesito confirmar:

1. **¿El tab "Draft" debe ser visible para el usuario final o solo durante desarrollo?**
   - Opción A: Visible como "🔧 Draft" (desarrollo)
   - Opción B: Oculto, solo accesible por URL

2. **¿Los tipos de novedad predefinidos que propongo son correctos?**
   - Trabaja solo
   - Ausente
   - Problema técnico
   - Conflicto de grupo
   - Observación general

3. **¿El Bottom Drawer es aceptable como alternativa al modal en móvil?**

4. **¿Debo crear tests automatizados o la verificación manual es suficiente por ahora?**
