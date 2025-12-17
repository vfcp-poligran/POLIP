import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UnifiedStorageService } from './unified-storage.service';
import { ComentariosGrupoData, ComentarioGrupo } from '../models/comentario-grupo.model';
import { Logger } from '@app/core/utils/logger';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private storage = inject(UnifiedStorageService);

  private readonly STORAGE_KEYS = {
    COMENTARIOS_GRUPO: 'comentariosGrupoData'
  };

  private _comentariosGrupo = signal<ComentariosGrupoData>({});
  public comentariosGrupo = this._comentariosGrupo.asReadonly();
  public comentariosGrupo$ = toObservable(this._comentariosGrupo);

  constructor() {
    this.loadComentariosGrupo();
  }

  async loadComentariosGrupo(): Promise<void> {
    const comentarios = await this.storage.get<ComentariosGrupoData>(this.STORAGE_KEYS.COMENTARIOS_GRUPO) || {} as ComentariosGrupoData;
    this._comentariosGrupo.set({ ...comentarios });
  }

  /**
   * Guarda el estado actual de los comentarios en storage.
   * Si se pasa un objeto, actualiza el estado y luego guarda.
   */
  async saveComentariosGrupo(comentarios?: ComentariosGrupoData): Promise<void> {
    if (comentarios) {
      this._comentariosGrupo.set({ ...comentarios });
    }
    await this.storage.set(this.STORAGE_KEYS.COMENTARIOS_GRUPO, this._comentariosGrupo());
  }

  getComentariosValue(): ComentariosGrupoData {
    return this._comentariosGrupo();
  }

  updateComentariosState(newState: ComentariosGrupoData): void {
    this._comentariosGrupo.set({ ...newState });
  }

  getComentariosGrupo(cursoId: string, grupo: string): ComentarioGrupo[] {
    const comentarios = this._comentariosGrupo();
    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      return [];
    }
    return comentarios[cursoId][grupo];
  }

  async addComentarioGrupo(cursoId: string, grupo: string, comentarioTexto: string, autor?: string, etiquetas?: string[]): Promise<void> {
    const comentarios = { ...this._comentariosGrupo() };
    const cursoComentarios = { ...(comentarios[cursoId] || {}) };
    const grupoComentarios = [...(cursoComentarios[grupo] || [])];

    const nuevoComentario: ComentarioGrupo = {
      id: crypto.randomUUID(),
      cursoId,
      grupo,
      comentario: comentarioTexto,
      fecha: new Date(),
      autor,
      etiquetas
    };

    grupoComentarios.push(nuevoComentario);
    cursoComentarios[grupo] = grupoComentarios;
    comentarios[cursoId] = cursoComentarios;

    await this.saveComentariosGrupo(comentarios);
  }

  async deleteComentarioGrupo(cursoId: string, grupo: string, comentarioId: string): Promise<void> {
    const comentarios = { ...this._comentariosGrupo() };
    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      Logger.warn(`⚠️ [CommentService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    const cursoComentarios = { ...comentarios[cursoId] };
    const grupoComentarios = (cursoComentarios[grupo] || []).filter(c => c.id !== comentarioId);
    cursoComentarios[grupo] = grupoComentarios;
    comentarios[cursoId] = cursoComentarios;

    await this.saveComentariosGrupo(comentarios);
  }

  async updateComentarioGrupo(cursoId: string, grupo: string, comentarioId: string, nuevoTexto: string): Promise<void> {
    const comentarios = { ...this._comentariosGrupo() };
    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      Logger.warn(`⚠️ [CommentService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    const cursoComentarios = { ...comentarios[cursoId] };
    const grupoComentarios = (cursoComentarios[grupo] || []).map(c =>
      c.id === comentarioId
        ? { ...c, comentario: nuevoTexto, fecha: new Date() }
        : c
    );
    cursoComentarios[grupo] = grupoComentarios;
    comentarios[cursoId] = cursoComentarios;

    await this.saveComentariosGrupo(comentarios);
  }
}
