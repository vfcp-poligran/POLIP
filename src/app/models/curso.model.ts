import { Estudiante } from './estudiante.model';

/**
 * Tipo de ingreso académico
 * Cada ingreso tiene una duración característica diferente
 */
export type TipoIngreso = 'A' | 'B' | 'C';

/**
 * Información de cohorte/período académico
 * Permite rastrear cuándo se dictó un curso y detectar estudiantes repitentes
 */
export interface Cohorte {
  /** Nombre de la cohorte (ej: "202410 B2", "202510 B1", "202560 B2") */
  nombre: string;
  /** Tipo de ingreso (A: 120 días, B: 132 días con nivelatorios, C: 105 días) - Opcional */
  ingreso?: TipoIngreso;
  /** Fecha de inicio del período académico */
  fechaInicio: Date;
  /** Fecha de fin del período académico */
  fechaFin: Date;
}

/**
 * Información resumida de un grupo dentro de un curso.
 * Útil para estadísticas y visualización sin iterar todos los estudiantes.
 */
export interface GrupoInfo {
  /** Número del grupo ("1", "2", etc.) */
  numero: string;
  /** Cantidad de integrantes en el grupo */
  integrantes: number;
  /** Promedio de calificaciones del grupo (opcional) */
  promedio?: number;
}

export interface Curso {
  nombre: string;
  estudiantes: Estudiante[];
  fechaCreacion: Date;
  fechaModificacion: Date;
  color?: string; // Color del curso para UI (selector de curso)

  /**
   * FASE 1: Campo opcional para retrocompatibilidad.
   * Contiene información resumida de grupos.
   * Si no está presente, se calcula dinámicamente desde estudiantes[].
   */
  grupos?: GrupoInfo[];

  /**
   * Cohorte/período académico en el que se desarrolla el curso.
   * Permite identificar el período específico y detectar estudiantes repitentes.
   * Opcional para retrocompatibilidad con cursos existentes.
   */
  cohorte?: Cohorte;
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
