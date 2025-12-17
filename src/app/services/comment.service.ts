import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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

  private comentariosGrupoSubject = new BehaviorSubject<ComentariosGrupoData>({});
  public comentariosGrupo$ = this.comentariosGrupoSubject.asObservable();

  constructor() {
    this.loadComentariosGrupo();
  }

  async loadComentariosGrupo(): Promise<void> {
    const comentarios = await this.storage.get<ComentariosGrupoData>(this.STORAGE_KEYS.COMENTARIOS_GRUPO) || {} as ComentariosGrupoData;
    this.comentariosGrupoSubject.next(comentarios);
  }

  /**
   * Guarda el estado actual de los comentarios en storage.
   * Si se pasa un objeto, actualiza el estado y luego guarda.
   */
  async saveComentariosGrupo(comentarios?: ComentariosGrupoData): Promise<void> {
    if (comentarios) {
      this.comentariosGrupoSubject.next(comentarios);
    }
    await this.storage.set(this.STORAGE_KEYS.COMENTARIOS_GRUPO, this.comentariosGrupoSubject.value);
  }

  getComentariosValue(): ComentariosGrupoData {
    return this.comentariosGrupoSubject.value;
  }

  updateComentariosState(newState: ComentariosGrupoData): void {
    this.comentariosGrupoSubject.next(newState);
  }

  getComentariosGrupo(cursoId: string, grupo: string): ComentarioGrupo[] {
    const comentarios = this.comentariosGrupoSubject.value;
    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      return [];
    }
    return comentarios[cursoId][grupo];
  }

  async addComentarioGrupo(cursoId: string, grupo: string, comentarioTexto: string, autor?: string, etiquetas?: string[]): Promise<void> {
    const comentarios = { ...this.comentariosGrupoSubject.value };

    // Inicializar estructura si no existe
    if (!comentarios[cursoId]) {
      comentarios[cursoId] = {};
    }
    if (!comentarios[cursoId][grupo]) {
      comentarios[cursoId][grupo] = [];
    }

    // Crear nuevo comentario
    const nuevoComentario: ComentarioGrupo = {
      id: crypto.randomUUID(),
      cursoId,
      grupo,
      comentario: comentarioTexto,
      fecha: new Date(),
      autor,
      etiquetas
    };

    // Añadir al array
    comentarios[cursoId][grupo] = [...comentarios[cursoId][grupo], nuevoComentario];

    // Actualizar subject y guardar
    await this.saveComentariosGrupo(comentarios);
  }

  async deleteComentarioGrupo(cursoId: string, grupo: string, comentarioId: string): Promise<void> {
    const comentarios = { ...this.comentariosGrupoSubject.value };

    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      Logger.warn(`⚠️ [CommentService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    // Filtrar el comentario a eliminar
    comentarios[cursoId][grupo] = comentarios[cursoId][grupo].filter(c => c.id !== comentarioId);

    // Actualizar subject y guardar
    await this.saveComentariosGrupo(comentarios);
  }

  async updateComentarioGrupo(cursoId: string, grupo: string, comentarioId: string, nuevoTexto: string): Promise<void> {
    const comentarios = { ...this.comentariosGrupoSubject.value };

    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      Logger.warn(`⚠️ [CommentService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    // Encontrar y actualizar el comentario
    comentarios[cursoId][grupo] = comentarios[cursoId][grupo].map(c =>
      c.id === comentarioId
        ? { ...c, comentario: nuevoTexto, fecha: new Date() }
        : c
    );

    // Actualizar subject y guardar
    await this.saveComentariosGrupo(comentarios);
  }
}
