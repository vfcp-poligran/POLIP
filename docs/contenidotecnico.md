# 📘 Contenido Técnico - Sistema de Registro de Novedades

Este documento detalla la implementación técnica del sistema de novedades, incluyendo comandos, librerías y arquitectura.

---

## 📅 Fecha de Inicio: 2025-12-19

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Angular | 17+ | Framework principal |
| Ionic Framework | 8.x | UI Components y PWA |
| TypeScript | 5.x | Lenguaje tipado |
| Sass/SCSS | 1.x | Estilos |
| Capacitor | 6.x | Acceso nativo |
| IonicStorage | 4.x | Persistencia |

### Estructura de Archivos

```
src/app/
├── models/
│   └── novedad.model.ts       # Interfaces y tipos
│
├── services/
│   ├── novedad.service.ts     # CRUD y lógica de negocio
│   ├── data.service.ts        # Servicio central de datos
│   └── unified-storage.service.ts  # Abstracción de almacenamiento
│
├── pages/
│   └── inicio-draft/          # Página prototipo
│       ├── inicio-draft.page.ts
│       ├── inicio-draft.page.html
│       └── inicio-draft.page.scss
│
└── tabs/
    ├── tabs.routes.ts         # Definición de rutas
    └── tabs.page.ts           # Navegación principal
```

---

## 📦 LIBRERÍAS UTILIZADAS

### Ionic Components (Imports Standalone)

```typescript
import {
  IonContent,           // Contenedor principal scrollable
  IonCard,              // Tarjetas de información
  IonCardHeader,        // Encabezado de tarjeta
  IonCardTitle,         // Título de tarjeta
  IonCardSubtitle,      // Subtítulo de tarjeta
  IonCardContent,       // Contenido de tarjeta
  IonButton,            // Botones interactivos
  IonIcon,              // Iconos de Ionicons
  IonBadge,             // Indicadores numéricos
  IonChip,              // Etiquetas seleccionables
  IonLabel,             // Etiquetas de texto
  IonSearchbar,         // Barra de búsqueda
  IonList,              // Contenedor de listas
  IonItem,              // Elemento de lista
  IonItemSliding,       // Elemento deslizable (swipe)
  IonItemOptions,       // Opciones de swipe
  IonItemOption,        // Botón en opciones de swipe
  IonFab,               // Floating Action Button contenedor
  IonFabButton,         // Botón FAB
  ActionSheetController // Controlador de Action Sheet
} from '@ionic/angular/standalone';
```

### Ionicons (Iconos)

```typescript
import { addIcons } from 'ionicons';
import {
  homeOutline,              // Inicio
  searchOutline,            // Buscar
  personOutline,            // Persona individual
  peopleOutline,            // Grupo de personas
  closeCircleOutline,       // Cerrar/Cancelar
  warningOutline,           // Advertencia
  checkmarkCircleOutline,   // Confirmado
  timeOutline,              // Pendiente/Tiempo
  addOutline,               // Agregar
  cloudOfflineOutline,      // Sin conexión
  alertCircleOutline,       // Alerta
  appsOutline,              // Grid de apps
  chatbubblesOutline,       // Teams (chat)
  schoolOutline,            // Canvas (escuela)
  mailOutline               // Email
} from 'ionicons/icons';

// Registro de iconos en constructor
constructor() {
  addIcons({
    homeOutline,
    searchOutline,
    // ... todos los iconos necesarios
  });
}
```

**Referencia de iconos:** https://ionic.io/ionicons

---

## 🔧 COMANDOS ÚTILES

### Desarrollo

```bash
# Iniciar servidor de desarrollo
ionic serve

# Iniciar en modo específico
ionic serve --lab          # Vista side-by-side iOS/Android
ionic serve --external     # Acceso desde red local

# Compilar para producción
npx ng build --configuration=production

# Verificar sintaxis sin compilar
npx ng build --dry-run
```

### Capacitor (Nativo)

```bash
# Sincronizar cambios web a plataformas nativas
npx cap sync

# Abrir proyecto Android en Android Studio
npx cap open android

# Ejecutar en dispositivo/emulador
npx cap run android

# Compilar APK de debug
cd android && ./gradlew assembleDebug
```

### Git

```bash
# Ver estado
git status

# Agregar todos los cambios
git add .

# Commit con mensaje descriptivo
git commit -m "feat(novedades): implementar sistema de registro"

# Push a remoto
git push origin main
```

---

## 📐 MODELOS DE DATOS

### Novedad (novedad.model.ts)

