import { Injectable, signal, computed, inject } from '@angular/core';
import {
    Novedad,
    TipoNovedad,
    EstadoNovedad,
    OrigenMensaje,
    SyncQueueItem,
    NovedadStats,
    TIPOS_NOVEDAD_DEFAULT
} from '../models/novedad.model';
import { UnifiedStorageService } from './unified-storage.service';

/**
 * NovedadService - Servicio para gestión de novedades de estudiantes
 * 
 * Características:
 * - CRUD de novedades con persistencia
 * - Tipos de novedad personalizables
 * - Soporte offline con cola de sincronización
 * - Signals para reactividad
 */
@Injectable({
    providedIn: 'root'
})
export class NovedadService {
    private storageService = inject(UnifiedStorageService);

    // === SIGNALS ===
    private _novedades = signal<Novedad[]>([]);
    private _tiposNovedad = signal<TipoNovedad[]>([]);
    private _syncQueue = signal<SyncQueueItem[]>([]);
    private _isOnline = signal<boolean>(navigator.onLine);

    // === COMPUTED SIGNALS ===
    public novedades = this._novedades.asReadonly();
    public tiposNovedad = this._tiposNovedad.asReadonly();
    public syncQueue = this._syncQueue.asReadonly();
    public isOnline = this._isOnline.asReadonly();

    // Novedades activas (no archivadas)
    public novedadesActivas = computed(() =>
        this._novedades().filter(n => !n.archivado)
    );

    // Novedades archivadas (pestaña separada)
    public novedadesArchivadas = computed(() =>
        this._novedades().filter(n => n.archivado === true)
    );

    public novedadesPendientes = computed(() =>
        this._novedades().filter(n => n.estado === 'en_revision')
    );

    public pendientesCount = computed(() =>
        this.novedadesPendientes().length
    );

    public tiposActivos = computed(() =>
        this._tiposNovedad().filter(t => t.activo).sort((a, b) => b.frecuenciaUso - a.frecuenciaUso)
    );

    constructor() {
        this.initializeService();
        this.setupOnlineListener();
    }

    // === INICIALIZACIÓN ===

    private async initializeService(): Promise<void> {
        await this.loadFromStorage();
        await this.initializeTiposDefault();
    }

    private async loadFromStorage(): Promise<void> {
        try {
            const novedades = await this.storageService.get<Novedad[]>('novedades');
            const tipos = await this.storageService.get<TipoNovedad[]>('tipos_novedad');
            const queue = await this.storageService.get<SyncQueueItem[]>('sync_queue');

            if (novedades) this._novedades.set(novedades);
            if (tipos) this._tiposNovedad.set(tipos);
            if (queue) this._syncQueue.set(queue);
        } catch (error) {
            console.error('[NovedadService] Error loading from storage:', error);
        }
    }

    private async initializeTiposDefault(): Promise<void> {
        // Forzar actualización de tipos si los existentes no coinciden con los nuevos requeridos
        const tiposActuales = this._tiposNovedad();
        if (tiposActuales.length === 0 || !tiposActuales.some(t => t.nombre === 'Incumplimiento de aportes')) {
            const tiposDefault: TipoNovedad[] = TIPOS_NOVEDAD_DEFAULT.map((tipo, index) => ({
                ...tipo,
                id: `tipo_${index}_${Date.now()}`,
                fechaCreacion: new Date()
            }));
            this._tiposNovedad.set(tiposDefault);
            await this.saveToStorage();
        }
    }

    private setupOnlineListener(): void {
        window.addEventListener('online', () => {
            this._isOnline.set(true);
            this.processSyncQueue();
        });
        window.addEventListener('offline', () => {
            this._isOnline.set(false);
        });
    }

    // === PERSISTENCIA ===

    private async saveToStorage(): Promise<void> {
        try {
            await this.storageService.set('novedades', this._novedades());
            await this.storageService.set('tipos_novedad', this._tiposNovedad());
            await this.storageService.set('sync_queue', this._syncQueue());
        } catch (error) {
            console.error('[NovedadService] Error saving to storage:', error);
        }
    }

    // === ARCHIVAR / BORRAR HISTORIAL ===

    /**
     * Archiva novedades seleccionadas (las mueve a pestaña "Archivadas")
     */
    async archivarNovedades(ids: string[]): Promise<void> {
        const fechaArchivado = new Date();
        this._novedades.update(novedades =>
            novedades.map(n =>
                ids.includes(n.id)
                    ? { ...n, archivado: true, fechaArchivado }
                    : n
            )
        );
        await this.saveToStorage();
    }

