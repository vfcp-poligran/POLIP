import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonChip,
    IonLabel,
    IonSearchbar,
    IonCheckbox,
    IonGrid,
    IonRow,
    IonCol,
    IonTextarea,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonSkeletonText,
    IonSpinner,
    ActionSheetController,
    ToastController,
    ModalController, // Add import
    MenuController,
    AlertController,
    ViewWillEnter,
    IonFab,
    IonFabButton,
    IonItem,
    IonAccordion,
    IonAccordionGroup
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
    homeOutline,
    searchOutline,
    peopleOutline,
    personOutline,
    closeCircleOutline,
    warningOutline,
    documentTextOutline,
    checkmarkCircleOutline,
    timeOutline,
    addOutline,
    add,
    closeOutline,
    chevronDownOutline,
    chevronUpOutline,
    statsChartOutline,
    listOutline,
    gridOutline,
    chatbubblesOutline,
    schoolOutline,
    mailOutline,
    ellipsisHorizontalOutline,
    checkmarkOutline,
    checkmark,
    trashOutline,
    createOutline,
    syncOutline,
    cloudOfflineOutline,
    notificationsOutline,
    alertCircleOutline,
    appsOutline,
    chevronForwardOutline,
    checkmarkDoneOutline,
    optionsOutline,
    addCircleOutline,
    informationCircleOutline,
    checkmarkDoneCircle,
    checkmarkCircle,
    checkmarkDoneCircleOutline,
    chatboxEllipsesOutline, bulbOutline,
    personAddOutline, hammerOutline, constructOutline,
    analyticsOutline, calendarOutline, pinOutline, lockOpenOutline, peopleCircleOutline, checkboxOutline, squareOutline, playOutline, stopCircleOutline,
    closeCircle, person, people, warning, stopCircle, playCircle, checkmarkDone, checkbox, search, archiveOutline
} from 'ionicons/icons';

import { DataService } from '../../services/data.service';
import { NovedadService } from '../../services/novedad.service';
import {
    Novedad,
    TipoNovedad,
    OrigenMensaje,
    ORIGEN_CONFIG,
    ESTADO_CONFIG
} from '../../models/novedad.model';

// Import animations
import { pageEnterAnimation, listAnimation, itemAnimation, modalAnimation } from '../../shared/animations/animations';

interface CursoResumen {
    codigo: string;
    nombre: string;
    color: string;
    estudiantes: number;
    grupos: string[];
    novedadesPendientes: number;
}

interface EstudianteSeleccionado {
    correo: string;
    nombre: string;
    curso: string;
    grupo: string;
    foto?: string;
    novedadesCount?: number; // Contador de novedades activas (no archivadas)
}

interface TimelineGroup {
    tipoNovedadNombre: string;
    tipoIcono: string; // Icono del tipo de novedad
    tipoColor: string; // Color del tipo de novedad
    estudianteNombre: string; // Nombre del estudiante afectado
    estudianteCorreo: string; // Correo del estudiante
    curso: string; // Código del curso
    grupo: string; // Número de grupo
    descripcion?: string;
    origen: OrigenMensaje;
    items: Novedad[];
}

interface ComparisonRow {
    fecha: Date;
    studentGroup?: TimelineGroup;
    groupEvent?: { // Simulación de evento grupal
        tipo: string;
        descripcion: string;
        coincide: boolean; // Si coincide con el estudiante
    };
    coincide: boolean;
}

interface DailyGroup {
    fechaLabel: string; // "Hoy", "Ayer", "12 Oct"
    fullDate: Date; // Para ordenar
    rows: ComparisonRow[];
    totalCambiosIndividuales: number;
    totalCambiosGrupales: number;
    isCoincidentDay: boolean; // Flag para visualización de acordeón
}

@Component({
    selector: 'app-inicio',
    templateUrl: './inicio.page.html',
    styleUrls: ['./inicio.page.scss'],
    standalone: true,
    animations: [pageEnterAnimation, listAnimation, itemAnimation, modalAnimation], // Add modalAnimation
    imports: [IonFabButton, IonFab,
        CommonModule,
        FormsModule,
        IonContent,
        IonButton,
        IonIcon,
        IonBadge,
        IonChip,
        IonLabel,
        IonSearchbar,
        IonCheckbox,
        IonGrid,
        IonRow,
        IonCol,
        IonTextarea,
        IonHeader,
        IonToolbar,
        IonTitle,
        IonButtons,
        IonModal,
        IonCard,
        IonCardHeader,
        IonCardTitle,
        IonCardSubtitle,
        IonSkeletonText,
        IonItem,
        IonAccordion,
        IonAccordionGroup
    ]
})
export class InicioPage implements OnInit, ViewWillEnter {
    private dataService = inject(DataService);
    public novedadService = inject(NovedadService);
    private actionSheetCtrl = inject(ActionSheetController);
    private toastController = inject(ToastController);
    private menuCtrl = inject(MenuController);
    private alertCtrl = inject(AlertController);

    // === SIGNALS ===
    cursosResumen = signal<CursoResumen[]>([]);
    estudiantesSeleccionados = signal<EstudianteSeleccionado[]>([]);
    estudiantesRegistrados = signal<EstudianteSeleccionado[]>([]); // Lista en main-content (Novedades)
    seleccionadosIndices = signal<Set<number>>(new Set()); // Índices seleccionados en lista Novedades
    sugerenciasCursos = signal<CursoResumen[]>([]); // Para comando #C
    busquedaTermino = signal<string>('');
    busquedaHistorialTermino = signal<string>(''); // Nuevo buscador exclusivo historial
    resultadosBusqueda = signal<EstudianteSeleccionado[]>([]);
    isModalRegistroVisible = signal<boolean>(false);
    isSearchModalVisible = signal<boolean>(false);
    tipoNovedadSeleccionado = signal<TipoNovedad | null>(null);
    origenSeleccionado = signal<OrigenMensaje>('teams');
    descripcionNovedad = signal<string>('');
    isDesktop = signal<boolean>(window.innerWidth >= 992);
    cursoExpandido = signal<string | null>(null); // Código del curso expandido en accordion
    tiposFiltro = signal<Set<string>>(new Set()); // Tipos de novedad seleccionados como filtro
    isLoading = signal<boolean>(true); // Para skeleton loaders

    // Tab historial
    tabHistorial = signal<'historial' | 'archivadas'>('historial');

    // Novedades seleccionadas para archivar/borrar
    novedadesSeleccionadasHistorial = signal<Set<string>>(new Set());

    modoVisualizacionHistorial = signal<'estudiante' | 'grupal'>('estudiante');

    // VCS History Modal Signals
    isVcsModalVisible = signal<boolean>(false);
    vcsGrupoTitulo = signal<string>('');
    vcsGrupoSubtitulo = signal<string>(''); // Nueva señal para curso/grupo
    vcsHistorialSeleccionado = signal<Novedad[]>([]);

