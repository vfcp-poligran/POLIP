import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UnifiedStorageService } from './unified-storage.service';
import { Evaluacion } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private storage = inject(UnifiedStorageService);

  private readonly STORAGE_KEYS = {
    EVALUACIONES: 'evaluacionesData'
  };

  private _evaluaciones = signal<{ [key: string]: Evaluacion }>({});
  public evaluaciones = this._evaluaciones.asReadonly();
  public evaluaciones$ = toObservable(this._evaluaciones);

  constructor() {
    this.loadEvaluaciones();
  }

  async loadEvaluaciones(): Promise<void> {
    const evaluaciones = await this.storage.get<{ [key: string]: Evaluacion }>(this.STORAGE_KEYS.EVALUACIONES) || {} as { [key: string]: Evaluacion };
    this._evaluaciones.set({ ...evaluaciones });
  }

  async saveEvaluaciones(evaluaciones: { [key: string]: Evaluacion }): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.EVALUACIONES, evaluaciones);
    this._evaluaciones.set({ ...evaluaciones });
  }

  getEvaluacionesValue(): { [key: string]: Evaluacion } {
    return this._evaluaciones();
  }

  getEvaluacion(key: string): Evaluacion | undefined {
    return this._evaluaciones()[key];
  }

  async guardarEvaluacion(evaluacion: Evaluacion, key: string): Promise<void> {
    const evaluacionesOriginales = this._evaluaciones();

    const evaluaciones = {
      ...evaluacionesOriginales,
      [key]: evaluacion
    };

    await this.saveEvaluaciones(evaluaciones);
  }

  async borrarEvaluacion(key: string): Promise<void> {
    const evaluacionesOriginales = this._evaluaciones();

    // Crear nueva copia sin la evaluación a borrar
    const evaluaciones = { ...evaluacionesOriginales };
    delete evaluaciones[key];

    await this.saveEvaluaciones(evaluaciones);
  }

  async borrarEvaluacionesPorCurso(codigoCurso: string): Promise<number> {
    const evaluacionesOriginales = this._evaluaciones();
    const evaluacionesRestantes: { [key: string]: Evaluacion } = {};

    // Filtrar evaluaciones que NO pertenecen al curso eliminado
    Object.keys(evaluacionesOriginales).forEach(key => {
      const evaluacion = evaluacionesOriginales[key];
      // Verificar si la evaluación pertenece al curso (usando el nombre del curso o código)
      // Nota: Aquí asumimos que cursoNombre en evaluación es el código o nombre.
      // Idealmente deberíamos normalizar, pero eso se hace fuera.
      // Sin embargo, para borrado masivo, podemos filtrar por coincidencia parcial en la key o propiedad
      if (evaluacion.cursoNombre !== codigoCurso) {
        evaluacionesRestantes[key] = evaluacion;
      }
    });

    const evaluacionesEliminadas = Object.keys(evaluacionesOriginales).length - Object.keys(evaluacionesRestantes).length;

    if (evaluacionesEliminadas > 0) {
      await this.saveEvaluaciones(evaluacionesRestantes);
    }

    return evaluacionesEliminadas;
  }
}
