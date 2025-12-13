import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CriterioEvaluado {
  nombreCriterio: string;
  niveles: {
    nombre: string;
    intervalo: string;
    color: string;
    descripcion?: string;
  }[];
  nivelSeleccionado: string;
  puntosAsignados: number;
  comentario?: string;
}

export interface EvaluacionRubrica {
  tipo: 'PG' | 'PI';
  puntosTotal: number;
  criterios: CriterioEvaluado[];
  timestamp?: string;
}

export interface IntegranteInfo {
  correo: string;
  nombres: string;
  apellidos: string;
}

export interface SeguimientoGrupo {
  curso: string;
  grupo: string;
  comentarios: ComentarioGrupo[];
  evaluacionGrupal?: EvaluacionRubrica;
  evaluacionIndividual?: EvaluacionRubrica;
  integranteSeleccionado?: IntegranteInfo;
  entregaActual?: 'E1' | 'E2' | 'EF';
  tipoEvaluacionActiva?: 'PG' | 'PI' | null;
  textoRubricaGrupal: string[];
  textoRubricaIndividual: string[];
  timestampsGrupal: string[];
  timestampsIndividual: string[];
}

export interface ComentarioGrupo {
  id: string;
  comentario: string;
  fecha: Date;
  autor?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  private grupoSeleccionadoSubject = new BehaviorSubject<number>(0); // 0 = todos los grupos
  private grupoVisualizadoSubject = new BehaviorSubject<number>(0); // Grupo para mostrar integrantes (sin cambiar filtro)
  private seguimientoActualSubject = new BehaviorSubject<SeguimientoGrupo | null>(null);

  grupoSeleccionado$ = this.grupoSeleccionadoSubject.asObservable();
  grupoVisualizado$ = this.grupoVisualizadoSubject.asObservable();
  seguimientoActual$ = this.seguimientoActualSubject.asObservable();

  constructor() { }

  setGrupoSeleccionado(grupo: number): void {
    // 🛡️ GUARDIA: No emitir si es el mismo valor
    if (this.grupoSeleccionadoSubject.value === grupo) {
      return;
    }

    this.grupoSeleccionadoSubject.next(grupo);
    // Al cambiar el grupo seleccionado, también actualizamos el visualizado
    this.grupoVisualizadoSubject.next(grupo);
  }

  /**
   * Fuerza la emisión del grupo seleccionado aunque sea el mismo valor.
   * Útil para refrescar la vista sin cambiar el grupo.
   */
  forceSetGrupoSeleccionado(grupo: number): void {
    this.grupoSeleccionadoSubject.next(grupo);
    this.grupoVisualizadoSubject.next(grupo);
  }

  /**
   * Establece el grupo a visualizar (mostrar integrantes) SIN cambiar el filtro activo.
   * Útil para previsualizar integrantes de un grupo manteniendo la vista "Todos".
   */
  setGrupoVisualizado(grupo: number): void {
    this.grupoVisualizadoSubject.next(grupo);
  }

  getGrupoSeleccionado(): number {
    return this.grupoSeleccionadoSubject.value;
  }

  getGrupoVisualizado(): number {
    return this.grupoVisualizadoSubject.value;
  }

  setSeguimiento(seguimiento: SeguimientoGrupo | null): void {
    this.seguimientoActualSubject.next(seguimiento);
  }

  getSeguimiento(): SeguimientoGrupo | null {
    return this.seguimientoActualSubject.value;
  }

  actualizarTextoRubrica(tipo: 'PG' | 'PI', textos: string[], timestamps?: string[]): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      if (tipo === 'PG') {
        seguimientoActual.textoRubricaGrupal = textos;
        if (timestamps) {
          seguimientoActual.timestampsGrupal = timestamps;
        }
      } else {
        seguimientoActual.textoRubricaIndividual = textos;
        if (timestamps) {
          seguimientoActual.timestampsIndividual = timestamps;
        }
      }
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  actualizarEvaluacionRubrica(tipo: 'PG' | 'PI', evaluacion: EvaluacionRubrica): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      if (tipo === 'PG') {
        seguimientoActual.evaluacionGrupal = evaluacion;
      } else {
        seguimientoActual.evaluacionIndividual = evaluacion;
      }
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  agregarComentario(comentario: ComentarioGrupo): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.comentarios.push(comentario);
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  agregarComentarios(comentarios: ComentarioGrupo[]): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.comentarios.push(...comentarios);
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  actualizarComentario(id: string, nuevoTexto: string): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      const comentario = seguimientoActual.comentarios.find(c => c.id === id);
      if (comentario) {
        comentario.comentario = nuevoTexto;
        this.seguimientoActualSubject.next({ ...seguimientoActual });
      }
    }
  }

  eliminarComentario(id: string): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.comentarios = seguimientoActual.comentarios.filter(c => c.id !== id);
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  actualizarIntegranteSeleccionado(integrante: IntegranteInfo | null): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.integranteSeleccionado = integrante || undefined;
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  actualizarEntregaActual(entrega: 'E1' | 'E2' | 'EF' | null): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.entregaActual = entrega || undefined;
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }

  actualizarTipoEvaluacionActiva(tipo: 'PG' | 'PI' | null): void {
    const seguimientoActual = this.seguimientoActualSubject.value;
    if (seguimientoActual) {
      seguimientoActual.tipoEvaluacionActiva = tipo;
      this.seguimientoActualSubject.next({ ...seguimientoActual });
    }
  }
}
