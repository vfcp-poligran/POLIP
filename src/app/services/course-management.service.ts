import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CourseService } from './course.service';
import { RubricService } from './rubric.service';
import { StateService } from './state.service';
import { Logger } from '@app/core/utils/logger';
import { Estudiante, Curso, GrupoInfo } from '../models';

/**
 * CourseManagementService
 * 
 * Servicio especializado para la gestión de cursos.
 * Responsabilidades:
 * - CRUD de cursos
 * - Generación de códigos únicos
 * - Gestión de grupos
 * - Validación de duplicados
 * - Búsqueda y resolución de códigos
 */
@Injectable({
    providedIn: 'root'
})
export class CourseManagementService {
    private courseService = inject(CourseService);
    private rubricService = inject(RubricService);
    private stateService = inject(StateService);

    /**
     * Extrae el código base de un código de curso completo
     * @param codigoCurso Código completo del curso (ej: "EPM-B01-BLQ2-V")
     * @returns Código base (ej: "EPM")
     * @example
     * extraerCodigoBaseCurso("EPM-B01-BLQ2-V") // "EPM"
     * extraerCodigoBaseCurso("SO-B09-BLQ2") // "SO"
     */
    extraerCodigoBaseCurso(codigoCurso: string): string {
        if (!codigoCurso) return '';

        // Buscar el patrón: letras iniciales antes de "-B" o "-" seguido de número
        const match = codigoCurso.match(/^([A-Za-z]+)(?:-[Bb]\d|$|-\d)/);
        if (match) {
            return match[1].toUpperCase();
        }

        // Fallback: tomar todo hasta el primer guión
        const primeraParteMatch = codigoCurso.match(/^([A-Za-z]+)/);
        return primeraParteMatch ? primeraParteMatch[1].toUpperCase() : codigoCurso.toUpperCase();
    }

    /**
     * Genera información de grupos desde un array de estudiantes
     * @param estudiantes Array de estudiantes del curso
     * @returns Array de GrupoInfo con estadísticas por grupo
     */
    generarGruposInfo(estudiantes: Estudiante[]): GrupoInfo[] {
        const gruposMap = new Map<string, Estudiante[]>();

        // Agrupar estudiantes por número de grupo
        estudiantes.forEach(est => {
            const grupo = est.grupo || '1';
            if (!gruposMap.has(grupo)) {
                gruposMap.set(grupo, []);
            }
            gruposMap.get(grupo)!.push(est);
        });

        // Convertir a GrupoInfo
        return Array.from(gruposMap.entries()).map(([numero, integrantes]) => ({
            numero,
            integrantes: integrantes.length,
            // promedio se calculará después si hay calificaciones
        }));
    }

    /**
     * Crea un nuevo curso con validación de código único
     * @param cursoData Datos del curso a crear
     * @returns El código único del curso creado
     * @throws Error si ya existe un curso con el mismo código
     */
    async crearCurso(cursoData: any): Promise<string> {
        Logger.log('🔧 [CourseManagement] Iniciando creación de curso:', cursoData);

        // Generar código único con timestamp
        const timestamp = Date.now();
        const nombreClave = `${cursoData.codigo}-${timestamp}`;

        // Validar que no exista ya
        const uiState = this.stateService.getUIState();
        const cursosActuales = this.courseService.getCursosValue();

        if (cursosActuales[nombreClave]) {
            throw new Error(`❌ Ya existe un curso con código: ${nombreClave}`);
        }

        // Validar código base duplicado (advertencia, no error)
        const codigoBase = this.extraerCodigoBaseCurso(cursoData.codigo);
        const cursosDuplicados = Object.keys(cursosActuales).filter(
            key => this.extraerCodigoBaseCurso(key) === codigoBase
        );

        if (cursosDuplicados.length > 0) {
            Logger.warn(`⚠️ Ya existen ${cursosDuplicados.length} cursos con código base "${codigoBase}"`);
        }

        // Crear curso en storage
        const nuevosCursos = {
            ...cursosActuales,
            [nombreClave]: cursoData.estudiantes || []
        };

        await this.courseService.saveCursos(nuevosCursos);

        // Generar grupos si hay estudiantes
        const grupos = cursoData.estudiantes?.length > 0
            ? this.generarGruposInfo(cursoData.estudiantes)
            : [];

        // Actualizar UI State con metadata
        const nuevoCourseState = {
            codigo: cursoData.codigo,
            nombre: cursoData.nombre,
            color: cursoData.color || this.generarColorAleatorio(),
            filtroGrupo: 'todos',
            anio: cursoData.anio,
            grupos: grupos,
            tipoIngreso: cursoData.tipoIngreso,
            bloque: cursoData.bloque,
            modalidad: cursoData.modalidad,
            ingreso: cursoData.ingreso
        };

        const nuevoUIState = {
            ...uiState,
            courseStates: {
                ...uiState.courseStates,
                [nombreClave]: nuevoCourseState
            }
        };

        this.stateService.updateUIStateState(nuevoUIState);

        // Heredar rúbricas si existe curso padre
        if (cursoData.cursoPadre) {
            await this.heredarRubricas(cursoData.cursoPadre, nombreClave);
        }

        Logger.log(`✅ Curso creado exitosamente: ${nombreClave}`, {
            estudiantes: cursoData.estudiantes?.length || 0,
            grupos: grupos.length
        });

        return nombreClave;
    }

