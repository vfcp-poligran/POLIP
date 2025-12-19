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
 * Combina el estudiante con sus calificaciones por entrega.
 * 
 * @example
 * const notaEstudiante: NotaEstudiante = {
 *   estudiante: miEstudiante,
 *   e1: { ei: 15, eg: 20 },  // Entrega 1: 15 ind + 20 grupal = 35
 *   e2: { ei: 18, eg: 22 },  // Entrega 2: 18 ind + 22 grupal = 40
 *   ef: { ei: 25, eg: 30 }   // Final: 25 ind + 30 grupal = 55
 * };
 */
export interface NotaEstudiante {
  /** Referencia al estudiante */
  estudiante: Estudiante;

  /** Calificaciones de Entrega 1 */
  e1?: NotaEntrega;

  /** Calificaciones de Entrega 2 */
  e2?: NotaEntrega;

  /** Calificaciones de Entrega Final */
  ef?: NotaEntrega;
}

/**
 * Calificaciones detalladas de una entrega específica.
 * 
 * Cada entrega tiene dos componentes:
 * - ei (Evaluación Individual): Puntos obtenidos de la rúbrica individual
 * - eg (Evaluación Grupal): Puntos obtenidos de la rúbrica grupal
 * 
 * La nota final de la entrega = ei + eg
 * 
 * @example
 * const notaE1: NotaEntrega = {
 *   ei: 15,    // Rúbrica individual: 15 puntos
 *   eg: 20,    // Rúbrica grupal: 20 puntos
 *   suma: 35   // Total: 35 puntos
 * };
 */
export interface NotaEntrega {
  /**
   * Puntos de Evaluación Individual.
   * Provienen de la rúbrica individual aplicada al estudiante.
   * Se calcula en data.service.ts desde las evaluaciones.
   */
  ei?: number;

  /**
   * Puntos de Evaluación Grupal.
   * Provienen de la rúbrica grupal aplicada al grupo.
   * Todos los integrantes del grupo comparten este valor.
   */
  eg?: number;

  /**
   * Sumatoria calculada: ei + eg.
   * Representa la nota total de la entrega.
   * Se calcula automáticamente al guardar evaluaciones.
   */
  suma?: number;
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

