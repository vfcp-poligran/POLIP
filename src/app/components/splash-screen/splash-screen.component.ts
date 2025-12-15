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
            src="https://www.poli.edu.co/themes/custom/ptecnico2023/logo.svg"
            alt="Politécnico Grancolombiano"
            class="logo"
            (error)="onLogoError($event)"
          />
        </div>

        <!-- Nombre de la aplicación -->
        <h1 class="app-name">Gestor de Proyectos EPM</h1>
        <p class="app-subtitle">Politécnico Grancolombiano</p>

        <!-- Indicador de carga -->
        <div class="loader-container">
          <div class="loader">
            <div class="loader-bar"></div>
          </div>
          <p class="loading-text">{{ loadingMessage }}</p>
        </div>

        <!-- Versión -->
        <p class="version">v1.0.0</p>
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
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f385a 0%, #1a5a8a 50%, #0f385a 100%);
      padding: var(--ion-safe-area-top) var(--ion-safe-area-right) var(--ion-safe-area-bottom) var(--ion-safe-area-left);
    }

    .splash-content {
      text-align: center;
      color: #ffffff;
      max-width: 320px;
      padding: 24px;
    }

    .logo-container {
      margin-bottom: 32px;
      animation: logoFloat 2s ease-in-out infinite;
    }

    .logo {
      width: 180px;
      height: auto;
      filter: brightness(0) invert(1);
      transition: transform 0.3s ease;
    }

    .app-name {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 8px 0;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .app-subtitle {
      font-size: 0.9rem;
      opacity: 0.85;
      margin: 0 0 40px 0;
      font-weight: 300;
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
      background: linear-gradient(90deg, #1FB2DE, #A6CE38, #FBAF17);
      border-radius: 4px;
      animation: loadProgress 2.5s ease-out forwards;
    }

    .loading-text {
      font-size: 0.85rem;
      opacity: 0.7;
      margin: 0;
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
      }
    }, 500);
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
