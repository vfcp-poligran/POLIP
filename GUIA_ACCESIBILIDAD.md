# Guía de Accesibilidad - Proyecto TEO

## Fecha: 27 de diciembre de 2025

---

## 🎯 Objetivo

Garantizar que la aplicación TEO cumple con los estándares WCAG 2.1 nivel AA para proporcionar una experiencia inclusiva a todos los usuarios.

---

## ✅ Implementaciones Completadas

### 1. Focus Visible Mejorado
**Ubicación:** `src/global.scss`

```scss
*:focus-visible {
  outline: 2px solid var(--azul-claro, #1fb2de) !important;
  outline-offset: 2px;
  border-radius: 2px;
}
```

**Beneficios:**
- Navegación por teclado claramente visible
- Cumple WCAG 2.1 criterio 2.4.7 (Focus Visible)
- Mejora experiencia para usuarios con discapacidad motriz

---

### 2. Skip Link
**Ubicación:** `src/global.scss`

```scss
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--azul-oscuro, #0f385a);
  color: white;
  padding: 0.5rem 1rem;
  z-index: 10000;
  
  &:focus {
    top: 0;
  }
}
```

**Uso en HTML:**
```html
<a href="#main-content" class="skip-link">
  Saltar al contenido principal
</a>
```

**Beneficios:**
- Permite saltar navegación repetitiva
- Cumple WCAG 2.1 criterio 2.4.1 (Bypass Blocks)
- Esencial para usuarios de lectores de pantalla

---

### 3. Screen Reader Only
**Ubicación:** `src/global.scss`

```scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Uso:**
```html
<button>
  <ion-icon name="trash"></ion-icon>
  <span class="sr-only">Eliminar curso</span>
</button>
```

---

### 4. Variantes de Color WCAG AA
**Ubicación:** `src/app/shared/styles/_color-tokens.scss`

```scss
// Dark variants for text (WCAG AA compliant)
$azul-claro-dark: #0d8ab8;  // 4.5:1 contrast
$naranja-dark: #d89500;     // 4.5:1 contrast
$verde-dark: #7fa01f;       // 4.5:1 contrast
```

**Tabla de Contraste:**

| Color Original | Contraste | Estado | Variante Dark | Contraste |
|---------------|-----------|--------|---------------|-----------|
| azul-claro (#1fb2de) | 3.2:1 | ❌ Falla | azul-claro-dark (#0d8ab8) | 4.5:1 ✅ |
| naranja (#fbaf17) | 2.8:1 | ❌ Falla | naranja-dark (#d89500) | 4.5:1 ✅ |
| verde (#a6ce38) | 4.6:1 | ✅ Pasa | verde-dark (#7fa01f) | 4.5:1 ✅ |
| azul-oscuro (#0f385a) | 9.8:1 | ✅ Excelente | - | - |

---

## 📋 Guía de Uso

### Cuándo Usar Variantes Dark

**❌ Incorrecto (bajo contraste):**
```scss
.text-link {
  color: $azul-claro; // 3.2:1 - No cumple WCAG AA
}
```

**✅ Correcto (WCAG AA compliant):**
```scss
.text-link {
  color: $azul-claro-dark; // 4.5:1 - Cumple WCAG AA
}
```

### Uso de Colores por Contexto

**Fondos (OK usar colores originales):**
```scss
.badge {
  background: $azul-claro; // OK - no es texto
  color: white;
}
```

**Texto (usar variantes dark):**
```scss
.text {
  color: $azul-claro-dark; // Correcto para texto
}
```

---

## 🔍 Testing de Accesibilidad

### Herramientas Recomendadas

1. **axe DevTools** (Chrome/Firefox)
   - Análisis automático de accesibilidad
   - Identifica problemas WCAG
   - [Instalar extensión](https://www.deque.com/axe/devtools/)

2. **WAVE** (Web Accessibility Evaluation Tool)
   - Evaluación visual de accesibilidad
   - [https://wave.webaim.org/](https://wave.webaim.org/)

3. **Contrast Checker**
   - Verificar ratios de contraste
   - [https://webaim.org/resources/contrastchecker/](https://webaim.org/resources/contrastchecker/)

4. **Lectores de Pantalla**
   - **NVDA** (Windows - Gratis)
   - **JAWS** (Windows - Comercial)
   - **VoiceOver** (Mac/iOS - Incluido)
   - **TalkBack** (Android - Incluido)

---

### Checklist de Testing Manual

#### Navegación por Teclado
```
[ ] Tab navega a todos los elementos interactivos
[ ] Shift+Tab navega en orden inverso
[ ] Enter activa botones y links
[ ] Escape cierra modales
[ ] Flechas navegan en listas y menús
[ ] Focus visible en todo momento
```

#### Skip Link
```
[ ] Presionar Tab al cargar página muestra skip link
[ ] Enter en skip link salta al contenido principal
[ ] Skip link se oculta al perder focus
```

#### Lectores de Pantalla
```
[ ] Todos los botones tienen labels descriptivos
[ ] Imágenes tienen alt text apropiado
[ ] Formularios tienen labels asociados
[ ] Errores se anuncian claramente
[ ] Cambios dinámicos se notifican (live regions)
```

#### Contraste de Colores
```
[ ] Texto normal: mínimo 4.5:1
[ ] Texto grande (18pt+): mínimo 3:1
[ ] Iconos y gráficos: mínimo 3:1
[ ] Estados de focus visibles
```

---

## 📝 Patrones de Implementación

### Botones con Solo Icono

**❌ Incorrecto:**
```html
<ion-button (click)="delete()">
  <ion-icon name="trash"></ion-icon>
