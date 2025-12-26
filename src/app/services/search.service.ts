import { Injectable, inject, signal, computed } from '@angular/core';
import { CourseService } from './course.service';
import { Logger } from '@app/core/utils/logger';
import { Estudiante } from '../models';

/**
 * SearchService
 * 
 * Servicio especializado para búsqueda global.
 * Responsabilidades:
 * - Búsqueda cross-course de estudiantes
 * - Indexación para búsqueda rápida
 * - Filtros y ordenamiento de resultados
 */
@Injectable({
    providedIn: 'root'
})
export class SearchService {
    private courseService = inject(CourseService);

    // Estado de búsqueda
    private _searchQuery = signal<string>('');
    private _searchResults = signal<EstudianteConCurso[]>([]);

    // Exposición pública
    public searchQuery = this._searchQuery.asReadonly();
    public searchResults = this._searchResults.asReadonly();

    /**
     * Realiza búsqueda global de estudiantes en todos los cursos
     * @param query Término de búsqueda
     * @returns Array de estudiantes que coinciden con la búsqueda
     */
    searchGlobal(query: string): EstudianteConCurso[] {
        this._searchQuery.set(query);

        if (!query || query.trim().length < 2) {
            this._searchResults.set([]);
            return [];
        }

        const queryLower = query.toLowerCase().trim();
        const cursosData = this.courseService.getCursosValue();
        const resultados: EstudianteConCurso[] = [];

        // Buscar en todos los cursos
        Object.entries(cursosData).forEach(([codigoCurso, estudiantes]) => {
            estudiantes.forEach(estudiante => {
                if (this.matchesQuery(estudiante, queryLower)) {
                    resultados.push({
                        ...estudiante,
                        curso: codigoCurso
                    });
                }
            });
        });

        // Ordenar por relevancia
        const resultadosOrdenados = this.ordenarPorRelevancia(resultados, queryLower);

        this._searchResults.set(resultadosOrdenados);
        Logger.log(`🔍 [SearchService] ${resultadosOrdenados.length} resultados para: "${query}"`);

        return resultadosOrdenados;
    }

    /**
     * Verifica si un estudiante coincide con la query
     * @private
     */
    private matchesQuery(estudiante: Estudiante, queryLower: string): boolean {
        const searchableText = `
      ${estudiante.nombres}
      ${estudiante.apellidos}
      ${estudiante.correo}
      ${estudiante.grupo}
    `.toLowerCase();

        return searchableText.includes(queryLower);
    }

    /**
     * Ordena resultados por relevancia
     * @private
     */
    private ordenarPorRelevancia(
        resultados: EstudianteConCurso[],
        query: string
    ): EstudianteConCurso[] {
        return resultados.sort((a, b) => {
            // Prioridad 1: Coincidencia exacta en nombre
            const aNameMatch = a.nombres.toLowerCase().includes(query);
            const bNameMatch = b.nombres.toLowerCase().includes(query);
            if (aNameMatch !== bNameMatch) {
                return aNameMatch ? -1 : 1;
            }

            // Prioridad 2: Coincidencia exacta en apellido
            const aLastNameMatch = a.apellidos.toLowerCase().includes(query);
            const bLastNameMatch = b.apellidos.toLowerCase().includes(query);
            if (aLastNameMatch !== bLastNameMatch) {
                return aLastNameMatch ? -1 : 1;
            }

            // Prioridad 3: Orden alfabético por apellido
            return a.apellidos.localeCompare(b.apellidos);
        });
    }

    /**
     * Limpia los resultados de búsqueda
     */
    clearSearch(): void {
        this._searchQuery.set('');
        this._searchResults.set([]);
    }

    /**
     * Busca estudiantes en un curso específico
     * @param codigoCurso Código del curso
     * @param query Término de búsqueda
     */
    searchInCourse(codigoCurso: string, query: string): Estudiante[] {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const queryLower = query.toLowerCase().trim();
        const estudiantes = this.courseService.getCurso(codigoCurso) || [];

        return estudiantes.filter(est => this.matchesQuery(est, queryLower));
    }
}

/**
 * Estudiante con información del curso
 */
export interface EstudianteConCurso extends Estudiante {
    curso: string;
}
