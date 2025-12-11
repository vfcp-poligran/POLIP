export interface ComentarioGrupo {
  id: string; // UUID único
  cursoId: string; // Identificador del curso (ej: "EPMB01")
  grupo: string; // Identificador del grupo (ej: "G1", "G2")
  comentario: string; // Texto del comentario
  fecha: Date; // Fecha de creación
  autor?: string; // Opcional: quién creó el comentario
  etiquetas?: string[]; // Opcional: etiquetas para clasificar
}

export interface ComentariosGrupoData {
  [cursoId: string]: { // Por curso
    [grupo: string]: ComentarioGrupo[]; // Por grupo
  };
}
