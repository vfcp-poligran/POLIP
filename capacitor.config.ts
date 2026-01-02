import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.poligran.gestorproyectos',
  appName: 'TEOv4',
  webDir: 'www/browser',
  // Configuración del servidor para desarrollo
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'localhost'
  },
  // Configuración Android optimizada según mejores prácticas
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,  // Habilitado para debugging
    minWebViewVersion: 60,
    backgroundColor: '#0f385a',
    overrideUserAgent: 'GestorProyectosEPM-Android'
  },
  // Configuración iOS optimizada
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#0f385a',
    preferredContentMode: 'mobile',
    scrollEnabled: true
  },
  // Plugins de Capacitor
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f385a'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
