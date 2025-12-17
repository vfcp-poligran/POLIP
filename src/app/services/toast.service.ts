import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { DataService } from './data.service';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  showCloseButton?: boolean;
  /** Si es true, ignora la preferencia del usuario y siempre muestra el toast */
  forceShow?: boolean;
  /** Color personalizado (usa type para colores estándar) */
  color?: string;
}

/**
 * ToastService - Servicio centralizado para mostrar notificaciones toast
 * Respeta la preferencia del usuario para habilitar/deshabilitar mensajes emergentes
 * Utiliza los estilos del UI Design System
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastController = inject(ToastController);
  private dataService = inject(DataService);

  private readonly ICONS: Record<ToastType, string> = {
    success: 'checkmark-circle',
    error: 'close-circle',
    warning: 'warning',
    info: 'information-circle'
  };

  private readonly COLORS: Record<ToastType, string> = {
    success: 'success',
    error: 'danger',
    warning: 'warning',
    info: 'primary'
  };

  /**
   * Verifica si los mensajes emergentes están habilitados
   */
  isEnabled(): boolean {
    return this.dataService.isMensajesEmergentesEnabled();
  }

  /**
   * Obtiene la duración configurada por el usuario en milisegundos
   */
  private getConfiguredDuration(): number {
    const uiState = this.dataService.getUIState();
    const segundos = uiState.duracionToast ?? 2; // Por defecto 2 segundos
    return segundos * 1000;
  }

  /**
   * Muestra una notificación toast (respeta la preferencia del usuario)
   */
  async show(options: ToastOptions): Promise<void> {
    // Si no está habilitado y no es forzado, no mostrar
    if (!options.forceShow && !this.isEnabled()) {
      return;
    }

    // Usar duración configurada si no se especifica una
    const configuredDuration = this.getConfiguredDuration();

    const {
      message,
      title,
      type = 'info',
      duration = configuredDuration,
      position = 'middle', // Centrado por defecto
      showCloseButton = true,
      color
    } = options;

    const toast = await this.toastController.create({
      header: title,
      message,
      duration,
      position,
      color: color || this.COLORS[type],
      icon: this.ICONS[type],
      cssClass: `ui-toast--${type}`,
      buttons: showCloseButton
        ? [{ icon: 'close', role: 'cancel' }]
        : []
    });

    await toast.present();
  }

  /**
   * Muestra un toast de éxito
   */
  success(message: string, title?: string, duration?: number, forceShow = false): Promise<void> {
    return this.show({ message, title, type: 'success', duration, forceShow });
  }

  /**
   * Muestra un toast de error (siempre se muestra por defecto - errores son críticos)
   */
  error(message: string, title?: string, duration?: number, forceShow = true): Promise<void> {
    return this.show({ message, title, type: 'error', duration, forceShow });
  }

  /**
   * Muestra un toast de advertencia
   */
  warning(message: string, title?: string, duration?: number, forceShow = false): Promise<void> {
    return this.show({ message, title, type: 'warning', duration, forceShow });
  }

  /**
   * Muestra un toast informativo
   */
  info(message: string, title?: string, duration?: number, forceShow = false): Promise<void> {
    return this.show({ message, title, type: 'info', duration, forceShow });
  }
}