```typescript
// Tipos de origen del mensaje
export type OrigenMensaje = 
  | 'teams'      // Microsoft Teams
  | 'canvas'     // Canvas LMS
  | 'foro'       // Foro del curso
  | 'email'      // Correo electrónico
  | 'presencial' // En persona
  | 'otro';      // Otro medio

// Estados posibles de una novedad
export type EstadoNovedad = 
  | 'en_revision'   // Pendiente de verificar
  | 'confirmado'    // Verificado como correcto
  | 'descartado';   // Marcado como inválido

// Tipo de novedad predefinido (personalizable)
export interface TipoNovedad {
  id: string;
  nombre: string;       // "Trabaja solo"
  descripcion?: string; // Explicación detallada
  icono: string;        // Ionicon: "person-outline"
  color: string;        // Hex: "#ff9800"
  esRecurrente: boolean;
  frecuenciaUso: number;
  fechaCreacion: Date;
  activo: boolean;
}

// Registro de novedad individual
export interface Novedad {
  id: string;
  estudianteCorreo: string;
  estudianteNombre?: string;
  cursoId: string;
  cursoNombre?: string;
  grupo: string;
  tipoNovedadId: string;
  tipoNovedadNombre?: string;
  origen: OrigenMensaje;
  estado: EstadoNovedad;
  descripcion?: string;
  fechaRegistro: Date;
  fechaActualizacion?: Date;
  syncStatus?: 'pending' | 'synced' | 'conflict';
}
```

### Estudiante (Modelo actualizado)

```typescript
// Estructura de calificaciones por entrega
// ei = Individual, eg = Grupal
export interface CalificacionesEstudiante {
  ei1?: number;   // Entrega 1 - Puntos Individuales
  eg1?: number;   // Entrega 1 - Puntos Grupales
  ei2?: number;   // Entrega 2 - Puntos Individuales
  eg2?: number;   // Entrega 2 - Puntos Grupales
  eif?: number;   // Entrega Final - Puntos Individuales
  egf?: number;   // Entrega Final - Puntos Grupales
}

export interface Estudiante {
  correo: string;
  nombres: string;
  apellidos: string;
  grupo?: string;
  canvasUserId?: string;
  calificaciones?: CalificacionesEstudiante;
}
```

---

## 🔄 FLUJOS DE DATOS

### Registro de Novedad

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Búsqueda   │────>│ Selección Est.   │────>│ Abrir Drawer  │
│ Estudiante  │     │ (chips)          │     │               │
└─────────────┘     └──────────────────┘     └───────────────┘
                                                     │
                                                     ▼
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Storage    │<────│ NovedadService   │<────│ Formulario    │
│ (persist)   │     │ registrar()      │     │ tipo + origen │
└─────────────┘     └──────────────────┘     └───────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │ Signal update    │
                    │ novedades()      │
                    └──────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │ UI se actualiza  │
                    │ automáticamente  │
                    └──────────────────┘
```

### Sincronización Offline

```
┌─────────────────────────────────────────────────────────────┐
│                    MODO ONLINE                              │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────────┐  │
│  │ Usuario │────>│ Registrar    │────>│ Storage Local   │  │
│  │ acción  │     │ Novedad      │     │ + Sync Queue    │  │
│  └─────────┘     └──────────────┘     └─────────────────┘  │
│                          │                      │          │
│                          ▼                      ▼          │
│                  ┌──────────────┐     ┌─────────────────┐  │
│                  │ API Server   │<────│ processSyncQueue│  │
│                  │ (futuro)     │     │                 │  │
│                  └──────────────┘     └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MODO OFFLINE                             │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────────┐  │
│  │ Usuario │────>│ Registrar    │────>│ Storage Local   │  │
│  │ acción  │     │ Novedad      │     │ solamente       │  │
│  └─────────┘     └──────────────┘     └─────────────────┘  │
│                          │                                 │
│                          ▼                                 │
│                  ┌──────────────────────────────────────┐  │
│                  │ syncStatus = 'pending'               │  │
│                  │ Agregar a cola de sincronización     │  │
│                  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 RECONEXIÓN AUTOMÁTICA                       │
│                                                             │
│  window.addEventListener('online', () => {                  │
│    this.processSyncQueue();  // Procesa cola pendiente     │
│  });                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 CHANGELOG

Ver archivo: `CHANGELOG.md`

---

## 🔗 Referencias

- [Angular Signals](https://angular.dev/guide/signals)
- [Ionic Framework Docs](https://ionicframework.com/docs)
- [Ionicons](https://ionic.io/ionicons)
- [Capacitor Docs](https://capacitorjs.com/docs)
