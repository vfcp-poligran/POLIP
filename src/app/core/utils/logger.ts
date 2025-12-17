import { isDevMode } from '@angular/core';

/**
 * Utilidad de logging que solo funciona en modo desarrollo.
 * En producción, todos los logs son silenciosos.
 */
export const Logger = {
  /**
   * Log informativo
   */
  log: (...args: unknown[]): void => {
    if (isDevMode()) {
      console.log(...args);
    }
  },

  /**
   * Log de advertencia
   */
  warn: (...args: unknown[]): void => {
    if (isDevMode()) {
      console.warn(...args);
    }
  },

  /**
   * Log de error (siempre se muestra, incluso en producción)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Log de debug (solo desarrollo)
   */
  debug: (...args: unknown[]): void => {
    if (isDevMode()) {
      console.debug(...args);
    }
  },

  /**
   * Log de grupo (para agrupar logs relacionados)
   */
  group: (label: string): void => {
    if (isDevMode()) {
      console.group(label);
    }
  },

  /**
   * Cerrar grupo de logs
   */
  groupEnd: (): void => {
    if (isDevMode()) {
      console.groupEnd();
    }
  },

  /**
   * Log de tiempo (para medir rendimiento)
   */
  time: (label: string): void => {
    if (isDevMode()) {
      console.time(label);
    }
  },

  /**
   * Finalizar medición de tiempo
   */
  timeEnd: (label: string): void => {
    if (isDevMode()) {
      console.timeEnd(label);
    }
  }
};
