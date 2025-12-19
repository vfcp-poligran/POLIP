// Re-exportar todos los modelos para facilitar las importaciones
export * from './curso.model';
export * from './estudiante.model';
export * from './evaluacion.model';
export * from './app-state.model';
export * from './comentario-grupo.model';
export * from './novedad.model';  // Sistema de novedades

// Re-exportar tipos extendidos de evaluacion.model para compatibilidad
export type {
  EscalaCalificacion,
  NivelRubricaDetallado
} from './evaluacion.model';
