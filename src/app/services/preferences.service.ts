import { Injectable, signal, effect } from '@angular/core';

/**
 * Interface preferences configuration
 */
export interface InterfacePreferences {
    tabAnimationsEnabled: boolean;
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
     * Load saved preferences from localStorage
     */
    private loadPreferences(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const preferences: InterfacePreferences = JSON.parse(saved);
                this._tabAnimationsEnabled.set(preferences.tabAnimationsEnabled ?? false);
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
                tabAnimationsEnabled: this._tabAnimationsEnabled()
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
            // Preferences are saved via setters, this just tracks reactivity
        });
    }

    /**
     * Reset all preferences to defaults
     */
    resetToDefaults(): void {
        this._tabAnimationsEnabled.set(false);
        this.savePreferences();
    }
}
