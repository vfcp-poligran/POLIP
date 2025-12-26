import { Injectable, inject, computed, signal } from '@angular/core';
import { CourseService } from './course.service';
import { StateService } from './state.service';
import { Logger } from '@app/core/utils/logger';
import { Estudiante } from '../models';

/**
 * CohorteService
 * 
 * Servicio especializado para gestión de cohortes.
 * Responsabilidades:
 * - Detección de estudiantes repitentes
 * - Historial de cohortes por estudiante
 * - Reportes y estadísticas por cohorte
 * - Comparativas entre cohortes
 */
@Injectable({
    providedIn: 'root'
})
export class CohorteService {
    private courseService = inject(CourseService);
    private stateService = inject(StateService);

    /**
     * Detecta estudiantes que han cursado la misma materia en diferentes cohortes
     * @param codigoBase Código base del curso (ej: "EPM", "SO")
     * @returns Array de estudiantes repitentes con su historial
     */
    detectarRepitentes(codigoBase: string): EstudianteRepitente[] {
        const cursosData = this.courseService.getCursosValue();
        const uiState = this.stateService.getUIState();
        const repitentes = new Map<string, EstudianteRepitente>();

        // Buscar todos los cursos con el mismo código base
        Object.entries(cursosData).forEach(([codigoCurso, estudiantes]) => {
            const courseState = uiState.courseStates[codigoCurso];

            // Verificar si es el mismo código base
            if (!courseState?.metadata?.codigo?.includes(codigoBase)) {
                return;
            }

            // Revisar cada estudiante
            estudiantes.forEach(est => {
                const key = est.correo;

                if (!repitentes.has(key)) {
                    repitentes.set(key, {
                        correo: est.correo,
                        nombres: est.nombres,
                        apellidos: est.apellidos,
                        cursadas: []
                    });
                }

                const repitente = repitentes.get(key)!;
                repitente.cursadas.push({

                    codigoCurso,
                    ingreso: courseState.metadata?.tipoIngreso || 'N/A',
                    bloque: courseState.metadata?.bloque || 'N/A',
                    anio: courseState.metadata?.fechaCreacion ? new Date(courseState.metadata.fechaCreacion).getFullYear() : new Date().getFullYear(),
                    grupo: est.grupo || '1',
                    calificacionFinal: this.calcularCalificacionFinal(est),
                    estado: this.determinarEstado(est)
                });
            });
        });

        // Filtrar solo estudiantes que realmente repiten (más de 1 cursada)
        const resultado = Array.from(repitentes.values())
            .filter(rep => rep.cursadas.length > 1)
            .map(rep => ({
                ...rep,
                cursadas: rep.cursadas.sort((a, b) => a.anio - b.anio) // Ordenar por año
            }));

        Logger.log(`🔍 [CohorteService] ${resultado.length} estudiantes repitentes en ${codigoBase}`);
        return resultado;
    }

    /**
     * Obtiene el historial completo de cohortes de un estudiante
     * @param correo Correo del estudiante
     * @returns Historial de todas las cohortes cursadas
     */
    getHistorialEstudiante(correo: string): HistorialCohorte {
        const cursosData = this.courseService.getCursosValue();
        const uiState = this.stateService.getUIState();
        const cohortes: CohorteInfo[] = [];

        Object.entries(cursosData).forEach(([codigoCurso, estudiantes]) => {
            const estudiante = estudiantes.find(e => e.correo === correo);

            if (estudiante) {
                const courseState = uiState.courseStates[codigoCurso];

                cohortes.push({
                    curso: courseState.metadata?.nombre || 'Sin nombre',
                    codigoCurso,
                    ingreso: courseState.metadata?.tipoIngreso || 'N/A',
                    bloque: courseState.metadata?.bloque || 'N/A',
                    anio: courseState.metadata?.fechaCreacion ? new Date(courseState.metadata.fechaCreacion).getFullYear() : new Date().getFullYear(),
                    grupo: estudiante.grupo || '1',
                    calificacion: this.calcularCalificacionFinal(estudiante),
                    estado: this.determinarEstado(estudiante)
                });
            }
        });

        return {
            estudiante: correo,
            totalCursos: cohortes.length,
            cohortes: cohortes.sort((a, b) => b.anio - a.anio) // Más recientes primero
        };
    }

