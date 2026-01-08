import { Injectable, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportService } from './viewport.service';
import { Logger } from '@app/core/utils/logger';

/**
 * Servicio para gestionar atajos de teclado globales en la aplicación.
 * Solo se activa en dispositivos desktop (≥992px) para evitar interferencias en móvil/tablet.
 */
@Injectable({
    providedIn: 'root'
})
export class KeyboardShortcutsService {
    private router = inject(Router);
    private viewport = inject(ViewportService);

    private shortcuts = new Map<string, () => void>();
    private isEnabled = signal(true);
    private isListenerAttached = false;

    constructor() {
        // Solo habilitar atajos en desktop
        effect(() => {
            this.isEnabled.set(this.viewport.isDesktop());
            Logger.log(`[KeyboardShortcuts] ${this.isEnabled() ? 'Enabled' : 'Disabled'} on viewport change`);
        });

        this.setupGlobalListeners();
    }

    /**
     * Configura el listener global de teclado
     */
    private setupGlobalListeners(): void {
        if (this.isListenerAttached) return;

        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!this.isEnabled()) return;

            const key = this.getShortcutKey(e);
            const handler = this.shortcuts.get(key);

            if (handler && !this.isInputFocused()) {
                e.preventDefault();
                Logger.log(`[KeyboardShortcuts] Executing shortcut: ${key}`);
                handler();
            }
        });

        this.isListenerAttached = true;
        Logger.log('[KeyboardShortcuts] Global listener attached');
    }

    /**
     * Registra un atajo de teclado
     * @param key - Combinación de teclas (ej: 'ctrl+s', 'ctrl+shift+n')
     * @param handler - Función a ejecutar cuando se presiona el atajo
     */
    register(key: string, handler: () => void): void {
        this.shortcuts.set(key.toLowerCase(), handler);
        Logger.log(`[KeyboardShortcuts] Registered: ${key}`);
    }

    /**
     * Desregistra un atajo de teclado
     * @param key - Combinación de teclas a desregistrar
     */
    unregister(key: string): void {
        this.shortcuts.delete(key.toLowerCase());
        Logger.log(`[KeyboardShortcuts] Unregistered: ${key}`);
    }

    /**
     * Limpia todos los atajos registrados
     */
    clearAll(): void {
        this.shortcuts.clear();
        Logger.log('[KeyboardShortcuts] All shortcuts cleared');
    }

    /**
     * Convierte un KeyboardEvent en una clave de atajo normalizada
     * @param e - Evento de teclado
     * @returns String con el atajo normalizado (ej: 'ctrl+s')
     */
    private getShortcutKey(e: KeyboardEvent): string {
        const modifiers: string[] = [];

        if (e.ctrlKey || e.metaKey) modifiers.push('ctrl'); // metaKey para Mac (Cmd)
        if (e.shiftKey) modifiers.push('shift');
        if (e.altKey) modifiers.push('alt');

        modifiers.push(e.key.toLowerCase());

        return modifiers.join('+');
    }

    /**
     * Verifica si un input/textarea tiene el foco actualmente
     * Previene que los atajos interfieran cuando el usuario está escribiendo
     * @returns true si hay un input enfocado
     */
    private isInputFocused(): boolean {
        const activeElement = document.activeElement;

        if (!activeElement) return false;

        const tagName = activeElement.tagName;
        const isEditable = activeElement.hasAttribute('contenteditable');

        return tagName === 'INPUT' ||
            tagName === 'TEXTAREA' ||
            tagName === 'ION-INPUT' ||
            tagName === 'ION-TEXTAREA' ||
            tagName === 'ION-SEARCHBAR' ||
            isEditable;
    }

    /**
     * Habilita o deshabilita manualmente los atajos
     * @param enabled - true para habilitar, false para deshabilitar
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled.set(enabled);
    }
}
