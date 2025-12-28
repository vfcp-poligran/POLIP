import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonApp,
  IonRouterOutlet
} from '@ionic/angular/standalone';
import { DataService } from './services/data.service';
import { ThemeService } from './services/theme.service';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { Logger } from '@app/core/utils/logger';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    SplashScreenComponent
  ],
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);
  private themeService = inject(ThemeService); // Initialize theme service on app startup

  @ViewChild(SplashScreenComponent) splashScreen!: SplashScreenComponent;

  showSplash = true;
  isLoading = true;

  async ngOnInit() {
    try {
      // 🔧 CRÍTICO: Cargar datos del almacenamiento persistente al iniciar
      await this.dataService.ensureInitialized();
      Logger.log('✅ [AppComponent] Datos cargados del almacenamiento');

      this.isLoading = false;

      // Dar un pequeño delay para que la animación de carga termine
      setTimeout(() => {
        this.splashScreen?.hideSplash();
      }, 800);
    } catch (error) {
      Logger.error('❌ [AppComponent] Error al inicializar:', error);
      this.isLoading = false;
      this.splashScreen?.hideSplash();
    }
  }

  onSplashComplete(): void {
    this.showSplash = false;
  }
}
