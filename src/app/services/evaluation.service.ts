import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UnifiedStorageService } from './unified-storage.service';
import { Logger } from '@app/core/utils/logger';
import { Evaluacion } from '../models';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private storage = inject(UnifiedStorageService);

  private readonly STORAGE_KEYS = {
    EVALUACIONES: 'evaluacionesData'
  };

  private evaluacionesSubject = new BehaviorSubject<{ [key: string]: Evaluacion }>({});
  public evaluaciones$ = this.evaluacionesSubject.asObservable();

  constructor() {
    this.loadEvaluaciones();
  }

  async loadEvaluaciones(): Promise<void> {
    const evaluaciones = await this.storage.get<{ [key: string]: Evaluacion }>(this.STORAGE_KEYS.EVALUACIONES) || {} as { [key: string]: Evaluacion };
    this.evaluacionesSubject.next(evaluaciones);
  }

  async saveEvaluaciones(evaluaciones: { [key: string]: Evaluacion }): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.EVALUACIONES, evaluaciones);
    this.evaluacionesSubject.next(evaluaciones);
  }

  getEvaluacionesValue(): { [key: string]: Evaluacion } {
    return this.evaluacionesSubject.value;
  }

  getEvaluacion(key: string): Evaluacion | undefined {
    return this.evaluacionesSubject.value[key];
  }

  async guardarEvaluacion(evaluacion: Evaluacion, key: string): Promise<void> {
    const evaluacionesOriginales = this.evaluacionesSubject.value;

    const evaluaciones = {
      ...evaluacionesOriginales,
      [key]: evaluacion
    };

    await this.saveEvaluaciones(evaluaciones);
  }

  async borrarEvaluacion(key: string): Promise<void> {
    const evaluacionesOriginales = this.evaluacionesSubject.value;

    // Crear nueva copia sin la evaluación a borrar
    const evaluaciones = { ...evaluacionesOriginales };
    delete evaluaciones[key];

    await this.saveEvaluaciones(evaluaciones);
  }

  async borrarEvaluacionesPorCurso(codigoCurso: string): Promise<number> {
    const evaluacionesOriginales = this.evaluacionesSubject.value;
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
