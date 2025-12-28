/**
 * Configuración centralizada de botones CRUD
 * Garantiza consistencia visual y de accesibilidad en toda la aplicación
 */
export const BUTTON_CONFIG = {
    CREAR: {
        icon: 'add-circle',
        color: 'success',
        label: 'Crear',
        ariaLabel: 'Crear nuevo curso'
    },
    EDITAR: {
        icon: 'create',
        color: 'primary',
        label: 'Editar',
        ariaLabel: 'Editar curso'
    },
    ELIMINAR: {
        icon: 'trash',
        color: 'danger',
        label: 'Eliminar',
        ariaLabel: 'Eliminar curso'
    },
    GUARDAR: {
        icon: 'checkmark-circle',
        color: 'primary',
        label: 'Guardar',
        ariaLabel: 'Guardar cambios'
    },
    CANCELAR: {
        icon: 'close-circle',
        color: 'warning',
        label: 'Cancelar',
        ariaLabel: 'Cancelar operación'
    }
} as const;

/**
 * Tipo derivado para type safety
 */
export type ButtonAction = keyof typeof BUTTON_CONFIG;

/**
 * Iconos Unicode para botones de alerta
 * Ionic AlertController no soporta HTML, usamos símbolos Unicode
 */
const ALERT_ICONS = {
    cancel: '✕',
    confirm: '✓',
    delete: '🗑',
    warning: '⚠',
    info: 'ℹ',
    clean: '🧹',
    download: '⬇',
    upload: '⬆'
} as const;

/**
 * Helper para crear botones de alerta con formato consistente
 * Ionic AlertController no renderiza HTML, por lo que usamos símbolos Unicode
 */
export const ALERT_BUTTONS = {
    /**
     * Botón de cancelar estándar
     */
    cancel: (text: string = 'Cancelar') => ({
        text: `${ALERT_ICONS.cancel} ${text}`,
        role: 'cancel' as const
    }),

    /**
     * Botón de confirmación estándar
     */
    confirm: (text: string = 'Confirmar', handler?: () => void | Promise<void>) => ({
        text: `${ALERT_ICONS.confirm} ${text}`,
        role: 'confirm' as const,
        handler
    }),

    /**
     * Botón destructivo (eliminar, limpiar, etc.)
     */
    destructive: (text: string, icon: keyof typeof ALERT_ICONS = 'delete', handler?: () => void | Promise<void>) => ({
        text: `${ALERT_ICONS[icon]} ${text}`,
        role: 'destructive' as const,
        handler
    }),

    /**
     * Botón personalizado
     */
    custom: (text: string, icon: keyof typeof ALERT_ICONS, handler?: () => void | Promise<void>, role?: string) => ({
        text: `${ALERT_ICONS[icon]} ${text}`,
        role: role as any,
        handler
    })
} as const;
