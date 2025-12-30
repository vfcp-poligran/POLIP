import { Injectable, signal, computed, inject } from '@angular/core';
import {
    Novedad,
    SesionRevision,
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
    private _sesiones = signal<SesionRevision[]>([]);
    private _syncQueue = signal<SyncQueueItem[]>([]);
    private _isOnline = signal<boolean>(navigator.onLine);

    // === COMPUTED SIGNALS ===
    public novedades = this._novedades.asReadonly();
    public tiposNovedad = this._tiposNovedad.asReadonly();
    public sesiones = this._sesiones.asReadonly();
    public syncQueue = this._syncQueue.asReadonly();
    public isOnline = this._isOnline.asReadonly();

    public sesionesBorrador = computed(() =>
        this._sesiones().filter(s => s.estado === 'borrador')
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
            const sesiones = await this.storageService.get<SesionRevision[]>('sesiones_revision');
            const queue = await this.storageService.get<SyncQueueItem[]>('sync_queue');

            if (novedades) this._novedades.set(novedades);
            if (tipos) this._tiposNovedad.set(tipos);
            if (sesiones) this._sesiones.set(sesiones);
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
            await this.storageService.set('sesiones_revision', this._sesiones());
            await this.storageService.set('sync_queue', this._syncQueue());
        } catch (error) {
            console.error('[NovedadService] Error saving to storage:', error);
        }
    }

    // === SESIONES DE REVISIÓN ===

    async iniciarSesionRevision(nombre: string, cursoId: string): Promise<SesionRevision> {
        // Al iniciar una nueva, pausamos las otras que estén activas
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.estado === 'activo' ? { ...s, estado: 'borrador' } : s)
        );

        const sesion: SesionRevision = {
            id: `session_${Date.now()}`,
            nombre,
            cursoId,
            fechaInicio: new Date(),
            estado: 'activo',
            novedadesIds: []
        };

        this._sesiones.update(s => [...s, sesion]);
        await this.saveToStorage();
        return sesion;
    }

    async pausarSesionRevision(sessionId: string): Promise<void> {
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id === sessionId ? { ...s, estado: 'borrador' } : s)
        );
        await this.saveToStorage();
    }

    async reanudarSesionRevision(sessionId: string): Promise<void> {
        // Pausamos cualquier otra activa
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id !== sessionId && s.estado === 'activo' ? { ...s, estado: 'borrador' } : s)
        );

        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id === sessionId ? { ...s, estado: 'activo' } : s)
        );
        await this.saveToStorage();
    }

    async cerrarSesionRevision(sessionId: string, comentarios?: string): Promise<void> {
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id === sessionId ? {
                ...s,
                estado: 'cerrado',
                fechaFin: new Date(),
                comentarios: comentarios || s.comentarios
            } : s)
        );
        await this.saveToStorage();
    }

    async eliminarSesion(sessionId: string): Promise<void> {
        this._sesiones.update(sesiones => sesiones.filter(s => s.id !== sessionId));
        // Opcionalmente desvincular novedades
        this._novedades.update(novedades =>
            novedades.map(n => n.sessionId === sessionId ? { ...n, sessionId: undefined } : n)
        );
        await this.saveToStorage();
    }

    async actualizarSesion(sessionId: string, cambios: Partial<SesionRevision>): Promise<void> {
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id === sessionId ? { ...s, ...cambios } : s)
        );
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

        // Vincular a sesión si existe
        if (data.sessionId) {
            this.vincularASesion(data.sessionId, novedadId);
        }

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

        // Vinculación masiva a sesión
        const sessionId = datosNovedades[0]?.sessionId;
        if (sessionId) {
            this._sesiones.update(sesiones =>
                sesiones.map(s => s.id === sessionId ? {
                    ...s,
                    novedadesIds: [...s.novedadesIds, ...idsCreados]
                } : s)
            );
        }

        await this.saveToStorage();
        return nuevasNovedades;
    }

    private vincularASesion(sessionId: string, novedadId: string) {
        this._sesiones.update(sesiones =>
            sesiones.map(s => s.id === sessionId ? {
                ...s,
                novedadesIds: [...s.novedadesIds, novedadId]
            } : s)
        );
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
