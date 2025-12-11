import { Injectable } from '@angular/core';
import { AppBackup } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  constructor() { }

  /**
   * Crea un backup completo de la aplicación
   */
  createBackup(data: {
    cursos: any;
    evaluaciones: any;
    ui: any;
    rubricas: any;
  }): AppBackup {
    return {
      ...data,
      version: '1.0.0',
      fechaExportacion: new Date()
    };
  }

  /**
   * Parsea un archivo JSON de backup
   */
  parseBackup(jsonContent: string): Promise<AppBackup> {
    return new Promise((resolve, reject) => {
      try {
        const backup: AppBackup = JSON.parse(jsonContent);
        
        // Validación básica del formato
        if (!backup.cursos || !backup.evaluaciones) {
          reject(new Error('Formato de backup inválido'));
          return;
        }

        resolve(backup);
      } catch (error) {
        reject(new Error('Error al parsear el archivo JSON'));
      }
    });
  }

  /**
   * Descarga un archivo JSON de backup
   */
  downloadBackup(backup: AppBackup, filename: string = 'backup_completo.json') {
    const jsonContent = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida la estructura de un backup
   */
  validateBackup(backup: any): boolean {
    return (
      backup &&
      typeof backup === 'object' &&
      backup.cursos &&
      backup.evaluaciones &&
      backup.version
    );
  }
}