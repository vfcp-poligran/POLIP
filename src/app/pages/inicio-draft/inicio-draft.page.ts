import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonChip,
    IonLabel,
    IonSearchbar,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonFab,
    IonFabButton,
    ActionSheetController,
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
    appsOutline
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
        IonCard,
        IonCardHeader,
        IonCardTitle,
        IonCardSubtitle,
        IonCardContent,
        IonButton,
        IonIcon,
        IonBadge,
        IonChip,
        IonLabel,
        IonSearchbar,
        IonList,
        IonItem,
        IonItemSliding,
        IonItemOptions,
        IonItemOption,
        IonFab,
        IonFabButton
    ]
})
export class InicioDraftPage implements OnInit, ViewWillEnter {
    private dataService = inject(DataService);
    private novedadService = inject(NovedadService);
    private actionSheetCtrl = inject(ActionSheetController);

    // === SIGNALS ===
    cursosResumen = signal<CursoResumen[]>([]);
    estudiantesSeleccionados = signal<EstudianteSeleccionado[]>([]);
    busquedaTermino = signal<string>('');
    resultadosBusqueda = signal<EstudianteSeleccionado[]>([]);
    drawerVisible = signal<boolean>(false);
    tipoNovedadSeleccionado = signal<TipoNovedad | null>(null);
    origenSeleccionado = signal<OrigenMensaje>('teams');
    descripcionNovedad = signal<string>('');
    isDesktop = signal<boolean>(window.innerWidth >= 992);

    // === COMPUTED ===
    tiposNovedad = computed(() => this.novedadService.tiposActivos());
    novedadesPendientes = computed(() => this.novedadService.novedadesPendientes());
    pendientesCount = computed(() => this.novedadService.pendientesCount());
    isOnline = computed(() => this.novedadService.isOnline());

    // Constantes para template
    ORIGEN_CONFIG = ORIGEN_CONFIG;
    ESTADO_CONFIG = ESTADO_CONFIG;

    constructor() {
        addIcons({
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
            appsOutline
        });

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

    // === BÚSQUEDA ===

    onBusquedaChange(event: any): void {
        const termino = event.detail.value?.toLowerCase() || '';
        this.busquedaTermino.set(termino);

        if (termino.length < 2) {
            this.resultadosBusqueda.set([]);
            return;
        }

        const cursos = this.dataService.cursos();
        const resultados: EstudianteSeleccionado[] = [];

        Object.keys(cursos).forEach(cursoKey => {
            const estudiantes = cursos[cursoKey] || [];
            estudiantes.forEach(est => {
                const nombreCompleto = `${est.nombres || ''} ${est.apellidos || ''}`.toLowerCase();
                if (nombreCompleto.includes(termino) || est.correo?.toLowerCase().includes(termino)) {
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

    // === SELECCIÓN DE ESTUDIANTES ===

    seleccionarEstudiante(estudiante: EstudianteSeleccionado): void {
        const actuales = this.estudiantesSeleccionados();
        const existe = actuales.find(e => e.correo === estudiante.correo);

        if (!existe) {
            this.estudiantesSeleccionados.update(list => [...list, estudiante]);
        }

        // Limpiar búsqueda
        this.busquedaTermino.set('');
        this.resultadosBusqueda.set([]);
    }

    removerEstudiante(correo: string): void {
        this.estudiantesSeleccionados.update(list =>
            list.filter(e => e.correo !== correo)
        );
    }

    limpiarSeleccion(): void {
        this.estudiantesSeleccionados.set([]);
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

    limpiarFormulario(): void {
        this.tipoNovedadSeleccionado.set(null);
        this.origenSeleccionado.set('teams');
        this.descripcionNovedad.set('');
    }

    // === ACTION SHEET PARA TIPO DE NOVEDAD (MÓVIL) ===

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

    async registrarNovedad(): Promise<void> {
        const estudiantes = this.estudiantesSeleccionados();
        const tipo = this.tipoNovedadSeleccionado();

        if (estudiantes.length === 0 || !tipo) {
            console.warn('Faltan datos para registrar novedad');
            return;
        }

        const datosComunes = {
            tipoNovedadId: tipo.id,
            tipoNovedadNombre: tipo.nombre,
            origen: this.origenSeleccionado(),
            estado: 'en_revision' as const,
            descripcion: this.descripcionNovedad() || undefined,
            cursoId: estudiantes[0].curso,
            cursoNombre: estudiantes[0].curso,
            grupo: estudiantes[0].grupo
        };

        if (estudiantes.length === 1) {
            await this.novedadService.registrarNovedad({
                ...datosComunes,
                estudianteCorreo: estudiantes[0].correo,
                estudianteNombre: estudiantes[0].nombre
            });
        } else {
            await this.novedadService.registrarNovedadesMasivo(
                estudiantes.map(e => e.correo),
                datosComunes
            );
        }

        // Limpiar y cerrar
        this.limpiarSeleccion();
        this.cerrarDrawer();
        this.cargarCursos(); // Actualizar contadores
    }

    // === GESTIÓN DE NOVEDADES PENDIENTES ===

    async confirmarNovedad(novedad: Novedad): Promise<void> {
        await this.novedadService.actualizarEstado(novedad.id, 'confirmado');
        this.cargarCursos();
    }

    async descartarNovedad(novedad: Novedad): Promise<void> {
        await this.novedadService.actualizarEstado(novedad.id, 'descartado');
        this.cargarCursos();
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
