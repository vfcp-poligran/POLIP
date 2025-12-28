# Guía de Nomenclatura CSS - Proyecto TEO

## Convención Adoptada: **Inglés + BEM Modificado**

### Principios Básicos

1. **Idioma:** Inglés para todas las clases CSS
2. **Metodología:** BEM (Block Element Modifier)
3. **Formato:** kebab-case (palabras separadas por guiones)

---

## Estructura BEM

### Block (Bloque)
Componente independiente y reutilizable.

```scss
.course-card { }
.student-list { }
.header-nav { }
```

### Element (Elemento)
Parte de un bloque, sin significado fuera de él.

```scss
.course-card__header { }
.course-card__title { }
.course-card__actions { }
```

### Modifier (Modificador)
Variante o estado de un bloque o elemento.

```scss
.course-card--selected { }
.course-card--premium { }
.button--primary { }
.button--disabled { }
```

---

## Reglas de Nomenclatura

### ✅ Correcto

```scss
// Block
.course-card { }

// Element
.course-card__header { }
.course-card__title { }

// Modifier
.course-card--selected { }
.course-card__header--highlighted { }

// Estados con data attributes (preferido para estados dinámicos)
[data-state="loading"] { }
[data-status="active"] { }
```

### ❌ Incorrecto

```scss
// Mezcla de idiomas
.curso-card { }
.cursos-container { }

// camelCase
.courseCard { }
.studentList { }

// Underscores incorrectos
.course_card { }
.course_card_header { }

// Español
.tarjeta-curso { }
.lista-estudiantes { }
```

---

## Diccionario de Traducción

### Componentes Comunes

| Español | Inglés |
|---------|--------|
| curso(s) | course(s) |
| estudiante(s) | student(s) |
| rúbrica(s) | rubric(s) |
| calificación(es) | grade(s) / score(s) |
| grupo(s) | group(s) |
| botón | button |
| tarjeta | card |
| lista | list |
| contenedor | container |
| encabezado | header |
| pie de página | footer |
| barra lateral | sidebar |
| menú | menu |
| modal | modal |
| formulario | form |
| entrada | input |
| etiqueta | label |
| tabla | table |
| fila | row |
| columna | column |

### Estados y Modificadores

| Español | Inglés |
|---------|--------|
| seleccionado | selected |
| activo | active |
| inactivo | inactive |
| deshabilitado | disabled |
| oculto | hidden |
| visible | visible |
| cargando | loading |
| error | error |
| éxito | success |
| advertencia | warning |
| primario | primary |
| secundario | secondary |

### Acciones

| Español | Inglés |
|---------|--------|
| crear | create |
| editar | edit |
| eliminar | delete |
| guardar | save |
| cancelar | cancel |
| buscar | search |
| filtrar | filter |
| ordenar | sort |

---

## Ejemplos de Refactorización

### Ejemplo 1: Tarjeta de Curso

**❌ Antes:**
```scss
.curso-card {
  &.seleccionado { }
  
  .curso-header { }
  .curso-titulo { }
  .curso-acciones { }
}
```

**✅ Después:**
```scss
.course-card {
  &--selected { }
  
  &__header { }
  &__title { }
  &__actions { }
}
```

### Ejemplo 2: Selector de Grupos

**❌ Antes:**
```scss
.grupos-selector-bar {
  .grupos-buttons-row { }
  .grupo-dynamic-btn {
    &.selected { }
  }
}
```

**✅ Después:**
```scss
.group-selector {
  &__buttons-row { }
  &__button {
    &--selected { }
  }
}
```

### Ejemplo 3: Lista de Estudiantes

**❌ Antes:**
```scss
.estudiantes-table {
  .estudiante-item {
    &.activo { }
  }
}
```

**✅ Después:**
```scss
.student-list {
  &__item {
    &--active { }
  }
}
```

---

## Estados Dinámicos

Para estados que cambian frecuentemente con JavaScript, preferir **data attributes**:

```html
<!-- ✅ Preferido para estados dinámicos -->
<div class="course-card" data-state="loading">
<div class="course-card" data-status="active">
<div class="button" data-disabled="true">

<!-- ✅ También válido para estados estáticos -->
<div class="course-card course-card--premium">
```

```scss
.course-card {
  // Estado dinámico
  &[data-state="loading"] { }
  &[data-status="active"] { }
  
  // Variante estática
  &--premium { }
}
```

---

## Utilidades Globales

Las clases de utilidad pueden ser más cortas y descriptivas:

```scss
// ✅ Utilidades (pueden romper BEM por brevedad)
.hidden { display: none !important; }
.sr-only { /* Screen reader only */ }
.text-center { text-align: center; }
.mt-1 { margin-top: 0.25rem; }
```

---

## Proceso de Migración

### Fase 1: Identificar
1. Buscar todas las clases en español
2. Crear lista de clases a renombrar
3. Priorizar por frecuencia de uso

### Fase 2: Renombrar
1. Actualizar definiciones en SCSS
2. Actualizar referencias en HTML
3. Actualizar referencias en TypeScript

### Fase 3: Verificar
1. Build sin errores
2. Testing visual
3. Testing funcional

---

## Checklist de Revisión

Antes de crear una nueva clase, verificar:

- [ ] ¿Está en inglés?
- [ ] ¿Usa kebab-case?
- [ ] ¿Sigue estructura BEM?
- [ ] ¿Es semántica y descriptiva?
- [ ] ¿No duplica una clase existente?

---

## Excepciones

### Permitidas:
- Nombres de variables Sass (pueden usar español si es legacy)
- Comentarios en código (español está bien)
- Nombres de archivos (mantener consistencia con proyecto)

### No permitidas:
- Clases CSS en español
- Mezcla de idiomas en mismo contexto
- camelCase o snake_case para clases

---

**Versión:** 1.0  
**Fecha:** 27 de diciembre de 2025  
**Estado:** Documento vivo - actualizar según evolucione el proyecto
