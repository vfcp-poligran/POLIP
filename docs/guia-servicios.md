# Guía de Servicios - Versión 4.0

## Servicios Nuevos

### CourseManagementService
**Ubicación:** `src/app/services/course-management.service.ts`  
**Líneas:** 263

**Responsabilidad:** Gestión centralizada de cursos

**Métodos principales:**
- `generarCodigoCurso()` - Genera códigos estandarizados
- `validarCurso()` - Valida datos del curso
- `obtenerGrupos()` - Lista grupos del curso

---

### CacheService
**Ubicación:** `src/app/services/cache.service.ts`  
**Líneas:** 213

**Responsabilidad:** Gestión de caché con TTL

**Métodos principales:**
- `set(key, value, ttl)` - Guardar en caché
- `get(key)` - Obtener de caché
- `invalidate(key)` - Invalidar entrada
- `clear()` - Limpiar todo

**TTL por defecto:** 5 minutos

---

### SearchService
**Ubicación:** `src/app/services/search.service.ts`  
**Líneas:** 132

**Responsabilidad:** Búsqueda global cross-course

**Métodos principales:**
- `searchGlobal(query)` - Búsqueda en todos los cursos
- `searchInCourse(query, courseId)` - Búsqueda en curso específico
- `sortByRelevance(results)` - Ordenar por relevancia

---

### CohorteService
**Ubicación:** `src/app/services/cohorte.service.ts`  
**Líneas:** 291

**Responsabilidad:** Sistema de cohortes y repitentes

**Métodos principales:**
- `detectarRepitentes(codigoBase)` - Detecta estudiantes repitentes
- `getHistorialEstudiante(correo)` - Historial completo
- `generarReporteCohorte(ingreso, anio)` - Reportes estadísticos
- `compararCohortes(ingresos, anio)` - Comparativas

---

### RubricTemplateService
**Ubicación:** `src/app/services/rubric-template.service.ts`  
**Líneas:** 366

**Responsabilidad:** Plantillas y validación de rúbricas

**Métodos principales:**
- `validarRubrica(rubrica)` - Validación automática
- `getTemplate(id)` - Obtener plantilla
- `crearDesdePlantilla(templateId, nombre)` - Crear desde plantilla
- `exportarJSON(rubrica)` - Exportar a JSON
- `importarJSON(json)` - Importar desde JSON
- `compararVersiones(v1, v2)` - Diff entre versiones

**Plantillas disponibles:**
- `proyecto-programacion`
- `presentacion-oral`

---

### GlobalErrorHandler
**Ubicación:** `src/app/core/errors/global-error-handler.ts`  
**Líneas:** 94

**Responsabilidad:** Manejo global de errores

**Características:**
- Captura todos los errores no controlados
- Mensajes user-friendly vía ToastService
- Logging para telemetría

---

### HttpErrorInterceptor
**Ubicación:** `src/app/core/interceptors/http-error.interceptor.ts`  
**Líneas:** 78

**Responsabilidad:** Interceptor HTTP con retry

**Características:**
- Retry automático (máx 3 intentos)
- Exponential backoff (1s, 2s, 4s)
- Solo para GET y HEAD
- Errores 5xx y de red

---

## Uso Común

### Inyección
```typescript
constructor(
  private cohorteService: CohorteService,
  private cacheService: CacheService
) {}
```

### Ejemplo: Detectar Repitentes
```typescript
const repitentes = this.cohorteService.detectarRepitentes('EPM');
console.log(`${repitentes.length} estudiantes repiten`);
```

### Ejemplo: Usar Caché
```typescript
// Guardar
this.cacheService.set('cursos', data, 300); // 5 min

// Obtener
const cached = this.cacheService.get('cursos');
```

### Ejemplo: Validar Rúbrica
```typescript
const result = this.rubricTemplateService.validarRubrica(rubrica);
if (!result.isValid) {
  console.error(result.errors);
}
```

---

**Actualizado:** 25/12/2025
