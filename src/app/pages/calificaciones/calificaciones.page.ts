import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
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
  // Iconos filled
  school,
  folder,
  documentText,
  download,
  trash,
  people,
  pencil,
  statsChart,
  ribbon,
  // Iconos outline
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
  micOutline,
  createOutline
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';

interface CsvTabla {
  headers: string[];
  filas: string[][];
  indicesOriginales: number[]; // Para mapear a columnas originales del CSV
  indiceIdOriginal: number; // Índice de la columna ID en el CSV original
}

interface FilaCalificacionCompleta {
  valores: string[]; // Todos los valores de la fila del CSV
  filaOriginalIndex: number; // Índice de la fila en el CSV original
  grupo: string; // Grupo obtenido del curso (columna adicional)
}

interface FilaCalificacion {
  studentId: string; // ID de Canvas
  student: string;
  grupo: string; // Obtenido del curso
  e1: string;
  e2: string;
  ef: string;
  tareasFinal: string;
  // Índices originales para actualizar CSV
  indiceE1: number;
  indiceE2: number;
  indiceEF: number;
  indiceTareasFinal: number;
  filaOriginalIndex: number; // Índice de la fila en el CSV original
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

  // Tabla de calificaciones estructurada para edición
  filasCalificaciones: FilaCalificacion[] = [];

  // Tabla completa con todas las columnas del CSV
  filasCompletas: FilaCalificacionCompleta[] = [];

  // Headers personalizados para la vista
  headersVista: string[] = ['Estudiante', 'Grupo', 'Entrega 1', 'Entrega 2', 'Entrega Final', 'Tareas Final'];

  // Columnas ocultas (para implementar más adelante)
  columnasOcultas: Set<number> = new Set();

  // Índice de la columna ID para identificar estudiantes
  indiceColumnId: number = -1;

  // Para edición inline
  celdaEditando: { filaIndex: number; campo: string } | null = null;
  valorEditando: string = '';

  // Datos del CSV original para mantener estructura al exportar
  csvOriginalLineas: string[] = [];
  csvOriginalHeaders: string[] = [];

  // Caché de cursos con calificaciones (optimización)
  cursosConCalificaciones: Array<{
    codigo: string;
    nombre: string;
    bloque: string;
    codigoUnico: string;
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
      // Iconos filled
      school, folder, documentText, download, trash, people, pencil, statsChart, ribbon,
      // Iconos outline (para fallback)
      schoolOutline, folderOutline, documentTextOutline, downloadOutline, trashOutline,
      peopleOutline, createOutline, barChartOutline, checkmarkCircle, calendarOutline,
      documentOutline, analyticsOutline, refreshOutline, listOutline, personOutline,
      mailOutline, trophyOutline, ribbonOutline, fingerPrintOutline, starOutline,
      gridOutline, eyeOffOutline, keyOutline, documentAttachOutline, micOutline
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
        codigoUnico: nombreCurso, // El nombre clave del curso (código único)
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
      this.filasCalificaciones = [];
      return;
    }

    const [codigoUnico, courseState] = cursoEntry;

    // Verificar que existe archivo de calificaciones
    if (!courseState.archivoCalificaciones) {
      this.csvCalificacionesTabla = null;
      this.archivoCalificacionesVisualizacion = null;
      this.filasCalificaciones = [];
      return;
    }

    this.archivoCalificacionesVisualizacion = courseState.archivoCalificaciones;

    // Obtener estudiantes del curso para mapear grupos
    const estudiantesCurso = this.dataService.getCurso(codigoUnico) || [];
    const mapaGrupos = new Map<string, string>();
    estudiantesCurso.forEach(est => {
      if (est.canvasUserId) {
        mapaGrupos.set(est.canvasUserId, est.grupo || '-');
      }
    });

    // Parsear CSV original
    const contenido = courseState.archivoCalificaciones.contenidoOriginal;
    this.csvOriginalLineas = contenido.split('\n');

    if (this.csvOriginalLineas.length === 0) {
      this.filasCalificaciones = [];
      return;
    }

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

    this.csvOriginalHeaders = parsearLineaCSV(this.csvOriginalLineas[0]);

    // Guardar índice de columna ID
    const indiceId = this.csvOriginalHeaders.findIndex(h => h === 'ID');
    this.indiceColumnId = indiceId;

