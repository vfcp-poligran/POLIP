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

    // Auditoría
    fechaRegistro: Date;
    fechaActualizacion?: Date;
    registradoPor?: string;

    // Para aplicación masiva
    grupoNovedadId?: string;      // Agrupa novedades registradas juntas

    // Sincronización offline
    syncStatus?: 'pending' | 'synced' | 'conflict';
    localTimestamp?: number;
}

/**
 * Historial con metadatos de novedades
 */
export interface HistorialNovedades {
    novedades: Novedad[];
    tiposUsados: TipoNovedad[];
    ultimaActualizacion: Date;
}

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

/**
 * Configuración de notificaciones de novedades
 */
export interface NovedadNotificationConfig {
    enabled: boolean;
    reminderAfterHours: number;   // Recordar después de X horas
    badgeEnabled: boolean;        // Mostrar badge en tab
}

/**
 * Tipos predefinidos por defecto
 */
export const TIPOS_NOVEDAD_DEFAULT: Omit<TipoNovedad, 'id' | 'fechaCreacion'>[] = [
    {
        nombre: 'Trabaja solo',
        descripcion: 'El estudiante indica que está trabajando solo en el grupo',
        icono: 'person-outline',
        color: '#ff9800',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Ausente',
        descripcion: 'El estudiante no ha participado en las actividades',
        icono: 'close-circle-outline',
        color: '#f44336',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Problema técnico',
        descripcion: 'Reporta dificultades técnicas con la plataforma',
        icono: 'warning-outline',
        color: '#9c27b0',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Conflicto de grupo',
        descripcion: 'Problemas de comunicación o trabajo en equipo',
        icono: 'people-outline',
        color: '#e91e63',
        esRecurrente: true,
        frecuenciaUso: 0,
        activo: true
    },
    {
        nombre: 'Observación general',
        descripcion: 'Nota o comentario sobre el estudiante',
        icono: 'document-text-outline',
        color: '#607d8b',
        esRecurrente: false,
        frecuenciaUso: 0,
        activo: true
    }
];

/**
 * Mapeo de iconos para origen de mensaje
 */
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
