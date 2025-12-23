/**
 * =============================================================================
 * MODELO DE ESTUDIANTE
 * =============================================================================
 * 
 * Este módulo define la estructura de datos para representar estudiantes
 * en el sistema de gestión académica.
 * 
 * RELACIONES:
 * - Estudiante pertenece a un Curso (cursos.page.ts)
 * - Estudiante tiene Notas por entrega (NotaEstudiante)
 * - Estudiante puede tener Novedades asociadas (novedad.model.ts)
 * 
 * FUENTES DE DATOS:
 * - Importación CSV de Canvas LMS
 * - data.service.ts gestiona la persistencia
 * 
 * @module models/estudiante.model
 */

/**
 * Interfaz principal que representa a un estudiante en el sistema.
 * 
 * @example
 * const estudiante: Estudiante = {
 *   correo: 'juan.perez@correo.edu',
 *   nombres: 'Juan Carlos',
 *   apellidos: 'Pérez García',
 *   grupo: '5',
 *   canvasUserId: '12345'
 * };
 */
export interface Estudiante {
  /**
   * Identificador único de Canvas para el estudiante.
   * Se obtiene del campo 'id' en el CSV de Canvas.
   * Usado para sincronización con Canvas LMS.
   */
  canvasUserId?: string;

  /**
   * Identificador único de Canvas para el grupo.
   * Uso interno para matching de evaluaciones grupales.
   */
  canvasGroupId?: string;

  /**
   * Apellidos del estudiante.
   * Se obtiene parseando el campo "Student" del CSV Canvas.
   * Formato esperado: "Apellidos, Nombres"
   */
  apellidos: string;

  /**
   * Nombres del estudiante.
   * Se obtiene parseando el campo "Student" del CSV Canvas.
   */
  nombres: string;

  /**
   * Correo electrónico institucional.
   * Actúa como identificador único principal en el sistema.
   * Usado para búsquedas y asociaciones.
   */
  correo: string;

  /**
   * Código o nombre del curso al que pertenece.
   * Ej: "EPM-B01-BLQ2-V" o "PROGRAMACIÓN MÓVIL"
   */
  curso?: string;

  /**
   * Número de grupo extraído del group_name.
   * Solo el número: "1", "5", "12"
   * Usado para mostrar en UI y filtrar integrantes.
   */
  grupo: string;

  /**
   * Nombre completo del grupo del CSV.
   * Ej: "Grupo 1", "Grupo 5"
   * Preservado para referencia y debugging.
   */
  groupName?: string;

  /**
   * Historial de ingresos en los que el estudiante ha cursado materias.
   * Formato: { "EPM": ["202410 B2", "202510 B1"], "RC": ["202410 B1"] }
   * Permite detectar si un estudiante es repitente en un curso.
   * La clave es el código base del curso (ej: "EPM", "SO", "BD").
   */
  historialIngresos?: Record<string, string[]>;
}

/**
 * =============================================================================
 * ESTRUCTURA DE CALIFICACIONES POR ENTREGA
 * =============================================================================
 * 
 * Sistema de calificación bidimensional:
 * - Eje 1: Entregas (E1, E2, EF)
 * - Eje 2: Tipo de evaluación (Individual, Grupal)
 * 
 * Nomenclatura:
 * - ei = Evaluación Individual (puntos de rúbrica individual)
 * - eg = Evaluación Grupal (puntos de rúbrica grupal)
 * - 1, 2, f = Número de entrega (1, 2, Final)
 */

/**
 * Estructura que contiene todas las notas de un estudiante.
 * Combina el estudiante con sus calificaciones por entrega (suma total).
 * 
 * Los valores e1, e2, ef representan la suma de puntos individuales + grupales.
 * Los puntos desglosados se almacenan en CalificacionesEstudiante (ei1, eg1, etc.)
 * 
 * @example
 * const notaEstudiante: NotaEstudiante = {
 *   estudiante: miEstudiante,
 *   e1: 35,   // Entrega 1: ei1 + eg1 = 35
 *   e2: 40,   // Entrega 2: ei2 + eg2 = 40
 *   ef: 55    // Final: eif + egf = 55
 * };
 */
export interface NotaEstudiante {
  /** Referencia al estudiante */
  estudiante: Estudiante;

  /** 
   * Calificación total de Entrega 1.
   * Calculada como: ei1 + eg1 (puntos individuales + grupales)
   * Se exporta al CSV de Canvas en la columna 4.
   */
  e1?: number;

  /** 
   * Calificación total de Entrega 2.
   * Calculada como: ei2 + eg2 (puntos individuales + grupales)
   * Se exporta al CSV de Canvas en la columna 5.
   */
  e2?: number;

  /** 
   * Calificación total de Entrega Final.
   * Calculada como: eif + egf (puntos individuales + grupales)
   * Se exporta al CSV de Canvas en la columna 6.
   */
  ef?: number;
}

/**
 * =============================================================================
 * ESTRUCTURA ALTERNATIVA: CalificacionesEstudiante (Campos Planos)
 * =============================================================================
 * 
 * Esta interfaz proporciona acceso plano a todas las calificaciones
 * sin la estructura anidada. Útil para exportación y tablas.
 * 
 * ei1 = Entrega 1, Individual
 * eg1 = Entrega 1, Grupal
 * ei2 = Entrega 2, Individual
 * eg2 = Entrega 2, Grupal
 * eif = Entrega Final, Individual
 * egf = Entrega Final, Grupal
 */
export interface CalificacionesEstudiante {
  /** Entrega 1 - Puntos Individuales (Rúbrica Individual) */
  ei1?: number;

  /** Entrega 1 - Puntos Grupales (Rúbrica Grupal) */
  eg1?: number;

  /** Entrega 2 - Puntos Individuales (Rúbrica Individual) */
  ei2?: number;

  /** Entrega 2 - Puntos Grupales (Rúbrica Grupal) */
  eg2?: number;

  /** Entrega Final - Puntos Individuales (Rúbrica Individual) */
  eif?: number;

  /** Entrega Final - Puntos Grupales (Rúbrica Grupal) */
  egf?: number;
}

/**
 * Extensión del modelo Estudiante con calificaciones planas.
 * Útil para vistas de tabla y exportación a CSV/Excel.
 * 
 * @example
 * const estudianteConNotas: EstudianteConCalificaciones = {
 *   ...estudiante,
 *   ei1: 15, eg1: 20,  // E1 = 35
 *   ei2: 18, eg2: 22,  // E2 = 40
 *   eif: 25, egf: 30   // EF = 55
 * };
 */
export interface EstudianteConCalificaciones extends Estudiante, CalificacionesEstudiante {
  // Hereda todos los campos de Estudiante y CalificacionesEstudiante
}

