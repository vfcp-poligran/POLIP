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