    historialAgrupado = computed(() => {
        const source = this.tabHistorial() === 'historial'
            ? this.novedadService.novedadesActivas()
            : this.novedadService.novedadesArchivadas();

        let novedades = [...source].sort((a, b) =>
            new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime()
        );

        const termino = this.busquedaHistorialTermino().toLowerCase();
        if (termino) {
            novedades = novedades.filter(n =>
                (n.estudianteNombre || '').toLowerCase().includes(termino) ||
                String(n.grupo).toLowerCase().includes(termino) ||
                (n.tipoNovedadNombre || '').toLowerCase().includes(termino) ||
                String(n.cursoId).toLowerCase().includes(termino)
            );
        }

        if (this.modoVisualizacionHistorial() === 'estudiante') {
            const estudiantesMap = new Map<string, any>();
            const novedadesFiltradas = novedades.filter(n => n.tipoNovedadId !== 'grupo_bien');

            novedadesFiltradas.forEach(n => {
                const key = `${n.estudianteNombre}-${n.grupo}`;
                if (!estudiantesMap.has(key)) {
                    estudiantesMap.set(key, {
                        key: key,
                        estudianteNombre: n.estudianteNombre,
                        grupo: n.grupo,
                        cursoId: n.cursoId,
                        fechaUltima: n.fechaRegistro,
                        cambiosCount: 1,
                        novedades: [n]
                    });
                } else {
                    const existing = estudiantesMap.get(key);
                    existing.cambiosCount++;
                    existing.novedades.push(n);
                }
            });
            return Array.from(estudiantesMap.values());
        } else {
            const gruposMap = new Map<string, any>();
            novedades.forEach(n => {
                const key = `${n.cursoId}-${n.grupo}`;
                if (!gruposMap.has(key)) {
                    gruposMap.set(key, {
                        key: key,
                        cursoId: n.cursoId,
                        grupo: n.grupo,
                        fechaUltima: n.fechaRegistro,
                        cambiosCount: 1,
                        novedades: [n] // Guardamos todas para el VCS modal
                    });
                } else {
                    const existing = gruposMap.get(key);
                    existing.cambiosCount++;
                    existing.novedades.push(n);
                    // Mantener fecha mas reciente si la lista no esta ordenada, pero ya lo esta
                }
            });
            return Array.from(gruposMap.values());
        }
    });

    /**
     * Timeline agrupado por novedades idénticas consecutivas para visualización compacta
     */
    vcsTimelineGroups = computed(() => {
        const historial = this.vcsHistorialSeleccionado();
        const groups: TimelineGroup[] = [];

        if (historial.length === 0) return groups;

        let currentGroup: TimelineGroup | null = null;

        historial.forEach(item => {
            if (!currentGroup ||
                item.tipoNovedadId !== currentGroup.items[0].tipoNovedadId ||
                item.descripcion !== currentGroup.items[0].descripcion ||
                item.origen !== currentGroup.items[0].origen) {


                const tipoNovedad = this.novedadService.tiposNovedad().find(t => t.id === item.tipoNovedadId);

                currentGroup = {
                    tipoNovedadNombre: item.tipoNovedadNombre || 'Novedad',
                    tipoIcono: tipoNovedad?.icono || 'alert-circle-outline',
                    tipoColor: tipoNovedad?.color || '#999',
                    estudianteNombre: item.estudianteNombre || 'Estudiante',
                    estudianteCorreo: item.estudianteCorreo,
                    descripcion: item.descripcion,
                    origen: item.origen,
                    items: [item]
                };
                groups.push(currentGroup);
            } else {
                currentGroup.items.push(item);
            }
        });

        return groups;
    });

    // NEW: Course and group selection signals
    cursoSeleccionado = signal<string | null>(null);
    gruposSeleccionados = signal<Set<string>>(new Set()); // Multi-selection support
    seleccionadosDelGrupo = signal<Set<string>>(new Set()); // Legacy, kept for logic but synced with registrados

    // Novedad Config
    modoNovedad = signal<'grupal' | 'individual'>('individual');
    aliasNovedad = signal<string>('');
    fechaHoraNovedad = signal<string>(new Date().toISOString());

    // Novedades marcadas: Map<correoEstudiante, Set<tipoNovedad>>
    novedadesMarcadas = signal<Map<string, Set<string>>>(new Map());

    // === COMPUTED ===
    tiposNovedad = computed(() => this.novedadService.tiposActivos());
    novedadesPendientes = computed(() => this.novedadService.novedadesPendientes());
    pendientesCount = computed(() => this.novedadService.pendientesCount());
    isOnline = computed(() => this.novedadService.isOnline());

    // NEW: Computed properties for dynamic group buttons
    gruposDelCursoSeleccionado = computed(() => {
        const cursoActivo = this.cursoSeleccionado();
        if (!cursoActivo) return [];
        const curso = this.cursosResumen().find(c => c.codigo === cursoActivo);
        return curso?.grupos || [];
    });

    colorDelCursoSeleccionado = computed(() => {
        const cursoActivo = this.cursoSeleccionado();
        if (!cursoActivo) return '#4a90e2';
        const curso = this.cursosResumen().find(c => c.codigo === cursoActivo);
        return curso?.color || '#4a90e2';
    });

    estudiantesDeGruposSeleccionados = computed(() => {
        const cursoActivo = this.cursoSeleccionado();
        const grupos = this.gruposSeleccionados();
        if (!cursoActivo || grupos.size === 0) return [];

        const cursos = this.dataService.cursos();
        const estudiantes = cursos[cursoActivo] || [];

        return estudiantes.filter(e => grupos.has(String(e.grupo || ''))).map(est => ({
            correo: est.correo,
            nombre: `${est.nombres} ${est.apellidos}`,
            curso: cursoActivo,
            grupo: String(est.grupo || '')
        }));
    });

    Array = Array; // Expose Array to template

    // Constantes para template
    ORIGEN_CONFIG = ORIGEN_CONFIG;
    ESTADO_CONFIG = ESTADO_CONFIG;

    constructor() {
        addIcons({ timeOutline, archiveOutline, trashOutline, closeOutline, chevronForwardOutline, documentTextOutline, checkmarkCircleOutline, closeCircle, personAddOutline, schoolOutline, pinOutline, lockOpenOutline, checkmarkCircle, peopleOutline, informationCircleOutline, checkboxOutline, squareOutline, search, add, checkmarkOutline, checkmark, addCircleOutline, statsChartOutline, notificationsOutline, listOutline, playCircle, stopCircleOutline, checkmarkDoneOutline, calendarOutline, playOutline, addOutline, personOutline, peopleCircleOutline, hammerOutline, constructOutline, analyticsOutline, homeOutline, cloudOfflineOutline, appsOutline, checkmarkDoneCircleOutline, createOutline, bulbOutline, chevronDownOutline, checkmarkDoneCircle, alertCircleOutline, closeCircleOutline, optionsOutline, searchOutline, warningOutline, chevronUpOutline, gridOutline, chatboxEllipsesOutline, person, people, warning, stopCircle, checkmarkDone, checkbox });

        // Listener de resize
        window.addEventListener('resize', () => {
            this.isDesktop.set(window.innerWidth >= 992);
        });
    }

    ngOnInit(): void {
        this.cargarCursos();
    }

    ionViewWillEnter(): void {
        this.cargarCursos();
    }

    // === CARGA DE DATOS ===

    cargarCursos(): void {
        this.isLoading.set(true); // Start loading

        const cursos = this.dataService.cursos();
        const resumen: CursoResumen[] = [];

        Object.keys(cursos).forEach(key => {
            const estudiantes = cursos[key] || [];
            if (estudiantes.length === 0) return;

            const metadata = this.dataService.getCourseState(key);
            const grupos = [...new Set(estudiantes.map(e => String(e.grupo || '')))].filter(g => g);
            const stats = this.novedadService.getEstadisticasCurso(key);

            resumen.push({
                codigo: key,
                nombre: metadata?.metadata?.nombre || key,
                color: metadata?.color || '#4a90e2',
                estudiantes: estudiantes.length,
                grupos: grupos.sort((a, b) => parseInt(a) - parseInt(b)),
                novedadesPendientes: stats.pendientes
            });
        });

        this.cursosResumen.set(resumen);

        // Simulate loading delay for skeleton (remove in production if data loads instantly)
        setTimeout(() => {
            this.isLoading.set(false);
        }, 300);
    }