    // Encontrar índices de columnas importantes para cálculos
    const indiceStudent = this.csvOriginalHeaders.findIndex(h => h === 'Student');
    const indiceE1 = this.csvOriginalHeaders.findIndex(h =>
      h.toLowerCase().includes('entrega proyecto 1') || h.toLowerCase().includes('escenario 3'));
    const indiceE2 = this.csvOriginalHeaders.findIndex(h =>
      h.toLowerCase().includes('entrega proyecto 2') || h.toLowerCase().includes('escenario 5'));
    const indiceEF = this.csvOriginalHeaders.findIndex(h =>
      h.toLowerCase().includes('entrega final') || h.toLowerCase().includes('escenario 7'));
    const indiceTareasFinal = this.csvOriginalHeaders.findIndex(h =>
      h.toLowerCase().includes('tareas') && h.toLowerCase().includes('final points'));

    // Construir filas completas con todas las columnas del CSV
    this.filasCompletas = [];
    this.filasCalificaciones = [];

    for (let i = 2; i < this.csvOriginalLineas.length; i++) {
      const linea = this.csvOriginalLineas[i];
      if (!linea.trim()) continue;

      const valores = parsearLineaCSV(linea);
      const studentId = valores[indiceId] || '';
      const grupo = mapaGrupos.get(studentId) || '-';

      // Agregar fila completa
      this.filasCompletas.push({
        valores,
        filaOriginalIndex: i,
        grupo
      });

      // Mantener compatibilidad con estructura anterior
      this.filasCalificaciones.push({
        studentId,
        student: valores[indiceStudent] || '',
        grupo,
        e1: indiceE1 >= 0 ? (valores[indiceE1] || '') : '',
        e2: indiceE2 >= 0 ? (valores[indiceE2] || '') : '',
        ef: indiceEF >= 0 ? (valores[indiceEF] || '') : '',
        tareasFinal: indiceTareasFinal >= 0 ? (valores[indiceTareasFinal] || '') : '',
        indiceE1,
        indiceE2,
        indiceEF,
        indiceTareasFinal,
        filaOriginalIndex: i
      });
    }

    // Compatibilidad con vista anterior
    this.csvCalificacionesTabla = {
      headers: this.headersVista,
      filas: this.filasCalificaciones.map(f => [f.student, f.grupo, f.e1, f.e2, f.ef, f.tareasFinal]),
      indicesOriginales: [indiceStudent, -1, indiceE1, indiceE2, indiceEF, indiceTareasFinal],
      indiceIdOriginal: indiceId
    };
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

