import { Injectable, OnDestroy, signal } from '@angular/core';
import { Logger } from '@app/core/utils/logger';

/**
 * CacheService
 * 
 * Servicio especializado para gestión de caché.
 * Responsabilidades:
 * - Caché de archivos Canvas con TTL
 * - Limpieza automática de cachés expirados
 * - Invalidación manual de caché
 * - Métricas de uso de caché
 */
@Injectable({
    providedIn: 'root'
})
export class CacheService implements OnDestroy {
    // Configuración de caché
    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
    private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minuto

    // Almacenamiento de caché
    private canvasFilesCache = signal<Map<string, CacheEntry>>(new Map());
    private cleanupIntervalId?: number;

    constructor() {
        this.startCacheCleanup();
    }

    ngOnDestroy(): void {
        this.stopCacheCleanup();
    }

    /**
     * Inicia la limpieza automática de cachés expirados
     */
    private startCacheCleanup(): void {
        this.cleanupIntervalId = window.setInterval(() => {
            this.cleanExpiredCaches();
        }, this.CLEANUP_INTERVAL);

        Logger.log('🧹 [CacheService] Limpieza automática iniciada');
    }

    /**
     * Detiene la limpieza automática
     */
    private stopCacheCleanup(): void {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            Logger.log('🛑 [CacheService] Limpieza automática detenida');
        }
    }

    /**
     * Limpia todas las entradas de caché expiradas
     */
    private cleanExpiredCaches(): void {
        const now = Date.now();
        const cache = this.canvasFilesCache();
        let removidos = 0;

        cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                cache.delete(key);
                removidos++;
            }
        });

        if (removidos > 0) {
            this.canvasFilesCache.set(new Map(cache));
            Logger.log(`🧹 [CacheService] Limpiados ${removidos} archivos expirados`);
        }
    }

    /**
     * Obtiene un archivo del caché
     * @param key Clave del archivo en caché
     * @returns Contenido del archivo o null si no existe o expiró
     */
    get(key: string): string | null {
        const cache = this.canvasFilesCache();
        const entry = cache.get(key);

        if (!entry) {
            return null;
        }

        // Verificar si expiró
        if (Date.now() > entry.expiresAt) {
            cache.delete(key);
            this.canvasFilesCache.set(new Map(cache));
            Logger.log(`⏰ [CacheService] Caché expirado: ${key}`);
            return null;
        }

        Logger.log(`✅ [CacheService] Cache hit: ${key}`);
        return entry.content;
    }

    /**
     * Guarda un archivo en caché
     * @param key Clave del archivo
     * @param content Contenido del archivo
     * @param ttl Tiempo de vida en milisegundos (opcional)
     */
    set(key: string, content: string, ttl: number = this.DEFAULT_TTL): void {
        const cache = this.canvasFilesCache();

        cache.set(key, {
            content,
            expiresAt: Date.now() + ttl,
            createdAt: Date.now()
        });

        this.canvasFilesCache.set(new Map(cache));
        Logger.log(`💾 [CacheService] Archivo cacheado: ${key} (TTL: ${ttl}ms)`);
    }

    /**
     * Invalida (elimina) una entrada específica del caché
     * @param key Clave del archivo a invalidar
     */
    invalidate(key: string): void {
        const cache = this.canvasFilesCache();

        if (cache.has(key)) {
            cache.delete(key);
            this.canvasFilesCache.set(new Map(cache));
            Logger.log(`🗑️ [CacheService] Caché invalidado: ${key}`);
        }
    }

    /**
     * Limpia todo el caché
     */
    clearAll(): void {
        const size = this.canvasFilesCache().size;
        this.canvasFilesCache.set(new Map());
        Logger.log(`🗑️ [CacheService] Caché limpiado completamente (${size} entradas)`);
    }

    /**
     * Invalida todos los archivos de un curso específico
     * @param codigoCurso Código del curso
     */
    invalidateCourse(codigoCurso: string): void {
        const cache = this.canvasFilesCache();
        let removidos = 0;

        cache.forEach((_, key) => {
            if (key.includes(codigoCurso)) {
                cache.delete(key);
                removidos++;
            }
        });

        if (removidos > 0) {
            this.canvasFilesCache.set(new Map(cache));
            Logger.log(`🗑️ [CacheService] ${removidos} archivos del curso ${codigoCurso} invalidados`);
        }
    }

    /**
     * Obtiene estadísticas del caché
     * @returns Métricas de uso del caché
     */
    getStats(): CacheStats {
        const cache = this.canvasFilesCache();
        const now = Date.now();
        let expired = 0;

        cache.forEach(entry => {
            if (now > entry.expiresAt) {
                expired++;
            }
        });

        return {
            totalEntries: cache.size,
            activeEntries: cache.size - expired,
            expiredEntries: expired
        };
    }
}

/**
 * Entrada de caché con metadata
 */
interface CacheEntry {
    content: string;
    expiresAt: number;
    createdAt: number;
}

/**
 * Estadísticas del caché
 */
interface CacheStats {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
}
