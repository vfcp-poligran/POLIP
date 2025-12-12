import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  ToastController,
  AlertController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  schoolOutline,
  checkmarkCircle,
  documentTextOutline,
  calendarOutline,
  downloadOutline,
  analyticsOutline,
  refreshOutline,
  barChartOutline,
  documentOutline,
  folderOutline,
  trashOutline,
  listOutline,
  personOutline,
  mailOutline,
  trophyOutline,
  ribbonOutline,
  fingerPrintOutline,
  starOutline,
  gridOutline,
  eyeOffOutline,
  keyOutline,
  peopleOutline,
  documentAttachOutline,
  micOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';

interface CsvTabla {
  headers: string[];
  filas: string[][];
}

interface ArchivoCalificacionesVisualizacion {
  nombre: string;
  fechaCarga: string;
  contenidoOriginal: string;
  calificaciones: Array<{
    id: string;
    e1: string;
    e2: string;
    ef: string;
  }>;
}

@Component({
  selector: 'app-calificaciones',
  templateUrl: './calificaciones.page.html',
  styleUrls: ['./calificaciones.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel
  ]
})
export class CalificacionesPage implements OnInit, OnDestroy, ViewWillEnter {
  private dataService = inject(DataService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  cursoCalificacionesSeleccionado: string | null = null;
  csvCalificacionesTabla: CsvTabla | null = null;
  archivoCalificacionesVisualizacion: ArchivoCalificacionesVisualizacion | null = null;

  // Caché de cursos con calificaciones (optimización)
  cursosConCalificaciones: Array<{
    codigo: string;
    nombre: string;
    bloque: string;
    archivoCalificaciones: {
      nombre: string;
      fechaCarga: string;
      contenidoOriginal: string;
      calificaciones: Array<{
        id: string;
        e1: string;
        e2: string;
        ef: string;
      }>;
    };
  }> = [];

  // Suscripciones para limpiar en ngOnDestroy
  private subscriptions: Subscription[] = [];
  private isInitialized = false;

  constructor() {
    addIcons({
      folderOutline,
      schoolOutline,
      checkmarkCircle,
      documentTextOutline,
      calendarOutline,
      downloadOutline,
      trashOutline,
      documentOutline,
      analyticsOutline,
      refreshOutline,
      barChartOutline,
      listOutline,
      personOutline,
      mailOutline,
      trophyOutline,
      ribbonOutline,
      fingerPrintOutline,
      starOutline,
      gridOutline,
      eyeOffOutline,
      keyOutline,
      peopleOutline,
      documentAttachOutline,
      micOutline
    });
  }

  ngOnInit() {
    // Inicialización única (suscripciones, etc.)
    // Suscribirse a cambios en UIState
    const sub = this.dataService.uiState$.subscribe(() => {
      this.actualizarCursosConCalificaciones();
    });

    this.subscriptions.push(sub);
  }

  ionViewWillEnter() {
    // Recargar datos cada vez que la vista entra
    this.actualizarCursosConCalificaciones();
  }

  ngOnDestroy() {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.isInitialized = false;
  }

  private actualizarCursosConCalificaciones(): void {
    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    this.cursosConCalificaciones = Object.entries(courseStates)
      .filter(([_, state]) => state.archivoCalificaciones?.nombre)
      .map(([nombreCurso, state]) => ({
        codigo: state.metadata?.codigo || nombreCurso,
        nombre: state.metadata?.nombre || nombreCurso,
        bloque: state.metadata?.bloque || '',
        archivoCalificaciones: state.archivoCalificaciones!
      }));
  }

  async seleccionarCursoCalificaciones(codigo: string) {
    this.cursoCalificacionesSeleccionado = codigo;
    await this.cargarCalificacionesVisualizacion(codigo);
  }

  private async cargarCalificacionesVisualizacion(codigo: string) {
    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    // Buscar curso por código en metadata
    const cursoEntry = Object.entries(courseStates).find(
      ([_, state]) => state.metadata?.codigo === codigo
    );

    if (!cursoEntry || !cursoEntry[1].archivoCalificaciones) {
      this.csvCalificacionesTabla = null;
      this.archivoCalificacionesVisualizacion = null;
      return;
    }

    this.archivoCalificacionesVisualizacion = cursoEntry[1].archivoCalificaciones;

    // Parsear CSV original para construir tabla
    const contenido = cursoEntry[1].archivoCalificaciones.contenidoOriginal;
    const lineas = contenido.split('\n').filter((l: string) => l.trim());

    if (lineas.length > 0) {
      // Parser CSV que respeta comillas
      const parsearLineaCSV = (linea: string): string[] => {
        const resultado: string[] = [];
        let dentroComillas = false;
        let valorActual = '';

        for (let i = 0; i < linea.length; i++) {
          const char = linea[i];
          if (char === '"') {
            dentroComillas = !dentroComillas;
          } else if (char === ',' && !dentroComillas) {
            resultado.push(valorActual.trim());
            valorActual = '';
          } else {
            valorActual += char;
          }
        }
        resultado.push(valorActual.trim());
        return resultado;
      };

      const headersCompletos = parsearLineaCSV(lineas[0]);
      const filasCompletas = lineas.slice(1).map((linea: string) => parsearLineaCSV(linea));

      // Filtrar columnas según criterios
      const indicesColumnasMostrar: number[] = [];
      const headersFiltrados: string[] = [];

      headersCompletos.forEach((header: string, index: number) => {
        if (this.debesMostrarColumna(header)) {
          indicesColumnasMostrar.push(index);
          headersFiltrados.push(header);
        }
      });

      // Filtrar filas
      const filasFiltradas = filasCompletas.map((fila: string[]) =>
        indicesColumnasMostrar.map((index: number) => fila[index] || '')
      );

      this.csvCalificacionesTabla = {
        headers: headersFiltrados,
        filas: filasFiltradas
      };
    }
  }

  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerNombreCursoSeleccionado(): string {
    if (!this.cursoCalificacionesSeleccionado) return '';
    const curso = this.cursosConCalificaciones.find(c => c.codigo === this.cursoCalificacionesSeleccionado);
    return curso?.nombre || '';
  }

  obtenerCodigoCursoSeleccionado(): string {
    if (!this.cursoCalificacionesSeleccionado) return '';
    const curso = this.cursosConCalificaciones.find(c => c.codigo === this.cursoCalificacionesSeleccionado);
    return curso?.codigo || '';
  }

  async exportarCalificaciones(codigo: string) {
    try {
      const curso = this.cursosConCalificaciones.find(c => c.codigo === codigo);
      if (!curso) return;

      // Exportar CSV original idéntico para compatibilidad total con Canvas
      const csvContent = curso.archivoCalificaciones.contenidoOriginal;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calificaciones_${codigo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      const toast = await this.toastController.create({
        message: 'Calificaciones exportadas exitosamente',
        duration: 2000,
        color: 'success',
        position: 'top',
        icon: 'checkmark-circle'
      });
      await toast.present();
    } catch (error) {
      console.error('Error exportando calificaciones:', error);

      const toast = await this.toastController.create({
        message: 'Error al exportar calificaciones',
        duration: 3000,
        color: 'danger',
        position: 'top',
        icon: 'alert-circle'
      });
      await toast.present();
    }
  }

  async eliminarArchivoCalificacionesCurso(codigo: string) {
    await this.eliminarCalificaciones(codigo);
  }

  async refrescarVistaCalificaciones() {
    if (this.cursoCalificacionesSeleccionado) {
      await this.recargarCalificaciones(this.cursoCalificacionesSeleccionado);
    }
  }

  private async eliminarCalificaciones(codigo: string) {
    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación de Calificaciones',
      message: '¿Estás seguro de eliminar el archivo de calificaciones de Canvas?<br><br><strong>Nota:</strong> Esta acción solo elimina el archivo cargado. Las evaluaciones realizadas con rúbricas se mantienen intactas.<br><br>Podrás volver a cargar otro archivo más tarde.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              const uiState = this.dataService.getUIState();
              const courseStates = uiState.courseStates || {};

              // Buscar el curso por código
              const cursoEntry = Object.entries(courseStates).find(
                ([_, state]) => state.metadata?.codigo === codigo
              );

              if (cursoEntry) {
                const [nombreCurso, _] = cursoEntry;

                // Actualizar el estado del curso eliminando el archivo
                await this.dataService.updateCourseState(nombreCurso, {
                  archivoCalificaciones: undefined
                });

                // Limpiar visualización
                if (this.cursoCalificacionesSeleccionado === codigo) {
                  this.cursoCalificacionesSeleccionado = null;
                  this.csvCalificacionesTabla = null;
                  this.archivoCalificacionesVisualizacion = null;
                }

                const toast = await this.toastController.create({
                  message: 'Archivo de calificaciones eliminado',
                  duration: 2000,
                  color: 'success',
                  position: 'top',
                  icon: 'checkmark-circle'
                });
                await toast.present();
              }
            } catch (error) {
              console.error('Error eliminando archivo:', error);

              const toast = await this.toastController.create({
                message: 'Error al eliminar archivo',
                duration: 3000,
                color: 'danger',
                position: 'top',
                icon: 'alert-circle'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async recargarCalificaciones(codigo: string) {
    await this.cargarCalificacionesVisualizacion(codigo);

    const toast = await this.toastController.create({
      message: 'Calificaciones recargadas',
      duration: 1500,
      color: 'success',
      position: 'top',
      icon: 'refresh-outline'
    });
    await toast.present();
  }

  // Método para determinar si una columna debe mostrarse
  private debesMostrarColumna(header: string): boolean {
    const headerLower = header.toLowerCase();

    // Columnas exactas requeridas
    if (header === 'Student' || header === 'ID' || header === 'SIS Login ID' || header === 'Section') {
      return true;
    }

    // Columnas que contienen palabras clave específicas
    if (headerLower.includes('entrega proyecto 1') ||
      headerLower.includes('escenario 3')) {
      return true;
    }

    if (headerLower.includes('entrega proyecto 2') ||
      headerLower.includes('escenario 5')) {
      return true;
    }

    if (headerLower.includes('entrega final') ||
      headerLower.includes('sustentacion') ||
      headerLower.includes('escenario 7') ||
      headerLower.includes('escenario 8')) {
      return true;
    }

    if (headerLower.includes('tareas') &&
      (headerLower.includes('current') || headerLower.includes('final'))) {
      return true;
    }

    return false;
  }

  // Métodos helper para tabla
  obtenerIconoHeader(header: string): string {
    const headerLower = header.toLowerCase();

    if (header === 'Student' || headerLower.includes('student') || headerLower.includes('nombre')) {
      return 'person-outline';
    }
    if (header === 'ID' || (headerLower.includes('id') && !headerLower.includes('login') && !headerLower.includes('sis'))) {
      return 'finger-print-outline';
    }
    if (header === 'SIS Login ID' || headerLower.includes('sis') || headerLower.includes('login')) {
      return 'key-outline';
    }
    if (header === 'Section' || headerLower.includes('section')) {
      return 'people-outline';
    }
    if (headerLower.includes('entrega') || headerLower.includes('proyecto')) {
      return 'document-attach-outline';
    }
    if (headerLower.includes('tareas')) {
      return 'list-outline';
    }
    if (headerLower.includes('final')) {
      return 'trophy-outline';
    }
    if (headerLower.includes('current')) {
      return 'ribbon-outline';
    }
    if (headerLower.includes('sustentacion')) {
      return 'mic-outline';
    }
    if (!isNaN(parseFloat(header)) ||
      headerLower.includes('points') ||
      headerLower.includes('score')) {
      return 'star-outline';
    }

    return 'document-text-outline';
  }

  esColumnaNumerico(header: string): boolean {
    const headerLower = header.toLowerCase();
    // No es numérica si es Student, Section, SIS Login ID
    if (header === 'Student' || header === 'Section' || header === 'SIS Login ID') {
      return false;
    }
    // ID sí es numérica
    if (header === 'ID') {
      return true;
    }
    // Columnas con puntos o entregas son numéricas
    return !isNaN(parseFloat(header)) ||
      headerLower.includes('points') ||
      headerLower.includes('score') ||
      headerLower.includes('grade') ||
      headerLower.includes('pts') ||
      headerLower.includes('entrega') ||
      headerLower.includes('proyecto') ||
      headerLower.includes('tareas') ||
      headerLower.includes('sustentacion');
  }

  esNumerico(valor: string): boolean {
    if (!valor || valor.trim() === '' || valor === '-') return false;
    return !isNaN(parseFloat(valor)) && isFinite(parseFloat(valor));
  }

  esCalificacionAlta(valor: string): boolean {
    if (!this.esNumerico(valor)) return false;
    const num = parseFloat(valor);
    return num >= 90;
  }

  esCalificacionBaja(valor: string): boolean {
    if (!this.esNumerico(valor)) return false;
    const num = parseFloat(valor);
    return num > 0 && num <= 50;
  }
}
