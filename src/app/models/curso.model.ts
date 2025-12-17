import { Estudiante } from './estudiante.model';

export interface Curso {
  nombre: string;
  estudiantes: Estudiante[];
  fechaCreacion: Date;
  fechaModificacion: Date;
  color?: string; // Color del curso para UI (selector de curso)
}

export interface CursoData {
  [nombreCurso: string]: Estudiante[];
}

// Colores predefinidos para cursos
export const COLORES_CURSOS: string[] = [
  '#d32f2f', // Rojo
  '#c2185b', // Rosa oscuro
  '#7b1fa2', // Púrpura
  '#512da8', // Púrpura oscuro
  '#303f9f', // Índigo
  '#1976d2', // Azul
  '#0288d1', // Azul claro
  '#0097a7', // Cian
  '#00796b', // Verde azulado
  '#388e3c', // Verde
  '#689f38', // Verde lima
  '#f57c00', // Naranja
  '#e64a19', // Naranja oscuro
  '#ff2719'  // Rojo brillante
];

/**
 * Genera un color aleatorio diferente a los colores ya usados
 */
export function generarColorAleatorio(coloresUsados: string[]): string {
  const disponibles = COLORES_CURSOS.filter(c => !coloresUsados.includes(c));
  if (disponibles.length > 0) {
    return disponibles[Math.floor(Math.random() * disponibles.length)];
  }
  // Si todos están usados, generar uno aleatorio
  return COLORES_CURSOS[Math.floor(Math.random() * COLORES_CURSOS.length)];
}
