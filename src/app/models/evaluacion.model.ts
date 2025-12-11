export interface EscalaCalificacion {
  min: number;
  max: number;
  rango: string;
  descripcion: string;
}

export interface RubricaDefinicion {
  id: string;
  nombre: string;
  descripcion: string;
  criterios: CriterioRubrica[];
  // Campos extendidos para compatibilidad con sistema de importación
  puntuacionTotal?: number;
  escalaCalificacion?: EscalaCalificacion[];
  cursosCodigos?: string[]; // Códigos de cursos asociados
  cursoAsociado?: string; // Nombre legible del curso asociado (ej: "ÉNFASIS EN PROGRAMACIÓN MÓVIL")
  tipoEntrega?: string; // 'Entrega 1', 'Entrega 2', 'Entrega Final', etc.
  tipoRubrica?: 'PG' | 'PI'; // 'PG' = Proyecto Grupal, 'PI' = Proyecto Individual
  fechaCreacion?: Date;
  fechaModificacion?: Date;
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
