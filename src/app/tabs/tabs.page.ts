import { Component, EnvironmentInjector, inject, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, AfterViewInit, NgZone, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import {
  IonIcon,
  IonButton,
  IonButtons,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink,
  IonTabBar,
  IonTabButton,
  IonHeader,
  IonToolbar,
  IonAvatar,
  IonTitle,
  IonSearchbar
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
  search,
  close,
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
    FormsModule,
    RouterModule,
    IonIcon,
    IonButton,
    IonButtons,
    IonLabel,
    IonRouterOutlet,
    IonRouterLink,
    IonTabBar,
    IonTabButton,
    IonHeader,
    IonToolbar,
    IonAvatar,
    IonTitle,
    IonSearchbar
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
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('250ms ease-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: '0', opacity: '0' }))
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
    { path: '/tabs/sistema', icon: 'settings', iconOutline: 'settings-outline', label: 'Ajustes', shortLabel: 'Config' }
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
  selectedGrupo: number = 0; // Grupo seleccionado en UI (para botones)

  // Búsqueda global
  busquedaGlobal = '';

  // Panel de búsqueda móvil
  isSearchOpen = false;
  globalSearchTerm = '';
  globalSearchResults: Array<{ id: string; type: 'student' | 'course'; name: string; meta: string }> = [];

  // Detectar si es desktop o móvil
  isDesktop = false;

  // URL actual para resaltar navegación activa
  currentUrl = '';

  tipoRubricaSeleccionado: 'PG' | 'PI' = 'PG';



  // Control del panel de comentarios
  comentariosColapsado: boolean = true;
  comentariosFijados: boolean = false;
  nuevoComentarioTexto: string = '';
  editandoComentarioId: string | null = null;
  editandoComentarioTexto: string = '';

  // Control de curso activo
  cursoActivo: string | null = null;







  // Modo de selección de estado para estudiantes
  modoSeleccionEstado: 'ok' | 'solo' | 'ausente' | null = null;

  // Set de integrantes seleccionados (por correo)
  selectedIntegrantes: Set<string> = new Set();

  private uiStateInitialized = false;
  private lastCursoActivo: string | null = null;



  constructor() {
    addIcons({
      // Filled icons
      home, library, clipboard, ribbon, settings, school, people, grid, trophy, chatbubble, person, book,
      documentText, star, cog, speedometer,
      // Estado icons
      checkmarkCircle, gitMerge, closeCircle,
      // Outline icons
      homeOutline, settingsOutline, schoolOutline, listOutline, analyticsOutline,
      informationCircleOutline, copyOutline, chevronDownOutline, chevronUpOutline,
      pinOutline, personOutline, peopleOutline, closeOutline, expandOutline, trophyOutline,
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
      const grupoSeleccionado = this.seguimientoService.grupoSeleccionado();
      if (this.selectedGrupo !== grupoSeleccionado) {
        this.selectedGrupo = grupoSeleccionado;
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

      } else {

        this.selectedGrupo = 0;

      }

      this.cdr.markForCheck();
    });

    effect(() => {
      const cursos = this.dataService.cursos();
      if (this.cursoActivo && Object.keys(cursos || {}).length >= 0) {

      }
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

  /**
   * Maneja cambios en la búsqueda global
   * Filtra estudiantes por nombre o número de grupo
   */
  onBusquedaGlobalChange(event: any): void {
    const valor = event.target?.value || '';
    this.busquedaGlobal = valor;

    if (!valor.trim()) {
      // Si está vacío, limpiar filtro
      this.seguimientoService.setFiltroBusqueda('');
      Logger.log('[TabsPage] Búsqueda global limpiada');
      return;
    }

    // Aplicar filtro de búsqueda
    this.seguimientoService.setFiltroBusqueda(valor.trim());
    Logger.log('[TabsPage] Búsqueda global aplicada:', valor.trim());
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



  /** Ruta activa para navegación desktop */
  get activeNavPath(): string {
    const active = this.navigationItems.find(item => this.currentUrl.includes(item.path));
    return active?.path ?? this.navigationItems[0].path;
  }

  /** Helper para parseInt en template */
  parseInt(value: string): number {
    return parseInt(value, 10) || 0;
  }

  /** Toggle del panel de búsqueda móvil */
  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (!this.isSearchOpen) {
      this.globalSearchTerm = '';
      this.globalSearchResults = [];
    }
  }

  /** Maneja la búsqueda global */
  onGlobalSearch(event: any): void {
    const term = event.target?.value?.toLowerCase() || '';
    if (!term || term.length < 2) {
      this.globalSearchResults = [];
      return;
    }

    // Buscar en cursos y estudiantes
    const cursos = this.dataService.cursos();
    const results: Array<{ id: string; type: 'student' | 'course'; name: string; meta: string }> = [];

    Object.entries(cursos || {}).forEach(([codigo, curso]) => {
      // Buscar el curso por nombre o código
      if (codigo.toLowerCase().includes(term) || (curso as any).nombre?.toLowerCase().includes(term)) {
        results.push({
          id: codigo,
          type: 'course',
          name: (curso as any).nombre || codigo,
          meta: `${(curso as any).integrantes?.length || 0} estudiantes`
        });
      }

      // Buscar estudiantes
      ((curso as any).integrantes || []).forEach((est: any) => {
        const nombreCompleto = `${est.nombres || ''} ${est.apellidos || ''}`.toLowerCase();
        if (nombreCompleto.includes(term) || est.correo?.toLowerCase().includes(term)) {
          results.push({
            id: est.correo || est.id,
            type: 'student',
            name: `${est.nombres || ''} ${est.apellidos || ''}`.trim(),
            meta: `${codigo} - Grupo ${est.grupo || '?'}`
          });
        }
      });
    });

    this.globalSearchResults = results.slice(0, 10); // Limitar a 10 resultados
  }

  /** Ejecutar búsqueda al presionar Enter */
  executeSearch(): void {
    if (this.globalSearchResults.length > 0) {
      this.navigateToResult(this.globalSearchResults[0]);
    }
  }

  /** Navegar al resultado seleccionado */
  navigateToResult(result: { id: string; type: 'student' | 'course'; name: string; meta: string }): void {
    this.isSearchOpen = false;
    this.globalSearchTerm = '';
    this.globalSearchResults = [];

    if (result.type === 'course') {
      this.router.navigate(['/tabs/cursos'], { queryParams: { curso: result.id } });
    } else {
      // Para estudiantes, navegar al curso correspondiente
      const cursoId = result.meta.split(' - ')[0];
      this.router.navigate(['/tabs/inicio'], { queryParams: { buscar: result.name } });
    }
  }

}
