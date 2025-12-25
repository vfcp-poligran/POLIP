import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { Logger } from '../utils/logger';

/**
 * Global Error Handler
 * Captura y maneja todos los errores no controlados en la aplicación
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private toastService = inject(ToastService);

    handleError(error: Error | any): void {
        // Log del error completo en consola (solo en desarrollo)
        Logger.error('❌ [GlobalErrorHandler] Error capturado:', error);

        // Extraer mensaje user-friendly
        const userMessage = this.getUserFriendlyMessage(error);

        // Mostrar mensaje al usuario
        if (userMessage) {
            this.toastService.error(userMessage);
        }

        // TODO: Enviar a servicio de telemetría (Sentry, LogRocket, etc.)
        // this.sendToTelemetry(error);
    }

    /**
     * Extrae un mensaje amigable para el usuario del error
     */
    private getUserFriendlyMessage(error: any): string {
        // Errores HTTP
        if (error?.status) {
            switch (error.status) {
                case 0:
                    return 'Sin conexión a internet. Verifica tu conexión.';
                case 400:
                    return 'Solicitud inválida. Verifica los datos ingresados.';
                case 401:
                    return 'No autorizado. Por favor, inicia sesión nuevamente.';
                case 403:
                    return 'No tienes permisos para realizar esta acción.';
                case 404:
                    return 'Recurso no encontrado.';
                case 500:
                    return 'Error del servidor. Intenta nuevamente más tarde.';
                case 503:
                    return 'Servicio no disponible. Intenta más tarde.';
                default:
                    return `Error de conexión (${error.status})`;
            }
        }

        // Errores de validación personalizada
        if (error?.message && error.message.includes('❌')) {
            // Los mensajes que ya tienen ❌ son user-friendly
            return error.message.replace('❌', '').trim();
        }

        // Errores de Angular
        if (error?.rejection) {
            return this.getUserFriendlyMessage(error.rejection);
        }

        // Errores de almacenamiento
        if (error?.message?.includes('storage') || error?.message?.includes('quota')) {
            return 'Espacio de almacenamiento insuficiente. Libera espacio en tu dispositivo.';
        }

        // Error genérico
        if (error?.message) {
            return `Error inesperado: ${error.message}`;
        }

        return 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente.';
    }

    /**
     * TODO: Enviar error a servicio de telemetría
     * Útil para monitoreo en producción
     */
    private sendToTelemetry(error: any): void {
        // Ejemplo con Sentry:
        // Sentry.captureException(error);

        // Ejemplo con LogRocket:
        // LogRocket.captureException(error);

        // Por ahora solo logueamos
        Logger.log('📊 [Telemetry] Error registrado para monitoreo');
    }
}
