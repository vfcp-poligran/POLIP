/**
 * Modelos para el Sistema de Novedades
 * 
 * Este módulo define las interfaces y tipos para el registro
 * y gestión de novedades de estudiantes.
 */

/**
 * Origen del mensaje que genera la novedad
 */
export type OrigenMensaje = 'teams' | 'canvas' | 'foro' | 'email' | 'presencial' | 'otro';

/**
 * Estado actual de una novedad
 */
export type EstadoNovedad = 'en_revision' | 'confirmado' | 'descartado';

/**
 * Tipo de novedad predefinido (personalizable por instructor)
 */
export interface TipoNovedad {
    id: string;
    nombre: string;           // Ej: "Trabaja solo"
    descripcion?: string;     // Descripción detallada
    icono: string;            // Ionicon name: "person-outline"
    color: string;            // Color hex: "#ff9800"
    esRecurrente: boolean;    // Marca si es situación común
    frecuenciaUso: number;    // Para ordenar por más usadas
    fechaCreacion: Date;
    activo: boolean;          // Si está disponible para uso
}

/**
 * Registro de novedad individual
 */
export interface Novedad {
    id: string;

    // Información del estudiante
    estudianteCorreo: string;
    estudianteNombre?: string;    // Cache para búsquedas

    // Contexto académico
    cursoId: string;
    cursoNombre?: string;         // Cache
    grupo: string;

    // Tipo y descripción
    tipoNovedadId: string;
    tipoNovedadNombre?: string;   // Cache

    // Origen y estado
    origen: OrigenMensaje;
    estado: EstadoNovedad;
    descripcion?: string;         // Texto adicional opcional

    // Archivado
    archivado?: boolean;
    fechaArchivado?: Date;

    // Auditoría
    fechaRegistro: Date;
    fechaActualizacion?: Date;
    registradoPor?: string;

    // Para aplicación masiva
    grupoNovedadId?: string;      // ID compartido si se registró como grupo completo
    esNovedadGrupal?: boolean;    // Marca si afecta a todo el grupo

    // Novedad Relacional ("Se unió con")
    relatedStudentId?: string;    // ID/Correo del estudiante con quien se unió
    relatedStudentName?: string;  // Cache del nombre

    // Sincronización offline
    syncStatus?: 'pending' | 'synced' | 'conflict';
    localTimestamp?: number;

    // Historial de cambios VCS
    historialCambios?: CambioNovedad[];
}

/**
 * Registro de un cambio individual en una novedad (VCS)
 */
export interface CambioNovedad {
    fecha: Date;
    campoModificado: string;       // Ej: "tipoNovedadId", "descripcion"
    valorAnterior: string;         // Valor antes del cambio
    valorNuevo: string;            // Valor después del cambio
    modificadoPor: string;         // Quién hizo el cambio
}

// SesionRevision eliminada - ya no se usa

/**
 * Historial con metadatos de novedades
 */
export interface HistorialNovedades {
    novedades: Novedad[];
    tiposUsados: TipoNovedad[];
    ultimaActualizacion: Date;
}

/**
 * Tipos predefinidos por defecto (Actualizados por USER REQUEST)
 */
export const TIPOS_NOVEDAD_DEFAULT: Omit<TipoNovedad, 'id' | 'fechaCreacion'>[] = [
    {
        nombre: 'Trabaja Solo',
        descripcion: 'El estudiante indica que está trabajando solo',
        icono: 'person-outline',
        color: '#ff9800',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'El grupo está trabajando bien',
        descripcion: 'Todo el grupo participa equitativamente',
        icono: 'people-outline',
        color: '#4caf50',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Ausente',
        descripcion: 'El estudiante no se presentó o no responde',
        icono: 'close-circle-outline',
        color: '#f44336',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Incumplimiento de aportes',
        descripcion: 'El estudiante no ha entregado lo acordado con el grupo',
        icono: 'warning-outline',
        color: '#9c27b0',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Se unió con',
        descripcion: 'El estudiante se ha unido a otro compañero/grupo',
        icono: 'git-merge-outline',
        color: '#2196f3',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    }
];

/**
 * Cola de sincronización para modo offline
 */
export interface SyncQueueItem {
    id: string;
    action: 'create' | 'update' | 'delete';
    entity: 'novedad' | 'tipo_novedad';
    payload: Novedad | TipoNovedad;
    timestamp: Date;
    synced: boolean;
    retries: number;
}

/**
 * Estadísticas de novedades por curso
 */
export interface NovedadStats {
    cursoId: string;
    totalNovedades: number;
    pendientes: number;
    confirmadas: number;
    descartadas: number;
    porTipo: Map<string, number>;
}
export const ORIGEN_CONFIG: Record<OrigenMensaje, { icono: string; label: string; color: string }> = {
    teams: { icono: 'chatbubbles-outline', label: 'Teams', color: '#6264a7' },
    canvas: { icono: 'school-outline', label: 'Canvas', color: '#e03131' },
    foro: { icono: 'chatbox-ellipses-outline', label: 'Foro', color: '#2196f3' },
    email: { icono: 'mail-outline', label: 'Email', color: '#4caf50' },
    presencial: { icono: 'person-outline', label: 'Presencial', color: '#ff9800' },
    otro: { icono: 'ellipsis-horizontal-outline', label: 'Otro', color: '#9e9e9e' }
};

/**
 * Mapeo de iconos para estado
 */
export const ESTADO_CONFIG: Record<EstadoNovedad, { icono: string; label: string; color: string }> = {
    en_revision: { icono: 'time-outline', label: 'En revisión', color: '#ff9800' },
    confirmado: { icono: 'checkmark-circle-outline', label: 'Confirmado', color: '#4caf50' },
    descartado: { icono: 'close-circle-outline', label: 'Descartado', color: '#9e9e9e' }
};