    /**
     * Maneja el cambio de accordion para cursos (legacy or mobile)
     */
    onAccordionChange(event: any): void {
        const value = event.detail.value;
        this.cursoExpandido.set(value || null);
    }

    // === UTILIDADES ===

    /**
     * Obtiene un insight visual (icono/color) si el estudiante tiene una novedad activa relevante
     */
    getStudentInsight(correo: string): { icono: string, color: string, tooltip: string } | null {
        // Buscar en novedades activas
        const activas = this.novedadService.novedadesActivas()
            .filter(n => n.estudianteCorreo === correo);

        if (activas.length === 0) return null;

        // Prioridad de visualización
        const tiposPrioritarios = ['Trabaja Solo', 'Ausente', 'Se unió con', 'Incumplimiento de aportes'];

        // Buscar si tiene alguna prioritaria
        const relevante = activas.find(n => tiposPrioritarios.includes(n.tipoNovedadNombre || ''));

        if (relevante) {
            const tipoRef = this.novedadService.tiposNovedad().find(t => t.id === relevante.tipoNovedadId);
            if (tipoRef) {
                return {
                    icono: tipoRef.icono,
                    color: tipoRef.color,
                    tooltip: `${relevante.tipoNovedadNombre} (${new Date(relevante.fechaRegistro).toLocaleDateString()})`
                };
            }
        }

        return null;
    }

    // === BÚSQUEDA Y SELECCIÓN ===

    onBusquedaChange(event: any): void {
        const termino = event.detail.value || '';
        const terminoLower = termino.toLowerCase();
        this.busquedaTermino.set(termino);

        // Limpiar sugerencias de cursos
        this.sugerenciasCursos.set([]);

        if (terminoLower.length < 2) {
            this.resultadosBusqueda.set([]);
            return;
        }

        const cursos = this.dataService.cursos();
        const resultados: EstudianteSeleccionado[] = [];

        Object.keys(cursos).forEach(cursoKey => {
            const estudiantes = cursos[cursoKey] || [];

            // Mejorar búsqueda para incluir coincidencia de curso y grupo
            const matchesCurso = cursoKey.toLowerCase().includes(terminoLower);

            estudiantes.forEach(est => {
                const nombreCompleto = `${est.nombres || ''} ${est.apellidos || ''}`.toLowerCase();
                const matchesNombre = nombreCompleto.includes(terminoLower);
                const matchesCorreo = est.correo?.toLowerCase().includes(terminoLower);

                // Flexibilidad en búsqueda de grupo: '7', 'G7', 'g7'
                const grupoEst = String(est.grupo || '').toLowerCase();
                const matchesGrupo = grupoEst === terminoLower ||
                    `g${grupoEst}` === terminoLower ||
                    grupoEst === terminoLower.replace('g', '');

                if (matchesNombre || matchesCorreo || matchesCurso || matchesGrupo) {
                    // CALCULAR CONTEO DE NOVEDADES ACTIVAS
                    const novedadesCount = this.novedadService.novedadesActivas()
                        .filter(n => n.estudianteCorreo === est.correo).length;

                    resultados.push({
                        correo: est.correo,
                        nombre: `${est.nombres || ''} ${est.apellidos || ''}`.trim() || 'Estudiante',
                        curso: cursoKey,
                        grupo: String(est.grupo || ''),
                        novedadesCount: novedadesCount
                    });
                }
            });
        });

        this.resultadosBusqueda.set(resultados.slice(0, 15));
    }

    /**
     * Agrega todos los estudiantes de un grupo específico a la lista de Novedades
     */
    agregarGrupoCompleto(grupo: string): void {
        const cursos = this.dataService.cursos();
        const estudiantesGrupo: EstudianteSeleccionado[] = [];

        Object.keys(cursos).forEach(cursoKey => {
            const estudiantes = cursos[cursoKey] || [];
            estudiantes.filter(est => String(est.grupo || '') === grupo)
                .forEach(est => {
                    estudiantesGrupo.push({
                        correo: est.correo,
                        nombre: `${est.nombres || ''} ${est.apellidos || ''}`.trim() || 'Estudiante',
                        curso: cursoKey,
                        grupo: String(est.grupo || '')
                    });
                });
        });

        if (estudiantesGrupo.length > 0) {
            this.estudiantesRegistrados.update(list => [...list, ...estudiantesGrupo]);
            this.toastController.create({
                message: `Agregados ${estudiantesGrupo.length} estudiantes del grupo ${grupo}`,
                duration: 2000,
                color: 'success'
            }).then(t => t.present());
        }
    }

    /**
     * Filtra la búsqueda de estudiantes por un curso específico
     */
    seleccionarCursoFiltro(curso: CursoResumen): void {
        const cursos = this.dataService.cursos();
        const estudiantes = cursos[curso.codigo] || [];

        const estudiantesDelCurso = estudiantes.map(est => ({
            correo: est.correo,
            nombre: `${est.nombres} ${est.apellidos}`,
            curso: curso.codigo,
            grupo: String(est.grupo || '')
        }));

        this.resultadosBusqueda.set(estudiantesDelCurso);
        this.sugerenciasCursos.set([]);
    }

    /**
     * Selecciona o deselecciona un estudiante individual desde los resultados de búsqueda
     */
    seleccionarEstudiante(estudiante: EstudianteSeleccionado): void {
        const actuales = this.estudiantesSeleccionados();
        const existe = actuales.some(e => e.correo === estudiante.correo);

        if (existe) {
            // Deseleccionar
            this.estudiantesSeleccionados.update(list => list.filter(e => e.correo !== estudiante.correo));
        } else {
            // Seleccionar
            this.estudiantesSeleccionados.update(list => [...list, estudiante]);
        }
    }

    /**
     * Verifica si un estudiante está seleccionado en los resultados de búsqueda
     */
    onBusquedaHistorialChange(event: any) {
        this.busquedaHistorialTermino.set(event.detail.value || '');
    }

    isEstudianteSeleccionado(correo: string): boolean {
        return this.estudiantesSeleccionados().some(e => e.correo === correo);
    }

    /**
     * Toggles selection of a student in the group members list
     */
    toggleSeleccionEstudianteGrupo(correo: string): void {
        const est = this.estudiantesDeGruposSeleccionados().find(e => e.correo === correo);
        if (!est) return;

        const actuales = this.estudiantesRegistrados();
        const existeIndex = actuales.findIndex(r => r.correo === correo);

        if (existeIndex !== -1) {
            // Remover de registrados
            this.removerRegistrado(existeIndex);
        } else {
            // Agregar a registrados
            const indexParaNovedad = this.estudiantesRegistrados().length;
            this.estudiantesRegistrados.update(list => [...list, est]);
            // Opcional: Seleccionar automáticamente para novedad (facilita el flujo)
            this.toggleSeleccionNovedad(indexParaNovedad);
        }
    }