    /**
     * Actualiza los estudiantes de un curso
     * @param codigoCurso Código único del curso
     * @param estudiantes Nuevos estudiantes
     */
    async actualizarEstudiantesCurso(codigoCurso: string, estudiantes: Estudiante[]): Promise<void> {
        await this.courseService.actualizarEstudiantesCurso(codigoCurso, estudiantes);

        // Actualizar grupos en UI State
        const grupos = this.generarGruposInfo(estudiantes);
        const uiState = this.stateService.getUIState();

        if (uiState.courseStates[codigoCurso]) {
            const nuevoUIState = {
                ...uiState,
                courseStates: {
                    ...uiState.courseStates,
                    [codigoCurso]: {
                        ...uiState.courseStates[codigoCurso],
                        grupos
                    }
                }
            };

            this.stateService.updateUIStateState(nuevoUIState);
        }

        Logger.log(`✅ Estudiantes actualizados: ${codigoCurso} (${estudiantes.length} estudiantes, ${grupos.length} grupos)`);
    }

    /**
     * Elimina un curso completo del sistema
     * @param codigoUnico Código único del curso
     */
    async eliminarCurso(codigoUnico: string): Promise<void> {
        Logger.log(`🗑️ [CourseManagement] Eliminando curso: ${codigoUnico}`);

        // Eliminar datos del curso
        await this.courseService.eliminarCursoData(codigoUnico);

        // Eliminar metadata de UI State
        const uiState = this.stateService.getUIState();
        const { [codigoUnico]: removed, ...restantes } = uiState.courseStates;

        const nuevoUIState = {
            ...uiState,
            courseStates: restantes
        };

        this.stateService.updateUIStateState(nuevoUIState);

        Logger.log(`✅ Curso eliminado: ${codigoUnico}`);
    }

    /**
     * Obtiene el código único del curso desde diferentes identificadores
     * @param identificador Puede ser código único completo, código base, o nombre
     * @returns Código único del curso o el identificador si no se encuentra
     */
    getCourseCodeFromNameOrCode(identificador: string): string {
        if (!identificador) return '';

        const uiState = this.stateService.getUIState();
        const cursosActuales = this.courseService.getCursosValue();

        // 1. Verificar si ya es un código único válido
        if (cursosActuales[identificador]) {
            return identificador;
        }

        // 2. Buscar en courseStates por diferentes criterios
        for (const [codigoUnico, state] of Object.entries(uiState.courseStates)) {
            // Comparar con todos los posibles identificadores
            if (
                state.codigo === identificador ||
                state.nombre === identificador ||
                this.extraerCodigoBaseCurso(codigoUnico) === identificador
            ) {
                return codigoUnico;
            }
        }

        Logger.warn(`⚠️ No se encontró curso para identificador: "${identificador}"`);
        return identificador;
    }

    /**
     * Genera un color aleatorio para el curso
     * @private
     */
    private generarColorAleatorio(): string {
        const colores = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8'
        ];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    /**
     * Hereda rúbricas de un curso padre
     * @private
     */
    private async heredarRubricas(cursoPadre: string, cursoHijo: string): Promise<void> {
        // Implementación delegada a RubricService
        Logger.log(`📋 Heredando rúbricas de ${cursoPadre} a ${cursoHijo}`);
        // TODO: Implementar lógica de herencia de rúbricas
    }
}
