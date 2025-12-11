import { Estudiante } from './estudiante.model';

export interface Curso {
  nombre: string;
  estudiantes: Estudiante[];
  fechaCreacion: Date;
  fechaModificacion: Date;
}

export interface CursoData {
  [nombreCurso: string]: Estudiante[];
}