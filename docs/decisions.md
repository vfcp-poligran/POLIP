# 📋 Decisiones del Proyecto - Sistema de Novedades

**Fecha de decisión**: 2025-12-19  
**Proyecto**: POLI - Sistema de Gestión Académica  

---

## ✅ DECISIONES CONFIRMADAS

### 1. Opción de GUI
**Selección**: **Opción Híbrida (A + B)**

- Vista principal con búsqueda + panel lateral de registro (Opción A)
- Modal/drawer para casos que requieran más detalle (Opción B adaptada)
- En móvil: **Bottom Drawer** en lugar de modales

### 2. Tipos de Novedad
**Selección**: **Personalizables por el instructor**

El instructor podrá:
- Crear nuevos tipos de novedad
- Editar tipos existentes
- Eliminar tipos que no use
- Los tipos frecuentes se sugieren primero

### 3. Exportación de Historial
**Selección**: **NO se requiere**

- No implementar exportación a Excel/PDF por ahora
- Priorizar funcionalidad core

### 4. Funcionamiento Offline
**Selección**: **SÍ, con sincronización bidireccional**

Requisitos:
- Registrar novedades sin conexión
- Sincronizar desktop → móvil
- Sincronizar móvil → desktop
- Resolver conflictos automáticamente (timestamp más reciente gana)

**Tecnología sugerida**: 
- LocalStorage/IndexedDB para persistencia local
- Service Worker para detección de conexión
- Mecanismo de cola de sincronización

### 5. Notificaciones
**Selección**: **SÍ, integrar recordatorios**

Implementar:
- Recordatorios de novedades pendientes de confirmar
- Badge con contador en tab de Inicio
- Posible: notificaciones push (si ya existe infraestructura)

---

## 📂 DOCUMENTACIÓN GENERADA

| Archivo | Descripción |
|---------|-------------|
| `cursos_audit.md` | Auditoría técnica de la sección Cursos |
| `novedades_design.md` | Diseño de GUI con 3 opciones + híbrida |
| `implementation_plan.md` | Plan de implementación detallado |
| `task_inicio_draft.md` | Checklist de tareas por fase |

---

## 🚀 PRÓXIMOS PASOS

1. **Crear página `inicio-draft`** con estructura básica
2. **Crear `novedad.service.ts`** con CRUD y tipos personalizables
3. **Implementar panorama de cursos** con datos existentes
4. **Implementar bottom drawer** para registro (móvil)
5. **Agregar soporte offline** con cola de sincronización
6. **Implementar sistema de notificaciones**

---

## 📌 NOTAS TÉCNICAS

### Sincronización Offline
```typescript
interface SyncQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'novedad' | 'tipo_novedad';
  payload: any;
  timestamp: Date;
  synced: boolean;
}
```

### Notificaciones
```typescript
interface NovedadNotification {
  count: number;           // Novedades pendientes
  lastCheck: Date;         // Última verificación
  reminders: string[];     // IDs de novedades con reminder
}
```
