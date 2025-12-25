import { Injectable } from '@angular/core';
import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, mergeMap } from 'rxjs/operators';
import { Logger } from '@app/core/utils/logger';

/**
 * HTTP Error Interceptor
 * Intercepta errores HTTP y aplica retry logic
 */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

    // Configuración de reintentos
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 1000; // 1 segundo

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            // Retry automático para errores específicos
            retry({
                count: this.shouldRetry(request) ? this.MAX_RETRIES : 0,
                delay: (error, retryCount) => {
                    // Solo reintentar en errores de red o 5xx
                    if (this.isRetryableError(error)) {
                        const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1); // Exponential backoff
                        Logger.warn(`⚠️ [HttpInterceptor] Reintento ${retryCount}/${this.MAX_RETRIES} en ${delay}ms`);
                        return timer(delay);
                    }
                    // Si no es retriable, lanzar error inmediatamente
                    throw error;
                }
            }),

            // Manejo de errores después de reintentos
            catchError((error: HttpErrorResponse) => {
                this.logError(error, request);
                return throwError(() => error);
            })
        );
    }

    /**
     * Determina si el error es candidato para reintentos
     */
    private isRetryableError(error: any): boolean {
        if (!(error instanceof HttpErrorResponse)) {
            return false;
        }

        // No reintentar errores del cliente (4xx)
        if (error.status >= 400 && error.status < 500) {
            return false;
        }

        // Reintentar errores de red (0) y servidor (5xx)
        return error.status === 0 || error.status >= 500;
    }

    /**
     * Determina si la solicitud debe tener reintentos automáticos
     */
    private shouldRetry(request: HttpRequest<any>): boolean {
        // Solo GET y HEAD son idempotentes y seguros para reintentar
        return request.method === 'GET' || request.method === 'HEAD';
    }

    /**
     * Loguea el error con contexto
     */
    private logError(error: HttpErrorResponse, request: HttpRequest<any>): void {
        const errorDetails = {
            url: request.url,
            method: request.method,
            status: error.status,
            statusText: error.statusText,
            message: error.message
        };

        if (error.status === 0) {
            Logger.error('❌ [HttpInterceptor] Error de red - sin conexión', errorDetails);
        } else {
            Logger.error(`❌ [HttpInterceptor] Error HTTP ${error.status}`, errorDetails);
        }
    }
}
