import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonToggle,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  server,
  desktop,
  phonePortrait,
  build,
  cloudDownload,
  cloudUpload,
  trash,
  informationCircle,
  checkmarkCircle,
  warning,
  logoAngular,
  logoJavascript,
  cloud,
  refresh,
  settings,
  notifications,
  time,
  removeCircle,
  addCircle,
  brush,
  closeCircle, contrast, chevronForward
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { BackupService } from '../../services/backup.service';
import { UnifiedStorageService } from '../../services/unified-storage.service';
import { ToastService } from '../../services/toast.service';
import { Capacitor } from '@capacitor/core';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-sistema',
  templateUrl: './sistema.page.html',
  styleUrls: ['./sistema.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonToggle,
    ThemeToggleComponent
  ]
})
export class SistemaPage implements OnInit {
  private dataService = inject(DataService);
  private backupService = inject(BackupService);
  private unifiedStorageService = inject(UnifiedStorageService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);
  private preferencesService = inject(PreferencesService);

  @ViewChild('fileInputDB') fileInputDB!: ElementRef<HTMLInputElement>;

  storageInfo = {
    platform: 'web',
    storage: 'ionic-storage'
  };

  mostrarMensajesEmergentes = true;
  ocultarAvisoEdicionSinSeleccion = false;
  duracionToast = 2; // Duración en segundos (1-4)

  // Expose preferences signals
  tabAnimationsEnabled = this.preferencesService.tabAnimationsEnabled;

  constructor() {
    addIcons({ server, build, informationCircle, logoAngular, logoJavascript, settings, contrast, notifications, warning, time, removeCircle, addCircle, cloud, cloudDownload, chevronForward, cloudUpload, trash, brush, refresh, phonePortrait, desktop, checkmarkCircle, closeCircle });
  }

  async ngOnInit() {
    await this.detectarPlataforma();
    this.cargarPreferencias();
  }

  private cargarPreferencias() {
    const uiState = this.dataService.getUIState();
    // Por defecto habilitados si no existe la preferencia
    this.mostrarMensajesEmergentes = uiState.mostrarMensajesEmergentes !== false;
    // Duración por defecto 2 segundos
    this.duracionToast = uiState.duracionToast ?? 2;
    // Preferencia de aviso de selección
    this.ocultarAvisoEdicionSinSeleccion = uiState.ocultarAvisoEdicionSinSeleccion === true;
  }

  toggleMensajesEmergentes(event: any) {
    const habilitado = event.detail.checked;
    this.mostrarMensajesEmergentes = habilitado;
    this.dataService.updateUIState({ mostrarMensajesEmergentes: habilitado });
    Logger.log(`🔔 [Sistema] Mensajes emergentes ${habilitado ? 'habilitados' : 'deshabilitados'}`);
  }