    /**
     * Selects all students in the currently visible group list
     */
    seleccionarTodosGrupo(): void {
        const deEsteGrupo = this.estudiantesDeGruposSeleccionados();
        const actuales = this.estudiantesRegistrados();
        const actualesCorreos = new Set(actuales.map(r => r.correo));

        const nuevosAAgregar = deEsteGrupo.filter(e => !actualesCorreos.has(e.correo));

        if (nuevosAAgregar.length > 0) {
            this.estudiantesRegistrados.update(list => [...list, ...nuevosAAgregar]);

            // Seleccionar los nuevos para novedad
            const startIdx = actuales.length;
            this.seleccionadosIndices.update(set => {
                const newSet = new Set(set);
                nuevosAAgregar.forEach((_, i) => newSet.add(startIdx + i));
                return newSet;
            });
        }
    }

    /**
     * Deselects all students in the currently visible group list from registration
     */
    deseleccionarTodosGrupo(): void {
        const deEsteGrupoCorreos = new Set(this.estudiantesDeGruposSeleccionados().map(e => e.correo));

        // Obtenemos los índices de los que vamos a remover para limpiar también seleccionadosIndices
        const registrados = this.estudiantesRegistrados();
        const aRemoverIndices = registrados
            .map((r, i) => deEsteGrupoCorreos.has(r.correo) ? i : -1)
            .filter(idx => idx !== -1);

        // Remover de registrados
        this.estudiantesRegistrados.update(list => list.filter(r => !deEsteGrupoCorreos.has(r.correo)));

        // Resetear selección de índices (más seguro reconstruir que filtrar por el cambio de índices)
        this.seleccionadosIndices.set(new Set());
    }

    /**
     * Checks if a student is selected in the group members list
     */
    isEstudianteGrupoSeleccionado(correo: string): boolean {
        return this.estudiantesRegistrados().some(r => r.correo === correo);
    }

    /**
     * Limpia la búsqueda actual
     */
    limpiarBusqueda(): void {
        this.busquedaTermino.set('');
        this.resultadosBusqueda.set([]);
        this.sugerenciasCursos.set([]);
    }

    /**
     * Remueve un estudiante de la lista de seleccionados (búsqueda)
     */
    removerEstudiante(correo: string): void {
        this.estudiantesSeleccionados.update(list => list.filter(e => e.correo !== correo));
    }

    // === GESTIÓN DE LISTA CENTRAL (COLUMNA 2) ===

    /**
     * Transfiere los estudiantes seleccionados en la búsqueda a la lista de registrados
     */
    registrarEnLista(): void {
        const seleccionados = this.estudiantesSeleccionados();
        if (seleccionados.length === 0) return;

        // Agregar a la lista de registrados
        this.estudiantesRegistrados.update(list => [...list, ...seleccionados]);

        // Limpiar selección temporal
        this.estudiantesSeleccionados.set([]);
        this.limpiarBusqueda();
    }

    /**
     * Remueve un estudiante de la lista de registrados por índice
     */
    removerRegistrado(index: number): void {
        this.estudiantesRegistrados.update(list => list.filter((_, i) => i !== index));
        // También remover de seleccionadosIndices si estaba allí
        this.seleccionadosIndices.update(set => {
            const newSet = new Set(set);
            newSet.delete(index);
            // Re-indexar podría ser complejo, por ahora simplemente limpiamos selección
            // pero lo ideal es manejar IDs únicos.
            return newSet;
        });
    }

    /**
     * Limpia toda la lista de registrados
     */
    limpiarRegistrados(): void {
        this.estudiantesRegistrados.set([]);
        this.seleccionadosIndices.set(new Set());
    }

    /**
     * Toggle de selección para un item en la lista de registrados
     */
    toggleSeleccionNovedad(index: number): void {
        this.seleccionadosIndices.update(set => {
            const newSet = new Set(set);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }

    /**
     * Verifica si un item de la lista de registrados está seleccionado
     */
    isNovedadSelected(index: number): boolean {
        return this.seleccionadosIndices().has(index);
    }

    /**
     * Toggle de novedad para un estudiante específico
     */
    toggleNovedad(correo: string, tipoNovedad: string): void {
        this.novedadesMarcadas.update(map => {
            const newMap = new Map(map);
            const novedades = newMap.get(correo) || new Set();

            if (novedades.has(tipoNovedad)) {
                novedades.delete(tipoNovedad);
            } else {
                novedades.add(tipoNovedad);
            }

            if (novedades.size > 0) {
                newMap.set(correo, novedades);
            } else {
                newMap.delete(correo);
            }

            return newMap;
        });
    }

    /**
     * Verifica si un estudiante tiene una novedad marcada
     */
    tieneNovedad(correo: string, tipoNovedad: string): boolean {
        const novedades = this.novedadesMarcadas().get(correo);
        return novedades ? novedades.has(tipoNovedad) : false;
    }

    /**
     * Aplica una novedad a todos los estudiantes seleccionados (header clickeable)
     */
    aplicarNovedadASeleccionados(tipoNovedad: string): void {
        const registrados = this.estudiantesRegistrados();
        const seleccionados = this.seleccionadosIndices();

        const indicesAAplicar = seleccionados.size === 0
            ? registrados.map((_, i) => i)
            : Array.from(seleccionados);

        indicesAAplicar.forEach(idx => {
            const est = registrados[idx];
            if (est) {
                this.toggleNovedad(est.correo, tipoNovedad);
            }
        });

        this.toastController.create({
            message: `Novedad aplicada a ${indicesAAplicar.length} estudiantes`,
            duration: 1500,
            color: 'success'
        }).then(t => t.present());
    }

    /**
     * Remueve una novedad específica de un estudiante en el resumen
     */
    removerNovedadItem(correo: string, tipo: string): void {
        this.novedadesMarcadas.update(map => {
            const newMap = new Map(map);
            const novedades = newMap.get(correo);
            if (novedades) {
                const updatedSet = new Set(novedades);
                updatedSet.delete(tipo);
                if (updatedSet.size === 0) {
                    newMap.delete(correo);
                } else {
                    newMap.set(correo, updatedSet);
                }
            }
            return newMap;
        });
    }

    /**
     * Obtiene el resumen de novedades para la sección inferior
     */
    getResumenNovedades(): { correo: string; nombre: string; novedades: string[] }[] {
        const registrados = this.estudiantesRegistrados();
        const marcadas = this.novedadesMarcadas();

        return registrados
            .filter(est => marcadas.has(est.correo))
            .map(est => ({
                correo: est.correo,
                nombre: est.nombre,
                novedades: Array.from(marcadas.get(est.correo) || [])
            }));
    }

    /**
     * Verifica si hay estudiantes con novedades marcadas
     */
    tieneNovedadesPendientes(): boolean {
        return this.novedadesMarcadas().size > 0;
    }

    // For Undo functionality
    lastBatchSaved = signal<string[]>([]);

    /**
     * Guarda todas las novedades marcadas
     */
    async guardarNovedades(): Promise<void> {
        const resumen = this.getResumenNovedades();
        if (resumen.length === 0) {
            const toast = await this.toastController.create({
                message: 'No hay novedades para marcar',
                duration: 2000,
                color: 'warning'
            });
            await toast.present();
            return;
        }

        // Ya no dependemos estrictamente de cursoSeleccionado() si los estudiantes ya tienen su curso asignado
        const comentarios = this.descripcionNovedad();
        const grupoNovedadId = `GN-${Date.now()}`;
        const esGrupalSeleccionado = this.modoNovedad() === 'grupal';

        // Preparar lote de novedades
        const novedadesParaBatch: any[] = [];

        for (const item of resumen) {
            const estudiante = this.estudiantesRegistrados().find(e => e.correo === item.correo);
            if (!estudiante) continue;

            for (const tipoNovedad of item.novedades) {
                const cursoMetadata = this.cursosResumen().find(c => c.codigo === estudiante.curso);
                novedadesParaBatch.push({
                    estudianteCorreo: estudiante.correo,
                    estudianteNombre: estudiante.nombre,
                    cursoId: estudiante.curso,
                    cursoNombre: cursoMetadata?.nombre || estudiante.curso,
                    grupo: estudiante.grupo,
                    tipoNovedadId: tipoNovedad,
                    tipoNovedadNombre: this.getNombreNovedad(tipoNovedad),
                    origen: 'presencial' as const,
                    descripcion: comentarios || undefined,
                    estado: 'en_revision' as const,
                    grupoNovedadId: grupoNovedadId,
                    esNovedadGrupal: esGrupalSeleccionado
                });
            }
        }

        if (novedadesParaBatch.length === 0) {
            const toast = await this.toastController.create({
                message: 'No hay novedades para registrar',
                duration: 2000,
                color: 'warning'
            });
            await toast.present();
            return;
        }

        const creadas = await this.novedadService.registrarNovedadesBatch(novedadesParaBatch);
        this.lastBatchSaved.set(creadas.map(c => c.id));

        const toast = await this.toastController.create({
            message: `✓ ${creadas.length} novedades guardadas`,
            duration: 4000,
            color: 'success',
            buttons: [
                {
                    text: 'DESHACER',
                    role: 'cancel',
                    handler: () => { this.deshacerUltimoGuardado(); }
                }
            ]
        });
        await toast.present();

        // Limpiar estado
        this.novedadesMarcadas.set(new Map());
        this.descripcionNovedad.set('');
        this.limpiarRegistrados();
        this.cargarCursos();
    }

    async deshacerUltimoGuardado() {
        const ids = this.lastBatchSaved();
        if (ids.length === 0) return;

        for (const id of ids) {
            await this.novedadService.eliminarNovedad(id);
        }

        this.lastBatchSaved.set([]);
        const toast = await this.toastController.create({
            message: 'Registro revertido correctamente',
            duration: 2000,
            color: 'medium'
        });
        await toast.present();
    }



    async eliminarNovedadItem(id: string) {
        const alert = await this.alertCtrl.create({
            header: 'Eliminar Registro',
            message: '¿Estás seguro de que deseas eliminar este registro del historial?',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: async () => {
                        await this.novedadService.eliminarNovedad(id);
                        const toast = await this.toastController.create({
                            message: 'Registro eliminado',
                            duration: 1500,
                            color: 'medium'
                        });
                        await toast.present();
                    }
                }
            ]
        });
        await alert.present();
    }