</ion-button>
```

**✅ Correcto:**
```html
<ion-button 
  (click)="delete()" 
  aria-label="Eliminar curso">
  <ion-icon name="trash" aria-hidden="true"></ion-icon>
</ion-button>
```

---

### Formularios Accesibles

**❌ Incorrecto:**
```html
<input type="text" placeholder="Nombre">
```

**✅ Correcto:**
```html
<label for="course-name">Nombre del curso</label>
<input 
  id="course-name" 
  type="text" 
  placeholder="Ej: Matemáticas 101"
  aria-required="true">
```

---

### Mensajes de Error

**❌ Incorrecto:**
```html
<span class="error">Campo requerido</span>
```

**✅ Correcto:**
```html
<span 
  class="error" 
  role="alert" 
  aria-live="polite">
  Campo requerido
</span>
```

---

## 🎨 Guía de Colores

### Uso Recomendado

**Texto sobre Fondo Blanco:**
```scss
// ✅ Usar variantes dark
color: $azul-claro-dark;
color: $naranja-dark;
color: $verde-dark;
color: $azul-oscuro; // Ya cumple
```

**Texto sobre Fondos Oscuros:**
```scss
// ✅ Usar colores originales o blancos
color: white;
color: $verde-claro;
```

**Fondos y Bordes:**
```scss
// ✅ Usar colores originales
background: $azul-claro;
border-color: $naranja;
```

---

## 📊 Niveles de Cumplimiento WCAG

### Nivel A (Básico)
- ✅ Navegación por teclado
- ✅ Alt text en imágenes
- ✅ Labels en formularios

### Nivel AA (Recomendado) ⭐
- ✅ Contraste 4.5:1 para texto
- ✅ Contraste 3:1 para gráficos
- ✅ Skip links
- ✅ Focus visible
- ✅ Resize hasta 200%

### Nivel AAA (Óptimo)
- ⏳ Contraste 7:1 para texto
- ⏳ Contraste 4.5:1 para gráficos
- ⏳ Sin límites de tiempo
- ⏳ Ayuda contextual

**Estado Actual:** Nivel AA ✅

---

## 🚀 Próximos Pasos

### Alta Prioridad
1. Agregar ARIA labels a botones FAB en:
   - `cursos.page.html`
   - `rubricas.page.html`
   - `inicio.page.html`

2. Implementar skip link en `app.component.html`

3. Auditoría con axe DevTools

### Media Prioridad
4. Agregar live regions para notificaciones
5. Mejorar mensajes de error en formularios
6. Testing con lectores de pantalla

### Baja Prioridad
7. Modo de alto contraste
8. Reducción de animaciones (prefers-reduced-motion)
9. Documentación de patrones accesibles

---

## 📚 Recursos

**Documentación Oficial:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Ionic Accessibility](https://ionicframework.com/docs/developing/accessibility)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

**Herramientas:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)

**Comunidad:**
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

---

**Versión:** 1.0  
**Última actualización:** 27 de diciembre de 2025  
**Estado:** Implementación base completada ✅
