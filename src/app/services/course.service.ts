import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UnifiedStorageService } from './unified-storage.service';
import { Logger } from '@app/core/utils/logger';
import { CursoData, Estudiante } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private storage = inject(UnifiedStorageService);

  private readonly STORAGE_KEYS = {
    CURSOS: 'gestorCursosData',
    UI_STATE: 'appUIState'
  };

  private _cursos = signal<CursoData>({});
  public cursos = this._cursos.asReadonly();
  public cursos$ = toObservable(this._cursos);

  // Necesitamos acceso al UIState para gestionar metadatos de cursos
  // Idealmente esto debería estar desacoplado, pero por ahora lo inyectaremos o gestionaremos aquí
  // Para evitar dependencias circulares, gestionaremos solo la parte de cursos aquí
  // y DataService coordinará la actualización de UIState

  constructor() {
    this.loadCursos();
  }

  async loadCursos(): Promise<void> {
    const cursos = await this.storage.get<CursoData>(this.STORAGE_KEYS.CURSOS) || {} as CursoData;
    this._cursos.set({ ...cursos });
  }

  async saveCursos(cursos: CursoData): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.CURSOS, cursos);
    this._cursos.set({ ...cursos });
  }

  getCursosValue(): CursoData {
    return this._cursos();
  }

  getCurso(nombre: string): Estudiante[] | undefined {
    return this._cursos()[nombre];
  }

  /**
   * Extrae el código base de un código de curso
   * Ejemplo: "EPM-B01-BLQ2-V" -> "EPM"
   * Ejemplo: "SO-B09-BLQ2" -> "SO"
   * Ejemplo: "BD-B05" -> "BD"
   */
  extraerCodigoBaseCurso(codigoCurso: string): string {
    if (!codigoCurso) return '';

    // Buscar el patrón: letras iniciales antes de "-B" o "-" seguido de número
    const match = codigoCurso.match(/^([A-Za-z]+)(?:-[Bb]\d|$|-\d)/);
    if (match) {
      return match[1].toUpperCase();
    }

    // Fallback: tomar todo hasta el primer guión
    const primeraParteMatch = codigoCurso.match(/^([A-Za-z]+)/);
    return primeraParteMatch ? primeraParteMatch[1].toUpperCase() : codigoCurso.toUpperCase();
  }

  async actualizarEstudiantesCurso(codigoCurso: string, estudiantes: any[]): Promise<void> {
    const cursosOriginales = this._cursos();

    if (!cursosOriginales[codigoCurso]) {
      throw new Error(`No se encontró el curso con código: ${codigoCurso}`);
    }

    const cursosActualizados = {
      ...cursosOriginales,
      [codigoCurso]: estudiantes
    };

    await this.saveCursos(cursosActualizados);
    Logger.log(`✅ Estudiantes actualizados para curso: ${codigoCurso} (${estudiantes.length} estudiantes)`);
  }

  async eliminarCursoData(codigoUnico: string): Promise<void> {
    const cursosOriginales = this._cursos();
    const { [codigoUnico]: cursoEliminado, ...cursosRestantes } = cursosOriginales;

    if (!cursoEliminado) {
      Logger.warn(`⚠️ No se encontró el curso ${codigoUnico} en la lista de cursos`);
    }

    await this.saveCursos(cursosRestantes);
    Logger.log(`✅ Estudiantes eliminados (${cursoEliminado?.length || 0})`);
  }
}
