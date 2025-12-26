import { Component, EnvironmentInjector, inject, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, AfterViewInit, NgZone, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import {
  IonIcon,
  IonSearchbar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonBadge,
  IonRouterOutlet,
  IonRouterLink,
  IonTabBar,
  IonTabButton,
  IonHeader,
  IonToolbar,
  IonAvatar,
  IonTitle
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Logger } from '@app/core/utils/logger';
import { addIcons } from 'ionicons';
import {
  // Iconos filled
  home,
  library,
  clipboard,
  ribbon,
  settings,
  search,
  school,
  people,
  grid,
  trophy,
  chatbubble,
  person,
  book,
  documentText,
  star,
  cog,
  speedometer,
  // Iconos de estado de estudiantes
  checkmarkCircle,
  gitMerge,
  closeCircle,
  // Iconos outline
  homeOutline,
  settingsOutline,
  schoolOutline,
  listOutline,
  analyticsOutline,
  informationCircleOutline,
  copyOutline,
  chevronDownOutline,
  chevronUpOutline,
  pinOutline,
  personOutline,
  peopleOutline,
  searchOutline,
  closeOutline,
  menuOutline,
  chevronForwardOutline,
  chevronBackOutline,
  arrowForwardOutline,
  arrowBackOutline,
  expandOutline,
  trophyOutline,
  bookOutline,
  eyeOutline,
  speedometerOutline,
  libraryOutline,
  ribbonOutline,
  pencilOutline,
  trashOutline,
  addCircleOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { DataService } from '../services/data.service';
import { FullscreenService } from '../services/fullscreen.service';
import { SeguimientoService, SeguimientoGrupo, ComentarioGrupo, EvaluacionRubrica, CriterioEvaluado, IntegranteInfo, EstadoEstudiante } from '../services/seguimiento.service';
import { NovedadService } from '../services/novedad.service';

export interface NavigationItem {
  path: string;
  icon: string;
  iconOutline: string;
  label: string;
  shortLabel?: string;
}

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonIcon,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLabel,
    IonBadge,
    IonRouterOutlet,
    IonRouterLink,
    IonTabBar,
    IonTabButton,
    IonHeader,
    IonToolbar,
    IonAvatar,
    IonTitle
  ],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: '0' }),
        animate('300ms ease-in-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ height: '0', opacity: '0' }))
      ])
    ])
  ]
})
export class TabsPage implements OnDestroy, AfterViewInit {
  public environmentInjector = inject(EnvironmentInjector);

  // Configuración centralizada del menú
  public navigationItems: NavigationItem[] = [
    { path: '/tabs/inicio', icon: 'home', iconOutline: 'home-outline', label: 'Inicio' },
    { path: '/tabs/cursos', icon: 'library', iconOutline: 'library-outline', label: 'Cursos' },
    { path: '/tabs/rubricas', icon: 'speedometer', iconOutline: 'speedometer-outline', label: 'Rúbricas' },
    { path: '/tabs/calificaciones', icon: 'ribbon', iconOutline: 'ribbon-outline', label: 'Calificaciones', shortLabel: 'Notas' },
    { path: '/tabs/sistema', icon: 'settings', iconOutline: 'settings-outline', label: 'Sistema', shortLabel: 'Config' }
  ];

