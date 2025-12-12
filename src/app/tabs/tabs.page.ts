import { Component, EnvironmentInjector, inject, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import {
  IonIcon,
  IonSearchbar,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonMenu,
  IonMenuToggle,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonFooter,
  IonAvatar,
  IonContent,
  MenuController
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { homeOutline, settingsOutline, schoolOutline, listOutline, analyticsOutline, informationCircleOutline, copyOutline, chevronDownOutline, chevronUpOutline, pinOutline, personOutline, peopleOutline, searchOutline, closeOutline, menuOutline, chevronForwardOutline, expandOutline, trophyOutline } from 'ionicons/icons';
import { DataService } from '../services/data.service';
import { FullscreenService } from '../services/fullscreen.service';
import { SeguimientoService, SeguimientoGrupo, ComentarioGrupo, EvaluacionRubrica, CriterioEvaluado, IntegranteInfo } from '../services/seguimiento.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonIcon,
    IonSearchbar,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton,
    IonMenu,
    IonMenuToggle,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonFooter,
    IonAvatar,
    IonContent
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
  private router = inject(Router);
  private dataService = inject(DataService);
  private seguimientoService = inject(SeguimientoService);
  public fullscreenService = inject(FullscreenService);
  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('searchBar', { read: ElementRef }) searchbarRef!: ElementRef;

  private resizeHandler: (() => void) | null = null;
  private subscriptions: Subscription[] = [];
  globalSearch: string = '';
  selectedGrupo: number = 0;
  searchExpanded: boolean = false;
  isDesktop: boolean = window.innerWidth >= 992;
  grupos: string[] = [];
  tipoRubricaSeleccionado: 'PG' | 'PI' = 'PG';

  // Seguimiento actual
  seguimientoActual: SeguimientoGrupo | null = null;

  // Control del panel de comentarios
  comentariosColapsado: boolean = true;
  comentariosFijados: boolean = false;

  // Control de curso activo
  cursoActivo: string | null = null;

  // Integrantes del grupo seleccionado
  integrantesGrupoActual: any[] = [];

  // Resultados de búsqueda global
  searchResults: Array<{
    estudiante: any;
    curso: string;
    cursoNombre: string;
    cursoMetadata?: any;
  }> = [];
  searchTerm: string = '';

  constructor() {
    addIcons({ homeOutline, settingsOutline, schoolOutline, listOutline, analyticsOutline, informationCircleOutline, copyOutline, chevronDownOutline, chevronUpOutline, pinOutline, personOutline, peopleOutline, searchOutline, closeOutline, expandOutline, trophyOutline });

    // Suscribirse al seguimiento actual con cleanup
    this.subscriptions.push(
      this.seguimientoService.seguimientoActual$.pipe(
        distinctUntilChanged((prev: SeguimientoGrupo | null, curr: SeguimientoGrupo | null) => JSON.stringify(prev) === JSON.stringify(curr))
      ).subscribe((seguimiento: SeguimientoGrupo | null) => {
        this.seguimientoActual = seguimiento;
      })
    );

    // Suscribirse al grupo seleccionado con cleanup
    this.subscriptions.push(
      this.seguimientoService.grupoSeleccionado$.subscribe((grupo: number) => {
        this.selectedGrupo = grupo;
        // Actualizar integrantes cuando cambia el grupo seleccionado
        this.actualizarIntegrantesGrupo();
        // Forzar detección de cambios para actualizar la UI
        this.cdr.detectChanges();
      })
    );

    // Suscribirse al curso activo para mostrar/ocultar grupos con debounce
    this.subscriptions.push(
      this.dataService.uiState$.pipe(
        debounceTime(50),
        distinctUntilChanged((prev: any, curr: any) => prev.cursoActivo === curr.cursoActivo)
      ).subscribe((uiState: any) => {
        this.cursoActivo = uiState.cursoActivo;

        // Actualizar grupos disponibles cuando cambia el curso activo
        if (this.cursoActivo) {
          this.actualizarGruposDisponibles();

          // Restaurar grupo seleccionado desde CourseState
          const courseState = this.dataService.getCourseState(this.cursoActivo);
          if (courseState?.filtroGrupo && courseState.filtroGrupo !== 'todos') {
            // Extraer número del grupo (G1 -> 1, G2 -> 2, etc.)
            const grupoNum = parseInt(courseState.filtroGrupo.replace(/\D/g, ''));

            // 🛡️ GUARDIA: Solo restaurar si es diferente al actual
            if (grupoNum > 0 && this.selectedGrupo !== grupoNum) {
              this.selectedGrupo = grupoNum;
              this.seguimientoService.setGrupoSeleccionado(grupoNum);
            }
          } else {
            // Resetear a "Todos" si no hay grupo guardado
            if (this.selectedGrupo !== 0) {
              this.selectedGrupo = 0;
              this.seguimientoService.setGrupoSeleccionado(0);
            }
          }

          // Actualizar integrantes del grupo
          this.actualizarIntegrantesGrupo();
        } else {
          this.grupos = [];
          this.selectedGrupo = 0;
          this.integrantesGrupoActual = [];
        }
      })
    );

    // Suscribirse a cambios en cursos para actualizar grupos con debounce
    this.subscriptions.push(
      this.dataService.cursos$.pipe(
        debounceTime(100),
        distinctUntilChanged((prev: any, curr: any) => Object.keys(prev).length === Object.keys(curr).length)
      ).subscribe(() => {
        if (this.cursoActivo) {
          this.actualizarGruposDisponibles();
        }
      })
    );

    // Suscribirse a resultados de búsqueda global
    this.subscriptions.push(
      this.dataService.searchResults$.subscribe(results => {
        this.searchResults = results.results;
        this.searchTerm = results.term;
        console.log(`📋[tabs.page] Resultados de búsqueda actualizados: ${this.searchResults.length} resultados`);
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
    const newIsDesktop = window.innerWidth >= 992;
    if (this.isDesktop !== newIsDesktop) {
      this.isDesktop = newIsDesktop;
      this.handleMenuState();
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

  /** Maneja el estado del menú según desktop/mobile */
  private async handleMenuState(): Promise<void> {
    if (!this.isDesktop) {
      // En móvil: habilitar menú con swipe
      await this.menuCtrl.enable(true, 'mainMenu');
      await this.menuCtrl.swipeGesture(true, 'mainMenu');
    } else {
      // En desktop: deshabilitar menú (no existe en el DOM)
      try {
        await this.menuCtrl.enable(false, 'mainMenu');
      } catch (e) {
        // El menú puede no existir, ignorar
      }
    }
  }

  onGlobalSearch(event: any): void {
    const searchTerm = event.detail.value?.toLowerCase() || '';
    this.dataService.setGlobalSearchTerm(searchTerm);
    // Trigger cross-course search
    this.dataService.searchAcrossAllCourses(searchTerm);
  }

  toggleSearch(): void {
    this.searchExpanded = !this.searchExpanded;

    // Si se expande, enfocar el searchbar después de un pequeño delay para la animación
    if (this.searchExpanded) {
      setTimeout(() => {
        // Usar ViewChild para acceder al searchbar (patrón Angular correcto)
        this.searchbarRef?.nativeElement?.setFocus();
      }, 350); // Tiempo para completar la animación
    } else {
      // Si se cierra, limpiar la búsqueda
      this.globalSearch = '';
      this.dataService.setGlobalSearchTerm('');
    }
  }

  closeSearch(): void {
    this.searchExpanded = false;
    this.globalSearch = '';
    this.dataService.setGlobalSearchTerm('');
  }

  onSearchBlur(): void {
    // Solo cerrar si no hay texto de búsqueda
    setTimeout(() => {
      if (!this.globalSearch?.trim()) {
        this.searchExpanded = false;
      }
    }, 150);
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
   * Obtiene los integrantes del grupo actualmente seleccionado
   */
  private actualizarIntegrantesGrupo(): void {
    if (!this.cursoActivo || this.selectedGrupo === 0) {
      this.integrantesGrupoActual = [];
      this.cdr.detectChanges();
      return;
    }

    const estudiantes = this.dataService.getCurso(this.cursoActivo);
    if (!estudiantes || estudiantes.length === 0) {
      this.integrantesGrupoActual = [];
      this.cdr.detectChanges();
      return;
    }

    // Filtrar por grupo seleccionado
    // El grupo del estudiante puede ser "1", "G1", "Grupo 1", etc.
    const grupoNum = this.selectedGrupo;
    const grupoNumStr = String(grupoNum);

    this.integrantesGrupoActual = estudiantes.filter(e => {
      if (!e.grupo) return false;
      // Extraer solo el número del campo grupo del estudiante
      const estudianteGrupoNum = e.grupo.toString().replace(/\D/g, '');
      return estudianteGrupoNum === grupoNumStr;
    });

    this.cdr.detectChanges();
  }

  /**
   * Obtiene la calificación (PG + PI) para un estudiante y entrega específica
   */
  obtenerCalificacionEstudiante(estudiante: any, entrega: string): number {
    if (!this.cursoActivo) return 0;

    const pg = this.dataService.getEvaluacion(this.cursoActivo, entrega, 'PG', estudiante.grupo)?.puntosTotales || 0;
    const pi = this.dataService.getEvaluacion(this.cursoActivo, entrega, 'PI', estudiante.correo)?.puntosTotales || 0;

    return pg + pi;
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
    console.log(`📋[TabsPage] Abriendo rúbrica desde sidebar: ${entrega} - ${tipo} `);

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
        console.log('✅ Texto de seguimiento copiado al portapapeles con formato y colores');
      }).catch(() => {
        // Fallback a texto plano si falla el formato HTML
        navigator.clipboard.writeText(textoPlano).then(() => {
          console.log('✅ Texto de seguimiento copiado al portapapeles (texto plano)');
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

  // Método helper para template
  parseInt(value: string): number {
    return parseInt(value) || 0;
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
  navigateToTab(tab: string) {
    this.router.navigate(['/tabs', tab]);
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
}
