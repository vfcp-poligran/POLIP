import { Injectable, inject } from '@angular/core';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private dataService = inject(DataService);

  /**
   * Exporta todos los datos de un curso específico en formato CSV
   */
  async exportarDatosCurso(codigoCurso: string): Promise<void> {
    try {
      // Obtener datos del curso desde DataService
      const cursos = this.dataService.getCursos();
      const todasLasEvaluaciones = this.dataService.getAllEvaluaciones();
      const estudiantes = cursos[codigoCurso] || [];

      // Obtener metadata del curso
      const uiState = this.dataService.getUIState();
      const metadata = uiState.courseStates?.[codigoCurso]?.metadata;
      const nombreCurso = metadata ? metadata.nombre : codigoCurso;

      if (!estudiantes || estudiantes.length === 0) {
        throw new Error('No hay estudiantes en este curso para exportar');
      }

      // Filtrar evaluaciones del curso
      const evaluacionesCurso = Object.values(todasLasEvaluaciones).filter(evaluacion =>
        evaluacion.cursoNombre === codigoCurso
      );

      // Crear el contenido CSV
      let csvContent = this.generarCSVCurso(estudiantes, evaluacionesCurso);

      // Descargar el archivo
      this.descargarArchivo(csvContent, `${nombreCurso.replace(/[^a-zA-Z0-9]/g, '_')}_${codigoCurso}.csv`);

    } catch (error) {
      throw new Error(`Error al exportar datos del curso: ${error}`);
    }
  }

  /**
   * Exporta todos los cursos disponibles en formato CSV
   */
  async exportarTodosLosCursos(): Promise<void> {
    try {
      const cursos = this.dataService.getCursos();
      const todasLasEvaluaciones = this.dataService.getAllEvaluaciones();
      const uiState = this.dataService.getUIState();
      const codigosCursos = Object.keys(cursos);

      if (codigosCursos.length === 0) {
        throw new Error('No hay cursos disponibles para exportar');
      }

      let csvContent = '';
      let isFirstCourse = true;

      for (const codigoCurso of codigosCursos) {
        const estudiantes = cursos[codigoCurso];

        if (estudiantes && estudiantes.length > 0) {
          if (!isFirstCourse) {
            csvContent += '\n'; // Separar cursos
          }

          const metadata = uiState.courseStates?.[codigoCurso]?.metadata;
          csvContent += `# CURSO: ${metadata?.nombre || codigoCurso} - [${codigoCurso}]\n`;

          // Filtrar evaluaciones del curso
          const evaluacionesCurso = Object.values(todasLasEvaluaciones).filter(evaluacion =>
            evaluacion.cursoNombre === codigoCurso
          );

          csvContent += this.generarCSVCurso(estudiantes, evaluacionesCurso);
          isFirstCourse = false;
        }
      }

      if (csvContent) {
        this.descargarArchivo(csvContent, `Todos_los_Cursos_${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        throw new Error('No hay datos para exportar');
      }

    } catch (error) {
      throw new Error(`Error al exportar todos los cursos: ${error}`);
    }
  }

  /**
   * Genera el contenido CSV para un curso específico
   */
  private generarCSVCurso(estudiantes: any[], calificaciones: any[]): string {
    if (!estudiantes || estudiantes.length === 0) {
      return '';
    }

    // Obtener todas las columnas únicas de calificaciones
    const columnasCalificaciones = new Set<string>();
    calificaciones.forEach(cal => {
      Object.keys(cal).forEach(key => {
        if (key !== 'id' && key !== 'estudianteId' && key !== 'curso') {
          columnasCalificaciones.add(key);
        }
      });
    });

    const columnasCalArray = Array.from(columnasCalificaciones).sort();

    // Crear el header del CSV
    const headers = [
      'ID',
      'Nombre',
      'Email',
      ...columnasCalArray
    ];

    let csvContent = headers.join(',') + '\n';

    // Agregar datos de cada estudiante
    estudiantes.forEach(estudiante => {
      const calificacionEstudiante = calificaciones.find(cal => cal.estudianteId === estudiante.id) || {};

      const fila = [
        this.escaparCSV(estudiante.id || ''),
        this.escaparCSV(estudiante.nombre || ''),
        this.escaparCSV(estudiante.email || ''),
        ...columnasCalArray.map(col => this.escaparCSV(calificacionEstudiante[col] || ''))
      ];

      csvContent += fila.join(',') + '\n';
    });

    return csvContent;
  }

  /**
   * Escapa valores para formato CSV
   */
  private escaparCSV(valor: any): string {
    let str = String(valor || '');

    // Si contiene comas, comillas o saltos de línea, envolver en comillas
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      // Duplicar comillas internas y envolver en comillas
      str = '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  /**
   * Descarga un archivo
   */
  private descargarArchivo(contenido: string, nombreArchivo: string): void {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporta las rúbricas en formato CSV con información de cursos asociados
   */
  async exportarRubricas(rubricas: any[]): Promise<void> {
    try {
      if (!rubricas || rubricas.length === 0) {
        throw new Error('No hay rúbricas para exportar');
      }

      const headers = [
        'ID',
        'Título',
        'Puntuación Total',
        'Tipo de Entrega',
        'Cursos Asociados',
        'Número de Criterios',
        'Fecha de Creación',
        'Fecha de Modificación'
      ];

      let csvContent = headers.join(',') + '\n';

      rubricas.forEach(rubrica => {
        const fila = [
          this.escaparCSV(rubrica.id || ''),
          this.escaparCSV(rubrica.titulo || ''),
          this.escaparCSV(rubrica.puntuacionTotal || ''),
          this.escaparCSV(rubrica.tipoEntrega || ''),
          this.escaparCSV((rubrica.cursosCodigos || []).join('; ') || ''),
          this.escaparCSV(rubrica.criterios?.length || 0),
          this.escaparCSV(rubrica.fechaCreacion ? new Date(rubrica.fechaCreacion).toLocaleDateString() : ''),
          this.escaparCSV(rubrica.fechaModificacion ? new Date(rubrica.fechaModificacion).toLocaleDateString() : '')
        ];

        csvContent += fila.join(',') + '\n';
      });

      this.descargarArchivo(csvContent, `Rubricas_${new Date().toISOString().split('T')[0]}.csv`);

    } catch (error) {
      throw new Error(`Error al exportar rúbricas: ${error}`);
    }
  }
}
