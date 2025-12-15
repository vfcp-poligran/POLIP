import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  position?: 'top' | 'middle' | 'bottom';
  showCloseButton?: boolean;
}

/**
 * ToastService - Servicio para mostrar notificaciones toast
 * Utiliza los estilos del UI Design System
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastController = inject(ToastController);

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
   * Muestra una notificación toast
   */
  async show(options: ToastOptions): Promise<void> {
    const {
      message,
      title,
      type = 'info',
      duration = 3000,
      position = 'top',
      showCloseButton = true
    } = options;

    const toast = await this.toastController.create({
      header: title,
      message,
      duration,
      position,
      color: this.COLORS[type],
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
  success(message: string, title?: string, duration = 3000): Promise<void> {
    return this.show({ message, title, type: 'success', duration });
  }

  /**
   * Muestra un toast de error
   */
  error(message: string, title?: string, duration = 4000): Promise<void> {
    return this.show({ message, title, type: 'error', duration });
  }

  /**
   * Muestra un toast de advertencia
   */
  warning(message: string, title?: string, duration = 3500): Promise<void> {
    return this.show({ message, title, type: 'warning', duration });
  }

  /**
   * Muestra un toast informativo
   */
  info(message: string, title?: string, duration = 3000): Promise<void> {
    return this.show({ message, title, type: 'info', duration });
  }
}