    /**
     * Restaura novedades archivadas
     */
    async restaurarNovedades(ids: string[]): Promise<void> {
        this._novedades.update(novedades =>
            novedades.map(n =>
                ids.includes(n.id)
                    ? { ...n, archivado: false, fechaArchivado: undefined }
                    : n
            )
        );
        await this.saveToStorage();
    }

    /**
     * Elimina novedades seleccionadas permanentemente
     */
    async borrarNovedades(ids: string[]): Promise<void> {
        this._novedades.update(novedades =>
            novedades.filter(n => !ids.includes(n.id))
        );
        await this.saveToStorage();
    }

    /**
     * Elimina todas las novedades del historial permanentemente
     */
    async borrarTodoHistorial(): Promise<void> {
        this._novedades.set([]);
        await this.saveToStorage();
    }



    // === CRUD NOVEDADES ===

    /**
     * Registra una nueva novedad
     */
    async registrarNovedad(data: Omit<Novedad, 'id' | 'fechaRegistro' | 'syncStatus'>): Promise<Novedad> {
        const novedadId = this.generateId();
        const novedad: Novedad = {
            ...data,
            id: novedadId,
            fechaRegistro: new Date(),
            syncStatus: this._isOnline() ? 'synced' : 'pending',
            localTimestamp: Date.now()
        };

        // Actualizar frecuencia de uso del tipo
        this.incrementarFrecuenciaTipo(data.tipoNovedadId);

        // Agregar a la lista
        this._novedades.update(novedades => [...novedades, novedad]);

        await this.saveToStorage();
        return novedad;
    }

    /**
     * Registra múltiples novedades en un solo bloque (Optimizado)
     */
    async registrarNovedadesBatch(datosNovedades: Omit<Novedad, 'id' | 'fechaRegistro' | 'syncStatus'>[]): Promise<Novedad[]> {
        const timestamp = Date.now();
        const idsCreados: string[] = [];

        const nuevasNovedades: Novedad[] = datosNovedades.map(data => {
            const id = this.generateId();
            idsCreados.push(id);
            this.incrementarFrecuenciaTipo(data.tipoNovedadId);
            return {
                ...data,
                id,
                fechaRegistro: new Date(),
                syncStatus: this._isOnline() ? 'synced' : 'pending',
                localTimestamp: timestamp
            };
        });

        // Actualización única de la señal
        this._novedades.update(list => [...list, ...nuevasNovedades]);

        await this.saveToStorage();
        return nuevasNovedades;
    }

    /**
     * Registra múltiples novedades (masivo)
     */
    async registrarNovedadesMasivo(
        estudiantesCorreos: string[],
        datosComunes: Omit<Novedad, 'id' | 'fechaRegistro' | 'estudianteCorreo' | 'syncStatus'>,
        esGrupal: boolean = false
    ): Promise<Novedad[]> {
        const grupoNovedadId = this.generateId();
        const novedades: Novedad[] = [];

        for (const correo of estudiantesCorreos) {
            const novedad = await this.registrarNovedad({
                ...datosComunes,
                estudianteCorreo: correo,
                grupoNovedadId,
                esNovedadGrupal: esGrupal
            });
            novedades.push(novedad);
        }

        return novedades;
    }

    /**
     * Actualiza el estado de una novedad
     */
    async actualizarEstado(novedadId: string, nuevoEstado: EstadoNovedad): Promise<void> {
        this._novedades.update(novedades =>
            novedades.map(n =>
                n.id === novedadId
                    ? { ...n, estado: nuevoEstado, fechaActualizacion: new Date() }
                    : n
            )
        );

        if (!this._isOnline()) {
            const novedad = this._novedades().find(n => n.id === novedadId);
            if (novedad) {
                this.addToSyncQueue('update', 'novedad', novedad);
            }
        }

        await this.saveToStorage();
    }

    /**
     * Elimina una novedad
     */
    async eliminarNovedad(novedadId: string): Promise<void> {
        const novedad = this._novedades().find(n => n.id === novedadId);

        this._novedades.update(novedades =>
            novedades.filter(n => n.id !== novedadId)
        );

        if (!this._isOnline() && novedad) {
            this.addToSyncQueue('delete', 'novedad', novedad);
        }

        await this.saveToStorage();
    }

    /**
     * Actualiza una novedad existente con cambios parciales
     */
    async actualizarNovedad(novedadId: string, cambios: Partial<Novedad>): Promise<void> {
        this._novedades.update(novedades =>
            novedades.map(n => n.id === novedadId ? { ...n, ...cambios } : n)
        );
        await this.saveToStorage();
    }

    // === CRUD TIPOS DE NOVEDAD ===