      // IMPORTANTE: Usar csvOriginalLineas que contiene los valores actualizados
      // Este array se actualiza cada vez que se edita una celda mediante actualizarLineaCSV()
      if (this.csvOriginalLineas.length === 0) {
        const toast = await this.toastController.create({
          message: 'No hay datos para exportar',
          duration: 2000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();
        return;
      }

      // Debug: mostrar información del CSV
      Logger.log(`Exportando CSV con ${this.csvOriginalLineas.length} líneas`);
      Logger.log('Primera línea (headers):', this.csvOriginalLineas[0]?.substring(0, 100));
      if (this.csvOriginalLineas.length > 3) {
        Logger.log('Muestra línea 3:', this.csvOriginalLineas[3]?.substring(0, 150));
      }

      // Reconstruir el CSV desde csvOriginalLineas (ya tiene los valores actualizados)
      const csvActualizado = this.csvOriginalLineas.join('\n');

      // Canvas LMS NO acepta BOM, exportar sin él
      const blob = new Blob([csvActualizado], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Usar el mismo nombre del archivo original para fácil reimportación a Canvas
      a.download = curso.archivoCalificaciones.nombre || `calificaciones_${codigo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      const toast = await this.toastController.create({
        message: `Calificaciones exportadas (${this.csvOriginalLineas.length} filas)`,
        duration: 2000,
        color: 'success',
        position: 'top',
        icon: 'checkmark-circle'
      });
      await toast.present();
    } catch (error) {
      Logger.error('Error exportando calificaciones:', error);

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

  /**
   * Reconstruye el CSV original con los valores actualizados de calificaciones
   */
  private reconstruirCSVConValoresActualizados(): string {
    if (this.csvOriginalLineas.length === 0) return '';

    const lineasActualizadas = [...this.csvOriginalLineas];

    // Parser CSV
    const parsearLineaCSV = (linea: string): string[] => {
      const resultado: string[] = [];
      let dentroComillas = false;
      let valorActual = '';

      for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        if (char === '"') {
          dentroComillas = !dentroComillas;
        } else if (char === ',' && !dentroComillas) {
          resultado.push(valorActual);
          valorActual = '';
        } else {
          valorActual += char;
        }
      }
      resultado.push(valorActual);
      return resultado;
    };

    // Reconstruir línea CSV respetando comillas
    const reconstruirLineaCSV = (valores: string[]): string => {
      return valores.map(v => {
        // Si el valor contiene coma o comillas, envolverlo en comillas
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      }).join(',');
    };

    // Actualizar cada fila con los valores editados
    for (const fila of this.filasCalificaciones) {
      if (fila.filaOriginalIndex < lineasActualizadas.length) {
        const valoresOriginales = parsearLineaCSV(lineasActualizadas[fila.filaOriginalIndex]);

        // Actualizar valores de calificaciones
        if (fila.indiceE1 >= 0 && fila.indiceE1 < valoresOriginales.length) {
          valoresOriginales[fila.indiceE1] = fila.e1;
        }
        if (fila.indiceE2 >= 0 && fila.indiceE2 < valoresOriginales.length) {
          valoresOriginales[fila.indiceE2] = fila.e2;
        }
        if (fila.indiceEF >= 0 && fila.indiceEF < valoresOriginales.length) {
          valoresOriginales[fila.indiceEF] = fila.ef;
        }
        if (fila.indiceTareasFinal >= 0 && fila.indiceTareasFinal < valoresOriginales.length) {
          valoresOriginales[fila.indiceTareasFinal] = fila.tareasFinal;
        }

        lineasActualizadas[fila.filaOriginalIndex] = reconstruirLineaCSV(valoresOriginales);
      }
    }

    return lineasActualizadas.join('\n');
  }

  // ============================================
  // MÉTODOS DE EDICIÓN INLINE
  // ============================================

  /**
   * Inicia la edición de una celda
   */
  iniciarEdicion(filaIndex: number, campo: string): void {
    const fila = this.filasCalificaciones[filaIndex];
    if (!fila) return;

    // Solo permitir editar columnas de calificación
    if (!['e1', 'e2', 'ef', 'tareasFinal'].includes(campo)) return;

    this.celdaEditando = { filaIndex, campo };
    this.valorEditando = (fila as any)[campo] || '';
  }

  /**
   * Guarda el valor editado
   */
  async guardarEdicion(): Promise<void> {
    if (!this.celdaEditando) return;

    const { filaIndex, campo } = this.celdaEditando;
    const fila = this.filasCalificaciones[filaIndex];

    if (fila) {
      // Actualizar valor en la fila
      (fila as any)[campo] = this.valorEditando;

      // Recalcular Tareas Final si se modificó e1, e2 o ef
      if (['e1', 'e2', 'ef'].includes(campo)) {
        fila.tareasFinal = this.calcularTareasFinal(fila);
      }

      // Actualizar también en el archivo de calificaciones almacenado
      await this.actualizarCalificacionEnStorage(fila);

      const toast = await this.toastController.create({
        message: 'Calificación actualizada',
        duration: 1500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    }

    this.cancelarEdicion();
  }

  /**
   * Calcula el valor de Tareas Final (suma de E1 + E2 + EF)
   */
  private calcularTareasFinal(fila: FilaCalificacion): string {
    const e1 = parseFloat(fila.e1) || 0;
    const e2 = parseFloat(fila.e2) || 0;
    const ef = parseFloat(fila.ef) || 0;

    const total = e1 + e2 + ef;

    // Si todas son 0 o vacías, devolver vacío
    if (total === 0 && !fila.e1 && !fila.e2 && !fila.ef) {
      return '';
    }

    // Formatear con 2 decimales si tiene decimales, sino sin decimales
    return total % 1 === 0 ? total.toString() : total.toFixed(2);
  }

  /**
   * Cancela la edición actual
   */
  cancelarEdicion(): void {
    this.celdaEditando = null;
    this.valorEditando = '';
  }

  /**
   * Verifica si una celda está siendo editada
   */
  estaEditando(filaIndex: number, campo: string): boolean {
    return this.celdaEditando?.filaIndex === filaIndex && this.celdaEditando?.campo === campo;
  }

  /**
   * Maneja teclas especiales durante edición
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.guardarEdicionCelda();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelarEdicion();
    }
  }

  /**
   * Actualiza la calificación en el storage
   */
  private async actualizarCalificacionEnStorage(fila: FilaCalificacion): Promise<void> {
    if (!this.cursoCalificacionesSeleccionado) return;

    const curso = this.cursosConCalificaciones.find(c => c.codigo === this.cursoCalificacionesSeleccionado);
    if (!curso) return;

    // Reconstruir el CSV actualizado
    const csvActualizado = this.reconstruirCSVConValoresActualizados();

    // Actualizar las calificaciones procesadas también
    const calificacionesActualizadas = curso.archivoCalificaciones.calificaciones.map(cal => {
      if (cal.id === fila.studentId) {
        return {
          ...cal,
          e1: fila.e1,
          e2: fila.e2,
          ef: fila.ef
        };
      }
      return cal;
    });

    // Actualizar en el CourseState
    await this.dataService.updateCourseState(curso.codigoUnico, {
      archivoCalificaciones: {
        ...curso.archivoCalificaciones,
        contenidoOriginal: csvActualizado,
        calificaciones: calificacionesActualizadas
      }
    });
  }

  /**
   * Obtiene el valor de una celda para mostrar
   */
  obtenerValorCelda(fila: FilaCalificacion, campo: string): string {
    return (fila as any)[campo] || '-';
  }

  /**
   * Verifica si un campo es editable (basado en índice de columna)
   */
  esEditable(campo: string): boolean {
    return ['e1', 'e2', 'ef', 'tareasFinal'].includes(campo);
  }

  /**
   * Verifica si una columna por índice es editable (numérica)
   */
  esColumnaEditable(indiceColumna: number): boolean {
    // Columnas no editables: Student, ID, SIS Login ID, Section
    const columnasNoEditables = ['Student', 'ID', 'SIS Login ID', 'Section'];
    const header = this.csvOriginalHeaders[indiceColumna];
    return !columnasNoEditables.includes(header);
  }

  /**
   * Verifica si una columna está oculta
   */
  esColumnaOculta(indiceColumna: number): boolean {
    return this.columnasOcultas.has(indiceColumna);
  }

  /**
   * Obtiene los headers visibles (columnas específicas)
   * Índices: 0=Student, 4=E1, 5=E2, 6=EF, 24=Final Score
   */
  getHeadersVisibles(): { header: string; indice: number }[] {
    // Columnas visibles: Student (0), las 3 entregas (4, 5, 6), y Final Score (24)
    const columnasVisibles = [0, 4, 5, 6, 24];
    return this.csvOriginalHeaders
      .map((header, indice) => ({ header, indice }))
      .filter(col => columnasVisibles.includes(col.indice) && !this.columnasOcultas.has(col.indice));
  }

  /**
   * Inicia la edición de una celda en la tabla completa
   */
  iniciarEdicionCelda(filaIndex: number, columnaIndex: number): void {
    if (!this.esColumnaEditable(columnaIndex)) return;

    this.celdaEditando = { filaIndex, campo: columnaIndex.toString() };
    this.valorEditando = this.filasCompletas[filaIndex]?.valores[columnaIndex] || '';
  }

  /**
   * Guarda la edición de una celda en la tabla completa
   * Las calificaciones se almacenan con formato de 2 decimales
   */
  async guardarEdicionCelda(): Promise<void> {
    if (!this.celdaEditando) return;

    const filaIndex = this.celdaEditando.filaIndex;
    const columnaIndex = parseInt(this.celdaEditando.campo);
    const fila = this.filasCompletas[filaIndex];

    if (fila && !isNaN(columnaIndex)) {
      // Formatear valor con 2 decimales si es numérico
      let valorFormateado = this.valorEditando.trim();
      const valorNumerico = parseFloat(valorFormateado);
      if (!isNaN(valorNumerico)) {
        valorFormateado = valorNumerico.toFixed(2);
      }

      // Actualizar valor en la fila completa
      fila.valores[columnaIndex] = valorFormateado;

      // Actualizar la línea original del CSV
      this.actualizarLineaCSV(fila.filaOriginalIndex, columnaIndex, valorFormateado);

      // Recalcular columnas calculadas si se modificó una entrega
      const headerModificado = this.csvOriginalHeaders[columnaIndex]?.toLowerCase() || '';
      if (headerModificado.includes('entrega') || headerModificado.includes('escenario')) {
        this.recalcularTareasFinal(filaIndex);
      }

      // Sincronizar con filasCalificaciones para mantener compatibilidad
      this.sincronizarFilaCalificacion(filaIndex);

      // Guardar en storage (base de datos)
      await this.guardarCambiosEnStorage();

      const toast = await this.toastController.create({
        message: 'Calificación actualizada',
        duration: 1500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    }

    this.cancelarEdicion();
  }

  /**
   * Verifica si una celda específica está siendo editada (tabla completa)
   */
  estaEditandoCelda(filaIndex: number, columnaIndex: number): boolean {
    return this.celdaEditando?.filaIndex === filaIndex &&
           this.celdaEditando?.campo === columnaIndex.toString();
  }

  /**
   * Actualiza una línea específica del CSV original
   * CRÍTICO: Este método modifica csvOriginalLineas que se usa para exportar
   */
  private actualizarLineaCSV(lineaIndex: number, columnaIndex: number, nuevoValor: string): void {
    if (lineaIndex < 0 || lineaIndex >= this.csvOriginalLineas.length) {
      Logger.error(`actualizarLineaCSV: índice fuera de rango ${lineaIndex}`);
      return;
    }

    const linea = this.csvOriginalLineas[lineaIndex];
    const valores = this.parsearLineaCSV(linea);

    if (columnaIndex < 0 || columnaIndex >= valores.length) {
      Logger.error(`actualizarLineaCSV: columna fuera de rango ${columnaIndex}`);
      return;
    }

    // Actualizar el valor en la posición correcta
    valores[columnaIndex] = nuevoValor;

    // Reconstruir línea respetando formato CSV con comillas si es necesario
    this.csvOriginalLineas[lineaIndex] = valores.map(v => {
      // Si el valor contiene coma, comillas o salto de línea, envolverlo en comillas
      if (v && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }).join(',');

    Logger.log(`CSV actualizado - Línea ${lineaIndex}, Columna ${columnaIndex}: "${nuevoValor}"`);
  }

  /**
   * Parser CSV que respeta comillas (método reutilizable)
   * NO hace trim para preservar valores exactos del CSV original
   */
  private parsearLineaCSV(linea: string): string[] {
    const resultado: string[] = [];
    let dentroComillas = false;
    let valorActual = '';

    for (let i = 0; i < linea.length; i++) {
      const char = linea[i];
      if (char === '"') {
        dentroComillas = !dentroComillas;
      } else if (char === ',' && !dentroComillas) {
        resultado.push(valorActual);
        valorActual = '';
      } else {
        valorActual += char;
      }
    }
    resultado.push(valorActual);
    return resultado;
  }

  /**
   * Recalcula todas las columnas calculadas cuando se modifica una entrega
   * Columnas afectadas:
   * - 7: Tareas Current Points
   * - 8: Tareas Final Points
   * - 9: Tareas Current Score
   * - 10: Tareas Unposted Current Score
   * - 11: Tareas Final Score
   * - 12: Tareas Unposted Final Score
   * - 19: Current Points
   * - 20: Final Points
   * - 21: Current Score
   * - 22: Unposted Current Score
   * - 23: Final Score
   * - 24: Unposted Final Score
   */
  private recalcularTareasFinal(filaIndex: number): void {
    const fila = this.filasCompletas[filaIndex];
    if (!fila) return;

    // Puntos máximos de cada entrega según Canvas
    const maxE1 = 150;
    const maxE2 = 150;
    const maxEF = 200;
    const totalMaxTareas = maxE1 + maxE2 + maxEF; // 500

    // Índices de las columnas de entregas (4, 5, 6)
    const indiceE1 = 4;
    const indiceE2 = 5;
    const indiceEF = 6;

    // Obtener valores de entregas
    const e1Str = fila.valores[indiceE1]?.trim() || '';
    const e2Str = fila.valores[indiceE2]?.trim() || '';
    const efStr = fila.valores[indiceEF]?.trim() || '';

    const e1 = e1Str !== '' ? parseFloat(e1Str) || 0 : null;
    const e2 = e2Str !== '' ? parseFloat(e2Str) || 0 : null;
    const ef = efStr !== '' ? parseFloat(efStr) || 0 : null;

    // Current Points: suma solo de las que tienen nota
    const currentPointsTareas = (e1 !== null ? e1 : 0) + (e2 !== null ? e2 : 0) + (ef !== null ? ef : 0);

    // Final Points: suma de todas (vacías = 0)
    const finalPointsTareas = (e1 ?? 0) + (e2 ?? 0) + (ef ?? 0);

    // Calcular puntos máximos calificados (para Current Score)
    let maxCalificados = 0;
    if (e1 !== null) maxCalificados += maxE1;
    if (e2 !== null) maxCalificados += maxE2;
    if (ef !== null) maxCalificados += maxEF;

    // Calcular scores
    const currentScoreTareas = maxCalificados > 0 ? (currentPointsTareas / maxCalificados) * 100 : 0;
    const finalScoreTareas = (finalPointsTareas / totalMaxTareas) * 100;

    // Formatear valores siempre con 2 decimales para consistencia
    const formatear = (val: number): string => val.toFixed(2);

    // Actualizar columnas de Tareas (7-12)
    fila.valores[7] = formatear(currentPointsTareas);  // Tareas Current Points
    fila.valores[8] = formatear(finalPointsTareas);    // Tareas Final Points
    fila.valores[9] = formatear(currentScoreTareas);   // Tareas Current Score
    fila.valores[10] = formatear(currentScoreTareas);  // Tareas Unposted Current Score
    fila.valores[11] = formatear(finalScoreTareas);    // Tareas Final Score
    fila.valores[12] = formatear(finalScoreTareas);    // Tareas Unposted Final Score

    // Para los totales generales, obtener valores de Herramientas Profesor (13-14)
    const herramientasCurrentPoints = parseFloat(fila.valores[13]) || 0;
    const herramientasFinalPoints = parseFloat(fila.valores[14]) || 0;

    // Calcular totales generales (19-24)
    // Nota: Asumiendo que no hay más grupos de tareas aparte de Tareas y Herramientas
    const totalCurrentPoints = currentPointsTareas + herramientasCurrentPoints;
    const totalFinalPoints = finalPointsTareas + herramientasFinalPoints;

    // Para los scores generales, necesitaríamos saber el total de puntos posibles
    // Por simplicidad, usamos los mismos porcentajes de tareas si no hay herramientas
    const currentScoreGeneral = currentScoreTareas; // Simplificado
    const finalScoreGeneral = finalScoreTareas;     // Simplificado

    fila.valores[19] = formatear(totalCurrentPoints);  // Current Points
    fila.valores[20] = formatear(totalFinalPoints);    // Final Points
    fila.valores[21] = formatear(currentScoreGeneral); // Current Score
    fila.valores[22] = formatear(currentScoreGeneral); // Unposted Current Score
    fila.valores[23] = formatear(finalScoreGeneral);   // Final Score
    fila.valores[24] = formatear(finalScoreGeneral);   // Unposted Final Score

    // Actualizar todas las columnas calculadas en el CSV original
    const columnasCalculadas = [7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24];
    columnasCalculadas.forEach(col => {
      this.actualizarLineaCSV(fila.filaOriginalIndex, col, fila.valores[col]);
    });
  }

  /**
   * Sincroniza los datos de filasCompletas con filasCalificaciones
   */
  private sincronizarFilaCalificacion(filaIndex: number): void {
    const filaCompleta = this.filasCompletas[filaIndex];
    const filaCalif = this.filasCalificaciones[filaIndex];
    if (!filaCompleta || !filaCalif) return;

    const indiceStudent = this.csvOriginalHeaders.findIndex(h => h === 'Student');
    filaCalif.student = filaCompleta.valores[indiceStudent] || '';
    filaCalif.e1 = filaCompleta.valores[filaCalif.indiceE1] || '';
    filaCalif.e2 = filaCompleta.valores[filaCalif.indiceE2] || '';
    filaCalif.ef = filaCompleta.valores[filaCalif.indiceEF] || '';
    filaCalif.tareasFinal = filaCompleta.valores[filaCalif.indiceTareasFinal] || '';
  }

  /**
   * Guarda todos los cambios en storage
   */
  private async guardarCambiosEnStorage(): Promise<void> {
    if (!this.cursoCalificacionesSeleccionado) return;

    const curso = this.cursosConCalificaciones.find(c => c.codigo === this.cursoCalificacionesSeleccionado);
    if (!curso) return;

    const csvActualizado = this.csvOriginalLineas.join('\n');

    await this.dataService.updateCourseState(curso.codigoUnico, {
      archivoCalificaciones: {
        ...curso.archivoCalificaciones,
        contenidoOriginal: csvActualizado
      }
    });
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
              Logger.error('Error eliminando archivo:', error);

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

