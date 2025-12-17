import { isDevMode } from '@angular/core';

let verboseOverride = false;

function debugFlagEnabled(): boolean {
  if (typeof window !== 'undefined') {
    if ((window as any).__POLI_DEBUG__ === true) {
      return true;
    }
  }

  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('POLI_DEBUG') === '1';
  } catch {
    return false;
  }
}

function canLog(): boolean {
  return isDevMode() && (verboseOverride || debugFlagEnabled());
}

/**
 * Utilidad de logging que solo funciona cuando se habilita el modo de depuración.
 * En producción o cuando no se habilita la bandera, los logs informativos se silencian.
 */
export const Logger = {
  enableVerboseLogging(value: boolean): void {
    verboseOverride = value;
  },

  /**
   * Log informativo
   */
  log: (...args: unknown[]): void => {
    if (canLog()) {
      console.log(...args);
    }
  },

  /**
   * Log de advertencia
   */
  warn: (...args: unknown[]): void => {
    if (canLog()) {
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
   * Log de debug (solo cuando está habilitado)
   */
  debug: (...args: unknown[]): void => {
    if (canLog()) {
      console.debug(...args);
    }
  },

  /**
   * Log de grupo (para agrupar logs relacionados)
   */
  group: (label: string): void => {
    if (canLog()) {
      console.group(label);
    }
  },

  /**
   * Cerrar grupo de logs
   */
  groupEnd: (): void => {
    if (canLog()) {
      console.groupEnd();
    }
  },

  /**
   * Log de tiempo (para medir rendimiento)
   */
  time: (label: string): void => {
    if (canLog()) {
      console.time(label);
    }
  },

  /**
   * Finalizar medición de tiempo
   */
  timeEnd: (label: string): void => {
    if (canLog()) {
      console.timeEnd(label);
    }
  }
};
