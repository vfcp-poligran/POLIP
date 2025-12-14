# 📱 Resumen de Compilación PWA y APK

**Fecha:** 14 de diciembre de 2025  
**Versión:** 7.0.0

---

## ✅ Mejoras Implementadas

### 1. Configuración PWA Optimizada

#### `ngsw-config.json`

- Añadido `updateMode: "prefetch"` para assets de app
- Configurado caché de datos con grupos:
  - `api-cache`: Estrategia freshness, TTL 1 día
  - `app-data`: Estrategia performance, TTL 7 días
- Añadido soporte para archivos `.ico`
- Configurado `navigationUrls` para SPA routing

#### `manifest.webmanifest`

- Añadido `description` para SEO
- Cambiado `display: "fullscreen"` → `"standalone"` (mejor UX)
- Añadido `id` único de aplicación
- Añadido `categories`, `lang`, `dir`
- Añadido `prefer_related_applications: false`

#### `index.html`

- Meta tags PWA optimizados:
  - `theme-color`
  - `mobile-web-app-capable`
  - `application-name`
  - `description`
- Meta tag `apple-mobile-web-app-title`
- Viewport optimizado con `maximum-scale=5.0`
- Preconnect a CDN para optimización de carga
- Mensaje noscript en español

### 2. Configuración Capacitor Mejorada

#### `capacitor.config.ts`

- Configuración `server` con esquemas HTTPS
- Android:
  - `minWebViewVersion: 60`
  - `backgroundColor` consistente con tema
  - User Agent personalizado
  - `webContentsDebuggingEnabled: false` (producción)
- iOS:
  - `preferredContentMode: "mobile"`
  - `scrollEnabled: true`
- Plugins configurados:
  - **SplashScreen**: Duración 2s, color tema, inmersivo
  - **StatusBar**: Estilo dark, color tema
  - **Keyboard**: Resize body

### 3. Configuración Android Optimizada

#### `build.gradle` (app)

- `versionCode: 7`, `versionName: "7.0.0"`
- Release build:
  - `minifyEnabled true`
  - `shrinkResources true`
  - ProGuard optimizado
- `compileOptions` Java 17

#### `proguard-rules.pro`

- Reglas para Capacitor
- Reglas para SQLCipher
- Reglas para WebView JavaScript
- Reglas para Tink/Crypto (missing classes fix)
- Atributos de anotación preservados

---

## 📦 Artefactos Generados

### APKs

| Archivo | Tamaño | Ubicación |
|---------|--------|-----------|
| `GestorProyectosEPM-debug-v7.0.0.apk` | 24.75 MB | `dist/` |
| `GestorProyectosEPM-release-v7.0.0-unsigned.apk` | 20.73 MB | `dist/` |

### PWA Build

| Carpeta | Descripción |
|---------|-------------|
| `www/browser/` | Assets optimizados para producción |
| Service Worker | Configurado con Angular PWA |

---

## 🚀 Comandos de Despliegue

### PWA (Web)

```bash
npm run build:prod
# Servir desde www/browser/
```

### Android Debug

```bash
npm run android:sync
cd android && ./gradlew assembleDebug
# APK en: android/app/build/outputs/apk/debug/
```

### Android Release (sin firmar)

```bash
npm run android:sync
cd android && ./gradlew assembleRelease
# APK en: android/app/build/outputs/apk/release/
```

### Firmar APK Release

```bash
# 1. Generar keystore (solo una vez)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias

# 2. Firmar APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.jks app-release-unsigned.apk my-alias

# 3. Alinear APK
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

---

## 📋 Plugins Capacitor Incluidos

1. **@capacitor-community/sqlite** - SQLite local
2. **@capacitor/app** - Lifecycle de app
3. **@capacitor/filesystem** - Sistema de archivos
4. **@capacitor/haptics** - Feedback táctil
5. **@capacitor/keyboard** - Control de teclado
6. **@capacitor/status-bar** - Barra de estado

---

## 🔧 Requisitos de Entorno

- **Node.js**: 18+
- **Angular**: 20.x
- **Ionic**: 8.x
- **JDK**: 17 o 21
- **Android SDK**: API 35 (compileSdk)
- **Min Android**: API 23 (Android 6.0)

---

## 📝 Notas

1. El APK de release está **sin firmar** - requiere firma antes de publicar en Play Store
2. El PWA requiere HTTPS para funcionalidad completa del Service Worker
3. Para desarrollo local, el Service Worker está deshabilitado (`isDevMode()`)
