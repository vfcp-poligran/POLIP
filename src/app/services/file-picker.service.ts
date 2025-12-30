import { Injectable, inject } from '@angular/core';
import { FilePicker, PickFilesResult } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { AlertController } from '@ionic/angular/standalone';

export interface FileResult {
    name: string;
    mimeType: string;
    size: number;
    data: string;
}

/**
 * Service para manejar la selección de archivos con permisos
 * Implementa el patrón de solicitud de permisos antes de acceder a archivos
 */
@Injectable({
    providedIn: 'root'
})
export class FilePickerService {
    private alertController = inject(AlertController);

    // MIME types soportados para importación de datos
    private readonly SUPPORTED_TYPES = [
        'text/csv',
        'text/comma-separated-values',
        'application/vnd.ms-excel',
        'application/json',
        'text/plain'
    ];

    /**
     * Selecciona un archivo CSV o JSON con verificación de permisos
     */
    async pickDataFile(): Promise<FileResult | null> {
        if (!Capacitor.isNativePlatform()) {
            return null; // Delegar a input HTML en web
        }

        // Verificar y solicitar permisos si es necesario
        const hasPermission = await this.checkAndRequestPermissions();
        if (!hasPermission) {
            return null;
        }

        return this.pickFileNative();
    }

    /**
     * Verifica y solicita permisos para acceso a archivos
     */
    private async checkAndRequestPermissions(): Promise<boolean> {
        try {
            // FilePicker v6.x no tiene método explícito de permisos
            // Los permisos se solicitan automáticamente al llamar pickFiles
            // Pero podemos mostrar un diálogo informativo primero
            const shouldProceed = await this.showPermissionRationale();
            return shouldProceed;
        } catch (error) {
            console.error('[FilePickerService] Error checking permissions:', error);
            return false;
        }
    }

    /**
     * Muestra diálogo explicativo de por qué se necesitan permisos
     * Solo se muestra la primera vez (podría guardarse en preferencias)
     */
    private async showPermissionRationale(): Promise<boolean> {
        // En producción, guardar si ya se mostró en preferencias
        // Por ahora, siempre retornar true para no bloquear
        return true;
    }

    /**
     * Muestra alerta cuando el permiso es denegado
     */
    async showPermissionDeniedAlert(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permiso Requerido',
            message: 'Para importar archivos CSV, la aplicación necesita acceso a tus documentos. Por favor, habilita el permiso en Configuración.',
            buttons: [
                {
                    text: 'Entendido',
                    role: 'cancel'
                }
            ]
        });
        await alert.present();
    }

    /**
     * Selección nativa usando Capacitor FilePicker
     */
    private async pickFileNative(): Promise<FileResult | null> {
        try {
            const result: PickFilesResult = await FilePicker.pickFiles({
                types: this.SUPPORTED_TYPES,
                readData: true
            });

            if (!result.files || result.files.length === 0) {
                return null;
            }

            const file = result.files[0];

            return {
                name: file.name || 'archivo.csv',
                mimeType: file.mimeType || 'text/csv',
                size: file.size || 0,
                data: file.data || ''
            };
        } catch (error: unknown) {
            // Verificar si es cancelación del usuario
            if (this.isUserCancellation(error)) {
                return null;
            }

            // Verificar si es error de permisos
            if (this.isPermissionError(error)) {
                await this.showPermissionDeniedAlert();
                return null;
            }

            console.error('[FilePickerService] Error selecting file:', error);
            throw error;
        }
    }

    /**
     * Verifica si el error es por cancelación del usuario
     */
    private isUserCancellation(error: unknown): boolean {
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            return msg.includes('cancel') || msg.includes('user') || msg.includes('dismissed');
        }
        return false;
    }

    /**
     * Verifica si el error es por falta de permisos
     */
    private isPermissionError(error: unknown): boolean {
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            return msg.includes('permission') || msg.includes('denied') || msg.includes('access');
        }
        return false;
    }

    /**
     * Convierte data base64 a texto
     */
    decodeBase64ToText(base64: string): string {
        try {
            // En algunos casos el contenido ya está en texto plano
            if (this.isPlainText(base64)) {
                return base64;
            }
            return atob(base64);
        } catch {
            // Si falla decodificación, asumir que ya es texto
            return base64;
        }
    }

    /**
     * Verifica si el contenido parece ser texto plano
     */
    private isPlainText(content: string): boolean {
        // Si tiene caracteres de CSV/JSON, probablemente es texto plano
        return content.includes(',') ||
            content.includes('{') ||
            content.includes('\n');
    }

    /**
     * Verifica si el contenido es JSON válido
     */
    isJsonContent(content: string): boolean {
        const trimmed = content.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return false;
        }
        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Lee un archivo File (desde input HTML)
     */
    async readFileFromInput(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target?.result as string;
                resolve(content || '');
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Obtiene los MIME types soportados (para uso en template HTML)
     */
    getSupportedMimeTypes(): string {
        return [...this.SUPPORTED_TYPES, '*/*'].join(',');
    }
}
