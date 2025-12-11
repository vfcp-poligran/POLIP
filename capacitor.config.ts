import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.poligran.gestorproyectos',
  appName: 'Gestor de Proyectos EPM',
  webDir: 'www/browser',
  // Forzar orientación landscape en móviles
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true  // Habilitado para desarrollo
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  }
};

export default config;
