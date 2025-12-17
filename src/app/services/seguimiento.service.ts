import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

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

export type EstadoEstudiante = 'ok' | 'solo' | 'ausente' | null;

export interface EstadosEntrega {
  ok: Set<string>;
  solos: Set<string>;
  ausentes: Set<string>;
}

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  // Signals
  private _grupoSeleccionado = signal<number>(0);
  private _grupoVisualizado = signal<number>(0);
  private _seguimientoActual = signal<SeguimientoGrupo | null>(null);

  // Estados de estudiantes: Map<grupo, Map<entrega, EstadosEntrega>>
  private estadosEstudiantesMap: Map<string, Map<string, EstadosEntrega>> = new Map();
  private _estadosEstudiantes = signal<Map<string, Map<string, EstadosEntrega>>>(this.estadosEstudiantesMap);

  // Readonly Signals
  public grupoSeleccionado = this._grupoSeleccionado.asReadonly();
  public grupoVisualizado = this._grupoVisualizado.asReadonly();
  public seguimientoActual = this._seguimientoActual.asReadonly();
  public estadosEstudiantes = this._estadosEstudiantes.asReadonly();

  // Legacy Observables
  public grupoSeleccionado$ = toObservable(this._grupoSeleccionado);
  public grupoVisualizado$ = toObservable(this._grupoVisualizado);
  public seguimientoActual$ = toObservable(this._seguimientoActual);
  public estadosEstudiantes$ = toObservable(this._estadosEstudiantes);

  constructor() { }

  setGrupoSeleccionado(grupo: number): void {
    // 🛡️ GUARDIA: No emitir si es el mismo valor
    if (this._grupoSeleccionado() === grupo) {
      return;
    }

    this._grupoSeleccionado.set(grupo);
    // Al cambiar el grupo seleccionado, también actualizamos el visualizado
    this._grupoVisualizado.set(grupo);
  }

  /**
   * Fuerza la emisión del grupo seleccionado aunque sea el mismo valor.
   * Útil para refrescar la vista sin cambiar el grupo.
   */
  forceSetGrupoSeleccionado(grupo: number): void {
    this._grupoSeleccionado.set(grupo);
    this._grupoVisualizado.set(grupo);
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

  /**
   * Limpia completamente el seguimiento actual
   */
  limpiarSeguimiento(): void {
    this.seguimientoActualSubject.next(null);
  }

  // === MÉTODOS PARA ESTADOS DE ESTUDIANTES ===

  /**
   * Obtiene los estados de un grupo y entrega específicos
   */
  getEstadosGrupoEntrega(grupo: string, entrega: string): EstadosEntrega {
    if (!this.estadosEstudiantes.has(grupo)) {
      this.estadosEstudiantes.set(grupo, new Map());
    }
    const grupoMap = this.estadosEstudiantes.get(grupo)!;

    if (!grupoMap.has(entrega)) {
      grupoMap.set(entrega, { ok: new Set(), solos: new Set(), ausentes: new Set() });
    }
    return grupoMap.get(entrega)!;
  }

  /**
   * Establece el estado de un estudiante
   */
  setEstadoEstudiante(grupo: string, entrega: string, correo: string, estado: EstadoEstudiante): void {
    const estados = this.getEstadosGrupoEntrega(grupo, entrega);

    // Quitar de todos los estados
    estados.ok.delete(correo);
    estados.solos.delete(correo);
    estados.ausentes.delete(correo);

    // Agregar al estado correspondiente si no es null
    if (estado === 'ok') {
      estados.ok.add(correo);
    } else if (estado === 'solo') {
      estados.solos.add(correo);
    } else if (estado === 'ausente') {
      estados.ausentes.add(correo);
    }

    // Notificar cambio
    this.estadosEstudiantesSubject.next(new Map(this.estadosEstudiantes));
  }

  /**
   * Obtiene el estado de un estudiante
   */
  getEstadoEstudiante(grupo: string, entrega: string, correo: string): EstadoEstudiante {
    const grupoMap = this.estadosEstudiantes.get(grupo);
    if (!grupoMap) return null;

    const estados = grupoMap.get(entrega);
    if (!estados) return null;

    if (estados.ok.has(correo)) return 'ok';
    if (estados.solos.has(correo)) return 'solo';
    if (estados.ausentes.has(correo)) return 'ausente';
    return null;
  }

  /**
   * Limpia los estados de un grupo y entrega
   */
  limpiarEstadosGrupoEntrega(grupo: string, entrega: string): void {
    const grupoMap = this.estadosEstudiantes.get(grupo);
    if (grupoMap) {
      grupoMap.delete(entrega);
      this.estadosEstudiantesSubject.next(new Map(this.estadosEstudiantes));
    }
  }
}
