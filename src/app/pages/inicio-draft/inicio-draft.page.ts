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
    IonList,
    IonItem,
    IonCheckbox,
    IonFabButton,
    IonAccordion,
    IonAccordionGroup,
    IonGrid,
    IonRow,
    IonCol,
    IonNote,
    IonTextarea,
    IonDatetime,
    IonFab,
    IonModal,
    IonInput,
    IonDatetimeButton,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
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
    chatboxEllipsesOutline
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
    selector: 'app-inicio-draft',
    templateUrl: './inicio-draft.page.html',
    styleUrls: ['./inicio-draft.page.scss'],
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
        IonList,
        IonItem,
        IonCheckbox,
        IonFabButton,
        IonAccordion,
        IonAccordionGroup,
        IonGrid,
        IonRow,
        IonCol,
        IonNote,
        IonTextarea,
        IonDatetime,
        IonFab,
        IonModal,
        IonInput,
        IonDatetimeButton,
        IonMenu,
        IonHeader,
        IonToolbar,
        IonTitle
    ]
})
export class InicioDraftPage implements OnInit, ViewWillEnter {
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
    drawerVisible = signal<boolean>(false);
    tipoNovedadSeleccionado = signal<TipoNovedad | null>(null);
    origenSeleccionado = signal<OrigenMensaje>('teams');
    descripcionNovedad = signal<string>('');
    isDesktop = signal<boolean>(window.innerWidth >= 992);
    cursoExpandido = signal<string | null>(null); // Código del curso expandido en accordion
    tiposFiltro = signal<Set<string>>(new Set()); // Tipos de novedad seleccionados como filtro

    // Asignación de Novedad
    tiposSeleccionados = signal<Set<string>>(new Set());
    origenesSeleccionados = signal<Set<string>>(new Set());
    aliasNovedad = signal<string>('');
    fechaHoraNovedad = signal<string>(new Date().toISOString());
    consecutivoNovedad = signal<number>(1);

    // === COMPUTED ===
    codigoNovedad = computed(() => `N${String(this.consecutivoNovedad()).padStart(3, '0')}`);
    tiposNovedad = computed(() => this.novedadService.tiposActivos());
    novedadesPendientes = computed(() => this.novedadService.novedadesPendientes());
    pendientesCount = computed(() => this.novedadService.pendientesCount());
    isOnline = computed(() => this.novedadService.isOnline());

    // Constantes para template
    ORIGEN_CONFIG = ORIGEN_CONFIG;
    ESTADO_CONFIG = ESTADO_CONFIG;

