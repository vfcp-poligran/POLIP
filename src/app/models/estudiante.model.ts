export interface Estudiante {
  canvasUserId?: string; // Identificador único de Canvas para el estudiante
  canvasGroupId?: string; // Identificador único de Canvas para el grupo (uso interno)
  apellidos: string;
  nombres: string;
  correo: string;
  curso?: string; // Nombre del curso al que pertenece
  grupo: string; // Número de grupo extraído del group_name (para mostrar)
  groupName?: string; // Nombre completo del grupo del CSV (ej: "Grupo 1")
}

export interface NotaEstudiante {
  estudiante: Estudiante;
  e1?: NotaEntrega;
  e2?: NotaEntrega;
  ef?: NotaEntrega;
}

export interface NotaEntrega {
  pg?: number; // Puntaje Grupal
  pi?: number; // Puntaje Individual
  suma?: number; // PG + PI
}
