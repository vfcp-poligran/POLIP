import { Component, computed, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moon, sunny, contrast } from 'ionicons/icons';
import { ThemeService } from '../../../services/theme.service';

/**
 * ThemeToggleComponent
 * 
 * Button component that toggles between light/dark themes
 * Shows appropriate icon based on current theme
 * 
 * Usage:
 * ```html
 * <app-theme-toggle></app-theme-toggle>
 * ```
 */
@Component({
    selector: 'app-theme-toggle',
    standalone: true,
    imports: [IonButton, IonIcon],
    template: `
    <ion-button 
      fill="clear" 
      (click)="toggleTheme()"
      [attr.aria-label]="ariaLabel()">
      <ion-icon 
        slot="icon-only" 
        [name]="themeIcon()" 
        aria-hidden="true">
      </ion-icon>
    </ion-button>
  `,
    styles: [`
    ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
    }
  `]
})
export class ThemeToggleComponent {
    themeService = inject(ThemeService);

    constructor() {
        addIcons({ moon, sunny, contrast });
    }

    /**
     * Icon to display based on current theme
     */
    themeIcon = computed(() => {
        const theme = this.themeService.currentTheme();

        switch (theme) {
            case 'dark':
                return 'moon';
            case 'light':
                return 'sunny';
            case 'auto':
                return 'contrast';
            default:
                return 'sunny';
        }
    });

    /**
     * Accessible label for screen readers
     */
    ariaLabel = computed(() => {
        const theme = this.themeService.currentTheme();

        switch (theme) {
            case 'dark':
                return 'Cambiar a tema claro';
            case 'light':
                return 'Cambiar a tema oscuro';
            case 'auto':
                return 'Cambiar tema (automático)';
            default:
                return 'Cambiar tema';
        }
    });

    /**
     * Toggle theme on button click
     */
    toggleTheme(): void {
        this.themeService.toggleTheme();
    }
}
