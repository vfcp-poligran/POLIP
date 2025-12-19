# 📚 Aprender.md - Conceptos Técnicos del Proyecto

Este documento responde preguntas frecuentes y explica conceptos clave utilizados en el proyecto.

---

## ❓ PREGUNTAS FRECUENTES

### 1. ¿IonicStorage es pertinente para Desktop (Windows) y Android?

**Respuesta: SÍ, es pertinente.**

IonicStorage es una abstracción de almacenamiento que funciona en múltiples plataformas:

| Plataforma | Backend de Almacenamiento |
|------------|---------------------------|
| **Web/PWA** | IndexedDB (fallback a LocalStorage) |
| **Android** | SQLite via Capacitor |
| **iOS** | SQLite via Capacitor |
| **Desktop (Electron)** | SQLite o IndexedDB |
| **Desktop Web** | IndexedDB |

**En este proyecto usamos `UnifiedStorageService`** que encapsula IonicStorage:

```typescript
// unified-storage.service.ts
import { Storage } from '@ionic/storage-angular';

@Injectable({ providedIn: 'root' })
export class UnifiedStorageService {
  private storage: Storage | null = null;
  
  async init() {
    this.storage = await this.ionicStorage.create();
  }
  
  async set(key: string, value: any) {
    return this.storage?.set(key, value);
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.storage?.get(key);
  }
}
```

**Capacidades**:
- ✅ Persistencia offline
- ✅ Almacenamiento estructurado (objetos JSON)
- ✅ ~5MB-50MB según plataforma
- ✅ Sincrónico en lectura después de init

---

### 2. ¿Dónde está ubicado Inicio_draft?

**Ubicación en el proyecto:**

```
d:\POLI\src\app\
├── pages/
│   ├── inicio/              # Página original de Inicio
│   │   ├── inicio.page.ts
│   │   ├── inicio.page.html
│   │   └── inicio.page.scss
│   │
│   └── inicio-draft/        # 👈 NUEVA página de prototipo
│       ├── inicio-draft.page.ts
│       ├── inicio-draft.page.html
│       └── inicio-draft.page.scss
│
├── services/
│   └── novedad.service.ts   # Servicio para novedades
│
├── models/
│   └── novedad.model.ts     # Interfaces de novedades
│
└── tabs/
    ├── tabs.routes.ts       # Ruta: /tabs/inicio-draft
    └── tabs.page.ts         # Navegación: "🔧 Draft"
```

**Acceso:**
- URL: `http://localhost:8100/tabs/inicio-draft`
- Navegación: Botón "Draft" con icono 🔧 en el menú

---

### 3. ¿Está basado en Angular Signals?

**Respuesta: SÍ, completamente.**

Todo el proyecto utiliza Angular Signals (introducidos en Angular 16+).

```typescript
// Ejemplo en NovedadService
private _novedades = signal<Novedad[]>([]);           // WritableSignal
public novedades = this._novedades.asReadonly();      // Signal (solo lectura)

// Computed signals
public pendientesCount = computed(() => 
  this._novedades().filter(n => n.estado === 'en_revision').length
);
```

---

### 4. ¿El sistema de importación es moderno?

**Respuesta: SÍ, usa importaciones modernas de Angular 17+.**

Características:
- ✅ **Standalone Components** (sin NgModules)
- ✅ **Lazy Loading** de rutas
- ✅ **Importaciones explícitas** de componentes Ionic

```typescript
// Antes (Angular 14-): NgModule con declaraciones
@NgModule({
  declarations: [MyComponent],
  imports: [IonicModule]
})
export class MyModule {}

// Ahora (Angular 17+): Standalone con imports directos
@Component({
  selector: 'app-my',
  standalone: true,
  imports: [IonButton, IonIcon, IonCard]  // 👈 Imports explícitos
})
export class MyComponent {}
```

---

## 📖 CONCEPTOS TÉCNICOS

### ¿Qué es Angular Signal?

**Signal** es una primitiva reactiva introducida en Angular 16 que representa un valor que puede cambiar con el tiempo y notifica automáticamente a los consumidores cuando cambia.

#### ¿Por qué se usa?

| Problema con RxJS | Solución con Signals |
|-------------------|---------------------|
| Boilerplate extenso | Sintaxis simple |
| Memory leaks (suscripciones) | Sin suscripciones manuales |
| Async pipe en templates | Llamada directa: `signal()` |
| Change detection manual | Actualización automática |

#### Estructura y Funcionamiento

