import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Logger } from '@app/core/utils/logger';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonChip,
  IonPopover,
  IonFab,
  IonFabButton,
  IonFabList,
  IonItem,
  IonBadge,
  IonText,
  MenuController,
  AlertController,
  LoadingController,
  PopoverController,
  ModalController,
  GestureController,
  ViewWillEnter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline,
  personOutline,
  downloadOutline,
  createOutline,
  chatboxOutline,
  refreshOutline,
  closeOutline,
  save,
  saveOutline,
  documentTextOutline,
  analyticsOutline,
  addCircleOutline,
  chatbubblesOutline,
  trashOutline,
  pencilOutline,
  checkmarkOutline,
  closeCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  copyOutline,
  checkmarkCircle,
  people,
  person,
  layersOutline,
  add,
  ellipsisVerticalOutline,
  ellipsisVertical,
  arrowForwardOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  arrowUndoOutline,
  arrowRedoOutline,
  peopleOutline,
  linkOutline,
  cloudUploadOutline,
  eyeOutline,
  informationCircleOutline,
  notificationsOutline,
  checkmarkDoneOutline,
  timeOutline,
  cubeOutline,
  alertCircleOutline,
  clipboardOutline,
  documentOutline,
  trophyOutline,
  personCircleOutline,
  listOutline,
  enterOutline,
  logIn,
  // Iconos filled nuevos
  documentText,
  eye,
  arrowForward,
  informationCircle,
  alertCircle, scanOutline, lockClosed, lockOpen, rocket, peopleCircle, gitMerge, closeCircle, library, hourglassOutline, home, schoolOutline, book, grid, speedometer } from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { SeguimientoService, EvaluacionRubrica, CriterioEvaluado, EstadoEstudiante } from '../../services/seguimiento.service';
import { ToastService } from '../../services/toast.service';
import { Estudiante, CursoData, RubricaDefinicion, Evaluacion, EvaluacionCriterio } from '../../models';
import { EvaluacionRubricaComponent } from '../../components/evaluacion-rubrica/evaluacion-rubrica.component';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonChip,
    IonPopover,
    IonFab,
    IonFabButton,
    IonFabList,
    IonItem,
    IonBadge,
    IonText,
    EvaluacionRubricaComponent
  ]
})
export class InicioPage implements OnInit, OnDestroy {
  cursosData: CursoData = {};
  cursoActivo: string | null = null;
  // Variables de estado
  estudiantesActuales: Estudiante[] = [];
  estudiantesFiltrados: Estudiante[] = [];
  filtroGrupo: string = 'todos';
  busquedaGeneral: string = '';
  gruposDisponibles: string[] = [];
  estudianteSeleccionado: string | null = null;

  // Cache: trackear si los estudiantes del curso ya fueron cargados
  private _estudiantesCargadosPorCurso: Map<string, boolean> = new Map();
  private _calificacionesCargadasPorCurso: Map<string, boolean> = new Map();

  // Flag para evitar loops infinitos en sincronización de grupo
  private actualizandoGrupoDesdeSuscripcion = false;
  estudiantesSeleccionados: Set<string> = new Set();
  mostrarNombreCorto: boolean = false; // Controla si se muestra nombre corto o nombre completo en los botones de curso
  mostrarComentarios: boolean = false; // Controla visibilidad de la sección de comentarios (colapsada por defecto)
  menuAccionesAbierto: boolean = false; // Controla si el menú lateral de acciones está abierto (móvil)
  menuFabAbierto: boolean = false; // Controla el menú FAB flotante en móvil portrait

  // Propiedades para drag and drop de cursos
  cursosOrdenados: string[] = []; // Array ordenado de cursos para mantener el orden personalizado
  elementoArrastrado: string | null = null; // Curso que se está arrastrando
  indiceDragDestino: number = -1; // Índice donde se va a soltar el elemento

  // Propiedades para la rúbrica en el panel
  mostrarRubrica: boolean = false;
  rubricaActual: RubricaDefinicion | null = null;
  evaluacionActual: Evaluacion | null = null;
  entregaEvaluando: 'E1' | 'E2' | 'EF' | null = null;
  tipoEvaluando: 'PG' | 'PI' | null = null;
  criteriosEvaluados: EvaluacionCriterio[] = [];
  puntosRubricaTotales: number = 0;
  rubricaGrupoSeleccionada: string | null = null; // Persiste la rúbrica por grupo
  modoEdicionRubrica: boolean = false; // Controla si está en modo edición

  // Nuevas propiedades para navegación de criterios
  criterioActualIndex: number = 0;
  textoSeguimientoRubricaGrupal: string[] = []; // Array de párrafos para PG (evaluación grupal)
  textoSeguimientoRubricaIndividual: string[] = []; // Array de párrafos para PI (evaluación individual)
  timestampsSeguimiento: string[] = []; // Array de timestamps por criterio (solo referencia visual)
  puntosPersonalizados: { [key: number]: number } = {}; // Puntos personalizados por criterio
  comentariosCriterios: { [key: number]: string } = {}; // Comentarios por criterio
  nivelesSeleccionados: { [key: number]: string } = {}; // Título del nivel seleccionado por criterio

  // Propiedades para cambio de color de curso
  menuColorVisible: boolean = false;
  cursoParaCambiarColor: string | null = null;
  colorSeleccionado: string | null = null;
  colorPopoverEvent: Event | null = null;
  isApplyingColor: boolean = false; // Estado de loading al aplicar color

  // Modo de selección de encabezado de grupo en la matriz
  // true = mantener en vista matriz (solo mostrar integrantes en panel seguimiento)
  // false = navegar a detalles del grupo
  modoMantenerVistaMatriz: boolean = true;

  // === ESTADOS DE ESTUDIANTES (Ok/Solo/Ausente) ===
  // Los estados se manejan a través del SeguimientoService para compartir con tabs.page
  modoSeleccionEstado: 'ok' | 'solo' | 'ausente' | null = null;
  anotacionesGrupo: string = ''; // Texto de anotaciones del grupo actual

  coloresDisponibles: string[] = [
    '#d32f2f', // Rojo
    '#c2185b', // Rosa oscuro
    '#7b1fa2', // Púrpura
    '#512da8', // Púrpura oscuro
    '#303f9f', // Índigo
    '#1976d2', // Azul
    '#0288d1', // Azul claro
    '#0097a7', // Cian
    '#00796b', // Verde azulado
    '#388e3c', // Verde
    '#689f38', // Verde lima
    '#f57c00', // Naranja
    '#e64a19', // Naranja oscuro
    '#ff2719'  // Rojo brillante (como en la imagen)
  ];

  comentariosFrecuentes: string[] = [
    'Excelente trabajo, supera las expectativas',
    'Buen trabajo, cumple con los requisitos',
    'Necesita mejorar en algunos aspectos',
    'Requiere trabajo adicional',
    'Consultar con el profesor',
    'Presenta creatividad e innovación',
    'Demuestra comprensión profunda del tema',
    'Cumple parcialmente con los requisitos',
    'No cumple con los criterios establecidos',
    'Evidencia falta de preparación',
    'Muestra progreso significativo',
    'Requiere revisión y corrección',
    'Aplicación correcta de conceptos',
    'Faltan elementos importantes',
    'Trabajo sobresaliente en esta área'
  ];

  // Getter para obtener el array de seguimiento correcto según el tipo de evaluación
  get textoSeguimientoRubrica(): string[] {
    return this.tipoEvaluando === 'PG' ? this.textoSeguimientoRubricaGrupal : this.textoSeguimientoRubricaIndividual;
  }

  set textoSeguimientoRubrica(value: string[]) {
    if (this.tipoEvaluando === 'PG') {
      this.textoSeguimientoRubricaGrupal = value;
    } else {
      this.textoSeguimientoRubricaIndividual = value;
    }
  }

  // Getters para verificar si hay comentarios de cada tipo
  get tieneComentariosGrupales(): boolean {
    return this.textoSeguimientoRubricaGrupal.length > 0 && this.textoSeguimientoRubricaGrupal.some(t => t);
  }

  get tieneComentariosIndividuales(): boolean {
    return this.textoSeguimientoRubricaIndividual.length > 0 && this.textoSeguimientoRubricaIndividual.some(t => t);
  }

  // Propiedades para panel de seguimiento
  grupoSeguimientoActivo: string | null = null;

  // Cache de evaluaciones por subgrupo con TTL
  private evaluacionesCache = new Map<string, {
    grupal?: any;
    individual?: any;
    timestamp: number;
  }>();
  private readonly CACHE_TTL = 30000; // 30 segundos

  // Caché de calificaciones Canvas optimizado
  private cacheCalificacionesCanvas = new Map<string, Map<string, number>>();

  // Propiedades para comentarios de grupo
  nuevoComentario: string = '';
  comentariosGrupoActual: any[] = [];
  comentarioEditando: string | null = null;
  textoEditando: string = '';

  // Propiedades para edición directa de puntajes eliminadas (tabla removida)

  // Propiedades para "Aplicar a Todos" en rúbricas
  aplicarATodos: boolean = false; // Checkbox para aplicar nivel a todos los criterios
  aplicarAMas: boolean = false; // Checkbox para aplicar PI a otros estudiantes seleccionados

  // Guardia para evitar llamadas redundantes a aplicarFiltros
  private lastAppliedFilter = {
    cursoActivo: '',
    filtroGrupo: '',
    busquedaGeneral: '',
    estudiantesCount: 0
  };

  // Categoría de rúbricas por defecto (configurable según el contexto)
  private readonly CATEGORIA_RUBRICAS_DEFAULT = 'epm';

  /**
   * Genera un código basado en las iniciales del nombre del curso
   * Regla: Excluye preposiciones y palabras cortas (≤2 chars), normaliza tildes
   * Ejemplo: "Énfasis en Programación Móvil" -> "EPM" (omite "en", normaliza É→E)
   */
  private generarCodigoCurso(nombreCurso: string): string {
    // Lista de preposiciones a excluir
    const preposiciones = ['DE', 'EN', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'A', 'CON', 'PARA', 'POR', 'Y'];

    // Función para normalizar texto (quitar tildes y convertir a mayúsculas)
    const normalizarTexto = (texto: string): string => {
      return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    };

    return nombreCurso
      .split(/\s+/) // Separar por espacios
      .filter(palabra => palabra.length > 2) // Solo palabras con más de 2 caracteres
      .map(palabra => normalizarTexto(palabra)) // Normalizar cada palabra
      .filter(palabra => !preposiciones.includes(palabra)) // Excluir preposiciones
      .map(palabra => palabra[0]) // Tomar primera letra
      .join(''); // Unir todas las iniciales
  }

  // Propiedades para el panel redimensionable
  anchoPanel: number = 455; // Aumentado 30%: de 350px a 455px
  redimensionandoPanel: boolean = false;
  anchoMinimo: number = 250;
  anchoMaximo: number = 650; // Aumentado 30%: de 500px a 650px

  // Caché para integrantes del grupo actual
  private _integrantesGrupoCache: Estudiante[] | null = null;
  private _filtroGrupoCache: string | null = null;

  // Caché para calificaciones del panel
  private _calificacionesPanelCache = new Map<string, number | null>();

  private subscriptions: Subscription[] = [];

  private dataService = inject(DataService);
  private menuController = inject(MenuController);
  private alertController = inject(AlertController);
  private seguimientoService = inject(SeguimientoService);
  private toastService = inject(ToastService);
  private loadingController = inject(LoadingController);
  private popoverController = inject(PopoverController);
  private gestureCtrl = inject(GestureController);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    addIcons({ellipsisVerticalOutline,arrowBackOutline,arrowForwardOutline,home,ellipsisVertical,closeOutline,checkmarkCircle,hourglassOutline,library,speedometer,informationCircle,peopleCircle,rocket,saveOutline,documentTextOutline,createOutline,gitMerge,closeCircle,trashOutline,alertCircle,book,grid,schoolOutline,clipboardOutline,documentText,checkmarkOutline,people,arrowForward,lockClosed,lockOpen,scanOutline,enterOutline,eye,logIn,eyeOutline,informationCircleOutline,alertCircleOutline,listOutline,copyOutline,personOutline,analyticsOutline,checkmarkCircleOutline,cubeOutline,timeOutline,peopleOutline,documentOutline,trophyOutline,personCircleOutline,arrowUndoOutline,arrowRedoOutline,chevronBackOutline,chevronForwardOutline,notificationsOutline,checkmarkDoneOutline,linkOutline,downloadOutline,cloudUploadOutline,refreshOutline,addCircleOutline,chatbubblesOutline,closeCircleOutline,pencilOutline,person,layersOutline,menuOutline,save,chatboxOutline,add});

