# Guía de Uso - Dark Mode

## Fecha: 27 de diciembre de 2025

---

## 🎨 Cómo Usar el Dark Mode

### Para Usuarios

#### Cambiar Tema Manualmente
1. Ir a **Sistema** (Settings)
2. Buscar la sección "Tema de la Aplicación"
3. Hacer clic en el botón de tema
4. El tema cambiará automáticamente

#### Iconos del Toggle
- ☀️ **sunny** - Tema claro activo
- 🌙 **moon** - Tema oscuro activo
- ⚖️ **contrast** - Tema automático (sigue sistema)

---

### Para Desarrolladores

#### Agregar Toggle a un Componente

**Paso 1: Importar el componente**
```typescript
import { ThemeToggleComponent } from '@app/shared/components/theme-toggle/theme-toggle.component';

@Component({
  imports: [ThemeToggleComponent, ...]
})
```

**Paso 2: Agregar al template**
```html
<ion-toolbar>
  <ion-buttons slot="end">
    <app-theme-toggle></app-theme-toggle>
  </ion-buttons>
</ion-toolbar>
```

---

#### Usar ThemeService

**Importar servicio:**
```typescript
import { inject } from '@angular/core';
import { ThemeService } from '@app/services/theme.service';

export class MyComponent {
  themeService = inject(ThemeService);
}
```

**Cambiar tema programáticamente:**
```typescript
// Establecer tema específico
this.themeService.setTheme('dark');    // Forzar oscuro
this.themeService.setTheme('light');   // Forzar claro
this.themeService.setTheme('auto');    // Automático

// Toggle entre temas
this.themeService.toggleTheme();
```

**Observar cambios de tema:**
```typescript
import { effect } from '@angular/core';

constructor() {
  effect(() => {
    const theme = this.themeService.currentTheme();
    console.log('Tema actual:', theme);
  });
}
```

---

## 🎨 Personalizar Colores

### Modificar Variables de Dark Mode

**Ubicación:** `src/theme/dark-mode.scss`

```scss
[data-theme="dark"] {
  // Cambiar color de fondo
  --background: #1a1a1a;  // Tu color personalizado
  
  // Cambiar color de texto
  --text-primary: #e0e0e0;  // Tu color personalizado
  
  // Cambiar colores primarios
  --azul-oscuro: #5a9fd4;  // Tu color personalizado
}
```

### Verificar Contraste WCAG

**Herramienta:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Mínimos requeridos:**
- Texto normal: 4.5:1
- Texto grande (18pt+): 3:1

---

## 🧪 Testing

### Checklist de Pruebas

**Funcionalidad:**
- [ ] Toggle cambia tema correctamente
- [ ] Tema persiste después de recargar
- [ ] Tema automático detecta preferencias del sistema
- [ ] Iconos cambian según tema activo

**Visual:**
- [ ] Todos los componentes se ven bien en dark mode
- [ ] Contraste de texto es legible
- [ ] Colores de botones son apropiados
- [ ] Sombras son visibles

**Accesibilidad:**
- [ ] Contraste WCAG AA cumplido
- [ ] Toggle tiene ARIA label
- [ ] Navegación por teclado funciona
- [ ] Lectores de pantalla anuncian cambios

---

## 🐛 Troubleshooting

### El tema no cambia

**Solución 1:** Verificar que dark-mode.scss está importado
```scss
// En global.scss
@import './theme/dark-mode.scss';
```

**Solución 2:** Limpiar caché del navegador
```
Settings > Sistema > Limpiar Caché PWA
```

### Colores no se ven bien

**Solución:** Verificar que componentes usan variables CSS
```scss
// ❌ Incorrecto
.mi-componente {
  background: #ffffff;
}

// ✅ Correcto
.mi-componente {
  background: var(--background);
}
```

### Tema no persiste

**Solución:** Verificar localStorage
```javascript
// En consola del navegador
localStorage.getItem('app-theme')
```

---

## 📚 Recursos

**Documentación:**
- [Ionic Dark Mode](https://ionicframework.com/docs/theming/dark-mode)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)

**Herramientas:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Safe](http://colorsafe.co/)
- [Accessible Colors](https://accessible-colors.com/)

---

**Versión:** 1.0  
**Última actualización:** 27 de diciembre de 2025