    /**
     * Crea un nuevo tipo de novedad personalizado
     */
    async crearTipoNovedad(data: Omit<TipoNovedad, 'id' | 'fechaCreacion' | 'frecuenciaUso'>): Promise<TipoNovedad> {
        const tipo: TipoNovedad = {
            ...data,
            id: this.generateId(),
            fechaCreacion: new Date(),
            frecuenciaUso: 0
        };

        this._tiposNovedad.update(tipos => [...tipos, tipo]);
        await this.saveToStorage();
        return tipo;
    }

    /**
     * Actualiza un tipo de novedad
     */
    async actualizarTipoNovedad(tipoId: string, cambios: Partial<TipoNovedad>): Promise<void> {
        this._tiposNovedad.update(tipos =>
            tipos.map(t => t.id === tipoId ? { ...t, ...cambios } : t)
        );
        await this.saveToStorage();
    }

    /**
     * Desactiva un tipo de novedad (no elimina para mantener historial)
     */
    async desactivarTipoNovedad(tipoId: string): Promise<void> {
        await this.actualizarTipoNovedad(tipoId, { activo: false });
    }

    private incrementarFrecuenciaTipo(tipoId: string): void {
        this._tiposNovedad.update(tipos =>
            tipos.map(t =>
                t.id === tipoId ? { ...t, frecuenciaUso: t.frecuenciaUso + 1 } : t
            )
        );
    }

    // === CONSULTAS ===

    /**
     * Obtiene novedades por curso
     */
    getNovedadesPorCurso(cursoId: string): Novedad[] {
        return this._novedades().filter(n => n.cursoId === cursoId);
    }

    /**
     * Obtiene novedades por estudiante
     */
    getNovedadesPorEstudiante(correo: string): Novedad[] {
        return this._novedades().filter(n => n.estudianteCorreo === correo);
    }

    /**
     * Obtiene estadísticas por curso
     */
    getEstadisticasCurso(cursoId: string): NovedadStats {
        const novedadesCurso = this.getNovedadesPorCurso(cursoId);
        const porTipo = new Map<string, number>();

        novedadesCurso.forEach(n => {
            const count = porTipo.get(n.tipoNovedadId) || 0;
            porTipo.set(n.tipoNovedadId, count + 1);
        });

        return {
            cursoId,
            totalNovedades: novedadesCurso.length,
            pendientes: novedadesCurso.filter(n => n.estado === 'en_revision').length,
            confirmadas: novedadesCurso.filter(n => n.estado === 'confirmado').length,
            descartadas: novedadesCurso.filter(n => n.estado === 'descartado').length,
            porTipo
        };
    }

    /**
     * Busca novedades por término
     */
    buscarNovedades(termino: string): Novedad[] {
        const term = termino.toLowerCase();
        return this._novedades().filter(n =>
            n.estudianteNombre?.toLowerCase().includes(term) ||
            n.estudianteCorreo.toLowerCase().includes(term) ||
            n.descripcion?.toLowerCase().includes(term)
        );
    }

    // === SINCRONIZACIÓN OFFLINE ===

    private addToSyncQueue(action: 'create' | 'update' | 'delete', entity: 'novedad' | 'tipo_novedad', payload: Novedad | TipoNovedad): void {
        const item: SyncQueueItem = {
            id: this.generateId(),
            action,
            entity,
            payload,
            timestamp: new Date(),
            synced: false,
            retries: 0
        };

        this._syncQueue.update(queue => [...queue, item]);
    }

    async processSyncQueue(): Promise<void> {
        if (!this._isOnline() || this._syncQueue().length === 0) return;

        const queue = [...this._syncQueue()];

        for (const item of queue) {
            if (item.synced) continue;

            try {
                // Aquí iría la lógica de sincronización con el servidor
                // Por ahora, simplemente marcamos como sincronizado
                this._syncQueue.update(q =>
                    q.map(i => i.id === item.id ? { ...i, synced: true } : i)
                );
            } catch (error) {
                console.error('[NovedadService] Sync error:', error);
                this._syncQueue.update(q =>
                    q.map(i => i.id === item.id ? { ...i, retries: i.retries + 1 } : i)
                );
            }
        }

        // Limpiar items sincronizados
        this._syncQueue.update(q => q.filter(item => !item.synced));
        await this.saveToStorage();
    }

    // === UTILIDADES ===

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtiene el nombre de un tipo de novedad por ID
     */
    getTipoNombre(tipoId: string): string {
        return this._tiposNovedad().find(t => t.id === tipoId)?.nombre || 'Desconocido';
    }

    /**
     * Obtiene la configuración de un tipo de novedad
     */
    getTipoConfig(tipoId: string): TipoNovedad | undefined {
        return this._tiposNovedad().find(t => t.id === tipoId);
    }
}