  public router = inject(Router);
  private dataService = inject(DataService);
  private seguimientoService = inject(SeguimientoService);
  public fullscreenService = inject(FullscreenService);
  private novedadService = inject(NovedadService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('searchBar', { read: ElementRef }) searchbarRef!: ElementRef;

  private resizeHandler: (() => void) | null = null;
  private subscriptions: Subscription[] = [];
  globalSearch: string = '';
  selectedGrupo: number = 0; // Grupo seleccionado en UI (para botones)
  grupoVisualizado: number = 0; // Grupo para mostrar integrantes (puede ser diferente)
  searchExpanded: boolean = false;
  isDesktop: boolean = typeof window !== 'undefined' ? window.innerWidth >= 992 : false;
  grupos: string[] = [];
  tipoRubricaSeleccionado: 'PG' | 'PI' = 'PG';

  // URL actual para cambio de íconos
  currentUrl: string = '';

  // Seguimiento actual
  seguimientoActual: SeguimientoGrupo | null = null;

  // Control del panel de comentarios
  comentariosColapsado: boolean = true;
  comentariosFijados: boolean = false;
  nuevoComentarioTexto: string = '';
  editandoComentarioId: string | null = null;
  editandoComentarioTexto: string = '';

  // Control de curso activo
  cursoActivo: string | null = null;

  // Integrantes del grupo seleccionado
  integrantesGrupoActual: any[] = [];

  // Para edición inline de calificaciones en el panel de seguimiento
  editandoCalificacion: { estudiante: any; entrega: string } | null = null;
  valorCalificacionEditando: string = '';

  // Resultados de búsqueda global
  searchResults: Array<{
    estudiante: any;
    curso: string;
    cursoNombre: string;
    cursoMetadata?: any;
  }> = [];
  searchTerm: string = '';

  // Modo de selección de estado para estudiantes
  modoSeleccionEstado: 'ok' | 'solo' | 'ausente' | null = null;

  // Set de integrantes seleccionados (por correo)
  selectedIntegrantes: Set<string> = new Set();

  private uiStateInitialized = false;
  private lastCursoActivo: string | null = null;

  // Control del panel de seguimiento móvil
  mobileSeguimientoVisible: boolean = false;

  // Control de visibilidad del panel de seguimiento global (Desktop)
  panelSeguimientoVisible = signal<boolean>(true);

  // Computed para resumen centralizado (si se requiere en el panel global)
  novedadesPendientes = computed(() => this.novedadService.novedadesPendientes());

  novedadesResumen = computed(() => {
    const porTipo: Record<string, { count: number; nombre: string; icono: string; color: string }> = {};
    const pendientes = this.novedadesPendientes();

    pendientes.forEach((n: any) => {
      if (!porTipo[n.tipoNovedadId]) {
        const config = this.novedadService.getTipoConfig(n.tipoNovedadId);
        porTipo[n.tipoNovedadId] = {
          count: 0,
          nombre: n.tipoNovedadNombre || 'Sin nombre',
          icono: config?.icono || 'document-text-outline',
          color: config?.color || '#607d8b'
        };
      }
      porTipo[n.tipoNovedadId].count++;
    });

    return Object.values(porTipo).sort((a, b) => b.count - a.count);
  });

  // Estadísticas globales para el panel de información
  statsGlobales = computed(() => {
    const cursosData = this.dataService.cursos() || {};
    const cursosKeys = Object.keys(cursosData);

    let totalEstudiantes = 0;
    let totalGrupos = 0;

    cursosKeys.forEach((key: string) => {
      const estudiantes = cursosData[key] || [];
      totalEstudiantes += estudiantes.length;

      // Contar grupos únicos en este curso
      const gruposUnicos = new Set(estudiantes.map((e: any) => e.grupo).filter((g: any) => g));
      totalGrupos += gruposUnicos.size;
    });

    return {
      totalCursos: cursosKeys.length,
      totalEstudiantes: totalEstudiantes,
      totalGrupos: totalGrupos,
      promedioEstudiantes: cursosKeys.length > 0 ? Math.round(totalEstudiantes / cursosKeys.length) : 0
    };
  });

  constructor() {
    addIcons({
      // Filled icons
      home, library, clipboard, ribbon, settings, search, school, people, grid, trophy, chatbubble, person, book,
      documentText, star, cog, speedometer,
      // Estado icons
      checkmarkCircle, gitMerge, closeCircle,
      // Outline icons
      homeOutline, settingsOutline, schoolOutline, listOutline, analyticsOutline,
      informationCircleOutline, copyOutline, chevronDownOutline, chevronUpOutline,
      pinOutline, personOutline, peopleOutline, searchOutline, closeOutline, expandOutline, trophyOutline,
      bookOutline, eyeOutline, menuOutline, chevronForwardOutline, chevronBackOutline,
      arrowForwardOutline, arrowBackOutline,
      speedometerOutline, libraryOutline, ribbonOutline,
      pencilOutline, trashOutline, addCircleOutline, checkmarkOutline
    });

    // Suscribirse a cambios de ruta para actualizar iconos
    this.currentUrl = this.router.url;
    this.subscriptions.push(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentUrl = event.urlAfterRedirects;
      })
    );