    getNombreNovedad(tipo: string): string {
        const nombres: Record<string, string> = {
            'trabaja_solo': 'Trabaja Solo',
            'grupo_bien': 'El grupo está trabajando bien',
            'ausente': 'Ausente',
            'aporte_nulo': 'Incumplimiento de aportes'
        };
        return nombres[tipo] || tipo;
    }

    /**
     * Selecciona o deselecciona todos los items en la lista de registrados
     */
    toggleSeleccionarTodos(): void {
        const registrados = this.estudiantesRegistrados();
        const seleccionados = this.seleccionadosIndices();

        if (seleccionados.size === registrados.length && registrados.length > 0) {
            this.seleccionadosIndices.set(new Set());
        } else {
            this.seleccionadosIndices.set(new Set(registrados.map((_, i) => i)));
        }
    }

    // === MODAL DE REGISTRO ===

    abrirModalRegistro(): void {
        this.isModalRegistroVisible.set(true);
    }

    cerrarModalRegistro(): void {
        this.isModalRegistroVisible.set(false);
        this.limpiarFormulario();
    }

    // === MODAL DE BÚSQUEDA (MÓVIL/TABLET) ===

    toggleSearchModal(): void {
        this.isSearchModalVisible.set(!this.isSearchModalVisible());
    }

    closeSearchModal(): void {
        this.isSearchModalVisible.set(false);
    }

    // VCS Modal Methods
    abrirModalVcs(item: any) {
        if (item.estudianteNombre) {
            this.vcsGrupoTitulo.set(`${item.estudianteNombre}`);
            // El item en la tabla grupal (modo estudiante) suele tener grupo y cursoId
            this.vcsGrupoSubtitulo.set(`${item.cursoId} - Grupo ${item.grupo}`);
        } else if (item.grupo) {
            this.vcsGrupoTitulo.set(`Grupo ${item.grupo}`);
            this.vcsGrupoSubtitulo.set(`${item.cursoId}`);
        }
        this.vcsHistorialSeleccionado.set(item.novedades || []);
        this.isVcsModalVisible.set(true);
    }

    cerrarModalVcs() {
        this.isVcsModalVisible.set(false);
    }

    // Modal breakpoints: undefined on desktop (to center), sheet on mobile


    vcsModalBreakpoints = computed(() => {
        return this.isDesktop() ? undefined : [0, 0.6, 1];
    });

    // Also initial breakpoint
    vcsModalInitialBreakpoint = computed(() => {
        return this.isDesktop() ? undefined : 0.6;
    });


    /**
     * Confirma el registro final de las novedades en el servicio
     */
    async registrarNovedadConfirmada(): Promise<void> {
        const seleccionados = this.estudiantesRegistrados().filter((_, i) =>
            this.seleccionadosIndices().has(i)
        );

        if (seleccionados.length === 0 || !this.tipoNovedadSeleccionado()) {
            const toast = await this.toastController.create({
                message: 'Selecciona estudiantes y un tipo de novedad.',
                duration: 2000,
                color: 'warning'
            });
            await toast.present();
            return;
        }

        const tipo = this.tipoNovedadSeleccionado()!;
        const origen = this.origenSeleccionado();
        const descripcion = this.descripcionNovedad();

        for (const est of seleccionados) {
            await this.novedadService.registrarNovedad({
                estudianteCorreo: est.correo,
                estudianteNombre: est.nombre,
                cursoId: est.curso,
                grupo: est.grupo,
                tipoNovedadId: tipo.id,
                tipoNovedadNombre: tipo.nombre,
                origen: origen,
                descripcion: descripcion || undefined,
                estado: 'en_revision'
            });
        }

        const toast = await this.toastController.create({
            message: `${seleccionados.length} novedades registradas con éxito.`,
            duration: 2000,
            color: 'success'
        });
        await toast.present();

        this.cerrarModalRegistro();
        this.limpiarRegistrados();
        this.cargarCursos();
    }

    /**
     * Limpia los campos del formulario de registro
     */
    limpiarFormulario(): void {
        this.tipoNovedadSeleccionado.set(null);
        this.descripcionNovedad.set('');
        this.origenSeleccionado.set('teams');
    }

    // === FILTROS GLOBALES (Legacy/Optional) ===

    toggleTipoFiltro(tipoId: string): void {
        this.tiposFiltro.update(set => {
            const newSet = new Set(set);
            if (newSet.has(tipoId)) {
                newSet.delete(tipoId);
            } else {
                newSet.add(tipoId);
            }
            return newSet;
        });
    }

    isTipoFiltroActivo(tipoId: string): boolean {
        return this.tiposFiltro().has(tipoId);
    }

    // === ACCIONES DE CARTAS DE CURSO ===