  toggleAvisoEdicion(event: any) {
    const ocultar = !event.detail.checked; // Si el toggle está ON, NO queremos ocultar (ocultar = false)
    this.ocultarAvisoEdicionSinSeleccion = ocultar;
    this.dataService.updateUIState({ ocultarAvisoEdicionSinSeleccion: ocultar });
    Logger.log(`📢 [Sistema] Aviso de selección de curso ${!ocultar ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Toggle tab animations preference
   */
  toggleTabAnimations(event: any) {
    const enabled = event.detail.checked;
    this.preferencesService.setTabAnimations(enabled);
    Logger.log(`🎨 [Sistema] Animaciones de tabs ${enabled ? 'habilitadas' : 'deshabilitadas'}`);
  }

  incrementarDuracion() {
    if (this.duracionToast < 4) {
      this.duracionToast++;
      this.guardarDuracionToast();
    }
  }

  decrementarDuracion() {
    if (this.duracionToast > 1) {
      this.duracionToast--;
      this.guardarDuracionToast();
    }
  }

  private guardarDuracionToast() {
    this.dataService.updateUIState({ duracionToast: this.duracionToast });
    Logger.log(`⏱️ [Sistema] Duración de toast: ${this.duracionToast}s`);
  }

  private async detectarPlataforma() {
    const platform = Capacitor.getPlatform();
    this.storageInfo.platform = platform === 'web' ? 'web' : 'mobile';
    this.storageInfo.storage = platform === 'web' ? 'ionic-storage' : 'sqlite';
  }

  async exportarBaseDatosCompleta() {
    try {
      const backup = this.backupService.createBackup({
        cursos: this.dataService.getCursos(),
        evaluaciones: this.dataService.getAllEvaluaciones(),
        ui: this.dataService.getUIState(),
        rubricas: {} // Se obtendrá del observable
      });

      const fecha = new Date().toISOString().split('T')[0];
      this.backupService.downloadBackup(backup, `backup_completo_${fecha}.json`);

      await this.toastService.success('Base de datos exportada exitosamente');
    } catch (error) {
      Logger.error('Error exportando base de datos:', error);
      await this.toastService.error('Error al exportar base de datos');
    }
  } onBaseDatosFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.importarBaseDatosCompleta(file);
    }
  }

  private async importarBaseDatosCompleta(file: File) {
    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const contenido = e.target?.result as string;
          const backup = await this.backupService.parseBackup(contenido);

          // Validar backup
          if (!this.backupService.validateBackup(backup)) {
            throw new Error('Formato de backup inválido');
          }

          // Importar datos usando el método correcto
          await this.dataService.importarDatos(contenido);

          await this.toastService.success('Base de datos importada exitosamente');
        } catch (error) {
          Logger.error('Error procesando backup:', error);
          await this.toastService.error('Error al procesar archivo de backup');
        }
      };

      reader.onerror = async () => {
        await this.toastService.error('Error al leer archivo');
      };

      reader.readAsText(file);
    } catch (error) {
      Logger.error('Error importando base de datos:', error);
      await this.toastService.error('Error al importar base de datos');
    }
  } async limpiarBaseDatosEstadoCero() {
    const alert = await this.alertController.create({
      header: 'Confirmar Limpieza',
      message: '¿Estás seguro de eliminar todas las evaluaciones y estados? Los cursos y estudiantes no se verán afectados.',
      cssClass: 'premium-alert premium-alert--danger',
      buttons: [
        {
          text: '<ion-icon name="close-circle"></ion-icon> Cancelar',
          role: 'cancel'
        },
        {
          text: '<ion-icon name="trash"></ion-icon> Limpiar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.dataService.limpiarBaseDatosEstadoCero();
              await this.toastService.success('Base de datos limpiada exitosamente');
            } catch (error) {
              Logger.error('Error limpiando base de datos:', error);
              await this.toastService.error('Error al limpiar base de datos');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Limpia la caché del Service Worker (PWA)
   * Solo afecta archivos estáticos cacheados, NO los datos de usuario
   */
  async limpiarCachePWA() {
    const alert = await this.alertController.create({
      header: 'Limpiar Caché PWA',
      message: 'Esto eliminará los archivos cacheados de la aplicación. Los datos (cursos, evaluaciones, rúbricas) NO se verán afectados. La app necesitará conexión a internet para recargar los recursos.',
      cssClass: 'premium-alert premium-alert--warning',
      buttons: [
        {
          text: '<ion-icon name="close-circle"></ion-icon> Cancelar',
          role: 'cancel'
        },
        {
          text: '<ion-icon name="brush"></ion-icon> Limpiar Caché',
          role: 'destructive',
          handler: async () => {
            try {
              let cachesCleaned = 0;
              let swUnregistered = 0;

              // Limpiar todas las cachés del navegador
              if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames.map(async (name) => {
                    await caches.delete(name);
                    cachesCleaned++;
                  })
                );
              }

              // Desregistrar Service Workers
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                  registrations.map(async (reg) => {
                    await reg.unregister();
                    swUnregistered++;
                  })
                );
              }

              await this.toastService.success(`Caché limpiada: ${cachesCleaned} cachés, ${swUnregistered} Service Workers. Recargando...`);

              // Recargar la página después de un breve delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);

            } catch (error) {
              Logger.error('Error limpiando caché PWA:', error);
              await this.toastService.error('Error al limpiar caché PWA');
            }
          }
        }
      ]
    });

    await alert.present();
  }
}

