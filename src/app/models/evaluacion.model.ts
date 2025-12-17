/** Escala de calificación para rangos de puntuación */
export interface EscalaCalificacion {
  min: number;
  max: number;
  rango: string;
  descripcion: string;
  /** Nivel descriptivo (opcional, para JSON externo) */
  nivel?: string;
}

/** Tipos de entrega disponibles */
export type TipoEntrega = 'E1' | 'E2' | 'EF';

/** Tipos de rúbrica: Proyecto Grupal o Individual */
export type TipoRubrica = 'PG' | 'PI';

/** Estados de una rúbrica */
export type EstadoRubrica = 'borrador' | 'publicada';

/** Títulos estándar para los 4 niveles de evaluación */
export const NIVELES_ESTANDAR = ['Insuficiente', 'Aceptable', 'Bueno', 'Excelente'] as const;

/** Número fijo de niveles por criterio */
export const CANTIDAD_NIVELES = 4;

// ============================================================================
// INTERFACES PARA FORMATO JSON EXTERNO (Importación)
// ============================================================================

/**
 * Nivel de detalle en formato JSON externo
 * @description Estructura del JSON de importación para niveles de criterio
 */
export interface NivelRubricaJSON {
  numero: number;
  minimo: number;
  maximo: number;
  titulo: string;
  descripcion: string;
}

/**
 * Criterio en formato JSON externo
 * @description Estructura del JSON de importación para criterios
 */
export interface CriterioRubricaJSON {
  id: number;
  nombre: string;
  peso: number;
  niveles: number;
  nivel: NivelRubricaJSON[];
}

/**
 * Escala de calificación en formato JSON externo
 */
export interface EscalaCalificacionJSON {
  min: number;
  max: number;
  nivel: string;
  descripcion: string;
}

/**
 * Formato completo de rúbrica en JSON para importación/exportación
 * @description Estructura estandarizada para archivos .json de rúbricas
 * @example
 * {
 *   "rubrica_id": "RGE1",
 *   "curso": "ÉNFASIS EN PROGRAMACIÓN MÓVIL",
 *   "puntuacion_total": 75,
 *   "escala_calificacion": [...],
 *   "criterios": [...]
 * }
 */
export interface RubricaJSON {
  /** Identificador de la rúbrica (ej: RGE1, RIE2) */
  rubrica_id: string;
  /** Nombre del curso asociado */
  curso: string;
  /** Puntuación máxima total */
  puntuacion_total: number;
  /** Escala de calificación con rangos y descripciones */
  escala_calificacion: EscalaCalificacionJSON[];
  /** Lista de criterios de evaluación */
  criterios: CriterioRubricaJSON[];
  /** Tipo de rúbrica (opcional, se detecta del ID si no está) */
  tipo?: 'grupal' | 'individual' | 'PG' | 'PI';
  /** Tipo de entrega (opcional, se detecta del ID si no está) */
  entrega?: 'E1' | 'E2' | 'EF' | string;
}

/**
 * Definición completa de una rúbrica de evaluación
 * @example
 * const rubrica: RubricaDefinicion = {
 *   id: 'rge1-epm-001',
 *   nombre: 'Rúbrica Grupal Entrega 1',
 *   codigo: 'RGE1-EPM-001',
 *   tipoRubrica: 'PG',
 *   tipoEntrega: 'E1'
 * }
 */
export interface RubricaDefinicion {
  /** Identificador único interno */
  id: string;
  /** Nombre descriptivo de la rúbrica */
  nombre: string;
  /** Descripción o nombre del curso asociado */
  descripcion: string;
  /** Lista de criterios de evaluación */
  criterios: CriterioRubrica[];
  /** Puntuación máxima total */
  puntuacionTotal?: number;
  /** Escala de calificación con rangos */
  escalaCalificacion?: EscalaCalificacion[];
  /** Códigos de cursos donde aplica esta rúbrica */
  cursosCodigos?: string[];
  /** Nombre legible del curso asociado */
  cursoAsociado?: string;
  /** Tipo de entrega: E1, E2, EF */
  tipoEntrega?: TipoEntrega;
  /** Tipo de evaluación: PG (Grupal) o PI (Individual) */
  tipoRubrica?: TipoRubrica;
  /** Fecha de creación */
  fechaCreacion?: Date;
  /** Última fecha de modificación */
  fechaModificacion?: Date;
  /** Código estructurado: R[G|I][E1|E2|EF]-[CURSO]-[VERSION] */
  codigo?: string;
  /** Número de versión (consecutivo) */
  version?: number;
  /** Indica si esta versión está activa */
  activa?: boolean;
  /** Timestamp de creación para unicidad */
  timestamp?: number;
  /** Estado de la rúbrica: borrador o publicada */
  estado?: EstadoRubrica;
}

export interface CriterioRubrica {
  titulo: string;
  descripcion?: string;
  peso?: number;
  pesoMaximo?: number;
  nivelesDetalle: NivelRubricaDetallado[];
}

export interface NivelRubricaDetallado {
  puntos: string; // "0", "1", "0-9", "10-20", etc.
  puntosMin: number; // Para cálculos
  puntosMax: number; // Para cálculos
  titulo: string; // "Insuficiente", "Aceptable", "Excelente", etc.
  descripcion: string;
  color?: string; // Color asociado al nivel
}

export interface EvaluacionCriterio {
  criterioTitulo: string;
  nivelSeleccionado?: string;
  puntosObtenidos?: number;
  puntosPersonalizados?: boolean;
  comentario?: string;
  descuento?: number;
}

export interface Evaluacion {
  cursoNombre: string;
  entrega: 'E1' | 'E2' | 'EF';
  tipo: 'PG' | 'PI'; // Puntaje Grupal o Puntaje Individual
  grupo?: string; // Para PG
  estudianteEmail?: string; // Para PI
  rubricaId: string;
  criterios: EvaluacionCriterio[];
  puntosTotales: number;
  fechaEvaluacion: Date;
  comentarioGeneral?: string;
}

export interface EstadoEvaluacion {
  completa: boolean;
  puntosTotales: number;
  criteriosEvaluados: number;
  totalCriterios: number;
}
