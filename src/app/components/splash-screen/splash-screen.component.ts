import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-container" [@fadeOut]="animationState">
      <div class="splash-content">
        <!-- Logo del Politécnico -->
        <div class="logo-container">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/7/76/Logo_del_Polit%C3%A9cnico_Grancolombiano.svg"
            alt="Politécnico Grancolombiano"
            class="logo"
            (error)="onLogoError($event)"
          />
        </div>

        <!-- Nombre de la aplicación -->
        <h1 class="app-name">POLIProject</h1>

        <!-- Indicador de carga -->
        <div class="loader-container">
          <div class="loader">
            <div class="loader-bar"></div>
          </div>
          <p class="loading-text">{{ loadingMessage }}</p>
        </div>

        <!-- Versión -->
        <p class="version">v3.1.0</p>
      </div>
    </div>
  `,
  styles: [`
    .splash-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 99999;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: linear-gradient(to top, #0f385a 0%, #1a4a6a 20%, #3a7aaa 35%, #8ac0e0 50%, #d0e8f5 65%, #ffffff 80%);
      padding: var(--ion-safe-area-top) var(--ion-safe-area-right) var(--ion-safe-area-bottom) var(--ion-safe-area-left);
    }

    .splash-content {
      text-align: center;
      color: #ffffff;
      max-width: 320px;
      padding: 60px 24px 24px 24px;
    }

    .logo-container {
      margin-bottom: 32px;
      animation: logoFloat 2s ease-in-out infinite;
    }

    .logo {
      width: 200px;
      height: auto;
      transition: transform 0.3s ease;
    }

    .app-name {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 40px 0;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      color: #0f385a;
    }

    .loader-container {
      margin-bottom: 32px;
    }

    .loader {
      width: 200px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin: 0 auto 16px;
    }

    .loader-bar {
      width: 0%;
      height: 100%;
      background: #e91e63;
      border-radius: 4px;
      animation: loadProgress 2.5s ease-out forwards;
    }

    .loading-text {
      font-size: 0.85rem;
      opacity: 0.7;
      margin: 0;
      color: #0f385a;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .version {
      font-size: 0.75rem;
      opacity: 0.5;
      margin: 0;
      position: absolute;
      bottom: calc(24px + var(--ion-safe-area-bottom));
      left: 50%;
      transform: translateX(-50%);
    }

    @keyframes logoFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes loadProgress {
      0% { width: 0%; }
      20% { width: 15%; }
      40% { width: 35%; }
      60% { width: 60%; }
      80% { width: 85%; }
      100% { width: 100%; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
  `],
  animations: [
    trigger('fadeOut', [
      state('visible', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0, visibility: 'hidden' })),
      transition('visible => hidden', [
        animate('400ms ease-out')
      ])
    ])
  ]
})
export class SplashScreenComponent implements OnInit {
  @Output() splashComplete = new EventEmitter<void>();

  animationState: 'visible' | 'hidden' = 'visible';
  loadingMessage = 'Cargando...';

  private loadingMessages = [
    'Cargando...',
    'Inicializando almacenamiento...',
    'Cargando cursos...',
    'Cargando evaluaciones...',
    'Preparando interfaz...',
    '¡Listo!'
  ];

  ngOnInit(): void {
    this.startLoadingSequence();
  }

  private startLoadingSequence(): void {
    let index = 0;
    const interval = setInterval(() => {
      if (index < this.loadingMessages.length) {
        this.loadingMessage = this.loadingMessages[index];
        index++;
      } else {
        clearInterval(interval);
        // Delay adicional de 0.5 segundos antes de ocultar el splash
        setTimeout(() => {
          this.hideSplash();
        }, 500);
      }
    }, 450);
  }

  hideSplash(): void {
    this.animationState = 'hidden';
    setTimeout(() => {
      this.splashComplete.emit();
    }, 400);
  }

  onLogoError(event: Event): void {
    // Fallback si el logo no carga
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