    // Cargar el orden personalizado de cursos
    this.cargarOrdenCursos();
  }

  async ngOnInit() {
    // Asegurar que DataService esté inicializado
    await this.dataService.ensureInitialized();

    // Cargar comentarios frecuentes guardados
    this.cargarComentariosFrecuentes();

    // Los atajos de teclado ahora se manejan automáticamente con @HostListener

    this.subscriptions.push(
      this.dataService.cursos$.pipe(
        distinctUntilChanged((prev, curr) => {
          const prevKeys = Object.keys(prev).sort();
          const currKeys = Object.keys(curr).sort();

          // Comparar claves
          if (prevKeys.length !== currKeys.length) return false;
          if (prevKeys.join() !== currKeys.join()) return false;

          // Comparar longitud de arrays de estudiantes
          for (const key of prevKeys) {
            const prevLength = Array.isArray(prev[key]) ? prev[key].length : 0;
            const currLength = Array.isArray(curr[key]) ? curr[key].length : 0;
            if (prevLength !== currLength) return false;
          }

          return true; // Son iguales, NO emitir
        })
      ).subscribe(cursos => {
        const totalCursos = Object.keys(cursos).length;
        const totalEstudiantes = Object.values(cursos).reduce((sum: number, estudiantes: any) =>
          sum + (Array.isArray(estudiantes) ? estudiantes.length : 0), 0);

        Logger.log(`📚[cursos$.subscribe] ${new Date().toISOString().substr(11, 12)} `, {
          totalCursos,
          totalEstudiantes,
          cursos: Object.keys(cursos)
        });

        this.cursosData = cursos;

        // Actualizar cursosOrdenados cuando cambian los cursos disponibles
        const cursosActuales = Object.keys(cursos);
        if (this.cursosOrdenados.length !== cursosActuales.length) {
          Logger.log(`🔄 Actualizando cursosOrdenados: ${this.cursosOrdenados.length} -> ${cursosActuales.length}`);
          this.cursosOrdenados = [...cursosActuales].sort();
        }

        // Si el curso activo fue eliminado, limpiar estado
        if (this.cursoActivo && !cursos[this.cursoActivo]) {
          Logger.log('⚠️ [InicioPage] Curso activo eliminado:', this.cursoActivo);
          this.cursoActivo = null;
          this.estudiantesActuales = [];
          this.gruposDisponibles = [];
          this.aplicarFiltros();
        }

        this.cdr.detectChanges();
      })
    );

    // Suscribirse a cambios en el estado de UI (incluyendo cursoActivo)
    this.subscriptions.push(
      this.dataService.uiState$.pipe(
        distinctUntilChanged((prev, curr) => {
          // Solo emitir si cambió el curso activo
          return prev.cursoActivo === curr.cursoActivo;
        })
      ).subscribe(uiState => {
        // Si cambió el curso activo, cargar sus estudiantes
        if (uiState.cursoActivo && uiState.cursoActivo !== this.cursoActivo) {
          Logger.log(`🔄[uiState$.subscribe] Curso activo cambió a:`, uiState.cursoActivo);

          // Asegurar que cursosData esté actualizado antes de seleccionar
          const cursosActuales = this.dataService.getCursos();
          if (Object.keys(cursosActuales).length > Object.keys(this.cursosData).length) {
            Logger.log(`📥 Actualizando cursosData desde DataService`);
            this.cursosData = cursosActuales;
          }

          this.seleccionarCurso(uiState.cursoActivo);
        }
      })
    );

    // Suscribirse a búsqueda global
    this.subscriptions.push(
      this.dataService.globalSearch$.pipe(
        distinctUntilChanged(), // Evita duplicados
        debounceTime(50)        // Pequeño debounce adicional
      ).subscribe(searchTerm => {
        this.busquedaGeneral = searchTerm;
        this.aplicarFiltros();
        this.cdr.detectChanges();
      })
    );

    // Suscribirse a cambios de grupo desde el panel de seguimiento
    this.subscriptions.push(
      this.seguimientoService.grupoSeleccionado$.pipe(
        distinctUntilChanged(), // Solo emite si grupo cambió
        debounceTime(100)       // Agrupa cambios rápidos
      ).subscribe(grupoNum => {
        // Evitar loop infinito
        if (this.actualizandoGrupoDesdeSuscripcion) return;

        this.actualizandoGrupoDesdeSuscripcion = true;

        if (grupoNum === 0) {
          this.filtroGrupo = 'todos';
          this.grupoSeguimientoActivo = null;
        } else {
          // gruposDisponibles tiene formato "1", "2", "3" (sin prefijo "G")
          const grupoNumStr = grupoNum.toString();
          // Validar si el grupo existe antes de aplicar el filtro
          if (this.gruposDisponibles.length === 0 || this.gruposDisponibles.includes(grupoNumStr)) {
            // Usar solo el número para coincidir con est.grupo y gruposDisponibles
            this.filtroGrupo = grupoNumStr;
            this.grupoSeguimientoActivo = grupoNumStr;
          } else {
            Logger.warn('⚠️ Grupo no encontrado en gruposDisponibles:', grupoNum, 'disponibles:', this.gruposDisponibles);
          }
        }

        this.aplicarFiltros();
        this.cdr.detectChanges();
        this.actualizandoGrupoDesdeSuscripcion = false;
      })
    );

    // Suscribirse a actualizaciones de calificaciones Canvas
    // Cuando se cargan nuevas calificaciones, invalidar el cache
    this.subscriptions.push(
      this.dataService.calificacionesCanvasActualizadas$.subscribe(evento => {
        if (evento && evento.curso) {
          Logger.log('📢 [cursos.page] Recibida notificación: calificaciones actualizadas para', evento.curso);

          // Invalidar cache de calificaciones para este curso
          this._calificacionesCargadasPorCurso.delete(evento.curso);

          // Si es el curso activo, recargar calificaciones
          if (this.cursoActivo === evento.curso) {
            Logger.log('🔄 [cursos.page] Recargando calificaciones del curso activo');
            this.limpiarCacheCalificaciones();
            this.precargarCalificacionesCurso();
            this._calificacionesCargadasPorCurso.set(evento.curso, true);
            this.cdr.detectChanges();
          }
        }
      })
    );

    // Escuchar evento de apertura de rúbrica desde el sidebar
    window.addEventListener('abrirRubrica', ((event: CustomEvent) => {
      const { entrega, tipo } = event.detail;
      this.abrirRubricaEntrega(entrega, tipo);
    }) as EventListener);

    // Restaurar estado de UI (preferencias y curso activo)
    const uiState = this.dataService.getUIState();

    // Restaurar preferencia de mostrar nombre corto
    if (uiState.mostrarNombreCorto !== undefined) {
      this.mostrarNombreCorto = uiState.mostrarNombreCorto;
    }

    // NOTA: NO cargar curso aquí - ionViewWillEnter() lo manejará
    // Esto evita cargas duplicadas en la primera inicialización
  }

  async cargarDatosIniciales() {
    await this.dataService.loadCursos();
    this.cursosData = this.dataService.getCursos();

    // Sincronizar UI si hay curso activo
    const uiState = this.dataService.getUIState();
    if (uiState.cursoActivo && this.cursosData[uiState.cursoActivo]) {
      this.seleccionarCurso(uiState.cursoActivo);
    }
  }

  async ionViewWillEnter() {
    // Sincronizar con el estado global
    const uiState = this.dataService.getUIState();
    const cursoActivo = uiState.cursoActivo;
    const tieneCursoActivo = !!cursoActivo;
    const existeEnData = cursoActivo ? !!this.cursosData[cursoActivo] : false;

    // CASO 1: Servicio vacío (F5 o primer inicio) -> Recargar todo
    if (Object.keys(this.cursosData).length === 0) {
      this.cargarDatosIniciales();
      return;
    }

    // CASO 2: Data existe, tenemos curso activo pero no está en memoria local -> Sincronizar
    if (tieneCursoActivo && !existeEnData) {
      this.cargarDatosIniciales();
      return;
    }

    // CASO 3: Mismo curso pero sin estudiantes en vista -> Restaurar estado
    if (tieneCursoActivo && existeEnData) {
      if (this.estudiantesActuales.length === 0) {
        this.seleccionarCurso(uiState.cursoActivo!);
        return;
      }

      // CASO 4: Mismo curso con datos - solo aplicar filtros (sin recargar)
      this.aplicarFiltros();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Estilos reactivos para el layout grid
   * Se actualizan automáticamente al cambiar anchoPanel
   */
  get layoutStyles() {
    return {
      'grid-template-columns': `1fr 4px ${this.anchoPanel}px`
    };
  }

  openMenu() {
    this.menuController.open('main-menu');
  }

  get cursosDisponibles(): string[] {
    const cursos = Object.keys(this.cursosData);

    // Si no hay orden personalizado, inicializar
    if (this.cursosOrdenados.length === 0 || this.cursosOrdenados.length !== cursos.length) {
      this.cursosOrdenados = [...cursos].sort();
    }

    // Asegurar que todos los cursos estén en el array ordenado
    cursos.forEach(curso => {
      if (!this.cursosOrdenados.includes(curso)) {
        this.cursosOrdenados.push(curso);
      }
    });

    // Remover cursos que ya no existen
    this.cursosOrdenados = this.cursosOrdenados.filter(curso => cursos.includes(curso));

    return this.cursosOrdenados;
  }

  onCursoChange(event: any) {
    const valor = event.detail.value;
    // Solo seleccionar si realmente cambió el valor
    if (valor && valor !== this.cursoActivo) {
      this.seleccionarCurso(valor);
    }
  }

  async seleccionarCurso(nombreCurso: string) {
    const timestamp = new Date().toISOString().substr(11, 12);
    // OPTIMIZACIÓN CRÍTICA: Si el curso ya está activo, no hacer nada
    if (this.cursoActivo === nombreCurso &&
      this._estudiantesCargadosPorCurso.has(nombreCurso) &&
      this.estudiantesActuales.length > 0) {
      return;
    }

    this.cursoActivo = nombreCurso;

    // OPTIMIZACIÓN: Solo cargar estudiantes si no están en cache o si hay cambios
    const estudiantesNuevos = this.cursosData[nombreCurso] || [];
    const estudiantesPrevios = this.estudiantesActuales.length;
    const cambiaronEstudiantes = estudiantesPrevios !== estudiantesNuevos.length;

    if (!this._estudiantesCargadosPorCurso.has(nombreCurso) || cambiaronEstudiantes) {
      this.estudiantesActuales = estudiantesNuevos;
      this._estudiantesCargadosPorCurso.set(nombreCurso, true);
    }

    this.estudiantesSeleccionados.clear();
    this.estudianteSeleccionado = null;

    // Actualizar grupos disponibles
    this.actualizarGrupos();

    // Pre-cargar calificaciones solo si no están en cache
    if (!this._calificacionesCargadasPorCurso.has(nombreCurso)) {
      this.precargarCalificacionesCurso();
      this._calificacionesCargadasPorCurso.set(nombreCurso, true);
    }

    // Obtener CourseState una sola vez para restaurar grupo y entrega
    const courseState = this.dataService.getCourseState(nombreCurso);

    // Restaurar grupo desde CourseState específico de este curso
    if (courseState?.filtroGrupo && courseState.filtroGrupo !== 'todos' &&
      this.gruposDisponibles.includes(courseState.filtroGrupo)) {

      // 🛡️ GUARDIA: Solo restaurar si es diferente al actual
      if (this.filtroGrupo !== courseState.filtroGrupo) {
        // Restaurar el último grupo seleccionado para este curso
        this.grupoSeguimientoActivo = courseState.filtroGrupo;
        this.filtroGrupo = courseState.filtroGrupo;

        // Sincronizar con el servicio de seguimiento
        const grupoNum = parseInt(courseState.filtroGrupo.replace(/\D/g, ''));
        this.seguimientoService.setGrupoSeleccionado(grupoNum);
      }
    } else {
      // Resetear filtro si no hay grupo guardado o no existe en este curso
      this.grupoSeguimientoActivo = null;
      this.filtroGrupo = 'todos';
      this.seguimientoService.setGrupoSeleccionado(0);
    }

    this.aplicarFiltros();

    // Guardar en UI state
    this.dataService.updateUIState({ cursoActivo: nombreCurso });

    // Limpiar estado de entrega
    this.entregaEvaluando = null;
    this.tipoEvaluando = null;
    this.limpiarPanelSeguimiento();

    // OPTIMIZACIÓN: Solo forzar detección de cambios si realmente hubo un cambio de curso
    this.cdr.detectChanges();
  }

  private actualizarGrupos() {
    const grupos = [...new Set(this.estudiantesActuales.map(est => est.grupo))];
    // Ordenar grupos numéricamente (formato: "1", "2", "3", etc.)
    this.gruposDisponibles = grupos.sort((a, b) => {
      const numeroA = parseInt(a) || 0;
      const numeroB = parseInt(b) || 0;
      return numeroA - numeroB;
    });
  }

  aplicarFiltros() {
    // 🛡️ GUARDIA: Evitar ejecución si parámetros no cambiaron
    const currentState = {
      cursoActivo: this.cursoActivo || '',
      filtroGrupo: this.filtroGrupo,
      busquedaGeneral: this.busquedaGeneral,
      estudiantesCount: this.estudiantesActuales.length
    };

    const stateKey = JSON.stringify(currentState);
    const lastStateKey = JSON.stringify(this.lastAppliedFilter);

    if (stateKey === lastStateKey) {
      return;
    }

    this.lastAppliedFilter = currentState;

    // 🚨 CRITICAL FIX: Si estudiantesActuales está vacío pero hay curso activo, cargar datos
    if (this.estudiantesActuales.length === 0 && this.cursoActivo && this.cursosData[this.cursoActivo]) {
      Logger.warn('⚠️ [aplicarFiltros] EMERGENCIA: cargando desde cursosData');
      this.estudiantesActuales = this.cursosData[this.cursoActivo];
      this._estudiantesCargadosPorCurso.set(this.cursoActivo, true);
      this.actualizarGrupos();
    }

    const inicioLength = this.estudiantesActuales.length;
    let resultado = [...this.estudiantesActuales];

    // Filtro por grupo - incluye filtro desde seguimientoService
    const grupoSeguimiento = this.seguimientoService.getGrupoSeleccionado();
    const filtroEfectivo = this.filtroGrupo !== 'todos' ? this.filtroGrupo :
      (grupoSeguimiento > 0 ? `${grupoSeguimiento} ` : null);

    if (filtroEfectivo && filtroEfectivo !== 'todos') {
      // Extraer solo el número del grupo para comparación consistente
      const numeroGrupo = filtroEfectivo.toString().replace(/\D/g, '');
      resultado = resultado.filter(est => est.grupo === numeroGrupo);
    }

    // Filtro por búsqueda general
    if (this.busquedaGeneral.trim()) {
      const busqueda = this.busquedaGeneral.toLowerCase();
      resultado = resultado.filter(est =>
        est.nombres.toLowerCase().includes(busqueda) ||
        est.apellidos.toLowerCase().includes(busqueda) ||
        est.correo.toLowerCase().includes(busqueda)
      );
    }

    // Ordenamiento por grupos
    resultado = this.ordenarPorGrupos(resultado);

    // OPTIMIZACIÓN: Solo actualizar si realmente cambió el resultado
    // Esto evita re-renders innecesarios cuando se navega entre páginas
    const cambio = resultado.length !== this.estudiantesFiltrados.length ||
      !resultado.every((est, i) => est.correo === this.estudiantesFiltrados[i]?.correo);

    if (cambio) {
      this.estudiantesFiltrados = resultado;
    }
  }

  /**
   * Ordena los estudiantes por grupo (subgrupo) de forma ascendente
   */
  ordenarPorGrupos(estudiantes: Estudiante[]): Estudiante[] {
    return estudiantes.sort((a, b) => {
      const numA = parseInt(a.grupo.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.grupo.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }



  onFiltroGrupoChange(event: any) {
    const nuevoGrupo = event.detail.value;

    // 🛡️ GUARDIA: No hacer nada si es el mismo grupo
    if (this.filtroGrupo === nuevoGrupo) {
      Logger.log('⚡ [onFiltroGrupoChange] Skipped - mismo grupo:', nuevoGrupo);
      return;
    }

    this.filtroGrupo = nuevoGrupo;
    // ✅ Actualizar también grupoSeguimientoActivo para mantener sincronía
    this.grupoSeguimientoActivo = nuevoGrupo !== 'todos' ? nuevoGrupo : null;
    // Limpiar modo de selección de estado
    this.modoSeleccionEstado = null;

    Logger.log('🔄 [onFiltroGrupoChange] Cambio de grupo:', {
      filtroGrupo: this.filtroGrupo,
      grupoSeguimientoActivo: this.grupoSeguimientoActivo
    });

    // Guardar en CourseState para persistencia por curso
    if (this.cursoActivo) {
      this.dataService.updateCourseState(this.cursoActivo, {
        filtroGrupo: nuevoGrupo
      });
    }

    // Actualizar el servicio de seguimiento solo si no es "todos"
    if (nuevoGrupo !== 'todos') {
      const grupoNum = parseInt(nuevoGrupo.replace(/\D/g, ''));
      this.seguimientoService.setGrupoSeleccionado(grupoNum);
    }

    // OPTIMIZACIÓN: aplicarFiltros solo filtra en memoria, no recarga datos
    this.aplicarFiltros();

    // Actualizar anotaciones del nuevo grupo
    this.actualizarAnotacionesDesdeEstados();

    // Si hay una rúbrica activa, cargar el estado del nuevo grupo y actualizar el panel
    if (this.mostrarRubrica && this.tipoEvaluando && nuevoGrupo !== 'todos') {
      Logger.log('📊 [onFiltroGrupoChange] Rúbrica activa - cargando evaluación para grupo:', nuevoGrupo);

      // 🔑 IMPORTANTE: Limpiar estado primero para evitar datos residuales
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();

      // 🔄 Cargar datos del nuevo grupo
      this.cargarEvaluacionGuardada().then(() => {
        Logger.log('📊 [onFiltroGrupoChange] Evaluación cargada:', {
          grupo: nuevoGrupo,
          hayEvaluacion: !!this.evaluacionActual,
          puntos: this.evaluacionActual?.puntosTotales
        });
        this.emitToSeguimientoPanel();
        this.cdr.detectChanges();
      });
    } else {
      // Si no hay rúbrica activa o es "todos", limpiar completamente
      Logger.log('🧹 [onFiltroGrupoChange] Limpiando estado (sin rúbrica o grupo "todos")');
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();
      this.limpiarPanelSeguimiento();
      this.cdr.detectChanges();
    }
  }

  /**
   * Obtiene lista detallada de grupos calificados (parcial o totalmente)
   * Un grupo se considera calificado si tiene al menos una evaluación PG en cualquier entrega
   */
  getGruposCalificados(): Array<{
    grupo: string;
    entregas: { E1: boolean; E2: boolean; EF: boolean };
    totalEntregas: number;
    porcentaje: number;
    integrantes: number;
  }> {
    if (!this.cursoActivo) {
      return [];
    }

    const evaluaciones = this.dataService.getAllEvaluaciones();
    const grupos = this.gruposDisponibles;
    const entregas: ('E1' | 'E2' | 'EF')[] = ['E1', 'E2', 'EF'];
    const gruposCalificados: Array<{
      grupo: string;
      entregas: { E1: boolean; E2: boolean; EF: boolean };
      totalEntregas: number;
      porcentaje: number;
      integrantes: number;
    }> = [];

    grupos.forEach(grupo => {
      const estadoEntregas = {
        E1: false,
        E2: false,
        EF: false
      };

      // Verificar cada entrega
      entregas.forEach(entrega => {
        const keyPG = `${this.cursoActivo}_${entrega}_PG_${grupo} `;
        if (evaluaciones[keyPG]) {
          estadoEntregas[entrega] = true;
        }
      });

      // Contar entregas completadas
      const totalEntregas = Object.values(estadoEntregas).filter(v => v).length;

      // Solo incluir si tiene al menos una entrega calificada
      if (totalEntregas > 0) {
        // Contar integrantes del grupo
        const integrantes = this.estudiantesActuales.filter(e => e.grupo === grupo).length;

        gruposCalificados.push({
          grupo,
          entregas: estadoEntregas,
          totalEntregas,
          porcentaje: Math.round((totalEntregas / 3) * 100),
          integrantes
        });
      }
    });

    // Ordenar por número de grupo
    return gruposCalificados.sort((a, b) => {
      const numA = parseInt(a.grupo) || 0;
      const numB = parseInt(b.grupo) || 0;
      return numA - numB;
    });
  }

  /**
   * Obtiene lista detallada de grupos pendientes por calificar
   * Un grupo está pendiente si no tiene ninguna evaluación PG o tiene evaluaciones incompletas
   */
  getGruposPendientes(): Array<{
    grupo: string;
    entregas: { E1: boolean; E2: boolean; EF: boolean };
    totalPendientes: number;
    integrantes: number;
  }> {
    if (!this.cursoActivo) {
      return [];
    }

    const evaluaciones = this.dataService.getAllEvaluaciones();
    const grupos = this.gruposDisponibles;
    const entregas: ('E1' | 'E2' | 'EF')[] = ['E1', 'E2', 'EF'];
    const gruposPendientes: Array<{
      grupo: string;
      entregas: { E1: boolean; E2: boolean; EF: boolean };
      totalPendientes: number;
      integrantes: number;
    }> = [];

    grupos.forEach(grupo => {
      const estadoEntregas = {
        E1: false,
        E2: false,
        EF: false
      };

      // Verificar cada entrega
      entregas.forEach(entrega => {
        const keyPG = `${this.cursoActivo}_${entrega}_PG_${grupo} `;
        if (evaluaciones[keyPG]) {
          estadoEntregas[entrega] = true;
        }
      });

      // Contar entregas pendientes
      const totalPendientes = Object.values(estadoEntregas).filter(v => !v).length;

      // Incluir si tiene al menos una entrega pendiente
      if (totalPendientes > 0) {
        // Contar integrantes del grupo
        const integrantes = this.estudiantesActuales.filter(e => e.grupo === grupo).length;

        gruposPendientes.push({
          grupo,
          entregas: estadoEntregas,
          totalPendientes,
          integrantes
        });
      }
    });

    // Ordenar por número de grupo
    return gruposPendientes.sort((a, b) => {
      const numA = parseInt(a.grupo) || 0;
      const numB = parseInt(b.grupo) || 0;
      return numA - numB;
    });
  }

  /**
   * Maneja el clic en el encabezado del grupo según el modo configurado
   * - modoMantenerVistaMatriz = true: Solo muestra integrantes en panel de seguimiento
   * - modoMantenerVistaMatriz = false: Navega a la vista detallada del grupo
   */
  onClickEncabezadoGrupo(grupo: string) {
    if (this.modoMantenerVistaMatriz) {
      // ACTIVO: Mantener vista matriz, solo mostrar integrantes en panel de seguimiento
      this.seleccionarGrupoParaSeguimiento(grupo);
    } else {
      // INACTIVO: Navegar a los detalles del grupo
      this.navegarAGrupo(grupo);
    }
  }

  /**
   * Selecciona un grupo para mostrar en el panel de seguimiento
   * SIN cambiar la vista actual (mantiene la matriz visible)
   */
  seleccionarGrupoParaSeguimiento(grupo: string) {
    // Extraer número del grupo - puede venir como "G1", "1", "Grupo 1", etc.
    const grupoNum = parseInt(grupo.replace(/\D/g, '')) || 0;

    if (grupoNum === 0) return;

    // Actualizar seguimiento sin cambiar filtroGrupo (mantiene la matriz)
    this.grupoSeguimientoActivo = grupo;

    // Usar setGrupoVisualizado para mostrar integrantes SIN cambiar el filtro activo
    // Esto mantiene "Todos" seleccionado en el panel mientras muestra los integrantes del grupo
    this.seguimientoService.setGrupoVisualizado(grupoNum);
  }

  /**
   * Navega a un grupo específico desde las listas del panel general
   */
  navegarAGrupo(numeroGrupo: string) {
    // 🛡️ GUARDIA: No hacer nada si ya es el grupo activo
    if (this.filtroGrupo === numeroGrupo) {
      return;
    }

    this.filtroGrupo = numeroGrupo;
    this.grupoSeguimientoActivo = numeroGrupo;

    // Guardar en CourseState para persistencia
    if (this.cursoActivo) {
      this.dataService.updateCourseState(this.cursoActivo, {
        filtroGrupo: numeroGrupo
      });
    }

    // Sincronizar con el servicio de seguimiento
    const grupoNum = parseInt(numeroGrupo.replace(/\D/g, ''));
    this.seguimientoService.setGrupoSeleccionado(grupoNum);

    // Aplicar filtros para mostrar solo ese grupo
    this.aplicarFiltros();
    this.cdr.detectChanges();
  }

  /**
   * Obtiene el estado de una entrega para un grupo específico
   * @returns 'completo' (verde), 'parcial' (amarillo), 'pendiente' (rojo)
   */
  getEstadoEntregaGrupo(entrega: string, grupo: string): 'completo' | 'parcial' | 'pendiente' {
    if (!this.cursoActivo) {
      return 'pendiente';
    }

    const evaluaciones = this.dataService.getAllEvaluaciones();
    const keyPG = `${this.cursoActivo}_${entrega}_PG_${grupo}`;

    // Obtener integrantes del grupo
    const integrantes = this.estudiantesActuales.filter(e => e.grupo === grupo);

    if (integrantes.length === 0) {
      return 'pendiente'; // Sin estudiantes = rojo
    }

    // Verificar evaluación grupal (PG)
    const hayPG = !!evaluaciones[keyPG];

    // Contar evaluaciones individuales (PI)
    let evaluadosPI = 0;
    integrantes.forEach(est => {
      const keyPI = `${this.cursoActivo}_${entrega}_PI_${est.correo}`;
      if (evaluaciones[keyPI]) {
        evaluadosPI++;
      }
    });

    // Lógica de estados
    const totalIntegrantes = integrantes.length;

    if (hayPG && evaluadosPI === totalIntegrantes) {
      return 'completo'; // Verde: PG + todos PI evaluados
    } else if (hayPG || evaluadosPI > 0) {
      return 'parcial'; // Amarillo: al menos algo evaluado
    } else {
      return 'pendiente'; // Rojo: nada evaluado
    }
  }

  /**
   * Obtiene el texto del tooltip para una celda de estado
   */
  getTituloEstado(entrega: string, grupo: string): string {
    if (!this.cursoActivo) {
      return '';
    }

    const estado = this.getEstadoEntregaGrupo(entrega, grupo);
    const integrantes = this.estudiantesActuales.filter(e => e.grupo === grupo);
    const totalIntegrantes = integrantes.length;

    const evaluaciones = this.dataService.getAllEvaluaciones();
    const keyPG = `${this.cursoActivo}_${entrega}_PG_${grupo}`;
    const hayPG = !!evaluaciones[keyPG];

    let evaluadosPI = 0;
    integrantes.forEach(est => {
      const keyPI = `${this.cursoActivo}_${entrega}_PI_${est.correo}`;
      if (evaluaciones[keyPI]) {
        evaluadosPI++;
      }
    });

    if (estado === 'completo') {
      return `Grupo ${grupo} - ${entrega}: ✅ Completo (PG + ${totalIntegrantes}/${totalIntegrantes} PI)`;
    } else if (estado === 'parcial') {
      const pg = hayPG ? 'PG ✓' : 'PG ✗';
      return `Grupo ${grupo} - ${entrega}: ⚠️ Parcial (${pg} + ${evaluadosPI}/${totalIntegrantes} PI)`;
    } else {
      return `Grupo ${grupo} - ${entrega}: ❌ Pendiente (0/${totalIntegrantes} evaluados)`;
    }
  }

  /**
   * Navega a un grupo y entrega específica desde la matriz
   */
  navegarAGrupoEntrega(grupo: string, entrega: string) {
    if (!this.cursoActivo) return;

    // Cambiar al grupo seleccionado
    this.navegarAGrupo(grupo);

    // Actualizar entrega activa en el estado del curso
    const courseState = this.dataService.getCourseState(this.cursoActivo);
    if (courseState) {
      courseState.activeDelivery = entrega as 'E1' | 'E2' | 'EF';
      this.dataService.updateCourseState(this.cursoActivo, courseState);
    }

    Logger.log(`📍 Navegando a Grupo ${grupo} - ${entrega}`);

    // Trigger change detection para actualizar UI
    this.cdr.detectChanges();
  }





  // Método para compatibilidad con código existente
  esEstudianteSeleccionado(correo: string): boolean {
    return this.estudiantesSeleccionados.has(correo);
  }

  async renombrarCurso() {
    if (!this.cursoActivo) return;

    // Obtener metadata del curso actual
    const courseState = this.dataService.getCourseState(this.cursoActivo);
    const nombreActual = courseState?.metadata?.nombre || this.cursoActivo;

    const alert = await this.alertController.create({
      header: '✏️ Actualizar Nombre del Curso',
      message: 'El código del curso no cambiará, solo su nombre descriptivo:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          name: 'nuevoNombre',
          type: 'text',
          value: nombreActual,
          placeholder: 'Nombre completo del curso'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Actualizar',
          handler: async (data) => {
            if (data.nuevoNombre && data.nuevoNombre.trim() !== nombreActual) {
              try {
                await this.dataService.actualizarNombreCurso(this.cursoActivo!, data.nuevoNombre.trim());
                // NO cambiamos cursoActivo porque el código único no cambia
                await this.toastService.success('Nombre actualizado correctamente');
              } catch (error: any) {
                this.mostrarError('Error al actualizar nombre', error.message);
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  exportarNotas(entrega: 'E1' | 'E2' | 'EF') {
    if (!this.cursoActivo) return;
    this.dataService.exportarNotasCSV(this.cursoActivo, entrega);
  }

  async sincronizarArchivoCalificaciones() {
    if (!this.cursoActivo) {
      await this.mostrarError('Error', 'No hay curso activo seleccionado');
      return;
    }

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) {
      await this.mostrarError('Sin archivo', 'No hay archivo de calificaciones asociado a este curso. Vaya a Configuración para cargar uno.');
      return;
    }

    try {
      await this.dataService.sincronizarArchivoCalificaciones(this.cursoActivo);
      await this.toastService.success('Archivo de calificaciones sincronizado correctamente', undefined, 4000);
    } catch (error) {
      Logger.error('Error sincronizando archivo:', error);
      await this.mostrarError('Error', 'No se pudo sincronizar el archivo de calificaciones');
    }
  }

  private async mostrarError(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: '❌ ' + titulo,
      message: mensaje,
      cssClass: 'alert-danger',
      buttons: ['OK']
    });
    await alert.present();
  }

  private async mostrarConfirmacion(titulo: string, mensaje: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: titulo,
        message: mensaje,
        cssClass: 'alert-confirm',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Continuar',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  // === MÉTODOS PARA LA RÚBRICA DE EVALUACIÓN ===

  /**
   * Genera un identificador único para el grupo/estudiante actual.
   * Este ID cambia cuando se selecciona un grupo o estudiante diferente,
   * forzando la re-inicialización del componente de rúbrica.
   */
  getGrupoIdActual(): string {
    if (this.tipoEvaluando === 'PI' && this.estudianteSeleccionado) {
      return `${this.cursoActivo}_${this.filtroGrupo}_${this.estudianteSeleccionado}`;
    }
    return `${this.cursoActivo}_${this.filtroGrupo}_${this.grupoSeguimientoActivo || 'none'}`;
  }

  /**
   * Limpia completamente el panel de seguimiento
   */
  private limpiarPanelSeguimiento() {
    const seguimiento = this.seguimientoService.getSeguimiento();
    if (seguimiento) {
      seguimiento.evaluacionGrupal = undefined;
      seguimiento.evaluacionIndividual = undefined;
      seguimiento.integranteSeleccionado = undefined;
      seguimiento.entregaActual = undefined;
      seguimiento.tipoEvaluacionActiva = null;
      // Limpiar también los comentarios
      seguimiento.comentarios = [];
      this.seguimientoService.setSeguimiento(seguimiento);
      Logger.log('🧹 Panel de seguimiento limpiado (evaluaciones, integrante, entrega, tipo y comentarios)');
    }
  }

  /**
   * Obtiene el ID de la rúbrica por defecto según la entrega y tipo
   *
   * PRIORIDAD DE BÚSQUEDA:
   * 1. Intenta obtener desde rubricasAsociadas del CourseState (persistido)
   * 2. Si no existe, genera ID desde categoría (nombreAbreviado del curso)
   * 3. Si la rúbrica generada no existe, fallback a EPM
   *
   * Sistema de IDs: {categoria}-{tipo}-{entrega}
   * Ejemplos: epm-grupal-e1, epm-individual, so-grupal-e1, bd-grupal-final
   *
   * @param entrega - Código de la entrega (E1, E2, EF)
   * @param tipo - Tipo de evaluación (PG: Proyecto Grupal, PI: Proyecto Individual)
   * @returns ID de la rúbrica en formato {categoria}-{tipo}-{entrega}
   */
  private obtenerRubricaIdPorDefecto(entrega: 'E1' | 'E2' | 'EF', tipo: 'PG' | 'PI'): string {
    // 1️⃣ Intentar obtener desde rubricasAsociadas (solo para grupales)
    if (tipo === 'PG' && this.cursoActivo) {
      const uiState = this.dataService.getUIState();
      const courseState = uiState.courseStates?.[this.cursoActivo];
      const rubricasAsociadas = courseState?.rubricasAsociadas;

      if (rubricasAsociadas) {
        let rubricaId: string | null = null;

        if (entrega === 'E1') rubricaId = rubricasAsociadas.entrega1;
        else if (entrega === 'E2') rubricaId = rubricasAsociadas.entrega2;
        else if (entrega === 'EF') rubricaId = rubricasAsociadas.entregaFinal;

        if (rubricaId) {
          // Verificar que la rúbrica exista
          const existe = this.dataService.getRubrica(rubricaId);
          if (existe) {
            Logger.log(`✅[obtenerRubricaIdPorDefecto] Usando rúbrica asociada: ${rubricaId} `);
            return rubricaId;
          } else {
            Logger.warn(`⚠️ Rúbrica asociada ${rubricaId} no encontrada en storage`);
          }
        }
      }
    }

    // 2️⃣ Si no hay rubricasAsociadas, usar categoría por defecto
    const categoria = this.CATEGORIA_RUBRICAS_DEFAULT;
    Logger.log('🏷️ [obtenerRubricaIdPorDefecto] Categoría por defecto:', categoria);

    const rubricasDisponibles = this.dataService.obtenerIdsRubricas();
    Logger.log('📚 [obtenerRubricaIdPorDefecto] Rúbricas disponibles:', rubricasDisponibles);

    if (tipo === 'PG') {
      // Para rúbricas grupales, buscar dinámicamente según la entrega
      const palabraClave = entrega === 'E1' ? 'entrega-1' : entrega === 'E2' ? 'entrega-2' : 'final';

      const rubricasGrupales = rubricasDisponibles.filter(id =>
        id.toLowerCase().includes('grupal') && id.toLowerCase().includes(palabraClave)
      );

      Logger.log(`🔍[obtenerRubricaIdPorDefecto] Buscando rúbrica grupal para ${entrega}: `, rubricasGrupales);

      if (rubricasGrupales.length === 0) {
        Logger.error(`❌ No se encontró rúbrica grupal para ${entrega} `);
        this.mostrarError(
          'Rúbrica Grupal No Encontrada',
          `No hay ninguna rúbrica grupal para ${entrega} importada en el sistema.\n\n` +
          'Por favor, importe la rúbrica correspondiente desde Configuración.'
        );
        return '';
      }

      const rubricaId = rubricasGrupales[0];
      Logger.log('✅ [obtenerRubricaIdPorDefecto] Usando rúbrica grupal:', rubricaId);
      return rubricaId;

    } else {
      // Para rúbricas individuales, buscar dinámicamente cualquier rúbrica que contenga "individual"
      Logger.log('🔍 [obtenerRubricaIdPorDefecto] Buscando rúbrica individual...');

      const rubricasDisponibles = this.dataService.obtenerIdsRubricas();
      Logger.log('� [obtenerRubricaIdPorDefecto] Rúbricas disponibles:', rubricasDisponibles);

      // Buscar cualquier rúbrica que contenga "individual" en su ID
      const rubricasIndividuales = rubricasDisponibles.filter(id =>
        id.toLowerCase().includes('individual')
      );

      Logger.log('� [obtenerRubricaIdPorDefecto] Rúbricas individuales encontradas:', rubricasIndividuales);

      if (rubricasIndividuales.length === 0) {
        Logger.error('❌ No se encontró ninguna rúbrica individual en el sistema');
        this.mostrarError(
          'Rúbrica Individual No Encontrada',
          'No hay ninguna rúbrica individual importada en el sistema.\n\n' +
          'Por favor, importe una rúbrica individual desde la pestaña de Configuración.'
        );
        return '';
      }

      // Usar la primera rúbrica individual encontrada
      const rubricaId = rubricasIndividuales[0];
      Logger.log('✅ [obtenerRubricaIdPorDefecto] Usando rúbrica individual:', rubricaId);

      return rubricaId;
    }
  }

  // === MÉTODOS AUXILIARES DE EVALUACIÓN ===

  /**
   * Obtiene los puntos máximos de una rúbrica sumando todos los pesos de criterios
   * @param entrega - Código de la entrega (E1, E2, EF)
   * @param tipo - Tipo de evaluación (PG o PI)
   * @returns Puntos máximos totales de la rúbrica, o 0 si no hay rúbrica asociada
   */
  obtenerPuntosMaximosRubrica(entrega: 'E1' | 'E2' | 'EF', tipo: 'PG' | 'PI'): number {
    if (!this.cursoActivo) return 0;

    // Obtener el ID de la rúbrica asociada
    const rubricaId = this.obtenerRubricaIdPorDefecto(entrega, tipo);
    if (!rubricaId) return 0;

    // Obtener la rúbrica del servicio
    const rubrica = this.dataService.getRubrica(rubricaId);
    if (!rubrica || !rubrica.criterios) return 0;

    // Sumar todos los pesos de los criterios
    const puntosMaximos = rubrica.criterios.reduce((total, criterio) => {
      return total + (criterio.peso || criterio.pesoMaximo || 0);
    }, 0);

    return puntosMaximos;
  }

  // Método auxiliar para obtener nota de evaluación
  obtenerNota(estudiante: Estudiante, entrega: 'E1' | 'E2' | 'EF', tipo: 'PG' | 'PI'): number {
    if (!this.cursoActivo) return 0;

    // Para PG, primero intentar buscar evaluación individual del estudiante
    if (tipo === 'PG') {
      // Intentar obtener evaluación PG individual (por correo)
      const evaluacionIndividual = this.dataService.getEvaluacion(this.cursoActivo, entrega, tipo, estudiante.correo);
      if (evaluacionIndividual) {
        return evaluacionIndividual.puntosTotales || 0;
      }

      // Si no hay individual, buscar por grupo (evaluación grupal normal)
      const evaluacionGrupal = this.dataService.getEvaluacion(this.cursoActivo, entrega, tipo, estudiante.grupo);
      return evaluacionGrupal?.puntosTotales || 0;
    }

    // Para PI, buscar por correo
    const identificador = estudiante.correo;
    const evaluacion = this.dataService.getEvaluacion(this.cursoActivo, entrega, tipo, identificador);
    return evaluacion?.puntosTotales || 0;
  }

  obtenerSumatoria(estudiante: Estudiante, entrega: 'E1' | 'E2' | 'EF'): number {
    const pg = this.obtenerNota(estudiante, entrega, 'PG');
    const pi = this.obtenerNota(estudiante, entrega, 'PI');
    return pg + pi;
  }

  /**
   * Maneja los cambios de calificaciones desde el componente de rúbrica hijo
   * Sincroniza el estado local criteriosEvaluados con las selecciones del usuario
   */
  onCalificacionesChange(calificaciones: { [criterio: string]: number }) {
    if (!this.rubricaActual || !this.rubricaActual.criterios) return;

    // Actualizar criteriosEvaluados con las calificaciones del componente hijo
    this.criteriosEvaluados = this.rubricaActual.criterios.map((criterio, index) => {
      const puntos = calificaciones[criterio.titulo] || 0;
      const nivel = this.obtenerNivelPorPuntos(criterio, puntos);

      return {
        criterioTitulo: criterio.titulo,
        nivelSeleccionado: nivel?.titulo || '',
        puntosObtenidos: puntos,
        puntosPersonalizados: false,
        comentario: this.comentariosCriterios[index] || ''
      };
    });

    // Calcular puntos totales
    this.puntosRubricaTotales = this.criteriosEvaluados.reduce(
      (sum, c) => sum + (c.puntosObtenidos || 0), 0
    );

    Logger.log('🔄 [onCalificacionesChange] criteriosEvaluados actualizado:', this.criteriosEvaluados.length, 'criterios');
  }

  /**
   * Maneja el evento de guardado de evaluación desde el componente hijo
   */
  async onEvaluacionGuardada(evaluacionData: any) {
    Logger.log('📥 [onEvaluacionGuardada] Recibiendo datos de evaluación:', evaluacionData);

    if (!this.cursoActivo || !this.entregaEvaluando || !this.tipoEvaluando || !this.rubricaActual) {
      Logger.error('❌ [onEvaluacionGuardada] Faltan datos necesarios');
      await this.mostrarError('Error', 'Faltan datos para guardar la evaluación');
      return;
    }

    try {
      // Convertir calificaciones del componente hijo al formato de criterios evaluados
      const criterios = this.rubricaActual.criterios.map((criterio, index) => {
        const puntos = evaluacionData.calificaciones[criterio.titulo] || 0;
        const nivel = this.obtenerNivelPorPuntos(criterio, puntos);

        return {
          criterioTitulo: criterio.titulo,
          nivelSeleccionado: nivel?.titulo || '',
          puntosObtenidos: puntos,
          puntosPersonalizados: false,
          comentario: '',
          criterioDescripcion: criterio.descripcion,
          nivelDescripcion: nivel?.descripcion || ''
        };
      });

      // Determinar identificador según tipo
      let identificador: string;
      let grupo = '';
      let estudianteEmail = '';

      if (this.tipoEvaluando === 'PG') {
        if (!this.grupoSeguimientoActivo) {
          await this.mostrarError('Error', 'No hay un grupo seleccionado');
          return;
        }
        identificador = this.grupoSeguimientoActivo;
        grupo = this.grupoSeguimientoActivo;
      } else {
        if (!this.estudianteSeleccionado) {
          await this.mostrarError('Error', 'Debe seleccionar un estudiante');
          return;
        }
        identificador = this.estudianteSeleccionado;
        estudianteEmail = this.estudianteSeleccionado;
      }

      // Guardar evaluación en DataService
      const evaluacion: Evaluacion = {
        cursoNombre: this.cursoActivo,
        entrega: this.entregaEvaluando,
        tipo: this.tipoEvaluando,
        grupo: grupo,
        estudianteEmail: estudianteEmail,
        rubricaId: this.rubricaActual.id || '',
        criterios: criterios,
        puntosTotales: evaluacionData.puntuacionTotal,
        fechaEvaluacion: new Date(),
        comentarioGeneral: evaluacionData.observaciones || ''
      };

      Logger.log('💾 [onEvaluacionGuardada] Guardando evaluación:', evaluacion);
      await this.dataService.guardarEvaluacion(evaluacion);

      // Actualizar estado local
      this.evaluacionActual = evaluacion;
      this.puntosRubricaTotales = evaluacionData.puntuacionTotal;

      // Forzar actualización de la UI
      this.cdr.detectChanges();

      Logger.log('✅ [onEvaluacionGuardada] Evaluación guardada exitosamente');
    } catch (error: any) {
      Logger.error('❌ [onEvaluacionGuardada] Error:', error);
      await this.mostrarError('Error', 'No se pudo guardar la evaluación: ' + error.message);
    }
  }

  /**
   * Obtiene el nivel de un criterio según los puntos asignados
   */
  private obtenerNivelPorPuntos(criterio: any, puntos: number): any {
    if (!criterio.nivelesDetalle) return null;

    return criterio.nivelesDetalle.find((nivel: any) => {
      const puntosNivel = nivel.puntos.includes('-')
        ? nivel.puntos.split('-').map((p: string) => parseInt(p.trim()))
        : [parseInt(nivel.puntos), parseInt(nivel.puntos)];

      if (puntosNivel.length === 2) {
        return puntos >= puntosNivel[0] && puntos <= puntosNivel[1];
      } else {
        return puntos === puntosNivel[0];
      }
    });
  }

  // Métodos de edición de puntajes en tabla eliminadas (tabla removida)

  calcularPuntosTotales() {
    this.puntosRubricaTotales = this.criteriosEvaluados.reduce(
      (sum, criterio) => sum + (criterio.puntosObtenidos || 0), 0
    );
  }

  actualizarComentarioDesdeRubrica() {
    const textoCriterios = this.criteriosEvaluados
      .filter(c => c.nivelSeleccionado)
      .map(c => `${c.criterioTitulo}: ${c.comentario} `)
      .join('\n');

    if (textoCriterios) {
      this.nuevoComentario = textoCriterios;
    }
  }

  async guardarRubricaGrupo() {
    if (!this.cursoActivo || !this.entregaEvaluando || !this.tipoEvaluando) {
      this.mostrarError('Error', 'Faltan datos para guardar la evaluación');
      return;
    }

    // Determinar el identificador y validar según el tipo
    let identificador: string;
    let estudianteEmail: string = '';
    let grupo: string = '';

    if (this.tipoEvaluando === 'PG') {
      // Evaluación grupal - SOLO aplicar a estudiantes seleccionados
      if (!this.grupoSeguimientoActivo) {
        this.mostrarError('Error', 'No hay un grupo seleccionado');
        return;
      }

      const todosDelGrupo = this.estudiantesFiltrados.filter(e =>
        e.grupo === this.grupoSeguimientoActivo
      );

      const estudiantesSeleccionados = this.estudiantesFiltrados.filter(e =>
        this.estudiantesSeleccionados.has(e.correo) && e.grupo === this.grupoSeguimientoActivo
      );

      if (estudiantesSeleccionados.length === 0) {
        this.mostrarError('Error', 'Debe seleccionar al menos un estudiante del grupo');
        return;
      }

      identificador = this.grupoSeguimientoActivo;
      let grupo = this.grupoSeguimientoActivo;

      // Si están seleccionados TODOS los del grupo, guardar como PG grupal normal
      if (estudiantesSeleccionados.length === todosDelGrupo.length) {
        await this.dataService.guardarEvaluacion({
          cursoNombre: this.cursoActivo,
          entrega: this.entregaEvaluando,
          tipo: 'PG',
          grupo: grupo,
          estudianteEmail: '', // PG grupal (sin email específico)
          rubricaId: this.rubricaActual?.id || '',
          criterios: this.criteriosEvaluados,
          puntosTotales: this.puntosRubricaTotales,
          fechaEvaluacion: new Date(),
          comentarioGeneral: this.textoSeguimientoRubrica.join('\n\n')
        });
      } else {
        // Si NO todos están seleccionados, guardar PG INDIVIDUAL para cada seleccionado
        for (const estudiante of estudiantesSeleccionados) {
          await this.dataService.guardarEvaluacion({
            cursoNombre: this.cursoActivo,
            entrega: this.entregaEvaluando,
            tipo: 'PG', // Guardar como PG individual
            grupo: grupo,
            estudianteEmail: estudiante.correo, // PG individual (con email específico)
            rubricaId: this.rubricaActual?.id || '',
            criterios: [...this.criteriosEvaluados], // Copia independiente
            puntosTotales: this.puntosRubricaTotales,
            fechaEvaluacion: new Date(),
            comentarioGeneral: this.textoSeguimientoRubrica.join('\n\n')
          });
        }
      }

    } else if (this.tipoEvaluando === 'PI') {
      // Evaluación individual - usar el estudiante seleccionado
      if (!this.estudianteSeleccionado) {
        this.mostrarError('Error', 'Debe seleccionar un estudiante para evaluaciones individuales');
        return;
      }

      identificador = this.estudianteSeleccionado;
      estudianteEmail = this.estudianteSeleccionado;

      // Guardar evaluación para el estudiante seleccionado
      await this.dataService.guardarEvaluacion({
        cursoNombre: this.cursoActivo,
        entrega: this.entregaEvaluando,
        tipo: this.tipoEvaluando,
        grupo: grupo,
        estudianteEmail: estudianteEmail,
        rubricaId: this.rubricaActual?.id || '',
        criterios: this.criteriosEvaluados,
        puntosTotales: this.puntosRubricaTotales,
        fechaEvaluacion: new Date(),
        comentarioGeneral: this.textoSeguimientoRubrica.join('\n\n')
      });

      // Si "Aplicar a +" está activo, aplicar a otros estudiantes seleccionados
      if (this.aplicarAMas && this.estudiantesSeleccionados.size > 1) {
        const otrosEstudiantes = this.estudiantesFiltrados.filter(e =>
          this.estudiantesSeleccionados.has(e.correo) && e.correo !== this.estudianteSeleccionado
        );

        for (const estudiante of otrosEstudiantes) {
          await this.dataService.guardarEvaluacion({
            cursoNombre: this.cursoActivo,
            entrega: this.entregaEvaluando,
            tipo: 'PI',
            grupo: estudiante.grupo,
            estudianteEmail: estudiante.correo,
            rubricaId: this.rubricaActual?.id || '',
            criterios: [...this.criteriosEvaluados], // Copia independiente
            puntosTotales: this.puntosRubricaTotales,
            fechaEvaluacion: new Date(),
            comentarioGeneral: this.textoSeguimientoRubrica.join('\n\n')
          });
        }

        Logger.log(`✅[Aplicar a +] Evaluación aplicada a ${otrosEstudiantes.length} estudiantes adicionales`);
        this.aplicarAMas = false; // Resetear checkbox
      }

    } else {
      this.mostrarError('Error', 'Tipo de evaluación no válido');
      return;
    }

    this.modoEdicionRubrica = false;

    const mensaje = this.tipoEvaluando === 'PG'
      ? `Rúbrica guardada para ${this.estudiantesSeleccionados.size} estudiante(s) del grupo`
      : 'Rúbrica guardada para el estudiante';

    this.mostrarError('Éxito', mensaje);
    Logger.log(`✅[guardarRubricaGrupo] Evaluación ${this.tipoEvaluando} guardada para ${identificador} `);
  }

  private inicializarCriteriosRubrica() {
    if (!this.rubricaActual) return;

    this.criteriosEvaluados = this.rubricaActual.criterios.map(criterio => ({
      criterioTitulo: criterio.titulo,
      nivelSeleccionado: undefined,
      puntosObtenidos: 0,
      puntosPersonalizados: false
    }));

    this.calcularPuntosTotales();
  }

  private cargarEvaluacionExistente() {
    if (!this.cursoActivo || !this.entregaEvaluando || !this.tipoEvaluando) return;

    const identificador = this.tipoEvaluando === 'PG' ?
      this.filtroGrupo :
      this.estudianteSeleccionado;

    if (!identificador) return;

    const evaluacionExistente = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      this.tipoEvaluando,
      identificador
    );

    if (evaluacionExistente) {
      this.criteriosEvaluados = [...evaluacionExistente.criterios];
      this.calcularPuntosTotales();
    }
  }

  // === MÉTODOS ELIMINADOS - FORMATO ANTIGUO SPA ===
  // seleccionarNivelRubrica() - eliminado, usaba formato antiguo con códigos I, A, E

  actualizarPuntosPersonalizadosRubrica(criterioIndex: number, puntos: number) {
    this.criteriosEvaluados[criterioIndex] = {
      ...this.criteriosEvaluados[criterioIndex],
      puntosObtenidos: puntos,
      puntosPersonalizados: true,
      nivelSeleccionado: undefined
    };

    this.calcularPuntosTotales();
  }

  guardarEvaluacionRubrica() {
    if (!this.cursoActivo || !this.entregaEvaluando || !this.tipoEvaluando || !this.rubricaActual) {
      this.mostrarError('Error', 'Faltan datos para guardar la evaluación');
      return;
    }

    // Comportamiento normal para una evaluación
    const identificador = this.tipoEvaluando === 'PG' ?
      this.filtroGrupo :
      this.estudianteSeleccionado;

    if (!identificador) {
      this.mostrarError('Error', 'No se ha seleccionado el objetivo de evaluación');
      return;
    }

    const evaluacion: Evaluacion = {
      cursoNombre: this.cursoActivo,
      entrega: this.entregaEvaluando,
      tipo: this.tipoEvaluando,
      rubricaId: this.rubricaActual.id,
      criterios: [...this.criteriosEvaluados],
      puntosTotales: this.puntosRubricaTotales,
      fechaEvaluacion: new Date()
    };

    if (this.tipoEvaluando === 'PG') {
      evaluacion.grupo = identificador;
    } else {
      evaluacion.estudianteEmail = identificador;
    }

    try {
      this.dataService.guardarEvaluacion(evaluacion);

      // Guardar en cache
      this.guardarEnCache();

      // NO actualizar this.evaluacionActual aquí para evitar que ngOnChanges
      // del componente hijo reinicialize las calificaciones
      // La próxima vez que se abra la rúbrica, se cargará desde el servicio

      // Actualizar panel de seguimiento
      this.emitToSeguimientoPanel();

      // Forzar detección de cambios
      this.cdr.detectChanges();

      this.mostrarMensajeExito('Evaluación guardada correctamente');
      // NO cerrar la rúbrica para mantener la vista actual
    } catch (error: any) {
      this.mostrarError('Error', 'No se pudo guardar la evaluación: ' + error.message);
    }
  }


  /**
   * Abre la rúbrica para una entrega específica (E1, E2, EF) y tipo (PG, PI)
   */
  async abrirRubricaEntrega(entrega: 'E1' | 'E2' | 'EF', tipo: 'PG' | 'PI') {
    Logger.log(`📋[abrirRubricaEntrega] Abriendo rúbrica: ${entrega} - ${tipo} `);

    // Verificar si hay curso activo
    if (!this.cursoActivo) {
      await this.mostrarError('Error', 'No hay curso activo seleccionado');
      return;
    }
    // Para PI (Individual), verificar que haya un estudiante seleccionado
    // Para PG (Grupal), NO se requiere selección de estudiante
    if (tipo === 'PI' && !this.estudianteSeleccionado) {
      await this.mostrarError('Atención', 'Para evaluar con rúbrica individual (PI), primero debe seleccionar un estudiante de la lista.');
      return;
    }

    const codigoCurso = this.cursoActivo;
    // Buscar rúbrica asociada al curso, entrega y tipo
    const rubricas = this.dataService.obtenerRubricasArray();
    Logger.log(`🔍[abrirRubricaEntrega] Buscando rúbrica para:`);
    Logger.log(`   - Curso: ${codigoCurso}`);
    Logger.log(`   - Entrega: ${entrega}`);
    Logger.log(`   - Tipo: ${tipo}`);
    Logger.log(`🔍[abrirRubricaEntrega] Total rúbricas disponibles: ${rubricas.length}`);

    // Log de todas las rúbricas para debug
    rubricas.forEach((r, i) => {
      Logger.log(`   [${i}] ${r.nombre} | cursosCodigos: ${JSON.stringify(r.cursosCodigos)} | tipoEntrega: ${r.tipoEntrega} | tipoRubrica: ${r.tipoRubrica}`);
    });

    const rubricaEncontrada = rubricas.find(r =>
      r.cursosCodigos?.includes(codigoCurso!) &&
      r.tipoEntrega === entrega &&
      r.tipoRubrica === tipo
    );

    if (!rubricaEncontrada) {
      await this.mostrarError(
        'Rúbrica no encontrada',
        `No hay rúbrica ${tipo} configurada para ${entrega} en este curso.`
      );
      Logger.warn(`⚠️[abrirRubricaEntrega] No se encontró rúbrica para ${codigoCurso} - ${entrega} - ${tipo} `);
      return;
    }

    Logger.log(`✅[abrirRubricaEntrega] Rúbrica encontrada: ${rubricaEncontrada.nombre} `);
    // Establecer variables de estado
    this.entregaEvaluando = entrega;
    this.tipoEvaluando = tipo;
    this.rubricaActual = rubricaEncontrada;
    this.mostrarRubrica = true;

    Logger.log(`✅[abrirRubricaEntrega] Estado actualizado: `, {
      entrega: this.entregaEvaluando,
      tipo: this.tipoEvaluando,
      rubrica: this.rubricaActual?.nombre,
      mostrarRubrica: this.mostrarRubrica,
      estudianteSeleccionado: this.estudianteSeleccionado
    });

    // Cargar evaluación guardada si existe
    await this.cargarEvaluacionGuardada();

    // Actualizar anotaciones para la entrega seleccionada
    this.actualizarAnotacionesDesdeEstados();

    // Forzar detección de cambios para actualizar la UI
    this.cdr.detectChanges();

    Logger.log(`✅[abrirRubricaEntrega] Rúbrica cargada: ${rubricaEncontrada.nombre} `);
    Logger.log(`✅[abrirRubricaEntrega] mostrarRubrica: ${this.mostrarRubrica} `);
  }


  cerrarRubrica() {
    // Guardar en cache antes de cerrar
    this.guardarEnCache();

    this.mostrarRubrica = false;
    this.rubricaActual = null;
    this.entregaEvaluando = null;
    this.tipoEvaluando = null;
    this.criteriosEvaluados = [];
    this.puntosRubricaTotales = 0;
    this.criterioActualIndex = 0;
    this.textoSeguimientoRubrica = [];
    this.timestampsSeguimiento = []; // Limpiar timestamps
    this.modoEdicionRubrica = false;

    // Limpiar panel de seguimiento al cerrar la rúbrica
    this.limpiarPanelSeguimiento();
  }

  /**
   * Obtiene el nombre completo del estudiante seleccionado
   */
  obtenerNombreEstudianteSeleccionado(): string {
    if (!this.estudianteSeleccionado) return '';

    const estudiante = this.estudiantesActuales.find(
      est => est.correo === this.estudianteSeleccionado
    );

    if (!estudiante) return this.estudianteSeleccionado;

    return `${estudiante.apellidos}, ${estudiante.nombres} `;
  }

  habilitarEdicionRubrica() {
    this.modoEdicionRubrica = true;
  }

  cancelarEdicionRubrica() {
    // Recargar la evaluación guardada
    this.cargarEvaluacionExistente();
    this.modoEdicionRubrica = false;
  }

  // === MÉTODOS PARA NAVEGACIÓN DE CRITERIOS ===

  avanzarCriterio() {
    if (!this.rubricaActual) return;
    if (this.criterioActualIndex < this.rubricaActual.criterios.length - 1) {
      this.criterioActualIndex++;
    }
  }

  retrocederCriterio() {
    if (this.criterioActualIndex > 0) {
      this.criterioActualIndex--;
    }
  }

  get criterioActual() {
    if (!this.rubricaActual || this.criterioActualIndex < 0 ||
      this.criterioActualIndex >= this.rubricaActual.criterios.length) {
      return null;
    }
    return this.rubricaActual.criterios[this.criterioActualIndex];
  }

  get nivelesDelCriterioActual(): any[] {
    if (!this.criterioActual) return [];

    // Usar nivelesDetalle (único formato soportado)
    return this.criterioActual.nivelesDetalle || [];
  }

  /**
   * Carga la evaluación guardada desde el servicio para el grupo/estudiante actual.
   * OPTIMIZADO: Crea referencias únicas para forzar ngOnChanges en componentes hijos.
   */
  async cargarEvaluacionGuardada() {
    // Usar filtroGrupo si grupoSeguimientoActivo no está definido
    const grupoActual = this.grupoSeguimientoActivo || (this.filtroGrupo !== 'todos' ? this.filtroGrupo : null);

    if (!this.cursoActivo || !this.entregaEvaluando || !grupoActual) {
      Logger.warn('⚠️ [cargarEvaluacionGuardada] Faltan datos necesarios', {
        cursoActivo: this.cursoActivo,
        entregaEvaluando: this.entregaEvaluando,
        grupoActual
      });
      return;
    }

    // Determinar identificador según tipo
    let identificador: string;
    if (this.tipoEvaluando === 'PI') {
      // Para Individual: usar email del estudiante
      identificador = this.estudianteSeleccionado || '';
      if (!identificador) {
        Logger.warn('⚠️ [cargarEvaluacionGuardada] PI requiere estudiante seleccionado');
        return;
      }
    } else {
      // Para Grupal: usar ID del grupo
      identificador = grupoActual;
    }

    Logger.log(`🔍[cargarEvaluacionGuardada] Buscando evaluación: `, {
      curso: this.cursoActivo,
      entrega: this.entregaEvaluando,
      tipo: this.tipoEvaluando,
      identificador,
      grupoActual
    });

    // Obtener evaluación del servicio (4 parámetros correctos)
    const evaluacionExistente = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      this.tipoEvaluando || 'PG',
      identificador
    );

    if (evaluacionExistente) {
      Logger.log(`📂[cargarEvaluacionGuardada] ✅ Evaluación recuperada:`, {
        entrega: this.entregaEvaluando,
        grupo: identificador,
        puntosTotales: evaluacionExistente.puntosTotales,
        criterios: evaluacionExistente.criterios?.length || 0
      });

      // 🔑 CLAVE: Crear copia PROFUNDA con nueva referencia para forzar ngOnChanges
      // Agregar timestamp único para garantizar que Angular detecte el cambio
      const evaluacionConTimestamp = {
        ...JSON.parse(JSON.stringify(evaluacionExistente)),
        _loadTimestamp: Date.now() // Marca temporal única
      };

      this.evaluacionActual = evaluacionConTimestamp;
      this.reconstruirEstadoDesdeEvaluacion(evaluacionExistente);

      Logger.log(`✅ [cargarEvaluacionGuardada] Estado reconstruido para grupo ${identificador}`);
    } else {
      Logger.log(`🆕[cargarEvaluacionGuardada] ❌ Sin evaluación previa para:`, {
        entrega: this.entregaEvaluando,
        grupo: identificador
      });

      // 🔑 IMPORTANTE: Asignar null con timestamp para forzar cambio
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();

      Logger.log(`🧹 [cargarEvaluacionGuardada] Estado limpio para nuevo grupo ${identificador}`);
    }

    // Forzar detección de cambios para actualizar el componente hijo
    this.cdr.detectChanges();
  }


  /**
   * Reconstruye el estado interno desde una evaluación guardada.
   * OPTIMIZADO: Asegura que los niveles seleccionados persistan correctamente.
   */
  private reconstruirEstadoDesdeEvaluacion(evaluacion: Evaluacion) {
    if (!evaluacion || !evaluacion.criterios) {
      Logger.warn('⚠️ [reconstruirEstadoDesdeEvaluacion] Evaluación sin criterios');
      return;
    }

    Logger.log('🔄 [reconstruirEstadoDesdeEvaluacion] Reconstruyendo estado:', {
      entrega: evaluacion.entrega,
      tipo: evaluacion.tipo,
      criterios: evaluacion.criterios.length,
      puntosTotales: evaluacion.puntosTotales
    });

    // 🧹 Limpiar estado previo antes de reconstruir
    this.nivelesSeleccionados = {};
    this.comentariosCriterios = {};
    this.puntosPersonalizados = {};

    // Restaurar criteriosEvaluados desde la evaluación guardada
    this.criteriosEvaluados = evaluacion.criterios.map((crit, index) => {
      // Actualizar nivelesSeleccionados para la UI
      if (crit.nivelSeleccionado) {
        this.nivelesSeleccionados[index] = crit.nivelSeleccionado;
        Logger.log(`  ✓ Criterio ${index}: ${crit.criterioTitulo} → Nivel: ${crit.nivelSeleccionado}`);
      }

      // Restaurar comentarios si existen
      if (crit.comentario) {
        this.comentariosCriterios[index] = crit.comentario;
      }

      // Restaurar puntos personalizados si fueron usados
      if (crit.puntosPersonalizados) {
        this.puntosPersonalizados[index] = crit.puntosObtenidos || 0;
      }

      return {
        criterioTitulo: crit.criterioTitulo,
        nivelSeleccionado: crit.nivelSeleccionado,
        puntosObtenidos: crit.puntosObtenidos || 0,
        puntosPersonalizados: crit.puntosPersonalizados || false,
        comentario: crit.comentario || ''
      };
    });

    // Restaurar puntos totales
    this.puntosRubricaTotales = evaluacion.puntosTotales || 0;

    // Reconstruir el texto de seguimiento desde los criterios
    const textoSeguimiento = this.generarTextoSeguimientoFromCriterios(evaluacion.criterios);

    if (this.tipoEvaluando === 'PG') {
      this.textoSeguimientoRubricaGrupal = textoSeguimiento;
    } else {
      this.textoSeguimientoRubricaIndividual = textoSeguimiento;
    }

    // Actualizar timestamps (usar fecha de evaluación o actual)
    const timestamp = evaluacion.fechaEvaluacion
      ? new Date(evaluacion.fechaEvaluacion).toLocaleString('es-ES')
      : new Date().toLocaleString('es-ES');

    this.timestampsSeguimiento = evaluacion.criterios.map(() => timestamp);

    Logger.log('✅ [reconstruirEstadoDesdeEvaluacion] Estado reconstruido:', {
      criterios: this.criteriosEvaluados.length,
      puntosTotal: this.puntosRubricaTotales,
      textoParrafos: textoSeguimiento.length
    });

    // Actualizar el panel de seguimiento
    this.emitToSeguimientoPanel();
  }

  /**
   * Genera el texto de seguimiento desde criterios evaluados
   */
  private generarTextoSeguimientoFromCriterios(criterios: any[]): string[] {
    return criterios.map((crit: any) => {
      const comentarioParte = crit.comentario ? `\n  💬 ${crit.comentario} ` : '';
      const nivel = crit.nivelSeleccionado || 'Sin nivel';
      const puntos = crit.puntosObtenidos || 0;
      return `📌 ${crit.criterioTitulo} \n  ✓ ${nivel} \n  📊 ${puntos} puntos${comentarioParte} `;
    });
  }

  /**
   * Reinicia completamente el estado de evaluación cuando no hay evaluación previa
   * o cuando se cambia a un grupo sin evaluación guardada.
   */
  private reiniciarEstadoEvaluacion() {
    this.puntosRubricaTotales = 0;
    this.criteriosEvaluados = [];
    this.nivelesSeleccionados = {};
    this.comentariosCriterios = {};
    this.puntosPersonalizados = {};
    this.criterioActualIndex = 0;

    // Limpiar textos de seguimiento según el tipo
    if (this.tipoEvaluando === 'PG') {
      this.textoSeguimientoRubricaGrupal = [];
    } else {
      this.textoSeguimientoRubricaIndividual = [];
    }
    this.timestampsSeguimiento = [];

    Logger.log('🧹 [reiniciarEstadoEvaluacion] Estado de evaluación reiniciado');
  }

  get nivelSeleccionadoActual(): any {

    if (!this.criterioActual) return null;

    const evaluacion = this.criteriosEvaluados[this.criterioActualIndex];
    if (!evaluacion || !evaluacion.nivelSeleccionado) return null;

    return this.nivelesDelCriterioActual.find((n: any) => n.titulo === evaluacion.nivelSeleccionado);
  }

  get esPrimerCriterio(): boolean {
    return this.criterioActualIndex === 0;
  }

  get esUltimoCriterio(): boolean {
    if (!this.rubricaActual) return true;
    return this.criterioActualIndex === this.rubricaActual.criterios.length - 1;
  }

  get rubricaEstaGuardada(): boolean {
    if (!this.cursoActivo || !this.entregaEvaluando || !this.grupoSeguimientoActivo) {
      return false;
    }

    const evaluacionExistente = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      'PG',
      this.grupoSeguimientoActivo
    );

    return !!evaluacionExistente;
  }


  seleccionarNivelCriterioActual(nivel: any) {
    if (!this.criterioActual || !nivel) return;

    Logger.log('📝 [seleccionarNivelCriterioActual] Seleccionando nivel:', nivel.titulo, 'para criterio:', this.criterioActualIndex);

    if (this.aplicarATodos && this.rubricaActual) {
      // APLICAR A TODOS LOS CRITERIOS
      Logger.log('🔄 [Aplicar a Todos] Aplicando nivel a todos los criterios');
      Logger.log('🔍 [Aplicar a Todos] Estado inicial - criteriosEvaluados.length:', this.criteriosEvaluados.length);

      // 🧹 PRIMERO: Limpiar completamente el texto del panel de seguimiento
      Logger.log('🧹 [Aplicar a Todos] Limpiando texto de seguimiento previo...');
      this.textoSeguimientoRubrica = [];
      this.textoSeguimientoRubricaGrupal = [];
      this.textoSeguimientoRubricaIndividual = [];
      this.timestampsSeguimiento = [];

      // Limpiar también puntos personalizados y comentarios para reiniciar
      this.puntosPersonalizados = {};
      this.comentariosCriterios = {};

      // IMPORTANTE: Limpiar inmediatamente el servicio de seguimiento
      if (this.tipoEvaluando) {
        this.seguimientoService.actualizarTextoRubrica(this.tipoEvaluando, [], []);
        Logger.log('🧹 [Aplicar a Todos] Servicio de seguimiento limpiado');
      }

      // IMPORTANTE: Reconstruir completamente el array de criterios evaluados para evitar duplicaciones
      const nuevosEvaluados: any[] = [];

      for (let i = 0; i < this.rubricaActual.criterios.length; i++) {
        const criterio = this.rubricaActual.criterios[i];

        // Buscar un nivel equivalente en este criterio (por índice de nivel)
        const niveles = criterio.nivelesDetalle || [];
        const nivelIndex = this.nivelesDelCriterioActual.findIndex(n => n.titulo === nivel.titulo);
        const nivelEquivalente = niveles[nivelIndex] || niveles[0]; // Usar el mismo índice o el primero

        if (nivelEquivalente) {
          const puntosNivel = nivelEquivalente.puntosMax || nivelEquivalente.puntosMin || 0;

          // Guardar nivel seleccionado
          this.nivelesSeleccionados[i] = nivelEquivalente.titulo;

          // CREAR NUEVO OBJETO para evitar referencias duplicadas
          const nuevoCriterio = {
            criterioTitulo: criterio.titulo,
            nivelSeleccionado: nivelEquivalente.titulo,
            puntosObtenidos: puntosNivel,
            puntosPersonalizados: false,
            comentario: nivelEquivalente.descripcion || ''
          };

          // Agregar al nuevo array
          nuevosEvaluados.push(nuevoCriterio);

          // Actualizar texto de seguimiento para este criterio
          const criterioTemp = this.criterioActual;
          const indexTemp = this.criterioActualIndex;
          this.criterioActualIndex = i;
          this.actualizarTextoSeguimiento(nivelEquivalente, puntosNivel, puntosNivel, undefined);
          this.criterioActualIndex = indexTemp;

          Logger.log(`✅[Aplicar a Todos] Criterio ${i}: "${criterio.titulo}" -> Nivel: "${nivelEquivalente.titulo}"(${puntosNivel} pts)`);
        } else {
          Logger.warn(`⚠️[Aplicar a Todos] No se encontró nivel equivalente para criterio ${i}: "${criterio.titulo}"`);

          // Mantener el criterio existente si no hay nivel equivalente
          if (this.criteriosEvaluados[i]) {
            nuevosEvaluados.push({ ...this.criteriosEvaluados[i] });
          } else {
            // Crear criterio vacío
            nuevosEvaluados.push({
              criterioTitulo: criterio.titulo,
              nivelSeleccionado: undefined,
              puntosObtenidos: 0,
              puntosPersonalizados: false,
              comentario: ''
            });
          }
        }
      }

      // REEMPLAZAR completamente el array de criterios evaluados
      this.criteriosEvaluados = nuevosEvaluados;

      Logger.log('✅ [Aplicar a Todos] Array reconstruido - nuevosEvaluados.length:', this.criteriosEvaluados.length);
      Logger.log('📊 [Aplicar a Todos] Criterios finales:', this.criteriosEvaluados.map(c => `${c.criterioTitulo}: ${c.nivelSeleccionado} `));

      // 🔄 IMPORTANTE: Forzar actualización completa del panel de seguimiento después de aplicar a todos
      Logger.log('🔄 [Aplicar a Todos] Forzando actualización del panel de seguimiento...');

      this.aplicarATodos = false; // Resetear checkbox

    } else {
      // APLICAR SOLO AL CRITERIO ACTUAL
      // IMPORTANTE: Guardar el nivel seleccionado para este criterio
      this.nivelesSeleccionados[this.criterioActualIndex] = nivel.titulo;

      // Obtener puntos personalizados si existen, sino usar los del nivel
      const puntosNivel = nivel.puntosMax || nivel.puntosMin || 0;
      const puntosAsignados = this.puntosPersonalizados[this.criterioActualIndex] || puntosNivel;
      const comentario = this.comentariosCriterios[this.criterioActualIndex];

      // Generar texto formateado para seguimiento (SIEMPRE actualizar, incluso en modo edición)
      this.actualizarTextoSeguimiento(nivel, puntosNivel, puntosAsignados, comentario);

      // Actualizar evaluación del criterio
      this.criteriosEvaluados[this.criterioActualIndex] = {
        criterioTitulo: this.criterioActual.titulo,
        nivelSeleccionado: nivel.titulo,
        puntosObtenidos: puntosAsignados,
        puntosPersonalizados: this.puntosPersonalizados[this.criterioActualIndex] !== undefined,
        comentario: comentario || '' // Solo incluir comentario si hay uno personalizado
      };
    }

    this.calcularPuntosTotales();

    // Actualizar panel de seguimiento en tiempo real
    this.emitToSeguimientoPanel();

    // Enviar texto al servicio de seguimiento
    this.actualizarTextoEnServicio();

    Logger.log('✅ [seleccionarNivelCriterioActual] Nivel guardado. Niveles seleccionados:', this.nivelesSeleccionados);
    Logger.log('📄 [seleccionarNivelCriterioActual] Texto de seguimiento actualizado:', this.textoSeguimientoRubrica[this.criterioActualIndex]);
  }

  actualizarPuntosPersonalizados(puntos: number) {
    this.puntosPersonalizados[this.criterioActualIndex] = puntos;

    // Actualizar la evaluación si ya hay un nivel seleccionado
    if (this.criteriosEvaluados[this.criterioActualIndex]) {
      this.criteriosEvaluados[this.criterioActualIndex].puntosObtenidos = puntos;
      this.criteriosEvaluados[this.criterioActualIndex].puntosPersonalizados = true;

      // Reconstruir el texto de seguimiento
      const evaluacion = this.criteriosEvaluados[this.criterioActualIndex];
      if (this.criterioActual && evaluacion.nivelSeleccionado) {
        const nivel = this.nivelesDelCriterioActual.find((n: any) => n.titulo === evaluacion.nivelSeleccionado);
        if (nivel) {
          const puntosNivel = nivel.puntosMax || nivel.puntosMin || 0;
          const comentario = this.comentariosCriterios[this.criterioActualIndex];
          this.actualizarTextoSeguimiento(nivel, puntosNivel, puntos, comentario);
        }
      }

      this.calcularPuntosTotales();
    }
  }

  actualizarComentarioCriterio(comentario: string) {
    this.comentariosCriterios[this.criterioActualIndex] = comentario;

    // Actualizar la evaluación si ya hay un nivel seleccionado
    if (this.criteriosEvaluados[this.criterioActualIndex]) {
      this.criteriosEvaluados[this.criterioActualIndex].comentario = comentario;

      // Reconstruir el texto de seguimiento
      const evaluacion = this.criteriosEvaluados[this.criterioActualIndex];
      if (this.criterioActual && evaluacion.nivelSeleccionado) {
        const nivel = this.nivelesDelCriterioActual.find((n: any) => n.titulo === evaluacion.nivelSeleccionado);
        if (nivel) {
          const puntosNivel = nivel.puntosMax || nivel.puntosMin || 0;
          const puntosAsignados = this.puntosPersonalizados[this.criterioActualIndex] || puntosNivel;
          this.actualizarTextoSeguimiento(nivel, puntosNivel, puntosAsignados, comentario);
        }
      }
    }
  }

  private limpiarCacheCalificaciones() {
    this.cacheCalificacionesCanvas.clear();
    this._calificacionesCargadasPorCurso.clear();
  }

  private async precargarCalificacionesCurso() {
    if (!this.cursoActivo) return;
    this._calificacionesCargadasPorCurso.set(this.cursoActivo, true);
  }

  agregarComentarioFrecuente(comentario: string) {
    if (comentario && !this.comentariosFrecuentes.includes(comentario)) {
      this.comentariosFrecuentes.push(comentario);
      // Guardar en localStorage
      localStorage.setItem('comentariosFrecuentes', JSON.stringify(this.comentariosFrecuentes));
    }
  }

  cargarComentariosFrecuentes() {
    const guardados = localStorage.getItem('comentariosFrecuentes');
    if (guardados) {
      this.comentariosFrecuentes = JSON.parse(guardados);
    }
  }

  cancelarEvaluacionRubrica() {
    this.mostrarRubrica = false;
    this.rubricaActual = null;
    this.entregaEvaluando = null;
    this.tipoEvaluando = null;
    this.criteriosEvaluados = [];
    this.puntosRubricaTotales = 0;
    this.criterioActualIndex = 0;

    this.timestampsSeguimiento = []; // Limpiar timestamps
    this.puntosPersonalizados = {};
    this.comentariosCriterios = {};
    this.nivelesSeleccionados = {}; // Limpiar niveles seleccionados

    // Limpiar panel de seguimiento al cancelar la evaluación
    this.limpiarPanelSeguimiento();
  }

  async borrarEvaluacionRubrica() {
    if (!this.cursoActivo || !this.entregaEvaluando || !this.tipoEvaluando) return;

    // Determinar qué tipo de evaluación borrar según la cabecera seleccionada
    const esGrupal = this.tipoEvaluando === 'PG';
    const identificador = esGrupal ? this.grupoSeguimientoActivo : this.estudianteSeleccionado;

    if (!identificador) return;

    const tipoTexto = esGrupal ? 'grupal (PG)' : 'individual (PI)';
    const mensaje = esGrupal
      ? `¿Estás seguro de que deseas eliminar la evaluación ${tipoTexto} de este grupo ? Esta acción no se puede deshacer.`
      : `¿Estás seguro de que deseas eliminar la evaluación ${tipoTexto} de este estudiante ? Esta acción no se puede deshacer.`;

    const alert = await this.alertController.create({
      header: '🗑️ Confirmar Borrado',
      message: mensaje,
      cssClass: 'alert-danger',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: async () => {
            if (esGrupal) {
              // Borrar SOLO evaluación grupal (PG)
              await this.dataService.borrarEvaluacion(
                this.cursoActivo!,
                this.entregaEvaluando!,
                'PG',
                this.grupoSeguimientoActivo!
              );
            } else {
              // Borrar SOLO evaluación individual (PI) del estudiante seleccionado
              await this.dataService.borrarEvaluacion(
                this.cursoActivo!,
                this.entregaEvaluando!,
                'PI',
                this.estudianteSeleccionado!
              );
            }

            // Limpiar estado actual de la rúbrica
            this.criteriosEvaluados = [];
            this.puntosRubricaTotales = 0;
            this.criterioActualIndex = 0;
            this.textoSeguimientoRubrica = [];
            this.timestampsSeguimiento = []; // Limpiar timestamps
            this.puntosPersonalizados = {};
            this.comentariosCriterios = {};
            this.nivelesSeleccionados = {}; // Limpiar niveles seleccionados

            // IMPORTANTE: Limpiar completamente el panel de seguimiento
            this.limpiarPanelSeguimiento();

            // Reinicializar criterios vacíos
            this.inicializarCriteriosRubrica();

            // IMPORTANTE: Cancelar modo edición después de borrar
            this.modoEdicionRubrica = false;

            // IMPORTANTE: Recargar datos para actualizar las tablas
            Logger.log('🔄 Recargando datos después del borrado de evaluación...');

            // Recargar el curso actual para actualizar todas las evaluaciones en las tablas
            if (this.cursoActivo) {
              await this.seleccionarCurso(this.cursoActivo);
            }

            const mensajeExito = esGrupal
              ? `Evaluación ${tipoTexto} del grupo eliminada correctamente`
              : `Evaluación ${tipoTexto} del estudiante eliminada correctamente`;

            this.mostrarError('Éxito', mensajeExito);
          }
        }
      ]
    });

    await alert.present();
  }

  get textoSeguimientoCompleto(): string {
    return this.textoSeguimientoRubrica.filter(t => t).join('\n\n');
  }

  async copiarTextoSeguimiento() {
    // Generar el texto completo con formato específico que incluye PG y PI
    const textoCompleto = this.generarTextoSeguimientoCompleto();

    if (!textoCompleto) {
      await this.mostrarError('Aviso', 'No hay evaluaciones para copiar');
      return;
    }

    try {
      // Intentar usar la API del portapapeles
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textoCompleto);
        await this.mostrarMensajeExito('Texto de seguimiento completo copiado al portapapeles');
      } else {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = textoCompleto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        await this.mostrarMensajeExito('Texto de seguimiento completo copiado al portapapeles');
      }
    } catch (error) {
      Logger.error('Error al copiar texto:', error);
      await this.mostrarError('Error', 'No se pudo copiar el texto al portapapeles');
    }
  }

  /**
   * Genera el texto completo de seguimiento con formato específico
   * Incluye tanto puntos grupales (PG) como individuales (PI)
   */
  private generarTextoSeguimientoCompleto(): string {
    if (!this.cursoActivo || !this.entregaEvaluando) {
      return '';
    }

    const estudiante = this.obtenerEstudianteSeleccionado();
    if (!estudiante) {
      return '';
    }

    // Obtener evaluaciones PG y PI para el estudiante actual
    const evaluacionPG = this.obtenerEvaluacionPG(estudiante);
    const evaluacionPI = this.obtenerEvaluacionPI(estudiante);

    if (!evaluacionPG && !evaluacionPI) {
      return '';
    }

    let texto = '';
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Encabezado general
    texto += `EVALUACIÓN COMPLETA - ${this.entregaEvaluando} \n`;
    texto += `Estudiante: ${estudiante.nombres} ${estudiante.apellidos} \n`;
    texto += `Grupo: ${estudiante.grupo} \n`;
    texto += `Fecha: ${fechaActual} \n\n`;

    // Resumen de puntos
    const puntosGrupales = evaluacionPG?.puntosTotales || 0;
    const puntosIndividuales = evaluacionPI?.puntosTotales || 0;
    const total = puntosGrupales + puntosIndividuales;

    texto += `RESUMEN DE PUNTUACIÓN: \n`;
    texto += `Puntos Grupales: PG = ${puntosGrupales} \n`;
    texto += `Puntos Individuales: PI = ${puntosIndividuales} \n`;
    texto += `Total: PG + PI = ${total} \n\n`;

    // Detalle de puntos grupales
    if (evaluacionPG) {
      texto += `DETALLE PUNTOS GRUPALES(PG) \n`;
      texto += `========================================\n\n`;
      texto += this.generarDetalleCriterios(evaluacionPG, 'Grupal');
      texto += `\n`;
    }

    // Detalle de puntos individuales
    if (evaluacionPI) {
      texto += `DETALLE PUNTOS INDIVIDUALES(PI) \n`;
      texto += `=========================================\n\n`;
      texto += this.generarDetalleCriterios(evaluacionPI, 'Individual');
    }

    return texto;
  }

  /**
   * Genera el detalle de criterios para una evaluación específica
   */
  private generarDetalleCriterios(evaluacion: any, tipo: 'Grupal' | 'Individual'): string {
    if (!evaluacion.criterios || evaluacion.criterios.length === 0) {
      return `No hay criterios evaluados para la rúbrica ${tipo.toLowerCase()}.\n\n`;
    }

    let detalle = '';

    evaluacion.criterios.forEach((criterio: any, index: number) => {
      const numeroCriterio = index + 1;

      detalle += `Criterio ${numeroCriterio}: ${criterio.criterioTitulo} \n`;

      // Obtener información del nivel si existe
      if (criterio.nivelSeleccionado) {
        detalle += `Nivel Obtenido: ${criterio.nivelSeleccionado} \n`;
      }

      // Puntos asignados
      detalle += `Puntos Asignados: ${criterio.puntosObtenidos || 0} `;

      // Agregar comentarios si los hay
      if (criterio.comentario && criterio.comentario.trim()) {
        detalle += ` (${criterio.comentario.trim()})`;
      }

      detalle += `\n`;

      // Contenido del criterio de la rúbrica
      if (criterio.nivelDescripcion) {
        detalle += `Descripción: ${criterio.nivelDescripcion} \n`;
      } else if (criterio.criterioDescripcion) {
        detalle += `Descripción: ${criterio.criterioDescripcion} \n`;
      }

      detalle += `\n`;
    });

    return detalle;
  }

  /**
   * Obtiene la evaluación PG para un estudiante específico
   */
  private obtenerEvaluacionPG(estudiante: any): any {
    if (!this.cursoActivo || !this.entregaEvaluando) return null;

    // Intentar obtener evaluación PG individual primero (por correo)
    const evaluacionIndividual = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      'PG',
      estudiante.correo
    );

    if (evaluacionIndividual) {
      return evaluacionIndividual;
    }

    // Si no hay individual, buscar por subgrupo (evaluación grupal normal)
    const evaluacionGrupal = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      'PG',
      estudiante.grupo
    );

    return evaluacionGrupal;
  }

  /**
   * Obtiene la evaluación PI para un estudiante específico
   */
  private obtenerEvaluacionPI(estudiante: any): any {
    if (!this.cursoActivo || !this.entregaEvaluando) return null;

    const evaluacionIndividual = this.dataService.getEvaluacion(
      this.cursoActivo,
      this.entregaEvaluando,
      'PI',
      estudiante.correo
    );

    return evaluacionIndividual;
  }

  private async mostrarMensajeExito(mensaje: string) {
    const alert = await this.alertController.create({
      header: '✅ Éxito',
      message: mensaje,
      cssClass: 'alert-success',
      buttons: ['OK']
    });
    await alert.present();
  }

  // === MÉTODOS ELIMINADOS - CÓDIGO ANTIGUO SPA ===
  // seleccionarPagina() - ya no se usa, era para navegación de páginas en panel lateral

  obtenerNombreCompleto(correo: string): string {
    const estudiante = this.estudiantesActuales.find(est => est.correo === correo);
    if (estudiante) {
      return `${estudiante.nombres} ${estudiante.apellidos} `;
    }
    return correo;
  }

  // Método evaluarRapido eliminado junto con la página de evaluación
  // evaluarRapido(entrega: 'E1' | 'E2' | 'EF') {
  //   // Funcionalidad movida al panel de seguimiento lateral
  // }

  // === MÉTODOS PARA EL PANEL REDIMENSIONABLE ===

  /**
   * Inicializa el gesto de redimensionamiento usando Ionic Gestures API
   * Se debe llamar en ngAfterViewInit después de que el elemento esté disponible
   */
  inicializarGestoRedimensionar(element: HTMLElement): void {
    const gesture = this.gestureCtrl.create({
      el: element,
      gestureName: 'resize-panel',
      onStart: () => {
        this.redimensionandoPanel = true;
      },
      onMove: (detail) => {
        if (!this.redimensionandoPanel) return;

        const nuevoAncho = window.innerWidth - detail.currentX;

        if (nuevoAncho >= this.anchoMinimo && nuevoAncho <= this.anchoMaximo) {
          this.anchoPanel = nuevoAncho;
          // Usar propiedad vinculada en lugar de manipular DOM directamente
          this.actualizarAnchoPanel(nuevoAncho);
        }
      },
      onEnd: () => {
        this.redimensionandoPanel = false;
      }
    });

    gesture.enable();
  }

  /**
   * Actualiza el ancho del panel de forma reactiva
   */
  private actualizarAnchoPanel(nuevoAncho: number): void {
    this.anchoPanel = nuevoAncho;
    // El ancho se aplicará mediante [ngStyle] en el template
  }

  // === MÉTODOS AUXILIARES PARA FILTROS ===

  extraerNumeroGrupo(grupo: string): string {
    const match = grupo.match(/G(\d+)/i);
    return match ? match[1] : grupo;
  }

  obtenerEstudianteSeleccionado(): Estudiante | null {
    if (!this.estudianteSeleccionado) return null;
    return this.estudiantesActuales.find(est => est.correo === this.estudianteSeleccionado) || null;
  }

  /**
   * Limpia la rúbrica para evitar que se muestren datos del estudiante anterior
   * Asegura que cada integrante tenga evaluaciones independientes y persistentes
   */
  private limpiarRubricaParaNuevoEstudiante() {
    Logger.log('🧹 [limpiarRubricaParaNuevoEstudiante] Limpiando rúbrica para nuevo estudiante');

    // Limpiar niveles seleccionados
    this.nivelesSeleccionados = {};

    // Limpiar puntos personalizados
    this.puntosPersonalizados = {};

    // Limpiar comentarios de criterios
    this.comentariosCriterios = {};

    // Limpiar criterios evaluados
    this.criteriosEvaluados = [];

    // Resetear puntos totales
    this.puntosRubricaTotales = 0;

    // Limpiar texto de seguimiento individual (mantener grupal)
    if (this.tipoEvaluando === 'PI') {
      this.textoSeguimientoRubricaIndividual = [];
    }

    // Salir del modo edición
    this.modoEdicionRubrica = false;

    Logger.log('✅ [limpiarRubricaParaNuevoEstudiante] Rúbrica limpiada correctamente');
  }

  /**
   * Limpia la rúbrica al cambiar de subgrupo para mostrar rúbrica en blanco
   * Se ejecuta solo si no está habilitada la aplicación masiva de rúbrica grupal
   */
  private limpiarRubricaParaNuevoSubgrupo() {
    Logger.log('🧹 [limpiarRubricaParaNuevoSubgrupo] Limpiando rúbrica por cambio de subgrupo');

    // Limpiar niveles seleccionados
    this.nivelesSeleccionados = {};

    // Limpiar puntos personalizados
    this.puntosPersonalizados = {};

    // Limpiar comentarios de criterios
    this.comentariosCriterios = {};

    // Limpiar criterios evaluados
    this.criteriosEvaluados = [];

    // Resetear puntos totales
    this.puntosRubricaTotales = 0;

    // Limpiar textos de seguimiento
    this.textoSeguimientoRubricaGrupal = [];
    this.textoSeguimientoRubricaIndividual = [];

    // Salir del modo edición
    this.modoEdicionRubrica = false;

    // Limpiar selección de estudiantes para empezar fresh
    this.estudiantesSeleccionados.clear();
    this.estudianteSeleccionado = null;

    // Reinicializar criterios de la rúbrica para mostrarla en blanco
    if (this.rubricaActual) {
      this.inicializarCriteriosRubrica();
      Logger.log('🔄 [limpiarRubricaParaNuevoSubgrupo] Criterios reinicializados para rúbrica en blanco');
    }

    Logger.log('✅ [limpiarRubricaParaNuevoSubgrupo] Rúbrica limpiada para nuevo subgrupo');
  }

  // === MÉTODOS PARA METADATA DE CURSOS ===

  getCursoMetadata() {
    if (!this.cursoActivo) return null;
    const uiState = this.dataService.getUIState();
    return uiState.courseStates?.[this.cursoActivo]?.metadata || null;
  }

  getCursoMetadataForCourse(curso: string) {
    const uiState = this.dataService.getUIState();
    return uiState.courseStates?.[curso]?.metadata || null;
  }

  /**
   * Extrae el número de un grupo (G1 -> 1, G2 -> 2, etc.)
   */
  getNumeroGrupo(grupo: string): string {
    const match = grupo.match(/G(\d+)/i);
    return match ? match[1] : grupo;
  }

  /**
   * Selecciona un grupo para seguimiento y filtra estudiantes
   */
  seleccionarGrupoSeguimiento(grupo: string | null): void {
    // Comportamiento normal: cambiar el grupo activo
    const grupoAnterior = this.grupoSeguimientoActivo;
    const cambioDeGrupo = grupoAnterior !== grupo;

    // OPTIMIZACIÓN: Si no cambió el grupo, no hacer nada
    if (!cambioDeGrupo) {
      Logger.log('⚡ [seleccionarGrupoSeguimiento] Grupo ya seleccionado, evitando recarga:', grupo);
      return;
    }

    this.grupoSeguimientoActivo = grupo;
    this.filtroGrupo = grupo || 'todos';

    // Actualizar el servicio de seguimiento para sincronizar con el panel
    if (!this.actualizandoGrupoDesdeSuscripcion) {
      const grupoNum = grupo ? parseInt(grupo.replace(/\D/g, '')) : 0;
      this.seguimientoService.setGrupoSeleccionado(grupoNum);
    }

    // Si cambió de grupo y hay rúbrica activa, limpiarla (comportamiento normal)
    if (this.mostrarRubrica) {
      Logger.log('🧹 [seleccionarGrupoSeguimiento] Limpiando rúbrica por cambio de grupo');
      this.limpiarRubricaParaNuevoSubgrupo();
    }

    this.aplicarFiltros();

    // Guardar grupo seleccionado en CourseState para persistencia por curso
    if (this.cursoActivo) {
      this.dataService.updateCourseState(this.cursoActivo, {
        filtroGrupo: grupo || 'todos'
      });
    }

    // También mantener en UIState global (para compatibilidad)
    this.dataService.updateUIState({
      grupoSeguimientoActivo: grupo
    });

    // Cargar comentarios del grupo seleccionado
    this.cargarComentariosGrupo();

    // Forzar una única detección de cambios al final del proceso
    this.cdr.detectChanges();
  }



  /**
   * Alterna entre mostrar nombre completo y nombre corto en los botones de curso
   */
  toggleMostrarNombreCorto(): void {
    this.mostrarNombreCorto = !this.mostrarNombreCorto;

    // Persistir la preferencia en UIState
    this.dataService.updateUIState({
      mostrarNombreCorto: this.mostrarNombreCorto
    });

    Logger.log('🔤 [InicioPage] Mostrar nombre corto:', this.mostrarNombreCorto ? 'Activado' : 'Desactivado');
  }

  // === MÉTODOS PARA COMENTARIOS DE GRUPO ===

  /**
   * Carga los comentarios del grupo actualmente seleccionado
   */
  cargarComentariosGrupo(): void {
    if (!this.cursoActivo || !this.grupoSeguimientoActivo) {
      this.comentariosGrupoActual = [];
      return;
    }

    this.comentariosGrupoActual = this.dataService.getComentariosGrupo(
      this.cursoActivo,
      this.grupoSeguimientoActivo
    );

    Logger.log('💬 [InicioPage] Comentarios cargados:', this.comentariosGrupoActual.length);
  }

  /**
   * Agrega un nuevo comentario al grupo actual
   */
  async agregarComentario(): Promise<void> {
    if (!this.nuevoComentario?.trim() || !this.cursoActivo || !this.grupoSeguimientoActivo) {
      return;
    }

    await this.dataService.addComentarioGrupo(
      this.cursoActivo,
      this.grupoSeguimientoActivo,
      this.nuevoComentario.trim()
    );

    // Limpiar el campo y recargar comentarios
    this.nuevoComentario = '';
    this.cargarComentariosGrupo();

    Logger.log('✅ [InicioPage] Comentario agregado exitosamente');
  }

  /**
   * Elimina un comentario del grupo
   */
  async eliminarComentario(comentarioId: string): Promise<void> {
    if (!this.cursoActivo || !this.grupoSeguimientoActivo) {
      return;
    }

    const alert = await this.alertController.create({
      header: '🗑️ Confirmar Eliminación',
      message: '¿Está seguro de eliminar este comentario?',
      cssClass: 'alert-danger',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.dataService.deleteComentarioGrupo(
              this.cursoActivo!,
              this.grupoSeguimientoActivo!,
              comentarioId
            );
            this.cargarComentariosGrupo();
            Logger.log('🗑️ [InicioPage] Comentario eliminado');
            await this.toastService.success('Comentario eliminado');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Inicia la edición de un comentario
   */
  iniciarEdicionComentario(comentarioId: string, textoActual: string): void {
    this.comentarioEditando = comentarioId;
    this.textoEditando = textoActual;
    Logger.log('✏️ [InicioPage] Iniciando edición de comentario:', comentarioId);
  }

  /**
   * Cancela la edición de un comentario
   */
  cancelarEdicionComentario(): void {
    this.comentarioEditando = null;
    this.textoEditando = '';
    Logger.log('❌ [InicioPage] Edición cancelada');
  }

  /**
   * Guarda los cambios de un comentario editado
   */
  async guardarEdicionComentario(comentarioId: string): Promise<void> {
    if (!this.cursoActivo || !this.grupoSeguimientoActivo || !this.textoEditando.trim()) {
      return;
    }

    await this.dataService.updateComentarioGrupo(
      this.cursoActivo,
      this.grupoSeguimientoActivo,
      comentarioId,
      this.textoEditando.trim()
    );

    // Limpiar estado de edición y recargar comentarios
    this.comentarioEditando = null;
    this.textoEditando = '';
    this.cargarComentariosGrupo();

    Logger.log('✅ [InicioPage] Comentario actualizado exitosamente');
    await this.toastService.success('Comentario actualizado');
  }

  /**
   * Formatea la fecha del comentario
   */
  formatearFecha(fecha: Date | string): string {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const ahora = new Date();
    const diff = ahora.getTime() - d.getTime();
    const minutos = Math.floor(diff / 60000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;

    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias} d`;

    // Formato completo
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleDateString('es-ES', opciones);
  }

  /**
   * Toggle del menú FAB en móvil
   * @deprecated Ya no es necesario con ion-fab nativo
   */
  toggleMenuFab(): void {
    // Ion-fab maneja su propio estado
    this.menuFabAbierto = !this.menuFabAbierto;
  }

  /**
   * Cierra el menú FAB después de ejecutar una acción
   * @deprecated Ya no es necesario con ion-fab nativo
   */
  cerrarMenuFab(): void {
    // Ion-fab se cierra automáticamente
    this.menuFabAbierto = false;
  }

  /**
   * Getter para verificar si hay un grupo anterior disponible
   */
  get grupoAnteriorDisponible(): boolean {
    if (!this.grupoSeguimientoActivo || this.gruposDisponibles.length === 0) {
      return false;
    }
    const indexActual = this.gruposDisponibles.indexOf(this.grupoSeguimientoActivo);
    return indexActual > 0;
  }

  /**
   * Getter para verificar si hay un grupo siguiente disponible
   */
  get grupoSiguienteDisponible(): boolean {
    if (!this.grupoSeguimientoActivo || this.gruposDisponibles.length === 0) {
      return false;
    }
    const indexActual = this.gruposDisponibles.indexOf(this.grupoSeguimientoActivo);
    return indexActual < this.gruposDisponibles.length - 1;
  }

  /**
   * Navega al grupo anterior
   */
  retrocederGrupo(): void {
    if (!this.grupoAnteriorDisponible) return;

    const indexActual = this.gruposDisponibles.indexOf(this.grupoSeguimientoActivo!);
    const grupoAnterior = this.gruposDisponibles[indexActual - 1];

    this.grupoSeguimientoActivo = grupoAnterior;
    this.filtroGrupo = grupoAnterior;

    Logger.log('⬅️ [retrocederGrupo] Navegando a grupo anterior:', {
      grupoAnterior,
      hayRubricaActiva: this.mostrarRubrica
    });

    // Actualizar el servicio de seguimiento
    const grupoNum = parseInt(grupoAnterior.replace(/\D/g, ''));
    this.seguimientoService.setGrupoSeleccionado(grupoNum);

    // Guardar en CourseState para persistencia
    if (this.cursoActivo) {
      this.dataService.updateCourseState(this.cursoActivo, {
        filtroGrupo: grupoAnterior
      });
    }

    // Cargar comentarios del grupo
    this.cargarComentariosGrupo();

    // Si hay una rúbrica activa, recargarla para el nuevo grupo
    if (this.mostrarRubrica && this.entregaEvaluando && this.tipoEvaluando) {
      Logger.log('📊 [retrocederGrupo] Recargando evaluación para grupo anterior');

      // Limpiar estado primero
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();

      // Cargar evaluación del grupo anterior
      this.cargarEvaluacionGuardada().then(() => {
        Logger.log('✅ [retrocederGrupo] Evaluación cargada:', {
          grupo: grupoAnterior,
          hayEvaluacion: !!this.evaluacionActual
        });
        this.emitToSeguimientoPanel();
        this.cdr.markForCheck();
      });
    } else {
      // Si no hay rúbrica activa, limpiar el panel
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();
      this.limpiarPanelSeguimiento();
      this.cdr.markForCheck();
    }
  }

  /**
   * Navega al grupo siguiente
   */
  avanzarGrupo(): void {
    if (!this.grupoSiguienteDisponible) return;

    const indexActual = this.gruposDisponibles.indexOf(this.grupoSeguimientoActivo!);
    const grupoSiguiente = this.gruposDisponibles[indexActual + 1];

    this.grupoSeguimientoActivo = grupoSiguiente;
    this.filtroGrupo = grupoSiguiente;

    Logger.log('➡️ [avanzarGrupo] Navegando a grupo siguiente:', {
      grupoSiguiente,
      hayRubricaActiva: this.mostrarRubrica
    });

    // Actualizar el servicio de seguimiento
    const grupoNum = parseInt(grupoSiguiente.replace(/\D/g, ''));
    this.seguimientoService.setGrupoSeleccionado(grupoNum);

    // Guardar en CourseState para persistencia
    if (this.cursoActivo) {
      this.dataService.updateCourseState(this.cursoActivo, {
        filtroGrupo: grupoSiguiente
      });
    }

    // Cargar comentarios del grupo
    this.cargarComentariosGrupo();

    // Si hay una rúbrica activa, recargarla para el nuevo grupo
    if (this.mostrarRubrica && this.entregaEvaluando && this.tipoEvaluando) {
      Logger.log('📊 [avanzarGrupo] Recargando evaluación para grupo siguiente');

      // Limpiar estado primero
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();

      // Cargar evaluación del grupo siguiente
      this.cargarEvaluacionGuardada().then(() => {
        Logger.log('✅ [avanzarGrupo] Evaluación cargada:', {
          grupo: grupoSiguiente,
          hayEvaluacion: !!this.evaluacionActual
        });
        this.emitToSeguimientoPanel();
        this.cdr.markForCheck();
      });
    } else {
      // Si no hay rúbrica activa, limpiar el panel
      this.evaluacionActual = null;
      this.reiniciarEstadoEvaluacion();
      this.limpiarPanelSeguimiento();
      this.cdr.markForCheck();
    }
  }

  // === MÉTODOS PARA PERSISTENCIA POR SUBGRUPO ===

  /**
   * Inicializa el objeto SeguimientoGrupo en el servicio
   */
  private inicializarSeguimientoGrupo(): void {
    if (!this.cursoActivo || !this.filtroGrupo) return;

    // Verificar si hay evaluaciones en cache para este grupo
    const key = this.getCacheKey();
    const cached = key ? this.evaluacionesCache.get(key) : undefined;

    const seguimientoGrupo = {
      curso: this.cursoActivo,
      grupo: this.filtroGrupo,
      comentarios: [],
      evaluacionGrupal: cached?.grupal,
      evaluacionIndividual: cached?.individual,
      textoRubricaGrupal: [],
      textoRubricaIndividual: [],
      timestampsGrupal: [],
      timestampsIndividual: []
    };

    this.seguimientoService.setSeguimiento(seguimientoGrupo);

    const grupoNumero = parseInt(this.filtroGrupo.replace(/\D/g, ''));
    this.seguimientoService.setGrupoSeleccionado(grupoNumero);

    Logger.log('🎯 Seguimiento inicializado:', this.cursoActivo, this.filtroGrupo, cached ? 'con cache' : 'sin cache');
  }

  /**
   * Genera clave única para el cache de evaluaciones
   */
  private getCacheKey(): string {
    if (!this.cursoActivo || !this.filtroGrupo || !this.entregaEvaluando) {
      return '';
    }
    return `${this.cursoActivo}_${this.filtroGrupo}_${this.entregaEvaluando} `;
  }

  /**
   * Guarda el estado actual en el cache con timestamp
   */
  private guardarEnCache(): void {
    const key = this.getCacheKey();
    if (!key || !this.tipoEvaluando) return;

    const cached = this.evaluacionesCache.get(key) || { timestamp: Date.now() };

    if (this.tipoEvaluando === 'PG') {
      cached.grupal = this.buildEvaluacionRubrica();
    } else {
      cached.individual = this.buildEvaluacionRubrica();
    }

    cached.timestamp = Date.now(); // Actualizar timestamp
    this.evaluacionesCache.set(key, cached);
    // Log deshabilitado para evitar spam
    // Logger.log('💾 Evaluación guardada en cache:', key, this.tipoEvaluando);
  }

  /**
   * Restaura el estado desde el cache verificando TTL
   */
  private restaurarDesdeCache(): boolean {
    const key = this.getCacheKey();
    if (!key || !this.tipoEvaluando) return false;

    const cached = this.evaluacionesCache.get(key);
    if (!cached) return false;

    // Verificar si el cache expiró
    const now = Date.now();
    if (cached.timestamp && (now - cached.timestamp) > this.CACHE_TTL) {
      // Cache expirado, eliminarlo
      this.evaluacionesCache.delete(key);
      return false;
    }

    const evaluacion = this.tipoEvaluando === 'PG' ? cached.grupal : cached.individual;
    if (!evaluacion) return false;

    // Restaurar criteriosEvaluados y nivelesSeleccionados desde la evaluación cacheada
    this.criteriosEvaluados = evaluacion.criterios.map((crit: any, index: number) => {
      // Actualizar también nivelesSeleccionados para la UI
      this.nivelesSeleccionados[index] = crit.nivelSeleccionado;
      this.comentariosCriterios[index] = crit.comentario || '';

      return {
        criterioTitulo: crit.nombreCriterio,
        nivelSeleccionado: crit.nivelSeleccionado,
        puntosObtenidos: crit.puntosAsignados,
        comentario: crit.comentario || ''
      };
    });

    this.puntosRubricaTotales = evaluacion.puntosTotal;

    // Reconstruir el texto de seguimiento
    if (this.tipoEvaluando === 'PG') {
      this.textoSeguimientoRubricaGrupal = this.generarTextoSeguimiento(evaluacion.criterios);
    } else {
      this.textoSeguimientoRubricaIndividual = this.generarTextoSeguimiento(evaluacion.criterios);
    }

    Logger.log('📂 Evaluación restaurada desde cache:', key, this.tipoEvaluando);
    return true;
  }

  /**
   * Genera el texto de seguimiento desde criterios evaluados
   */
  private generarTextoSeguimiento(criterios: any[]): string[] {
    return criterios.map((crit: any) => {
      const comentarioParte = crit.comentario ? `\n  💬 ${crit.comentario} ` : '';
      return `📌 ${crit.nombreCriterio} \n  ✓ ${crit.nivelSeleccionado} \n  📊 ${crit.puntosAsignados} puntos${comentarioParte} `;
    });
  }

  /**
   * Construye objeto EvaluacionRubrica desde el estado actual
   */
  private buildEvaluacionRubrica(): any {
    if (!this.rubricaActual || !this.tipoEvaluando) return null;

    Logger.log('🔧 [buildEvaluacionRubrica] Criterios totales:', this.criteriosEvaluados.length);

    // Filtrar solo criterios que realmente han sido evaluados (tienen nivel seleccionado Y título válido)
    const criteriosEvaluados = this.criteriosEvaluados.filter((criterio: any, index: number) => {
      const tieneNivel = criterio.nivelSeleccionado && criterio.nivelSeleccionado.trim() !== '';
      const tieneTitulo = criterio.criterioTitulo && criterio.criterioTitulo.trim() !== '';

      Logger.log(`🔍 Criterio ${index}: "${criterio.criterioTitulo}" - Nivel: "${criterio.nivelSeleccionado}" - Válido: ${tieneNivel && tieneTitulo} `);

      return tieneNivel && tieneTitulo;
    });

    Logger.log('✅ [buildEvaluacionRubrica] Criterios evaluados válidos:', criteriosEvaluados.length);

    // Si no hay criterios evaluados, retornar null para evitar mostrar contenido vacío
    if (criteriosEvaluados.length === 0) {
      return null;
    }

    const criterios = criteriosEvaluados.map((criterio: any, mapIndex: number) => {
      // Encontrar el índice original en la rúbrica usando el título del criterio (más seguro)
      const indexOriginal = this.criteriosEvaluados.findIndex((c: any) =>
        c.criterioTitulo === criterio.criterioTitulo && c === criterio
      );

      if (indexOriginal === -1) {
        Logger.warn('⚠️ No se encontró índice original para criterio:', criterio.criterioTitulo);
        return null;
      }

      const criterioRubrica = this.rubricaActual!.criterios[indexOriginal];

      if (!criterioRubrica) {
        Logger.warn('⚠️ No se encontró criterioRubrica para índice:', indexOriginal);
        return null;
      }

      Logger.log(`✅ Mapeando criterio ${mapIndex}: "${criterio.criterioTitulo}"(índice original: ${indexOriginal})`);

      return {
        nombreCriterio: criterio.criterioTitulo,
        niveles: criterioRubrica.nivelesDetalle.map((nivel: any) => ({
          nombre: nivel.titulo,
          intervalo: nivel.puntos || `${nivel.puntosMin || 0} -${nivel.puntosMax || 0} `,
          color: nivel.color || '#6c757d',
          descripcion: nivel.descripcion || ''
        })),
        nivelSeleccionado: criterio.nivelSeleccionado,
        puntosAsignados: criterio.puntosObtenidos,
        comentario: criterio.comentario
      };
    }).filter(Boolean); // Filtrar elementos null

    Logger.log('📊 [buildEvaluacionRubrica] Criterios finales para panel:', criterios.length);

    return {
      tipo: this.tipoEvaluando,
      puntosTotal: this.puntosRubricaTotales,
      criterios,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Actualiza el panel de seguimiento con la evaluación actual
   */
  private emitToSeguimientoPanel(): void {
    const evaluacion = this.buildEvaluacionRubrica();
    if (!this.filtroGrupo) {
      Logger.log('⚠️ No se puede emitir al panel: sin filtroGrupo');
      return;
    }

    // Verificar que el seguimiento esté inicializado
    const seguimientoActual = this.seguimientoService.getSeguimiento();
    if (!seguimientoActual) {
      Logger.log('🔄 Reinicializando seguimiento...');
      this.inicializarSeguimientoGrupo();
    }

    const grupoNumero = parseInt(this.filtroGrupo.replace(/\D/g, ''));
    this.seguimientoService.setGrupoSeleccionado(grupoNumero);

    // Actualizar la entrega actual
    this.seguimientoService.actualizarEntregaActual(this.entregaEvaluando);

    // Actualizar el tipo de evaluación activa
    this.seguimientoService.actualizarTipoEvaluacionActiva(this.tipoEvaluando);

    if (evaluacion) {
      this.seguimientoService.actualizarEvaluacionRubrica(this.tipoEvaluando!, evaluacion);

      // Si es evaluación individual, enviar información del estudiante
      if (this.tipoEvaluando === 'PI' && this.estudianteSeleccionado) {
        const estudiante = this.estudiantesFiltrados.find(e => e.correo === this.estudianteSeleccionado);
        if (estudiante) {
          this.seguimientoService.actualizarIntegranteSeleccionado({
            correo: estudiante.correo,
            nombres: estudiante.nombres,
            apellidos: estudiante.apellidos
          });
        }
      } else if (this.tipoEvaluando === 'PG') {
        // Limpiar integrante seleccionado si es evaluación grupal
        this.seguimientoService.actualizarIntegranteSeleccionado(null);
      }

      Logger.log('📊 Panel actualizado:', {
        tipo: this.tipoEvaluando,
        grupo: grupoNumero,
        criterios: evaluacion.criterios.length,
        puntos: evaluacion.puntosTotal
      });
    } else {
      // Si no hay evaluación, limpiar la evaluación del tipo actual
      const seguimiento = this.seguimientoService.getSeguimiento();
      if (seguimiento) {
        if (this.tipoEvaluando === 'PG') {
          seguimiento.evaluacionGrupal = undefined;
        } else if (this.tipoEvaluando === 'PI') {
          seguimiento.evaluacionIndividual = undefined;
        }
        this.seguimientoService.setSeguimiento(seguimiento);
      }
      Logger.log('🧹 Panel limpiado para tipo:', this.tipoEvaluando);
    }
  }

  /**
   * Actualiza el texto de seguimiento en el servicio
   */
  private actualizarTextoEnServicio(): void {
    if (!this.tipoEvaluando) return;

    const textos = this.tipoEvaluando === 'PG'
      ? this.textoSeguimientoRubricaGrupal
      : this.textoSeguimientoRubricaIndividual;

    const timestamps = this.timestampsSeguimiento;

    this.seguimientoService.actualizarTextoRubrica(this.tipoEvaluando, textos, timestamps);

    Logger.log('📝 Texto actualizado en servicio:', {
      tipo: this.tipoEvaluando,
      parrafos: textos.length,
      ultimoTexto: textos[textos.length - 1]
    });
  }

  // === MÉTODOS FALTANTES IMPLEMENTADOS ===

  /**
   * Obtiene los integrantes del grupo actual para mostrar en la lista
   */
  obtenerIntegrantesGrupo(): Estudiante[] {
    return this.estudiantesFiltrados;
  }

  /**
   * Selecciona un estudiante y muestra su correo en un toast
   */
  async seleccionarEstudiante(correo: string) {
    Logger.log('📧 Estudiante seleccionado:', correo);

    // Si hay un modo de selección de estado activo, agregar/quitar estado
    if (this.modoSeleccionEstado && this.filtroGrupo !== 'todos' && this.entregaEvaluando) {
      this.toggleEstadoEstudiante(correo, this.modoSeleccionEstado);
      return;
    }

    this.estudianteSeleccionado = correo;
    this.cdr.detectChanges();
  }

  // === MÉTODOS PARA ESTADOS DE ESTUDIANTES (Ok/Solo/Ausente) ===

  /**
   * Activa/desactiva el modo de selección de estado
   */
  toggleModoSeleccionEstado(modo: 'ok' | 'solo' | 'ausente') {
    if (this.modoSeleccionEstado === modo) {
      this.modoSeleccionEstado = null;
    } else {
      this.modoSeleccionEstado = modo;
    }
    this.cdr.detectChanges();
  }

  /**
   * Agrega o quita un estado a un estudiante (usa el servicio)
   */
  toggleEstadoEstudiante(correo: string, estado: 'ok' | 'solo' | 'ausente') {
    if (this.filtroGrupo === 'todos' || !this.entregaEvaluando) return;

    // Obtener estado actual
    const estadoActual = this.seguimientoService.getEstadoEstudiante(this.filtroGrupo, this.entregaEvaluando, correo);

    // Toggle: si ya tiene el estado, quitarlo; si no, ponerlo
    const nuevoEstado: EstadoEstudiante = estadoActual === estado ? null : estado;
    this.seguimientoService.setEstadoEstudiante(this.filtroGrupo, this.entregaEvaluando, correo, nuevoEstado);

    // Actualizar anotaciones
    this.actualizarAnotacionesDesdeEstados();
    this.cdr.detectChanges();
  }

  /**
   * Verifica si un estudiante tiene un estado específico (usa el servicio)
   */
  tieneEstado(correo: string, estado: 'ok' | 'solo' | 'ausente'): boolean {
    if (this.filtroGrupo === 'todos' || !this.entregaEvaluando) return false;
    return this.seguimientoService.getEstadoEstudiante(this.filtroGrupo, this.entregaEvaluando, correo) === estado;
  }

  /**
   * Obtiene el estado de un estudiante (usa el servicio)
   */
  getEstadoEstudiante(correo: string): EstadoEstudiante {
    if (this.filtroGrupo === 'todos' || !this.entregaEvaluando) return null;
    return this.seguimientoService.getEstadoEstudiante(this.filtroGrupo, this.entregaEvaluando, correo);
  }

  /**
   * Actualiza las anotaciones basándose en los estados actuales
   */
  actualizarAnotacionesDesdeEstados() {
    if (this.filtroGrupo === 'todos' || !this.entregaEvaluando) {
      this.anotacionesGrupo = '';
      return;
    }

    const estados = this.seguimientoService.getEstadosGrupoEntrega(this.filtroGrupo, this.entregaEvaluando);
    const lineas: string[] = [];

    // Agregar ok (sin encabezado, solo nombres con icono)
    estados.ok.forEach(correo => {
      const estudiante = this.estudiantesFiltrados.find(e => e.correo === correo);
      if (estudiante) {
        lineas.push(`✅ ${estudiante.nombres} ${estudiante.apellidos}`);
      }
    });

    // Agregar solos (sin encabezado, solo nombres con icono)
    estados.solos.forEach(correo => {
      const estudiante = this.estudiantesFiltrados.find(e => e.correo === correo);
      if (estudiante) {
        lineas.push(`🔀 ${estudiante.nombres} ${estudiante.apellidos}`);
      }
    });

    // Agregar ausentes (sin encabezado, solo nombres con icono)
    estados.ausentes.forEach(correo => {
      const estudiante = this.estudiantesFiltrados.find(e => e.correo === correo);
      if (estudiante) {
        lineas.push(`❌ ${estudiante.nombres} ${estudiante.apellidos}`);
      }
    });

    this.anotacionesGrupo = lineas.join('\n');
  }

  /**
   * Limpia todos los estados del grupo actual (usa el servicio)
   */
  limpiarEstadosGrupo() {
    if (this.filtroGrupo === 'todos' || !this.entregaEvaluando) return;

    this.seguimientoService.limpiarEstadosGrupoEntrega(this.filtroGrupo, this.entregaEvaluando);
    this.anotacionesGrupo = '';
    this.modoSeleccionEstado = null;
    this.cdr.detectChanges();
  }

  /**
   * Obtiene el color para el badge de calificación
   */
  obtenerColorCalificacion(valor: number): string {
    if (valor >= 4.0) return 'success';
    if (valor >= 3.0) return 'warning';
    return 'danger';
  }

  /**
   * Obtiene la calificación total (PG + PI) para mostrar en el panel
   */
  obtenerCalificacionPanel(estudiante: Estudiante, entrega: string): number {
    if (!this.cursoActivo) {
      Logger.warn('⚠️ [obtenerCalificacionPanel] No hay curso activo');
      return 0;
    }

    const pg = this.dataService.getEvaluacion(this.cursoActivo!, entrega, 'PG', estudiante.grupo)?.puntosTotales || 0;
    const pi = this.dataService.getEvaluacion(this.cursoActivo!, entrega, 'PI', estudiante.correo)?.puntosTotales || 0;

    const total = pg + pi;

    // Log de depuración (solo si hay puntaje)
    if (total > 0) {
      Logger.log(`📊[obtenerCalificacionPanel] ${estudiante.apellidos}: ${entrega} = PG(${pg}) + PI(${pi}) = ${total} `);
    }

    return total;
  }

  /**
   * Obtiene la suma total de todas las entregas
   */
  obtenerTotalCalificaciones(estudiante: Estudiante): number {
    const e1 = this.obtenerCalificacionPanel(estudiante, 'E1');
    const e2 = this.obtenerCalificacionPanel(estudiante, 'E2');
    const ef = this.obtenerCalificacionPanel(estudiante, 'EF');
    return e1 + e2 + ef;
  }

  /**
   * Actualiza el texto de seguimiento.
   * Acepta parámetros opcionales para compatibilidad con llamadas existentes,
   * pero regenera todo el texto basado en el estado actual.
   */
  actualizarTextoSeguimiento(nivel?: any, puntosBase?: number, puntosAsignados?: number, comentario?: string): void {
    // Los parámetros se ignoran porque regeneramos todo el texto desde el estado (criteriosEvaluados)
    // Esto asegura consistencia total.
    this.actualizarTextoEnServicio();
  }

  // === MÉTODOS PARA DRAG AND DROP DE CURSOS ===

  /**
   * Inicia el drag del curso
   */
  onDragStart(event: DragEvent, curso: string) {
    if (!event.dataTransfer) return;

    this.elementoArrastrado = curso;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', curso);

    // Agregar clase visual al elemento
    const target = event.target as HTMLElement;
    target.classList.add('dragging');

    // Agregar clase al segmento para mostrar indicador
    const segment = document.querySelector('.course-segment');
    if (segment) {
      segment.classList.add('drag-active');
    }

    Logger.log('🎯 [DragDrop] Iniciando drag de curso:', curso);
  }

  /**
   * Maneja el evento dragover para permitir el drop
   */
  onDragOver(event: DragEvent, cursoDestino: string) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';

    // Actualizar el índice de destino
    this.indiceDragDestino = this.cursosOrdenados.indexOf(cursoDestino);

    // Agregar clase visual de drop zone
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  /**
   * Limpia las clases visuales cuando sale del área de drop
   */
  onDragLeave(event: DragEvent) {
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  /**
   * Maneja el drop del elemento
   */
  onDrop(event: DragEvent, cursoDestino: string) {
    event.preventDefault();

    if (!this.elementoArrastrado || this.elementoArrastrado === cursoDestino) {
      this.limpiarEstadoDrag();
      return;
    }

    const indiceOrigen = this.cursosOrdenados.indexOf(this.elementoArrastrado);
    const indiceDestino = this.cursosOrdenados.indexOf(cursoDestino);

    if (indiceOrigen !== -1 && indiceDestino !== -1) {
      // Crear nuevo array con el orden actualizado
      const nuevosOrden = [...this.cursosOrdenados];
      const cursoMovido = nuevosOrden.splice(indiceOrigen, 1)[0];
      nuevosOrden.splice(indiceDestino, 0, cursoMovido);

      this.cursosOrdenados = nuevosOrden;

      // Guardar el nuevo orden en el localStorage
      this.guardarOrdenCursos();

      Logger.log('🎯 [DragDrop] Curso reordenado:', this.elementoArrastrado, 'movido a posición de:', cursoDestino);
      Logger.log('📋 [DragDrop] Nuevo orden:', this.cursosOrdenados);
    }

    this.limpiarEstadoDrag();
  }

  /**
   * Limpia el estado de drag cuando termina
   */
  onDragEnd(event: DragEvent) {
    this.limpiarEstadoDrag();
  }

  /**
   * Limpia todas las clases visuales y estado de drag
   */
  private limpiarEstadoDrag() {
    this.elementoArrastrado = null;
    this.indiceDragDestino = -1;

    // Limpiar todas las clases visuales de elementos
    document.querySelectorAll('.dragging, .drag-over').forEach(el => {
      el.classList.remove('dragging', 'drag-over');
    });

    // Limpiar clase del segmento principal
    const segment = document.querySelector('.course-segment');
    if (segment) {
      segment.classList.remove('drag-active');
    }
  }

  /**
   * Guarda el orden de cursos en localStorage
   */
  private guardarOrdenCursos() {
    try {
      localStorage.setItem('cursosOrden', JSON.stringify(this.cursosOrdenados));
    } catch (error) {
      Logger.error('Error al guardar orden de cursos:', error);
    }
  }

  /**
   * Carga el orden de cursos desde localStorage
   */
  private cargarOrdenCursos() {
    try {
      const ordenGuardado = localStorage.getItem('cursosOrden');
      if (ordenGuardado) {
        this.cursosOrdenados = JSON.parse(ordenGuardado);
      }
    } catch (error) {
      Logger.error('Error al cargar orden de cursos:', error);
      this.cursosOrdenados = [];
    }
  }

  /**
   * TrackBy function para optimizar el *ngFor de cursos
   */
  trackByCurso(index: number, curso: string): string {
    return curso;
  }

  /**
   * Abre el popover de selección de color (botón de 3 puntos)
   */
  async abrirMenuColor(event: Event, curso: string): Promise<void> {
    // Prevenir que el evento se propague al segment-button
    event.stopPropagation();
    event.preventDefault();

    this.cursoParaCambiarColor = curso;
    // Siempre cargar el color actual del curso para persistencia
    const colorActual = this.getCourseColor(curso);
    this.colorSeleccionado = colorActual;
    this.colorPopoverEvent = event;
    this.menuColorVisible = true;

    Logger.log('🎨 [abrirMenuColor] Color cargado:', colorActual, 'para curso:', curso);
  }

  /**
   * Cierra el popover de selección de color
   */
  async cerrarMenuColor(): Promise<void> {
    this.menuColorVisible = false;
    this.cursoParaCambiarColor = null;
    this.colorSeleccionado = null;
    this.colorPopoverEvent = null;
  }

  /**
   * Obtiene el color asignado a un curso
   */
  getCourseColor(curso: string): string {
    if (!curso) return '#ff2719'; // Color por defecto

    const uiState = this.dataService.getUIState();
    const courseState = uiState.courseStates[curso];
    return courseState?.color || '#ff2719'; // Color por defecto (rojo de la imagen)
  }

  /**
   * Cambia temporalmente el color seleccionado
   */
  cambiarColorCurso(color: string): void {
    this.colorSeleccionado = color;
  }

  /**
   * Valida y formatea el código hexadecimal ingresado
   */
  validarColorHex(event: any): void {
    let valor = event.target.value;

    // Agregar # si no lo tiene
    if (valor && !valor.startsWith('#')) {
      valor = '#' + valor;
    }

    // Remover caracteres no válidos (solo permitir # y 0-9, a-f, A-F)
    valor = valor.replace(/[^#0-9a-fA-F]/g, '');

    // Limitar longitud a 7 caracteres (#RRGGBB)
    if (valor.length > 7) {
      valor = valor.substring(0, 7);
    }

    this.colorSeleccionado = valor.toUpperCase();
  }

  /**
   * Aplica el color seleccionado al curso y lo persiste
   * Mejoras: Estado de loading, validación mejorada, feedback al usuario
   */
  async aplicarColorCurso(): Promise<void> {
    // Validaciones iniciales
    if (!this.cursoParaCambiarColor || !this.colorSeleccionado) {
      this.cerrarMenuColor();
      return;
    }

    // Prevenir múltiples clicks
    if (this.isApplyingColor) {
      return;
    }

    try {
      this.isApplyingColor = true;

      // Validar que el color sea un hex válido
      const hexRegex = /^#[0-9A-F]{6}$/i;
      if (!hexRegex.test(this.colorSeleccionado)) {
        // Si no es válido, usar el color por defecto
        Logger.warn(`[aplicarColorCurso] Color inválido: ${this.colorSeleccionado}, usando color por defecto`);
        this.colorSeleccionado = '#a6ce38';
      }

      // Actualizar el color en el CourseState
      this.dataService.updateCourseState(this.cursoParaCambiarColor, {
        color: this.colorSeleccionado
      });

      // Pequeña pausa para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300));

      Logger.log(`✅ [aplicarColorCurso] Color ${this.colorSeleccionado} aplicado a ${this.cursoParaCambiarColor}`);

      // Forzar detección de cambios para actualizar la UI
      this.cdr.detectChanges();

    } catch (error) {
      Logger.error('[aplicarColorCurso] Error al aplicar color:', error);
    } finally {
      this.isApplyingColor = false;
      this.cerrarMenuColor();
    }
  }

  /**
   * Importa un CSV de sumatorias y actualiza el archivo Canvas
   */
  async importarCSVSumatorias() {
    if (!this.cursoActivo) {
      await this.mostrarError('Error', 'No hay curso activo seleccionado');
      return;
    }

    if (!this.tieneArchivoCanvas()) {
      await this.mostrarError('Sin archivo Canvas',
        'No hay archivo de calificaciones Canvas asociado a este curso. Vaya a Configuración para cargar uno.');
      return;
    }

    // Crear input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const loading = await this.loadingController.create({
        message: 'Procesando CSV de sumatorias...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const content = await this.leerArchivoTexto(file);
        await this.procesarCSVSumatorias(content);
        await loading.dismiss();
        await this.toastService.success('CSV de sumatorias importado y sincronizado', undefined, 4000);

      } catch (error) {
        await loading.dismiss();
        Logger.error('Error importando CSV:', error);
        await this.mostrarError('Error',
          'Error al procesar el archivo CSV: ' + (error as Error).message);
      }
    };

    input.click();
  }

  /**
   * Lee el contenido de un archivo como texto
   */
  private leerArchivoTexto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Procesa el CSV de sumatorias y actualiza las evaluaciones
   */
  private async procesarCSVSumatorias(csvContent: string) {
    const lineas = csvContent.split('\n').filter(l => l.trim());
    if (lineas.length < 2) {
      throw new Error('El archivo CSV está vacío o no tiene datos');
    }

    // Parsear headers
    const headers = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const indiceCorreo = headers.findIndex(h => h.toLowerCase() === 'correo');
    const indiceE1 = headers.findIndex(h => h.toLowerCase() === 'e1');
    const indiceE2 = headers.findIndex(h => h.toLowerCase() === 'e2');
    const indiceEF = headers.findIndex(h => h.toLowerCase() === 'ef');

    if (indiceCorreo === -1) {
      throw new Error('El CSV debe tener una columna "Correo"');
    }

    if (indiceE1 === -1 && indiceE2 === -1 && indiceEF === -1) {
      throw new Error('El CSV debe tener al menos una columna de entregas (E1, E2, EF)');
    }

    Logger.log('📊 Procesando CSV sumatorias:', {
      totalLineas: lineas.length - 1,
      columnas: { correo: indiceCorreo, E1: indiceE1, E2: indiceE2, EF: indiceEF }
    });

    let actualizados = 0;
    let noEncontrados = 0;

    // Procesar cada línea
    for (let i = 1; i < lineas.length; i++) {
      const campos = lineas[i].split(',').map(c => c.trim().replace(/"/g, ''));

      if (campos.length <= indiceCorreo) continue;

      const correo = campos[indiceCorreo];
      const estudiante = this.estudiantesActuales.find(e =>
        e.correo.toLowerCase() === correo.toLowerCase()
      );

      if (!estudiante) {
        Logger.warn(`👤 Estudiante no encontrado: ${correo} `);
        noEncontrados++;
        continue;
      }

      // Actualizar sumatorias para cada entrega
      const entregas: Array<{ entrega: 'E1' | 'E2' | 'EF', indice: number }> = [
        { entrega: 'E1', indice: indiceE1 },
        { entrega: 'E2', indice: indiceE2 },
        { entrega: 'EF', indice: indiceEF }
      ];

      for (const { entrega, indice } of entregas) {
        if (indice === -1 || indice >= campos.length) continue;

        const sumatoria = parseFloat(campos[indice]);
        if (isNaN(sumatoria)) continue;

        // Actualizar la evaluación con la sumatoria importada
        await this.actualizarSumatoriaEstudiante(estudiante, entrega, sumatoria);
        actualizados++;
      }
    }

    Logger.log('✅ CSV procesado:', {
      actualizados,
      noEncontrados,
      total: lineas.length - 1
    });

    // Sincronizar con Canvas después de actualizar
    await this.dataService.sincronizarArchivoCalificaciones(this.cursoActivo!);
  }

  /**
   * Actualiza la sumatoria de un estudiante para una entrega específica
   */
  private async actualizarSumatoriaEstudiante(
    estudiante: Estudiante,
    entrega: 'E1' | 'E2' | 'EF',
    sumatoria: number
  ) {
    // Obtener evaluaciones actuales
    const evalPG = this.dataService.getEvaluacion(this.cursoActivo!, entrega, 'PG', estudiante.grupo);
    const evalPI = this.dataService.getEvaluacion(this.cursoActivo!, entrega, 'PI', estudiante.correo);

    const pgActual = evalPG?.puntosTotales || 0;
    const piActual = evalPI?.puntosTotales || 0;

    // Si la sumatoria es igual a la actual, no hacer nada
    if (Math.abs((pgActual + piActual) - sumatoria) < 0.01) {
      return;
    }

    // Estrategia: distribuir la sumatoria entre PG y PI
    // Si existe PG, mantenerlo y ajustar PI
    // Si no existe PG, toda la sumatoria va a PI
    let nuevoPG = pgActual;
    let nuevoPI = sumatoria - pgActual;

    // Si no hay PG previo, asignar toda la sumatoria a PI
    if (pgActual === 0) {
      nuevoPI = sumatoria;
    }

    // Actualizar PI si cambió
    if (Math.abs(nuevoPI - piActual) > 0.01) {
      const evaluacionPI: Evaluacion = {
        cursoNombre: this.cursoActivo!,
        entrega: entrega,
        tipo: 'PI',
        grupo: '',
        estudianteEmail: estudiante.correo,
        rubricaId: 'import-csv-sumatoria',
        criterios: [{
          criterioTitulo: 'Calificación Importada',
          puntosObtenidos: nuevoPI,
          puntosPersonalizados: true,
          comentario: `Importado desde CSV de sumatorias(${entrega})`
        }],
        puntosTotales: nuevoPI,
        fechaEvaluacion: new Date()
      };

      await this.dataService.guardarEvaluacion(evaluacionPI);
    }
  }

  /**
   * Exporta un CSV con correo y sumatorias de cada entrega
   */
  async exportarCSVSumatorias() {
    if (!this.cursoActivo || this.estudiantesActuales.length === 0) {
      await this.toastService.warning('No hay datos para exportar');
      return;
    }

    try {
      // Encabezados del CSV - Solo Correo, E1, EF
      const headers = ['Correo', 'E1', 'E2', 'EF'];

      // Datos de estudiantes - Solo las columnas requeridas
      const datos = this.estudiantesActuales.map(estudiante => {
        const e1 = this.obtenerSumatoria(estudiante, 'E1') || 0;
        const e2 = this.obtenerSumatoria(estudiante, 'E2') || 0;
        const ef = this.obtenerSumatoria(estudiante, 'EF') || 0;

        return [
          estudiante.correo,
          e1,
          e2,
          ef
        ];
      });

      // Crear contenido CSV
      const csvContent = [headers, ...datos]
        .map(fila => fila.map(campo => `"${campo}"`).join(','))
        .join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `sumatorias_${this.cursoActivo}_${fecha}.csv`;

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      // Mostrar confirmación
      await this.toastService.success(`CSV de Sumatorias exportado: ${nombreArchivo}`, undefined, 4000);

    } catch (error) {
      Logger.error('Error al exportar CSV:', error);
      await this.toastService.error('Error al exportar CSV: ' + (error as Error).message, undefined, 4000);
    }
  }

  // === MÉTODOS CANVAS ===

  /**
   * Getter para información del archivo Canvas para el template
   */
  get archivoCanvasInfo(): { nombre: string; fechaCarga: string; enModoEscritura: boolean } | null {
    if (!this.cursoActivo) return null;

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) return null;

    return {
      nombre: archivo.nombre,
      fechaCarga: archivo.fechaCarga,
      enModoEscritura: true // Por defecto asumimos que está en modo escritura
    };
  }

  /**
   * Obtiene el estado de sincronización con Canvas
   */
  get estadoSincronizacionCanvas(): { texto: string; color: string } {
    if (!this.cursoActivo || !this.tieneArchivoCanvas()) {
      return { texto: 'Sin Canvas', color: 'medium' };
    }

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) {
      return { texto: 'Sin Canvas', color: 'medium' };
    }

    // Verificar cuántos estudiantes tienen evaluaciones
    const estudiantesConCalificaciones = this.estudiantesActuales.filter(est => {
      const e1 = this.obtenerSumatoria(est, 'E1');
      const e2 = this.obtenerSumatoria(est, 'E2');
      const ef = this.obtenerSumatoria(est, 'EF');
      return e1 > 0 || e2 > 0 || ef > 0;
    }).length;

    if (estudiantesConCalificaciones === 0) {
      return { texto: 'Sin calificaciones', color: 'warning' };
    }

    if (estudiantesConCalificaciones === this.estudiantesActuales.length) {
      return {
        texto: `✓ Sincronizado(${estudiantesConCalificaciones} / ${this.estudiantesActuales.length})`,
        color: 'success'
      };
    }

    return {
      texto: `Parcial(${estudiantesConCalificaciones} / ${this.estudiantesActuales.length})`,
      color: 'warning'
    };
  }

  /**
   * Verifica si el curso actual tiene un archivo Canvas vinculado
   */
  tieneArchivoCanvas(): boolean {
    if (!this.cursoActivo) return false;
    return !!this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
  }

  /**
   * Obtiene la información del archivo Canvas vinculado
   */
  getArchivoCanvasInfo(): { nombre: string; fechaCarga: string; enModoEscritura: boolean } | null {
    if (!this.cursoActivo) return null;

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) return null;

    return {
      nombre: archivo.nombre,
      fechaCarga: archivo.fechaCarga,
      enModoEscritura: true // Por defecto asumimos que está en modo escritura
    };
  }

  /**
   * Muestra una vista previa del archivo Canvas con las calificaciones actuales
   */
  async previsualizarArchivoCanvas() {
    if (!this.cursoActivo || !this.tieneArchivoCanvas()) {
      await this.mostrarError('Error', 'No hay archivo Canvas vinculado');
      return;
    }

    Logger.log('👁️ [previsualizarArchivoCanvas] Obteniendo archivo para:', {
      cursoActivo: this.cursoActivo,
      cursoEncontrado: !!this.cursosData[this.cursoActivo]
    });

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) {
      Logger.error('❌ No se encontró archivo Canvas para:', this.cursoActivo);
      return;
    }

    Logger.log('📄 [previsualizarArchivoCanvas] Archivo encontrado:', {
      nombre: archivo.nombre,
      fechaCarga: archivo.fechaCarga,
      totalCalificaciones: archivo.calificaciones.length,
      tamanoCSV: archivo.contenidoOriginal.length
    });

    // Usar CSV original para preview
    const lineas = archivo.contenidoOriginal.split('\n');
    const previewText = lineas.slice(0, 11).join('\n');  // Primeras 11 líneas
    const totalLineas = lineas.length; const alert = await this.alertController.create({
      header: '📄 Vista Previa Canvas',
      subHeader: `${archivo.nombre} (${totalLineas} líneas) - Curso: ${this.cursoActivo}`,
      message: `<pre style="font-size: 0.7rem; overflow-x: auto; max-width: 100%;">${this.escapeHtml(previewText)}</pre>`,
      cssClass: 'alert-info',
      buttons: [
        {
          text: 'Exportar',
          handler: () => {
            this.exportarArchivoCanvas();
          }
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Exporta el archivo Canvas con las calificaciones actualizadas
   */
  async exportarArchivoCanvas() {
    if (!this.cursoActivo || !this.tieneArchivoCanvas()) {
      await this.mostrarError('Error', 'No hay archivo Canvas vinculado');
      return;
    }

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) return;

    try {
      // Exportar CSV original idéntico para compatibilidad total con Canvas
      const blob = new Blob([archivo.contenidoOriginal], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `${archivo.nombre.replace('.csv', '')}_actualizado_${fecha}.csv`;

      link.href = window.URL.createObjectURL(blob);
      link.download = nombreArchivo;
      link.click();
      window.URL.revokeObjectURL(link.href);

      await this.toastService.success(`Archivo Canvas exportado: ${nombreArchivo}`);

    } catch (error) {
      Logger.error('Error exportando Canvas:', error);
      await this.mostrarError('Error', 'Error al exportar el archivo Canvas');
    }
  }

  /**
   * Escapa caracteres HTML para mostrar en alert
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Actualiza las calificaciones en el archivo Canvas
   */
  async actualizarCalificacionesCanvas() {
    if (!this.cursoActivo) {
      await this.mostrarError('Error', 'No hay curso activo seleccionado');
      return;
    }

    const archivo = this.dataService.obtenerArchivoCalificaciones(this.cursoActivo);
    if (!archivo) {
      await this.mostrarError('Sin archivo Canvas',
        'No hay archivo de calificaciones Canvas asociado a este curso. Vaya a Configuración para cargar uno.');
      return;
    }

    // Verificar que hay estudiantes
    if (this.estudiantesActuales.length === 0) {
      await this.mostrarError('Sin estudiantes', 'No hay estudiantes en el curso actual');
      return;
    }

    try {
      const loading = await this.loadingController.create({
        message: 'Verificando archivo Canvas...',
        spinner: 'crescent'
      });
      await loading.present();

      // Verificar que el archivo está en modo escritura
      const esEscribible = await this.verificarModoEscritura(archivo);

      await loading.dismiss();

      if (!esEscribible) {
        await this.mostrarError('Archivo protegido',
          'El archivo de calificaciones Canvas está en modo de solo lectura. No se pueden realizar cambios.');
        return;
      }

      // Proceder con la actualización
      await this.realizarActualizacionCanvas();

    } catch (error) {
      Logger.error('Error actualizando Canvas:', error);
      await this.mostrarError('Error', 'Error al actualizar calificaciones: ' + (error as Error).message);
    }
  }

  /**
   * Verifica si el archivo Canvas está en modo escritura
   */
  private async verificarModoEscritura(archivo: any): Promise<boolean> {
    // En un entorno web, no podemos verificar realmente el estado del archivo
    // Este método simula la verificación y siempre retorna true para demo
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Realiza la actualización efectiva del archivo Canvas
   */
  private async realizarActualizacionCanvas() {
    const loading = await this.loadingController.create({
      message: 'Actualizando calificaciones Canvas...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      // Usar el método del DataService para sincronizar
      await this.dataService.sincronizarArchivoCalificaciones(this.cursoActivo!);

      await loading.dismiss();

      await this.toastService.success(
        `Calificaciones actualizadas - Archivo: ${this.getArchivoCanvasInfo()?.nombre} - ${this.estudiantesActuales.length} estudiantes procesados`,
        undefined,
        5000
      );

    } catch (error) {
      await loading.dismiss();
      Logger.error('Error en actualización Canvas:', error);
      await this.toastService.error('Error actualizando Canvas: ' + (error as Error).message, undefined, 4000);
    }
  }
}

