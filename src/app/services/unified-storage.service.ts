import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Logger } from '@app/core/utils/logger';

/**
 * Servicio unificado de almacenamiento simplificado
 *
 * Usa directamente @ionic/storage-angular que maneja automáticamente:
 * - Web/Desktop: IndexedDB
 * - Mobile (iOS/Android): SQLite nativo
 *
 * Características:
 * - Tipado genérico para type-safety
 * - Caché en memoria para operaciones frecuentes
 * - Logs silenciosos en producción
 *
 * Refactorización: Eliminadas 3 capas redundantes (DatabaseService, SQLiteService, StorageService)
 */
@Injectable({
  providedIn: 'root'
})
export class UnifiedStorageService {
  private storage = inject(Storage);
  private _storage: Storage | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /** Caché en memoria para operaciones frecuentes */
  private memoryCache = new Map<string, { value: unknown; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 segundos

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      Logger.log('🔌 [UnifiedStorageService] Inicializando @ionic/storage-angular...');
      this._storage = await this.storage.create();
      this.isInitialized = true;
      this.initializationPromise = null;

      const driver = await this._storage.driver;
      Logger.log(`✅ [UnifiedStorageService] Storage inicializado - Driver: ${driver}`);
      Logger.log('   📌 WEB: IndexedDB | MÓVIL: SQLite nativo');
    } catch (error) {
      Logger.error('❌ [UnifiedStorageService] Error en inicialización:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Guarda un valor con tipado genérico
   */
  async set<T>(key: string, value: T): Promise<T | undefined> {
    await this.ensureInitialized();
    this.memoryCache.set(key, { value, timestamp: Date.now() });
    return this._storage?.set(key, value);
  }

  /**
   * Obtiene un valor con tipado genérico y caché opcional
   */
  async get<T>(key: string, useCache = true): Promise<T | null> {
    await this.ensureInitialized();

    // Verificar caché en memoria
    if (useCache) {
      const cached = this.memoryCache.get(key);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        return cached.value as T;
      }
    }

    const value = await this._storage?.get(key);
    if (value !== null && value !== undefined) {
      this.memoryCache.set(key, { value, timestamp: Date.now() });
    }
    return value ?? null;
  }

  /**
   * Elimina un valor y su caché
   */
  async remove(key: string): Promise<void> {
    await this.ensureInitialized();
    this.memoryCache.delete(key);
    await this._storage?.remove(key);
  }

  /**
   * Limpia todo el almacenamiento y caché
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.memoryCache.clear();
    await this._storage?.clear();
  }

  /**
   * Invalida la caché de una clave específica
   */
  invalidateCache(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Invalida toda la caché en memoria
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  async keys(): Promise<string[]> {
    await this.ensureInitialized();
    return (await this._storage?.keys()) ?? [];
  }

  async length(): Promise<number> {
    await this.ensureInitialized();
    return (await this._storage?.length()) ?? 0;
  }

  /**
   * Verifica si existe una clave
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  getPlatformInfo(): { platform: string; storage: string; cacheSize: number } {
    return {
      platform: 'cross-platform',
      storage: '@ionic/storage-angular',
      cacheSize: this.memoryCache.size
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

