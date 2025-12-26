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
    IonFab,
    IonFabButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonModal,
    IonInput,
    IonDatetimeButton,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    ActionSheetController,
    ToastController,
    MenuController,
    ViewWillEnter
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
    analyticsOutline, calendarOutline, pinOutline, lockOpenOutline
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
}

@Component({
    selector: 'app-inicio',
    templateUrl: './inicio.page.html',
    styleUrls: ['./inicio.page.scss'],
    standalone: true,
    imports: [
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
        IonFabButton,
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
        IonFab
    ]
})
export class InicioPage implements OnInit, ViewWillEnter {
    private dataService = inject(DataService);
    private novedadService = inject(NovedadService);
    private actionSheetCtrl = inject(ActionSheetController);
    private toastController = inject(ToastController);
    private menuCtrl = inject(MenuController);

    // === SIGNALS ===
    cursosResumen = signal<CursoResumen[]>([]);
    estudiantesSeleccionados = signal<EstudianteSeleccionado[]>([]);
    estudiantesRegistrados = signal<EstudianteSeleccionado[]>([]); // Lista en main-content (Novedades)
    seleccionadosIndices = signal<Set<number>>(new Set()); // Índices seleccionados en lista Novedades
    sugerenciasCursos = signal<CursoResumen[]>([]); // Para comando #C
    busquedaTermino = signal<string>('');
    resultadosBusqueda = signal<EstudianteSeleccionado[]>([]);
    isModalRegistroVisible = signal<boolean>(false);
    tipoNovedadSeleccionado = signal<TipoNovedad | null>(null);
    origenSeleccionado = signal<OrigenMensaje>('teams');
    descripcionNovedad = signal<string>('');
    isDesktop = signal<boolean>(window.innerWidth >= 992);
    cursoExpandido = signal<string | null>(null); // Código del curso expandido en accordion
    tiposFiltro = signal<Set<string>>(new Set()); // Tipos de novedad seleccionados como filtro

    // NEW: Course and group selection signals
    cursoSeleccionado = signal<string | null>(null);
    gruposSeleccionados = signal<Set<string>>(new Set()); // Multi-selection support

    // Asignación de Novedad
    aliasNovedad = signal<string>('');
    fechaHoraNovedad = signal<string>(new Date().toISOString());

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

        return estudiantes.filter(e => grupos.has(String(e.grupo || '')));
    });

    Array = Array; // Expose Array to template

    // Constantes para template
    ORIGEN_CONFIG = ORIGEN_CONFIG;
    ESTADO_CONFIG = ESTADO_CONFIG;

    constructor() {
        addIcons({ homeOutline, cloudOfflineOutline, closeOutline, schoolOutline, chevronForwardOutline, addOutline, peopleOutline, addCircleOutline, checkmarkCircle, informationCircleOutline, appsOutline, pinOutline, lockOpenOutline, documentTextOutline, checkmarkCircleOutline, trashOutline, personAddOutline, hammerOutline, constructOutline, analyticsOutline, calendarOutline, notificationsOutline, checkmarkDoneOutline, checkmarkOutline, checkmarkDoneCircleOutline, createOutline, timeOutline, bulbOutline, personOutline, chevronDownOutline, checkmarkDoneCircle, alertCircleOutline, closeCircleOutline, optionsOutline, searchOutline, warningOutline, chevronUpOutline, listOutline, gridOutline, chatboxEllipsesOutline });

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
    }

    /**
     * Maneja el cambio de accordion para cursos (legacy or mobile)
     */
    onAccordionChange(event: any): void {
        const value = event.detail.value;
        this.cursoExpandido.set(value || null);
    }

    // === BÚSQUEDA Y SELECCIÓN ===

    onBusquedaChange(event: any): void {
        const termino = event.detail.value || '';
        const terminoLower = termino.toLowerCase();
        this.busquedaTermino.set(termino);

        // Limpiar sugerencias de cursos
        this.sugerenciasCursos.set([]);

        // Comando #C: Mostrar cursos disponibles
        if (termino === '#C' || termino === '#c') {
            this.sugerenciasCursos.set(this.cursosResumen());
            this.resultadosBusqueda.set([]);
            return;
        }

        // Comando #GX: Agregar todos los integrantes del grupo X
        const grupoMatch = termino.match(/^#[Gg](\d+)$/);
        if (grupoMatch) {
            const grupoNumero = grupoMatch[1];
            this.agregarGrupoCompleto(grupoNumero);
            this.busquedaTermino.set('');
            this.resultadosBusqueda.set([]);
            return;
        }

        if (terminoLower.length < 2) {
            this.resultadosBusqueda.set([]);
            return;
        }

        const cursos = this.dataService.cursos();
        const resultados: EstudianteSeleccionado[] = [];

        Object.keys(cursos).forEach(cursoKey => {
            const estudiantes = cursos[cursoKey] || [];
            estudiantes.forEach(est => {
                const nombreCompleto = `${est.nombres || ''} ${est.apellidos || ''}`.toLowerCase();
                if (nombreCompleto.includes(terminoLower) || est.correo?.toLowerCase().includes(terminoLower)) {
                    resultados.push({
                        correo: est.correo,
                        nombre: `${est.nombres} ${est.apellidos}`,
                        curso: cursoKey,
                        grupo: String(est.grupo || '')
                    });
                }
            });
        });

        this.resultadosBusqueda.set(resultados.slice(0, 10));
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
                        nombre: `${est.nombres} ${est.apellidos}`,
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
    isEstudianteSeleccionado(correo: string): boolean {
        return this.estudiantesSeleccionados().some(e => e.correo === correo);
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
            nombre: `${est.nombres} ${est.apellidos}`,
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

    // === UTILIDADES ===

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
     * This ensures proper contrast ratios for accessibility (WCAG AA standard).
     * 
     * @param bgColor - Hex color code (e.g., "#4a90e2")
     * @returns "#ffffff" (white) for dark backgrounds, "#000000" (black) for light backgrounds
     */
    getTextColorForBackground(bgColor: string): string {
        // Handle invalid input
        if (!bgColor || bgColor === 'transparent') {
            return '#000000';
        }

        // Convert hex to RGB
        const hex = bgColor.replace('#', '');

        // Handle 3-digit hex codes
        const fullHex = hex.length === 3
            ? hex.split('').map(c => c + c).join('')
            : hex;

        const r = parseInt(fullHex.substring(0, 2), 16);
        const g = parseInt(fullHex.substring(2, 4), 16);
        const b = parseInt(fullHex.substring(4, 6), 16);

        // WCAG 2.1 relative luminance calculation
        // Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
        // where R, G, B are gamma-corrected values

        const toLinear = (channel: number): number => {
            const c = channel / 255;
            return c <= 0.03928
                ? c / 12.92
                : Math.pow((c + 0.055) / 1.055, 2.4);
        };

        const rLinear = toLinear(r);
        const gLinear = toLinear(g);
        const bLinear = toLinear(b);

        const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

        // Threshold at 0.5 provides good contrast
        // For even better accessibility, could use 0.179 (WCAG AAA level)
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
}
