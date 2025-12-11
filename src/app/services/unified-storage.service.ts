import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

/**
 * Servicio unificado de almacenamiento simplificado
 *
 * Usa directamente @ionic/storage-angular que maneja automáticamente:
 * - Web/Desktop: IndexedDB
 * - Mobile (iOS/Android): SQLite nativo
 *
 * Refactorización: Eliminadas 3 capas redundantes (DatabaseService, SQLiteService, StorageService)
 */
@Injectable({
  providedIn: 'root'
})
export class UnifiedStorageService {
  private storage = inject(Storage);
  private _storage: Storage | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

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
      console.log('🔌 [UnifiedStorageService] Inicializando @ionic/storage-angular...');
      this._storage = await this.storage.create();
      this.isInitialized = true;
      this.initializationPromise = null;

      const driver = await this._storage.driver;
      console.log(`✅ [UnifiedStorageService] Storage inicializado - Driver: ${driver}`);
      console.log('   📌 WEB: IndexedDB | MÓVIL: SQLite nativo');
    } catch (error) {
      console.error('❌ [UnifiedStorageService] Error en inicialización:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  async set(key: string, value: any): Promise<any> {
    await this.ensureInitialized();
    return this._storage?.set(key, value);
  }

  async get(key: string): Promise<any> {
    await this.ensureInitialized();
    return this._storage?.get(key);
  }

  async remove(key: string): Promise<any> {
    await this.ensureInitialized();
    return this._storage?.remove(key);
  }

  async clear(): Promise<any> {
    await this.ensureInitialized();
    return this._storage?.clear();
  }

  async keys(): Promise<string[]> {
    await this.ensureInitialized();
    const allKeys = await this._storage?.keys();
    return allKeys || [];
  }

  async length(): Promise<number> {
    await this.ensureInitialized();
    const len = await this._storage?.length();
    return len || 0;
  }

  getPlatformInfo(): { platform: string; storage: string } {
    return {
      platform: 'cross-platform',
      storage: '@ionic/storage-angular'
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }
}

