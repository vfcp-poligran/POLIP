import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UnifiedStorageService } from './unified-storage.service';
import { BackupService } from './backup.service';
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
  CourseState
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private storage = inject(UnifiedStorageService);
  private backupService = inject(BackupService);

  private readonly STORAGE_KEYS = {
    CURSOS: 'gestorCursosData',
    EVALUACIONES: 'evaluacionesData',
    UI_STATE: 'appUIState',
    RUBRICAS: 'rubricDefinitionsData',
    COMENTARIOS_GRUPO: 'comentariosGrupoData'
  };

  // Constante para estado de curso por defecto (evita crear objeto en cada llamada)
  private readonly DEFAULT_COURSE_STATE: CourseState = {
    activeStudent: null,
    activeGroup: null,
    activeDelivery: null,
    activeType: null,
    filtroGrupo: '',
    emailsVisible: false,
    isScrollingTable: false,
    archivoCalificaciones: undefined
  };

  // BehaviorSubjects para estado reactivo
  private cursosSubject = new BehaviorSubject<CursoData>({});
  private evaluacionesSubject = new BehaviorSubject<{ [key: string]: Evaluacion }>({});
  private uiStateSubject = new BehaviorSubject<UIState>({
    cursoActivo: null,
    grupoSeguimientoActivo: null,
    courseStates: {}
  });
  private rubricasSubject = new BehaviorSubject<{ [key: string]: RubricaDefinicion }>({});
  private comentariosGrupoSubject = new BehaviorSubject<ComentariosGrupoData>({});

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

  // Subject para notificar cambios en calificaciones Canvas
  private calificacionesCanvasActualizadasSubject = new BehaviorSubject<{ curso: string, timestamp: number } | null>(null);

  // Observables públicos
  public cursos$ = this.cursosSubject.asObservable();
  public evaluaciones$ = this.evaluacionesSubject.asObservable();
  public uiState$ = this.uiStateSubject.asObservable();
  public rubricas$ = this.rubricasSubject.asObservable();
  public comentariosGrupo$ = this.comentariosGrupoSubject.asObservable();
  public globalSearch$ = this.globalSearchSubject.asObservable();
  public searchResults$ = this.searchResultsSubject.asObservable();
  public calificacionesCanvasActualizadas$ = this.calificacionesCanvasActualizadasSubject.asObservable();

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
      this.cursos$.pipe(
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
      await this.loadCursos();
      await this.loadEvaluaciones();
      await this.loadUIState();
      await this.loadRubricas();
      await this.loadComentariosGrupo();

      const resultadoMigracion = await this.migrarRubricasAntiguas();
      if (resultadoMigracion.migradas > 0) {
        await this.loadRubricas();
      }

      this.isInitialized = true;
      this.initializationPromise = null;
    } catch (error) {
      console.error('❌ [DataService] Error initializing data service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Migra datos de rúbricas del sistema antiguo al nuevo
   * Sistema antiguo: localStorage.getItem('rubricas')
   * Sistema nuevo: STORAGE_KEYS.RUBRICAS
   */
  async migrarRubricasAntiguas(): Promise<{ migradas: number; errores: number }> {
    let migradas = 0;
    let errores = 0;

    try {
      const yaMigrado = localStorage.getItem('rubricas_migrado');
      if (yaMigrado === 'true') {
        return { migradas: 0, errores: 0 };
      }

      const rubricasAntiguasStr = localStorage.getItem('rubricas');

      if (!rubricasAntiguasStr) {
        localStorage.setItem('rubricas_migrado', 'true');
        return { migradas: 0, errores: 0 };
      }

      const rubricasAntiguas = JSON.parse(rubricasAntiguasStr);

      for (const [viejoId, rubricaVieja] of Object.entries(rubricasAntiguas)) {
        try {
          const vieja = rubricaVieja as any;
          const nueva: RubricaDefinicion = {
            id: this.generarIdRubrica(vieja.titulo || vieja.nombre || 'Rúbrica sin nombre'),
            nombre: vieja.titulo || vieja.nombre || 'Rúbrica sin nombre',
            descripcion: vieja.curso || vieja.descripcion || '',
            criterios: (vieja.criterios || []).map((c: any) => ({
              titulo: c.nombre || c.titulo || 'Sin título',
              descripcion: c.descripcion,
              pesoMaximo: c.peso,
              peso: c.peso,
              nivelesDetalle: c.nivelesDetalle || []
            })),
            puntuacionTotal: vieja.puntuacionTotal,
            escalaCalificacion: vieja.escalaCalificacion || [],
            cursosCodigos: vieja.curso ? [vieja.curso] : [],
            fechaCreacion: vieja.fechaCreacion ? new Date(vieja.fechaCreacion) : new Date(),
            fechaModificacion: vieja.fechaModificacion ? new Date(vieja.fechaModificacion) : new Date()
          };

          await this.guardarRubrica(nueva);
          migradas++;
        } catch (error) {
          console.error(`❌ [DataService] Error migrando rúbrica ${viejoId}:`, error);
          errores++;
        }
      }

      localStorage.setItem('rubricas_migrado', 'true');
      localStorage.removeItem('rubricas');

    } catch (error) {
      console.error('❌ [DataService] Error en migración de rúbricas:', error);
      errores++;
    }

    return { migradas, errores };
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
    if (!codigoCurso) return '';

    // Buscar el patrón: letras iniciales antes de "-B" o "-" seguido de número
    // Ejemplos: EPM-B01 -> EPM, SO-B09 -> SO, PROG-B01 -> PROG
    const match = codigoCurso.match(/^([A-Za-z]+)(?:-[Bb]\d|$|-\d)/);
    if (match) {
      return match[1].toUpperCase();
    }

    // Fallback: tomar todo hasta el primer guión
    const primeraParteMatch = codigoCurso.match(/^([A-Za-z]+)/);
    return primeraParteMatch ? primeraParteMatch[1].toUpperCase() : codigoCurso.toUpperCase();
  }

  async loadCursos(): Promise<void> {
    const cursos = await this.storage.get(this.STORAGE_KEYS.CURSOS) || {};
    this.cursosSubject.next(cursos);
  }

  async saveCursos(): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.CURSOS, this.cursosSubject.value);
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
      const cursosOriginales = this.cursosSubject.value;
      const uiStateOriginal = this.uiStateSubject.value;
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
      console.log(`🔍 [crearCurso] Buscando rúbricas de cursos relacionados con código base: "${codigoBase}"`);

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
        console.log(`✅ [crearCurso] Heredando rúbricas del curso relacionado: "${cursoRelacionadoKey}"`, rubricasHeredadas);
      } else {
        console.log('📋 [crearCurso] No se encontraron cursos relacionados con rúbricas, el curso se creará sin asociaciones');
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
      this.cursosSubject.next(cursosActuales);
      this.uiStateSubject.next(uiState);

      console.log('✅ [crearCurso] Curso establecido como activo:', nombreClave);

      // Guardar cambios en storage
      await this.saveCursos();
      await this.saveUIState();

      // Log de éxito
      const rubricasInfo = rubricasHeredadas ? '(con rúbricas heredadas)' : '(sin rúbricas)';
      console.log(
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
      console.error('Error al crear curso:', error);
      throw error;
    }
  }

  async actualizarEstudiantesCurso(codigoCurso: string, estudiantes: any[]): Promise<void> {
    await this.ensureInitialized();

    try {
      const cursosOriginales = this.cursosSubject.value;

      // Validar que el curso existe
      if (!cursosOriginales[codigoCurso]) {
        throw new Error(`No se encontró el curso con código: ${codigoCurso}`);
      }

      // Actualizar estudiantes del curso
      const cursosActualizados = {
        ...cursosOriginales,
        [codigoCurso]: estudiantes
      };

      this.cursosSubject.next(cursosActualizados);
      await this.saveCursos();

      console.log(`✅ Estudiantes actualizados para curso: ${codigoCurso} (${estudiantes.length} estudiantes)`);
    } catch (error) {
      console.error('Error actualizando estudiantes:', error);
      throw error;
    }
  }





  /**
   * Actualiza el nombre completo del curso (metadata)
   * El código único NO cambia, solo el nombre descriptivo
   * @param codigoUnico Código único del curso (EPM-B01-BLQ2-V-20251121)
   * @param nombreNuevo Nuevo nombre completo del curso
   */
  async actualizarNombreCurso(codigoUnico: string, nombreNuevo: string): Promise<void> {
    await this.ensureInitialized();

    const uiStateOriginal = this.uiStateSubject.value;
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

    this.uiStateSubject.next(uiState);
    await this.saveUIState();

    console.log(`✅ Nombre del curso actualizado: "${nombreNuevo}" (${codigoUnico})`);
  }

  /**
   * Elimina un curso completo del sistema
   * @param codigoUnico Código único del curso (EPM-B01-BLQ2-V-20251121)
   */
  async eliminarCurso(codigoUnico: string): Promise<void> {
    await this.ensureInitialized();

    console.log(`🗑️ Eliminando curso: ${codigoUnico}`);

    // 1. ELIMINAR ESTUDIANTES DEL CURSO
    const cursosOriginales = this.cursosSubject.value;
    const { [codigoUnico]: cursoEliminado, ...cursosRestantes } = cursosOriginales;

    if (!cursoEliminado) {
      console.warn(`⚠️ No se encontró el curso ${codigoUnico} en la lista de cursos`);
    }

    this.cursosSubject.next(cursosRestantes);
    await this.saveCursos();
    console.log(`✅ Estudiantes eliminados (${cursoEliminado?.length || 0})`);

    // 2. ELIMINAR COURSE STATE Y METADATA
    try {
      const uiStateOriginal = this.uiStateSubject.value;
      const { [codigoUnico]: courseStateEliminado, ...courseStatesRestantes } = uiStateOriginal.courseStates || {};

      const uiState: UIState = {
        cursoActivo: uiStateOriginal.cursoActivo === codigoUnico ? null : uiStateOriginal.cursoActivo,
        grupoSeguimientoActivo: uiStateOriginal.grupoSeguimientoActivo,
        courseStates: courseStatesRestantes
      };

      this.uiStateSubject.next(uiState);
      await this.saveUIState();
      console.log(`✅ Course state eliminado`);
    } catch (error) {
      console.error('❌ [DataService] Error eliminando course state:', error);
    }

    // 3. ELIMINAR EVALUACIONES DEL CURSO
    try {
      const evaluacionesOriginales = this.evaluacionesSubject.value;
      const evaluacionesRestantes: { [key: string]: Evaluacion } = {};

      // Filtrar evaluaciones que NO pertenecen al curso eliminado
      Object.keys(evaluacionesOriginales).forEach(key => {
        const evaluacion = evaluacionesOriginales[key];
        if (evaluacion.cursoNombre !== codigoUnico) {
          evaluacionesRestantes[key] = evaluacion;
        }
      });

      const evaluacionesEliminadas = Object.keys(evaluacionesOriginales).length - Object.keys(evaluacionesRestantes).length;

      this.evaluacionesSubject.next(evaluacionesRestantes);
      await this.saveEvaluaciones();
      console.log(`✅ Evaluaciones eliminadas (${evaluacionesEliminadas})`);
    } catch (error) {
      console.error('❌ [DataService] Error eliminando evaluaciones:', error);
    }

    console.log(`✅ Curso ${codigoUnico} eliminado completamente`);
  }

  getCursos(): CursoData {
    return this.cursosSubject.value;
  }

  getCurso(nombre: string): Estudiante[] | undefined {
    return this.cursosSubject.value[nombre];
  }

  /**
   * Obtiene el código único del curso desde diferentes identificadores
   * Soporta: código único, código base, nombre completo, nombre abreviado
   * @param identificador Puede ser código único completo, código base, o nombre
   * @returns Código único del curso (EPM-B01-BLQ2-V-20251121)
   */
  getCourseCodeFromNameOrCode(identificador: string): string {
    // 1. Verificar si ya es un código único válido (existe en cursos)
    if (this.cursosSubject.value[identificador]) {
      return identificador;
    }

    // 2. Buscar en courseStates por diferentes campos de metadata
    const currentState = this.uiStateSubject.value;
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
    console.warn(`⚠️ No se encontró curso para identificador: "${identificador}"`);
    return identificador;
  }

  // === GESTIÓN DE EVALUACIONES ===

  async loadEvaluaciones(): Promise<void> {
    const evaluaciones = await this.storage.get(this.STORAGE_KEYS.EVALUACIONES) || {};
    this.evaluacionesSubject.next(evaluaciones);
  }

  async saveEvaluaciones(): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.EVALUACIONES, this.evaluacionesSubject.value);
  }

  async guardarEvaluacion(evaluacion: Evaluacion): Promise<void> {
    // INMUTABILIDAD: Crear copia del objeto evaluaciones actual
    const evaluacionesOriginales = this.evaluacionesSubject.value;
    const key = this.generateEvaluationKey(evaluacion);

    const evaluaciones = {
      ...evaluacionesOriginales,
      [key]: evaluacion
    };

    this.evaluacionesSubject.next(evaluaciones);
    await this.saveEvaluaciones();

    // 🔧 FIX: Actualizar archivo de calificaciones con código normalizado
    const codigoCurso = this.getCourseCodeFromNameOrCode(evaluacion.cursoNombre);
    await this.actualizarArchivoCalificaciones(codigoCurso, evaluacion.entrega);
  }

  async borrarEvaluacion(cursoNombre: string, entrega: string, tipo: string, identificador: string): Promise<void> {
    // 🔧 FIX: Normalizar a código del curso
    const codigoCurso = this.getCourseCodeFromNameOrCode(cursoNombre);

    const evaluacionesOriginales = this.evaluacionesSubject.value;
    const key = `${codigoCurso}_${entrega}_${tipo}_${identificador}`;

    console.log(`🗑️ [borrarEvaluacion] Eliminando evaluación:`, {
      cursoNombreOriginal: cursoNombre,
      codigoNormalizado: codigoCurso,
      key
    });

    // Crear nueva copia sin la evaluación a borrar
    const evaluaciones = { ...evaluacionesOriginales };
    delete evaluaciones[key];

    this.evaluacionesSubject.next(evaluaciones);
    await this.saveEvaluaciones();

    // Actualizar archivo de calificaciones si existe
    await this.actualizarArchivoCalificaciones(cursoNombre, entrega as 'E1' | 'E2' | 'EF');
  }

  getEvaluacion(cursoNombre: string, entrega: string, tipo: string, identificador: string): Evaluacion | undefined {
    const key = `${cursoNombre}_${entrega}_${tipo}_${identificador}`;
    return this.evaluacionesSubject.value[key];
  }

  getAllEvaluaciones(): { [key: string]: Evaluacion } {
    return this.evaluacionesSubject.value;
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

    console.log(`🔑 [generateEvaluationKey]`, {
      cursoNombreOriginal: evaluacion.cursoNombre,
      codigoNormalizado: codigoCurso,
      key
    });

    return key;
  }

  // === GESTIÓN DE UI STATE ===

  async loadUIState(): Promise<void> {

    const uiState = await this.storage.get(this.STORAGE_KEYS.UI_STATE) || { cursoActivo: null, courseStates: {} };

    // Migrar/limpiar archivos Canvas antiguos
    const uiStateMigrado = this.migrarArchivosCanvas(uiState);

    this.uiStateSubject.next(uiStateMigrado);
  }

  /**
   * Migra estructuras antiguas de archivos Canvas a la nueva estructura
   * Elimina propiedades obsoletas y consolida en archivoCalificaciones
   */
  private migrarArchivosCanvas(uiState: UIState): UIState {
    if (!uiState.courseStates) {
      return uiState;
    }

    let cambiosRealizados = false;
    const courseStatesMigrados: { [cursoNombre: string]: CourseState } = {};

    Object.keys(uiState.courseStates).forEach(cursoNombre => {
      const courseState = uiState.courseStates[cursoNombre];
      let courseStateMigrado = { ...courseState };

      // Detectar y migrar archivoCanvas antiguo a archivoCalificaciones
      if ((courseState as any).archivoCanvas && !courseState.archivoCalificaciones) {
        const archivoCanvas = (courseState as any).archivoCanvas;

        console.log(`🔄 [Migración] Detectado archivoCanvas antiguo en curso: ${cursoNombre}`);

        const contenidoCSV = archivoCanvas.contenidoCSV || '';
        courseStateMigrado.archivoCalificaciones = {
          nombre: archivoCanvas.nombreArchivo || 'calificaciones_canvas.csv',
          fechaCarga: archivoCanvas.fechaVinculacion || new Date().toISOString(),
          contenidoOriginal: contenidoCSV,
          calificaciones: this.parsearCalificacionesCanvas(contenidoCSV)
        };

        cambiosRealizados = true;
      }

      // Eliminar propiedad archivoCanvas obsoleta
      if ((courseStateMigrado as any).archivoCanvas) {
        console.log(`🧹 [Limpieza] Eliminando archivoCanvas obsoleto en curso: ${cursoNombre}`);
        delete (courseStateMigrado as any).archivoCanvas;
        cambiosRealizados = true;
      }

      // Validar y limpiar archivoCalificaciones corrupto
      if (courseStateMigrado.archivoCalificaciones) {
        const archivo = courseStateMigrado.archivoCalificaciones;

        // Validar estructura
        if (!archivo.nombre || !archivo.contenidoOriginal || typeof archivo.contenidoOriginal !== 'string') {
          console.warn(`⚠️ [Limpieza] Archivo de calificaciones corrupto en curso: ${cursoNombre}, eliminando...`);
          delete courseStateMigrado.archivoCalificaciones;
          cambiosRealizados = true;
        }
        // Validar que el contenido sea CSV válido
        else if (archivo.contenidoOriginal.trim().length > 0) {
          const lineas = archivo.contenidoOriginal.split('\n');
          if (lineas.length < 2) {
            console.warn(`⚠️ [Limpieza] Archivo CSV inválido (menos de 2 líneas) en curso: ${cursoNombre}, eliminando...`);
            delete courseStateMigrado.archivoCalificaciones;
            cambiosRealizados = true;
          }
        }
      }

      courseStatesMigrados[cursoNombre] = courseStateMigrado;
    });

    if (cambiosRealizados) {
      console.log('✅ [Migración] Archivos Canvas migrados y limpiados exitosamente');
      // Guardar cambios inmediatamente
      setTimeout(() => {
        this.saveUIState().catch(err =>
          console.error('Error guardando UIState migrado:', err)
        );
      }, 100);
    }

    return {
      ...uiState,
      courseStates: courseStatesMigrados
    };
  }

  async saveUIState(): Promise<void> {

    await this.storage.set(this.STORAGE_KEYS.UI_STATE, this.uiStateSubject.value);

  }

  async updateUIState(updates: Partial<UIState>): Promise<void> {
    const currentState = this.uiStateSubject.value;
    const newState = { ...currentState, ...updates };

    this.uiStateSubject.next(newState);
    await this.saveUIState();
  }

  /**
   * Actualiza el CourseState específico de un curso
   * Optimizado: Usa constante DEFAULT_COURSE_STATE, elimina spread operators anidados y logging excesivo
   */
  async updateCourseState(courseCode: string, updates: Partial<CourseState>): Promise<void> {
    const currentState = this.uiStateSubject.value;
    const courseStates = currentState.courseStates || {};
    const currentCourseState = courseStates[courseCode] || this.DEFAULT_COURSE_STATE;

    // Single spread operation - archivoCalificaciones se preserva automáticamente
    const updatedCourseState = { ...currentCourseState, ...updates };

    this.uiStateSubject.next({
      ...currentState,
      courseStates: { ...courseStates, [courseCode]: updatedCourseState }
    });

    await this.saveUIState();
  }

  /**
   * Obtiene el CourseState específico de un curso
   */
  getCourseState(courseCode: string): CourseState | null {
    const currentState = this.uiStateSubject.value;
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
  private parsearCalificacionesCanvas(contenido: string): Array<{
    id: string;
    e1: string;
    e2: string;
    ef: string;
  }> {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 3) {
      return [];
    }

    // Saltar header (línea 0) y "Points Possible" (línea 1)
    const calificaciones = [];
    for (let i = 2; i < lineas.length; i++) {
      const campos = this.parseCSVRow(lineas[i]);

      if (campos.length >= 7) {
        calificaciones.push({
          id: campos[1] || '',   // Campo 1: ID de Canvas (canvasUserId)
          e1: campos[4] || '',   // Campo 4: Entrega proyecto 1 - Escenario 3
          e2: campos[5] || '',   // Campo 5: Entrega proyecto 2 - Escenario 5
          ef: campos[6] || ''    // Campo 6: Entrega final y sustentacion - Escenario 7 y 8
        });
      }
    }

    return calificaciones;
  } async guardarArchivoCalificaciones(codigoCurso: string, nombreArchivo: string, contenido: string): Promise<void> {
    console.log('💾 [DataService.guardarArchivoCalificaciones] Iniciando guardado:', {
      codigoCurso,
      nombreArchivo,
      longitudContenido: contenido.length,
      primerasLineas: contenido.split('\n').slice(0, 2),
      cursoExiste: !!this.getCurso(codigoCurso)
    });

    // Validación: verificar que el curso existe
    if (!this.getCurso(codigoCurso)) {
      console.error('❌ [guardarArchivoCalificaciones] El curso no existe:', codigoCurso);
      throw new Error(`No se puede guardar archivo Canvas: el curso "${codigoCurso}" no existe`);
    }

    const currentState = this.uiStateSubject.value;

    // Buscar el curso en courseStates
    const courseState = currentState.courseStates?.[codigoCurso];

    if (!courseState) {
      console.warn(`No se encontró courseState para ${codigoCurso}, creando uno nuevo`);
    } else {
      console.log('📊 [DataService] CourseState existente encontrado para:', codigoCurso);

      // Si ya existe un archivo, mostrar info
      if (courseState.archivoCalificaciones) {
        console.log('⚠️ [DataService] Se sobrescribirá archivo existente:', {
          nombreAnterior: courseState.archivoCalificaciones.nombre,
          nombreNuevo: nombreArchivo
        });
      }
    }

    // Parsear CSV y extraer campos procesados (ID, E1, E2, EF)
    const calificaciones = this.parsearCalificacionesCanvas(contenido);

    const archivoCalificaciones = {
      nombre: nombreArchivo,
      fechaCarga: new Date().toISOString(),
      contenidoOriginal: contenido,  // CSV completo sin modificar para exportar a Canvas
      calificaciones: calificaciones  // Campos procesados para búsquedas rápidas
    };

    console.log('📋 [DataService] Archivo Canvas guardado:', {
      totalRegistros: calificaciones.length,
      longitudCSV: contenido.length,
      primerRegistro: calificaciones[0]
    });

    const updatedCourseState: CourseState = {
      ...(courseState || this.DEFAULT_COURSE_STATE),
      archivoCalificaciones: archivoCalificaciones
    };

    const newState: UIState = {
      ...currentState,
      courseStates: {
        ...currentState.courseStates,
        [codigoCurso]: updatedCourseState
      }
    };

    console.log('📦 [DataService] Actualizando UIState con nuevo archivo...');
    console.log('🔑 [DataService] Clave del curso:', codigoCurso);
    this.uiStateSubject.next(newState);

    try {
      await this.saveUIState();
      console.log('✅ [DataService] UIState guardado exitosamente');

      // IMPORTANTE: Notificar que las calificaciones Canvas fueron actualizadas
      // Esto invalidará el cache en cursos.page.ts
      this.calificacionesCanvasActualizadasSubject.next({
        curso: codigoCurso,
        timestamp: Date.now()
      });
      console.log('📢 [DataService] Notificación emitida: calificaciones Canvas actualizadas para', codigoCurso);

      // Verificación inmediata
      const verificacion = this.obtenerArchivoCalificaciones(codigoCurso);
      if (verificacion && verificacion.calificaciones.length > 0) {
        console.log('✅ [DataService] Verificación exitosa: archivo guardado correctamente en clave:', codigoCurso);
        console.log('📊 [DataService] Registros procesados:', verificacion.calificaciones.length);
        console.log('📊 [DataService] CSV original:', verificacion.contenidoOriginal.length, 'caracteres');
      } else {
        console.error('❌ [DataService] Error en verificación: sin calificaciones procesadas');
        console.log('🔍 Verificación detallada:', {
          existeArchivo: !!verificacion,
          calificacionesEncontradas: verificacion?.calificaciones.length || 0,
          tieneCSVOriginal: !!verificacion?.contenidoOriginal,
          fechaCargaReal: verificacion?.fechaCarga
        });
      }
    } catch (error) {
      console.error('❌ [DataService] Error guardando UIState:', error);
      throw error;
    }
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
    const now = Date.now();

    // Verificar caché con TTL
    const cached = this.cache.archivosCalificaciones.get(codigoCurso);
    if (cached && (now - cached.timestamp) < this.cache.TTL.archivosCalificaciones) {
      return cached.data;
    }

    // Cache miss o expirado - obtener datos frescos
    const currentState = this.uiStateSubject.value;
    const courseState = currentState.courseStates?.[codigoCurso];
    const resultado = courseState?.archivoCalificaciones || null;

    // Guardar en caché con timestamp
    this.cache.archivosCalificaciones.set(codigoCurso, {
      data: resultado,
      timestamp: now
    });

    return resultado;
  }

  async eliminarArchivoCalificaciones(codigoCurso: string): Promise<void> {
    const currentState = this.uiStateSubject.value;
    const courseState = currentState.courseStates?.[codigoCurso];

    if (!courseState || !courseState.archivoCalificaciones) {
      console.warn(`No hay archivo de calificaciones para eliminar en ${codigoCurso}`);
      return;
    }

    const updatedCourseState: CourseState = {
      ...courseState,
      archivoCalificaciones: undefined
    };

    const newState: UIState = {
      ...currentState,
      courseStates: {
        ...currentState.courseStates,
        [codigoCurso]: updatedCourseState
      }
    };

    this.uiStateSubject.next(newState);
    await this.saveUIState();

  }

  async actualizarArchivoCalificaciones(codigoCurso: string, entrega?: 'E1' | 'E2' | 'EF'): Promise<void> {
    const archivo = this.obtenerArchivoCalificaciones(codigoCurso);
    if (!archivo) {
      console.warn('⚠️ [actualizarArchivoCalificaciones] No hay archivo Canvas asociado al curso:', codigoCurso);
      return; // No hay archivo asociado
    }

    const estudiantes = this.getCurso(codigoCurso);
    if (!estudiantes || estudiantes.length === 0) {
      console.warn('⚠️ [actualizarArchivoCalificaciones] No hay estudiantes en el curso:', codigoCurso);
      return;
    }

    try {
      console.log('📊 [actualizarArchivoCalificaciones] Iniciando actualización:', {
        curso: codigoCurso,
        archivo: archivo.nombre,
        estudiantesTotal: estudiantes.length
      });

      // Parsear CSV Canvas correctamente (maneja commas dentro de comillas)
      const lineas = archivo.contenidoOriginal.split('\n');
      const headers = this.parseCSVRow(lineas[0]);

      console.log('📋 [Canvas Headers]:', headers);

      // Encontrar columnas Canvas específicas
      const indiceEmail = headers.findIndex(h => h.toLowerCase() === 'sis login id');
      const indiceE1 = headers.findIndex(h =>
        h.toLowerCase().includes('entrega proyecto 1') ||
        h.toLowerCase().includes('entrega 1') ||
        h.toLowerCase().includes('escenario 3')
      );
      const indiceE2 = headers.findIndex(h =>
        h.toLowerCase().includes('entrega proyecto 2') ||
        h.toLowerCase().includes('entrega 2') ||
        h.toLowerCase().includes('escenario 5')
      );
      const indiceEF = headers.findIndex(h =>
        h.toLowerCase().includes('entrega final') ||
        h.toLowerCase().includes('escenario 7') ||
        h.toLowerCase().includes('sustentacion')
      );

      console.log('🔍 [Canvas Columnas]:', {
        email: indiceEmail,
        E1: indiceE1,
        E2: indiceE2,
        EF: indiceEF
      });

      // Validar estructura Canvas
      if (indiceEmail === -1) {
        console.error('❌ No se encontró la columna "SIS Login ID" en el archivo Canvas');
        throw new Error('Archivo no parece ser un CSV de Canvas válido. Falta columna "SIS Login ID"');
      }

      if (indiceE1 === -1 && indiceE2 === -1 && indiceEF === -1) {
        console.error('❌ No se encontraron columnas de entregas en el archivo Canvas');
        throw new Error('No se encontraron columnas de entregas (proyecto 1, proyecto 2, final) en el archivo Canvas');
      }

      let estudiantesActualizados = 0;
      let estudiantesNoEncontrados = 0;
      let estudiantesSinCorreo = 0;

      // Actualizar filas de estudiantes
      const filasActualizadas = lineas.map((linea: string, index: number) => {
        if (index <= 1) return linea; // Mantener headers y puntos posibles

        const campos = this.parseCSVRow(linea);
        if (campos.length <= indiceEmail) return linea; // Fila inválida

        // Obtener email desde la columna Canvas específica
        const emailCanvas = campos[indiceEmail]?.trim().toLowerCase() || '';

        // Buscar estudiante por correo (case-insensitive, sin espacios)
        const estudiante = estudiantes.find(est => {
          if (!est.correo) return false;
          const correoLista = est.correo.trim().toLowerCase();
          return correoLista === emailCanvas;
        });

        // 🔧 FIX: Validar que el estudiante tenga correo
        if (estudiante && (!estudiante.correo || estudiante.correo.trim() === '')) {
          console.warn(`⚠️ [Canvas] Estudiante sin correo:`, estudiante);
          estudiantesSinCorreo++;
          return linea; // No actualizar esta fila
        }

        if (!estudiante) {
          console.warn(`👤 Estudiante NO encontrado en lista:`, {
            emailCanvas,
            correosDisponibles: estudiantes.slice(0, 3).map(e => e.correo)
          });
          estudiantesNoEncontrados++;
          return linea;
        }

        // Actualizar calificaciones según la entrega especificada o todas
        const entregas: ('E1' | 'E2' | 'EF')[] = entrega ? [entrega] : ['E1', 'E2', 'EF'];
        let actualizado = false;

        entregas.forEach(ent => {
          const sumatoria = this.calcularSumatoriaEstudiante(codigoCurso, estudiante, ent);

          if (ent === 'E1' && indiceE1 !== -1 && indiceE1 < campos.length) {
            const valorAnterior = campos[indiceE1];
            campos[indiceE1] = sumatoria > 0 ? sumatoria.toString() : '';
            console.log(`📝 E1 ${estudiante.correo}: ${valorAnterior} → ${campos[indiceE1]}`);
            actualizado = true;
          } else if (ent === 'E2' && indiceE2 !== -1 && indiceE2 < campos.length) {
            const valorAnterior = campos[indiceE2];
            campos[indiceE2] = sumatoria > 0 ? sumatoria.toString() : '';
            console.log(`📝 E2 ${estudiante.correo}: ${valorAnterior} → ${campos[indiceE2]}`);
            actualizado = true;
          } else if (ent === 'EF' && indiceEF !== -1 && indiceEF < campos.length) {
            const valorAnterior = campos[indiceEF];
            campos[indiceEF] = sumatoria > 0 ? sumatoria.toString() : '';
            console.log(`📝 EF ${estudiante.correo}: ${valorAnterior} → ${campos[indiceEF]}`);
            actualizado = true;
          }
        });

        if (actualizado) {
          estudiantesActualizados++;
        }

        return this.buildCSVRow(campos);
      });

      // Guardar archivo actualizado
      const contenidoActualizado = filasActualizadas.join('\n');
      await this.guardarArchivoCalificaciones(codigoCurso, archivo.nombre, contenidoActualizado);

      console.log(`✅ [Canvas] Actualización completada:`, {
        curso: codigoCurso,
        estudiantesActualizados,
        estudiantesNoEncontrados,
        estudiantesSinCorreo,
        totalFilas: filasActualizadas.length
      });

      if (estudiantesSinCorreo > 0) {
        console.warn(`⚠️ [Canvas] ${estudiantesSinCorreo} estudiante(s) no tienen correo electrónico y no se actualizaron`);
      }

    } catch (error) {
      console.error('❌ [Canvas] Error actualizando archivo:', error);
      throw error;
    }
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
    const evaluaciones = this.evaluacionesSubject.value;

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

    console.log(`🔍 [calcularSumatoriaEstudiante] ${estudiante.correo} - ${entrega}:`, {
      codigoUsado: codigoCurso,
      pg,
      pi,
      total: pg + pi,
      clavesBuscadas: { pgIndividualKey, pgGrupalKey, piKey }
    });

    return pg + pi;
  }

  getUIState(): UIState {
    return this.uiStateSubject.value;
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
    console.log('🔄 [DataService] Iniciando re-sincronización de todos los archivos Canvas...');

    const uiState = this.uiStateSubject.value;
    const courseStates = uiState.courseStates || {};
    const cursosConArchivos: string[] = [];

    // Identificar cursos con archivos Canvas
    Object.keys(courseStates).forEach(cursoNombre => {
      const courseState = courseStates[cursoNombre];
      if (courseState.archivoCalificaciones) {
        cursosConArchivos.push(cursoNombre);
      }
    });

    console.log(`📊 Encontrados ${cursosConArchivos.length} cursos con archivos Canvas`);

    // Re-sincronizar cada uno
    let exitosos = 0;
    let fallidos = 0;

    for (const cursoNombre of cursosConArchivos) {
      try {
        await this.actualizarArchivoCalificaciones(cursoNombre);
        exitosos++;
        console.log(`✅ Re-sincronizado: ${cursoNombre}`);
      } catch (error) {
        fallidos++;
        console.error(`❌ Error re-sincronizando ${cursoNombre}:`, error);
      }
    }

    console.log(`✅ Re-sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos`);
  }

  /**
   * Limpia archivos Canvas corruptos o inválidos de todos los cursos
   */
  async limpiarArchivosCanvasCorruptos(): Promise<number> {
    console.log('🧹 [DataService] Iniciando limpieza de archivos Canvas corruptos...');

    const uiState = this.uiStateSubject.value;
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
          console.warn(`⚠️ Archivo sin nombre o contenido en: ${cursoNombre}`);
          esInvalido = true;
        } else if (typeof archivo.contenidoOriginal !== 'string') {
          console.warn(`⚠️ Contenido no es string en: ${cursoNombre}`);
          esInvalido = true;
        } else if (archivo.contenidoOriginal.trim().length === 0) {
          console.warn(`⚠️ Contenido vacío en: ${cursoNombre}`);
          esInvalido = true;
        } else {
          const lineas = archivo.contenidoOriginal.split('\n').filter((l: string) => l.trim());
          if (lineas.length < 2) {
            console.warn(`⚠️ CSV inválido (menos de 2 líneas) en: ${cursoNombre}`);
            esInvalido = true;
          }
        }

        if (esInvalido) {
          delete courseState.archivoCalificaciones;
          archivosEliminados++;
          console.log(`🗑️ Eliminado archivo corrupto de: ${cursoNombre}`);
        }
      }

      courseStatesMigrados[cursoNombre] = courseState;
    });

    if (archivosEliminados > 0) {
      const newState: UIState = {
        ...uiState,
        courseStates: courseStatesMigrados
      };

      this.uiStateSubject.next(newState);
      await this.saveUIState();
      console.log(`✅ Limpieza completada: ${archivosEliminados} archivos eliminados`);
    } else {
      console.log('✅ No se encontraron archivos corruptos');
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
    const currentState = this.uiStateSubject.value;
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

    console.log('🔍 === DIAGNÓSTICO DE ARCHIVOS CANVAS ===');
    console.log(`📊 Total archivos Canvas: ${totalArchivos}`);
    console.log(`📊 Total cursos: ${diagnostico.totalCursos}`);
    console.log('\n📁 Detalles:');
    detalles.forEach(d => {
      console.log(`\n  Clave: ${d.claveCurso}`);
      console.log(`  Nombre: ${d.nombreCurso || 'N/A'}`);
      console.log(`  Código: ${d.codigoCurso || 'N/A'}`);
      console.log(`  Archivo: ${d.nombreArchivo}`);
      console.log(`  Tamaño: ${d.tamanoContenido} chars`);
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
    console.log('🔄 === INICIANDO NORMALIZACIÓN DE CLAVES DE CURSO ===');

    const errores: string[] = [];
    const detalles: Array<{
      claveAntigua: string;
      claveNueva: string;
      nombreCurso: string;
      codigoCurso: string;
    }> = [];

    try {
      const currentState = this.uiStateSubject.value;
      const courseStates = currentState.courseStates ? { ...currentState.courseStates } : {};
      const cursosData = { ...this.cursosSubject.value };

      let cambiosRealizados = false;

      // 1. Normalizar courseStates
      console.log('📋 Paso 1: Normalizando claves en courseStates...');
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
          console.log(`  🔀 Migrando: "${claveActual}" → "${codigoCurso}"`);
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
      console.log('📋 Paso 2: Normalizando claves en cursosData...');
      const nuevoCursosData: { [key: string]: any } = {};

      Object.keys(cursosData).forEach(claveActual => {
        const estudiantes = cursosData[claveActual];

        // Buscar el metadata correspondiente
        const courseState = Object.values(nuevoCourseStates).find((cs: any) => {
          return cs.metadata?.codigo === claveActual ||
            cs.metadata?.nombre === claveActual;
        });

        if (!courseState || !courseState.metadata?.codigo) {
          console.warn(`  ⚠️ No se encontró metadata para curso: ${claveActual}`);
          // Mantener la clave actual
          nuevoCursosData[claveActual] = estudiantes;
          return;
        }

        const codigoCurso = courseState.metadata.codigo;

        if (claveActual !== codigoCurso) {
          console.log(`  🔀 Migrando cursosData: "${claveActual}" → "${codigoCurso}"`);
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
            console.log(`  🔀 Actualizando cursoActivo: "${currentState.cursoActivo}" → "${codigoActivo}"`);
            nuevoCursoActivo = codigoActivo;
            cambiosRealizados = true;
          }
        }
      }

      // 4. Guardar cambios si hubo normalizaciones
      if (cambiosRealizados) {
        console.log('💾 Guardando cambios normalizados...');

        // Actualizar UIState
        const nuevoUIState = {
          ...currentState,
          courseStates: nuevoCourseStates,
          cursoActivo: nuevoCursoActivo
        };

        this.uiStateSubject.next(nuevoUIState);
        await this.storage.set(this.STORAGE_KEYS.UI_STATE, nuevoUIState);

        // Actualizar cursosData
        this.cursosSubject.next(nuevoCursosData);
        await this.storage.set(this.STORAGE_KEYS.CURSOS, nuevoCursosData);

        console.log('✅ Normalización completada exitosamente');
      } else {
        console.log('✅ No se requirieron cambios - todas las claves ya usan códigos');
      }

      return {
        exito: true,
        cursosNormalizados: detalles.length,
        errores,
        detalles
      };

    } catch (error) {
      console.error('❌ Error en normalización:', error);
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
    let rubricas = await this.storage.get(this.STORAGE_KEYS.RUBRICAS);

    if (!rubricas) {

      rubricas = {}; // Objeto vacío, sin rúbricas por defecto
      await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);

    } else {

    }

    this.rubricasSubject.next(rubricas);
  }

  getRubrica(id: string): RubricaDefinicion | undefined {
    const rubricas = this.rubricasSubject.value;
    const rubrica = rubricas[id];

    if (!rubrica) {
      console.warn(`⚠️ [DataService.getRubrica] Rúbrica no encontrada con ID: ${id}`);

    }

    return rubrica;
  }

  // === IMPORTACIÓN/EXPORTACIÓN ===

  async exportarDatos(): Promise<void> {
    const backup = this.backupService.createBackup({
      cursos: this.cursosSubject.value,
      evaluaciones: this.evaluacionesSubject.value,
      ui: this.uiStateSubject.value,
      rubricas: this.rubricasSubject.value
    });

    this.backupService.downloadBackup(backup);
  }

  async importarDatos(jsonContent: string): Promise<void> {
    const backup = await this.backupService.parseBackup(jsonContent);

    if (!this.backupService.validateBackup(backup)) {
      throw new Error('Formato de backup inválido');
    }

    // Importar datos
    this.cursosSubject.next(backup.cursos);
    this.evaluacionesSubject.next(backup.evaluaciones);
    this.uiStateSubject.next(backup.ui);
    this.rubricasSubject.next(backup.rubricas);

    // Guardar en storage
    await this.saveCursos();
    await this.saveEvaluaciones();
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
                  console.warn(`  ⚠️ Error eliminando DB: ${db.name}`);
                  resolve(); // Continue even if one fails
                };
              });
            }
          }
        }
      } catch (indexedDBError) {
        console.warn('⚠️ Error limpiando IndexedDB:', indexedDBError);
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
        console.warn('⚠️ Error limpiando WebSQL:', webSQLError);
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
        console.warn('⚠️ Error limpiando Cache API:', cacheError);
      }

      // 7. Resetear subjects con datos limpios

      this.cursosSubject.next({});
      this.evaluacionesSubject.next({});
      this.uiStateSubject.next({
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      });

      // 8. Recargar rúbricas por defecto

      await this.loadRubricas();

      // 9. Limpiar cualquier referencia en memoria

      // Forzar garbage collection si está disponible
      if ('gc' in window) {
        (window as any).gc();
      }


    } catch (error) {
      console.error('❌ Error al borrar datos:', error);
      throw error;
    }
  }

  async borrarCursoEspecifico(nombreCurso: string): Promise<void> {
    await this.ensureInitialized();

    try {

      // INMUTABILIDAD: Obtener datos actuales (sin mutar)
      const cursosOriginales = this.getCursos();
      const evaluacionesOriginales = this.evaluacionesSubject.value;
      const uiStateActual = this.uiStateSubject.value;
      const comentariosOriginales = this.comentariosGrupoSubject.value;
      const rubricasOriginales = this.rubricasSubject.value;

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
      await this.storage.set(this.STORAGE_KEYS.CURSOS, cursosActuales);
      await this.storage.set(this.STORAGE_KEYS.EVALUACIONES, evaluacionesActuales);
      await this.storage.set(this.STORAGE_KEYS.UI_STATE, nuevoUIState);
      await this.storage.set(this.STORAGE_KEYS.COMENTARIOS_GRUPO, comentariosActuales);
      await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricasActualizadas);

      // Actualizar subjects con las copias inmutables
      this.cursosSubject.next(cursosActuales);
      this.evaluacionesSubject.next(evaluacionesActuales);
      this.uiStateSubject.next(nuevoUIState);
      this.comentariosGrupoSubject.next(comentariosActuales);
      this.rubricasSubject.next(rubricasActualizadas);

      const rubricasDesvinculadas = Object.values(rubricasActualizadas).filter(
        (r: RubricaDefinicion) => Object.values(rubricasOriginales).some((orig: RubricaDefinicion) =>
          orig.id === r.id && orig.cursosCodigos?.includes(nombreCurso)
        )
      ).length; console.log(`Curso "${nombreCurso}" eliminado exitosamente`);


    } catch (error) {
      console.error(`Error al borrar curso "${nombreCurso}":`, error);
      throw error;
    }
  }

  // === UTILIDADES ===

  exportarNotasCSV(cursoNombre: string, entrega: 'E1' | 'E2' | 'EF'): void {
    const estudiantes = this.getCurso(cursoNombre);
    if (!estudiantes) return;

    const evaluaciones = this.evaluacionesSubject.value;
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

    const comentarios = await this.storage.get(this.STORAGE_KEYS.COMENTARIOS_GRUPO) || {};

    this.comentariosGrupoSubject.next(comentarios);
  }

  async saveComentariosGrupo(): Promise<void> {

    await this.storage.set(this.STORAGE_KEYS.COMENTARIOS_GRUPO, this.comentariosGrupoSubject.value);
  }

  getComentariosGrupo(cursoId: string, grupo: string): ComentarioGrupo[] {
    const comentarios = this.comentariosGrupoSubject.value;
    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      return [];
    }
    return comentarios[cursoId][grupo];
  }

  async addComentarioGrupo(cursoId: string, grupo: string, comentarioTexto: string, autor?: string, etiquetas?: string[]): Promise<void> {
    await this.ensureInitialized();

    const comentarios = { ...this.comentariosGrupoSubject.value };

    // Inicializar estructura si no existe
    if (!comentarios[cursoId]) {
      comentarios[cursoId] = {};
    }
    if (!comentarios[cursoId][grupo]) {
      comentarios[cursoId][grupo] = [];
    }

    // Crear nuevo comentario
    const nuevoComentario: ComentarioGrupo = {
      id: crypto.randomUUID(),
      cursoId,
      grupo,
      comentario: comentarioTexto,
      fecha: new Date(),
      autor,
      etiquetas
    };

    // Añadir al array
    comentarios[cursoId][grupo] = [...comentarios[cursoId][grupo], nuevoComentario];

    // Actualizar subject y guardar
    this.comentariosGrupoSubject.next(comentarios);
    await this.saveComentariosGrupo();

  }

  async deleteComentarioGrupo(cursoId: string, grupo: string, comentarioId: string): Promise<void> {
    await this.ensureInitialized();

    const comentarios = { ...this.comentariosGrupoSubject.value };

    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      console.warn(`⚠️ [DataService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    // Filtrar el comentario a eliminar
    comentarios[cursoId][grupo] = comentarios[cursoId][grupo].filter(c => c.id !== comentarioId);

    // Actualizar subject y guardar
    this.comentariosGrupoSubject.next(comentarios);
    await this.saveComentariosGrupo();

  }

  async updateComentarioGrupo(cursoId: string, grupo: string, comentarioId: string, nuevoTexto: string): Promise<void> {
    await this.ensureInitialized();

    const comentarios = { ...this.comentariosGrupoSubject.value };

    if (!comentarios[cursoId] || !comentarios[cursoId][grupo]) {
      console.warn(`⚠️ [DataService] No existen comentarios para ${cursoId} - ${grupo}`);
      return;
    }

    // Encontrar y actualizar el comentario
    comentarios[cursoId][grupo] = comentarios[cursoId][grupo].map(c =>
      c.id === comentarioId
        ? { ...c, comentario: nuevoTexto, fecha: new Date() }
        : c
    );

    // Actualizar subject y guardar
    this.comentariosGrupoSubject.next(comentarios);
    await this.saveComentariosGrupo();

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
      const uiState = await this.storage.get(this.STORAGE_KEYS.UI_STATE) || {
        cursoActivo: null,
        courseStates: {}
      };

      // Asegurar que existe el courseState para este curso
      if (!uiState.courseStates) {
        uiState.courseStates = {};
      }

      if (!uiState.courseStates[codigoCurso]) {
        uiState.courseStates[codigoCurso] = {
          metadata: {},
          rubricasAsociadas: {}
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
      this.uiStateSubject.next(uiState);

    } catch (error) {
      console.error('❌ [DataService] Error guardando rúbricas asociadas:', error);
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
      const uiState = await this.storage.get(this.STORAGE_KEYS.UI_STATE) || {
        cursoActivo: null,
        courseStates: {}
      };

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
      console.error('❌ [DataService] Error obteniendo rúbricas asociadas:', error);
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

    console.log(`🔍 [searchAcrossAllCourses] Búsqueda "${term}" encontró ${allResults.length} resultados`);
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
      const cursosAntes = this.cursosSubject.value;
      const rubricasAntes = this.rubricasSubject.value;

      // 1. Limpiar TODOS los cursos y estudiantes
      const cursosVacios: CursoData = {};
      await this.storage.set(this.STORAGE_KEYS.CURSOS, cursosVacios);
      this.cursosSubject.next(cursosVacios);

      // 2. Limpiar todas las evaluaciones
      const evaluacionesVacias: { [key: string]: any } = {};
      await this.storage.set(this.STORAGE_KEYS.EVALUACIONES, evaluacionesVacias);
      this.evaluacionesSubject.next(evaluacionesVacias);

      // 3. Limpiar estados de UI completamente
      const uiStateLimpio: UIState = {
        cursoActivo: null,
        grupoSeguimientoActivo: null,
        courseStates: {}
      };
      await this.storage.set(this.STORAGE_KEYS.UI_STATE, uiStateLimpio);
      this.uiStateSubject.next(uiStateLimpio);

      // 4. Eliminar TODAS las rúbricas
      const rubricasVacias: { [key: string]: RubricaDefinicion } = {};
      await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricasVacias);
      this.rubricasSubject.next(rubricasVacias);

      // LOG: Estado DESPUÉS de limpiar
      const cursosDespues = this.cursosSubject.value;
      const rubricasDespues = this.rubricasSubject.value;

      // 5. Limpiar comentarios de grupo
      const comentariosVacios: ComentariosGrupoData = {};
      await this.storage.set(this.STORAGE_KEYS.COMENTARIOS_GRUPO, comentariosVacios);
      this.comentariosGrupoSubject.next(comentariosVacios);

      // 6. Limpiar datos LEGACY (sistema antiguo)
      try {
        localStorage.removeItem('rubricas'); // Rúbricas del sistema antiguo
        localStorage.removeItem('rubricas_migrado'); // Flag de migración

      } catch (error) {
        console.warn('⚠️ No se pudo limpiar localStorage legacy:', error);
      }















    } catch (error) {
      console.error('❌ [DataService] Error limpiando base de datos:', error);
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

    const cursos = this.cursosSubject.value;
    const rubricas = this.rubricasSubject.value;
    const evaluaciones = this.evaluacionesSubject.value;
    const uiState = this.uiStateSubject.value;

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
    const cursos = this.cursosSubject.value;
    console.group('📚 1. CURSOS (gestorCursosData)');

    Object.entries(cursos).forEach(([nombreCurso, estudiantes]) => {


      if (estudiantes.length > 0) {

      }
    });
    console.groupEnd();

    // 2. UI_STATE
    const uiState = this.uiStateSubject.value;
    console.group('\n🎨 2. UI STATE (appUIState)');



    Object.entries(uiState.courseStates || {}).forEach(([curso, state]) => {







    });
    console.groupEnd();

    // 3. RÚBRICAS
    const rubricas = this.rubricasSubject.value;
    console.group('\n📋 3. RÚBRICAS (rubricDefinitionsData)');

    Object.entries(rubricas).forEach(([id, rubrica]) => {




    });
    console.groupEnd();

    // 4. EVALUACIONES
    const evaluaciones = this.evaluacionesSubject.value;
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
    const comentariosGrupo = this.comentariosGrupoSubject.value;
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
   * Parsea un archivo de texto con formato de rúbrica y devuelve el objeto RubricaDefinicion
   */
  parsearArchivoRubrica(contenidoArchivo: string): RubricaDefinicion | null {
    try {
      const lineas = contenidoArchivo.split('\n').map(linea => linea.trim());
      let lineaActual = 0;

      // Extraer título
      const tituloMatch = lineas[lineaActual].match(/=== (.+) ===/);
      const codigo = tituloMatch ? tituloMatch[1] : 'Rúbrica sin título';

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

      // Extraer curso si existe - ESTE ES EL NOMBRE REAL DEL CURSO
      let curso = '';
      let cursosCodigos: string[] = [];
      if (lineas[lineaActual] && lineas[lineaActual].startsWith('CURSO:')) {
        curso = lineas[lineaActual].split(':')[1].trim();
        cursosCodigos = [curso];
        lineaActual++;
      }

      // Generar nombre de la rúbrica basado en el código (ej: RGE1 -> Rúbrica Grupal Entrega 1)
      // El nombre del curso se guarda por separado en descripcion y cursosCodigos
      const nombre = this.generarNombreDesdeCodigoRubrica(codigo);

      // Extraer tipo de rúbrica (Grupal o Individual)
      let tipoRubrica: 'PG' | 'PI' | undefined = undefined;
      if (lineas[lineaActual] && lineas[lineaActual].startsWith('TIPO:')) {
        const tipoTexto = lineas[lineaActual].split(':')[1].trim().toUpperCase();
        // Detectar por palabras clave: GRUPAL, PG, GRUPO -> PG; INDIVIDUAL, PI, PERSONAL -> PI
        if (tipoTexto.includes('GRUPAL') || tipoTexto === 'PG' || tipoTexto.includes('GRUPO')) {
          tipoRubrica = 'PG';
        } else if (tipoTexto.includes('INDIVIDUAL') || tipoTexto === 'PI' || tipoTexto.includes('PERSONAL')) {
          tipoRubrica = 'PI';
        }
        lineaActual++;
      }

      // Si no se especifica, intentar detectar del nombre
      if (!tipoRubrica) {
        const nombreUpper = nombre.toUpperCase();
        const codigoUpper = codigo.toUpperCase();
        if (nombreUpper.includes('GRUPAL') || nombreUpper.includes('GRUPO') || codigoUpper.includes('RG')) {
          tipoRubrica = 'PG';
        } else if (nombreUpper.includes('INDIVIDUAL') || nombreUpper.includes('PERSONAL') || codigoUpper.includes('RI')) {
          tipoRubrica = 'PI';
        }
      }

      // Extraer puntuación total
      const puntuacionMatch = lineas[lineaActual].match(/PUNTUACIÓN_TOTAL:\s*(\d+)/);
      const puntuacionTotal = puntuacionMatch ? parseInt(puntuacionMatch[1]) : 100;
      lineaActual += 2; // Saltar línea vacía

      // Extraer escala de calificación
      const escalaCalificacion: any[] = [];
      lineaActual++; // Saltar "ESCALA_CALIFICACION:"

      while (lineaActual < lineas.length && lineas[lineaActual] !== '---') {
        const linea = lineas[lineaActual];
        if (linea.includes('|')) {
          const [rango, descripcion] = linea.split('|');
          const rangoParts = rango.trim().split('-');
          escalaCalificacion.push({
            rango: rango.trim(),
            descripcion: descripcion.trim(),
            min: rangoParts.length === 2 ? parseInt(rangoParts[1]) : 0,
            max: rangoParts.length === 2 ? parseInt(rangoParts[0]) : 0
          });
        }
        lineaActual++;
      }

      lineaActual++; // Saltar línea "---"

      // Extraer criterios
      const criterios: any[] = [];

      while (lineaActual < lineas.length && !lineas[lineaActual].includes('=== FIN')) {
        if (lineas[lineaActual].startsWith('CRITERIO_')) {
          const criterio = this.parsearCriterio(lineas, lineaActual);
          criterios.push(criterio.criterio);
          lineaActual = criterio.siguienteLinea;
        } else {
          lineaActual++;
        }
      }

      return {
        id: this.generarIdRubrica(codigo),
        nombre: nombre,
        descripcion: curso || `Rúbrica con ${criterios.length} criterios`,
        criterios,
        puntuacionTotal,
        escalaCalificacion,
        cursosCodigos,
        cursoAsociado: curso, // Nombre legible del curso
        tipoRubrica,
        tipoEntrega: tipoEntregaDetectado,
        fechaCreacion: new Date(),
        fechaModificacion: new Date()
      };
    } catch (error) {
      console.error('Error parseando archivo de rúbrica:', error);
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

    lineaActual += 2; // Saltar línea vacía

    // Extraer niveles de detalle
    const nivelesDetalle: any[] = [];

    while (lineaActual < lineas.length &&
      !lineas[lineaActual].startsWith('CRITERIO_') &&
      !lineas[lineaActual].includes('=== FIN') &&
      !lineas[lineaActual].startsWith('---')) {

      if (lineas[lineaActual].startsWith('NIVEL_')) {
        const nivel = this.parsearNivel(lineas, lineaActual);
        nivelesDetalle.push(nivel.nivel);
        lineaActual = nivel.siguienteLinea;
      } else {
        lineaActual++;
      }
    }

    // Saltar línea "---" si existe
    if (lineaActual < lineas.length && lineas[lineaActual] === '---') {
      lineaActual += 2; // Saltar línea vacía también
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

    // Extraer puntos
    const puntosMatch = lineas[lineaActual].match(/PUNTOS:\s*(.+)/);
    const puntos = puntosMatch ? puntosMatch[1] : '0';
    lineaActual++;

    // Extraer título
    const tituloMatch = lineas[lineaActual].match(/TITULO:\s*(.+)/);
    const titulo = tituloMatch ? tituloMatch[1] : 'Sin título';
    lineaActual++;

    // Extraer descripción
    const descripcionMatch = lineas[lineaActual].match(/DESCRIPCION:\s*(.+)/);
    let descripcion = descripcionMatch ? descripcionMatch[1] : 'Sin descripción';
    lineaActual++;

    // La descripción puede continuar en las siguientes líneas
    while (lineaActual < lineas.length &&
      lineas[lineaActual] !== '' &&
      !lineas[lineaActual].startsWith('NIVEL_') &&
      !lineas[lineaActual].startsWith('CRITERIO_') &&
      !lineas[lineaActual].startsWith('---') &&
      !lineas[lineaActual].includes('=== FIN')) {
      descripcion += ' ' + lineas[lineaActual];
      lineaActual++;
    }

    // Saltar línea vacía si existe
    if (lineaActual < lineas.length && lineas[lineaActual] === '') {
      lineaActual++;
    }

    // Extraer min y max de puntos (puede ser "10" o "10-20")
    let puntosMin = 0;
    let puntosMax = 0;

    if (puntos.includes('-')) {
      const parts = puntos.split('-');
      puntosMin = parseInt(parts[0]);
      puntosMax = parseInt(parts[1]);
    } else {
      puntosMin = parseInt(puntos);
      puntosMax = parseInt(puntos);
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
   * Genera un ID único para una rúbrica basado en su título
   */
  generarIdRubrica(titulo: string): string {
    const base = titulo
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);

    return `${base}-${timestamp}-${random}`;
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
   * Carga el archivo de rúbrica desde el input de archivo
   */
  /**
   * Normaliza texto removiendo tildes y convirtiendo a mayúsculas
   */
  private normalizarTexto(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
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

    console.log('🔍 Buscando curso:', nombreBusqueda);
    console.log('📋 Cursos disponibles:', Object.keys(cursos));

    Object.keys(cursos).forEach(codigo => {
      const metadata = uiState.courseStates?.[codigo]?.metadata;
      const nombreCurso = metadata?.nombre || '';
      const codigoNormalizado = this.normalizarTexto(codigo);

      console.log(`  - Comparando con curso: ${codigo} (${nombreCurso})`);

      // Buscar coincidencia en el nombre del curso
      if (nombreCurso) {
        const nombreCursoNormalizado = this.normalizarTexto(nombreCurso);

        // Buscar coincidencia exacta o parcial en el nombre
        if (nombreCursoNormalizado.includes(nombreNormalizado) ||
          nombreNormalizado.includes(nombreCursoNormalizado)) {
          console.log(`  ✅ Coincidencia encontrada por NOMBRE`);
          codigosEncontrados.push(codigo);
          return;
        }
      }

      // También buscar coincidencia en el código del curso
      if (codigoNormalizado.includes(nombreNormalizado) ||
        nombreNormalizado.includes(codigoNormalizado)) {
        console.log(`  ✅ Coincidencia encontrada por CÓDIGO`);
        codigosEncontrados.push(codigo);
      }
    });

    console.log('✅ Cursos encontrados:', codigosEncontrados);
    return codigosEncontrados;
  }

  async cargarArchivoRubrica(archivo: File): Promise<RubricaDefinicion | null> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();

      lector.onload = (evento) => {
        try {
          const contenido = evento.target?.result as string;
          const rubrica = this.parsearArchivoRubrica(contenido);

          // Verificar si existe al menos un curso coincidente
          // La descripción contiene el nombre del curso del archivo TXT
          if (rubrica && rubrica.descripcion) {
            const cursosEncontrados = this.buscarCursosPorNombre(rubrica.descripcion);

            // Si no se encontraron cursos, rechazar la promesa
            if (cursosEncontrados.length === 0) {
              reject(new Error(`No se encontró ningún curso que coincida con "${rubrica.descripcion}". Debes crear el curso primero.`));
              return;
            }

            // Asignar cursos encontrados
            rubrica.cursosCodigos = cursosEncontrados;
          } else {
            reject(new Error('No se pudo determinar el curso de la rúbrica'));
            return;
          }

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
   */
  async guardarRubrica(rubrica: RubricaDefinicion): Promise<void> {
    const rubricas = this.rubricasSubject.value;

    if (!rubrica.fechaCreacion) {
      rubrica.fechaCreacion = new Date();
    }
    rubrica.fechaModificacion = new Date();

    // LOG DETALLADO antes de guardar

    rubricas[rubrica.id] = rubrica;

    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricasSubject.next(rubricas);

  }

  /**
   * Obtiene todas las rúbricas como array
   */
  obtenerRubricasArray(): RubricaDefinicion[] {
    const rubricas = this.rubricasSubject.value;
    return Object.values(rubricas);
  }

  /**
   * Obtiene los IDs de todas las rúbricas disponibles
   */
  obtenerIdsRubricas(): string[] {
    const rubricas = this.rubricasSubject.value;
    return Object.keys(rubricas);
  }

  /**
   * Obtiene una rúbrica por ID
   */
  obtenerRubricaPorId(id: string): RubricaDefinicion | undefined {
    const rubricas = this.rubricasSubject.value;
    return rubricas[id];
  }

  /**
   * Elimina una rúbrica
   */
  async eliminarRubrica(id: string): Promise<void> {
    const rubricas = this.rubricasSubject.value;

    // LOG: Verificar antes de eliminar
    const rubricaExistente = rubricas[id];

    delete rubricas[id];

    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricasSubject.next(rubricas);

  }

  /**
   * Asocia una rúbrica con cursos específicos y tipo de entrega
   * Actualiza tanto la rúbrica como el CourseState de cada curso
   */
  async asociarRubricaConCursos(rubricaId: string, cursosCodigos: string[], tipoEntrega?: string): Promise<void> {
    const rubricas = this.rubricasSubject.value;
    const rubrica = rubricas[rubricaId];

    if (!rubrica) {
      console.warn(`⚠️ Rúbrica ${rubricaId} no encontrada`);
      return;
    }

    // Actualizar rúbrica
    rubrica.cursosCodigos = cursosCodigos;
    if (tipoEntrega) {
      rubrica.tipoEntrega = tipoEntrega;
    }
    rubrica.fechaModificacion = new Date();

    // Guardar rúbrica actualizada
    await this.storage.set(this.STORAGE_KEYS.RUBRICAS, rubricas);
    this.rubricasSubject.next(rubricas);

    // Actualizar CourseState para cada curso asociado
    if (rubrica.tipoEntrega && rubrica.tipoRubrica) {
      const uiState = this.getUIState();

      for (const codigoCurso of cursosCodigos) {
        if (!uiState.courseStates[codigoCurso]) {
          console.warn(`⚠️ CourseState no encontrado para ${codigoCurso}`);
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

    // Encabezado
    texto += `=== ${rubrica.nombre} ===\n\n`;

    if (rubrica.descripcion) {
      texto += `DESCRIPCIÓN: ${rubrica.descripcion}\n\n`;
    }

    // Puntuación total
    if (rubrica.puntuacionTotal) {
      texto += `PUNTUACIÓN_TOTAL: ${rubrica.puntuacionTotal}\n\n`;
    }

    // Escala de calificación
    if (rubrica.escalaCalificacion && rubrica.escalaCalificacion.length > 0) {
      texto += `ESCALA_CALIFICACION:\n`;
      rubrica.escalaCalificacion.forEach((escala: EscalaCalificacion) => {
        texto += `${escala.rango} | ${escala.descripcion}\n`;
      });
      texto += `\n`;
    }

    // Criterios
    rubrica.criterios.forEach((criterio: CriterioRubrica, index: number) => {
      texto += `---\n`;
      texto += `CRITERIO_${index + 1}: ${criterio.titulo}\n`;

      if (criterio.descripcion) {
        texto += `DESCRIPCIÓN: ${criterio.descripcion}\n`;
      }

      if (criterio.peso !== undefined) {
        texto += `PESO: ${criterio.peso}\n`;
      } else if (criterio.pesoMaximo !== undefined) {
        texto += `PESO: ${criterio.pesoMaximo}\n`;
      }

      // Niveles detallados (único formato soportado)
      if (criterio.nivelesDetalle && criterio.nivelesDetalle.length > 0) {
        texto += `NIVELES: ${criterio.nivelesDetalle.length}\n`;

        criterio.nivelesDetalle.forEach((nivel: NivelRubricaDetallado, nivelIndex: number) => {
          texto += `\nNIVEL_${nivelIndex + 1}:\n`;
          texto += `PUNTOS: ${nivel.puntos}\n`;
          texto += `TITULO: ${nivel.titulo}\n`;
          if (nivel.descripcion) {
            texto += `DESCRIPCION: ${nivel.descripcion}\n`;
          }
        });
      }

      texto += `\n`;
    });

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
}




