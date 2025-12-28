import { Injectable, signal, effect } from '@angular/core';

/**
 * Interface preferences configuration
 */
export interface InterfacePreferences {
    tabAnimationsEnabled: boolean;
    mostrarTabCaracteristicas: boolean;
    cursosConTabOculto: string[];
}

/**
 * PreferencesService
 * 
 * Manages user interface preferences with:
 * - Persistent storage in localStorage
 * - Reactive preference changes
 * - Tab/segment animation controls
 * 
 * Usage:
 * ```typescript
 * preferencesService = inject(PreferencesService);
 * 
 * // Get current preference
 * const enabled = this.preferencesService.tabAnimationsEnabled();
 * 
 * // Set preference
 * this.preferencesService.setTabAnimations(true);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
    private readonly STORAGE_KEY = 'app-interface-preferences';

    /**
     * Tab animations enabled
     * Controls whether custom tab/segment transitions are active
     */
    private _tabAnimationsEnabled = signal<boolean>(false);

    // Expose as readonly
    tabAnimationsEnabled = this._tabAnimationsEnabled.asReadonly();

    /**
     * Show Características tab in courses
     * Controls global visibility of the characteristics tab
     */
    private _mostrarTabCaracteristicas = signal<boolean>(true);
    mostrarTabCaracteristicas = this._mostrarTabCaracteristicas.asReadonly();

    /**
     * Courses with hidden Características tab
     * Array of course codes where the tab should be hidden
     */
    private _cursosConTabOculto = signal<string[]>([]);
    cursosConTabOculto = this._cursosConTabOculto.asReadonly();

    constructor() {
        this.loadPreferences();
        this.setupPreferencesEffect();
    }

    /**
     * Set tab animations preference
     * @param enabled - Whether to enable custom tab animations
     */
    setTabAnimations(enabled: boolean): void {
        this._tabAnimationsEnabled.set(enabled);
        this.savePreferences();
    }

    /**
     * Toggle tab animations
     */
    toggleTabAnimations(): void {
        this.setTabAnimations(!this._tabAnimationsEnabled());
    }

    /**
     * Set mostrar tab características preference
     * @param mostrar - Whether to show the características tab globally
     */
    setMostrarTabCaracteristicas(mostrar: boolean): void {
        this._mostrarTabCaracteristicas.set(mostrar);
        // Si se desactiva globalmente, limpiar la lista de cursos específicos
        if (!mostrar) {
            this._cursosConTabOculto.set([]);
        }
        this.savePreferences();
    }

    /**
     * Toggle características tab for a specific course
     * @param codigoCurso - Course code to toggle
     */
    toggleTabCaracteristicasCurso(codigoCurso: string): void {
        const cursosOcultos = this._cursosConTabOculto();
        const index = cursosOcultos.indexOf(codigoCurso);

        if (index > -1) {
            // Remove from hidden list
            this._cursosConTabOculto.set(cursosOcultos.filter(c => c !== codigoCurso));
        } else {
            // Add to hidden list
            this._cursosConTabOculto.set([...cursosOcultos, codigoCurso]);
        }
        this.savePreferences();
    }

    /**
     * Check if a course has the tab hidden
     * @param codigoCurso - Course code to check
     */
    isCursoConTabOculto(codigoCurso: string): boolean {
        return this._cursosConTabOculto().includes(codigoCurso);
    }

    /**
     * Load saved preferences from localStorage
     */
    private loadPreferences(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const preferences: InterfacePreferences = JSON.parse(saved);
                this._tabAnimationsEnabled.set(preferences.tabAnimationsEnabled ?? false);
                this._mostrarTabCaracteristicas.set(preferences.mostrarTabCaracteristicas ?? true);
                this._cursosConTabOculto.set(preferences.cursosConTabOculto ?? []);
            }
        } catch (error) {
            console.error('[PreferencesService] Error loading preferences:', error);
        }
    }

    /**
     * Save preferences to localStorage
     */
    private savePreferences(): void {
        try {
            const preferences: InterfacePreferences = {
                tabAnimationsEnabled: this._tabAnimationsEnabled(),
                mostrarTabCaracteristicas: this._mostrarTabCaracteristicas(),
                cursosConTabOculto: this._cursosConTabOculto()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('[PreferencesService] Error saving preferences:', error);
        }
    }

    /**
     * Setup effect to auto-save preferences
     */
    private setupPreferencesEffect(): void {
        effect(() => {
            // Track changes
            this._tabAnimationsEnabled();
            this._mostrarTabCaracteristicas();
            this._cursosConTabOculto();
            // Preferences are saved via setters, this just tracks reactivity
        });
    }

    /**
     * Reset all preferences to defaults
     */
    resetToDefaults(): void {
        this._tabAnimationsEnabled.set(false);
        this._mostrarTabCaracteristicas.set(true);
        this._cursosConTabOculto.set([]);
        this.savePreferences();
    }
}
