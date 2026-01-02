import { Injectable, signal, computed, effect, DestroyRef, inject } from '@angular/core';

/**
 * Tipos de viewport soportados
 */
export type Viewport = 'mobile' | 'tablet' | 'desktop';

/**
 * Servicio centralizado para detección de viewport
 * 
 * @description
 * Proporciona signals reactivos para detectar el tamaño de pantalla
 * y aplicar lógica responsiva de forma consistente en toda la aplicación.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   viewport = inject(ViewportService);
 *   
 *   // En template
 *   @if (viewport.isMobile()) {
 *     <mobile-layout />
 *   } @else if (viewport.isTablet()) {
 *     <tablet-layout />
 *   } @else {
 *     <desktop-layout />
 *   }
 * }
 * ```
 */
@Injectable({
    providedIn: 'root'
})
export class ViewportService {
    private destroyRef = inject(DestroyRef);

    /**
     * Breakpoints (sincronizados con _breakpoints.scss)
     */
    readonly BREAKPOINTS = {
        XS: 0,
        SM: 576,
        MD: 768,
        LG: 992,
        XL: 1200
    } as const;

    /**
     * Ancho actual de la ventana
     */
    private width = signal(this.getWindowWidth());

    /**
     * Alto actual de la ventana
     */
    private height = signal(this.getWindowHeight());

    /**
     * Signal: ¿Es móvil? (< 768px)
     */
    readonly isMobile = computed(() => this.width() < this.BREAKPOINTS.MD);

    /**
     * Signal: ¿Es tablet? (768px - 991px)
     */
    readonly isTablet = computed(() =>
        this.width() >= this.BREAKPOINTS.MD &&
        this.width() < this.BREAKPOINTS.LG
    );

    /**
     * Signal: ¿Es desktop? (>= 992px)
     */
    readonly isDesktop = computed(() => this.width() >= this.BREAKPOINTS.LG);

    /**
     * Signal: Viewport actual
     */
    readonly viewport = computed<Viewport>(() => {
        const w = this.width();
        if (w < this.BREAKPOINTS.MD) return 'mobile';
        if (w < this.BREAKPOINTS.LG) return 'tablet';
        return 'desktop';
    });

    /**
     * Signal: ¿Orientación landscape?
     */
    readonly isLandscape = computed(() => this.width() > this.height());

    /**
     * Signal: ¿Orientación portrait?
     */
    readonly isPortrait = computed(() => this.width() <= this.height());

    /**
     * Signal: ¿Es móvil en landscape? (útil para ajustes de UI)
     */
    readonly isMobileLandscape = computed(() =>
        this.isMobile() && this.isLandscape() && this.height() < 500
    );

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupResizeListener();
        }
    }

    /**
     * Obtiene el ancho de la ventana de forma segura
     */
    private getWindowWidth(): number {
        return typeof window !== 'undefined' ? window.innerWidth : 1024;
    }

    /**
     * Obtiene el alto de la ventana de forma segura
     */
    private getWindowHeight(): number {
        return typeof window !== 'undefined' ? window.innerHeight : 768;
    }

    /**
     * Configura el listener de resize optimizado
     */
    private setupResizeListener(): void {
        let resizeTimeout: ReturnType<typeof setTimeout>;

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.width.set(window.innerWidth);
                this.height.set(window.innerHeight);
            }, 150); // Debounce de 150ms
        };

        window.addEventListener('resize', handleResize);

        // Cleanup automático cuando el servicio se destruya
        this.destroyRef.onDestroy(() => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        });
    }

    /**
     * Verifica si el viewport actual coincide con el tipo especificado
     */
    matches(viewport: Viewport): boolean {
        return this.viewport() === viewport;
    }

    /**
     * Verifica si el ancho actual está dentro de un rango
     */
    matchesRange(min: number, max: number): boolean {
        const w = this.width();
        return w >= min && w < max;
    }
}