    /**
     * Genera reporte estadístico de una cohorte específica
     * @param ingreso Tipo de ingreso (A, B, C, etc.)
     * @param anio Año de la cohorte
     * @returns Reporte con estadísticas
     */
    generarReporteCohorte(ingreso: string, anio: number): ReporteCohorte {
        const cursosData = this.courseService.getCursosValue();
        const uiState = this.stateService.getUIState();

        const estudiantesCohorte: Estudiante[] = [];
        let cursoNombre = '';

        // Buscar estudiantes de la cohorte
        Object.entries(cursosData).forEach(([codigoCurso, estudiantes]) => {
            const courseState = uiState.courseStates[codigoCurso];

            if (courseState?.metadata?.tipoIngreso === ingreso &&
                (courseState?.metadata?.fechaCreacion ? new Date(courseState.metadata.fechaCreacion).getFullYear() : new Date().getFullYear()) === anio) {
                estudiantesCohorte.push(...estudiantes);
                cursoNombre = courseState.metadata?.nombre || '';
            }
        });

        // Calcular estadísticas
        const calificaciones = estudiantesCohorte
            .map(e => this.calcularCalificacionFinal(e))
            .filter(c => c > 0);

        const aprobados = calificaciones.filter(c => c >= 3.0).length;
        const promedio = calificaciones.length > 0
            ? calificaciones.reduce((sum, c) => sum + c, 0) / calificaciones.length
            : 0;

        return {
            ingreso,
            anio,
            cursoNombre,
            totalEstudiantes: estudiantesCohorte.length,
            aprobados,
            reprobados: estudiantesCohorte.length - aprobados,
            tasaAprobacion: estudiantesCohorte.length > 0
                ? (aprobados / estudiantesCohorte.length) * 100
                : 0,
            promedioGeneral: promedio,
            calificacionMaxima: Math.max(...calificaciones, 0),
            calificacionMinima: Math.min(...calificaciones.filter(c => c > 0), 0)
        };
    }

    /**
     * Compara estadísticas entre múltiples cohortes
     * @param ingresos Array de ingresos a comparar
     * @param anio Año de las cohortes
     * @returns Comparativa con métricas
     */
    compararCohortes(ingresos: string[], anio: number): ComparativaCohortes {
        const reportes = ingresos.map(ingreso =>
            this.generarReporteCohorte(ingreso, anio)
        );

        return {
            anio,
            cohortes: reportes,
            mejorPromedio: reportes.reduce((max, r) =>
                r.promedioGeneral > max.promedioGeneral ? r : max
            ),
            mayorTasaAprobacion: reportes.reduce((max, r) =>
                r.tasaAprobacion > max.tasaAprobacion ? r : max
            )
        };
    }

    /**
     * Calcula la calificación final de un estudiante
     * @private
     */
    private calcularCalificacionFinal(estudiante: Estudiante): number {
        // Implementación simplificada - ajustar según lógica real
        const e = estudiante as any;
        const ei1 = e.ei1 || 0;
        const eg1 = e.eg1 || 0;
        const ei2 = e.ei2 || 0;
        const eg2 = e.eg2 || 0;
        const eif = e.eif || 0;
        const egf = e.egf || 0;

        const e1 = ei1 + eg1;
        const e2 = ei2 + eg2;
        const ef = eif + egf;

        return (e1 + e2 + ef) / 3;
    }

    /**
     * Determina el estado del estudiante según su calificación
     * @private
     */
    private determinarEstado(estudiante: Estudiante): EstadoCurso {
        const calificacion = this.calcularCalificacionFinal(estudiante);

        if (calificacion === 0) return 'cursando';
        return calificacion >= 3.0 ? 'aprobado' : 'reprobado';
    }
}

/**
 * Estudiante que ha cursado la materia más de una vez
 */
export interface EstudianteRepitente {
    correo: string;
    nombres: string;
    apellidos: string;
    cursadas: Array<{
        codigoCurso: string;
        ingreso: string;
        bloque: string;
        anio: number;
        grupo: string;
        calificacionFinal: number;
        estado: EstadoCurso;
    }>;
}

/**
 * Historial completo de cohortes de un estudiante
 */
export interface HistorialCohorte {
    estudiante: string;
    totalCursos: number;
    cohortes: CohorteInfo[];
}

/**
 * Información de una cohorte específica
 */
export interface CohorteInfo {
    curso: string;
    codigoCurso: string;
    ingreso: string;
    bloque: string;
    anio: number;
    grupo: string;
    calificacion: number;
    estado: EstadoCurso;
}

/**
 * Reporte estadístico de una cohorte
 */
export interface ReporteCohorte {
    ingreso: string;
    anio: number;
    cursoNombre: string;
    totalEstudiantes: number;
    aprobados: number;
    reprobados: number;
    tasaAprobacion: number;
    promedioGeneral: number;
    calificacionMaxima: number;
    calificacionMinima: number;
}

/**
 * Comparativa entre cohortes
 */
export interface ComparativaCohortes {
    anio: number;
    cohortes: ReporteCohorte[];
    mejorPromedio: ReporteCohorte;
    mayorTasaAprobacion: ReporteCohorte;
}

/**
 * Estado del curso para un estudiante
 */
export type EstadoCurso = 'aprobado' | 'reprobado' | 'cursando';
