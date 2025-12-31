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
     * Convierte data base64 a texto con soporte completo de caracteres especiales
     * Maneja correctamente caracteres acentuados (é, á, ñ, ü, etc.) y otros caracteres Unicode
     */
    decodeBase64ToText(base64: string): string {
        try {
            // Verificar si ya es texto plano (no base64)
            if (this.isPlainText(base64)) {
                // Aún así, limpiar posibles problemas de codificación
                return this.fixEncodingIssues(base64);
            }

            // Decodificar Base64 a bytes
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Intentar decodificar como UTF-8 primero
            let decoded = this.tryDecodeWithEncoding(bytes, 'utf-8');

            // Verificar si la decodificación produjo caracteres corruptos
            if (this.hasEncodingIssues(decoded)) {
                // Intentar con Windows-1252 (común en archivos Excel de Windows)
                const decodedLatin = this.tryDecodeWithEncoding(bytes, 'windows-1252');
                if (!this.hasEncodingIssues(decodedLatin)) {
                    console.log('[FilePickerService] Archivo detectado como Windows-1252, convertido a UTF-8');
                    decoded = decodedLatin;
                } else {
                    // Intentar con ISO-8859-1 (Latin-1)
                    const decodedIso = this.tryDecodeWithEncoding(bytes, 'iso-8859-1');
                    if (!this.hasEncodingIssues(decodedIso)) {
                        console.log('[FilePickerService] Archivo detectado como ISO-8859-1, convertido a UTF-8');
                        decoded = decodedIso;
                    }
                }
            }

            // Aplicar correcciones adicionales si aún hay problemas
            return this.fixEncodingIssues(decoded);
        } catch (error) {
            console.warn('[FilePickerService] Error decodificando base64:', error);
            // Si falla decodificación, intentar limpiar como texto plano
            return this.fixEncodingIssues(base64);
        }
    }

    /**
     * Intenta decodificar bytes con una codificación específica
     */
    private tryDecodeWithEncoding(bytes: Uint8Array, encoding: string): string {
        try {
            const decoder = new TextDecoder(encoding);
            return decoder.decode(bytes);
        } catch {
            return '';
        }
    }

    /**
     * Detecta si el texto tiene problemas de codificación comunes
     * (caracteres UTF-8 mal interpretados)
     */
    private hasEncodingIssues(text: string): boolean {
        // Patrones comunes de UTF-8 mal decodificado
        const corruptPatterns = [
            /Ã¡/,  // á mal decodificado
            /Ã©/,  // é mal decodificado  
            /Ã­/,  // í mal decodificado
            /Ã³/,  // ó mal decodificado
            /Ãº/,  // ú mal decodificado
            /Ã±/,  // ñ mal decodificado
            /Ã¼/,  // ü mal decodificado
            /Â°/,  // ° mal decodificado
            /Ã‰/,  // É mal decodificado
            /Ã'/,  // Ñ mal decodificado
            /â€/,  // Comillas tipográficas mal decodificadas
            /\ufffd/  // Carácter de reemplazo Unicode
        ];

        return corruptPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Corrige problemas de codificación conocidos
     * Mapea secuencias UTF-8 mal interpretadas a los caracteres correctos
     */
    private fixEncodingIssues(text: string): string {
        // Mapa de correcciones: UTF-8 mal interpretado -> carácter correcto
        const fixes: [RegExp, string][] = [
            // Vocales acentuadas minúsculas
            [/Ã¡/g, 'á'],
            [/Ã©/g, 'é'],
            [/Ã­/g, 'í'],
            [/Ã³/g, 'ó'],
            [/Ãº/g, 'ú'],
            // Vocales acentuadas mayúsculas
            [/Ã/g, 'Á'],
            [/Ã‰/g, 'É'],
            [/Ã/g, 'Í'],
            [/Ã"/g, 'Ó'],
            [/Ãš/g, 'Ú'],
            // Ñ y ñ
            [/Ã±/g, 'ñ'],
            [/Ã'/g, 'Ñ'],
            // Diéresis
            [/Ã¼/g, 'ü'],
            [/Ãœ/g, 'Ü'],
            // Otros caracteres especiales
            [/Â°/g, '°'],
            [/Â¿/g, '¿'],
            [/Â¡/g, '¡'],
            // Comillas tipográficas
            [/â€œ/g, '"'],
            [/â€/g, '"'],
            [/â€™/g, "'"],
            [/â€˜/g, "'"],
            // Guiones
            [/â€"/g, '–'],
            [/â€"/g, '—'],
            // Euro y otros
            [/â‚¬/g, '€'],
        ];

        let fixed = text;
        for (const [pattern, replacement] of fixes) {
            fixed = fixed.replace(pattern, replacement);
        }

        return fixed;
    }

    /**
     * Verifica si el contenido parece ser texto plano (no Base64)
     */
    private isPlainText(content: string): boolean {
        // Base64 válido solo contiene estos caracteres: A-Z, a-z, 0-9, +, /, =
        // Si tiene otros caracteres comunes de CSV/JSON, es texto plano
        const hasNonBase64 = /[;:{}[\]\n\r]/.test(content);
        const hasNewlines = content.includes('\n') || content.includes('\r');
        const startsWithHeader = /^(Student|ID|Nombre|")/i.test(content.trim());

        return hasNonBase64 || hasNewlines || startsWithHeader;
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
     * Lee un archivo File (desde input HTML) con soporte multi-codificación
     * Intenta detectar y corregir problemas de codificación automáticamente
     */
    async readFileFromInput(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                let content = e.target?.result as string || '';

                // Verificar si hay problemas de codificación
                if (this.hasEncodingIssues(content)) {
                    console.log('[FilePickerService] Detectados problemas de codificación en archivo web, intentando alternativas...');

                    // Intentar leer con ArrayBuffer para probar otras codificaciones
                    try {
                        const alternativeContent = await this.readWithAlternativeEncoding(file);
                        if (alternativeContent && !this.hasEncodingIssues(alternativeContent)) {
                            content = alternativeContent;
                        } else {
                            // Aplicar correcciones manuales
                            content = this.fixEncodingIssues(content);
                        }
                    } catch {
                        // Si falla, aplicar correcciones manuales
                        content = this.fixEncodingIssues(content);
                    }
                }

                resolve(content);
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Intenta leer el archivo con codificaciones alternativas (Windows-1252, ISO-8859-1)
     */
    private async readWithAlternativeEncoding(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) {
                    reject(new Error('No se pudo leer el archivo'));
                    return;
                }

                const bytes = new Uint8Array(arrayBuffer);

                // Probar Windows-1252 (común en Excel/Windows)
                let decoded = this.tryDecodeWithEncoding(bytes, 'windows-1252');
                if (decoded && !this.hasEncodingIssues(decoded)) {
                    console.log('[FilePickerService] Archivo web detectado como Windows-1252');
                    resolve(decoded);
                    return;
                }

                // Probar ISO-8859-1
                decoded = this.tryDecodeWithEncoding(bytes, 'iso-8859-1');
                if (decoded && !this.hasEncodingIssues(decoded)) {
                    console.log('[FilePickerService] Archivo web detectado como ISO-8859-1');
                    resolve(decoded);
                    return;
                }

                // Si nada funciona, devolver vacío
                resolve('');
            };

            reader.onerror = () => {
                reject(new Error('Error al leer archivo con codificación alternativa'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Obtiene los MIME types soportados (para uso en template HTML)
     */
    getSupportedMimeTypes(): string {
        return [...this.SUPPORTED_TYPES, '*/*'].join(',');
    }
}