    constructor() {
        addIcons({ homeOutline, cloudOfflineOutline, closeOutline, schoolOutline, chevronForwardOutline, addOutline, appsOutline, checkmarkDoneCircleOutline, checkmarkCircleOutline, createOutline, trashOutline, documentTextOutline, checkmarkDoneOutline, addCircleOutline, checkmarkCircle, informationCircleOutline, checkmarkDoneCircle, personOutline, chevronDownOutline, alertCircleOutline, closeCircleOutline, optionsOutline, searchOutline, peopleOutline, warningOutline, timeOutline, chevronUpOutline, statsChartOutline, listOutline, gridOutline, chatbubblesOutline, mailOutline, ellipsisHorizontalOutline, checkmarkOutline, syncOutline, notificationsOutline, chatboxEllipsesOutline });

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
     * Maneja el cambio de accordion para cursos
     */
    onAccordionChange(event: any): void {
        const value = event.detail.value;
        this.cursoExpandido.set(value || null);
    }

    // === BÚSQUEDA ===

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
            estudiantes
                .filter(est => String(est.grupo) === grupo)
                .forEach(est => {
                    estudiantesGrupo.push({
                        correo: est.correo,
                        nombre: `${est.nombres} ${est.apellidos}`,
                        curso: cursoKey,
                        grupo: grupo
                    });
                });
        });

        if (estudiantesGrupo.length > 0) {
            this.estudiantesRegistrados.update(list => [...list, ...estudiantesGrupo]);
        }
    }

    /**
     * Selecciona un curso desde el comando #C y filtra por ese curso
     */
    seleccionarCursoFiltro(curso: CursoResumen): void {
        this.sugerenciasCursos.set([]);
        // Agregar todos los estudiantes del curso a la lista
        const cursos = this.dataService.cursos();
        const estudiantes = cursos[curso.codigo] || [];
        const estudiantesDelCurso: EstudianteSeleccionado[] = estudiantes.map(est => ({
            correo: est.correo,
            nombre: `${est.nombres} ${est.apellidos}`,
            curso: curso.codigo,
            grupo: String(est.grupo || '')
        }));

        if (estudiantesDelCurso.length > 0) {
            this.estudiantesRegistrados.update(list => [...list, ...estudiantesDelCurso]);
        }
        this.busquedaTermino.set('');
    }

    // === SELECCIÓN DE ESTUDIANTES ===

    /**
     * Selecciona o deselecciona un estudiante (toggle)
     * Click para agregar, click nuevamente para remover
     */
    seleccionarEstudiante(estudiante: EstudianteSeleccionado): void {
        const actuales = this.estudiantesSeleccionados();
        const existe = actuales.find(e => e.correo === estudiante.correo);

        if (existe) {
            // Ya existe -> deseleccionar (toggle off)
            this.estudiantesSeleccionados.update(list =>
                list.filter(e => e.correo !== estudiante.correo)
            );
        } else {
            // No existe -> agregar (toggle on)
            this.estudiantesSeleccionados.update(list => [...list, estudiante]);
        }

        // NO limpiar búsqueda para permitir selección múltiple
        // El usuario puede limpiar manualmente o seguir seleccionando
    }

    /**
     * Verifica si un estudiante ya está seleccionado
     */
    isEstudianteSeleccionado(correo: string): boolean {
        return this.estudiantesSeleccionados().some(e => e.correo === correo);
    }

    /**
     * Limpia los resultados de búsqueda manualmente
     */
    limpiarBusqueda(): void {
        this.busquedaTermino.set('');
        this.resultadosBusqueda.set([]);
        this.sugerenciasCursos.set([]);
    }

    removerEstudiante(correo: string): void {
        this.estudiantesSeleccionados.update(list =>
            list.filter(e => e.correo !== correo)
        );
    }

    limpiarSeleccion(): void {
        this.estudiantesSeleccionados.set([]);
    }

    // --- Métodos Asignación Novedad ---

    /**
     * Toggle de tipo de novedad para asignación
     */
    toggleTipoSeleccionado(tipoId: string): void {
        this.tiposSeleccionados.update(set => {
            const newSet = new Set(set);
            if (newSet.has(tipoId)) {
                newSet.delete(tipoId);
            } else {
                newSet.add(tipoId);
            }
            return newSet;
        });
    }

    isTipoSeleccionado(tipoId: string): boolean {
        return this.tiposSeleccionados().has(tipoId);
    }

    limpiarFormulario(): void {
        this.aliasNovedad.set('');
        this.descripcionNovedad.set('');
        this.tiposSeleccionados.set(new Set());
        this.origenesSeleccionados.set(new Set());
        this.fechaHoraNovedad.set(new Date().toISOString());
    }

    /**
     * Registra la novedad para todos los estudiantes seleccionados en la grilla
     */
    async confirmarNovedadesSeleccionadas(): Promise<void> {
        const seleccionados = this.estudiantesRegistrados().filter((_, i) =>
            this.seleccionadosIndices().has(i)
        );

        if (seleccionados.length === 0 || this.tiposSeleccionados().size === 0) {
            const toast = await this.toastController.create({
                message: 'Debes seleccionar al menos un estudiante y un tipo de novedad.',
                duration: 2000,
                color: 'warning',
                position: 'top'
            });
            await toast.present();
            return;
        }

        // Para cada estudiante seleccionado, creamos los registros
        const groupSuffix = this.aliasNovedad() ? ` [${this.aliasNovedad()}]` : '';
        const descripcionCompleta = this.descripcionNovedad() + groupSuffix;

        for (const est of seleccionados) {
            for (const tipoId of this.tiposSeleccionados()) {
                const tipo = this.tiposNovedad().find(t => t.id === tipoId);
                if (!tipo) continue;

                const origenes = this.origenesSeleccionados().size > 0
                    ? Array.from(this.origenesSeleccionados())
                    : ['otro'];

                for (const origenId of origenes) {
                    await this.novedadService.registrarNovedad({
                        estudianteCorreo: est.correo,
                        estudianteNombre: est.nombre,
                        cursoId: est.curso,
                        grupo: est.grupo,
                        tipoNovedadId: tipo.id,
                        tipoNovedadNombre: tipo.nombre,
                        origen: origenId as any,
                        descripcion: descripcionCompleta,
                        estado: 'en_revision'
                    });
                }
            }
        }

        // Incrementar consecutivo
        this.consecutivoNovedad.update(n => n + 1);

        // Limpiar
        this.limpiarFormulario();
        this.limpiarRegistrados(); // Limpia la lista de estudiantes para novedad

        // Feedback
        const toast = await this.toastController.create({
            message: `Registradas novedades para ${seleccionados.length} estudiantes exitosamente.`,
            duration: 2000,
            color: 'success',
            position: 'top'
        });
        await toast.present();
    }

    /**
     * Toggle de origen del mensaje para asignación
     */
    toggleOrigenSeleccionado(origen: string): void {
        this.origenesSeleccionados.update(set => {
            const newSet = new Set(set);
            if (newSet.has(origen)) {
                newSet.delete(origen);
            } else {
                newSet.add(origen);
            }
            return newSet;
        });
    }

    isOrigenSeleccionado(origen: string): boolean {
        return this.origenesSeleccionados().has(origen);
    }

    /**
     * Toggle de tipo de novedad como filtro
     */
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

    /**
     * Verifica si un tipo está activo como filtro
     */
    isTipoFiltroActivo(tipoId: string): boolean {
        return this.tiposFiltro().has(tipoId);
    }

    /**
     * Transfiere los estudiantes seleccionados a la lista de registrados en main-content
     * No abre el drawer, los agrega directamente a la lista visible
     */
    registrarEnLista(): void {
        const seleccionados = this.estudiantesSeleccionados();
        if (seleccionados.length === 0) return;

        // Agregar a registrados (permite duplicados para múltiples novedades)
        this.estudiantesRegistrados.update(list => [...list, ...seleccionados]);

        // Limpiar selección después de registrar
        this.limpiarSeleccion();
    }

    /**
     * Remueve un estudiante de la lista de registrados por índice
     * (usa índice porque puede haber duplicados del mismo correo)
     */
    removerRegistrado(index: number): void {
        this.estudiantesRegistrados.update(list =>
            list.filter((_, i) => i !== index)
        );
    }

    /**
     * Limpia toda la lista de registrados
     */
    limpiarRegistrados(): void {
        this.estudiantesRegistrados.set([]);
        this.seleccionadosIndices.set(new Set());
    }

    /**
     * Toggle de selección para un item en la lista de Novedades
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
     * Verifica si un item está seleccionado en la lista de Novedades
     */
    isNovedadSelected(index: number): boolean {
        return this.seleccionadosIndices().has(index);
    }

    /**
     * Selecciona/deselecciona todos los items de la lista de Novedades
     */
    toggleSeleccionarTodos(): void {
        const registrados = this.estudiantesRegistrados();
        const seleccionados = this.seleccionadosIndices();

        if (seleccionados.size === registrados.length) {
            // Todos seleccionados -> deseleccionar todos
            this.seleccionadosIndices.set(new Set());
        } else {
            // No todos seleccionados -> seleccionar todos
            const todosIndices = new Set(registrados.map((_, i) => i));
            this.seleccionadosIndices.set(todosIndices);
        }
    }

    // === DRAWER DE REGISTRO ===

    toggleDrawer(): void {
        this.drawerVisible.update(v => !v);
    }

    abrirDrawer(): void {
        this.drawerVisible.set(true);
    }

    cerrarDrawer(): void {
        this.drawerVisible.set(false);
        this.limpiarFormulario();
    }

    // --- Gestión de Drawer ---

    async abrirMenuTipos(): Promise<void> {
        await this.menuCtrl.enable(true, 'tipos-menu');
        await this.menuCtrl.open('tipos-menu');
    }

    seleccionarTipoDesdeMenu(tipo: TipoNovedad): void {
        this.tipoNovedadSeleccionado.set(tipo);
        this.menuCtrl.close('tipos-menu');
    }

    // === ACTION SHEET PARA TIPO DE NOVEDAD (MÓVIL - LEGACY) ===

    async mostrarTiposNovedad(): Promise<void> {
        const tipos = this.tiposNovedad();
        const buttons = tipos.map(tipo => ({
            text: tipo.nombre,
            icon: tipo.icono,
            handler: () => {
                this.tipoNovedadSeleccionado.set(tipo);
            }
        }));

        buttons.push({
            text: 'Cancelar',
            icon: 'close-outline',
            handler: () => { }
        });

        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Tipo de Novedad',
            buttons
        });

        await actionSheet.present();
    }

    // === REGISTRO DE NOVEDAD ===

    // === REGISTRO DE NOVEDAD (DEP) ===
    // Este bloque será removido ya que usamos confirmarNovedadesSeleccionadas
    async registrarNovedad(): Promise<void> {
        await this.confirmarNovedadesSeleccionadas();
    }

    /**
     * Confirma las novedades seleccionadas en la lista (Desktop)
     * Registra novedades para los items seleccionados en estudiantesRegistrados
     */
    // Deprecated: old implementation of confirming
    /*
    async confirmarNovedadesSeleccionadas(): Promise<void> {
        const tipo = this.tipoNovedadSeleccionado();
        const indices = this.seleccionadosIndices();
        const registrados = this.estudiantesRegistrados();

        if (!tipo || indices.size === 0) {
            console.warn('Faltan datos para confirmar novedades');
            return;
        }

        // Obtener estudiantes seleccionados
        const estudiantesAConfirmar = Array.from(indices)
            .map(i => registrados[i])
            .filter(est => est !== undefined);

        if (estudiantesAConfirmar.length === 0) return;

        // Registrar novedades para cada estudiante seleccionado
        for (const est of estudiantesAConfirmar) {
            await this.novedadService.registrarNovedad({
                tipoNovedadId: tipo.id,
                tipoNovedadNombre: tipo.nombre,
                origen: this.origenSeleccionado(),
                estado: 'en_revision',
                descripcion: this.descripcionNovedad() || undefined,
                cursoId: est.curso,
                cursoNombre: est.curso,
                grupo: est.grupo,
                estudianteCorreo: est.correo,
                estudianteNombre: est.nombre
            });
        }

        // Remover los confirmados de la lista de registrados (orden inverso para no afectar índices)
        const indicesOrdenados = Array.from(indices).sort((a, b) => b - a);
        for (const idx of indicesOrdenados) {
            this.estudiantesRegistrados.update(list => list.filter((_, i) => i !== idx));
        }

        // Limpiar selección
        this.seleccionadosIndices.set(new Set());
        this.cargarCursos();
    }
    */

    // === GESTIÓN DE NOVEDADES PENDIENTES ===

    async confirmarNovedad(novedad: Novedad): Promise<void> {
        await this.novedadService.actualizarEstado(novedad.id, 'confirmado');
        this.cargarCursos();
    }

    async descartarNovedad(novedad: Novedad): Promise<void> {
        await this.novedadService.actualizarEstado(novedad.id, 'descartado');
        this.cargarCursos();
    }

    /**
     * Abre el drawer para editar una novedad existente
     */
    editarNovedad(novedad: Novedad): void {
        // Cargar datos de la novedad en el formulario
        const tipo = this.tiposNovedad().find(t => t.id === novedad.tipoNovedadId);
        if (tipo) {
            this.tipoNovedadSeleccionado.set(tipo);
        }
        this.origenSeleccionado.set(novedad.origen);
        this.descripcionNovedad.set(novedad.descripcion || '');

        // Agregar el estudiante a la selección si no está
        const yaSeleccionado = this.estudiantesSeleccionados().find(e => e.correo === novedad.estudianteCorreo);
        if (!yaSeleccionado) {
            this.estudiantesSeleccionados.set([{
                correo: novedad.estudianteCorreo,
                nombre: novedad.estudianteNombre || novedad.estudianteCorreo,
                curso: novedad.cursoId,
                grupo: novedad.grupo
            }]);
        }

        // Abrir drawer para edición
        this.abrirDrawer();
    }

    // === NAVEGACIÓN ===

    seleccionarGrupo(curso: CursoResumen, grupo: string): void {
        console.log(`Seleccionado: ${curso.codigo} - Grupo ${grupo}`);
        // TODO: Implementar vista detallada del grupo
    }

    // === UTILIDADES ===

    getCodigoCorto(codigo: string): string {
        // Extraer código corto del nombre completo
        const match = codigo.match(/^([A-Z]+)/);
        return match ? match[1] : codigo.slice(0, 3).toUpperCase();
    }

    getTipoIcon(tipoId: string): string {
        return this.novedadService.getTipoConfig(tipoId)?.icono || 'document-text-outline';
    }

    getTipoColor(tipoId: string): string {
        return this.novedadService.getTipoConfig(tipoId)?.color || '#607d8b';
    }

    // Helper methods for template ORIGEN_CONFIG access
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