    /**
     * Toggle course selection with exclusive behavior
     */
    toggleCursoSeleccion(codigo: string): void {
        const actual = this.cursoSeleccionado();

        if (actual === codigo) {
            // Deselect course
            this.cursoSeleccionado.set(null);
            this.gruposSeleccionados.set(new Set());
        } else {
            // Select new course
            this.cursoSeleccionado.set(codigo);
            // Restore previously selected groups for this course
            this.restoreCourseGroupSelection(codigo);
        }
    }

    /**
     * Toggle group selection with multi-selection support
     */
    toggleGrupoSeleccion(grupo: string, event?: MouseEvent): void {
        const cursoActivo = this.cursoSeleccionado();
        if (!cursoActivo) return;

        const isMultiSelect = event?.ctrlKey || event?.metaKey;

        this.gruposSeleccionados.update(grupos => {
            const newSet = new Set(grupos);

            if (isMultiSelect) {
                // Multi-selection: toggle grupo
                if (newSet.has(grupo)) {
                    newSet.delete(grupo);
                } else {
                    newSet.add(grupo);
                }
            } else {
                // Single selection: replace
                newSet.clear();
                newSet.add(grupo);
            }

            return newSet;
        });

        // Save to CourseState for persistence
        this.saveCourseGroupSelection(cursoActivo);
    }

    /**
     * Save group selection state to CourseState
     */
    private saveCourseGroupSelection(cursoId: string): void {
        const grupos = Array.from(this.gruposSeleccionados());
        this.dataService.updateCourseState(cursoId, {
            gruposSeleccionados: grupos
        });
    }

    /**
     * Restore group selection when switching courses
     */
    private restoreCourseGroupSelection(cursoId: string): void {
        const courseState = this.dataService.getCourseState(cursoId);
        const gruposGuardados = courseState?.gruposSeleccionados || [];
        this.gruposSeleccionados.set(new Set(gruposGuardados));
    }

    /**
     * Add all students from selected groups to registration list
     */
    agregarGruposSeleccionados(): void {
        const estudiantes = this.estudiantesDeGruposSeleccionados();
        if (estudiantes.length === 0) return;

        const nuevos: EstudianteSeleccionado[] = estudiantes.map(est => ({
            correo: est.correo,
            nombre: est.nombre || 'Estudiante',
            curso: this.cursoSeleccionado()!,
            grupo: String(est.grupo || '')
        }));

        this.estudiantesRegistrados.update(list => [...list, ...nuevos]);

        this.toastController.create({
            message: `Agregados ${nuevos.length} estudiantes de ${this.gruposSeleccionados().size} grupo(s)`,
            duration: 2000,
            color: 'success'
        }).then(t => t.present());
    }

    /**
     * Legacy method - for backward compatibility with agregarGrupoCompleto
     */
    seleccionarGrupo(curso: CursoResumen, grupo: string): void {
        this.cursoSeleccionado.set(curso.codigo);
        this.toggleGrupoSeleccion(grupo);
        this.agregarGrupoCompleto(grupo);
    }

    private modalCtrl = inject(ModalController); // Inject missing ModalController

    async abrirSelectorNovedades() {
        const module: any = await import('../../components/novedad-selector/novedad-selector.component');
        const modal = await this.modalCtrl.create({
            component: module.NovedadSelectorComponent,
            componentProps: {
                estudiantes: this.estudiantesRegistrados(),
                allStudents: this.getTodosEstudiantesCursoActual()
            },
            breakpoints: [0, 0.8, 1],
            initialBreakpoint: 0.8
        });

        await modal.present();

        const { data, role } = await modal.onWillDismiss();

        if (role === 'confirm' && data && data.selectedTypes) {
            const tipos: TipoNovedad[] = data.selectedTypes;
            const relatedStudent = data.relatedStudent;

            const novedadesParaRegistrar: Omit<Novedad, 'id' | 'fechaRegistro' | 'syncStatus'>[] = [];
            const estudiantes = this.estudiantesRegistrados();

            estudiantes.forEach(est => {
                tipos.forEach(tipo => {
                    // Ensure all required fields are present to satisfy Omit<Novedad...> type
                    const nuevaNovedad: any = {
                        estudianteCorreo: est.correo,
                        estudianteNombre: est.nombre,
                        cursoId: est.curso,
                        grupo: est.grupo,
                        tipoNovedadId: tipo.id,
                        tipoNovedadNombre: tipo.nombre,
                        origen: this.origenSeleccionado(),
                        estado: 'confirmado',
                        descripcion: tipo.descripcion,
                        // fechaRegistro is added by service
                    };

                    if (tipo.nombre === 'Se unió con' && relatedStudent) {
                        nuevaNovedad.relatedStudentId = relatedStudent.correo;
                        nuevaNovedad.relatedStudentName = relatedStudent.nombre;
                        nuevaNovedad.descripcion = `Se unió con ${relatedStudent.nombre}`;
                    }

                    novedadesParaRegistrar.push(nuevaNovedad);
                });
            });

            this.novedadService.registrarNovedadesBatch(novedadesParaRegistrar);

            this.toastController.create({
                message: `Se registraron ${novedadesParaRegistrar.length} novedades exitosamente`,
                duration: 2000,
                color: 'success',
                icon: 'checkmark-circle'
            }).then(t => t.present());

            this.limpiarRegistrados();
        }
    }

    /**
     * Obtiene todos los estudiantes del curso actualmente seleccionado
     * (Usado para pasar al selector para "Se unió con")
     */
    getTodosEstudiantesCursoActual(): any[] {
        const codigoCurso = this.cursoSeleccionado();
        if (!codigoCurso) return [];
        return this.dataService.cursos()[codigoCurso] || [];
    }

    /**
     * Extract course code with indicator and block
     * Handles format: "EEPM-B01-BLQ2-V-timestamp" -> "EPM-B01-BLQ2"
     * or "ÉNFASIS EN PROGRAMACIÓN MÓVIL-B01-BLOQUE 2-timestamp" -> "EPM-B01-BLQ2"
     */
    getCodigoCorto(codigo: string): string {
        // Split by dash to get parts
        const parts = codigo.split('-');

        if (parts.length < 2) {
            return codigo.slice(0, 10).toUpperCase();
        }

        // Primera parte: puede ser "EEPM" o "ÉNFASIS EN PROGRAMACIÓN MÓVIL"
        let nombreParte = parts[0];

        // Si comienza con doble letra (ej: "EEPM"), quitar la primera
        if (nombreParte.length > 3 && nombreParte[0] === nombreParte[1].toUpperCase()) {
            nombreParte = nombreParte.substring(1); // "EEPM" -> "EPM"
        }

        // Si es ya un acrónimo (todo mayúsculas, corto), usarlo directamente
        let acronimo: string;
        if (nombreParte === nombreParte.toUpperCase() && nombreParte.length <= 5) {
            acronimo = nombreParte;
        } else {
            // Generar acrónimo desde nombre completo
            acronimo = this.getAcronymFromName(nombreParte);
        }

        // Segunda parte: indicador (B01, B02, etc.)
        const indicador = parts[1];

        // Tercera parte (opcional): BLOQUE o BLQ
        let bloqueTexto = '';
        if (parts.length > 2) {
            const terceraParte = parts[2];

            // Si ya viene como "BLQ2",usarlo
            if (terceraParte.startsWith('BLQ')) {
                bloqueTexto = `-${terceraParte}`;
            }
            // Si viene como "BLOQUE 2", convertir a "BLQ2"
            else if (terceraParte.toUpperCase().includes('BLOQUE')) {
                const bloqueMatch = terceraParte.match(/BLOQUE\s*(\d+)/i);
                if (bloqueMatch) {
                    bloqueTexto = `-BLQ${bloqueMatch[1]}`;
                }
            }
        }

        return `${acronimo}-${indicador}${bloqueTexto}`;
    }

