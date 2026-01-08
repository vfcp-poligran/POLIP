import { Injectable, signal, effect } from '@angular/core';

/**
 * Theme options
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'auto': Follow system preference
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * ThemeService
 * 
 * Manages application theme (light/dark/auto) with:
 * - Persistent storage in localStorage
 * - System preference detection
 * - Reactive theme changes
 * 
 * Usage:
 * ```typescript
 * themeService = inject(ThemeService);
 * 
 * // Get current theme
 * const theme = this.themeService.currentTheme();
 * 
 * // Set theme
 * this.themeService.setTheme('dark');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly STORAGE_KEY = 'app-theme';

    /**
     * Current theme setting
     * Reactive signal that updates when theme changes
     */
    currentTheme = signal<Theme>('light'); // Forzado a Light por defecto para consistencia móvil

    /**
     * Effective theme being displayed
     * Resolves 'auto' to actual 'light' or 'dark'
     */
    effectiveTheme = signal<'light' | 'dark'>('light');

    constructor() {
        this.loadTheme();
        this.setupThemeEffect();
        this.setupSystemPreferenceListener();
    }

    /**
     * Set application theme
     * @param theme - Theme to apply ('light', 'dark', or 'auto')
     */
    setTheme(theme: Theme): void {
        this.currentTheme.set(theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme(theme);
    }

    /**
     * Toggle between light and dark themes
     * If currently 'auto', switches to opposite of system preference
     */
    toggleTheme(): void {
        const current = this.currentTheme();

        if (current === 'auto') {
            // If auto, toggle to opposite of system preference
            const systemPrefersDark = this.getSystemPreference();
            this.setTheme(systemPrefersDark ? 'light' : 'dark');
        } else {
            // Toggle between light and dark
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        }
    }

    /**
     * Load saved theme from localStorage
     */
    private loadTheme(): void {
        const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
        if (saved && ['light', 'dark', 'auto'].includes(saved)) {
            this.currentTheme.set(saved);
        }
        this.applyTheme(this.currentTheme());
    }

    /**
     * Apply theme to document
     */
    private applyTheme(theme: Theme): void {
        const root = document.documentElement;

        if (theme === 'auto') {
            // Remove both classes and use system preference
            root.classList.remove('ion-palette-dark');
            root.removeAttribute('data-theme');

            // Apply based on system preference
            const prefersDark = this.getSystemPreference();
            if (prefersDark) {
                root.classList.add('ion-palette-dark');
            }
            this.effectiveTheme.set(prefersDark ? 'dark' : 'light');
        } else if (theme === 'dark') {
            // Apply dark mode using Ionic's official class
            root.classList.add('ion-palette-dark');
            root.setAttribute('data-theme', 'dark');
            this.effectiveTheme.set('dark');
        } else {
            // Light mode - remove dark mode class
            root.classList.remove('ion-palette-dark');
            root.setAttribute('data-theme', 'light');
            this.effectiveTheme.set('light');
        }
    }

    /**
     * Get system color scheme preference
     * @returns true if system prefers dark mode
     */
    private getSystemPreference(): boolean {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Setup effect to react to theme changes
     */
    private setupThemeEffect(): void {
        effect(() => {
            const theme = this.currentTheme();
            this.applyTheme(theme);
        });
    }

    /**
     * Listen for system preference changes
     */
    private setupSystemPreferenceListener(): void {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Only update if theme is set to 'auto'
            if (this.currentTheme() === 'auto') {
                const root = document.documentElement;
                if (e.matches) {
                    root.classList.add('ion-palette-dark');
                } else {
                    root.classList.remove('ion-palette-dark');
                }
                this.effectiveTheme.set(e.matches ? 'dark' : 'light');
            }
        });
    }
}
