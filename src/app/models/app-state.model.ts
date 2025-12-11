export interface UIState {
  cursoActivo: string | null;
  grupoSeguimientoActivo: string | null; // Grupo seleccionado en seguimiento
  mostrarNombreCorto?: boolean; // Controla si se muestra nombre corto en los botones de curso
  courseStates: { [cursoNombre: string]: CourseState };
}

export interface CourseState {
  activeStudent: string | null; // email del estudiante activo
  activeGroup: string | null;
  activeDelivery: 'E1' | 'E2' | 'EF' | null;
  activeType: 'PG' | 'PI' | null;
  filtroGrupo: string;
  emailsVisible: boolean;
  isScrollingTable: boolean;
  integrantesSeleccionados?: string[]; // Correos de integrantes seleccionados en el panel
  color?: string; // Color personalizado para el botón del curso
  metadata?: {
    nombre: string;                    // Nombre completo: "PROGRAMACIÓN MÓVIL"
    nombreAbreviado?: string;          // Código abreviado: "EPM-B01-BLQ2-V"
    codigoUnico?: string;              // Código interno único: "EPM-B01-BLQ2-V-20251121"
    codigo: string;                    // Código base sin timestamp
    bloque: string;
    fechaCreacion: string;
    profesor: string;
  };
  archivoCalificaciones?: {
    nombre: string;
    fechaCarga: string;
    contenidoOriginal: string;  // CSV completo para exportar a Canvas (mantiene estructura original)
    calificaciones: {            // Campos procesados para búsquedas y visualización
      id: string;                // Campo 1: ID de Canvas (canvasUserId)
      e1: string;                // Campo 4: Entrega proyecto 1 - Escenario 3
      e2: string;                // Campo 5: Entrega proyecto 2 - Escenario 5
      ef: string;                // Campo 6: Entrega final y sustentacion - Escenario 7 y 8
    }[];
  };
  rubricasAsociadas?: {
    entrega1: string | null;
    entrega1Individual: string | null;
    entrega2: string | null;
    entrega2Individual: string | null;
    entregaFinal: string | null;
    entregaFinalIndividual: string | null;
  };
}

export interface AppBackup {
  cursos: any;
  evaluaciones: any;
  ui: UIState;
  rubricas: any;
  version: string;
  fechaExportacion: Date;
}

export interface HistorialAccion {
  timestamp: Date;
  accion: string;
  datosAntes: any;
  datosDespues: any;
}
