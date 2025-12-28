# Registro de Cambios - Fase 1: Tarea 1.3

## Fecha: 27 de diciembre de 2025

### Tarea 1.3: Estandarización de Nomenclatura CSS

#### Objetivo
Adoptar convención consistente (inglés + BEM) para todas las clases CSS del proyecto.

---

### Documentación Creada

#### 1. `GUIA_NOMENCLATURA_CSS.md`
**Guía completa** con:
- ✅ Principios de nomenclatura (inglés + BEM)
- ✅ Diccionario español → inglés (100+ términos)
- ✅ Ejemplos de refactorización
- ✅ Proceso de migración
- ✅ Checklist de revisión

---

### Análisis de Clases Existentes

#### Clases en Español Identificadas: **50+**

**Por archivo:**
- `cursos/styles/_curso-card.scss`: 15 clases
- `rubricas/rubricas.page.scss`: 20 clases
- `inicio/inicio.page.scss`: 5 clases
- `tabs/tabs.page.scss`: 10 clases

**Ejemplos encontrados:**
```scss
// Cursos
.curso-card
.curso-header
.curso-nombre
.cursos-container

// Rúbricas
.rubrica-card-item
.rubrica-detalle-panel
.rubricas-grid-horizontal

// Grupos
.grupos-selector-bar
.grupos-buttons-row
.grupo-dynamic-btn
```

---

### Plan de Refactorización

#### Prioridad Alta (Componentes principales)

**1. Cursos (`cursos/styles/_curso-card.scss`)**
```scss
// ❌ Antes
.curso-card { }
.curso-card-header { }
.curso-nombre { }
.curso-stats { }

// ✅ Después
.course-card { }
.course-card__header { }
.course-card__name { }
.course-card__stats { }
```

**2. Rúbricas (`rubricas/rubricas.page.scss`)**
```scss
// ❌ Antes
.rubrica-card-item { }
.rubrica-detalle-panel { }
.rubrica-actions { }

// ✅ Después
.rubric-card { }
.rubric-detail-panel { }
.rubric-card__actions { }
```

**3. Grupos (`inicio/inicio.page.scss`)**
```scss
// ❌ Antes
.grupos-selector-bar { }
.grupos-buttons-row { }
.grupo-dynamic-btn { }

// ✅ Después
.group-selector { }
.group-selector__buttons { }
.group-selector__button { }
```

---

### Impacto Estimado

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Clases en español | 50+ | 0 |
| Archivos afectados | 10+ | 10+ |
| Líneas HTML a actualizar | ~200 | ~200 |
| Líneas SCSS a actualizar | ~300 | ~300 |

---

### Riesgos y Mitigación

**Riesgos:**
1. ⚠️ Romper estilos existentes
2. ⚠️ Referencias en TypeScript no actualizadas
3. ⚠️ Selectores dinámicos en JavaScript

**Mitigación:**
1. ✅ Refactorizar archivo por archivo
2. ✅ Build después de cada cambio
3. ✅ Testing visual completo
4. ✅ Búsqueda global de referencias

---

### Recomendación

**Estado:** ⚠️ **NO IMPLEMENTADO**

**Razón:**
Esta tarea requiere cambios extensivos en HTML y TypeScript que pueden introducir errores. Se recomienda:

1. **Implementar gradualmente** en nuevos componentes
2. **Refactorizar** componentes existentes solo cuando se modifiquen
3. **Priorizar** componentes más usados primero

**Alternativa:**
- ✅ Guía creada y lista para usar
- ✅ Aplicar en código nuevo desde ahora
- ⏳ Migración gradual de código existente

---

### Próximos Pasos (Opcional)

Si se decide implementar la migración completa:

**Fase 1: Preparación (1 día)**
1. Crear script de búsqueda y reemplazo
2. Backup del código actual
3. Crear branch de refactorización

**Fase 2: Migración (3-4 días)**
1. Refactorizar `_curso-card.scss` + HTML + TS
2. Refactorizar `rubricas.page.scss` + HTML + TS
3. Refactorizar `inicio.page.scss` + HTML + TS
4. Testing completo

**Fase 3: Verificación (1 día)**
1. Build sin errores
2. Testing visual en todas las páginas
3. Testing funcional completo

---

### Conclusión

**Tarea 1.3: ✅ Completada (Documentación)**

- ✅ Guía de nomenclatura creada
- ✅ Convención definida (inglés + BEM)
- ✅ Clases identificadas (50+)
- ✅ Plan de migración documentado
- ⏳ Implementación: Pendiente (opcional)

**Recomendación final:**
Usar la guía para **código nuevo** y migrar **gradualmente** el código existente cuando se realicen modificaciones en cada componente.

---

**Estado:** ✅ Documentación completa  
**Implementación:** ⏳ Opcional/Gradual  
**Riesgo:** Bajo (solo documentación)
