# Gestor de Seguimiento de Proyectos v3.5

Una aplicación Ionic multiplataforma para la gestión y evaluación de estudiantes basada en rúbricas del Politécnico Grancolombiano.

## 🆕 Novedades v3.5.0

- **🧹 Interfaz Simplificada**: Eliminación de funcionalidad de evaluación duplicada
- **📐 Enfoque en Rúbricas**: Gestión centralizada de criterios de evaluación
- **⚡ Optimización**: Mejor rendimiento y código más limpio
- **🔧 Estabilidad**: Corrección de errores de sintaxis y mejoras técnicas

## 🚀 Características

- **Gestión de Cursos**: Visualización de estudiantes con filtros y cálculos automáticos
- **Sistema de Rúbricas**: Gestión de criterios de evaluación I/A/E
- **Navegación por Tabs**: Interfaz moderna con pestañas independientes
- **Importación/Exportación**: Gestión de datos CSV y JSON
- **Información del Sistema**: Display completo del stack tecnológico
- **Multiplataforma**: Web PWA, Android e iOS

## 🛠️ Tecnologías

- **Ionic 8** + **Angular 18** (Arquitectura Standalone)
- **TypeScript**
- **Ionic Storage** (SQLite/IndexedDB)
- **PapaCSV** para procesamiento de datos
- **Capacitor** para aplicaciones nativas
- **PWA** - Progressive Web App

## 📱 Plataformas Soportadas

✅ **Web PWA** - Ejecutándose en navegadores modernos
✅ **Android** - APK nativo
✅ **iOS** - Aplicación nativa

## 🎨 Diseño

- **Paleta de colores SRS**:
  - Azul claro: #1FB2DE
  - Azul oscuro: #0F385A
  - Naranja: #FBAF17
  - Verde: #A6CE38
  - Magenta: #EC0677
  - Cyan: #15BECE

- **Tipografía**:
  - Encabezados: Brandon Grotesque
  - Texto: Open Sans

## 🚀 Instalación y Ejecución

### Requisitos Previos

- Node.js 18+
- npm o yarn
- Ionic CLI: `npm install -g @ionic/cli`

### Instalación

```bash
# Clonar e instalar dependencias
cd gestor-proyectos
npm install

# Ejecutar en desarrollo
ionic serve

# Construir para producción
ionic build
```

### Compilación para Móviles

#### Android

```bash
# Sincronizar código
npx cap sync android

# Abrir en Android Studio
npx cap open android

# O construir APK directamente
npx cap run android
```

#### iOS

```bash
# Sincronizar código
npx cap sync ios

# Abrir en Xcode
npx cap open ios

# O construir para iOS
npx cap run ios
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── models/           # Interfaces TypeScript
│   │   ├── curso.ts
│   │   ├── estudiante.ts
│   │   ├── evaluacion.ts
│   │   └── ...
│   ├── services/         # Servicios de negocio
│   │   ├── storage.service.ts
│   │   ├── data.service.ts
│   │   ├── csv.service.ts
│   │   └── backup.service.ts
│   ├── pages/           # Páginas principales
│   │   ├── cursos/      # Gestión de estudiantes
│   │   ├── evaluacion/  # Sistema de evaluación
│   │   └── configuracion/
│   └── tabs/            # Navegación por pestañas
```

## 🎯 Funcionalidades Principales

### 1. Gestión de Cursos

- Tabla de estudiantes con calificaciones
- Filtros por curso y estado
- Cálculo automático: PG + PI = Σ
- Importación masiva via CSV

### 2. Sistema de Evaluación

- Evaluación basada en rúbricas
- Niveles: Iniciado (I), Avanzado (A), Experto (E)
- Guardado automático
- Historial de evaluaciones

### 3. Configuración

- Información de la aplicación
- Guías de uso
- Gestión de datos

## 📊 Formato de Datos

### CSV de Estudiantes

```csv
nombre,apellido,curso,pg,pi
Juan,Pérez,Matemáticas,8.5,7.2
María,González,Historia,9.0,8.8
```

### Estructura de Rúbricas

```typescript
interface RubricaDefinicion {
  id: string;
  nombre: string;
  descripcion: string;
  criterios: Criterio[];
}
```

## 🔧 Configuración

El archivo `capacitor.config.ts` contiene la configuración para las plataformas nativas:

```typescript
export default {
  appId: 'com.epm.gestorproyectos',
  appName: 'Gestor de Proyectos',
  webDir: 'www',
  bundledWebRuntime: false
};
```

## 📱 PWA Features

- **Instalación**: Puede instalarse como app nativa en el dispositivo
- **Offline**: Funciona sin conexión usando almacenamiento local
- **Responsive**: Adaptación automática a diferentes tamaños de pantalla

## 🤝 Desarrollo

### Scripts disponibles

```bash
npm start          # Servidor de desarrollo
npm run build      # Construcción de producción
npm run test       # Ejecutar tests
npm run lint       # Linter de código
```

### Para contribuir

1. Fork del repositorio
2. Crear rama de feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit de cambios: `git commit -am 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🎉 Estado del Proyecto

✅ **COMPLETADO** - Proyecto Ionic multiplataforma funcional

- ✅ Configuración inicial y PWA
- ✅ Modelos y servicios
- ✅ Interfaz de usuario completa
- ✅ Sistema de navegación
- ✅ Plataformas Android e iOS configuradas
- ✅ Aplicación construida y sincronizada

**¡Listo para compilar en Android e iOS!**
