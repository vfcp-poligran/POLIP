# 📋 Task: Implementar Inicio_draft con Sistema de Novedades

## Fase 1: Estructura base
- [ ] Crear carpeta `pages/inicio-draft/`
- [ ] Crear `inicio-draft.page.ts` (componente standalone)
- [ ] Crear `inicio-draft.page.html` (template básico)
- [ ] Crear `inicio-draft.page.scss` (estilos básicos)
- [ ] Agregar ruta en `tabs.routes.ts`
- [ ] Agregar navegación temporal en `tabs.page.ts`
- [ ] Verificar que la página carga correctamente

## Fase 2: Servicio de novedades
- [ ] Crear `models/novedad.model.ts` con interfaces
- [ ] Crear `services/novedad.service.ts`
  - [ ] Tipos predefinidos de novedades
  - [ ] CRUD de novedades
  - [ ] Persistencia con UnifiedStorageService
  - [ ] Signals para reactividad

## Fase 3: Vista panorama de cursos
- [ ] Inyectar DataService para obtener cursos existentes
- [ ] Crear cards de resumen por curso
- [ ] Mostrar grupos como botones
- [ ] Contador de novedades por curso
- [ ] Responsive: grid desktop / stack mobile

## Fase 4: Registro de novedades
- [ ] Implementar búsqueda de estudiantes
- [ ] Selector de tipo de novedad
  - [ ] Action sheet para móvil
  - [ ] Chips para desktop
- [ ] Selector de origen (Teams, Canvas, Foro, Email)
- [ ] Bottom drawer para móvil
- [ ] Panel lateral para desktop
- [ ] Registro masivo de múltiples estudiantes

## Fase 5: Historial de novedades
- [ ] Lista de novedades recientes agrupadas por fecha
- [ ] Swipe actions para cambiar estado (mobile)
- [ ] Botones para cambiar estado (desktop)
- [ ] Filtros por curso/tipo/fecha
- [ ] Indicadores visuales de estado

## Verificación
- [ ] Test 1: Navegación a inicio-draft funciona
- [ ] Test 2: Cursos existentes se cargan correctamente
- [ ] Test 3: Registro de novedad en desktop
- [ ] Test 4: Registro de novedad en mobile (bottom drawer)
- [ ] Test 5: Cambio de estado de novedad
- [ ] Test 6: Persistencia (recargar página mantiene datos)
