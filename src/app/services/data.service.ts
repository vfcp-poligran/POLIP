import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UnifiedStorageService } from './unified-storage.service';
import { BackupService } from './backup.service';
import { RubricService } from './rubric.service';
import { CourseService } from './course.service';
import { EvaluationService } from './evaluation.service';
import { CommentService } from './comment.service';
import { StateService } from './state.service';
import { CanvasService } from './canvas.service';
import { CsvUtils } from '../utils/csv.utils';
import { Logger } from '@app/core/utils/logger';
import {
  Estudiante,
  CursoData,
  Evaluacion,
  UIState,
  RubricaDefinicion,
  CriterioRubrica,
  NivelRubricaDetallado,
  EscalaCalificacion,
  EstadoEvaluacion,
  ComentarioGrupo,
  ComentariosGrupoData,
  CourseState,
  RubricaJSON,
  NivelRubricaJSON,
  TipoRubrica,
  TipoEntrega,
  EscalaCalificacionJSON,
  CriterioRubricaJSON
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService implements OnDestroy {
  private storage = inject(UnifiedStorageService);
  private backupService = inject(BackupService);
  private rubricService = inject(RubricService);
  private courseService = inject(CourseService);
  private evaluationService = inject(EvaluationService);
  private commentService = inject(CommentService);
  private stateService = inject(StateService);
  private canvasService = inject(CanvasService);

  private readonly STORAGE_KEYS = {
    CURSOS: 'gestorCursosData',
    EVALUACIONES: 'evaluacionesData',
    UI_STATE: 'appUIState',
    RUBRICAS: 'rubricDefinitionsData',
    COMENTARIOS_GRUPO: 'comentariosGrupoData'
  };

  // Global search term
  private globalSearchSubject = new BehaviorSubject<string>('');

  // Global search results (cross-course)
  private searchResultsSubject = new BehaviorSubject<{
    term: string;
    results: Array<{
      estudiante: Estudiante;
      curso: string;
      cursoNombre: string;
      cursoMetadata?: any;
    }>;
  }>({ term: '', results: [] });

  // Observables públicos
  public cursos$ = this.courseService.cursos$;
  public evaluaciones$ = this.evaluationService.evaluaciones$;
  public uiState$ = this.stateService.uiState$;
  public rubricas$ = this.rubricService.rubricas$;
  public comentariosGrupo$ = this.commentService.comentariosGrupo$;
  public globalSearch$ = this.globalSearchSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();
  public calificacionesCanvasActualizadas$ = this.canvasService.calificacionesCanvasActualizadas$;

  // Sistema de caché centralizado y eficiente
  private cache = {
    // Caché de archivos de calificaciones por curso
    archivosCalificaciones: new Map<string, {
      data: { nombre: string; fechaCarga: string; contenidoOriginal: string; calificaciones: Array<{ id: string; e1: string; e2: string; ef: string; }>; } | null;
      timestamp: number;
    }>(),

    // Caché de cursos (getCurso, getCursos)
    cursos: null as CursoData | null,
    cursosTimestamp: 0,

    // TTL (Time To Live) para cachés en milisegundos
    TTL: {
      archivosCalificaciones: 5000, // 5 segundos
      cursos: 3000 // 3 segundos
    }
  };

  private subscriptions: Subscription[] = [];
  private cacheCleanupInterval: any = null;

  constructor() {
    // NO llamar initializeData aquí - se hará lazy cuando sea necesario

    // Invalidar caché de archivos solo cuando courseStates específicamente cambian
    // Usar debounceTime para evitar múltiples limpiezas en ráfaga
    this.subscriptions.push(
      this.uiState$.pipe(
        debounceTime(100),
        distinctUntilChanged((prev, curr) =>
          JSON.stringify(prev.courseStates) === JSON.stringify(curr.courseStates)
        )
      ).subscribe(() => {
        this.cache.archivosCalificaciones.clear();
      })
    );

    // Invalidar caché de cursos cuando cursos$ emite
    // Usar distinctUntilChanged para evitar actualizaciones redundantes
    this.subscriptions.push(
      this.courseService.cursos$.pipe(
        distinctUntilChanged((prev, curr) =>
          Object.keys(prev).length === Object.keys(curr).length &&
          Object.keys(prev).every(key => prev[key] === curr[key])
        )
      ).subscribe((cursos) => {
        this.cache.cursos = cursos;
        this.cache.cursosTimestamp = Date.now();
      })
    );
  }

  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.initializeData();
    await this.initializationPromise;

    // Iniciar limpieza periódica de caché
    this.startCacheCleanup();
  }

  /**
   * Limpia cachés expirados periódicamente
   */
  private startCacheCleanup(): void {
    // Limpiar interval existente si existe
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }

    // Ejecutar cada 60 segundos
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();

      // Limpiar archivos de calificaciones expirados
      for (const [key, value] of this.cache.archivosCalificaciones.entries()) {
        if ((now - value.timestamp) > this.cache.TTL.archivosCalificaciones) {
          this.cache.archivosCalificaciones.delete(key);
        }
      }
    }, 60000);
  }

  /**
   * Cleanup resources para prevenir memory leaks
   */
  ngOnDestroy(): void {
    // Cancelar todas las subscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Limpiar interval de cache cleanup
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    // Limpiar cachés
    this.cache.archivosCalificaciones.clear();
    this.cache.cursos = null;
  }

  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private async initializeData() {
    try {
      await this.storage.init();
      await this.courseService.loadCursos();
      await this.evaluationService.loadEvaluaciones();
      await this.stateService.loadUIState();

      // Migración de archivos Canvas antiguos
      const uiState = this.stateService.getUIState();
      const migratedState = this.canvasService.migrarArchivosCanvas(uiState);
      if (migratedState !== uiState) {
        await this.stateService.updateUIState(migratedState);
      }

      await this.rubricService.loadRubricas();
      await this.commentService.loadComentariosGrupo();

      const resultadoMigracion = await this.rubricService.migrarRubricasAntiguas();
      if (resultadoMigracion.migradas > 0) {
        await this.rubricService.loadRubricas();
      }

      this.isInitialized = true;
      this.initializationPromise = null;
    } catch (error) {
      Logger.error('❌ [DataService] Error initializing data service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }






  // === GESTIÓN DE CURSOS ===

  /**
   * Extrae el código base de un código de curso
   * Ejemplo: "EPM-B01-BLQ2-V" -> "EPM"
   * Ejemplo: "SO-B09-BLQ2" -> "SO"
   * Ejemplo: "BD-B05" -> "BD"
   *
   * El código base son las primeras letras antes del primer guión seguido de número
   * @param codigoCurso Código completo del curso
   * @returns Código base (ej: EPM, SO, BD)
   */
  private extraerCodigoBaseCurso(codigoCurso: string): string {
    return this.courseService.extraerCodigoBaseCurso(codigoCurso);
  }

  async loadCursos(): Promise<void> {
    await this.courseService.loadCursos();
  }

  /**
   * Crea un nuevo curso con validación de código único
   * @param cursoData Datos del curso a crear
   * @returns El código del curso creado
   * @throws Error si ya existe un curso con el mismo código
   */
  async crearCurso(cursoData: any): Promise<string> {
    // CRÍTICO: Asegurar que el storage esté inicializado
    await this.ensureInitialized();

    try {
      // INMUTABILIDAD: Crear copia del objeto cursos actual
      const cursosOriginales = this.courseService.getCursosValue();
      const uiStateOriginal = this.stateService.getUIStateValue();
      const courseStates = uiStateOriginal.courseStates || {};

      // === GENERACIÓN DE CÓDIGO ÚNICO ===

      // Generar código único con formato: EPM-B01-BLQ2-V-YYYYMMDD
      const fecha = new Date(cursoData.fechaCreacion);
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      const timestamp = `${año}${mes}${dia}`;

      const codigoUnico = `${cursoData.codigo}-${timestamp}`;

      // === VALIDACIÓN DE DUPLICADOS ===

      // Validar que el código único sea único en el sistema
      if (cursosOriginales[codigoUnico]) {
        const cursoExistente = courseStates[codigoUnico];
        throw new Error(
          `❌ Ya existe un curso con el código "${codigoUnico}".\n\n` +
          `El código del curso debe ser único en el sistema.\n\n` +
          `Curso existente:\n` +
          `• Nombre: "${cursoExistente?.metadata?.nombre || 'N/A'}"\n` +
          `• Bloque: "${cursoExistente?.metadata?.bloque || 'N/A'}"\n` +
          `• Código Base: "${cursoData.codigo}"`
        );
      }

      // Validar que no exista otro curso con el mismo código base y nombre (ignoring timestamp)
      const cursosExistentes = Object.entries(courseStates).filter(([key, state]) => {
        const metadata = state.metadata;
        if (!metadata) return false;

        // Comparar código base (sin timestamp) y nombre
        return metadata.codigo === cursoData.codigo &&
          metadata.nombre?.toLowerCase() === cursoData.nombre?.toLowerCase();
      });

      if (cursosExistentes.length > 0) {
        const [codigoExistente, stateExistente] = cursosExistentes[0];
        throw new Error(
          `❌ Ya existe un curso con el mismo código base y nombre:\n\n` +
          `• Código: "${cursoData.codigo}"\n` +
          `• Nombre: "${cursoData.nombre}"\n` +
          `• Bloque: "${stateExistente.metadata?.bloque}"\n\n` +
          `Por favor, use un código o nombre diferente para crear un nuevo curso.`
        );
      }

      // === CREACIÓN DEL CURSO ===

      // Usar el código único como clave primaria para el curso
      const nombreClave = codigoUnico;

      // Si hay estudiantes, cargarlos; si no, crear lista vacía
      const estudiantes = cursoData.estudiantes || [];

      // INMUTABILIDAD: Crear nuevo objeto en lugar de mutar el existente
      const cursosActuales = {
        ...cursosOriginales,
        [nombreClave]: estudiantes
      };

      // === HERENCIA DE RÚBRICAS ===
      // Buscar cursos relacionados (mismo código base) para heredar rúbricas
      let rubricasHeredadas: CourseState['rubricasAsociadas'] | undefined;

      // Extraer código base (primera parte antes de "-B" o los primeros 3+ caracteres)
      const codigoBase = this.extraerCodigoBaseCurso(cursoData.codigo);
      Logger.log(`🔍 [crearCurso] Buscando rúbricas de cursos relacionados con código base: "${codigoBase}"`);

      // Buscar otros cursos con el mismo código base que tengan rúbricas asociadas
      const cursosRelacionados = Object.entries(courseStates).filter(([key, state]) => {
        if (!state.metadata?.codigo) return false;
        const codigoBaseCurso = this.extraerCodigoBaseCurso(state.metadata.codigo);
        return codigoBaseCurso === codigoBase && state.rubricasAsociadas;
      });

      if (cursosRelacionados.length > 0) {
        // Usar las rúbricas del primer curso relacionado que tenga asociaciones
        const [cursoRelacionadoKey, cursoRelacionadoState] = cursosRelacionados[0];
        const rubricasOrigen = cursoRelacionadoState.rubricasAsociadas;
        if (rubricasOrigen) {
          rubricasHeredadas = {
            entrega1: rubricasOrigen.entrega1 ?? null,
            entrega1Individual: rubricasOrigen.entrega1Individual ?? null,
            entrega2: rubricasOrigen.entrega2 ?? null,
            entrega2Individual: rubricasOrigen.entrega2Individual ?? null,
            entregaFinal: rubricasOrigen.entregaFinal ?? null,
            entregaFinalIndividual: rubricasOrigen.entregaFinalIndividual ?? null
          };
        }
        Logger.log(`✅ [crearCurso] Heredando rúbricas del curso relacionado: "${cursoRelacionadoKey}"`, rubricasHeredadas);
      } else {
        Logger.log('📋 [crearCurso] No se encontraron cursos relacionados con rúbricas, el curso se creará sin asociaciones');
      }

      // INMUTABILIDAD: Crear copia del UI State con el nuevo curso
      const courseStateData: CourseState = {
        activeStudent: null,
        activeGroup: null,
        activeDelivery: null,
        activeType: null,
        filtroGrupo: '',
        emailsVisible: false,
        isScrollingTable: false,
        metadata: {
          nombre: cursoData.nombre,              // Nombre completo: "ÉNFASIS EN PROGRAMACIÓN MÓVIL"
          nombreAbreviado: cursoData.codigo,     // Código abreviado: "EPM-B01-BLQ2-V"
          codigoUnico: codigoUnico,              // Código interno único: "EPM-B01-BLQ2-V-20251121"
          codigo: cursoData.codigo,              // Código base sin timestamp
          bloque: cursoData.bloque,
          fechaCreacion: cursoData.fechaCreacion,
          profesor: cursoData.profesor || ''
        },
        // Heredar rúbricas si existen cursos relacionados
        ...(rubricasHeredadas && { rubricasAsociadas: rubricasHeredadas })
      }

      const uiState: UIState = {
        cursoActivo: nombreClave, // Establecer el nuevo curso como activo automáticamente
        grupoSeguimientoActivo: uiStateOriginal.grupoSeguimientoActivo || null,
        courseStates: {
          ...courseStates,
          [nombreClave]: courseStateData
        }
      };

      // Actualizar estado con las nuevas copias inmutables
      await this.courseService.saveCursos(cursosActuales);
      this.stateService.updateUIStateState(uiState);

      Logger.log('✅ [crearCurso] Curso establecido como activo:', nombreClave);

      // Guardar cambios en storage
      await this.saveUIState();

      // Log de éxito
      const rubricasInfo = rubricasHeredadas ? '(con rúbricas heredadas)' : '(sin rúbricas)';
      Logger.log(
        `✅ Curso creado exitosamente ${rubricasInfo}:\n` +
        `   • Nombre completo: "${cursoData.nombre}"\n` +
        `   • Código abreviado: "${cursoData.codigo}"\n` +
        `   • Código único: "${codigoUnico}"\n` +
        `   • Bloque: "${cursoData.bloque}"\n` +
        `   • Fecha: ${cursoData.fechaCreacion}\n` +
        `   • Estudiantes: ${estudiantes.length}\n` +
        `   • Profesor: ${cursoData.profesor || 'No especificado'}`
      );

      return nombreClave;

    } catch (error) {
      // Re-lanzar el error para que el componente lo maneje
      Logger.error('Error al crear curso:', error);
      throw error;
    }
  }

  async actualizarEstudiantesCurso(codigoCurso: string, estudiantes: any[]): Promise<void> {
    await this.ensureInitialized();
    await this.courseService.actualizarEstudiantesCurso(codigoCurso, estudiantes);
  }





  /**
   * Actualiza el nombre completo del curso (metadata)
   * El código único NO cambia, solo el nombre descriptivo
   * @param codigoUnico Código único del curso (EPM-B01-BLQ2-V-20251121)
   * @param nombreNuevo Nuevo nombre completo del curso
   */
  async actualizarNombreCurso(codigoUnico: string, nombreNuevo: string): Promise<void> {
    await this.ensureInitialized();

    const uiStateOriginal = this.stateService.getUIStateValue();
    const courseState = uiStateOriginal.courseStates?.[codigoUnico];

    if (!courseState) {
      throw new Error(`No se encontró el curso con código: ${codigoUnico}`);
    }

    // Actualizar solo el metadata.nombre, preservando todo lo demás
    const metadataActualizado = {
      nombre: courseState.metadata?.nombre || '',
      codigo: courseState.metadata?.codigo || '',
      bloque: courseState.metadata?.bloque || '',
      fechaCreacion: courseState.metadata?.fechaCreacion || '',
      profesor: courseState.metadata?.profesor || '',
      ...courseState.metadata,  // Preservar campos opcionales (nombreAbreviado, codigoUnico, etc.)
    };
    metadataActualizado.nombre = nombreNuevo;  // Actualizar el nombre

    const courseStateActualizado: CourseState = {
      ...courseState,
      metadata: metadataActualizado
    };

    const uiState: UIState = {
      ...uiStateOriginal,
      courseStates: {
        ...uiStateOriginal.courseStates,
        [codigoUnico]: courseStateActualizado
      }
    };

    this.stateService.updateUIStateState(uiState);
    await this.saveUIState();

    Logger.log(`✅ Nombre del curso actualizado: "${nombreNuevo}" (${codigoUnico})`);
  }

  /**
   * Elimina un curso completo del sistema
   * @param codigoUnico Código único del curso (EPM-B01-BLQ2-V-20251121)
   */
  async eliminarCurso(codigoUnico: string): Promise<void> {
    await this.ensureInitialized();

    Logger.log(`🗑️ Eliminando curso: ${codigoUnico}`);

    // 1. ELIMINAR ESTUDIANTES DEL CURSO
    await this.courseService.eliminarCursoData(codigoUnico);

    // 2. ELIMINAR COURSE STATE Y METADATA
    try {
      const uiStateOriginal = this.stateService.getUIStateValue();
      const { [codigoUnico]: courseStateEliminado, ...courseStatesRestantes } = uiStateOriginal.courseStates || {};

      const uiState: UIState = {
        cursoActivo: uiStateOriginal.cursoActivo === codigoUnico ? null : uiStateOriginal.cursoActivo,
        grupoSeguimientoActivo: uiStateOriginal.grupoSeguimientoActivo,
        courseStates: courseStatesRestantes
      };

      this.stateService.updateUIStateState(uiState);
      await this.saveUIState();
      Logger.log(`✅ Course state eliminado`);
    } catch (error) {
      Logger.error('❌ [DataService] Error eliminando course state:', error);
    }

    // 3. ELIMINAR EVALUACIONES DEL CURSO
    try {
      const evaluacionesEliminadas = await this.evaluationService.borrarEvaluacionesPorCurso(codigoUnico);
      Logger.log(`✅ Evaluaciones eliminadas (${evaluacionesEliminadas})`);
    } catch (error) {
      Logger.error('❌ [DataService] Error eliminando evaluaciones:', error);
    }

    Logger.log(`✅ Curso ${codigoUnico} eliminado completamente`);
  }

  getCursos(): CursoData {
    return this.courseService.getCursosValue();
  }

  getCurso(nombre: string): Estudiante[] | undefined {
    return this.courseService.getCurso(nombre);
  }

  /**
   * Obtiene el código único del curso desde diferentes identificadores
   * Soporta: código único, código base, nombre completo, nombre abreviado
   * @param identificador Puede ser código único completo, código base, o nombre
   * @returns Código único del curso (EPM-B01-BLQ2-V-20251121)
   */
  getCourseCodeFromNameOrCode(identificador: string): string {
    // 1. Verificar si ya es un código único válido (existe en cursos)
    if (this.courseService.getCurso(identificador)) {
      return identificador;
    }

    // 2. Buscar en courseStates por diferentes campos de metadata
    const currentState = this.stateService.getUIStateValue();
    const courseStates = currentState.courseStates || {};

    for (const [codigoUnico, state] of Object.entries(courseStates)) {
      const meta = state.metadata;
      if (!meta) continue;

      // Comparar con todos los posibles identificadores
      if (
        meta.codigoUnico === identificador ||      // Código único completo
        meta.codigo === identificador ||            // Código base (sin timestamp)
        meta.nombreAbreviado === identificador ||   // Código abreviado
        meta.nombre === identificador               // Nombre completo
      ) {
        return codigoUnico;
      }
    }

    // Si no se encuentra, devolver el valor original y advertir
    Logger.warn(`⚠️ No se encontró curso para identificador: "${identificador}"`);
    return identificador;
  }

  // === GESTIÓN DE EVALUACIONES ===

  async loadEvaluaciones(): Promise<void> {
    await this.evaluationService.loadEvaluaciones();
  }

  async saveEvaluaciones(): Promise<void> {
    // Delegado a EvaluationService
  }

  async guardarEvaluacion(evaluacion: Evaluacion): Promise<void> {
    const key = this.generateEvaluationKey(evaluacion);
    await this.evaluationService.guardarEvaluacion(evaluacion, key);

    // 🔧 FIX: Actualizar archivo de calificaciones con código normalizado
    const codigoCurso = this.getCourseCodeFromNameOrCode(evaluacion.cursoNombre);
    await this.actualizarArchivoCalificaciones(codigoCurso, evaluacion.entrega);
  }

  async borrarEvaluacion(cursoNombre: string, entrega: string, tipo: string, identificador: string): Promise<void> {
    // 🔧 FIX: Normalizar a código del curso
    const codigoCurso = this.getCourseCodeFromNameOrCode(cursoNombre);
    const key = `${codigoCurso}_${entrega}_${tipo}_${identificador}`;

    Logger.log(`🗑️ [borrarEvaluacion] Eliminando evaluación:`, {
      cursoNombreOriginal: cursoNombre,
      codigoNormalizado: codigoCurso,
      key
    });

    await this.evaluationService.borrarEvaluacion(key);

    // Actualizar archivo de calificaciones si existe
    await this.actualizarArchivoCalificaciones(cursoNombre, entrega as 'E1' | 'E2' | 'EF');
  }

  getEvaluacion(cursoNombre: string, entrega: string, tipo: string, identificador: string): Evaluacion | undefined {
    // Normalizar el nombre del curso para coincidir con generateEvaluationKey
    const codigoCurso = this.getCourseCodeFromNameOrCode(cursoNombre);
    const key = `${codigoCurso}_${entrega}_${tipo}_${identificador}`;
    Logger.log(`🔍 [getEvaluacion] Buscando con key: ${key}`);
    return this.evaluationService.getEvaluacion(key);
  }

  getAllEvaluaciones(): { [key: string]: Evaluacion } {
    return this.evaluationService.getEvaluacionesValue();
  }

  private generateEvaluationKey(evaluacion: Evaluacion): string {
    // 🔧 FIX: Normalizar a código del curso para garantizar consistencia
    const codigoCurso = this.getCourseCodeFromNameOrCode(evaluacion.cursoNombre);

    // Para PG: si tiene estudianteEmail específico, es PG individual (usar email)
    // Si NO tiene estudianteEmail, es PG grupal (usar Grupo)
    // Para PI: siempre usar estudianteEmail
    let identificador: string;
    if (evaluacion.tipo === 'PG') {
      identificador = evaluacion.estudianteEmail || evaluacion.grupo || '';
    } else {
      identificador = evaluacion.estudianteEmail || '';
    }

    const key = `${codigoCurso}_${evaluacion.entrega}_${evaluacion.tipo}_${identificador}`;

    Logger.log(`🔑 [generateEvaluationKey]`, {
      cursoNombreOriginal: evaluacion.cursoNombre,
      codigoNormalizado: codigoCurso,
      key
    });

    return key;
  }

  // === GESTIÓN DE UI STATE ===

  async loadUIState(): Promise<void> {
    await this.stateService.loadUIState();
  }

  async saveUIState(): Promise<void> {
    await this.stateService.saveUIState();
  }

  async updateUIState(updates: Partial<UIState>): Promise<void> {
    const currentState = this.stateService.getUIState();
    const newState = { ...currentState, ...updates };
    await this.stateService.updateUIState(newState);
  }

  async updateCourseState(courseCode: string, updates: Partial<CourseState>): Promise<void> {
    await this.stateService.updateCourseState(courseCode, updates);
  }

  /**
   * Obtiene el CourseState específico de un curso
   */
  getCourseState(courseCode: string): CourseState | null {
    const currentState = this.stateService.getUIStateValue();
    return currentState.courseStates?.[courseCode] || null;
  }

  /**
   * Parsea CSV de Canvas y extrae solo los campos necesarios:
   * - Campo 1 (ID): Para búsquedas por canvasUserId
   * - Campo 4 (E1): Entrega proyecto 1
   * - Campo 5 (E2): Entrega proyecto 2
   * - Campo 6 (EF): Entrega final
   * Nota: Campo 0 (Student) NO se almacena, se obtiene del archivo de estudiantes
   */

  async guardarArchivoCalificaciones(codigoCurso: string, nombreArchivo: string, contenido: string): Promise<void> {
    await this.ensureInitialized();
    await this.canvasService.guardarArchivoCalificaciones(codigoCurso, nombreArchivo, contenido);
  }

  obtenerArchivoCalificaciones(codigoCurso: string): {
    nombre: string;
    fechaCarga: string;
    contenidoOriginal: string;
    calificaciones: Array<{
      id: string;
      e1: string;
      e2: string;
      ef: string;
    }>;
  } | null {
    return this.canvasService.obtenerArchivoCalificaciones(codigoCurso);
  }

  async eliminarArchivoCalificaciones(codigoCurso: string): Promise<void> {
    await this.canvasService.eliminarArchivoCalificaciones(codigoCurso);
  }

  async actualizarArchivoCalificaciones(codigoCurso: string, entrega?: 'E1' | 'E2' | 'EF'): Promise<void> {
    const estudiantes = this.getCurso(codigoCurso);
    if (!estudiantes) {
      Logger.warn('⚠️ [actualizarArchivoCalificaciones] No hay estudiantes en el curso:', codigoCurso);
      return;
    }
    await this.canvasService.actualizarArchivoCalificaciones(codigoCurso, estudiantes);
  }

  /**
   * Diagnóstico detallado de sincronización Canvas
   */
  async diagnosticarSincronizacionCanvas(codigoCurso: string): Promise<{
    exito: boolean;
    mensaje: string;
    detalles: {
      cursoEncontrado: boolean;
      archivoVinculado: boolean;
      estudiantesEnLista: number;
      estudiantesEnCanvas: number;
      coincidencias: number;
      noCoincidencias: Array<{ emailCanvas: string; razon: string }>;
      correosLista: string[];
      correosCanvas: string[];
      headersCanvas: string[];
      indiceEmailCanvas: number;
    };
  }> {
    const resultado = {
      exito: false,
      mensaje: '',
      detalles: {
        cursoEncontrado: false,
        archivoVinculado: false,
        estudiantesEnLista: 0,
        estudiantesEnCanvas: 0,
        coincidencias: 0,
        noCoincidencias: [] as Array<{ emailCanvas: string; razon: string }>,
        correosLista: [] as string[],
        correosCanvas: [] as string[],
        headersCanvas: [] as string[],
        indiceEmailCanvas: -1
      }
    };

    // 1. Verificar que el curso existe
    const estudiantes = this.getCurso(codigoCurso);
    if (!estudiantes) {
      resultado.mensaje = `❌ El curso "${codigoCurso}" no existe en la lista de cursos`;
      return resultado;
    }
    resultado.detalles.cursoEncontrado = true;
    resultado.detalles.estudiantesEnLista = estudiantes.length;
    resultado.detalles.correosLista = estudiantes.map(e => e.correo).filter(c => c);

    // 2. Verificar que hay archivo Canvas vinculado
    const archivo = this.obtenerArchivoCalificaciones(codigoCurso);
    if (!archivo) {
      resultado.mensaje = `❌ El curso "${codigoCurso}" NO tiene archivo Canvas vinculado`;
      return resultado;
    }
    resultado.detalles.archivoVinculado = true;

    // 3. Parsear CSV Canvas
    const lineas = archivo.contenidoOriginal.split('\n').filter((l: string) => l.trim());
    const headers = this.parseCSVRow(lineas[0]);
    resultado.detalles.headersCanvas = headers;

    // 4. Encontrar columna de email
    const indiceEmail = headers.findIndex(h => h.toLowerCase() === 'sis login id');
    resultado.detalles.indiceEmailCanvas = indiceEmail;

    if (indiceEmail === -1) {
      resultado.mensaje = `❌ El archivo Canvas NO tiene la columna "SIS Login ID"`;
      return resultado;
    }

    // 5. Extraer emails del Canvas (saltar header y puntos posibles)
    const emailsCanvas: string[] = [];
    for (let i = 2; i < lineas.length; i++) {
      const campos = this.parseCSVRow(lineas[i]);
      if (campos.length > indiceEmail) {
        const email = campos[indiceEmail]?.trim().toLowerCase();
        if (email) {
          emailsCanvas.push(email);
        }
      }
    }
    resultado.detalles.correosCanvas = emailsCanvas;
    resultado.detalles.estudiantesEnCanvas = emailsCanvas.length;

    // 6. Verificar coincidencias
    const correosListaNormalizados = estudiantes
      .map(e => e.correo?.trim().toLowerCase())
      .filter(c => c);

    emailsCanvas.forEach(emailCanvas => {
      if (correosListaNormalizados.includes(emailCanvas)) {
        resultado.detalles.coincidencias++;
      } else {
        resultado.detalles.noCoincidencias.push({
          emailCanvas,
          razon: 'No existe en la lista de estudiantes del curso'
        });
      }
    });

    // 7. Verificar estudiantes de la lista que no están en Canvas
    correosListaNormalizados.forEach(correoLista => {
      if (!emailsCanvas.includes(correoLista)) {
        resultado.detalles.noCoincidencias.push({
          emailCanvas: correoLista,
          razon: 'Existe en lista pero NO en archivo Canvas'
        });
      }
    });

    // 8. Generar mensaje de resultado
    if (resultado.detalles.coincidencias === 0) {
      resultado.exito = false;
      resultado.mensaje = `❌ NO hay coincidencias entre estudiantes y Canvas`;
    } else if (resultado.detalles.noCoincidencias.length > 0) {
      resultado.exito = true;
      resultado.mensaje = `⚠️ Sincronización parcial: ${resultado.detalles.coincidencias} coincidencias, ${resultado.detalles.noCoincidencias.length} sin coincidencia`;
    } else {
      resultado.exito = true;
      resultado.mensaje = `✅ Sincronización completa: ${resultado.detalles.coincidencias} estudiantes sincronizados`;
    }

    return resultado;
  }

  /**
   * Parsea una fila CSV manejando comillas correctamente
   */
  private parseCSVRow(csvRow: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csvRow.length) {
      const char = csvRow[i];

      if (char === '"' && (i === 0 || csvRow[i - 1] === ',')) {
        // Inicio de campo con comillas
        insideQuotes = true;
      } else if (char === '"' && insideQuotes && (i === csvRow.length - 1 || csvRow[i + 1] === ',')) {
        // Final de campo con comillas
        insideQuotes = false;
      } else if (char === ',' && !insideQuotes) {
        // Separador de campo
        result.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
      }

      i++;
    }

    // Agregar último campo
    result.push(currentField.trim());

    return result;
  }

  /**
   * Construye una fila CSV manejando comillas cuando sea necesario
   */
  private buildCSVRow(fields: string[]): string {
    return fields.map(field => {
      const fieldStr = field?.toString() || '';
      // Agregar comillas si el campo contiene comas, comillas o saltos de línea
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  }

  private calcularSumatoriaEstudiante(cursoNombreOCodigo: string, estudiante: Estudiante, entrega: 'E1' | 'E2' | 'EF'): number {
    const evaluaciones = this.evaluationService.getEvaluacionesValue();

    // 🔧 FIX: Normalizar clave para garantizar búsqueda correcta
    const codigoCurso = this.getCourseCodeFromNameOrCode(cursoNombreOCodigo);

    // Calcular PG (primero individual, luego grupal)
    let pg = 0;
    const pgIndividualKey = `${codigoCurso}_${entrega}_PG_${estudiante.correo}`;
    const pgGrupalKey = `${codigoCurso}_${entrega}_PG_${estudiante.grupo}`;

    const pgIndividual = evaluaciones[pgIndividualKey];
    const pgGrupal = evaluaciones[pgGrupalKey];

    pg = pgIndividual?.puntosTotales || pgGrupal?.puntosTotales || 0;

    // Calcular PI
    const piKey = `${codigoCurso}_${entrega}_PI_${estudiante.correo}`;
    const pi = evaluaciones[piKey]?.puntosTotales || 0;

    Logger.log(`🔍 [calcularSumatoriaEstudiante] ${estudiante.correo} - ${entrega}:`, {
      codigoUsado: codigoCurso,
      pg,
      pi,
      total: pg + pi,
      clavesBuscadas: { pgIndividualKey, pgGrupalKey, piKey }
    });

    return pg + pi;
  }

  getUIState(): UIState {
    return this.stateService.getUIStateValue();
  }

  /**
   * Verifica si los mensajes emergentes están habilitados
   * @returns true si están habilitados (por defecto), false si están deshabilitados
   */
  isMensajesEmergentesEnabled(): boolean {
    return this.stateService.getUIStateValue().mostrarMensajesEmergentes !== false;
  }

  async sincronizarArchivoCalificaciones(codigoCurso: string): Promise<void> {
    await this.ensureInitialized();
    await this.actualizarArchivoCalificaciones(codigoCurso);
  }

  /**
   * Fuerza la re-sincronización de todos los archivos Canvas
   * Útil después de migración o cuando hay problemas de sincronización
   */
  async resincronizarTodosLosArchivosCanvas(): Promise<void> {
    Logger.log('🔄 [DataService] Iniciando re-sincronización de todos los archivos Canvas...');

    const uiState = this.stateService.getUIStateValue();
    const courseStates = uiState.courseStates || {};
    const cursosConArchivos: string[] = [];

    // Identificar cursos con archivos Canvas
    Object.keys(courseStates).forEach(cursoNombre => {
      const courseState = courseStates[cursoNombre];
      if (courseState.archivoCalificaciones) {
        cursosConArchivos.push(cursoNombre);
      }
    });

    Logger.log(`📊 Encontrados ${cursosConArchivos.length} cursos con archivos Canvas`);

    // Re-sincronizar cada uno
    let exitosos = 0;
    let fallidos = 0;

    for (const cursoNombre of cursosConArchivos) {
      try {
        await this.actualizarArchivoCalificaciones(cursoNombre);
        exitosos++;
        Logger.log(`✅ Re-sincronizado: ${cursoNombre}`);
      } catch (error) {
        fallidos++;
        Logger.error(`❌ Error re-sincronizando ${cursoNombre}:`, error);
      }
    }

    Logger.log(`✅ Re-sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos`);
  }

  /**
   * Limpia archivos Canvas corruptos o inválidos de todos los cursos
   */
  async limpiarArchivosCanvasCorruptos(): Promise<number> {
    Logger.log('🧹 [DataService] Iniciando limpieza de archivos Canvas corruptos...');

    const uiState = this.stateService.getUIStateValue();
    const courseStates = uiState.courseStates || {};
    const courseStatesMigrados: { [cursoNombre: string]: CourseState } = {};
    let archivosEliminados = 0;

    Object.keys(courseStates).forEach(cursoNombre => {
      const courseState = { ...courseStates[cursoNombre] };

      if (courseState.archivoCalificaciones) {
        const archivo = courseState.archivoCalificaciones;
        let esInvalido = false;

        // Validaciones
        if (!archivo.nombre || !archivo.contenidoOriginal) {
          Logger.warn(`⚠️ Archivo sin nombre o contenido en: ${cursoNombre}`);
          esInvalido = true;
        } else if (typeof archivo.contenidoOriginal !== 'string') {
          Logger.warn(`⚠️ Contenido no es string en: ${cursoNombre}`);
          esInvalido = true;
        } else if (archivo.contenidoOriginal.trim().length === 0) {
          Logger.warn(`⚠️ Contenido vacío en: ${cursoNombre}`);
          esInvalido = true;
        } else {
          const lineas = archivo.contenidoOriginal.split('\n').filter((l: string) => l.trim());
          if (lineas.length < 2) {
            Logger.warn(`⚠️ CSV inválido (menos de 2 líneas) en: ${cursoNombre}`);
            esInvalido = true;
          }
        }

        if (esInvalido) {
          delete courseState.archivoCalificaciones;
          archivosEliminados++;
          Logger.log(`🗑️ Eliminado archivo corrupto de: ${cursoNombre}`);
        }
      }

      courseStatesMigrados[cursoNombre] = courseState;
    });

    if (archivosEliminados > 0) {
      const newState: UIState = {
        ...uiState,
        courseStates: courseStatesMigrados
      };

      this.stateService.updateUIStateState(newState);
      await this.saveUIState();
      Logger.log(`✅ Limpieza completada: ${archivosEliminados} archivos eliminados`);
    } else {
      Logger.log('✅ No se encontraron archivos corruptos');
    }

    return archivosEliminados;
  }

  /**
   * Diagnóstico completo de archivos Canvas guardados
   * Retorna información detallada de todos los archivos y sus claves
   */
  diagnosticarArchivosCanvas(): {
    totalArchivos: number;
    totalCursos: number;
    detalles: Array<{
      claveCurso: string;
      nombreCurso: string | undefined;
      codigoCurso: string | undefined;
      nombreArchivo: string;
      fechaCarga: string;
      tamanoContenido: number;
    }>;
  } {
    const currentState = this.stateService.getUIStateValue();
    const courseStates = currentState.courseStates || {};

    const detalles: Array<{
      claveCurso: string;
      nombreCurso: string | undefined;
      codigoCurso: string | undefined;
      nombreArchivo: string;
      fechaCarga: string;
      tamanoContenido: number;
    }> = [];

    let totalArchivos = 0;

    Object.keys(courseStates).forEach(claveCurso => {
      const courseState = courseStates[claveCurso];
      const metadata = courseState.metadata;

      if (courseState.archivoCalificaciones) {
        totalArchivos++;
        detalles.push({
          claveCurso,
          nombreCurso: metadata?.nombre,
          codigoCurso: metadata?.codigo,
          nombreArchivo: courseState.archivoCalificaciones.nombre,
          fechaCarga: courseState.archivoCalificaciones.fechaCarga,
          tamanoContenido: courseState.archivoCalificaciones.calificaciones.length
        });
      }
    });

    const diagnostico = {
      totalArchivos,
      totalCursos: Object.keys(courseStates).length,
      detalles
    };

    Logger.log('🔍 === DIAGNÓSTICO DE ARCHIVOS CANVAS ===');
    Logger.log(`📊 Total archivos Canvas: ${totalArchivos}`);
    Logger.log(`📊 Total cursos: ${diagnostico.totalCursos}`);
    Logger.log('\n📁 Detalles:');
    detalles.forEach(d => {
      Logger.log(`\n  Clave: ${d.claveCurso}`);
      Logger.log(`  Nombre: ${d.nombreCurso || 'N/A'}`);
      Logger.log(`  Código: ${d.codigoCurso || 'N/A'}`);
      Logger.log(`  Archivo: ${d.nombreArchivo}`);
      Logger.log(`  Tamaño: ${d.tamanoContenido} chars`);
    });

    return diagnostico;
  }

  /**
   * MIGRACIÓN CRÍTICA: Normaliza las claves de los cursos para usar CÓDIGO en lugar de NOMBRE
   *
   * Problema: Algunos cursos pueden estar usando el nombre completo como clave en lugar del código
   * Solución: Migrar todas las claves de courseStates y cursosData para usar exclusivamente el código
   *
   * Ejemplo:
   * - ANTES: courseStates["Herramientas de Programación Móvil"]
   * - DESPUÉS: courseStates["EPMB01"]
   */
  async normalizarClavesCodigoCurso(): Promise<{
    exito: boolean;
    cursosNormalizados: number;
    errores: string[];
    detalles: Array<{
      claveAntigua: string;
      claveNueva: string;
      nombreCurso: string;
      codigoCurso: string;
    }>;
  }> {
    Logger.log('🔄 === INICIANDO NORMALIZACIÓN DE CLAVES DE CURSO ===');

    const errores: string[] = [];
    const detalles: Array<{
      claveAntigua: string;
      claveNueva: string;
      nombreCurso: string;
      codigoCurso: string;
    }> = [];

    try {
      const currentState = this.stateService.getUIStateValue();
      const courseStates = currentState.courseStates ? { ...currentState.courseStates } : {};
      const cursosData = { ...this.courseService.getCursosValue() };

      let cambiosRealizados = false;

      // 1. Normalizar courseStates
      Logger.log('📋 Paso 1: Normalizando claves en courseStates...');
      const nuevoCourseStates: { [key: string]: any } = {};

      Object.keys(courseStates).forEach(claveActual => {
        const courseState = courseStates[claveActual];
        const metadata = courseState.metadata;

        if (!metadata || !metadata.codigo) {
          errores.push(`Curso sin metadata.codigo: ${claveActual}`);
          // Mantener la clave actual si no hay código
          nuevoCourseStates[claveActual] = courseState;
          return;
        }

        const codigoCurso = metadata.codigo;

        // Si la clave actual NO es el código, necesitamos migrar
        if (claveActual !== codigoCurso) {
          Logger.log(`  🔀 Migrando: "${claveActual}" → "${codigoCurso}"`);
          nuevoCourseStates[codigoCurso] = courseState;
          cambiosRealizados = true;

          detalles.push({
            claveAntigua: claveActual,
            claveNueva: codigoCurso,
            nombreCurso: metadata.nombre || 'N/A',
            codigoCurso: codigoCurso
          });
        } else {
          // Ya está usando el código como clave
          nuevoCourseStates[codigoCurso] = courseState;
        }
      });

      // 2. Normalizar cursosData
      Logger.log('📋 Paso 2: Normalizando claves en cursosData...');
      const nuevoCursosData: { [key: string]: any } = {};

      Object.keys(cursosData).forEach(claveActual => {
        const estudiantes = cursosData[claveActual];

        // Buscar el metadata correspondiente
        const courseState = Object.values(nuevoCourseStates).find((cs: any) => {
          return cs.metadata?.codigo === claveActual ||
            cs.metadata?.nombre === claveActual;
        });

        if (!courseState || !courseState.metadata?.codigo) {
          Logger.warn(`  ⚠️ No se encontró metadata para curso: ${claveActual}`);
          // Mantener la clave actual
          nuevoCursosData[claveActual] = estudiantes;
          return;
        }

        const codigoCurso = courseState.metadata.codigo;

        if (claveActual !== codigoCurso) {
          Logger.log(`  🔀 Migrando cursosData: "${claveActual}" → "${codigoCurso}"`);
          nuevoCursosData[codigoCurso] = estudiantes;
          cambiosRealizados = true;
        } else {
          nuevoCursosData[codigoCurso] = estudiantes;
        }
      });

      // 3. Actualizar cursoActivo si es necesario
      let nuevoCursoActivo = currentState.cursoActivo;

      if (currentState.cursoActivo) {
        const courseStateActivo = Object.values(nuevoCourseStates).find((cs: any) => {
          return cs.metadata?.codigo === currentState.cursoActivo ||
            cs.metadata?.nombre === currentState.cursoActivo;
        });

        if (courseStateActivo && courseStateActivo.metadata?.codigo) {
          const codigoActivo = courseStateActivo.metadata.codigo;
          if (currentState.cursoActivo !== codigoActivo) {
            Logger.log(`  🔀 Actualizando cursoActivo: "${currentState.cursoActivo}" → "${codigoActivo}"`);
            nuevoCursoActivo = codigoActivo;
            cambiosRealizados = true;
          }
        }
      }

      // 4. Guardar cambios si hubo normalizaciones
      if (cambiosRealizados) {
        Logger.log('💾 Guardando cambios normalizados...');

        // Actualizar UIState
        const nuevoUIState = {
          ...currentState,
          courseStates: nuevoCourseStates,
          cursoActivo: nuevoCursoActivo
        };

        this.stateService.updateUIStateState(nuevoUIState);
        await this.storage.set(this.STORAGE_KEYS.UI_STATE, nuevoUIState);

        // Actualizar cursosData
        await this.courseService.saveCursos(nuevoCursosData);

        Logger.log('✅ Normalización completada exitosamente');
      } else {
        Logger.log('✅ No se requirieron cambios - todas las claves ya usan códigos');
      }

      return {
        exito: true,
        cursosNormalizados: detalles.length,
        errores,
        detalles
      };

    } catch (error) {
      Logger.error('❌ Error en normalización:', error);
      errores.push(`Error general: ${error}`);

      return {
        exito: false,
        cursosNormalizados: 0,
        errores,
        detalles
      };
    }
  }

  // === GESTIÓN DE RÚBRICAS ===

  async loadRubricas(): Promise<void> {
    await this.rubricService.loadRubricas();
  }

  getRubrica(id: string): RubricaDefinicion | undefined {
    return this.rubricService.getRubrica(id);
  }

  // === IMPORTACIÓN/EXPORTACIÓN ===

  async exportarDatos(): Promise<void> {
    const backup = this.backupService.createBackup({
      cursos: this.courseService.getCursosValue(),
      evaluaciones: this.evaluationService.getEvaluacionesValue(),
      ui: this.stateService.getUIStateValue(),
      rubricas: this.rubricService.rubricasValue
    });

    this.backupService.downloadBackup(backup);
  }

  async importarDatos(jsonContent: string): Promise<void> {
    const backup = await this.backupService.parseBackup(jsonContent);

    if (!this.backupService.validateBackup(backup)) {
      throw new Error('Formato de backup inválido');
    }

    // Importar datos
    await this.courseService.saveCursos(backup.cursos);
    await this.evaluationService.saveEvaluaciones(backup.evaluaciones);
    this.stateService.updateUIStateState(backup.ui);
    this.rubricService.updateRubricasState(backup.rubricas);

    // Guardar en storage
    await this.saveUIState();
    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, backup.rubricas);
  }

  async borrarTodosLosDatos(): Promise<void> {
    await this.ensureInitialized();

    try {

      // 1. Limpiar el storage principal (Ionic Storage / SQLite)

      await this.storage.clear();

      // 2. Limpiar COMPLETAMENTE localStorage - SIN FILTROS

      const localStorageKeys = Object.keys(localStorage);
      let localKeysDeleted = 0;
      localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
        localKeysDeleted++;

      });

      // 3. Limpiar COMPLETAMENTE sessionStorage - SIN FILTROS

      const sessionStorageKeys = Object.keys(sessionStorage);
      let sessionKeysDeleted = 0;
      sessionStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
        sessionKeysDeleted++;

      });

      // 4. Limpiar IndexedDB (si existe)

      try {
        if ('indexedDB' in window) {
          // Obtener todas las bases de datos y eliminarlas
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name) {

              const deleteRequest = indexedDB.deleteDatabase(db.name);
              await new Promise<void>((resolve, reject) => {
                deleteRequest.onsuccess = () => {

                  resolve();
                };
                deleteRequest.onerror = () => {
                  Logger.warn(`  ⚠️ Error eliminando DB: ${db.name}`);
                  resolve(); // Continue even if one fails
                };
              });
            }
          }
        }
      } catch (indexedDBError) {
        Logger.warn('⚠️ Error limpiando IndexedDB:', indexedDBError);
      }

      // 5. Limpiar WebSQL (si existe - legacy)

      try {
        if ('openDatabase' in window) {
          // Intentar eliminar base de datos WebSQL si existe
          const webDB = (window as any).openDatabase('gestorProyectosDB', '', '', '');
          if (webDB) {
            webDB.transaction((tx: any) => {
              tx.executeSql('DROP TABLE IF EXISTS ui_state');
              tx.executeSql('DROP TABLE IF EXISTS cursos');
              tx.executeSql('DROP TABLE IF EXISTS estudiantes');
              tx.executeSql('DROP TABLE IF EXISTS evaluaciones');

            });
          }
        }
      } catch (webSQLError) {
        Logger.warn('⚠️ Error limpiando WebSQL:', webSQLError);
      }

      // 6. Limpiar Cache API (si existe)

      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(async (cacheName) => {

              await caches.delete(cacheName);

            })
          );
        }
      } catch (cacheError) {
        Logger.warn('⚠️ Error limpiando Cache API:', cacheError);
      }

      // 7. Resetear subjects con datos limpios

      await this.courseService.saveCursos({});
      await this.evaluationService.saveEvaluaciones({});
      this.stateService.updateUIStateState({
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      });
      this.rubricService.updateRubricasState({});

      // 8. Recargar rúbricas por defecto

      await this.loadRubricas();

      // 9. Limpiar cualquier referencia en memoria

      // Forzar garbage collection si está disponible
      if ('gc' in window) {
        (window as any).gc();
      }


    } catch (error) {
      Logger.error('❌ Error al borrar datos:', error);
      throw error;
    }
  }

  async borrarCursoEspecifico(nombreCurso: string): Promise<void> {
    await this.ensureInitialized();

    try {

      // INMUTABILIDAD: Obtener datos actuales (sin mutar)
      const cursosOriginales = this.getCursos();
      const evaluacionesOriginales = this.evaluationService.getEvaluacionesValue();
      const uiStateActual = this.stateService.getUIStateValue();
      const comentariosOriginales = this.commentService.getComentariosValue();
      const rubricasOriginales = this.rubricService.rubricasValue;

      // Verificar que el curso existe
      if (!cursosOriginales[nombreCurso]) {
        throw new Error(`El curso "${nombreCurso}" no existe`);
      }

      // INMUTABILIDAD: Crear copia sin el curso eliminado
      const { [nombreCurso]: cursoEliminado, ...cursosActuales } = cursosOriginales;

      // INMUTABILIDAD: Crear copia sin las evaluaciones del curso eliminado
      const { [nombreCurso]: evaluacionEliminada, ...evaluacionesActuales } = evaluacionesOriginales;

      // INMUTABILIDAD: Crear copia sin los comentarios del curso eliminado
      const { [nombreCurso]: comentariosEliminados, ...comentariosActuales } = comentariosOriginales;

      // INMUTABILIDAD: Desvincular curso de todas las rúbricas asociadas
      const rubricasActualizadasArray = Object.values(rubricasOriginales).map((rubrica: RubricaDefinicion) => {
        if (rubrica.cursosCodigos && rubrica.cursosCodigos.includes(nombreCurso)) {
          // Crear copia de la rúbrica sin el curso eliminado
          return {
            ...rubrica,
            cursosCodigos: rubrica.cursosCodigos.filter((codigo: string) => codigo !== nombreCurso)
          };
        }
        return rubrica;
      });

      // Convertir el array de rúbricas de vuelta a objeto con IDs como claves
      const rubricasActualizadas = rubricasActualizadasArray.reduce((acc, rubrica) => {
        acc[rubrica.id] = rubrica;
        return acc;
      }, {} as { [key: string]: RubricaDefinicion });

      // INMUTABILIDAD: Crear copia del UI state sin el curso eliminado
      const { [nombreCurso]: courseStateEliminado, ...restoCourseStates } = uiStateActual.courseStates || {};

      const nuevoUIState: UIState = {
        cursoActivo: uiStateActual.cursoActivo === nombreCurso ? null : uiStateActual.cursoActivo,
        grupoSeguimientoActivo: uiStateActual.grupoSeguimientoActivo || null,
        courseStates: restoCourseStates
      };

      // Guardar los datos actualizados
      await this.courseService.saveCursos(cursosActuales);
      await this.evaluationService.saveEvaluaciones(evaluacionesActuales);
      await this.storage.set(this.STORAGE_KEYS.UI_STATE, nuevoUIState);
      await this.commentService.saveComentariosGrupo(comentariosActuales);
      await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricasActualizadas);

      // Actualizar subjects con las copias inmutables
      this.stateService.updateUIStateState(nuevoUIState);
      this.commentService.updateComentariosState(comentariosActuales);
      this.rubricService.updateRubricasState(rubricasActualizadas);

      const rubricasDesvinculadas = Object.values(rubricasActualizadas).filter(
        (r: RubricaDefinicion) => Object.values(rubricasOriginales).some((orig: RubricaDefinicion) =>
          orig.id === r.id && orig.cursosCodigos?.includes(nombreCurso)
        )
      ).length; Logger.log(`Curso "${nombreCurso}" eliminado exitosamente`);


    } catch (error) {
      Logger.error(`Error al borrar curso "${nombreCurso}":`, error);
      throw error;
    }
  }

  // === UTILIDADES ===

  exportarNotasCSV(cursoNombre: string, entrega: 'E1' | 'E2' | 'EF'): void {
    const estudiantes = this.getCurso(cursoNombre);
    if (!estudiantes) return;

    const evaluaciones = this.evaluationService.getEvaluacionesValue();
    const notasData = estudiantes.map(est => {
      const pgKey = `${cursoNombre}_${entrega}_PG_${est.grupo}`;
      const piKey = `${cursoNombre}_${entrega}_PI_${est.correo}`;

      const pg = evaluaciones[pgKey]?.puntosTotales || 0;
      const pi = evaluaciones[piKey]?.puntosTotales || 0;
      const suma = pg + pi;

      return {
        apellidos: est.apellidos,
        nombres: est.nombres,
        correo: est.correo,
        grupo: est.grupo,
        suma
      };
    });

    // Generar CSV directamente
    const headers = ['Apellidos', 'Nombres', 'Correo', 'Grupo', 'Nota'];
    const csvContent = [
      headers.join(','),
      ...notasData.map(row => [
        row.apellidos,
        row.nombres,
        row.correo,
        row.grupo,
        row.suma
      ].join(','))
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `notas_${cursoNombre}_${entrega}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // === GESTIÓN DE COMENTARIOS DE GRUPO ===

  async loadComentariosGrupo(): Promise<void> {
    await this.commentService.loadComentariosGrupo();
  }

  async saveComentariosGrupo(): Promise<void> {
    await this.commentService.saveComentariosGrupo();
  }

  getComentariosGrupo(cursoId: string, grupo: string): ComentarioGrupo[] {
    return this.commentService.getComentariosGrupo(cursoId, grupo);
  }

  async addComentarioGrupo(cursoId: string, grupo: string, comentarioTexto: string, autor?: string, etiquetas?: string[]): Promise<void> {
    await this.ensureInitialized();
    await this.commentService.addComentarioGrupo(cursoId, grupo, comentarioTexto, autor, etiquetas);
  }

  async deleteComentarioGrupo(cursoId: string, grupo: string, comentarioId: string): Promise<void> {
    await this.ensureInitialized();
    await this.commentService.deleteComentarioGrupo(cursoId, grupo, comentarioId);
  }

  async updateComentarioGrupo(cursoId: string, grupo: string, comentarioId: string, nuevoTexto: string): Promise<void> {
    await this.ensureInitialized();
    await this.commentService.updateComentarioGrupo(cursoId, grupo, comentarioId, nuevoTexto);
  }

  // ============================================================================
  // MÉTODOS PARA RÚBRICAS ASOCIADAS A ENTREGAS
  // ============================================================================

  /**
   * Guarda las rúbricas asociadas a las entregas de un curso
   */
  async guardarRubricasAsociadas(codigoCurso: string, asociaciones: {
    entrega1: string | null;
    entrega2: string | null;
    entregaFinal: string | null;
    entrega1Individual?: string | null;
    entrega2Individual?: string | null;
    entregaFinalIndividual?: string | null;
  }): Promise<void> {
    await this.ensureInitialized();

    try {
      // Obtener el estado actual del UI
      const uiState = await this.storage.get<UIState>(this.STORAGE_KEYS.UI_STATE) || {
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      } as UIState;

      // Asegurar que existe el courseState para este curso
      if (!uiState.courseStates) {
        uiState.courseStates = {};
      }

      if (!uiState.courseStates[codigoCurso]) {
        uiState.courseStates[codigoCurso] = {
          activeStudent: null,
          activeGroup: null,
          activeDelivery: null,
          activeType: null,
          filtroGrupo: '',
          emailsVisible: false,
          isScrollingTable: false,
          rubricasAsociadas: {
            entrega1: null,
            entrega1Individual: null,
            entrega2: null,
            entrega2Individual: null,
            entregaFinal: null,
            entregaFinalIndividual: null
          }
        };
      }

      // Guardar las asociaciones de rúbricas (grupales e individuales)
      uiState.courseStates[codigoCurso].rubricasAsociadas = {
        entrega1: asociaciones.entrega1,
        entrega2: asociaciones.entrega2,
        entregaFinal: asociaciones.entregaFinal,
        entrega1Individual: asociaciones.entrega1Individual || null,
        entrega2Individual: asociaciones.entrega2Individual || null,
        entregaFinalIndividual: asociaciones.entregaFinalIndividual || null
      };

      // Guardar el estado actualizado
      await this.storage.set(this.STORAGE_KEYS.UI_STATE, uiState);
      this.stateService.updateUIStateState(uiState);

    } catch (error) {
      Logger.error('❌ [DataService] Error guardando rúbricas asociadas:', error);
      throw error;
    }
  }

  /**
   * Obtiene las rúbricas asociadas a las entregas de un curso
   */
  async obtenerRubricasAsociadas(codigoCurso: string): Promise<{
    entrega1: string | null;
    entrega2: string | null;
    entregaFinal: string | null;
    entrega1Individual?: string | null;
    entrega2Individual?: string | null;
    entregaFinalIndividual?: string | null;
  }> {
    await this.ensureInitialized();

    try {
      const uiState = await this.storage.get<UIState>(this.STORAGE_KEYS.UI_STATE) || {
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      } as UIState;

      const courseState = uiState.courseStates?.[codigoCurso];

      if (!courseState || !courseState.rubricasAsociadas) {
        return {
          entrega1: null,
          entrega2: null,
          entregaFinal: null,
          entrega1Individual: null,
          entrega2Individual: null,
          entregaFinalIndividual: null
        };
      }

      return {
        entrega1: courseState.rubricasAsociadas.entrega1 || null,
        entrega2: courseState.rubricasAsociadas.entrega2 || null,
        entregaFinal: courseState.rubricasAsociadas.entregaFinal || null,
        entrega1Individual: courseState.rubricasAsociadas.entrega1Individual || null,
        entrega2Individual: courseState.rubricasAsociadas.entrega2Individual || null,
        entregaFinalIndividual: courseState.rubricasAsociadas.entregaFinalIndividual || null
      };
    } catch (error) {
      Logger.error('❌ [DataService] Error obteniendo rúbricas asociadas:', error);
      return {
        entrega1: null,
        entrega2: null,
        entregaFinal: null,
        entrega1Individual: null,
        entrega2Individual: null,
        entregaFinalIndividual: null
      };
    }
  }

  // Método para establecer el término de búsqueda global
  setGlobalSearchTerm(term: string): void {
    this.globalSearchSubject.next(term);
  }

  // Método para obtener el término de búsqueda actual
  getGlobalSearchTerm(): string {
    return this.globalSearchSubject.value;
  }

  /**
   * Busca estudiantes a través de todos los cursos
   * @param term Término de búsqueda (busca en nombres, apellidos y correo)
   */
  searchAcrossAllCourses(term: string): void {
    const termLower = term.toLowerCase().trim();

    // Si el término está vacío, limpiar resultados
    if (!termLower) {
      this.searchResultsSubject.next({ term: '', results: [] });
      return;
    }

    const allResults: Array<{
      estudiante: Estudiante;
      curso: string;
      cursoNombre: string;
      cursoMetadata?: any;
    }> = [];

    const cursos = this.getCursos();
    const uiState = this.getUIState();

    // Iterar sobre todos los cursos
    for (const [codigoCurso, estudiantes] of Object.entries(cursos)) {
      if (!Array.isArray(estudiantes)) continue;

      const metadata = uiState.courseStates?.[codigoCurso]?.metadata;
      const nombreCurso = metadata?.nombre || codigoCurso;

      // Filtrar estudiantes que coincidan con el término de búsqueda
      const filtrados = estudiantes.filter(est => {
        const nombres = (est.nombres || '').toLowerCase();
        const apellidos = (est.apellidos || '').toLowerCase();
        const correo = (est.correo || '').toLowerCase();
        const nombreCompleto = `${nombres} ${apellidos}`.toLowerCase();

        return nombres.includes(termLower) ||
          apellidos.includes(termLower) ||
          correo.includes(termLower) ||
          nombreCompleto.includes(termLower);
      });

      // Añadir resultados con contexto de curso
      allResults.push(...filtrados.map(est => ({
        estudiante: est,
        curso: codigoCurso,
        cursoNombre: nombreCurso,
        cursoMetadata: metadata
      })));
    }

    // Ordenar resultados por curso y luego por nombre
    allResults.sort((a, b) => {
      const cursoCmp = a.cursoNombre.localeCompare(b.cursoNombre);
      if (cursoCmp !== 0) return cursoCmp;
      return `${a.estudiante.apellidos} ${a.estudiante.nombres}`.
        localeCompare(`${b.estudiante.apellidos} ${b.estudiante.nombres}`);
    });

    // Emitir resultados
    this.searchResultsSubject.next({ term: termLower, results: allResults });

    Logger.log(`🔍 [searchAcrossAllCourses] Búsqueda "${term}" encontró ${allResults.length} resultados`);
  }

  /**
   * Limpia todas las cachés manualmente
   * Útil cuando se necesita forzar una actualización de datos
   */
  clearAllCaches(): void {
    this.cache.archivosCalificaciones.clear();
    this.cache.cursos = null;
    this.cache.cursosTimestamp = 0;
  }

  /**
   * Limpia la caché de un curso específico
   */
  clearCourseCache(codigoCurso: string): void {
    this.cache.archivosCalificaciones.delete(codigoCurso);
  }

  /**
   * Limpia la base de datos y la deja en estado inicial
   * Elimina: evaluaciones, asociaciones de rúbricas, estados de UI por curso
   * Mantiene: cursos, estudiantes, rúbricas base
   */
  async limpiarBaseDatosEstadoCero(): Promise<void> {
    await this.ensureInitialized();

    try {

      // LOG: Estado ANTES de limpiar
      const cursosAntes = this.courseService.getCursosValue();
      const rubricasAntes = this.rubricService.rubricasValue;

      // 1. Limpiar TODOS los cursos y estudiantes
      const cursosVacios: CursoData = {};
      await this.courseService.saveCursos(cursosVacios);

      // 2. Limpiar todas las evaluaciones
      const evaluacionesVacias: { [key: string]: any } = {};
      await this.evaluationService.saveEvaluaciones(evaluacionesVacias);

      // 3. Limpiar estados de UI completamente
      const uiStateLimpio: UIState = {
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      };
      await this.storage.set(this.STORAGE_KEYS.UI_STATE, uiStateLimpio);
      this.stateService.updateUIStateState(uiStateLimpio);

      // 4. Eliminar TODAS las rúbricas
      const rubricasVacias: { [key: string]: RubricaDefinicion } = {};
      await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricasVacias);
      this.rubricService.updateRubricasState(rubricasVacias);

      // LOG: Estado DESPUÉS de limpiar
      const cursosDespues = this.courseService.getCursosValue();
      const rubricasDespues = this.rubricService.rubricasValue;

      // 5. Limpiar comentarios de grupo
      const comentariosVacios: ComentariosGrupoData = {};
      await this.commentService.saveComentariosGrupo(comentariosVacios);
      this.commentService.updateComentariosState(comentariosVacios);

      // 6. Limpiar datos LEGACY (sistema antiguo)
      try {
        localStorage.removeItem('rubricas'); // Rúbricas del sistema antiguo
        localStorage.removeItem('rubricas_migrado'); // Flag de migración

      } catch (error) {
        Logger.warn('⚠️ No se pudo limpiar localStorage legacy:', error);
      }















    } catch (error) {
      Logger.error('❌ [DataService] Error limpiando base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del estado actual de la base de datos
   */
  async obtenerEstadisticasDB(): Promise<{
    totalCursos: number;
    totalEstudiantes: number;
    totalRubricas: number;
    totalEvaluaciones: number;
    cursosConEstado: number;
  }> {
    await this.ensureInitialized();

    const cursos = this.courseService.getCursosValue();
    const rubricas = this.rubricService.rubricasValue;
    const evaluaciones = this.evaluationService.getEvaluacionesValue();
    const uiState = this.stateService.getUIStateValue();

    let totalEstudiantes = 0;
    Object.values(cursos).forEach(curso => {
      totalEstudiantes += curso.length || 0;
    });

    let totalEvaluaciones = 0;
    Object.values(evaluaciones).forEach(cursoEvals => {
      Object.values(cursoEvals || {}).forEach(entregaEvals => {
        Object.values(entregaEvals || {}).forEach(tipoEvals => {
          totalEvaluaciones += Object.keys(tipoEvals || {}).length;
        });
      });
    });

    return {
      totalCursos: Object.keys(cursos).length,
      totalEstudiantes,
      totalRubricas: Object.keys(rubricas).length,
      totalEvaluaciones,
      cursosConEstado: Object.keys(uiState.courseStates || {}).length
    };
  }

  /**
   * Diagnóstico completo de la base de datos
   * Muestra todo el contenido almacenado en storage
   */
  async diagnosticoCompleto(): Promise<void> {
    await this.ensureInitialized();

    console.group('🔍 ═══════════════════════════════════════════════════════');


    // 1. CURSOS
    const cursos = this.courseService.getCursosValue();
    console.group('📚 1. CURSOS (gestorCursosData)');

    Object.entries(cursos).forEach(([nombreCurso, estudiantes]) => {


      if (estudiantes.length > 0) {

      }
    });
    console.groupEnd();

    // 2. UI_STATE
    const uiState = this.stateService.getUIStateValue();
    console.group('\n🎨 2. UI STATE (appUIState)');



    Object.entries(uiState.courseStates || {}).forEach(([curso, state]) => {







    });
    console.groupEnd();

    // 3. RÚBRICAS
    const rubricas = this.rubricService.rubricasValue;
    console.group('\n📋 3. RÚBRICAS (rubricDefinitionsData)');

    Object.entries(rubricas).forEach(([id, rubrica]) => {




    });
    console.groupEnd();

    // 4. EVALUACIONES
    const evaluaciones = this.evaluationService.getEvaluacionesValue();
    console.group('\n📊 4. EVALUACIONES (evaluacionesData)');

    let totalEvals = 0;
    Object.entries(evaluaciones).forEach(([curso, cursoData]) => {

      Object.entries(cursoData || {}).forEach(([entrega, entregaData]) => {
        Object.entries(entregaData || {}).forEach(([tipo, tipoData]) => {
          const numEvals = Object.keys(tipoData || {}).length;
          totalEvals += numEvals;
          if (numEvals > 0) {

            // Mostrar primera evaluación como ejemplo
            const estudiantesEvaluados = Object.keys(tipoData || {});
            if (estudiantesEvaluados.length > 0) {

            }
          }
        });
      });
    });

    console.groupEnd();    // 5. COMENTARIOS GRUPO
    const comentariosGrupo = this.commentService.getComentariosValue();
    console.group('\n💬 5. COMENTARIOS GRUPO (comentariosGrupoData)');
    let totalComentarios = 0;
    Object.entries(comentariosGrupo).forEach(([curso, cursoData]) => {

      Object.entries(cursoData || {}).forEach(([Grupo, GrupoData]) => {
        Object.entries(GrupoData || {}).forEach(([entrega, comentario]) => {
          totalComentarios++;

        });
      });
    });

    console.groupEnd();

    // 6. RESUMEN
    console.group('\n📈 6. RESUMEN GENERAL');
    const stats = await this.obtenerEstadisticasDB();
    console.table({
      'Total Cursos': stats.totalCursos,
      'Total Estudiantes': stats.totalEstudiantes,
      'Total Rúbricas': stats.totalRubricas,
      'Total Evaluaciones': stats.totalEvaluaciones,
      'Cursos con Estado': stats.cursosConEstado,
      'Comentarios de Grupo': totalComentarios
    });
    console.groupEnd();

    console.groupEnd();
  }

  // ============================================================================
  // MÉTODOS DE GESTIÓN DE RÚBRICAS (Migrados desde RubricaService)
  // ============================================================================

  /**
   * Parsea un archivo JSON con formato estandarizado de rúbrica
   * @param contenidoJSON - Contenido del archivo JSON como string
   * @returns RubricaDefinicion parseada o null si hay error
   * @throws Error si el JSON es inválido o le faltan campos requeridos
   */
  parsearArchivoRubricaJSON(contenidoJSON: string): RubricaDefinicion | null {
    try {
      const json: RubricaJSON = JSON.parse(contenidoJSON);

      // Validar campos requeridos
      if (!json.rubrica_id || !json.curso || !json.criterios) {
        throw new Error('El archivo JSON no contiene los campos requeridos (rubrica_id, curso, criterios)');
      }

      // Detectar tipo de rúbrica desde el ID (RG = Grupal, RI = Individual)
      const tipoRubrica = this.detectarTipoRubricaDesdeId(json.rubrica_id, json.tipo);

      // Detectar tipo de entrega desde el ID (E1, E2, EF)
      const tipoEntrega = this.detectarTipoEntregaDesdeId(json.rubrica_id, json.entrega);

      // Generar nombre descriptivo
      const nombre = this.generarNombreDesdeCodigoRubrica(json.rubrica_id);

      // Convertir escala de calificación
      const escalaCalificacion: EscalaCalificacion[] = (json.escala_calificacion || []).map(escala => ({
        min: escala.min,
        max: escala.max,
        rango: `${escala.min}-${escala.max}`,
        descripcion: escala.descripcion,
        nivel: escala.nivel
      }));

      // Convertir criterios al formato interno
      const criterios: CriterioRubrica[] = json.criterios.map(criterioJSON => ({
        titulo: criterioJSON.nombre,
        peso: criterioJSON.peso,
        pesoMaximo: criterioJSON.peso,
        nivelesDetalle: this.convertirNivelesJSON(criterioJSON.nivel)
      }));

      // Calcular puntuación total si no viene en el JSON
      const puntuacionTotal = json.puntuacion_total ||
        criterios.reduce((sum, c) => sum + (c.peso || 0), 0);

      return {
        id: this.rubricService.generarIdRubrica(json.rubrica_id),
        nombre,
        descripcion: json.curso,
        criterios,
        puntuacionTotal,
        escalaCalificacion,
        cursosCodigos: [],  // Se asignarán después de buscar cursos
        cursoAsociado: json.curso,
        tipoRubrica,
        tipoEntrega,
        fechaCreacion: new Date(),
        fechaModificacion: new Date()
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        Logger.error('Error de sintaxis JSON:', error.message);
        throw new Error(`El archivo no contiene JSON válido: ${error.message}`);
      }
      Logger.error('Error parseando rúbrica JSON:', error);
      throw error;
    }
  }

  /**
   * Convierte niveles del formato JSON externo al formato interno
   */
  private convertirNivelesJSON(nivelesJSON: NivelRubricaJSON[]): NivelRubricaDetallado[] {
    if (!nivelesJSON || !Array.isArray(nivelesJSON)) {
      return [];
    }

    return nivelesJSON.map(nivel => {
      const puntosMin = nivel.minimo;
      const puntosMax = nivel.maximo;

      return {
        puntos: puntosMin === puntosMax ? `${puntosMin}` : `${puntosMin}-${puntosMax}`,
        puntosMin,
        puntosMax,
        titulo: nivel.titulo,
        descripcion: nivel.descripcion,
        color: this.asignarColorNivel(nivel.titulo)
      };
    });
  }

  /**
   * Asigna color según el título del nivel
   */
  private asignarColorNivel(titulo: string): string {
    const tituloLower = titulo.toLowerCase();
    if (tituloLower.includes('excelente') || tituloLower.includes('sobresaliente')) {
      return '#4caf50';  // Verde
    } else if (tituloLower.includes('bueno') || tituloLower.includes('bien')) {
      return '#8bc34a';  // Verde claro
    } else if (tituloLower.includes('aceptable') || tituloLower.includes('regular')) {
      return '#ff9800';  // Naranja
    } else if (tituloLower.includes('insuficiente') || tituloLower.includes('deficiente')) {
      return '#f44336';  // Rojo
    }
    return '#9e9e9e';  // Gris por defecto
  }

  /**
   * Detecta el tipo de rúbrica desde el ID o campo tipo
   */
  private detectarTipoRubricaDesdeId(rubricaId: string, tipo?: string): TipoRubrica | undefined {
    // Primero verificar el campo tipo si existe
    if (tipo) {
      const tipoLower = tipo.toLowerCase();
      if (tipoLower === 'grupal' || tipoLower === 'pg' || tipoLower === 'grupo') {
        return 'PG';
      } else if (tipoLower === 'individual' || tipoLower === 'pi' || tipoLower === 'personal') {
        return 'PI';
      }
    }

    // Detectar desde el ID (RG = Grupal, RI = Individual)
    const idUpper = rubricaId.toUpperCase();
    if (idUpper.startsWith('RG') || idUpper.includes('GRUPAL')) {
      return 'PG';
    } else if (idUpper.startsWith('RI') || idUpper.includes('INDIVIDUAL')) {
      return 'PI';
    }

    return undefined;
  }

  /**
   * Detecta el tipo de entrega desde el ID o campo entrega
   */
  private detectarTipoEntregaDesdeId(rubricaId: string, entrega?: string): TipoEntrega | undefined {
    // Primero verificar el campo entrega si existe
    if (entrega) {
      const entregaUpper = entrega.toUpperCase();
      if (entregaUpper === 'E1' || entregaUpper.includes('1')) return 'E1';
      if (entregaUpper === 'E2' || entregaUpper.includes('2')) return 'E2';
      if (entregaUpper === 'EF' || entregaUpper.includes('FINAL')) return 'EF';
    }

    // Detectar desde el ID
    const idUpper = rubricaId.toUpperCase();
    if (idUpper.includes('E1') || idUpper.includes('ENTREGA1') || idUpper.includes('ENTREGA 1')) {
      return 'E1';
    } else if (idUpper.includes('E2') || idUpper.includes('ENTREGA2') || idUpper.includes('ENTREGA 2')) {
      return 'E2';
    } else if (idUpper.includes('EF') || idUpper.includes('FINAL')) {
      return 'EF';
    }

    return undefined;
  }

  /**
   * Parsea un archivo de texto con formato de rúbrica y devuelve el objeto RubricaDefinicion
   */
  parsearArchivoRubrica(contenidoArchivo: string): RubricaDefinicion | null {
    try {
      const lineas = contenidoArchivo.split('\n').map(linea => linea.trim());
      let lineaActual = 0;

      // Extraer título (formato: === CODIGO === o === CODIGO ===)
      const tituloMatch = lineas[lineaActual].match(/===\s*(.+?)\s*===?/);
      const codigo = tituloMatch ? tituloMatch[1].trim() : 'Rúbrica sin título';

      // Detectar entrega automáticamente desde el código
      let tipoEntregaDetectado: string | undefined = undefined;
      const codigoUpper = codigo.toUpperCase();
      if (codigoUpper.includes('E1') || codigoUpper.includes('ENTREGA 1') || codigoUpper.includes('ENTREGA1')) {
        tipoEntregaDetectado = 'E1';
      } else if (codigoUpper.includes('E2') || codigoUpper.includes('ENTREGA 2') || codigoUpper.includes('ENTREGA2')) {
        tipoEntregaDetectado = 'E2';
      } else if (codigoUpper.includes('EF') || codigoUpper.includes('FINAL') || codigoUpper.includes('ENTREGA FINAL')) {
        tipoEntregaDetectado = 'EF';
      }

      lineaActual++;

      // Extraer curso si existe - Soporta ambos formatos: "CURSO:" y "==CURSO:"
      let curso = '';
      let cursosCodigos: string[] = [];
      const lineaCurso = lineas[lineaActual];
      const cursoMatch = lineaCurso?.match(/^==?CURSO:\s*(.+?)=*$/i) || lineaCurso?.match(/^CURSO:\s*(.+)$/i);
      if (cursoMatch) {
        curso = cursoMatch[1].trim();
        cursosCodigos = [curso];
        lineaActual++;
      }

      // Generar nombre de la rúbrica basado en el código (ej: RGE1 -> Rúbrica Grupal Entrega 1)
      const nombre = this.generarNombreDesdeCodigoRubrica(codigo);

      // Extraer tipo de rúbrica (Grupal o Individual)
      let tipoRubrica: 'PG' | 'PI' | undefined = undefined;
      const lineaTipo = lineas[lineaActual];
      const tipoMatch = lineaTipo?.match(/^==?TIPO:\s*(.+?)=*$/i) || lineaTipo?.match(/^TIPO:\s*(.+)$/i);
      if (tipoMatch) {
        const tipoTexto = tipoMatch[1].trim().toUpperCase();
        if (tipoTexto.includes('GRUPAL') || tipoTexto === 'PG' || tipoTexto.includes('GRUPO')) {
          tipoRubrica = 'PG';
        } else if (tipoTexto.includes('INDIVIDUAL') || tipoTexto === 'PI' || tipoTexto.includes('PERSONAL')) {
          tipoRubrica = 'PI';
        }
        lineaActual++;
      }

      // Si no se especifica, intentar detectar del nombre/código
      if (!tipoRubrica) {
        const nombreUpper = nombre.toUpperCase();
        const codUpper = codigo.toUpperCase();
        if (nombreUpper.includes('GRUPAL') || nombreUpper.includes('GRUPO') || codUpper.includes('RG')) {
          tipoRubrica = 'PG';
        } else if (nombreUpper.includes('INDIVIDUAL') || nombreUpper.includes('PERSONAL') || codUpper.includes('RI')) {
          tipoRubrica = 'PI';
        }
      }

      // Extraer puntuación total - Soporta: "PUNTUACIÓN_TOTAL: 75" y "==PUNTUACIÓN_TOTAL: 75==="
      let puntuacionTotal = 100;
      const lineaPuntuacion = lineas[lineaActual];
      const puntuacionMatch = lineaPuntuacion?.match(/PUNTUACI[OÓ]N_TOTAL:\s*(\d+)/i);
      if (puntuacionMatch) {
        puntuacionTotal = parseInt(puntuacionMatch[1]);
        lineaActual++;
      }

      // Saltar líneas vacías
      while (lineaActual < lineas.length && lineas[lineaActual] === '') {
        lineaActual++;
      }

      // Extraer escala de calificación
      const escalaCalificacion: any[] = [];

      // Detectar inicio de escala - Soporta: "===ESCALA_CALIFICACION===" y "ESCALA_CALIFICACION:"
      if (lineas[lineaActual]?.includes('ESCALA_CALIFICACION')) {
        lineaActual++;

        // Parsear líneas de escala hasta encontrar "---" o línea vacía seguida de criterio
        while (lineaActual < lineas.length &&
               !lineas[lineaActual].startsWith('---') &&
               !lineas[lineaActual].startsWith('CRITERIO_')) {
          const lineaEscala = lineas[lineaActual];

          // Formato nuevo: =0,29|Insuficiente:Descripción=
          const matchNuevo = lineaEscala.match(/^=?(\d+),(\d+)\|([^:]+):(.+?)=?$/);
          if (matchNuevo) {
            escalaCalificacion.push({
              min: parseInt(matchNuevo[1]),
              max: parseInt(matchNuevo[2]),
              rango: `${matchNuevo[1]}-${matchNuevo[2]}`,
              nivel: matchNuevo[3].trim(),
              descripcion: matchNuevo[4].trim()
            });
          } else {
            // Formato antiguo: 0-30|Descripción
            const matchAntiguo = lineaEscala.match(/^(\d+)-(\d+)\|(.+)$/);
            if (matchAntiguo) {
              escalaCalificacion.push({
                min: parseInt(matchAntiguo[1]),
                max: parseInt(matchAntiguo[2]),
                rango: `${matchAntiguo[1]}-${matchAntiguo[2]}`,
                descripcion: matchAntiguo[3].trim()
              });
            }
          }
          lineaActual++;
        }
      }

      // Saltar líneas "---" y vacías
      while (lineaActual < lineas.length && (lineas[lineaActual] === '---' || lineas[lineaActual] === '')) {
        lineaActual++;
      }

      // Extraer criterios
      const criterios: any[] = [];

      while (lineaActual < lineas.length && !lineas[lineaActual].includes('===FIN') && !lineas[lineaActual].includes('=== FIN')) {
        if (lineas[lineaActual].startsWith('CRITERIO_')) {
          const criterio = this.parsearCriterio(lineas, lineaActual);
          criterios.push(criterio.criterio);
          lineaActual = criterio.siguienteLinea;
        } else {
          lineaActual++;
        }
      }

      return {
        id: this.rubricService.generarIdRubrica(codigo),
        nombre: nombre,
        descripcion: curso || `Rúbrica con ${criterios.length} criterios`,
        criterios,
        puntuacionTotal,
        escalaCalificacion,
        cursosCodigos,
        cursoAsociado: curso,
        tipoRubrica,
        tipoEntrega: tipoEntregaDetectado as 'E1' | 'E2' | 'EF' | undefined,
        fechaCreacion: new Date(),
        fechaModificacion: new Date()
      };
    } catch (error) {
      Logger.error('Error parseando archivo de rúbrica:', error);
      return null;
    }
  }

  private parsearCriterio(lineas: string[], inicioLinea: number): { criterio: any, siguienteLinea: number } {
    let lineaActual = inicioLinea;

    // Extraer nombre del criterio
    const nombreMatch = lineas[lineaActual].match(/CRITERIO_\d+:\s*(.+)/);
    const nombre = nombreMatch ? nombreMatch[1] : 'Criterio sin nombre';

    lineaActual++;

    // Extraer peso
    const pesoMatch = lineas[lineaActual].match(/PESO:\s*(\d+)/);
    const peso = pesoMatch ? parseInt(pesoMatch[1]) : 1;

    lineaActual++;

    // Extraer número de niveles
    const nivelesMatch = lineas[lineaActual].match(/NIVELES:\s*(\d+)/);
    const niveles = nivelesMatch ? parseInt(nivelesMatch[1]) : 3;

    lineaActual++;

    // Saltar líneas vacías y separadores "--"
    while (lineaActual < lineas.length &&
           (lineas[lineaActual] === '' || lineas[lineaActual] === '--')) {
      lineaActual++;
    }

    // Extraer niveles de detalle
    const nivelesDetalle: any[] = [];

    while (lineaActual < lineas.length &&
      !lineas[lineaActual].startsWith('CRITERIO_') &&
      !lineas[lineaActual].includes('===FIN') &&
      !lineas[lineaActual].includes('=== FIN') &&
      lineas[lineaActual] !== '---') {

      if (lineas[lineaActual].startsWith('NIVEL_')) {
        const nivel = this.parsearNivel(lineas, lineaActual);
        nivelesDetalle.push(nivel.nivel);
        lineaActual = nivel.siguienteLinea;
      } else {
        lineaActual++;
      }
    }

    // Saltar línea "---" si existe y líneas vacías
    while (lineaActual < lineas.length &&
           (lineas[lineaActual] === '---' || lineas[lineaActual] === '')) {
      lineaActual++;
    }

    return {
      criterio: {
        titulo: nombre,
        peso,
        nivelesDetalle,
        pesoMaximo: peso
      },
      siguienteLinea: lineaActual
    };
  }

  private parsearNivel(lineas: string[], inicioLinea: number): { nivel: any, siguienteLinea: number } {
    let lineaActual = inicioLinea + 1; // Saltar "NIVEL_X:"

    // Variables para los valores
    let puntos = '0';
    let puntosMin = 0;
    let puntosMax = 0;
    let titulo = 'Sin título';
    let descripcion = 'Sin descripción';
    let usaMinMax = false;

    // Parsear campos del nivel (soporta ambos formatos: PUNTOS o MINIMO/MAXIMO)
    while (lineaActual < lineas.length &&
      !lineas[lineaActual].startsWith('NIVEL_') &&
      !lineas[lineaActual].startsWith('CRITERIO_') &&
      !lineas[lineaActual].startsWith('---') &&
      !lineas[lineaActual].startsWith('--') &&
      !lineas[lineaActual].includes('=== FIN')) {

      const linea = lineas[lineaActual].trim();

      // Formato antiguo: PUNTOS: valor
      const puntosMatch = linea.match(/^PUNTOS:\s*(.+)/i);
      if (puntosMatch) {
        puntos = puntosMatch[1];
        lineaActual++;
        continue;
      }

      // Formato nuevo: MINIMO: valor
      const minimoMatch = linea.match(/^MINIMO:\s*(\d+)/i);
      if (minimoMatch) {
        puntosMin = parseInt(minimoMatch[1]);
        usaMinMax = true;
        lineaActual++;
        continue;
      }

      // Formato nuevo: MAXIMO: valor
      const maximoMatch = linea.match(/^MAXIMO:\s*(\d+)/i);
      if (maximoMatch) {
        puntosMax = parseInt(maximoMatch[1]);
        usaMinMax = true;
        lineaActual++;
        continue;
      }

      // TITULO: valor
      const tituloMatch = linea.match(/^TITULO:\s*(.+)/i);
      if (tituloMatch) {
        titulo = tituloMatch[1];
        lineaActual++;
        continue;
      }

      // DESCRIPCION: valor (puede ser multilínea)
      const descripcionMatch = linea.match(/^DESCRIPCION:\s*(.+)/i);
      if (descripcionMatch) {
        descripcion = descripcionMatch[1];
        lineaActual++;
        // La descripción puede continuar en las siguientes líneas
        while (lineaActual < lineas.length &&
          lineas[lineaActual] !== '' &&
          !lineas[lineaActual].match(/^(NIVEL_|CRITERIO_|PUNTOS:|MINIMO:|MAXIMO:|TITULO:|---)/i) &&
          !lineas[lineaActual].includes('=== FIN')) {
          descripcion += ' ' + lineas[lineaActual].trim();
          lineaActual++;
        }
        continue;
      }

      // Línea vacía o no reconocida
      if (linea === '' || linea === '--') {
        lineaActual++;
        continue;
      }

      lineaActual++;
    }

    // Si usó formato MINIMO/MAXIMO, calcular puntos string
    if (usaMinMax) {
      puntos = puntosMin === puntosMax ? `${puntosMin}` : `${puntosMin}-${puntosMax}`;
    } else {
      // Extraer min y max de puntos del formato antiguo (puede ser "10" o "10-20")
      if (puntos.includes('-')) {
        const parts = puntos.split('-');
        puntosMin = parseInt(parts[0]);
        puntosMax = parseInt(parts[1]);
      } else {
        puntosMin = parseInt(puntos) || 0;
        puntosMax = parseInt(puntos) || 0;
      }
    }

    // Determinar color basado en el título
    let color = 'success';
    const tituloLower = titulo.toLowerCase();
    if (tituloLower.includes('insuficiente') || tituloLower.includes('bajo')) {
      color = 'danger';
    } else if (tituloLower.includes('aceptable') || tituloLower.includes('medio')) {
      color = 'warning';
    }

    return {
      nivel: {
        puntos,
        titulo,
        descripcion,
        puntosMin,
        puntosMax,
        color
      },
      siguienteLinea: lineaActual
    };
  }



  /**
   * Genera el nombre completo de una rúbrica basado en su código
   * RGE1 -> Rúbrica Grupal Entrega 1
   * RGE2 -> Rúbrica Grupal Entrega 2
   * RGEF -> Rúbrica Grupal Entrega Final
   * RIE1 -> Rúbrica Individual Entrega 1
   * RIEF -> Rúbrica Individual Entrega Final
   */
  generarNombreDesdeCodigoRubrica(codigo: string): string {
    const codigoUpper = codigo.toUpperCase().trim();

    // Detectar si es Grupal o Individual
    let tipo = '';
    if (codigoUpper.startsWith('RG')) {
      tipo = 'Rúbrica Grupal';
    } else if (codigoUpper.startsWith('RI')) {
      tipo = 'Rúbrica Individual';
    } else {
      return codigo; // Si no coincide con el patrón, devolver el código original
    }

    // Detectar el número de entrega o si es Final
    const resto = codigoUpper.substring(2); // Quitar "RG" o "RI"

    if (resto === 'EF') {
      return `${tipo} Entrega Final`;
    } else if (resto.startsWith('E') && resto.length > 1) {
      const numero = resto.substring(1); // Quitar la "E"
      return `${tipo} Entrega ${numero}`;
    } else {
      return codigo; // Si no coincide con el patrón, devolver el código original
    }
  }

  /**
   * Busca cursos por nombre con aproximación (sin tildes)
   * Busca tanto en metadata.nombre como en el código del curso
   */
  buscarCursosPorNombre(nombreBusqueda: string): string[] {
    const cursos = this.getCursos();
    const uiState = this.getUIState();
    const nombreNormalizado = this.normalizarTexto(nombreBusqueda);
    const codigosEncontrados: string[] = [];

    Logger.log('🔍 Buscando curso:', nombreBusqueda);
    Logger.log('📋 Cursos disponibles:', Object.keys(cursos));

    Object.keys(cursos).forEach(codigo => {
      const metadata = uiState.courseStates?.[codigo]?.metadata;
      const nombreCurso = metadata?.nombre || '';
      const codigoNormalizado = this.normalizarTexto(codigo);

      Logger.log(`  - Comparando con curso: ${codigo} (${nombreCurso})`);

      // Buscar coincidencia en el nombre del curso
      if (nombreCurso) {
        const nombreCursoNormalizado = this.normalizarTexto(nombreCurso);

        // Buscar coincidencia exacta o parcial en el nombre
        if (nombreCursoNormalizado.includes(nombreNormalizado) ||
          nombreNormalizado.includes(nombreCursoNormalizado)) {
          Logger.log(`  ✅ Coincidencia encontrada por NOMBRE`);
          codigosEncontrados.push(codigo);
          return;
        }
      }

      // También buscar coincidencia en el código del curso
      if (codigoNormalizado.includes(nombreNormalizado) ||
        nombreNormalizado.includes(codigoNormalizado)) {
        Logger.log(`  ✅ Coincidencia encontrada por CÓDIGO`);
        codigosEncontrados.push(codigo);
      }
    });

    Logger.log('✅ Cursos encontrados:', codigosEncontrados);
    return codigosEncontrados;
  }

  async cargarArchivoRubrica(archivo: File): Promise<RubricaDefinicion | null> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      const esArchivoJSON = archivo.name.toLowerCase().endsWith('.json');

      lector.onload = (evento) => {
        try {
          const contenido = evento.target?.result as string;

          // Parsear según el tipo de archivo
          let rubrica: RubricaDefinicion | null;
          if (esArchivoJSON) {
            rubrica = this.parsearArchivoRubricaJSON(contenido);
          } else {
            rubrica = this.parsearArchivoRubrica(contenido);
          }

          if (!rubrica) {
            reject(new Error('No se pudo parsear el archivo de rúbrica'));
            return;
          }

          // Verificar si existe al menos un curso coincidente
          const nombreCurso = rubrica.descripcion || rubrica.cursoAsociado;
          if (nombreCurso) {
            const cursosEncontrados = this.buscarCursosPorNombre(nombreCurso);

            if (cursosEncontrados.length === 0) {
              reject(new Error(`No se encontró ningún curso que coincida con "${nombreCurso}". Debes crear el curso primero.`));
              return;
            }

            // Asignar cursos encontrados
            rubrica.cursosCodigos = cursosEncontrados;
          } else {
            reject(new Error('No se pudo determinar el curso de la rúbrica'));
            return;
          }

          Logger.log(`✅ Rúbrica cargada desde ${esArchivoJSON ? 'JSON' : 'TXT'}:`, rubrica.nombre);
          resolve(rubrica);
        } catch (error) {
          reject(error);
        }
      };

      lector.onerror = () => reject(new Error('Error al leer el archivo'));
      lector.readAsText(archivo, 'UTF-8');
    });
  }

  /**
   * Guarda o actualiza una rúbrica
   * Si la rúbrica se guarda como activa, desactiva automáticamente otras versiones
   * del mismo tipo, entrega y curso
   */
  async guardarRubrica(rubrica: RubricaDefinicion): Promise<void> {
    await this.rubricService.guardarRubrica(rubrica);
  }

  /**
   * Activa una rúbrica específica y desactiva otras del mismo tipo/entrega/curso
   * @param rubricaId ID de la rúbrica a activar
   */
  async activarRubrica(rubricaId: string): Promise<void> {
    await this.rubricService.activarRubrica(rubricaId);
  }

  /**
   * Obtiene las rúbricas de la misma categoría (tipo + entrega + curso)
   */
  obtenerRubricasMismaCategoria(rubrica: RubricaDefinicion): RubricaDefinicion[] {
    return this.rubricService.obtenerRubricasMismaCategoria(rubrica);
  }

  // ============================================
  // GENERACIÓN AUTOMÁTICA DE NOMBRES Y CÓDIGOS
  // ============================================

  /**
   * Genera un nombre automático para una rúbrica basado en tipo, entrega y curso
   * @example "Rúbrica Grupal E1 - Programación Móvil"
   */
  generarNombreAutomatico(rubrica: Partial<RubricaDefinicion>): string {
    let nombreCurso = '';
    if (rubrica.cursosCodigos?.length) {
      const uiState = this.stateService.getUIStateValue();
      const metadata = uiState.courseStates?.[rubrica.cursosCodigos[0]]?.metadata;
      nombreCurso = metadata?.nombre || rubrica.cursosCodigos[0];
    }
    return this.rubricService.generarNombreAutomatico(rubrica, nombreCurso);
  }

  /**
   * Detecta si existe una rúbrica con nombre similar y retorna información de versión
   * @returns Objeto con información de duplicados encontrados
   */
  detectarRubricaDuplicada(nombre: string, idExcluir?: string): {
    existeDuplicado: boolean;
    rubricasCoincidentes: RubricaDefinicion[];
    siguienteVersion: number;
    nombreSugerido: string;
  } {
    return this.rubricService.detectarRubricaDuplicada(nombre, idExcluir);
  }



  /**
   * Compara el contenido de dos rúbricas para determinar si son idénticas
   * Ignora metadatos como id, fechas, código, versión
   * @returns Objeto con resultado de comparación y diferencias encontradas
   */
  compararContenidoRubricas(rubrica1: RubricaDefinicion, rubrica2: RubricaDefinicion): {
    sonIdenticas: boolean;
    diferencias: string[];
    resumen: string;
  } {
    return this.rubricService.compararContenidoRubricas(rubrica1, rubrica2);
  }

  /**
   * Busca rúbricas con contenido idéntico independientemente del nombre
   * @param rubricaNueva - Rúbrica a comparar
   * @param idExcluir - ID de rúbrica a excluir (ej: si estamos editando)
   * @returns Rúbrica con contenido idéntico si existe, undefined si no hay duplicados
   */
  buscarRubricaDuplicadaPorContenido(rubricaNueva: RubricaDefinicion, idExcluir?: string): RubricaDefinicion | undefined {
    return this.rubricService.buscarRubricaDuplicadaPorContenido(rubricaNueva, idExcluir);
  }

  /**
   * Analiza si una rúbrica nueva es duplicada o versión de una existente
   * Compara tanto por nombre como por contenido para detectar duplicados
   * @returns Información completa para decisión de guardado
   */
  analizarRubricaParaGuardado(rubricaNueva: RubricaDefinicion, idExcluir?: string): {
    tipo: 'nueva' | 'duplicada_identica' | 'nueva_version' | 'duplicada_contenido';
    rubricaExistente?: RubricaDefinicion;
    comparacion?: { sonIdenticas: boolean; diferencias: string[]; resumen: string };
    siguienteVersion: number;
    mensajeUsuario: string;
  } {
    return this.rubricService.analizarRubricaParaGuardado(rubricaNueva, idExcluir);
  }

  /**
   * Obtiene información del código que se generaría para una rúbrica
   * Útil para mostrar preview antes de guardar
   */
  obtenerPreviewCodigo(rubrica: Partial<RubricaDefinicion>): {
    codigo: string;
    version: number;
    codigoBase: string;
    inicialesCurso: string;
  } {
    return this.rubricService.obtenerPreviewCodigo(rubrica);
  }

  /** Código por defecto cuando no hay curso asociado */


  /**
   * Genera código estructurado para una rúbrica
   * Formato: R[G|I][E1|E2|EF]-[INICIALES]V[N]
   * @param rubrica - Rúbrica para la cual generar código
   * @returns Objeto con código formateado y número de versión
   * @example
   * // Retorna { codigo: 'RGE1-EPMV1', version: 1 }
   * generarCodigoRubrica(rubricaGrupalEntrega1)
   */
  generarCodigoRubrica(rubrica: RubricaDefinicion): { codigo: string; version: number } {
    return this.rubricService.generarCodigoRubrica(rubrica);
  }





  /** Normaliza texto removiendo tildes y caracteres especiales */
  private normalizarTexto(texto: string): string {
    return texto
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z\s]/g, '');
  }



  /**
   * Obtiene todas las versiones de una rúbrica dado su código base (sin versión).
   *
   * IMPORTANTE: Las categorías son únicas por CURSO. Por ejemplo:
   * - "RGE1-EPM" → Rúbrica Grupal E1 para Programación Móvil
   * - "RGE1-SO"  → Rúbrica Grupal E1 para Sistemas Operativos
   * Son categorías DIFERENTES porque pertenecen a cursos distintos.
   *
   * @param codigoBase - Código base sin versión (ej: "RGE1-EPM")
   * @returns Array de rúbricas ordenadas por versión descendente
   * @example
   * // Obtiene RGE1-EPMV1, RGE1-EPMV2, etc. (solo de Programación Móvil)
   * obtenerVersionesRubrica("RGE1-EPM")
   */
  obtenerVersionesRubrica(codigoBase: string): RubricaDefinicion[] {
    const rubricas = this.obtenerRubricasArray();
    // Normalizar el patrón: si ya tiene V, usarlo; si no, agregarlo
    const patron = codigoBase.includes('V') ? codigoBase.split('V')[0] + 'V' : codigoBase + 'V';

    return rubricas
      .filter(r => r.codigo?.startsWith(patron))
      .sort((a, b) => (b.version || 0) - (a.version || 0)); // Ordenar por versión descendente
  }

  /**
   * Obtiene todas las categorías de rúbricas disponibles para un curso específico.
   * Una categoría es el código base sin versión (ej: RGE1-EPM, RGE2-EPM, RIE1-EPM).
   *
   * @param cursoCodigo - Código del curso (ej: "EPM-B01")
   * @returns Array de categorías únicas con información de versiones
   */
  obtenerCategoriasPorCurso(cursoCodigo: string): Array<{
    codigoBase: string;
    tipoRubrica: 'PG' | 'PI';
    tipoEntrega: 'E1' | 'E2' | 'EF';
    cantidadVersiones: number;
    versionActiva?: number;
    descripcion: string;
  }> {
    const rubricas = this.obtenerRubricasPorCurso(cursoCodigo);
    const categoriasMap = new Map<string, {
      codigoBase: string;
      tipoRubrica: 'PG' | 'PI';
      tipoEntrega: 'E1' | 'E2' | 'EF';
      versiones: RubricaDefinicion[];
    }>();

    // Agrupar por código base
    for (const rubrica of rubricas) {
      if (!rubrica.codigo) continue;

      const codigoBase = this.extraerCodigoBase(rubrica.codigo);
      if (!codigoBase) continue;

      if (!categoriasMap.has(codigoBase)) {
        categoriasMap.set(codigoBase, {
          codigoBase,
          tipoRubrica: rubrica.tipoRubrica || 'PG',
          tipoEntrega: rubrica.tipoEntrega || 'E1',
          versiones: []
        });
      }
      categoriasMap.get(codigoBase)!.versiones.push(rubrica);
    }

    // Convertir a array con información calculada
    return Array.from(categoriasMap.values()).map(cat => {
      const versionActiva = cat.versiones.find(v => v.activa);
      const tipoTexto = cat.tipoRubrica === 'PG' ? 'Grupal' : 'Individual';
      const entregaTexto = cat.tipoEntrega === 'EF' ? 'Final' : cat.tipoEntrega;

      return {
        codigoBase: cat.codigoBase,
        tipoRubrica: cat.tipoRubrica,
        tipoEntrega: cat.tipoEntrega,
        cantidadVersiones: cat.versiones.length,
        versionActiva: versionActiva?.version,
        descripcion: `Rúbrica ${tipoTexto} - Entrega ${entregaTexto}`
      };
    });
  }

  /**
   * Activa una versión de rúbrica y desactiva las demás del mismo tipo
   * @param rubricaId - ID de la rúbrica a activar
   * @throws Si la rúbrica no existe o tiene código inválido
   */
  async activarVersionRubrica(rubricaId: string): Promise<void> {
    const rubricas = this.rubricService.rubricasValue;
    const rubricaActivar = rubricas[rubricaId];

    if (!this.esRubricaValida(rubricaActivar)) {
      Logger.warn('⚠️ No se puede activar: rúbrica no encontrada o sin código válido');
      return;
    }

    const codigoBase = this.extraerCodigoBase(rubricaActivar.codigo!);
    if (!codigoBase) {
      Logger.warn('⚠️ Código de rúbrica inválido');
      return;
    }

    const versionesActualizadas = this.actualizarEstadoVersiones(rubricas, codigoBase, rubricaId);

    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricService.updateRubricasState(rubricas);

    Logger.log(`✅ Versión ${rubricaActivar.codigo} activada. ${versionesActualizadas - 1} versiones desactivadas.`);
  }

  /** Valida que la rúbrica exista y tenga código */
  private esRubricaValida(rubrica: RubricaDefinicion | undefined): rubrica is RubricaDefinicion {
    return !!rubrica && !!rubrica.codigo;
  }

  /**
   * Extrae el código base (sin versión) de un código completo.
   * Formato esperado: RGE1-EPMV1 → RGE1-EPM
   */
  private extraerCodigoBase(codigo: string): string | null {
    // Buscar patrón V seguido de números al final
    const match = codigo.match(/^(.+)V\d+$/);
    if (match) {
      return match[1]; // Retorna todo antes de V[N]
    }
    // Compatibilidad con formato anterior: RGE1-EPM-001
    const matchOld = codigo.match(/^(.+)-\d+$/);
    if (matchOld) {
      return matchOld[1];
    }

    // Si no tiene formato de versión, asumir que es el código base
    return codigo;
  }

  /** Actualiza el estado activo de todas las versiones de una rúbrica */
  private actualizarEstadoVersiones(
    rubricas: Record<string, RubricaDefinicion>,
    codigoBase: string,
    rubricaIdActiva: string
  ): number {
    // Patrón para nuevo formato: RGE1-EPMV
    const patronNuevo = `${codigoBase}V`;
    // Patrón para formato anterior: RGE1-EPM-
    const patronAnterior = `${codigoBase}-`;
    let contador = 0;

    Object.values(rubricas).forEach(rubrica => {
      // Verificar si es el código base exacto O si empieza con los patrones de versión
      const esVersion = rubrica.codigo === codigoBase ||
                        rubrica.codigo?.startsWith(patronNuevo) ||
                        rubrica.codigo?.startsWith(patronAnterior);

      if (esVersion) {
        rubrica.activa = rubrica.id === rubricaIdActiva;
        rubrica.fechaModificacion = new Date();
        contador++;
      }
    });

    return contador;
  }

  /**
   * Obtiene la rúbrica activa para un curso, tipo y entrega específicos.
   * Prioriza rúbricas con estado 'publicada' sobre 'borrador'.
   * @param cursoCodigo - Código del curso
   * @param tipoRubrica - 'PG' (grupal) o 'PI' (individual)
   * @param tipoEntrega - 'E1', 'E2' o 'EF'
   * @returns La rúbrica activa o undefined si no existe
   */
  obtenerRubricaActiva(
    cursoCodigo: string,
    tipoRubrica: 'PG' | 'PI',
    tipoEntrega: 'E1' | 'E2' | 'EF'
  ): RubricaDefinicion | undefined {
    const rubricas = this.obtenerRubricasArray();

    // Filtrar rúbricas que coincidan con los criterios
    const rubricasCoincidentes = rubricas.filter(r =>
      r.activa === true &&
      r.tipoRubrica === tipoRubrica &&
      r.tipoEntrega === tipoEntrega &&
      r.cursosCodigos?.includes(cursoCodigo)
    );

    if (rubricasCoincidentes.length === 0) {
      return undefined;
    }

    // Priorizar publicadas sobre borradores
    const publicada = rubricasCoincidentes.find(r => r.estado === 'publicada');
    return publicada || rubricasCoincidentes[0];
  }

  /**
   * Obtiene todas las rúbricas como array
   */
  obtenerRubricasArray(): RubricaDefinicion[] {
    const rubricas = this.rubricService.rubricasValue;
    return Object.values(rubricas);
  }

  /**
   * Obtiene los IDs de todas las rúbricas disponibles
   */
  obtenerIdsRubricas(): string[] {
    const rubricas = this.rubricService.rubricasValue;
    return Object.keys(rubricas);
  }

  /**
   * Obtiene una rúbrica por ID
   */
  obtenerRubricaPorId(id: string): RubricaDefinicion | undefined {
    const rubricas = this.rubricService.rubricasValue;
    return rubricas[id];
  }

  /**
   * Elimina una rúbrica
   */
  async eliminarRubrica(id: string): Promise<void> {
    const rubricas = this.rubricService.rubricasValue;

    // LOG: Verificar antes de eliminar
    const rubricaExistente = rubricas[id];

    delete rubricas[id];

    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricService.updateRubricasState(rubricas);

  }

  /**
   * Asocia una rúbrica con cursos específicos y tipo de entrega
   * Actualiza tanto la rúbrica como el CourseState de cada curso
   */
  async asociarRubricaConCursos(rubricaId: string, cursosCodigos: string[], tipoEntrega?: string): Promise<void> {
    const rubricas = this.rubricService.rubricasValue;
    const rubrica = rubricas[rubricaId];

    if (!rubrica) {
      Logger.warn(`⚠️ Rúbrica ${rubricaId} no encontrada`);
      return;
    }

    // Actualizar rúbrica
    rubrica.cursosCodigos = cursosCodigos;
    if (tipoEntrega) {
      rubrica.tipoEntrega = tipoEntrega as 'E1' | 'E2' | 'EF';
    }
    rubrica.fechaModificacion = new Date();

    // Guardar rúbrica actualizada
    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricService.updateRubricasState(rubricas);

    // Actualizar CourseState para cada curso asociado
    if (rubrica.tipoEntrega && rubrica.tipoRubrica) {
      const uiState = this.getUIState();

      for (const codigoCurso of cursosCodigos) {
        if (!uiState.courseStates[codigoCurso]) {
          Logger.warn(`⚠️ CourseState no encontrado para ${codigoCurso}`);
          continue;
        }

        if (!uiState.courseStates[codigoCurso].rubricasAsociadas) {
          uiState.courseStates[codigoCurso].rubricasAsociadas = {
            entrega1: null,
            entrega1Individual: null,
            entrega2: null,
            entrega2Individual: null,
            entregaFinal: null,
            entregaFinalIndividual: null
          };
        }

        const rubricasAsociadas = uiState.courseStates[codigoCurso].rubricasAsociadas!;

        // Asociar según tipo de entrega y tipo de rúbrica
        switch (rubrica.tipoEntrega) {
          case 'E1':
            if (rubrica.tipoRubrica === 'PG') {
              rubricasAsociadas.entrega1 = rubricaId;
            } else {
              rubricasAsociadas.entrega1Individual = rubricaId;
            }
            break;
          case 'E2':
            if (rubrica.tipoRubrica === 'PG') {
              rubricasAsociadas.entrega2 = rubricaId;
            } else {
              rubricasAsociadas.entrega2Individual = rubricaId;
            }
            break;
          case 'EF':
            if (rubrica.tipoRubrica === 'PG') {
              rubricasAsociadas.entregaFinal = rubricaId;
            } else {
              rubricasAsociadas.entregaFinalIndividual = rubricaId;
            }
            break;
        }
      }

      // Guardar UIState actualizado
      await this.updateUIState(uiState);
    }
  }

  /**
   * Obtiene rúbricas filtradas por curso
   */
  obtenerRubricasPorCurso(codigoCurso: string): RubricaDefinicion[] {
    return this.obtenerRubricasArray().filter(r =>
      r.cursosCodigos && r.cursosCodigos.includes(codigoCurso)
    );
  }

  /**
   * Obtiene rúbricas filtradas por tipo de entrega
   */
  obtenerRubricasPorTipoEntrega(tipoEntrega: string): RubricaDefinicion[] {
    return this.obtenerRubricasArray().filter(r => r.tipoEntrega === tipoEntrega);
  }

  /**
   * Obtiene todas las rúbricas activas de un curso, organizadas por tipo y entrega.
   * Útil para verificar qué rúbricas están asignadas actualmente.
   * @param cursoCodigo - Código del curso
   * @returns Objeto con las 6 posibles rúbricas (RGE1, RGE2, RGEF, RIE1, RIE2, RIEF)
   */
  obtenerRubricasActivasPorCurso(cursoCodigo: string): {
    grupal: { E1?: RubricaDefinicion; E2?: RubricaDefinicion; EF?: RubricaDefinicion };
    individual: { E1?: RubricaDefinicion; E2?: RubricaDefinicion; EF?: RubricaDefinicion };
  } {
    const entregas: Array<'E1' | 'E2' | 'EF'> = ['E1', 'E2', 'EF'];

    const grupal: { E1?: RubricaDefinicion; E2?: RubricaDefinicion; EF?: RubricaDefinicion } = {};
    const individual: { E1?: RubricaDefinicion; E2?: RubricaDefinicion; EF?: RubricaDefinicion } = {};

    for (const entrega of entregas) {
      grupal[entrega] = this.obtenerRubricaActiva(cursoCodigo, 'PG', entrega);
      individual[entrega] = this.obtenerRubricaActiva(cursoCodigo, 'PI', entrega);
    }

    return { grupal, individual };
  }

  /**
   * Valida y sincroniza las rúbricas asociadas en CourseState con las rúbricas activas.
   * Si una rúbrica asociada ya no está activa, la actualiza o la elimina.
   * @param cursoCodigo - Código del curso a validar
   * @returns Número de correcciones realizadas
   */
  async sincronizarRubricasAsociadas(cursoCodigo: string): Promise<number> {
    const uiState = this.getUIState();
    const courseState = uiState.courseStates?.[cursoCodigo];

    if (!courseState?.rubricasAsociadas) {
      return 0;
    }

    let correcciones = 0;
    const rubricasAsociadas = courseState.rubricasAsociadas;

    // Mapeo de campos a tipo de rúbrica y entrega
    const campos: Array<{
      campo: keyof typeof rubricasAsociadas;
      tipo: 'PG' | 'PI';
      entrega: 'E1' | 'E2' | 'EF';
    }> = [
      { campo: 'entrega1', tipo: 'PG', entrega: 'E1' },
      { campo: 'entrega2', tipo: 'PG', entrega: 'E2' },
      { campo: 'entregaFinal', tipo: 'PG', entrega: 'EF' },
      { campo: 'entrega1Individual', tipo: 'PI', entrega: 'E1' },
      { campo: 'entrega2Individual', tipo: 'PI', entrega: 'E2' },
      { campo: 'entregaFinalIndividual', tipo: 'PI', entrega: 'EF' }
    ];

    for (const { campo, tipo, entrega } of campos) {
      const rubricaIdAsociada = rubricasAsociadas[campo];

      if (rubricaIdAsociada) {
        const rubrica = this.obtenerRubricaPorId(rubricaIdAsociada);

        // Si la rúbrica no existe o no está activa, buscar la activa correcta
        if (!rubrica || !rubrica.activa) {
          const rubricaActiva = this.obtenerRubricaActiva(cursoCodigo, tipo, entrega);
          rubricasAsociadas[campo] = rubricaActiva?.id || null;
          correcciones++;
        }
      }
    }

    if (correcciones > 0) {
      await this.updateUIState(uiState);
      Logger.log(`✅ Sincronizadas ${correcciones} rúbricas para curso ${cursoCodigo}`);
    }

    return correcciones;
  }

  /**
   * Calcula la puntuación total basada en las calificaciones de criterios
   */
  calcularPuntuacionTotalRubrica(rubrica: RubricaDefinicion, calificaciones: { [criterio: string]: number }): number {
    let total = 0;

    for (const criterio of rubrica.criterios) {
      const calificacion = calificaciones[criterio.titulo] || 0;
      total += calificacion;
    }

    return total;
  }

  /**
   * Exporta una rúbrica a formato texto (.txt)
   */
  exportarRubricaATexto(rubrica: RubricaDefinicion): string {
    let texto = '';

    // Encabezado con código
    const codigo = rubrica.codigo || rubrica.nombre;
    texto += `=== ${codigo} ===\n`;

    // Curso
    if (rubrica.cursoAsociado || rubrica.descripcion) {
      texto += `==CURSO: ${rubrica.cursoAsociado || rubrica.descripcion}\n`;
    }

    // Puntuación total
    if (rubrica.puntuacionTotal) {
      texto += `==PUNTUACIÓN_TOTAL: ${rubrica.puntuacionTotal}===\n`;
    }

    texto += `\n`;

    // Escala de calificación
    if (rubrica.escalaCalificacion && rubrica.escalaCalificacion.length > 0) {
      texto += `===ESCALA_CALIFICACION===\n`;
      rubrica.escalaCalificacion.forEach((escala: EscalaCalificacion) => {
        const nivel = escala.nivel || escala.rango;
        texto += `=${escala.min},${escala.max}|${nivel}:${escala.descripcion}=\n`;
      });
      texto += `\n`;
    }

    // Criterios
    rubrica.criterios.forEach((criterio: CriterioRubrica, index: number) => {
      texto += `---\n\n`;
      texto += `CRITERIO_${index + 1}: ${criterio.titulo}\n`;

      if (criterio.peso !== undefined) {
        texto += `PESO: ${criterio.peso}\n`;
      } else if (criterio.pesoMaximo !== undefined) {
        texto += `PESO: ${criterio.pesoMaximo}\n`;
      }

      // Niveles detallados
      if (criterio.nivelesDetalle && criterio.nivelesDetalle.length > 0) {
        texto += `NIVELES: ${criterio.nivelesDetalle.length}\n`;

        criterio.nivelesDetalle.forEach((nivel: NivelRubricaDetallado, nivelIndex: number) => {
          texto += `\n--\nNIVEL_${nivelIndex + 1}:\n`;
          texto += `MINIMO: ${nivel.puntosMin}\n`;
          texto += `MAXIMO: ${nivel.puntosMax}\n`;
          texto += `TITULO: ${nivel.titulo}\n`;
          if (nivel.descripcion) {
            texto += `DESCRIPCION: ${nivel.descripcion}\n`;
          }
        });
      }

      texto += `\n`;
    });

    // Marcador de fin con código de la rúbrica
    texto += `===FIN_${codigo}===\n`;

    return texto;
  }

  /**
   * Descarga una rúbrica como archivo de texto
   */
  descargarRubricaComoTexto(rubrica: RubricaDefinicion): void {
    const contenido = this.exportarRubricaATexto(rubrica);
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${rubrica.nombre.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  }

  /**
   * Exporta una rúbrica al formato JSON estandarizado
   * @param rubrica - Rúbrica a exportar
   * @returns Objeto RubricaJSON listo para serializar
   */
  exportarRubricaAJSON(rubrica: RubricaDefinicion): RubricaJSON {
    // Generar el rubrica_id desde el código o nombre
    const rubricaId = this.generarRubricaIdExportacion(rubrica);

    // Convertir escala de calificación
    const escalaCalificacion: EscalaCalificacionJSON[] = (rubrica.escalaCalificacion || []).map(escala => ({
      min: escala.min,
      max: escala.max,
      nivel: escala.nivel || escala.descripcion.split(' ')[0] || 'N/A',
      descripcion: escala.descripcion
    }));

    // Convertir criterios al formato JSON
    const criterios: CriterioRubricaJSON[] = rubrica.criterios.map((criterio, index) => ({
      id: index + 1,
      nombre: criterio.titulo,
      peso: criterio.peso || criterio.pesoMaximo || 0,
      niveles: criterio.nivelesDetalle?.length || 0,
      nivel: (criterio.nivelesDetalle || []).map((nivel, nivelIndex) => ({
        numero: nivelIndex + 1,
        minimo: nivel.puntosMin,
        maximo: nivel.puntosMax,
        titulo: nivel.titulo,
        descripcion: nivel.descripcion
      }))
    }));

    return {
      rubrica_id: rubricaId,
      curso: rubrica.descripcion || rubrica.cursoAsociado || 'Sin curso',
      puntuacion_total: rubrica.puntuacionTotal || criterios.reduce((sum, c) => sum + c.peso, 0),
      escala_calificacion: escalaCalificacion,
      criterios,
      tipo: rubrica.tipoRubrica === 'PG' ? 'grupal' : rubrica.tipoRubrica === 'PI' ? 'individual' : undefined,
      entrega: rubrica.tipoEntrega
    };
  }

  /**
   * Genera el rubrica_id para exportación JSON
   */
  private generarRubricaIdExportacion(rubrica: RubricaDefinicion): string {
    // Si tiene código, extraer la parte inicial (ej: RGE1-EPM-001 -> RGE1)
    if (rubrica.codigo) {
      const partes = rubrica.codigo.split('-');
      if (partes.length > 0) {
        return partes[0];
      }
    }

    // Generar desde tipoRubrica y tipoEntrega
    const tipo = rubrica.tipoRubrica === 'PG' ? 'G' : rubrica.tipoRubrica === 'PI' ? 'I' : 'X';
    const entrega = rubrica.tipoEntrega || 'E1';
    return `R${tipo}${entrega}`;
  }

  /**
   * Descarga una rúbrica como archivo JSON
   * @param rubrica - Rúbrica a descargar
   * @param prettyPrint - Si es true, formatea el JSON con indentación (default: true)
   */
  descargarRubricaComoJSON(rubrica: RubricaDefinicion, prettyPrint: boolean = true): void {
    const jsonData = this.exportarRubricaAJSON(rubrica);
    const contenido = prettyPrint
      ? JSON.stringify(jsonData, null, 2)
      : JSON.stringify(jsonData);

    const blob = new Blob([contenido], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;

    // Generar nombre de archivo desde rubrica_id
    const nombreArchivo = `${jsonData.rubrica_id}.json`;
    link.download = nombreArchivo;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
    Logger.log(`✅ Rúbrica exportada como JSON: ${nombreArchivo}`);
  }
}