    /**
     * Generate acronym from course name (e.g., "ÉNFASIS EN PROGRAMACIÓN MÓVIL" -> "EPM")
     */
    private getAcronymFromName(name: string): string {
        // Lista de palabras a ignorar (preposiciones, artículos, etc.)
        const palabrasIgnorar = ['de', 'en', 'del', 'la', 'el', 'los', 'las', 'a', 'con', 'para', 'por', 'y'];

        // Dividir nombre en palabras
        const palabras = name
            .split(/[\s-]+/)  // Split por espacios o guiones
            .filter(p => p.length > 0)
            .filter(p => !palabrasIgnorar.includes(p.toLowerCase()));

        // Tomar primera letra de cada palabra significativa
        const acronimo = palabras
            .map(palabra => {
                // Normalizar caracteres acentuados
                const primeraLetra = palabra.charAt(0);
                return primeraLetra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            })
            .join('');

        return acronimo || name.substring(0, 3).toUpperCase();
    }

    /**
     * Calculate appropriate text color for background using WCAG 2.1 relative luminance.
     */
    getTextColorForBackground(bgColor: string): string {
        if (!bgColor || bgColor === 'transparent') {
            return '#000000';
        }

        const hex = bgColor.replace('#', '');
        const fullHex = hex.length === 3
            ? hex.split('').map(c => c + c).join('')
            : hex;

        const r = parseInt(fullHex.substring(0, 2), 16);
        const g = parseInt(fullHex.substring(2, 4), 16);
        const b = parseInt(fullHex.substring(4, 6), 16);

        const toLinear = (channel: number): number => {
            const c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };

        const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    getTipoIcon(tipoId: string): string {
        return this.novedadService.getTipoConfig(tipoId)?.icono || 'document-text-outline';
    }

    getTipoColor(tipoId: string): string {
        return this.novedadService.getTipoConfig(tipoId)?.color || '#607d8b';
    }

    getOrigenIcon(origen: string): string {
        return ORIGEN_CONFIG[origen as OrigenMensaje]?.icono || 'ellipsis-horizontal-outline';
    }

    getOrigenLabel(origen: string): string {
        return ORIGEN_CONFIG[origen as OrigenMensaje]?.label || 'Otro';
    }

    getOrigenColor(origen: string): string {
        return ORIGEN_CONFIG[origen as OrigenMensaje]?.color || '#9e9e9e';
    }

    formatFecha(fecha: Date): string {
        const now = new Date();
        const diff = now.getTime() - new Date(fecha).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Hace menos de 1h';
        if (hours < 24) return `Hace ${hours}h`;

        const days = Math.floor(hours / 24);
        if (days === 1) return 'Ayer';
        return `Hace ${days} días`;
    }
    // === SELECCIÓN MULTIPLE DESDE MODAL ===

    isEstudianteSeleccionadoModal(correo: string): boolean {
        return this.estudiantesSeleccionados().some(e => e.correo === correo);
    }

    toggleEstudianteSeleccionModal(estudiante: any, cursoCodigo: string) {
        const estSeleccionado: EstudianteSeleccionado = {
            correo: estudiante.correo,
            nombre: (estudiante.nombres || estudiante.nombre || 'Estudiante').trim(),
            curso: cursoCodigo,
            grupo: String(estudiante.grupo)
        };

        this.estudiantesSeleccionados.update(list => {
            const exists = list.some(e => e.correo === estSeleccionado.correo);
            if (exists) {
                return list.filter(e => e.correo !== estSeleccionado.correo);
            } else {
                return [...list, estSeleccionado];
            }
        });
    }

    isGrupoSeleccionadoModal(cursoCodigo: string, grupo: string): boolean {
        const estudiantesGrupo = this.dataService.cursos()[cursoCodigo]?.filter(e => String(e.grupo) === String(grupo)) || [];
        if (estudiantesGrupo.length === 0) return false;

        const seleccionados = this.estudiantesSeleccionados();
        // Verificar si TODOS los del grupo están seleccionados
        return estudiantesGrupo.every(e => seleccionados.some(sel => sel.correo === e.correo));
    }

    toggleGrupoSeleccionModal(cursoCodigo: string, grupo: string) {
        const estudiantesGrupo = this.dataService.cursos()[cursoCodigo]?.filter(e => String(e.grupo) === String(grupo)) || [];
        if (estudiantesGrupo.length === 0) return;

        const todosSeleccionados = this.isGrupoSeleccionadoModal(cursoCodigo, grupo);

        this.estudiantesSeleccionados.update(list => {
            if (todosSeleccionados) {
                // Deseleccionar todos los del grupo
                return list.filter(sel => !estudiantesGrupo.some(e => e.correo === sel.correo));
            } else {
                // Agregar los que falten
                const nuevos = estudiantesGrupo
                    .filter(e => !list.some(sel => sel.correo === e.correo))
                    .map(e => ({
                        correo: e.correo,
                        nombre: (e.nombres || (e as any).nombre || 'Estudiante').trim(),
                        curso: cursoCodigo,
                        grupo: String(e.grupo)
                    }));
                return [...list, ...nuevos];
            }
        });
    }

    agregarAlBuffer(): void {
        const seleccionados = this.estudiantesSeleccionados();
        if (seleccionados.length === 0) return;

        this.estudiantesRegistrados.update(list => {
            const nuevos = seleccionados.filter(sel => !list.some(reg => reg.correo === sel.correo));
            return [...list, ...nuevos];
        });

        this.estudiantesSeleccionados.set([]);
        this.closeSearchModal();

        this.toastController.create({
            message: `${seleccionados.length} estudiantes agregados al buffer`,
            duration: 2000,
            color: 'success'
        }).then(t => t.present());
    }

    /**
     * Gestión de selección en historial
     */
    toggleSeleccionNovedadHistorial(novedadId: string): void {
        this.novedadesSeleccionadasHistorial.update(set => {
            const next = new Set(set);
            if (next.has(novedadId)) {
                next.delete(novedadId);
            } else {
                next.add(novedadId);
            }
            return next;
        });
    }

    isNovedadSeleccionada(novedadId: string): boolean {
        return this.novedadesSeleccionadasHistorial().has(novedadId);
    }

    limpiarSeleccionHistorial(): void {
        this.novedadesSeleccionadasHistorial.set(new Set());
    }

    /**
     * Acciones masivas de historial
     */
    async archivarSeleccionadosHistorial(): Promise<void> {
        const ids = Array.from(this.novedadesSeleccionadasHistorial());
        if (ids.length === 0) return;

        await this.novedadService.archivarNovedades(ids);
        this.limpiarSeleccionHistorial();

        const toast = await this.toastController.create({
            message: `${ids.length} novedades archivadas`,
            duration: 2000,
            color: 'medium'
        });
        toast.present();
    }

    async restaurarSeleccionadosHistorial(): Promise<void> {
        const ids = Array.from(this.novedadesSeleccionadasHistorial());
        if (ids.length === 0) return;

        await this.novedadService.restaurarNovedades(ids);
        this.limpiarSeleccionHistorial();

        const toast = await this.toastController.create({
            message: `${ids.length} novedades restauradas`,
            duration: 2000,
            color: 'success'
        });
        toast.present();
    }

    async eliminarSeleccionadosHistorial(): Promise<void> {
        const ids = Array.from(this.novedadesSeleccionadasHistorial());
        if (ids.length === 0) return;

        const alert = await this.alertCtrl.create({
            header: 'Eliminar Historial',
            message: `¿Estás seguro de que deseas eliminar permanentemente ${ids.length} novedades? Esta acción no se puede deshacer.`,
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Eliminar',
                    role: 'destructive',
                    handler: async () => {
                        await this.novedadService.borrarNovedades(ids);
                        this.limpiarSeleccionHistorial();
                        const toast = await this.toastController.create({
                            message: `${ids.length} novedades eliminadas`,
                            duration: 2000,
                            color: 'danger'
                        });
                        toast.present();
                    }
                }
            ]
        });
        alert.present();
    }

    async vaciarHistorialCompleto(): Promise<void> {
        const alert = await this.alertCtrl.create({
            header: 'Vaciar Historial',
            message: '¿Estás seguro de que deseas borrar TODO el historial de novedades? Esta acción eliminará permanentemente todos los registros.',
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Vaciar Todo',
                    role: 'destructive',
                    handler: async () => {
                        await this.novedadService.borrarTodoHistorial();
                        this.limpiarSeleccionHistorial();
                        const toast = await this.toastController.create({
                            message: 'Historial vaciado por completo',
                            duration: 2000,
                            color: 'danger'
                        });
                        toast.present();
                    }
                }
            ]
        });
        alert.present();
    }

    /**
     * Abre el historial (VCS Modal) desde los resultados de búsqueda
     */
    abrirHistorialDesdeBusqueda(est: EstudianteSeleccionado, event: Event): void {
        event.stopPropagation(); // Evitar seleccionar al estudiante al clicar el contador

        const novedades = this.novedadService.novedadesActivas()
            .filter(n => n.estudianteCorreo === est.correo)
            .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());

        if (novedades.length > 0) {
            this.vcsHistorialSeleccionado.set(novedades);
            this.vcsGrupoTitulo.set(est.nombre);
            this.vcsGrupoSubtitulo.set(`${est.curso} - Grupo ${est.grupo}`);
            this.isVcsModalVisible.set(true);
        } else {
            this.toastController.create({
                message: 'No hay novedades registradas para este estudiante',
                duration: 2000,
                color: 'medium'
            }).then(t => t.present());
        }
    }

    /**
     * Abre el registro de novedad para un estudiante desde el modal de historial
     */
    abrirRegistroDesdeHistorial(): void {
        const novedades = this.vcsHistorialSeleccionado();
        if (novedades.length === 0) return;

        const primerNovedad = novedades[0];
        const est: EstudianteSeleccionado = {
            correo: primerNovedad.estudianteCorreo,
            nombre: primerNovedad.estudianteNombre || 'Estudiante',
            curso: primerNovedad.cursoId || '',
            grupo: primerNovedad.grupo || ''
        };

        // Cerrar modal de historial
        this.isVcsModalVisible.set(false);

        // Cerrar modal de búsqueda si estaba abierto
        this.isSearchModalVisible.set(false);

        // Agregar a la lista de registrados si no está
        const registrados = this.estudiantesRegistrados();
        if (!registrados.some(r => r.correo === est.correo)) {
            this.estudiantesRegistrados.update(list => [...list, est]);
        }

        // Desplazarse a la sección de registro o mostrar feedback
        this.toastController.create({
            message: `Listo para registrar novedad de ${est.nombre}`,
            duration: 2000,
            color: 'primary'
        }).then(t => t.present());
    }

    /**
     * Compara si dos novedades son idénticas para la lógica de intervalos
     */
    esNovedadIdentica(actual: Novedad, anterior: Novedad | null): boolean {
        if (!anterior) return false;
        return actual.tipoNovedadId === anterior.tipoNovedadId &&
            actual.descripcion === anterior.descripcion &&
            actual.origen === anterior.origen;
    }

    /**
     * Obtiene los estudiantes de un curso y grupo específico
     */

    // Timeline con agrupación diaria y comparativa
    vcsDailyComparison = computed<DailyGroup[]>(() => {
        const history = this.vcsHistorialSeleccionado();
        if (!history || history.length === 0) return [];

        const studentGroups: TimelineGroup[] = [];
        let currentGroup: TimelineGroup | null = null;
        const sortedHistory = [...history].sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());

        sortedHistory.forEach((novedad, index) => {
            const anterior = index > 0 ? sortedHistory[index - 1] : null;

            if (currentGroup && anterior && this.esNovedadIdentica(novedad, anterior)) {
                currentGroup.items.push(novedad);
            } else {
                if (currentGroup) studentGroups.push(currentGroup);

                const nombreNovedad = novedad.tipoNovedadNombre || 'Novedad';

                // Obtener tipo de novedad completo para icono y color
                const tipoNovedad = this.novedadService.tiposNovedad().find(t => t.id === novedad.tipoNovedadId);

                currentGroup = {
                    tipoNovedadNombre: nombreNovedad,
                    tipoIcono: tipoNovedad?.icono || 'alert-circle-outline',
                    tipoColor: tipoNovedad?.color || '#999',
                    estudianteNombre: novedad.estudianteNombre || 'Estudiante',
                    estudianteCorreo: novedad.estudianteCorreo,
                    descripcion: novedad.descripcion,
                    origen: novedad.origen,
                    items: [novedad]
                };
            }
        });
        if (currentGroup) studentGroups.push(currentGroup);


        const dailyMap = new Map<string, DailyGroup>();

        // 1. Procesar grupos del estudiante
        studentGroups.forEach(group => {
            const date = new Date(group.items[0].fechaRegistro);

            // Determinar la etiqueta del día
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateLabel = '';
            if (date.toDateString() === today.toDateString()) {
                dateLabel = 'Hoy';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateLabel = 'Ayer';
            } else {
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                dateLabel = `${day}/${month}`;
            }

            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

            if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, {
                    fechaLabel: dateLabel,
                    fullDate: date,
                    rows: [],
                    totalCambiosIndividuales: 0,
                    totalCambiosGrupales: 0,
                    isCoincidentDay: false
                });
            }

            const dailyGroup = dailyMap.get(dateKey)!;

            // Simulacion mejorada
            const isPositive = group.tipoNovedadNombre.toLowerCase().includes('bien') || group.tipoNovedadNombre.toLowerCase().includes('buen');
            // Alta coincidencia si es positivo
            const isGroupEvent = isPositive ? Math.random() < 0.8 : Math.random() < 0.2;

            let groupEventData: any = undefined;

            if (isGroupEvent) {
                groupEventData = {
                    tipo: group.tipoNovedadNombre,
                    descripcion: 'El grupo mantiene este comportamiento.',
                    coincide: true
                };
                dailyGroup.totalCambiosGrupales++;
            }

            dailyGroup.totalCambiosIndividuales++;
            if (groupEventData && groupEventData.coincide) dailyGroup.isCoincidentDay = true;

            dailyGroup.rows.push({
                fecha: date,
                studentGroup: group,
                groupEvent: groupEventData,
                coincide: !!groupEventData
            });
        });

        // Ordenar filas por fecha (más reciente primero)
        dailyMap.forEach(dailyGroup => {
            dailyGroup.rows.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        });

        return Array.from(dailyMap.values()).sort((a, b) => b.fullDate.getTime() - a.fullDate.getTime());
    });

    getEstudiantesGrupo(cursoCodigo: string, grupo: string): any[] {
        return this.dataService.cursos()[cursoCodigo]?.filter(e => String(e.grupo) === String(grupo)) || [];
    }
}
