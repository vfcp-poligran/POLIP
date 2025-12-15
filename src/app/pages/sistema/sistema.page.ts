import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  serverOutline,
  desktopOutline,
  phonePortraitOutline,
  buildOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  trashOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  warningOutline,
  logoAngular,
  logoJavascript,
  cloudOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { BackupService } from '../../services/backup.service';
import { UnifiedStorageService } from '../../services/unified-storage.service';
import { Capacitor } from '@capacitor/core';

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
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonBadge
  ]
})
export class SistemaPage implements OnInit {
  private dataService = inject(DataService);
  private backupService = inject(BackupService);
  private unifiedStorageService = inject(UnifiedStorageService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  @ViewChild('fileInputDB') fileInputDB!: ElementRef<HTMLInputElement>;

  storageInfo = {
    platform: 'web',
    storage: 'ionic-storage'
  };

  constructor() {
    addIcons({
      serverOutline,
      desktopOutline,
      phonePortraitOutline,
      buildOutline,
      cloudDownloadOutline,
      cloudUploadOutline,
      trashOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
      checkmarkCircle,
      warningOutline,
      logoAngular,
      logoJavascript,
      cloudOutline
    });
  }

  async ngOnInit() {
    await this.detectarPlataforma();
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

      const toast = await this.toastController.create({
        message: 'Base de datos exportada exitosamente',
        duration: 2000,
        color: 'success',
        position: 'top',
        cssClass: 'toast-success'
      });
      await toast.present();
    } catch (error) {
      Logger.error('Error exportando base de datos:', error);

      const toast = await this.toastController.create({
        message: 'Error al exportar base de datos',
        duration: 3000,
        color: 'danger',
        position: 'top',
        cssClass: 'toast-danger'
      });
      await toast.present();
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

          const toast = await this.toastController.create({
            message: 'Base de datos importada exitosamente',
            duration: 2000,
            color: 'success',
            position: 'top',
            cssClass: 'toast-success'
          });
          await toast.present();
        } catch (error) {
          Logger.error('Error procesando backup:', error);

          const toast = await this.toastController.create({
            message: 'Error al procesar archivo de backup',
            duration: 3000,
            color: 'danger',
            position: 'top',
            cssClass: 'toast-danger'
          });
          await toast.present();
        }
      };

      reader.onerror = async () => {
        const toast = await this.toastController.create({
          message: 'Error al leer archivo',
          duration: 3000,
          color: 'danger',
          position: 'top',
          cssClass: 'toast-danger'
        });
        await toast.present();
      };

      reader.readAsText(file);
    } catch (error) {
      Logger.error('Error importando base de datos:', error);

      const toast = await this.toastController.create({
        message: 'Error al importar base de datos',
        duration: 3000,
        color: 'danger',
        position: 'top',
        cssClass: 'toast-danger'
      });
      await toast.present();
    }
  } async limpiarBaseDatosEstadoCero() {
    const alert = await this.alertController.create({
      header: 'Confirmar Limpieza',
      message: '¿Estás seguro de eliminar todas las evaluaciones y estados? Los cursos y estudiantes no se verán afectados.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Limpiar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.dataService.limpiarBaseDatosEstadoCero();

              const toast = await this.toastController.create({
                message: 'Base de datos limpiada exitosamente',
                duration: 2000,
                color: 'success',
                position: 'top',
                cssClass: 'toast-success'
              });
              await toast.present();
            } catch (error) {
              Logger.error('Error limpiando base de datos:', error);

              const toast = await this.toastController.create({
                message: 'Error al limpiar base de datos',
                duration: 3000,
                color: 'danger',
                position: 'top',
                cssClass: 'toast-danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}

