import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StateService } from './state.service';
import { EvaluationService } from './evaluation.service';
import { CsvUtils } from '../utils/csv.utils';
import { Logger } from '@app/core/utils/logger';
import { Estudiante, UIState, CourseState } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private stateService = inject(StateService);
  private evaluationService = inject(EvaluationService);

  private calificacionesCanvasActualizadasSubject = new BehaviorSubject<{ curso: string, timestamp: number } | null>(null);
  public calificacionesCanvasActualizadas$ = this.calificacionesCanvasActualizadasSubject.asObservable();

  /**
   * Parsea CSV de Canvas y extrae solo los campos necesarios
   */
  private parsearCalificacionesCanvas(contenido: string): Array<{
    id: string;
    e1: string;
    e2: string;
    ef: string;
  }> {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 3) {
      return [];
    }

    // Saltar header (línea 0) y "Points Possible" (línea 1)
    const calificaciones = [];
    for (let i = 2; i < lineas.length; i++) {
      const campos = CsvUtils.parseCSVRow(lineas[i]);

      if (campos.length >= 7) {
        calificaciones.push({
          id: campos[1] || '',   // Campo 1: ID de Canvas (canvasUserId)
          e1: campos[4] || '',   // Campo 4: Entrega proyecto 1
          e2: campos[5] || '',   // Campo 5: Entrega proyecto 2
          ef: campos[6] || ''    // Campo 6: Entrega final
        });
      }
    }

    return calificaciones;
  }

  obtenerArchivoCalificaciones(codigoCurso: string): {
    nombre: string;
    fechaCarga: string;
    contenidoOriginal: string;
    calificaciones: Array<{
      id: string;
      e1: string;
      e2: string;
      ef: string;
    }>;
  } | null {
    const uiState = this.stateService.getUIState();
    const courseState = uiState.courseStates?.[codigoCurso];
    return courseState?.archivoCalificaciones || null;
  }

  async eliminarArchivoCalificaciones(codigoCurso: string): Promise<void> {
    const uiState = this.stateService.getUIState();
    const courseState = uiState.courseStates?.[codigoCurso];

    if (!courseState || !courseState.archivoCalificaciones) {
      Logger.warn(`No hay archivo de calificaciones para eliminar en ${codigoCurso}`);
      return;
    }

    const updatedCourseState: CourseState = {
      ...courseState,
      archivoCalificaciones: undefined
    };

    await this.stateService.updateCourseState(codigoCurso, updatedCourseState);
  }

  async guardarArchivoCalificaciones(codigoCurso: string, nombreArchivo: string, contenido: string): Promise<void> {
    Logger.log('💾 [CanvasService] Iniciando guardado:', { codigoCurso, nombreArchivo });

    const uiState = this.stateService.getUIState();
    const courseState = uiState.courseStates?.[codigoCurso] || {};

    // Parsear CSV y extraer campos procesados
    const calificaciones = this.parsearCalificacionesCanvas(contenido);

    // Actualizar courseState
    const nuevoCourseState = {
      ...courseState,
      archivoCalificaciones: {
        nombre: nombreArchivo,
        fechaCarga: new Date().toISOString(),
        calificaciones,
        contenidoOriginal: contenido // Guardar contenido original para actualizaciones
      }
    };

    await this.stateService.updateCourseState(codigoCurso, nuevoCourseState);

    // Notificar actualización
    this.calificacionesCanvasActualizadasSubject.next({
      curso: codigoCurso,
      timestamp: Date.now()
    });

    Logger.log('✅ [CanvasService] Archivo guardado y procesado');
  }

  async actualizarArchivoCalificaciones(codigoCurso: string, estudiantes: Estudiante[]): Promise<void> {
    const uiState = this.stateService.getUIState();
    const courseState = uiState.courseStates?.[codigoCurso];

    if (!courseState?.archivoCalificaciones?.contenidoOriginal) {
      throw new Error('No hay archivo de calificaciones vinculado para actualizar');
    }

    const archivo = courseState.archivoCalificaciones;
    const lineas = archivo.contenidoOriginal.split('\n');

    if (lineas.length < 3) {
      throw new Error('El archivo CSV tiene un formato inválido (muy pocas líneas)');
    }

    // Identificar índices de columnas en el header (línea 0)
    const headers = CsvUtils.parseCSVRow(lineas[0]);

    // Buscar índices de columnas clave
    const indiceEmail = headers.findIndex(h => h.toLowerCase().includes('login') || h.toLowerCase().includes('email') || h.toLowerCase().includes('correo'));
    const indiceE1 = 4; // Asumimos posición fija según formato Canvas estándar
    const indiceE2 = 5;
    const indiceEF = 6;

    if (indiceEmail === -1) {
      throw new Error('No se encontró columna de email/login en el archivo Canvas');
    }

    let estudiantesActualizados = 0;
    let estudiantesNoEncontrados = 0;

    // Procesar filas (saltando header y points possible)
    const filasActualizadas = lineas.map((linea, index) => {
      if (index < 2 || !linea.trim()) return linea;

      const campos = CsvUtils.parseCSVRow(linea);
      const emailCanvas = campos[indiceEmail]?.toLowerCase().trim();

      if (!emailCanvas) return linea;

      // Buscar estudiante correspondiente
      const estudiante = estudiantes.find(e => e.correo.toLowerCase() === emailCanvas);

      if (!estudiante) {
        estudiantesNoEncontrados++;
        return linea;
      }

      let actualizado = false;

      // Actualizar calificaciones para cada entrega
      ['E1', 'E2', 'EF'].forEach(ent => {
        const sumatoria = this.calcularSumatoriaEstudiante(codigoCurso, estudiante, ent as any);

        if (ent === 'E1' && indiceE1 < campos.length) {
          campos[indiceE1] = sumatoria > 0 ? sumatoria.toString() : '';
          actualizado = true;
        } else if (ent === 'E2' && indiceE2 < campos.length) {
          campos[indiceE2] = sumatoria > 0 ? sumatoria.toString() : '';
          actualizado = true;
        } else if (ent === 'EF' && indiceEF < campos.length) {
          campos[indiceEF] = sumatoria > 0 ? sumatoria.toString() : '';
          actualizado = true;
        }
      });

      if (actualizado) {
        estudiantesActualizados++;
      }

      return CsvUtils.buildCSVRow(campos);
    });

    // Guardar archivo actualizado
    const contenidoActualizado = filasActualizadas.join('\n');
    await this.guardarArchivoCalificaciones(codigoCurso, archivo.nombre, contenidoActualizado);

    Logger.log(`✅ [CanvasService] Actualización completada: ${estudiantesActualizados} estudiantes actualizados`);
  }

  private calcularSumatoriaEstudiante(codigoCurso: string, estudiante: Estudiante, entrega: 'E1' | 'E2' | 'EF'): number {
    const evaluaciones = this.evaluationService.getEvaluacionesValue();
    let pg = 0;

    // Calcular PG
    const pgIndividualKey = `${codigoCurso}_${entrega}_PG_${estudiante.correo}`;
    const pgGrupalKey = `${codigoCurso}_${entrega}_PG_${estudiante.grupo}`;

    if (evaluaciones[pgIndividualKey]) {
      pg = evaluaciones[pgIndividualKey].puntosTotales || 0;
    } else if (evaluaciones[pgGrupalKey]) {
      pg = evaluaciones[pgGrupalKey].puntosTotales || 0;
    }

    // Calcular PI
    const piKey = `${codigoCurso}_${entrega}_PI_${estudiante.correo}`;
    let pi = 0;
    if (evaluaciones[piKey]) {
      pi = evaluaciones[piKey].puntosTotales || 0;
    }

    return pg + pi;
  }

  async diagnosticarSincronizacionCanvas(codigoCurso: string, estudiantes: Estudiante[]): Promise<any> {
    const uiState = this.stateService.getUIState();
    const courseState = uiState.courseStates?.[codigoCurso];

    if (!courseState?.archivoCalificaciones) {
      return { exito: false, mensaje: 'No hay archivo vinculado' };
    }

    const archivo = courseState.archivoCalificaciones;
    const lineas = archivo.contenidoOriginal.split('\n');
    const headers = CsvUtils.parseCSVRow(lineas[0]);
    const indiceEmail = headers.findIndex(h => h.toLowerCase().includes('login') || h.toLowerCase().includes('email'));

    if (indiceEmail === -1) {
      return { exito: false, mensaje: 'No se encontró columna de email' };
    }

    let coincidencias = 0;
    const noCoincidencias = [];
    const correosCanvas = [];

    for (let i = 2; i < lineas.length; i++) {
      if (!lineas[i].trim()) continue;
      const campos = CsvUtils.parseCSVRow(lineas[i]);
      const email = campos[indiceEmail]?.toLowerCase().trim();

      if (email) {
        correosCanvas.push(email);
        if (estudiantes.some(e => e.correo.toLowerCase() === email)) {
          coincidencias++;
        } else {
          noCoincidencias.push({ emailCanvas: email, razon: 'No encontrado en lista de estudiantes' });
        }
      }
    }

    return {
      exito: true,
      detalles: {
        estudiantesEnLista: estudiantes.length,
        estudiantesEnCanvas: correosCanvas.length,
        coincidencias,
        noCoincidencias
      }
    };
  }

  /**
   * Migra estructuras antiguas de archivos Canvas a la nueva estructura
   */
  migrarArchivosCanvas(uiState: UIState): UIState {
    if (!uiState.courseStates) {
      return uiState;
    }

    let cambiosRealizados = false;
    const courseStatesMigrados: { [cursoNombre: string]: CourseState } = {};

    Object.keys(uiState.courseStates).forEach(cursoNombre => {
      const courseState = uiState.courseStates[cursoNombre];
      let courseStateMigrado = { ...courseState };

      // Detectar y migrar archivoCanvas antiguo a archivoCalificaciones
      if ((courseState as any).archivoCanvas && !courseState.archivoCalificaciones) {
        const archivoCanvas = (courseState as any).archivoCanvas;

        Logger.log(`🔄 [Migración] Detectado archivoCanvas antiguo en curso: ${cursoNombre}`);

        const contenidoCSV = archivoCanvas.contenidoCSV || '';
        courseStateMigrado.archivoCalificaciones = {
          nombre: archivoCanvas.nombreArchivo || 'calificaciones_canvas.csv',
          fechaCarga: archivoCanvas.fechaVinculacion || new Date().toISOString(),
          calificaciones: this.parsearCalificacionesCanvas(contenidoCSV),
          contenidoOriginal: contenidoCSV
        };

        cambiosRealizados = true;
      }

      // Eliminar propiedad archivoCanvas obsoleta
      if ((courseStateMigrado as any).archivoCanvas) {
        Logger.log(`🧹 [Limpieza] Eliminando archivoCanvas obsoleto en curso: ${cursoNombre}`);
        delete (courseStateMigrado as any).archivoCanvas;
        cambiosRealizados = true;
      }

      // Validar y limpiar archivoCalificaciones corrupto
      if (courseStateMigrado.archivoCalificaciones) {
        const archivo = courseStateMigrado.archivoCalificaciones;

        // Validar estructura
        if (!archivo.nombre || !archivo.contenidoOriginal || typeof archivo.contenidoOriginal !== 'string') {
          Logger.warn(`⚠️ [Limpieza] Archivo de calificaciones corrupto en curso: ${cursoNombre}, eliminando...`);
          delete courseStateMigrado.archivoCalificaciones;
          cambiosRealizados = true;
        }
        // Validar que el contenido sea CSV válido
        else if (archivo.contenidoOriginal.trim().length > 0) {
          const lineas = archivo.contenidoOriginal.split('\n');
          if (lineas.length < 2) {
            Logger.warn(`⚠️ [Limpieza] Archivo CSV inválido (menos de 2 líneas) en curso: ${cursoNombre}, eliminando...`);
            delete courseStateMigrado.archivoCalificaciones;
            cambiosRealizados = true;
          }
        }
      }

      courseStatesMigrados[cursoNombre] = courseStateMigrado;
    });

    if (cambiosRealizados) {
      return {
        ...uiState,
        courseStates: courseStatesMigrados
      };
    }

    return uiState;
  }
}