```typescript
import { signal, computed, effect } from '@angular/core';

// 1. SIGNAL BÁSICO (WritableSignal)
// Contiene un valor que puede cambiar
const contador = signal<number>(0);

// Leer valor (como función)
console.log(contador());  // 0

// Escribir valor
contador.set(5);          // Reemplaza completamente
contador.update(v => v + 1);  // Modifica basándose en valor anterior

// 2. COMPUTED SIGNAL (Signal derivado)
// Se recalcula automáticamente cuando cambian sus dependencias
const doble = computed(() => contador() * 2);
console.log(doble());  // 12 (si contador es 6)

// 3. EFFECT (Efecto secundario)
// Se ejecuta cuando cambian las señales que usa
effect(() => {
  console.log(`Contador cambió a: ${contador()}`);
  // Se ejecuta automáticamente cuando contador cambia
});

// 4. READONLY SIGNAL
// Exponer signal sin permitir modificaciones externas
private _datos = signal<string[]>([]);
public datos = this._datos.asReadonly();  // Solo lectura
```

#### Diagrama de flujo

```
┌─────────────┐     cambio      ┌──────────────┐
│   signal()  │ ───────────────>│  computed()  │
└─────────────┘                 └──────────────┘
       │                               │
       │ notifica                     │ notifica
       ▼                              ▼
┌─────────────┐                ┌──────────────┐
│  effect()   │                │   Template   │
│  (consola)  │                │   {{ () }}   │
└─────────────┘                └──────────────┘
```

---

### ¿Qué es el Drawer de Registro?

El **Bottom Drawer** (cajón deslizante inferior) es un patrón de UI móvil que muestra contenido adicional deslizándose desde la parte inferior de la pantalla.

#### Características

- **Alternativa a modales**: No bloquea completamente la pantalla
- **Arrastrables**: Se pueden abrir/cerrar con gestos
- **Contexto visible**: El contenido de fondo sigue visible
- **Nativo en móviles**: Patrón familiar para usuarios (iOS/Android)

#### Implementación en el proyecto

```html
<!-- inicio-draft.page.html -->
<div class="bottom-drawer" [class.visible]="drawerVisible()">
  <div class="drawer-handle" (click)="toggleDrawer()">
    <div class="handle-bar"></div>  <!-- Indicador visual de arrastre -->
  </div>
  
  <div class="drawer-header">
    <h3>Registrar Novedad</h3>
    <ion-button fill="clear" (click)="cerrarDrawer()">
      <ion-icon slot="icon-only" name="close-outline"></ion-icon>
    </ion-button>
  </div>
  
  <div class="drawer-content">
    <!-- Formulario de registro -->
  </div>
</div>
```

```scss
// inicio-draft.page.scss
.bottom-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  transform: translateY(100%);  // Oculto por defecto
  transition: transform 0.3s ease;
  z-index: 1000;
  
  &.visible {
    transform: translateY(0);  // Visible
  }
}
```

---

### ¿Qué es el Action Sheet para tipo de novedad (Móvil)?

El **Action Sheet** es un componente nativo de Ionic que muestra una lista de opciones en un panel deslizante desde la parte inferior de la pantalla.

#### ¿Por qué usarlo?

- ✅ **Nativo en iOS/Android**: Se siente como parte del sistema
- ✅ **Touch-friendly**: Botones grandes y fáciles de tocar
- ✅ **Accesible**: Soporte automático para lectores de pantalla
- ✅ **Cancelable**: Se cierra tocando fuera o con gesto

#### Implementación

```typescript
// inicio-draft.page.ts
async mostrarTiposNovedad(): Promise<void> {
  const tipos = this.tiposNovedad();
  
  // Construir botones dinámicamente desde los tipos disponibles
  const buttons = tipos.map(tipo => ({
    text: tipo.nombre,
    icon: tipo.icono,
    handler: () => {
      this.tipoNovedadSeleccionado.set(tipo);
    }
  }));
  
  // Agregar botón cancelar
  buttons.push({
    text: 'Cancelar',
    icon: 'close-outline',
    role: 'cancel',
    handler: () => {}
  });
  
  // Crear y presentar Action Sheet
  const actionSheet = await this.actionSheetCtrl.create({
    header: 'Tipo de Novedad',
    buttons
  });
  
  await actionSheet.present();
}
```

#### Visualización

```
┌─────────────────────────────────┐
│         Tipo de Novedad         │  ← Header
├─────────────────────────────────┤
│  👤  Trabaja solo               │  ← Botón opción
├─────────────────────────────────┤
│  ❌  Ausente                    │
├─────────────────────────────────┤
│  ⚙️  Problema técnico           │
├─────────────────────────────────┤
│  🔄  Conflicto de grupo         │
├─────────────────────────────────┤
│  ✖️  Cancelar                   │  ← Botón cancelar (rojo)
└─────────────────────────────────┘
```

---

## 🔗 Recursos Adicionales

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Ionic Action Sheet](https://ionicframework.com/docs/api/action-sheet)
- [Ionic Storage](https://github.com/ionic-team/ionic-storage)
- [Ionicons - Iconos](https://ionic.io/ionicons)