    // Monitorear cambios de ruta para mantener estado
    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        // Navegación completada silenciosamente
      })
    );

    effect(() => {
      const seguimiento = this.seguimientoService.seguimientoActual();
      this.seguimientoActual = seguimiento;
    });

    effect(() => {
      const grupoSeleccionado = this.seguimientoService.grupoSeleccionado();
      if (this.selectedGrupo !== grupoSeleccionado) {
        this.selectedGrupo = grupoSeleccionado;
        this.cdr.markForCheck();
      }
    });

    effect(() => {
      const grupoVisualizado = this.seguimientoService.grupoVisualizado();
      if (this.grupoVisualizado !== grupoVisualizado) {
        this.grupoVisualizado = grupoVisualizado;
        this.actualizarIntegrantesGrupo();
        this.cdr.markForCheck();
      }
    });

    effect(() => {
      const uiState = this.dataService.uiState();
      const cursoActivo = uiState?.cursoActivo ?? null;

      if (this.uiStateInitialized && cursoActivo === this.lastCursoActivo) {
        return;
      }

      this.uiStateInitialized = true;
      this.lastCursoActivo = cursoActivo;
      this.cursoActivo = cursoActivo;

      if (cursoActivo) {
        this.actualizarGruposDisponibles();
        const courseState = this.dataService.getCourseState(cursoActivo);
        if (courseState?.filtroGrupo && courseState.filtroGrupo !== 'todos') {
          const grupoNum = parseInt(courseState.filtroGrupo.replace(/\D/g, ''), 10);
          if (grupoNum > 0 && this.selectedGrupo !== grupoNum) {
            this.selectedGrupo = grupoNum;
            this.seguimientoService.setGrupoSeleccionado(grupoNum);
          }
        } else if (this.selectedGrupo !== 0) {
          this.selectedGrupo = 0;
          this.seguimientoService.setGrupoSeleccionado(0);
        }
        this.actualizarIntegrantesGrupo();
      } else {
        this.grupos = [];
        this.selectedGrupo = 0;
        this.integrantesGrupoActual = [];
      }

      this.cdr.markForCheck();
    });

    effect(() => {
      const cursos = this.dataService.cursos();
      if (this.cursoActivo && Object.keys(cursos || {}).length >= 0) {
        this.actualizarGruposDisponibles();
      }
    });

    effect(() => {
      const results = this.dataService.searchResults();
      this.searchResults = results.results;
      this.searchTerm = results.term;
      Logger.log(`📋[tabs.page] Resultados de búsqueda actualizados: ${this.searchResults.length} resultados`);
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Configurar layout inicial y listener de resize optimizado
    this.updateDesktopState();
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    // Limpiar todas las subscripciones para prevenir memory leaks
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
    this.subscriptions = [];

    // Limpiar resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  /** Actualiza isDesktop solo si cambió - evita detecciones innecesarias */
  private updateDesktopState(): void {
    if (typeof window === 'undefined') return;
    const newIsDesktop = window.innerWidth >= 992;
    if (this.isDesktop !== newIsDesktop) {
      this.isDesktop = newIsDesktop;
      this.cdr.detectChanges();
    }
  }

  /** Configura el resize listener fuera de Angular zone para mejor performance */
  private setupResizeListener(): void {
    this.ngZone.runOutsideAngular(() => {
      let resizeTimeout: ReturnType<typeof setTimeout>;

      this.resizeHandler = () => {
        // Debounce de 150ms para evitar múltiples actualizaciones
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.ngZone.run(() => this.updateDesktopState());
        }, 150);
      };

      window.addEventListener('resize', this.resizeHandler);
    });
  }

  onGlobalSearch(event: any): void {
    const searchTerm = event.detail.value?.toLowerCase() || '';
    this.dataService.setGlobalSearchTerm(searchTerm);
    // Trigger cross-course search
    this.dataService.searchAcrossAllCourses(searchTerm);
  }

  toggleSearch(): void {
    // Navegar a la página de inicio si no estamos allí
    if (!this.currentUrl.includes('/inicio')) {
      this.router.navigate(['/tabs/inicio']);
    }

    // Alternar visibilidad de la barra de búsqueda
    const currentVisible = this.dataService.searchBarVisible();
    (this.dataService as any)._searchBarVisible.set(!currentVisible);

    // Si se acaba de mostrar, hacer focus después de un delay
    if (!currentVisible) {
      setTimeout(() => {
        const searchbar = document.querySelector('.main-searchbar') as any;
        if (searchbar && searchbar.setFocus) {
          searchbar.setFocus();
        }
      }, 300);
    }
  }

  /** Toggle del panel de seguimiento móvil */
  toggleMobileSeguimiento(): void {
    this.mobileSeguimientoVisible = !this.mobileSeguimientoVisible;
  }

  /** Toggle del panel de seguimiento global (Desktop) */
  togglePanelSeguimiento(): void {
    this.panelSeguimientoVisible.update((v: boolean) => !v);
    Logger.log(`🖥️[TabsPage] Panel de seguimiento global: ${this.panelSeguimientoVisible() ? 'Visible' : 'Oculto'}`);
  }

  /** Ruta activa para navegación desktop */
  get activeNavPath(): string {
    const active = this.navigationItems.find(item => this.currentUrl.includes(item.path));
    return active?.path ?? this.navigationItems[0].path;
  }

  /** Helper para parseInt en template */
  parseInt(value: string): number {
    return parseInt(value, 10) || 0;
  }

  selectGrupo(grupo: string | 'todos'): void {
    const grupoNum = grupo === 'todos' ? 0 : parseInt(grupo) || 0;

    // 🛡️ GUARDIA: Evitar actualizaciones si ya es el grupo seleccionado
    if (this.selectedGrupo === grupoNum) {
      return;
    }

    this.selectedGrupo = grupoNum;
    this.seguimientoService.setGrupoSeleccionado(grupoNum);

    // Actualizar integrantes del grupo
    this.actualizarIntegrantesGrupo();

    // Guardar en CourseState para persistencia por curso
    if (this.cursoActivo) {
      const grupoStr = grupoNum === 0 ? 'todos' : `G${grupoNum} `;

      // 🛡️ GUARDIA: Solo actualizar si el valor cambió
      const courseState = this.dataService.getCourseState(this.cursoActivo);
      if (courseState?.filtroGrupo !== grupoStr) {
        this.dataService.updateCourseState(this.cursoActivo, {
          filtroGrupo: grupoStr
        });
      }
    }
  }

  /**
   * Obtiene los integrantes del grupo actualmente visualizado.
   * Usa grupoVisualizado (no selectedGrupo) para permitir previsualización
   * de integrantes sin cambiar la selección de filtro en la UI.
   */
  private actualizarIntegrantesGrupo(): void {
    if (!this.cursoActivo || this.grupoVisualizado === 0) {
      this.integrantesGrupoActual = [];
      this.cdr.markForCheck();
      return;
    }

    const estudiantes = this.dataService.getCurso(this.cursoActivo);
    if (!estudiantes || estudiantes.length === 0) {
      this.integrantesGrupoActual = [];
      this.cdr.markForCheck();
      return;
    }

    // Filtrar por grupo visualizado (no selectedGrupo)
    // El grupo del estudiante puede ser "1", "G1", "Grupo 1", etc.
    const grupoNum = this.grupoVisualizado;
    const grupoNumStr = String(grupoNum);

    this.integrantesGrupoActual = estudiantes.filter(e => {
      if (!e.grupo) return false;
      // Extraer solo el número del campo grupo del estudiante
      const estudianteGrupoNum = e.grupo.toString().replace(/\D/g, '');
      return estudianteGrupoNum === grupoNumStr;
    });

    this.cdr.markForCheck();
  }

  /**
   * Obtiene la calificación de Canvas para un estudiante y entrega específica
   * Busca en el archivo de calificaciones cargado usando canvasUserId
   */
  obtenerCalificacionCanvas(estudiante: any, entrega: string): number {
    if (!this.cursoActivo) return 0;

    const courseState = this.dataService.getCourseState(this.cursoActivo);
    if (!courseState?.archivoCalificaciones?.calificaciones) return 0;

    // Buscar por canvasUserId del estudiante
    const calificacion = courseState.archivoCalificaciones.calificaciones.find(
      (cal: any) => cal.id === estudiante.canvasUserId
    );

    if (!calificacion) return 0;

    // Obtener el valor según la entrega (ahora son numbers)
    let valor: number = 0;
    switch (entrega) {
      case 'E1': valor = calificacion.e1; break;
      case 'E2': valor = calificacion.e2; break;
      case 'EF': valor = calificacion.ef; break;
    }

    // El valor ya es number, solo validar que no sea NaN
    return isNaN(valor) ? 0 : valor;
  }

  /**
   * Obtiene la calificación (PG + PI) para un estudiante y entrega específica
   * Ahora prioriza las calificaciones del archivo Canvas si están disponibles
   */
  obtenerCalificacionEstudiante(estudiante: any, entrega: string): number {
    if (!this.cursoActivo) return 0;

    // Primero intentar obtener de archivo Canvas (prioridad)
    const canvasCalif = this.obtenerCalificacionCanvas(estudiante, entrega);
    if (canvasCalif > 0) {
      return canvasCalif;
    }

    // Fallback: calcular desde evaluaciones de rúbricas (PG + PI)
    const pg = this.dataService.getEvaluacion(this.cursoActivo, entrega, 'PG', estudiante.grupo)?.puntosTotales || 0;
    const pi = this.dataService.getEvaluacion(this.cursoActivo, entrega, 'PI', estudiante.correo)?.puntosTotales || 0;

    return pg + pi;
  }

  /**
   * Verifica si hay calificaciones de Canvas disponibles para el estudiante
   */
  tieneCalificacionCanvas(estudiante: any, entrega: string): boolean {
    return this.obtenerCalificacionCanvas(estudiante, entrega) > 0;
  }

  // ============================================
  // EDICIÓN INLINE DE CALIFICACIONES
  // ============================================

  /**
   * Inicia la edición de una calificación en el panel de seguimiento
   */
  iniciarEdicionCalificacion(estudiante: any, entrega: string, event: Event): void {
    event.stopPropagation();
    // Solo permitir edición si hay archivo de calificaciones cargado
    if (!this.cursoActivo) return;
    const courseState = this.dataService.getCourseState(this.cursoActivo);
    if (!courseState?.archivoCalificaciones?.calificaciones) return;

    this.editandoCalificacion = { estudiante, entrega };
    const valorActual = this.obtenerCalificacionCanvas(estudiante, entrega);
    this.valorCalificacionEditando = valorActual > 0 ? valorActual.toString() : '';
    this.cdr.detectChanges();
  }

  /**
   * Verifica si se está editando una calificación específica
   */
  estaEditandoCalificacion(estudiante: any, entrega: string): boolean {
    return this.editandoCalificacion?.estudiante?.correo === estudiante.correo &&
      this.editandoCalificacion?.entrega === entrega;
  }

  /**
   * Guarda la calificación editada
   */
  guardarCalificacionInicio(): void {
    if (!this.editandoCalificacion || !this.cursoActivo) return;

    const { estudiante, entrega } = this.editandoCalificacion;
    const nuevoValor = this.valorCalificacionEditando.trim();

    // Actualizar en el archivo de calificaciones
    this.actualizarCalificacionEnArchivo(estudiante, entrega, nuevoValor);

    this.editandoCalificacion = null;
    this.valorCalificacionEditando = '';
    this.cdr.detectChanges();
  }

  /**
   * Cancela la edición
   */
  cancelarEdicionCalificacion(): void {
    this.editandoCalificacion = null;
    this.valorCalificacionEditando = '';
    this.cdr.detectChanges();
  }

  /**
   * Maneja teclas durante la edición
   */
  onKeyDownCalificacion(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.guardarCalificacionInicio();
    } else if (event.key === 'Escape') {
      this.cancelarEdicionCalificacion();
    }
  }

  /**
   * Actualiza la calificación en el archivo cargado en DataService
   */
  private actualizarCalificacionEnArchivo(estudiante: any, entrega: string, nuevoValor: string): void {
    if (!this.cursoActivo) return;

    const courseState = this.dataService.getCourseState(this.cursoActivo);
    if (!courseState?.archivoCalificaciones?.calificaciones) return;

    // Buscar la calificación del estudiante
    const calificaciones = [...courseState.archivoCalificaciones.calificaciones];
    const index = calificaciones.findIndex((cal: any) => cal.id === estudiante.canvasUserId);

    if (index === -1) return;

    // Actualizar el valor según la entrega (ahora son numbers)
    const calificacion = { ...calificaciones[index] };
    const valorNumerico = parseFloat(nuevoValor) || 0;
    switch (entrega) {
      case 'E1': calificacion.e1 = valorNumerico; break;
      case 'E2': calificacion.e2 = valorNumerico; break;
      case 'EF': calificacion.ef = valorNumerico; break;
    }

    calificaciones[index] = calificacion;

    // Actualizar el courseState
    const nuevoArchivoCalificaciones = {
      ...courseState.archivoCalificaciones,
      calificaciones
    };

    // Guardar en DataService
    this.dataService.updateCourseState(this.cursoActivo, {
      archivoCalificaciones: nuevoArchivoCalificaciones
    });

    Logger.log(`✅ Calificación actualizada: ${estudiante.nombres} ${estudiante.apellidos} - ${entrega}: ${nuevoValor}`);
  }

  /**
   * Obtiene el total de todas las entregas para un estudiante
   */
  obtenerTotalEstudiante(estudiante: any): number {
    const e1 = this.obtenerCalificacionEstudiante(estudiante, 'E1');
    const e2 = this.obtenerCalificacionEstudiante(estudiante, 'E2');
    const ef = this.obtenerCalificacionEstudiante(estudiante, 'EF');
    return e1 + e2 + ef;
  }

  /**
   * Obtiene el color del badge según el valor de la calificación
   */
  obtenerColorCalificacion(valor: number): string {
    if (valor >= 4.0) return 'success';
    if (valor >= 3.0) return 'warning';
    return 'danger';
  }

  /**
   * Abre la rúbrica para evaluación desde el panel de seguimiento
   */
  abrirRubricaEntrega(entrega: 'E1' | 'E2' | 'EF', tipo: 'PG' | 'PI') {
    Logger.log(`📋[TabsPage] Abriendo rúbrica desde sidebar: ${entrega} - ${tipo} `);

    // Trigger evento personalizado para abrir rúbrica
    const event = new CustomEvent('abrirRubrica', {
      detail: { entrega, tipo }
    });
    window.dispatchEvent(event);
  }

  copiarTextoSeguimiento(): void {
    if (!this.seguimientoActual) return;

    let textoPlano = '';
    let textoHTML = '';

    // Función auxiliar para obtener color hexadecimal
    const obtenerColorHex = (nivelNombre: string, niveles: any[]): string => {
      const nivel = niveles.find(n => n.nombre === nivelNombre);
      if (!nivel) return '#000000';

      switch (nivel.color) {
        case 'success': case 'verde': return '#28a745';
        case 'warning': case 'amarillo': return '#ffc107';
        case 'danger': case 'rojo': return '#dc3545';
        default: return '#000000';
      }
    };

    // Agregar evaluación grupal estructurada si existe
    if (this.seguimientoActual.evaluacionGrupal) {
      const evalGrupal = this.seguimientoActual.evaluacionGrupal;
      const tituloGrupal = '=== CALIFICACIÓN GRUPAL ===';
      const puntosGrupal = `Puntos Grupo: ${evalGrupal.puntosTotal} `;

      textoPlano += `${tituloGrupal} \n${puntosGrupal} \n\n`;
      textoHTML += `<p><strong>${tituloGrupal}</strong></p><p>${puntosGrupal}</p><br>`;

      evalGrupal.criterios.forEach((criterio, idx) => {
        const colorNivel = obtenerColorHex(criterio.nivelSeleccionado, criterio.niveles);
        const nombreCriterio = `🟢 [${criterio.nombreCriterio}]`;
        const nivelesRangos = this.getNivelesYRangos(criterio);
        const nivelSeleccionado = `${criterio.nivelSeleccionado} (${this.getIntervaloSeleccionado(criterio)})`;
        const puntosAsignados = `Asignados: ${criterio.puntosAsignados} pts${criterio.comentario ? ' + ' + criterio.comentario : ''}`;
        const descripcion = this.getDescripcionNivel(criterio);

        // Texto plano
        textoPlano += `${nombreCriterio}\n`;
        textoPlano += `${nivelesRangos}\n`;
        textoPlano += `${nivelSeleccionado}\n`;
        textoPlano += `${puntosAsignados}\n`;
        if (descripcion) textoPlano += `${descripcion}\n`;
        textoPlano += '\n';

        // Texto HTML con colores
        textoHTML += `<p>${nombreCriterio}</p>`;
        textoHTML += `<p>${nivelesRangos}</p>`;
        textoHTML += `<p style="color: ${colorNivel}; font-weight: bold;">${nivelSeleccionado}</p>`;
        textoHTML += `<p>${puntosAsignados}</p>`;
        if (descripcion) textoHTML += `<p>${descripcion}</p>`;
        textoHTML += '<br>';
      });
    }

    // Agregar evaluación individual estructurada si existe
    if (this.seguimientoActual.evaluacionIndividual) {
      const evalIndividual = this.seguimientoActual.evaluacionIndividual;
      const tituloIndividual = '=== CALIFICACIÓN INDIVIDUAL ===';
      const integranteInfo = this.integranteSeleccionado
        ? `Integrante: ${this.integranteSeleccionado.nombres} ${this.integranteSeleccionado.apellidos}`
        : '';
      const puntosIndividual = `Puntos Individuales: ${evalIndividual.puntosTotal}`;

      textoPlano += `${tituloIndividual}\n`;
      if (integranteInfo) textoPlano += `${integranteInfo}\n`;
      textoPlano += `${puntosIndividual}\n\n`;

      textoHTML += `<p><strong>${tituloIndividual}</strong></p>`;
      if (integranteInfo) textoHTML += `<p><em>${integranteInfo}</em></p>`;
      textoHTML += `<p>${puntosIndividual}</p><br>`;

      evalIndividual.criterios.forEach((criterio, idx) => {
        const colorNivel = obtenerColorHex(criterio.nivelSeleccionado, criterio.niveles);
        const nombreCriterio = `🟢 [${criterio.nombreCriterio}]`;
        const nivelesRangos = this.getNivelesYRangos(criterio);
        const nivelSeleccionado = `${criterio.nivelSeleccionado} (${this.getIntervaloSeleccionado(criterio)})`;
        const puntosAsignados = `Asignados: ${criterio.puntosAsignados} pts${criterio.comentario ? ' + ' + criterio.comentario : ''}`;
        const descripcion = this.getDescripcionNivel(criterio);

        // Texto plano
        textoPlano += `${nombreCriterio}\n`;
        textoPlano += `${nivelesRangos}\n`;
        textoPlano += `${nivelSeleccionado}\n`;
        textoPlano += `${puntosAsignados}\n`;
        if (descripcion) textoPlano += `${descripcion}\n`;
        textoPlano += '\n';

        // Texto HTML con colores
        textoHTML += `<p>${nombreCriterio}</p>`;
        textoHTML += `<p>${nivelesRangos}</p>`;
        textoHTML += `<p style="color: ${colorNivel}; font-weight: bold;">${nivelSeleccionado}</p>`;
        textoHTML += `<p>${puntosAsignados}</p>`;
        if (descripcion) textoHTML += `<p>${descripcion}</p>`;
        textoHTML += '<br>';
      });
    }

    // Total combinado
    if (this.seguimientoActual.evaluacionGrupal && this.seguimientoActual.evaluacionIndividual) {
      const totalTexto = `Puntos Totales: ${this.totalPuntos} puntos`;
      textoPlano += `${totalTexto}\n`;
      textoHTML += `<p><strong>${totalTexto}</strong></p>`;
    }

    // NOTA: La información del integrante NO se agrega aquí para evitar duplicación.
    // Ya está incluida correctamente en la sección "=== CALIFICACIÓN INDIVIDUAL ==="
    // (líneas 154-159) cuando hay evaluación individual activa.
    // Este bloque se mantiene como referencia para futuras validaciones.

    if (textoPlano) {
      // Intentar copiar con formato HTML (con colores) y fallback a texto plano
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([textoHTML], { type: 'text/html' }),
        'text/plain': new Blob([textoPlano], { type: 'text/plain' })
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
        Logger.log('✅ Texto de seguimiento copiado al portapapeles con formato y colores');
      }).catch(() => {
        // Fallback a texto plano si falla el formato HTML
        navigator.clipboard.writeText(textoPlano).then(() => {
          Logger.log('✅ Texto de seguimiento copiado al portapapeles (texto plano)');
        });
      });
    }
  }

  get tieneTextoRubrica(): boolean {
    // Ahora solo considerar las evaluaciones estructuradas, no el texto legacy
    return false;
  }

  get tieneEvaluacionRubrica(): boolean {
    return this.seguimientoActual !== null &&
      (this.seguimientoActual.evaluacionGrupal !== undefined ||
        this.seguimientoActual.evaluacionIndividual !== undefined);
  }

  get totalPuntos(): number {
    if (!this.seguimientoActual) return 0;
    const pg = this.seguimientoActual.evaluacionGrupal?.puntosTotal || 0;
    const pi = this.seguimientoActual.evaluacionIndividual?.puntosTotal || 0;
    return pg + pi;
  }

  get comentariosGrupoActual(): ComentarioGrupo[] {
    return this.seguimientoActual?.comentarios || [];
  }

  get integranteSeleccionado(): IntegranteInfo | undefined {
    return this.seguimientoActual?.integranteSeleccionado;
  }

  toggleComentarios(): void {
    if (!this.comentariosFijados) {
      this.comentariosColapsado = !this.comentariosColapsado;
    }
  }

  toggleFijarComentarios(): void {
    this.comentariosFijados = !this.comentariosFijados;
    if (this.comentariosFijados) {
      this.comentariosColapsado = false; // Si se fija, se expande automáticamente
    }
  }

  agregarComentario(): void {
    if (!this.nuevoComentarioTexto.trim() || this.selectedGrupo === 0) return;

    const nuevoComentario: ComentarioGrupo = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      comentario: this.nuevoComentarioTexto.trim(),
      fecha: new Date(),
      autor: 'Docente'
    };

    this.seguimientoService.agregarComentario(nuevoComentario);
    this.nuevoComentarioTexto = '';
  }

  iniciarEdicionComentario(comentario: ComentarioGrupo): void {
    this.editandoComentarioId = comentario.id;
    this.editandoComentarioTexto = comentario.comentario;
  }

  guardarEdicionComentario(): void {
    if (!this.editandoComentarioId || !this.editandoComentarioTexto.trim()) return;

    this.seguimientoService.actualizarComentario(this.editandoComentarioId, this.editandoComentarioTexto.trim());
    this.cancelarEdicionComentario();
  }

  cancelarEdicionComentario(): void {
    this.editandoComentarioId = null;
    this.editandoComentarioTexto = '';
  }

  eliminarComentario(id: string): void {
    this.seguimientoService.eliminarComentario(id);
  }

  toggleFullscreen(): void {
    this.fullscreenService.toggleFullscreen();
  }

  get entregaBadgeText(): string {
    const entrega = this.seguimientoActual?.entregaActual;
    switch (entrega) {
      case 'E1': return 'Entrega 1';
      case 'E2': return 'Entrega 2';
      case 'EF': return 'Entrega Final';
      default: return 'Sin Entrega';
    }
  }

  get tipoEvaluacionText(): string {
    const tipo = this.seguimientoActual?.evaluacionGrupal ? 'PG' :
      this.seguimientoActual?.evaluacionIndividual ? 'PI' : '';
    return tipo === 'PG' ? `Grupo ${this.selectedGrupo}` :
      tipo === 'PI' ? 'Individual' : '';
  }

  get mostrarEntregaBadge(): boolean {
    return !!(this.seguimientoActual?.evaluacionGrupal || this.seguimientoActual?.evaluacionIndividual);
  }

  get mostrarGrupos(): boolean {
    return !!this.cursoActivo;
  }

  // Obtener prefijo del curso (primer y segundo segmento del código)
  get cursoPrefix(): string {
    if (!this.cursoActivo) return '';

    const courseState = this.dataService.getCourseState(this.cursoActivo);
    const nombreAbreviado = courseState?.metadata?.nombreAbreviado || '';

    if (!nombreAbreviado) return '';

    // Dividir por guiones y tomar los primeros dos segmentos
    const segmentos = nombreAbreviado.split('-');
    if (segmentos.length >= 2) {
      return `${segmentos[0]}-${segmentos[1]}`;
    }

    return nombreAbreviado;
  }

  // Actualizar grupos disponibles desde los estudiantes del curso activo
  actualizarGruposDisponibles(): void {
    if (!this.cursoActivo) {
      this.grupos = [];
      return;
    }

    const cursosData = this.dataService.getCursos();
    const estudiantes = cursosData[this.cursoActivo] || [];

    // Extraer grupos únicos de los estudiantes usando groupName o grupo
    const gruposSet = new Set<string>();
    const gruposMap = new Map<string, string>(); // numero -> groupName completo

    estudiantes.forEach((est: any) => {
      if (est.grupo && est.grupo.trim()) {
        const grupoNum = est.grupo.trim();
        gruposSet.add(grupoNum);

        // Guardar el groupName completo para referencia futura si existe
        if (est.groupName && !gruposMap.has(grupoNum)) {
          gruposMap.set(grupoNum, est.groupName);
        }
      }
    });

    // Convertir a array y ordenar numéricamente
    this.grupos = Array.from(gruposSet).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }

  // Método para navegación programática si es necesario
  navigateToTab(path: string) {
    if (!path) {
      return;
    }
    this.router.navigateByUrl(path);
  }

  // Funciones auxiliares para el formato de texto plano
  getNivelesYRangos(criterio: CriterioEvaluado): string {
    return criterio.niveles.map(nivel => `${nivel.nombre}: ${nivel.intervalo}`).join(' | ');
  }

  getColorNivel(nivelSeleccionado: string, niveles: any[]): string {
    const nivel = niveles.find(n => n.nombre === nivelSeleccionado);
    if (!nivel) return '#000000';

    // Mapear colores según el nivel
    switch (nivel.color) {
      case 'success': case 'verde': return '#28a745';
      case 'warning': case 'amarillo': return '#ffc107';
      case 'danger': case 'rojo': return '#dc3545';
      default: return '#000000';
    }
  }

  getIntervaloSeleccionado(criterio: CriterioEvaluado): string {
    const nivel = criterio.niveles.find(n => n.nombre === criterio.nivelSeleccionado);
    return nivel?.intervalo || '';
  }

  getDescripcionNivel(criterio: CriterioEvaluado): string {
    const nivel = criterio.niveles.find(n => n.nombre === criterio.nivelSeleccionado);
    return nivel?.descripcion || criterio.comentario || '';
  }

  // === MÉTODOS PARA ESTADOS DE ESTUDIANTES ===

  /**
   * Obtiene el estado de un estudiante para mostrar en la tabla
   */
  getEstadoEstudiante(correo: string): EstadoEstudiante {
    const grupo = this.grupoVisualizado.toString();
    const entrega = this.seguimientoActual?.entregaActual;
    if (!grupo || grupo === '0' || !entrega) return null;
    return this.seguimientoService.getEstadoEstudiante(grupo, entrega, correo);
  }

  /**
   * Obtiene el ícono para un estado
   */
  getIconoEstado(estado: EstadoEstudiante): string {
    switch (estado) {
      case 'ok': return 'checkmark-circle';
      case 'solo': return 'git-merge';
      case 'ausente': return 'close-circle';
      default: return '';
    }
  }

  /**
   * Obtiene el color para un estado
   */
  getColorEstado(estado: EstadoEstudiante): string {
    switch (estado) {
      case 'ok': return 'success';
      case 'solo': return 'warning';
      case 'ausente': return 'danger';
      default: return 'medium';
    }
  }

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
   * Maneja el cambio del checkbox de un estudiante
   */
  onCheckboxEstadoChange(correo: string, event: any) {
    const checked = event.detail.checked;
    const grupo = this.grupoVisualizado.toString();
    const entrega = this.seguimientoActual?.entregaActual;

    if (!grupo || grupo === '0' || !entrega || !this.modoSeleccionEstado) return;

    if (checked) {
      // Aplicar el estado seleccionado
      this.seguimientoService.setEstadoEstudiante(grupo, entrega, correo, this.modoSeleccionEstado);
    } else {
      // Quitar el estado
      this.seguimientoService.setEstadoEstudiante(grupo, entrega, correo, null);
    }
    this.cdr.detectChanges();
  }

  /**
   * Verifica si el checkbox de un estudiante debe estar marcado
   */
  isCheckboxChecked(correo: string): boolean {
    if (!this.modoSeleccionEstado) return false;
    const estado = this.getEstadoEstudiante(correo);
    return estado === this.modoSeleccionEstado;
  }

  /**
   * Verifica si hay una entrega activa para mostrar los controles de estado
   */
  hayEntregaActiva(): boolean {
    return !!this.seguimientoActual?.entregaActual;
  }

  /**
   * Sale del modo de selección de estados
   */
  salirModoSeleccion() {
    this.modoSeleccionEstado = null;
    this.cdr.detectChanges();
  }

  /**
   * Verifica si un integrante está seleccionado
   */
  isIntegranteSelected(correo: string): boolean {
    return this.selectedIntegrantes.has(correo);
  }

  /**
   * Alterna la selección de un integrante
   */
  toggleIntegranteSelection(correo: string, event?: any) {
    if (this.selectedIntegrantes.has(correo)) {
      this.selectedIntegrantes.delete(correo);
    } else {
      this.selectedIntegrantes.add(correo);
    }
    this.cdr.detectChanges();
  }

  /**
   * Selecciona todos los integrantes del grupo actual
   */
  selectAllIntegrantes() {
    this.integrantesGrupoActual.forEach(i => this.selectedIntegrantes.add(i.correo));
    this.cdr.detectChanges();
  }

  /**
   * Deselecciona todos los integrantes
   */
  deselectAllIntegrantes() {
    this.selectedIntegrantes.clear();
    this.cdr.detectChanges();
  }

  /**
   * Verifica si todos los integrantes están seleccionados
   */
  areAllIntegrantesSelected(): boolean {
    if (this.integrantesGrupoActual.length === 0) return false;
    return this.integrantesGrupoActual.every(i => this.selectedIntegrantes.has(i.correo));
  }

  /**
   * Alterna selección de todos los integrantes
   */
  toggleSelectAllIntegrantes() {
    if (this.areAllIntegrantesSelected()) {
      this.deselectAllIntegrantes();
    } else {
      this.selectAllIntegrantes();
    }
  }
}
