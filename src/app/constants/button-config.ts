/**
 * Configuración centralizada de botones CRUD
 * Garantiza consistencia visual y de accesibilidad en toda la aplicación
 */
export const BUTTON_CONFIG = {
    CREAR: {
        icon: 'add-circle-outline',
        color: 'success',
        label: 'Crear',
        ariaLabel: 'Crear nuevo curso'
    },
    EDITAR: {
        icon: 'create-outline',
        color: 'primary',
        label: 'Editar',
        ariaLabel: 'Editar curso'
    },
    ELIMINAR: {
        icon: 'trash-outline',
        color: 'danger',
        label: 'Eliminar',
        ariaLabel: 'Eliminar curso'
    },
    GUARDAR: {
        icon: 'checkmark-circle-outline',
        color: 'primary',
        label: 'Guardar',
        ariaLabel: 'Guardar cambios'
    },
    CANCELAR: {
        icon: 'close-circle-outline',
        color: 'warning',
        label: 'Cancelar',
        ariaLabel: 'Cancelar operación'
    }
} as const;

/**
 * Tipo derivado para type safety
 */
export type ButtonAction = keyof typeof BUTTON_CONFIG;
