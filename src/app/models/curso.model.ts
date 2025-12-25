import { Estudiante } from './estudiante.model';

/**
 * =============================================================================
 * ESTRUCTURA ACADÉMICA - INGRESOS Y BLOQUES
 * =============================================================================
 * 
 * INGRESOS PREDEFINIDOS (Duración total):
 * - Ingreso A: ~120 días (17 semanas)
 * - Ingreso B: ~132 días (19 semanas) - incluye nivelatorios
 * - Ingreso C: ~105 días (15 semanas)
 * 
 * BLOQUES PREDEFINIDOS (Dentro de cada ingreso):
 * Cada ingreso se divide en 2 bloques de ~8 semanas cada uno:
 * - Bloque PRIMERO: ~8 semanas
 * - Bloque SEGUNDO: ~8 semanas
 * - Bloque TRANSVERSAL: Cursos que abarcan todo el período (TRV)
 * 
 * ESPACIAMIENTO ENTRE INGRESOS:
 * - Ingreso B inicia 4 semanas después de Ingreso A
 * - Ingreso C inicia 7 semanas después de Ingreso B
 * 
 * EXTENSIBILIDAD:
 * El sistema permite definir ingresos y bloques personalizados además de los
 * predefinidos. Por ejemplo:
 * - Ingreso D, E, F... (personalizados)
 * - Bloque TERCERO, CUARTO... (personalizados)
 * 
 * EJEMPLO DE CALENDARIO:
 * - Ingreso A: Enero - Mayo (120 días)
 *   - Bloque PRIMERO: Enero - Marzo (8 semanas)
 *   - Bloque SEGUNDO: Marzo - Mayo (8 semanas)
 * - Ingreso B: Febrero - Junio (132 días) [inicia 4 semanas después de A]
 *   - Bloque PRIMERO: Febrero - Abril (8 semanas)
 *   - Bloque SEGUNDO: Abril - Junio (8 semanas)
 * - Ingreso C: Abril - Agosto (105 días) [inicia 7 semanas después de B]
 *   - Bloque PRIMERO: Abril - Junio (8 semanas)
 *   - Bloque SEGUNDO: Junio - Agosto (8 semanas)
 * =============================================================================
 */

/**
 * Tipo de ingreso académico
 * Soporta los ingresos predefinidos (A, B, C) y permite valores personalizados
 * @example 'A' | 'B' | 'C' | 'D' | 'ESPECIAL' | 'VERANO'
 */
export type TipoIngreso = 'A' | 'B' | 'C' | string;

/**
 * Tipo de bloque académico
 * Soporta los bloques predefinidos (PRIMERO, SEGUNDO, TRANSVERSAL) y permite valores personalizados
 * Cada ingreso se divide en 2 bloques de ~8 semanas
 * @example 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL' | 'TERCERO' | 'INTENSIVO'
 */
export type TipoBloque = 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL' | string;

/**
 * Constantes para ingresos predefinidos
 * Útil para validación y UI
 */
export const INGRESOS_PREDEFINIDOS = ['A', 'B', 'C'] as const;

/**
 * Constantes para bloques predefinidos
 * Útil para validación y UI
 */
export const BLOQUES_PREDEFINIDOS = ['PRIMERO', 'SEGUNDO', 'TRANSVERSAL'] as const;

/**
 * Configuración de duración para ingresos predefinidos (en días)
 */
export const DURACION_INGRESOS: Record<string, number> = {
  'A': 120,  // ~17 semanas
  'B': 132,  // ~19 semanas (incluye nivelatorios)
  'C': 105   // ~15 semanas
};

/**
 * Información de ingreso/período académico
 * Permite rastrear cuándo se dictó un curso y detectar estudiantes repitentes
 * 
 * @example
 * // Ingreso predefinido
 * {
 *   nombre: "202410 B2",
 *   tipo: "B",              // Ingreso B (132 días con nivelatorios)
 *   bloque: "SEGUNDO",      // Segundo bloque del ingreso
 *   fechaInicio: new Date("2024-10-01"),
 *   fechaFin: new Date("2025-02-10")
 * }
 * 
 * @example
 * // Ingreso personalizado
 * {
 *   nombre: "202460 VERANO1",
 *   tipo: "VERANO",         // Ingreso personalizado
 *   bloque: "INTENSIVO",    // Bloque personalizado
 *   fechaInicio: new Date("2024-06-01"),
 *   fechaFin: new Date("2024-07-15")
 * }
 */
export interface Ingreso {
  /** Nombre del ingreso (ej: "202410 B2", "202510 B1", "202560 VERANO1") */
  nombre: string;
  /** 
   * Tipo de ingreso (predefinido: A, B, C o personalizado: D, E, VERANO, etc.)
   * Para ingresos predefinidos, se usa la duración estándar
   * Para personalizados, la duración se calcula desde fechaInicio/fechaFin
   */
  tipo: TipoIngreso;
  /** 
   * Bloque académico (predefinido: PRIMERO, SEGUNDO o personalizado: TERCERO, INTENSIVO, etc.)
   * Para bloques predefinidos, duración ~8 semanas
   * Para personalizados, la duración se calcula desde fechaInicio/fechaFin
   */
  bloque: TipoBloque;
  /** Fecha de inicio del período académico */
  fechaInicio: Date;
  /** Fecha de fin del período académico */
  fechaFin: Date;
  /** 
   * Duración personalizada en días (opcional)
   * Si no se especifica, se usa DURACION_INGRESOS para tipos predefinidos
   * o se calcula desde fechaInicio/fechaFin
   */
  duracionDias?: number;
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

  /** Código del curso (ej: "EPM-B01-BLQ2-V") */
  codigo?: string;

  /**
   * Año académico del curso
   * Extraído del timestamp o especificado manualmente
   * @example 2024, 2025
   */
  anio?: number;

  /**
   * FASE 1: Campo opcional para retrocompatibilidad.
   * Contiene información resumida de grupos.
   * Si no está presente, se calcula dinámicamente desde estudiantes[].
   */
  grupos?: GrupoInfo[];

  /**
   * Tipo de ingreso simple (A, B, C)
   * Primera letra del código de grupo extraído del CSV
   */
  tipoIngreso?: TipoIngreso;

  /**
   * Bloque académico (PRIMERO, SEGUNDO, TRANSVERSAL)
   */
  bloque?: TipoBloque;

  /**
   * Modalidad del curso (VIRTUAL, PRESENCIAL, TEORICO-VIRTUAL, etc.)
   */
  modalidad?: string;

  /**
   * Ingreso/período académico completo (objeto con fechas).
   * Permite identificar el período específico y detectar estudiantes repitentes.
   * Opcional para retrocompatibilidad con cursos existentes.
   */
  ingreso?: Ingreso;
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
