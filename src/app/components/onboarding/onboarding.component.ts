import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  close,
  checkmarkCircle
} from 'ionicons/icons';

export interface OnboardingStep {
  /** Selector CSS del elemento a destacar */
  targetSelector: string;
  /** Título del paso */
  title: string;
  /** Descripción del paso */
  description: string;
  /** Posición del tooltip relativo al elemento */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Offset adicional para el spotlight */
  spotlightPadding?: number;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    @if (isVisible && steps.length > 0) {
      <div class="ui-onboarding">
        <div class="ui-onboarding__backdrop" (click)="onSkip()"></div>

        <!-- Spotlight sobre el elemento actual -->
        <div
          class="ui-onboarding__spotlight"
          [style.top.px]="spotlightPosition.top"
          [style.left.px]="spotlightPosition.left"
          [style.width.px]="spotlightPosition.width"
          [style.height.px]="spotlightPosition.height">
        </div>

        <!-- Tooltip con instrucciones -->
        <div
          class="ui-onboarding__tooltip ui-onboarding__tooltip--{{ currentStep?.position || 'bottom' }}"
          [style.top.px]="tooltipPosition.top"
          [style.left.px]="tooltipPosition.left">

          <div class="ui-onboarding__step">
            <ion-icon name="checkmark-circle"></ion-icon>
            Paso {{ currentIndex + 1 }} de {{ steps.length }}
          </div>

          <h3 class="ui-onboarding__title">{{ currentStep?.title }}</h3>
          <p class="ui-onboarding__description">{{ currentStep?.description }}</p>

          <div class="ui-onboarding__actions">
            <!-- Dots indicadores -->
            <div class="ui-onboarding__dots">
              @for (step of steps; track $index) {
                <span
                  class="ui-onboarding__dot"
                  [class.ui-onboarding__dot--active]="$index === currentIndex"
                  [class.ui-onboarding__dot--completed]="$index < currentIndex">
                </span>
              }
            </div>

            <button class="ui-onboarding__skip" (click)="onSkip()">
              Omitir tour
            </button>

            <div class="ui-onboarding__nav">
              @if (currentIndex > 0) {
                <button
                  class="ui-onboarding__btn ui-onboarding__btn--secondary"
                  (click)="previousStep()">
                  <ion-icon name="arrow-back"></ion-icon>
                  Anterior
                </button>
              }

              @if (currentIndex < steps.length - 1) {
                <button
                  class="ui-onboarding__btn ui-onboarding__btn--primary"
                  (click)="nextStep()">
                  Siguiente
                  <ion-icon name="arrow-forward"></ion-icon>
                </button>
              } @else {
                <button
                  class="ui-onboarding__btn ui-onboarding__btn--primary"
                  (click)="complete()">
                  ¡Entendido!
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .ui-onboarding__btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      ion-icon {
        font-size: 16px;
      }
    }
  `]
})
export class OnboardingComponent implements OnInit, OnDestroy {
  @Input() steps: OnboardingStep[] = [];
  @Input() storageKey = 'onboarding_completed';
  @Input() autoStart = true;

  @Output() completed = new EventEmitter<void>();
  @Output() skipped = new EventEmitter<void>();
  @Output() stepChanged = new EventEmitter<number>();

  isVisible = false;
  currentIndex = 0;

  spotlightPosition = { top: 0, left: 0, width: 0, height: 0 };
  tooltipPosition = { top: 0, left: 0 };

  private resizeObserver?: ResizeObserver;

  constructor() {
    addIcons({ arrowForward, arrowBack, close, checkmarkCircle });
  }

  get currentStep(): OnboardingStep | undefined {
    return this.steps[this.currentIndex];
  }

  ngOnInit(): void {
    if (this.autoStart && !this.hasCompletedOnboarding()) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => this.start(), 500);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    document.body.style.overflow = '';
  }

  /**
   * Inicia el tutorial
   */
  start(): void {
    if (this.steps.length === 0) return;

    this.isVisible = true;
    this.currentIndex = 0;
    document.body.style.overflow = 'hidden';
    this.updatePositions();
    this.setupResizeObserver();
  }

  /**
   * Va al siguiente paso
   */
  nextStep(): void {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.updatePositions();
      this.stepChanged.emit(this.currentIndex);
    }
  }

  /**
   * Va al paso anterior
   */
  previousStep(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updatePositions();
      this.stepChanged.emit(this.currentIndex);
    }
  }

  /**
   * Completa el tutorial
   */
  complete(): void {
    this.markAsCompleted();
    this.hide();
    this.completed.emit();
  }

  /**
   * Omite el tutorial
   */
  onSkip(): void {
    this.markAsCompleted();
    this.hide();
    this.skipped.emit();
  }

  /**
   * Oculta el onboarding
   */
  private hide(): void {
    this.isVisible = false;
    document.body.style.overflow = '';
    this.resizeObserver?.disconnect();
  }

  /**
   * Actualiza las posiciones del spotlight y tooltip
   */
  private updatePositions(): void {
    const step = this.currentStep;
    if (!step) return;

    const element = document.querySelector(step.targetSelector);
    if (!element) {
      console.warn(`Onboarding: No se encontró el elemento "${step.targetSelector}"`);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = step.spotlightPadding ?? 8;

    // Posición del spotlight
    this.spotlightPosition = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + (padding * 2),
      height: rect.height + (padding * 2)
    };

    // Posición del tooltip según la posición especificada
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Estimado
    const margin = 16;

    switch (step.position) {
      case 'top':
        this.tooltipPosition = {
          top: rect.top - tooltipHeight - margin,
          left: Math.max(margin, rect.left + (rect.width / 2) - (tooltipWidth / 2))
        };
        break;
      case 'left':
        this.tooltipPosition = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
          left: rect.left - tooltipWidth - margin
        };
        break;
      case 'right':
        this.tooltipPosition = {
          top: rect.top + (rect.height / 2) - (tooltipHeight / 2),
          left: rect.right + margin
        };
        break;
      case 'bottom':
      default:
        this.tooltipPosition = {
          top: rect.bottom + margin,
          left: Math.max(margin, rect.left + (rect.width / 2) - (tooltipWidth / 2))
        };
    }

    // Asegurar que el tooltip no salga de la pantalla
    const maxLeft = window.innerWidth - tooltipWidth - margin;
    const maxTop = window.innerHeight - tooltipHeight - margin;

    this.tooltipPosition.left = Math.min(Math.max(margin, this.tooltipPosition.left), maxLeft);
    this.tooltipPosition.top = Math.min(Math.max(margin, this.tooltipPosition.top), maxTop);
  }

  /**
   * Configura el observer para resize
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.updatePositions();
    });

    this.resizeObserver.observe(document.body);
  }

  /**
   * Verifica si el usuario ya completó el onboarding
   */
  private hasCompletedOnboarding(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  /**
   * Marca el onboarding como completado
   */
  private markAsCompleted(): void {
    localStorage.setItem(this.storageKey, 'true');
  }

  /**
   * Reinicia el onboarding (útil para testing)
   */
  reset(): void {
    localStorage.removeItem(this.storageKey);
    this.currentIndex = 0;
  }
}
