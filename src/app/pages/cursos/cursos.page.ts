import { Component, ViewChild, ElementRef, inject, ChangeDetectorRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonChip,
  IonLabel,
  IonCard,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonItem,
  IonBadge,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonNote,
  IonFab,
  IonFabButton,
  AlertController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  listOutline,
  add,
  addCircle,
  addCircleOutline,
  createOutline,
  save,
  saveOutline,
  closeOutline,
  close,
  trashOutline,
  peopleOutline,
  statsChartOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  ellipseOutline,
  closeCircle,
  closeCircleOutline,
  documentTextOutline,
  schoolOutline,
  pricetagOutline,
  refreshOutline,
  eyeOutline,
  downloadOutline,
  documentOutline,
  cloudUploadOutline,
  cloudUpload,
  ribbonOutline,
  star,
  calendar,
  codeSlash,
  people,
  person,
  documentText,
  school, documentsOutline, calendarOutline, library, informationCircle, informationCircleOutline, time, timeOutline, colorPaletteOutline, colorPalette, checkmark, chevronDown, chevronDownOutline, chevronUp, chevronUpOutline, ellipsisVertical, gridOutline, grid, appsOutline, folderOpenOutline, alertCircle, desktop, desktopOutline, libraryOutline, trash, pricetag, create
} from 'ionicons/icons';
import { DataService } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { COLORES_CURSOS, generarColorAleatorio } from '../../models/curso.model';
import { BUTTON_CONFIG } from '@app/constants/button-config';
import { CapitalizePipe } from '@app/pipes/capitalize.pipe';


interface EstudianteConNotas {
  canvasUserId?: string;
  nombres: string;
  apellidos: string;
  correo: string;
  grupo: string;
  notas: {
    e1: string;
    e2: string;
    ef: string;
  };
}

@Component({
  selector: 'app-cursos',
  templateUrl: './cursos.page.html',
  styleUrls: ['./cursos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonButton,
    IonChip,
    IonLabel,
    IonCard,
    IonGrid,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton,
    IonList,
    IonItem,
    IonBadge,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonNote,
    CapitalizePipe]
})
export class CursosPage implements ViewWillEnter {
  private dataService = inject(DataService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);

  @ViewChild('estudiantesFileInput') estudiantesFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('calificacionesFileInput') calificacionesFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('importEstudiantesInput') importEstudiantesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('importCalificacionesInput') importCalificacionesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('rubricaFileInput') rubricaFileInput!: ElementRef<HTMLInputElement>;

  // Señales para el estado del componente (Reactividad Angular 17+)
  cursosDisponibles = signal<any[]>([]);
  cursoSeleccionado = signal<string | null>(null);
  private cursoSeleccionadoClave = signal<string | null>(null);
  modoEdicion = signal<boolean>(false);
  subtabActivo = signal<string>('detalle');
  grupoActivo = signal<string>('todos');
  vistaActiva = signal<'general' | string>('general');

  rubricasAsociadas: any[] = [];

  estudiantesFileName = '';
  calificacionesFileName = '';
  rubricaFileName = '';
  estudiantesCargados: any[] = [];
  calificacionesCargadas: any = null;
  calificacionesParseadas: any[] = [];
  rubricaCargada: any = null;

  codigoCursoEnEdicion = '';
  infoExpanded = false;
  cursoParseado: any = null;

  // Variables para detectar cambios
  estadoOriginalCurso: {
    color: string | null;
    estudiantes: any[];
    calificaciones: any;
  } | null = null;

  // Estado de card expandida (para mobile)
  cursoExpandido: string | null = null;

  // Colores disponibles para cursos
  coloresDisponibles: string[] = COLORES_CURSOS;
  colorCursoSeleccionado: string | null = null;

  // Computed signals para reactividad automática
  cursoSeleccionadoInfo = computed(() => {
    const seleccion = this.cursoSeleccionado();
    if (!seleccion) return null;

    // Búsqueda robusta (igual que resolverClaveCurso)
    return this.cursosDisponibles().find(c =>
      c.codigo === seleccion ||
      c.claveCurso === seleccion ||
      c.nombreAbreviado === seleccion ||
      c.codigoBase === seleccion
    ) || null;
  });

  /**
   * Computed property que genera array de años disponibles (5 años desde el actual)
   */
  aniosDisponibles = computed(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear + i);
  });

  /**
   * Información unificada para mostrar en la card principal.
   * Si es un curso real, devuelve sus datos.
   * Si estamos creando uno nuevo, devuelve un objeto temporal basado en el parseo.
   */
  /**
   * Genera el código estandarizado con año al final: SIGLAS-B##-XXX-MOD-YYYY
   * Ejemplo: HPM1-B01-PRI-V-2025
   */
  public getStandardizedCode(c: any): string {
    Logger.log('🔍 getStandardizedCode INPUT:', c);

    if (!c) return '—';
    const siglas = c.siglas || this.generarAcronimoCurso(c.nombre || '');
    const ingreso = c.ingreso || '';

    // Extraer bloque y formatear usando abreviatura (PRI, SEG, etc.)
    const bloqueFormatted = this.getBloqueAbbreviation(c.bloque || '');
    Logger.log('  📌 Bloque formateado:', bloqueFormatted);

    // Extraer iniciales de la modalidad
    const modalidadTexto = c.modalidad || '';
    const modalidadInitials = this.getModalityInitials(modalidadTexto);
    Logger.log('  📌 Modalidad iniciales:', modalidadInitials);

    // Extraer grupo con su letra de ingreso y asegurar 2 dígitos (ej: B01)
    const grupo = c.grupo || '';
    const matchCod = grupo.match(/([A-Z])?(\d+)/i);
    const letra = matchCod?.[1]?.toUpperCase() || ingreso;
    const numero = matchCod?.[2]?.padStart(2, '0') || '01';
    const ingresoGrupo = `${letra}${numero}`;
    Logger.log('  📌 Ingreso+Grupo:', ingresoGrupo);

    // Obtener año (de cohorteForm si está en creación, o del curso si ya existe)
    const anio = c.anio || this.cohorteForm.anio || new Date().getFullYear().toString();

    // Unir con guiones: SIGLAS, B##, BLQ##, MOD, AÑO
    const resultado = [siglas, ingresoGrupo, bloqueFormatted, modalidadInitials, anio]
      .filter(s => !!s)
      .join('-');

    Logger.log('  ✅ CÓDIGO FINAL:', resultado);
    return resultado;
  }

  /**
   * Genera el código para mostrar en UI (SIN año al final)
   * Ejemplo: HPM1-B01-BLQ01-V
   */
  public getDisplayCode(c: any): string {
    const fullCode = this.getStandardizedCode(c);
    // Remover el último segmento (año) del código
    const parts = fullCode.split('-');
    if (parts.length > 1) {
      parts.pop(); // Remover último elemento (año)
      return parts.join('-');
    }
    return fullCode;
  }

  /**
   */
  private getBloqueAbbreviation(bloque: string): string {
    const b = (bloque || '').toUpperCase().trim();

    // Mapeo directo de palabras y números
    const map: { [key: string]: string } = {
      'PRIMERO': 'PRI', '1': 'PRI', '01': 'PRI',
      'SEGUNDO': 'SEG', '2': 'SEG', '02': 'SEG',
      'TERCERO': 'TER', '3': 'TER', '03': 'TER',
      'CUARTO': 'CUA', '4': 'CUA', '04': 'CUA',
      'QUINTO': 'QUI', '5': 'QUI', '05': 'QUI',
      'SEXTO': 'SEX', '6': 'SEX', '06': 'SEX',
      'SEPTIMO': 'SEP', 'SÉPTIMO': 'SEP', '7': 'SEP', '07': 'SEP',
      'OCTAVO': 'OCT', '8': 'OCT', '08': 'OCT',
      'NOVENO': 'NOV', '9': 'NOV', '09': 'NOV',
      'DECIMO': 'DEC', 'DÉCIMO': 'DEC', '10': 'DEC',
      'TRANSVERSAL': 'TRV'
    };

    // Si existe en el mapa, devolver valor
    if (map[b]) return map[b];

    // Si contiene "BLOQUE", extraer número y reintentar
    if (b.includes('BLOQUE')) {
      const num = b.replace(/\D/g, '');
      if (map[num]) return map[num];
    }

    // Fallback: Si no se reconoce, devolver las primeras 3 letras (si tiene al menos 3)
    // o el valor original si es muy corto
    if (b.length >= 3) {
      return b.substring(0, 3);
    }
    return b;
  }

  /**
   * Extrae iniciales de la modalidad de forma robusta
   * Ej: "TEORICO-PRACTICO - VIRTUAL" -> "TPV"
   */
  private getModalityInitials(texto: string): string {
    if (!texto) return '';
    const t = texto.toUpperCase();

    // Casos simples directos
    if (t === 'VIRTUAL') return 'V';
    if (t === 'TEORICO-PRACTICO') return 'TP';
    if (t === 'PROYECTO') return 'P';
    if (t === 'CIENCIAS BASICAS') return 'CB';

    // Algoritmo para casos compuestos:
    // 1. Dividir por espacios y guiones
    // 2. Tomar la primera letra de cada palabra significativa (>2 letras)
    return t
      .split(/[-\s]+/)
      .filter(p => p.length > 2)
      .map(p => p.charAt(0))
      .join('');
  }

  /**
   * Información unificada para mostrar en la card principal.
   */
  infoParaMostrar = computed(() => {
    const real = this.cursoSeleccionadoInfo();
    if (real) return {
      ...real,
      nombre: real.nombre || real.codigo || 'Sin nombre', // Asegurar que nombre exista
      codigoEstandarizado: real.codigo, // Usar código único directamente
      codigoDisplay: real.codigo, // Usar código único directamente (EPM-B01-BLQ02)
      anio: real.anio || new Date().getFullYear()
    };

    // Si estamos en modo creación
    if (this.modoEdicion() && !this.cursoSeleccionado()) {
      const tempCourse = {
        nombre: this.cursoParseado?.nombre || 'Nuevo Curso',
        siglas: this.cursoParseado?.siglas || this.generarAcronimoCurso(this.cursoParseado?.nombre || ''),
        ingreso: this.cohorteForm.ingreso || '',
        grupo: this.cursoParseado?.grupo || '',
        anio: this.cohorteForm.anio ? parseInt(this.cohorteForm.anio) : new Date().getFullYear()
      };

      return {
        ...tempCourse,
        codigo: this.cursoParseado?.codigo || 'Pendiente de importar',
        codigoBase: this.cursoParseado?.codigoBase || '—',
        bloque: this.cursoParseado?.bloque || '—',
        ingreso: tempCourse.ingreso || '—',
        color: this.colorCursoSeleccionado,
        tieneCalificaciones: false,
        esNuevo: true,
        codigoEstandarizado: this.getStandardizedCode(tempCourse),
        codigoDisplay: this.getDisplayCode(tempCourse),
        anio: tempCourse.anio
      };
    }

    return null;
  });

  estudiantesCurso = computed(() => {
    const seleccion = this.cursoSeleccionado();
    const claveCurso = this.resolverClaveCurso(seleccion);
    if (!claveCurso) return [];
    const estudiantes = this.dataService.getCurso(claveCurso);
    return Array.isArray(estudiantes) ? estudiantes : [];
  });

  gruposCurso = computed(() => {
    const estudiantes = this.estudiantesCurso();
    const grupos = [...new Set(estudiantes.map(e => (e?.grupo !== undefined && e?.grupo !== null ? String(e.grupo) : '')))]
      .filter(g => g !== '')
      .sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    return grupos;
  });

  /**
   * Computed signal optimizado para estudiantes filtrados con notas
   * Usa función pura para mejorar rendimiento y facilitar testing
   */
  estudiantesFiltrados = computed<EstudianteConNotas[]>(() => {
    const estudiantes = this.estudiantesCurso();
    const grupo = this.grupoActivo();
    const seleccion = this.cursoSeleccionado();
    const claveCurso = this.resolverClaveCurso(seleccion);
    const archivo = claveCurso ? this.dataService.obtenerArchivoCalificaciones(claveCurso) : null;

    return this.mapEstudiantesConNotas(estudiantes, grupo, archivo);
  });

  /**
   * Función pura para mapear estudiantes con sus notas
   * Separada del computed para mejor testabilidad y rendimiento
   * @param estudiantes Lista de estudiantes del curso
   * @param grupo Grupo activo para filtrar ('todos' o número de grupo)
   * @param archivo Archivo de calificaciones (puede ser null)
   * @returns Array de estudiantes con notas mapeadas
   */
  private mapEstudiantesConNotas(
    estudiantes: any[],
    grupo: string,
    archivo: any
  ): EstudianteConNotas[] {
    // 1. Filtrar por grupo (operación rápida)
    const filtrados = grupo === 'todos'
      ? estudiantes
      : estudiantes.filter(e => String(e.grupo) === String(grupo));

    // 2. Early return si no hay archivo (evita procesamiento innecesario)
    if (!archivo?.calificaciones) {
      return filtrados.map(est => ({
        ...est,
        notas: { e1: '', e2: '', ef: '' }
      }));
    }

    // 3. Crear Map una sola vez (O(n) en lugar de O(n²))
    const notasMap = new Map<string, any>();
    archivo.calificaciones.forEach((c: any) => {
      if (c.id) notasMap.set(String(c.id), c);
    });

    // 4. Mapear estudiantes con notas (O(n) con lookup O(1))
    return filtrados.map(est => {
      const canvasId = est.canvasUserId ? String(est.canvasUserId) : '';
      const notas = canvasId ? notasMap.get(canvasId) : null;

      return {
        ...est,
        notas: {
          e1: notas?.e1 || '',
          e2: notas?.e2 || '',
          ef: notas?.ef || ''
        }
      };
    });
  }

  // Formulario de cohorte - datos de período académico
  cohorteForm: {
    bloque: 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL' | undefined;
    anio: string | undefined;
    ingreso: 'A' | 'B' | 'C' | undefined;
  } = {
      bloque: undefined,
      anio: new Date().getFullYear().toString(),
      ingreso: undefined
    };

  // Flag para mostrar/ocultar color picker
  showColorPicker = false;

  /**
   * Computed property que genera el nombre del ingreso automáticamente
   * Formato: {año} {ingreso O bloque}
   * Ejemplo: "2024 A" o "2024 Segundo"
   */
  nombreIngresoGenerado = computed(() => {
    if (!this.cohorteForm.anio) return '';

    const anio = new Date(this.cohorteForm.anio).getFullYear();

    // Si hay ingreso seleccionado, usarlo
    if (this.cohorteForm.ingreso) {
      // Agregar bloque si existe en el curso parseado
      const bloque = this.cursoParseado?.bloque || '';
      return `${anio} ${this.cohorteForm.ingreso}${bloque}`;
    }

    // Si no hay ingreso, usar el bloque del curso
    const bloque = this.cursoParseado?.bloque || '';
    if (bloque) {
      // Convertir "2" a "Segundo", "1" a "Primero"
      const bloqueTexto = bloque === '1' ? 'Primero' : bloque === '2' ? 'Segundo' : bloque;
      return `${anio} ${bloqueTexto}`;
    }

    return `${anio}`;
  });

  private resolverClaveCurso(codigo: string | null): string | null {
    if (!codigo) return null;

    const curso = this.cursosDisponibles().find(c =>
      c.codigo === codigo ||
      c.claveCurso === codigo ||
      c.nombreAbreviado === codigo ||
      c.codigoBase === codigo
    );
    if (curso?.claveCurso) {
      return curso.claveCurso;
    }

    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    if (courseStates[codigo]) {
      return codigo;
    }

    for (const [key, state] of Object.entries(courseStates)) {
      const meta: any = state.metadata || {};
      if (
        meta.codigoUnico === codigo ||
        meta.codigo === codigo ||
        meta.nombre === codigo ||
        meta.nombreAbreviado === codigo
      ) {
        return key;
      }
    }

    return codigo;
  }

  // Exponer configuración de botones para el template
  readonly BUTTON_CONFIG = BUTTON_CONFIG;

  constructor() {
    addIcons({ addCircle, informationCircle, people, cloudUpload, closeCircle, school, codeSlash, pricetag, calendar, desktop, checkmark, calendarOutline, pricetagOutline, desktopOutline, time, library, addCircleOutline, informationCircleOutline, peopleOutline, statsChartOutline, gridOutline, libraryOutline, ellipsisVertical, checkmarkCircle, colorPalette, cloudUploadOutline, documentTextOutline, folderOpenOutline, grid, alertCircle, add, saveOutline, closeOutline, closeCircleOutline, createOutline, trashOutline, appsOutline, listOutline, close, colorPaletteOutline, person, ellipseOutline, timeOutline, documentText, ribbonOutline, schoolOutline, save, documentsOutline, eyeOutline, downloadOutline, star, checkmarkCircleOutline, documentOutline, refreshOutline, chevronDownOutline, chevronUpOutline, trash, chevronUp, chevronDown, create });
  }

  private cd = inject(ChangeDetectorRef);



  /**
   * Maneja cambios en año o ingreso para actualizar el nombre generado
   */
  onCambioCohorte(): void {
    // El nombre se actualiza automáticamente por el computed property
    Logger.log('[Cohorte] Nombre actualizado:', this.nombreIngresoGenerado());
  }

  /**
   * Maneja el cambio de bloque
   */
  onBloqueChange(): void {
    this.onCambioCohorte();
  }

  /**
   * Maneja el cambio en el tipo de ingreso
   */
  onIngresoChange(): void {
    this.onCambioCohorte();
  }



  /**
   * Toggle para expandir/colapsar card de curso en móvil
   */
  toggleCursoCard(codigo: string): void {
    this.cursoExpandido = this.cursoExpandido === codigo ? null : codigo;
  }

  /**
   * Lifecycle hook de Ionic - se ejecuta cada vez que la vista va a aparecer
   * Esto EVITA recrear el componente completo
   */
  ionViewWillEnter() {
    console.log('='.repeat(80));
    console.log('[CursosPage] 🔄 ionViewWillEnter - INICIANDO...');
    console.log('='.repeat(80));
    Logger.log('[CursosPage] 🔄 ionViewWillEnter - Iniciando carga de cursos...');
    this.cargarCursos();
    const seleccion = this.cursoSeleccionado();
    if (seleccion) {
      this.cursoSeleccionadoClave.set(this.resolverClaveCurso(seleccion));
    }
    // Restaurar estado de modoEdicion desde UIState
    const uiState = this.dataService.getUIState();
    if (uiState.cursosModoEdicion) {
      this.modoEdicion.set(true);
    }
    console.log('[CursosPage] 🔄 ionViewWillEnter - FINALIZADO');
    console.log('='.repeat(80));
    Logger.log('[CursosPage] 🔄 ionViewWillEnter - Finalizado');
  }

  /**
   * Editar un curso desde la tabla
   */
  editarCurso(curso: any) {
    this.cursoSeleccionado.set(curso.codigo);
    this.cursoSeleccionadoClave.set(this.resolverClaveCurso(curso.codigo));
    this.editarCursoSeleccionado();
  }

  /**
   * Confirmar eliminación de un curso desde la tabla
   */
  async confirmarEliminarCurso(curso: any) {
    // Crear un evento dummy para el método existente
    const dummyEvent = new Event('click');
    await this.eliminarCurso(curso, dummyEvent);
  }

  /**
   * Obtiene el objeto del curso actualmente seleccionado
   */
  getCursoSeleccionadoObj(): any | null {
    const codigo = this.cursoSeleccionado();
    if (!codigo) return null;
    return this.cursosDisponibles().find(c => c.codigo === codigo) || null;
  }

  /**
   * Editar el curso seleccionado desde el header
   */
  async editarCursoSeleccionadoDesdeHeader(): Promise<void> {
    const curso = this.getCursoSeleccionadoObj();
    if (curso) {
      this.editarCurso(curso);
    } else {
      // Validar si el usuario ya silenció este aviso
      const uiState = this.dataService.getUIState();
      if (uiState.ocultarAvisoEdicionSinSeleccion) {
        return;
      }

      const alert = await this.alertController.create({
        header: 'Seleccione un curso',
        message: 'Debe seleccionar primero un curso para poder editarlo.',
        inputs: [
          {
            name: 'ocultar',
            type: 'checkbox',
            label: 'No mostrar más este mensaje',
            value: 'true',
            checked: false
          }
        ],
        buttons: [
          {
            text: 'Aceptar',
            handler: (data) => {
              // Si el checkbox está marcado, persistir la preferencia
              if (data && data.includes('true')) {
                this.dataService.updateUIState({ ocultarAvisoEdicionSinSeleccion: true });
                Logger.log('[CursosPage] Preferencia guardada: ocultar aviso de edición sin selección');
              }
            }
          }
        ],
        cssClass: 'premium-alert premium-alert--warning'
      });

      await alert.present();
    }
  }

  /**
   * Eliminar el curso seleccionado desde el header
   */
  async eliminarCursoSeleccionadoDesdeHeader(): Promise<void> {
    const curso = this.getCursoSeleccionadoObj();
    if (curso) {
      await this.confirmarEliminarCurso(curso);
    }
  }

  cargarCursos(): void {
    try {
      const uiState = this.dataService.getUIState();

      Logger.log('[CursosPage] 🔍 DEBUG - uiState:', uiState);

      if (!uiState || !uiState.courseStates) {
        Logger.warn('[CursosPage] No hay estados de curso disponibles');
        this.cursosDisponibles.set([]);
        return;
      }

      const courseStates = uiState.courseStates;
      Logger.log('[CursosPage] 🔍 DEBUG - courseStates:', courseStates);
      Logger.log('[CursosPage] 🔍 DEBUG - Número de cursos en courseStates:', Object.keys(courseStates).length);

      const mappedCursos = Object.entries(courseStates)
        .map(([nombreCurso, state]) => {
          Logger.log(`[CursosPage] 🔍 DEBUG - Procesando curso: ${nombreCurso}, state:`, state);

          if (!state || typeof state !== 'object') {
            Logger.warn(`[CursosPage] Estado inválido para curso: ${nombreCurso}`);
            return null;
          }

          try {
            const tieneArchivo = this.dataService.obtenerArchivoCalificaciones(nombreCurso) !== null;

            // Remover año del código (último segmento después del último guión)
            const codigoSinAnio = nombreCurso.split('-').slice(0, -1).join('-') || nombreCurso;

            const cursoObj = {
              claveCurso: nombreCurso,
              nombre: state.metadata?.nombre || nombreCurso, // NOMBRE COMPLETO DEL CURSO
              nombreAbreviado: state.metadata?.nombreAbreviado || '',
              codigo: codigoSinAnio, // CÓDIGO SIN AÑO (EPM-B01-BLQ02-V)
              codigoBase: (state.metadata as any)?.codigo || '',
              siglas: (state.metadata as any)?.siglas || '',
              grupo: (state.metadata as any)?.grupo || '',
              bloque: state.metadata?.bloque || '',
              ingreso: state.metadata?.tipoIngreso || '', // Tipo simple: A, B, C
              modalidad: state.metadata?.modalidad || '', // Código o texto: V, VIRTUAL, TP
              fechaCreacion: state.metadata?.fechaCreacion || '',
              tieneCalificaciones: tieneArchivo
            };

            Logger.log(`[CursosPage] 🔍 DEBUG - Curso mapeado:`, cursoObj);
            return cursoObj;
          } catch (error) {
            Logger.error(`[CursosPage] Error procesando curso ${nombreCurso}:`, error);
            return null;
          }
        })
        .filter((curso): curso is NonNullable<typeof curso> => curso !== null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      this.cursosDisponibles.set(mappedCursos);
      Logger.log(`[CursosPage] 🔍 DEBUG - cursosDisponibles FINAL:`, this.cursosDisponibles());
      Logger.log(`[CursosPage] ${this.cursosDisponibles().length} cursos cargados exitosamente`);

      // GESTIÓN DE SELECCIÓN INICIAL:
      // 1. Intentar restaurar desde UIState si no hay selección local
      if (!this.cursoSeleccionado() && uiState.cursoActivo) {
        const existe = mappedCursos.some(c => c.codigo === uiState.cursoActivo || c.claveCurso === uiState.cursoActivo);
        if (existe) {
          Logger.log(`[CursosPage] 🎯 Restaurando selección desde UIState: ${uiState.cursoActivo}`);
          this.seleccionarCurso(uiState.cursoActivo);
        }
      }

      // 2. Si sigue sin haber selección (o era inválida), seleccionar el primero
      if (!this.cursoSeleccionado() && mappedCursos.length > 0) {
        const primerCurso = mappedCursos[0].codigo;
        Logger.log(`[CursosPage] 🎯 Seleccionando curso inicial automáticamente: ${primerCurso}`);
        this.seleccionarCurso(primerCurso);
      }

      // 3. Verificación final: Si el curso seleccionado no está en los disponibles, limpiar o re-seleccionar
      if (this.cursoSeleccionado() && !this.cursoSeleccionadoInfo() && mappedCursos.length > 0) {
        Logger.warn('[CursosPage] ⚠️ Selección actual inválida, re-seleccionando el primero');
        this.seleccionarCurso(mappedCursos[0].codigo);
      }
      // Forzar detección de cambios
      this.cd.detectChanges();
    } catch (error) {
      Logger.error('[CursosPage] Error crítico al cargar cursos:', error);
      this.cursosDisponibles.set([]);
      this.mostrarToastError('Error al cargar la lista de cursos');
    }
  }

  async iniciarCreacionCurso() {
    Logger.log('🔘 [CursosPage] Click en Crear Curso - Iniciando...');
    try {
      this.modoEdicion.set(true);
      this.subtabActivo.set('detalle');
      this.cursoSeleccionado.set(null);
      this.cursoSeleccionadoClave.set(null);
      this.limpiarFormulario();
      // Generar color aleatorio diferente a los cursos existentes
      const coloresUsados = this.obtenerColoresUsados();
      this.colorCursoSeleccionado = generarColorAleatorio(coloresUsados);
      this.cd.detectChanges(); // Forzar actualización de vista
      // Persistir estado en UIState
      this.dataService.updateUIState({ cursosModoEdicion: true });
      Logger.log('✅ [CursosPage] Modo edición activado');
    } catch (error) {
      Logger.error('❌ [CursosPage] Error al iniciar creación:', error);
    }
  }

  /**
   * Obtiene los colores ya usados por los cursos existentes
   */
  obtenerColoresUsados(): string[] {
    const uiState = this.dataService.getUIState();
    const colores: string[] = [];
    if (uiState?.courseStates) {
      Object.values(uiState.courseStates).forEach((state: any) => {
        if (state?.color) {
          colores.push(state.color);
        }
      });
    }
    return colores;
  }

  /**
   * Obtiene el color de un curso específico
   */
  getCursoColor(codigoCurso: string): string {
    const uiState = this.dataService.getUIState();
    const claveCurso = this.resolverClaveCurso(codigoCurso);
    if (claveCurso && uiState?.courseStates?.[claveCurso]) {
      return uiState.courseStates[claveCurso].color || '#1fb2de';
    }
    return '#1fb2de'; // Color por defecto
  }

  /**
   * Selecciona un color para el curso en creación/edición
   */
  seleccionarColorCurso(color: string): void {
    this.colorCursoSeleccionado = color;
    Logger.log(`[CursosPage] Color seleccionado: ${color}`);
  }

  /**
   * Toggle para mostrar/ocultar el color picker
   */
  toggleColorPicker(): void {
    this.showColorPicker = !this.showColorPicker;
    Logger.log(`[CursosPage] Color picker ${this.showColorPicker ? 'abierto' : 'cerrado'}`);
  }

  async cancelarCreacionCurso() {
    this.modoEdicion.set(false);
    this.colorCursoSeleccionado = null;
    this.limpiarFormulario();
    // Limpiar estado en UIState
    this.dataService.updateUIState({ cursosModoEdicion: false });
    Logger.log('🔘 [CursosPage] Creación de curso cancelada');
  }

  toggleInfo() {
    this.infoExpanded = !this.infoExpanded;
  }

  seleccionarVista(vista: 'general' | string) {
    this.vistaActiva.set(vista);
  }

  // Cambiar subtab dentro del curso seleccionado
  cambiarSubtab(subtab: string) {
    this.vistaActiva.set(subtab);
  }

  contarIntegrantes(grupo: string): number {
    return this.estudiantesCurso().filter(est =>
      String(est?.grupo ?? '') === String(grupo)
    ).length;
  }

  seleccionarCurso(codigo: string) {
    // 1. Manejar caso de creación
    if (codigo === 'NUEVO') {
      if (!this.modoEdicion() || this.cursoSeleccionado() !== null) {
        this.iniciarCreacionCurso();
      }
      return;
    }

    // 2. Si es el mismo curso y ya estamos en modo correcto, no hacer nada
    if (this.cursoSeleccionado() === codigo && this.vistaActiva() === 'general') {
      return;
    }

    // 3. Selección normal de curso existente
    this.cursoSeleccionado.set(codigo);
    const clave = this.resolverClaveCurso(codigo);
    this.cursoSeleccionadoClave.set(clave);
    this.vistaActiva.set('general');
    this.subtabActivo.set('detalle'); // Siempre volver a detalle al cambiar de curso
    this.modoEdicion.set(false);
    this.cargarRubricasAsociadas(clave || codigo);

    // Limpiar estado en UIState
    this.dataService.updateUIState({ cursosModoEdicion: false });
    this.cd.detectChanges();
  }

  deseleccionarCurso() {
    this.cursoSeleccionado.set(null);
    this.cursoSeleccionadoClave.set(null);
    this.vistaActiva.set('general');
    this.modoEdicion.set(false);
    this.limpiarFormulario();
    this.rubricasAsociadas = [];
    // Limpiar estado en UIState
    this.dataService.updateUIState({ cursosModoEdicion: false });
  }

  cargarRubricasAsociadas(codigoCurso: string) {
    const claveCurso = this.resolverClaveCurso(codigoCurso);
    if (!claveCurso) {
      this.rubricasAsociadas = [];
      return;
    }
    const todasRubricas = this.dataService.obtenerRubricasArray();
    this.rubricasAsociadas = todasRubricas.filter(rubrica =>
      rubrica.cursosCodigos?.includes(claveCurso)
    ).sort((a, b) => {
      // Ordenar por tipo de entrega
      const ordenEntrega: any = { 'E1': 1, 'E2': 2, 'EF': 3 };
      const ordenA = ordenEntrega[a.tipoEntrega || ''] || 999;
      const ordenB = ordenEntrega[b.tipoEntrega || ''] || 999;

      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }

      // Luego por tipo de rúbrica (PG antes que PI)
      const tipoA = a.tipoRubrica === 'PG' ? 0 : 1;
      const tipoB = b.tipoRubrica === 'PG' ? 0 : 1;

      return tipoA - tipoB;
    });
  }

  editarCursoSeleccionado() {
    const seleccion = this.cursoSeleccionado();
    if (!seleccion) return;

    const curso = this.cursosDisponibles().find(c => c.codigo === seleccion);
    if (!curso) return;

    const claveCurso = this.cursoSeleccionadoClave() || this.resolverClaveCurso(curso.codigo) || curso.codigo;

    this.modoEdicion.set(true);
    this.subtabActivo.set('detalle');
    this.codigoCursoEnEdicion = claveCurso;

    // Cargar metadatos de cohorte si existen
    const uiState = this.dataService.getUIState();
    const courseState = uiState.courseStates?.[claveCurso];
    const cohorte = courseState?.metadata?.ingreso;

    if (cohorte) {
      this.cohorteForm = {
        anio: (courseState?.metadata as any)?.fechaCreacion || new Date().toISOString(),
        bloque: (courseState?.metadata as any)?.bloque || 'PRIMERO',
        ingreso: (cohorte as any).ingreso || 'A'
      };
    } else {
      this.cohorteForm = {
        anio: new Date().toISOString(),
        bloque: curso.bloque || 'PRIMERO',
        ingreso: 'A'
      };
    }

    this.cursoParseado = {
      nombre: curso.nombre,
      codigo: curso.codigo,
      bloque: curso.bloque,
      ingreso: curso.ingreso || curso.codigo?.match(/[A-Z]-([ABC])/)?.[1] || '',
      modalidad: curso.modalidad || 'Virtual'
    };

    // Cargar el color actual del curso
    this.colorCursoSeleccionado = this.getCursoColor(curso.codigo);

    // Cargar estudiantes del curso desde storage
    const estudiantes = this.dataService.getCurso(claveCurso);
    if (estudiantes && estudiantes.length > 0) {
      this.estudiantesCargados = estudiantes;
      this.estudiantesFileName = `${curso.codigo}_estudiantes.csv`;
    }

    // Cargar archivo de calificaciones si existe
    const archivo = this.dataService.obtenerArchivoCalificaciones(claveCurso);
    if (archivo) {
      this.calificacionesCargadas = archivo;
      this.calificacionesFileName = archivo.nombre;
    }

    // Guardar estado original para detectar cambios
    this.estadoOriginalCurso = {
      color: this.colorCursoSeleccionado,
      estudiantes: JSON.parse(JSON.stringify(estudiantes || [])),
      calificaciones: archivo ? JSON.parse(JSON.stringify(archivo)) : null
    };

    this.cd.detectChanges();
  }

  async onEstudiantesFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.estudiantesFileName = file.name;

    try {
      const contenido = await this.leerArchivo(file);

      // Parsear CSV con soporte para campos con comas entre comillas
      const lineas = contenido.split('\n').filter(l => l.trim());
      if (lineas.length < 2) throw new Error('Archivo CSV vacío');

      // Función para parsear línea CSV respetando comillas
      const parsearLineaCSV = (linea: string): string[] => {
        const resultado: string[] = [];
        let dentroComillas = false;
        let valorActual = '';

        for (let i = 0; i < linea.length; i++) {
          const char = linea[i];

          if (char === '"') {
            dentroComillas = !dentroComillas;
          } else if (char === ',' && !dentroComillas) {
            resultado.push(valorActual.trim());
            valorActual = '';
          } else {
            valorActual += char;
          }
        }
        resultado.push(valorActual.trim());
        return resultado;
      };

      const headers = parsearLineaCSV(lineas[0]);
      Logger.log('========================================');
      Logger.log('📋 ANÁLISIS COMPLETO DEL CSV');
      Logger.log('========================================');
      Logger.log('Total de líneas en el archivo:', lineas.length);
      Logger.log('Headers completos:', headers);
      Logger.log('Primeros 4 headers:', headers.slice(0, 4));

      // Detectar índices de columnas importantes
      // Mapeo correcto para formato Canvas:
      // Student, ID, SIS Login ID, Section, [otras columnas de tareas], [columnas de grupo si aplica]
      const nombreIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'student' || lower === 'nombre';
      });
      const canvasUserIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'id' || lower === 'canvas_user_id' || lower === 'canvas user id';
      });
      const loginIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'sis login id' || lower === 'login_id' || lower === 'sis user id';
      });
      const seccionesIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'section' || lower === 'secciones';
      });
      const groupNameIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'group_name' || lower === 'group name';
      });
      const canvasGroupIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'canvas_group_id' || lower === 'canvas group id';
      });

      // Para CSV con columnas separadas
      const apellidoIndex = headers.findIndex(h => h.toLowerCase().trim().includes('apellido'));
      const correoIndex = headers.findIndex(h => h.toLowerCase().trim().includes('correo'));
      const pgIndex = headers.findIndex(h => h.toLowerCase().trim() === 'pg');
      const piIndex = headers.findIndex(h => h.toLowerCase().trim() === 'pi');

      Logger.log('📍 Índices de columnas detectados:', {
        nombreIndex,
        canvasUserIdIndex,
        loginIdIndex,
        seccionesIndex,
        groupNameIndex,
        canvasGroupIdIndex,
        apellidoIndex,
        correoIndex,
        pgIndex,
        piIndex
      });

      // Verificar línea 2 (puede ser "Manual Posting" o "Points Possible")
      if (lineas.length > 1) {
        const linea2 = parsearLineaCSV(lineas[1]);
        Logger.log('Línea 2:', linea2.slice(0, 6));
      }
      if (lineas.length > 2) {
        const linea3 = parsearLineaCSV(lineas[2]);
        Logger.log('Línea 3:', linea3.slice(0, 6));
      }

      // Filtrar líneas de datos (saltar "Manual Posting", "Points Possible" y líneas vacías)
      const lineasDatos = lineas.slice(1).filter((linea, idx) => {
        const valores = parsearLineaCSV(linea);
        const primeraColumna = valores[0]?.trim().toLowerCase() || '';

        // Detectar líneas a filtrar
        const esPointsPossible = primeraColumna.includes('points possible');
        const esManualPosting = primeraColumna === '' && valores[5]?.toLowerCase().includes('manual posting');
        const esVacia = primeraColumna === '' && linea.trim() === '';

        if (idx < 4) {
          Logger.log(`Filtro línea ${idx + 2}: "${primeraColumna.substring(0, 30)}" - Points:${esPointsPossible}, ManualPosting:${esManualPosting}, Vacía:${esVacia}`);
        }

        // Filtrar "Manual Posting", "Points Possible" y líneas vacías
        return !esPointsPossible && !esManualPosting && !esVacia;
      });

      Logger.log(`📊 Total de líneas de datos después de filtrar: ${lineasDatos.length}`);

      const estudiantes = lineasDatos.map((linea, index) => {
        const valores = parsearLineaCSV(linea).map(v => v.trim());

        // Debug: mostrar valores de las primeras 3 líneas
        if (index < 3) {
          Logger.log(`🔍 DEBUG Línea ${index + 1} del CSV:`);
          Logger.log(`   Total columnas: ${valores.length}`);
          valores.slice(0, 6).forEach((val, idx) => {
            Logger.log(`   [${idx}]: "${val}"`);
          });
        }

        // Obtener el nombre completo del CSV (formato: "APELLIDOS, NOMBRE")
        let nombreCompleto = '';
        let apellido = '';
        let nombre = '';

        if (nombreIndex >= 0 && nombreIndex < valores.length) {
          // Si hay columna "Student" en el CSV de Canvas (índice 0)
          nombreCompleto = (valores[nombreIndex] || '').trim();

          if (index === 0) {
            Logger.log(`📝 Valor en nombreIndex [${nombreIndex}]: "${nombreCompleto}"`);
          }

          // Separar por coma: "APELLIDOS, NOMBRE" -> apellidos / nombres
          if (nombreCompleto.includes(',')) {
            const partes = nombreCompleto.split(',').map(p => p.trim());
            apellido = partes[0] || '';
            nombre = partes[1] || '';
          } else {
            // Si no tiene coma, usar el valor completo como apellido
            apellido = nombreCompleto;
            nombre = '';
          }
        } else if (apellidoIndex >= 0) {
          // Si hay columnas separadas de apellido/nombre
          apellido = (valores[apellidoIndex] || '').trim();
          nombre = (valores[0] || '').trim();
        } else {
          // Fallback
          apellido = (valores[1] || '').trim();
          nombre = (valores[0] || '').trim();
        }

        // Extraer número de grupo del groupName (ej: "G1" -> "1", "Grupo 2" -> "2")
        const groupNameValue = groupNameIndex >= 0 ? (valores[groupNameIndex] || '').trim() : '';
        let grupoNumero = '';
        if (groupNameValue) {
          const grupoMatch = groupNameValue.match(/\d+/);
          grupoNumero = grupoMatch ? grupoMatch[0] : '';
        }

        // Crear objeto base con información del estudiante
        const estudiante: any = {
          canvasUserId: canvasUserIdIndex >= 0 ? (valores[canvasUserIdIndex] || '').trim() : '',
          canvasGroupId: canvasGroupIdIndex >= 0 ? (valores[canvasGroupIdIndex] || '').trim() : '',
          apellidos: apellido,
          nombres: nombre,
          correo: loginIdIndex >= 0 ? (valores[loginIdIndex] || '').trim() : (correoIndex >= 0 ? (valores[correoIndex] || '').trim() : ''),
          grupo: grupoNumero,
          groupName: groupNameValue,
          secciones: seccionesIndex >= 0 ? (valores[seccionesIndex] || '').trim() : '',
          pg: pgIndex >= 0 ? (valores[pgIndex] || '').trim() : '',
          pi: piIndex >= 0 ? (valores[piIndex] || '').trim() : '',
          calificaciones: {} // Objeto para almacenar todas las calificaciones
        };

        // Extraer columnas de calificaciones (después de Section, índice 4 en adelante)
        // Saltar columnas de metadatos que terminan en "Points", "Score", etc.
        const primeraColumnaCalificaciones = Math.max(4, seccionesIndex + 1);

        // Debug: Mostrar mapeo de columnas para el primer estudiante
        if (index === 0) {
          Logger.log('🔍 MAPEO DE COLUMNAS (Primer estudiante):');
          Logger.log('Total valores parseados:', valores.length);
          Logger.log('Total headers:', headers.length);
          for (let i = 4; i < Math.min(10, headers.length); i++) {
            Logger.log(`  [${i}] "${headers[i]}" = "${valores[i] || '(vacío)'}"`);
          }
        }

        for (let i = primeraColumnaCalificaciones; i < valores.length && i < headers.length; i++) {
          const headerName = headers[i];
          const valor = valores[i];
          const headerLower = headerName.toLowerCase().trim();

          // PRIMERO: Filtrar todas las columnas de metadata de Canvas
          // Estas columnas NUNCA deben incluirse como calificaciones
          const esColumnaMetadata = headerLower.includes('current points') ||
            headerLower.includes('final points') ||
            headerLower.includes('current score') ||
            headerLower.includes('final score') ||
            headerLower.includes('unposted') ||
            headerLower.includes('solo lectura') ||
            headerLower.includes('tareas current') ||
            headerLower.includes('tareas final') ||
            headerLower.includes('tareas unposted') ||
            headerLower.includes('herramientas profesor');

          // Filtrar columna "Notas" vacía (si existe)
          const esColumnaNotas = headerLower === 'notas';

          // Si es metadata o "Notas", saltar esta columna
          if (esColumnaMetadata || esColumnaNotas) {
            continue;
          }

          // SEGUNDO: Solo incluir columnas que realmente son entregas/evaluaciones
          // Estas deben contener palabras específicas de entregas
          const esColumnaEntrega = headerName.trim() !== '' &&
            (headerLower.includes('entrega') ||
              headerLower.includes('proyecto') ||
              headerLower.includes('escenario') ||
              headerLower.includes('sustentacion'));

          if (esColumnaEntrega) {
            estudiante.calificaciones[headerName] = valor || '';
          }
        }

        if (index === 0) {
          Logger.log('👤 Primer estudiante parseado:', estudiante);
          Logger.log('📊 Calificaciones extraídas:', Object.keys(estudiante.calificaciones));
        }

        return estudiante;
      }).filter(e => {
        // Filtrar líneas vacías y la línea de "Points Possible" si quedó alguna
        const tieneNombre = (e.nombre || e.apellido) && (e.nombre + e.apellido).toLowerCase() !== 'points possible';
        const tieneCorreo = e.correo && e.correo.includes('@');
        return tieneNombre || tieneCorreo;
      });

      // Parsear información del curso desde la columna 'secciones' del CSV
      // Formato esperado: "SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]"
      const primeraSeccion = estudiantes[0]?.secciones || '';

      let nombreCompleto = '';
      let codigoAbreviado = '';
      let bloqueTexto = '';
      let enfasisSiglas = '';
      let modalidadTexto = 'VIRTUAL';
      let grupoSolo = '';

      if (primeraSeccion) {
        // OPTIMIZACIÓN: Un solo regex para capturar todos los componentes
        const fullMatch = primeraSeccion.match(/^([A-Z]+)\s+BLOQUE-([^\/]+)\/([^-]+)-\[GRUPO\s+([A-Z])(\d+)\]/i);

        if (fullMatch) {
          bloqueTexto = fullMatch[1].trim();
          modalidadTexto = fullMatch[2].trim();
          nombreCompleto = fullMatch[3].trim();
          const letraGrupo = fullMatch[4].trim();
          const numeroGrupo = fullMatch[5].trim();
          grupoSolo = numeroGrupo; // Solo el número (ej: "01")

          // Actualizar el ingreso basado en la letra del grupo
          if (['A', 'B', 'C', 'E'].includes(letraGrupo.toUpperCase())) {
            this.cohorteForm.ingreso = letraGrupo.toUpperCase() as any;
          }
        } else {
          // Fallback manual si el formato varía ligeramente
          bloqueTexto = (primeraSeccion.match(/^([A-Z]+)\s+BLOQUE/i)?.[1] || '').trim();
          modalidadTexto = (primeraSeccion.match(/BLOQUE-([^\/]+)\//i)?.[1] || 'VIRTUAL').trim();
          nombreCompleto = (primeraSeccion.match(/\/([^-]+)-/)?.[1] || '').trim();

          // Extraer grupo completo y separar letra de número
          const grupoCompleto = (primeraSeccion.match(/\[GRUPO\s+([A-Z]\d+)\]/i)?.[1] || '').trim();
          if (grupoCompleto) {
            const grupoMatch = grupoCompleto.match(/([A-Z])(\d+)/i);
            if (grupoMatch) {
              const letraGrupo = grupoMatch[1].toUpperCase();
              grupoSolo = grupoMatch[2]; // Solo el número (ej: "01")

              // Actualizar el ingreso basado en la letra del grupo
              if (['A', 'B', 'C', 'E'].includes(letraGrupo)) {
                this.cohorteForm.ingreso = letraGrupo as any;
              }
            }
          }
        }

        enfasisSiglas = this.generarAcronimoCurso(nombreCompleto);
      } else {
        // Fallback: usar nombre del archivo
        const nombreArchivo = (file as any).name.replace('.csv', '');
        const codigoMatch = nombreArchivo.match(/^([A-Z]{2,4})(?=\d+)|([A-Z]{2,4})(?=_)|([A-Z]{2,4})$/i);
        const bloqueMatch = nombreArchivo.match(/([A-Z]\d+)/i);

        nombreCompleto = nombreArchivo;
        enfasisSiglas = codigoMatch?.[0] || nombreArchivo;
        bloqueTexto = bloqueMatch?.[1] || '';
        grupoSolo = (nombreArchivo.match(/([A-Z]\d+)/)?.[0] || '').trim();
      }

      this.estudiantesCargados = estudiantes;

      // AUTO-PARSING: Actualizar cohorteForm basado en el bloque detectado
      // El ingreso ya fue establecido durante el parsing del grupo
      if (bloqueTexto) {
        const bt = bloqueTexto.toUpperCase();
        if (bt.includes('PRIMER')) this.cohorteForm.bloque = 'PRIMERO';
        else if (bt.includes('SEGUNDO')) this.cohorteForm.bloque = 'SEGUNDO';
        else if (bt.includes('TRANSVERSAL')) this.cohorteForm.bloque = 'TRANSVERSAL';
      }

      this.onIngresoChange(); // Actualizar fechas compartidas

      this.cursoParseado = {
        nombre: nombreCompleto,
        siglas: enfasisSiglas,
        grupo: grupoSolo, // Solo el número: "01", "02", etc.
        codigo: '', // Se asignará a continuación
        bloque: this.cohorteForm.bloque || bloqueTexto, // Usar el bloque normalizado del form
        ingreso: this.cohorteForm.ingreso || '',
        modalidad: modalidadTexto,
        modalidadCodigo: this.getModalityInitials(modalidadTexto)
      };

      // Generar y asignar el código estandarizado
      this.cursoParseado.codigo = this.getStandardizedCode(this.cursoParseado);

      // Log para debugging
      Logger.log('📋 Curso parseado:', this.cursoParseado);
      Logger.log('🔢 Código generado:', this.cursoParseado.codigo);

      await this.mostrarToastExito(`${estudiantes.length} estudiantes cargados`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando estudiantes:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al cargar archivo de estudiantes: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.estudiantesCargados = [];
      this.estudiantesFileName = '';
    }
  }

  async onCalificacionesFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.calificacionesFileName = file.name;

    try {
      // Validar que primero se haya cargado el archivo de Personas
      if (this.estudiantesCargados.length === 0) {
        await this.mostrarToastError('Primero debe cargar el archivo de Personas');
        this.calificacionesFileName = '';
        input.value = '';
        return;
      }

      const contenido = await this.leerArchivo(file);

      // Parsear calificaciones usando el método del servicio
      const calificaciones = this.parsearCalificacionesCanvasLocal(contenido);

      // VALIDACIÓN: Verificar que los estudiantes coincidan entre ambos archivos
      const validacion = this.validarCoincidenciaEstudiantes(calificaciones);

      if (!validacion.esValido) {
        await this.mostrarToastError(validacion.mensaje, 5000);
        this.calificacionesFileName = '';
        input.value = '';
        return;
      }

      this.calificacionesCargadas = {
        nombre: file.name,
        fechaCarga: new Date().toISOString(),
        contenidoOriginal: contenido,  // CSV completo para exportar
        calificaciones: calificaciones  // Array procesado para búsquedas
      };

      Logger.log('✅ Calificaciones cargadas:', {
        archivo: file.name,
        totalRegistros: calificaciones.length,
        primerRegistro: calificaciones[0]
      });

      // Parsear calificaciones para vista previa
      this.parsearCalificaciones(contenido);

      // OPTIMIZACIÓN: Notificar al sistema que las calificaciones cambiaron
      // Esto invalidará el cache en cursos.page.ts cuando se guarde
      Logger.log('🔄 [cargarArchivoCalificaciones] Calificaciones cargadas - cache se invalidará al guardar');

      await this.mostrarToastExito('Archivo de calificaciones cargado');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando calificaciones:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al procesar calificaciones: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.calificacionesCargadas = null;
      this.calificacionesFileName = '';
      this.calificacionesParseadas = [];
    }
  }

  /**
   * Valida que los estudiantes del archivo de Calificaciones coincidan con los de Personas
   * @param calificaciones Array de calificaciones parseadas
   * @returns Objeto con resultado de validación y mensaje de error si aplica
   */
  private validarCoincidenciaEstudiantes(calificaciones: Array<{ id: string; e1: number; e2: number; ef: number }>): { esValido: boolean; mensaje: string } {
    // Obtener IDs de estudiantes cargados (archivo Personas)
    const idsPersonas = new Set(
      this.estudiantesCargados
        .map(est => est.canvasUserId?.trim())
        .filter(id => id && id !== '')
    );

    // Obtener IDs de calificaciones
    const idsCalificaciones = new Set(
      calificaciones
        .map(cal => cal.id?.trim())
        .filter(id => id && id !== '')
    );

    // Verificar si hay datos para comparar
    if (idsPersonas.size === 0) {
      return {
        esValido: false,
        mensaje: 'El archivo de Personas no tiene IDs válidos'
      };
    }

    if (idsCalificaciones.size === 0) {
      return {
        esValido: false,
        mensaje: 'El archivo de Calificaciones no tiene IDs válidos'
      };
    }

    // Encontrar estudiantes que están en Personas pero NO en Calificaciones
    const faltanEnCalificaciones: string[] = [];
    idsPersonas.forEach(id => {
      if (!idsCalificaciones.has(id)) {
        faltanEnCalificaciones.push(id);
      }
    });

    // Encontrar estudiantes que están en Calificaciones pero NO en Personas
    const sobranEnCalificaciones: string[] = [];
    idsCalificaciones.forEach(id => {
      if (!idsPersonas.has(id)) {
        sobranEnCalificaciones.push(id);
      }
    });

    // Si hay diferencias significativas, rechazar
    const totalDiferencias = faltanEnCalificaciones.length + sobranEnCalificaciones.length;

    if (totalDiferencias > 0) {
      let mensaje = 'Los archivos no coinciden: ';

      if (faltanEnCalificaciones.length > 0) {
        mensaje += `${faltanEnCalificaciones.length} estudiantes de Personas no están en Calificaciones`;
      }

      if (sobranEnCalificaciones.length > 0) {
        if (faltanEnCalificaciones.length > 0) mensaje += ', ';
        mensaje += `${sobranEnCalificaciones.length} estudiantes de Calificaciones no están en Personas`;
      }

      Logger.warn('⚠️ Validación fallida - Estudiantes no coinciden:', {
        faltanEnCalificaciones,
        sobranEnCalificaciones,
        totalPersonas: idsPersonas.size,
        totalCalificaciones: idsCalificaciones.size
      });

      return {
        esValido: false,
        mensaje
      };
    }

    Logger.log('✅ Validación exitosa - Estudiantes coinciden:', {
      totalPersonas: idsPersonas.size,
      totalCalificaciones: idsCalificaciones.size
    });

    return {
      esValido: true,
      mensaje: ''
    };
  }

  /**
   * Parsea el CSV de calificaciones Canvas extrayendo solo los campos necesarios
   */
  private parsearCalificacionesCanvasLocal(contenido: string): Array<{
    id: string;
    e1: number;
    e2: number;
    ef: number;
  }> {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 3) return [];

    // Saltar header (línea 0) y "Points Possible" (línea 1)
    const calificaciones = [];
    for (let i = 2; i < lineas.length; i++) {
      const campos = this.parseCSVRow(lineas[i]);

      if (campos.length >= 7) {
        calificaciones.push({
          id: campos[1] || '',   // Campo 1: ID de Canvas (canvasUserId)
          e1: parseFloat(campos[4]) || 0,   // Campo 4: Entrega proyecto 1 - Escenario 3
          e2: parseFloat(campos[5]) || 0,   // Campo 5: Entrega proyecto 2 - Escenario 5
          ef: parseFloat(campos[6]) || 0    // Campo 6: Entrega final y sustentacion - Escenario 7 y 8
        });
      }
    }

    return calificaciones;
  }

  /**
   * Parser CSV robusto que maneja comillas correctamente
   */
  private parseCSVRow(csvRow: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csvRow.length) {
      const char = csvRow[i];

      if (char === '"' && (i === 0 || csvRow[i - 1] === ',')) {
        insideQuotes = true;
      } else if (char === '"' && insideQuotes && (i === csvRow.length - 1 || csvRow[i + 1] === ',')) {
        insideQuotes = false;
      } else if (char === ',' && !insideQuotes) {
        result.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
      }

      i++;
    }

    result.push(currentField.trim());
    return result;
  }

  parsearCalificaciones(contenido: string) {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 2) return;

    // Parser CSV con soporte para comillas
    const parsearLineaCSV = (linea: string): string[] => {
      return this.parseCSVRow(linea);
    };

    const headers = parsearLineaCSV(lineas[0]);

    // Filtrar líneas de datos (saltar "Points Possible" y líneas vacías)
    const lineasDatos = lineas.slice(1).filter((linea) => {
      const valores = parsearLineaCSV(linea);
      const primeraColumna = valores[0]?.trim().toLowerCase() || '';
      return !primeraColumna.includes('points possible') && primeraColumna !== '';
    });

    // Detectar índices de columnas
    const nombreIndex = headers.findIndex(h => h.toLowerCase().trim() === 'student' || h.toLowerCase().trim() === 'nombre');
    const loginIdIndex = headers.findIndex(h => h.toLowerCase().trim() === 'sis login id' || h.toLowerCase().trim() === 'login_id');
    const seccionesIndex = headers.findIndex(h => h.toLowerCase().trim() === 'section' || h.toLowerCase().trim() === 'secciones');

    // Parsear estudiantes con calificaciones
    this.calificacionesParseadas = lineasDatos.map(linea => {
      const valores = parsearLineaCSV(linea);
      const estudiante: any = {
        nombre: valores[nombreIndex] || '',
        correo: valores[loginIdIndex] || '',
        seccion: valores[seccionesIndex] || '',
        calificaciones: {}
      };

      // Extraer columnas de calificaciones (índice 4 en adelante)
      for (let i = 4; i < Math.min(valores.length, headers.length); i++) {
        const headerName = headers[i];
        const valor = valores[i];
        const headerLower = headerName.toLowerCase().trim();

        // Filtrar metadata
        const esColumnaMetadata = headerLower.includes('current points') ||
          headerLower.includes('final points') ||
          headerLower.includes('current score') ||
          headerLower.includes('final score') ||
          headerLower.includes('unposted') ||
          headerLower.includes('solo lectura') ||
          headerLower.includes('tareas current') ||
          headerLower.includes('tareas final') ||
          headerLower.includes('tareas unposted') ||
          headerLower.includes('herramientas profesor');

        if (esColumnaMetadata || headerLower === 'notas') continue;

        // Solo incluir columnas de entregas
        const esColumnaEntrega = headerName.trim() !== '' &&
          (headerLower.includes('entrega') ||
            headerLower.includes('proyecto') ||
            headerLower.includes('escenario') ||
            headerLower.includes('sustentacion'));

        if (esColumnaEntrega) {
          estudiante.calificaciones[headerName] = valor || '';
        }
      }

      return estudiante;
    });
  }

  async guardarCurso() {
    if (!this.cursoParseado || this.estudiantesCargados.length === 0) {
      await this.mostrarToastWarning('Debe cargar al menos el archivo de estudiantes', 3000);
      return;
    }

    // Validar que se haya detectado el código del curso
    if (!this.cursoParseado.codigo) {
      await this.mostrarToastWarning('No se pudo detectar el código del curso. Por favor, renombre el archivo con formato: CODIGOB##.csv (ej: EPMB01.csv)', 4000);
      return;
    }

    try {
      // Construir objeto de cohorte si se proporcionó información básica
      let cohorteData: any = undefined;
      const nombreGenerado = this.nombreIngresoGenerado();
      if (nombreGenerado && this.cohorteForm.ingreso) {
        cohorteData = {
          nombre: nombreGenerado,  // Nombre generado automáticamente
          ingreso: this.cohorteForm.ingreso,  // Incluir tipo de ingreso (opcional)
          fechaCarga: new Date().toISOString()
        };
      }

      // Extraer código base del curso para el historial de cohortes
      const codigoBaseCurso = this.dataService.extraerCodigoBaseCurso(this.cursoParseado.codigo);

      // Transformar estudiantes al formato correcto incluyendo canvas_user_id, canvas_group_id y grupo
      const estudiantesTransformados = this.estudiantesCargados.map(est => {
        const estudianteBase = {
          canvasUserId: est.canvasUserId || '',
          canvasGroupId: est.canvasGroupId || '',
          // Soportar tanto formato singular (apellido/nombre) como plural (apellidos/nombres)
          apellidos: (est as any).apellidos || (est as any).apellido || '',
          nombres: (est as any).nombres || (est as any).nombre || '',
          correo: est.correo || '',
          grupo: est.grupo || '', // Ya fue extraído en el parser del CSV
          groupName: est.groupName || '',
          historialIngresos: (est as any).historialIngresos || {}
        };

        // Si hay cohorte definida, actualizar historial del estudiante
        if (cohorteData && codigoBaseCurso) {
          const historial = { ...estudianteBase.historialIngresos };
          if (!historial[codigoBaseCurso]) {
            historial[codigoBaseCurso] = [];
          }
          // Agregar cohorte solo si no existe ya en el historial
          if (!historial[codigoBaseCurso].includes(cohorteData.nombre)) {
            historial[codigoBaseCurso].push(cohorteData.nombre);
          }
          estudianteBase.historialIngresos = historial;
        }

        return estudianteBase;
      });

      let codigoCurso: string;

      // Verificar si es edición o creación
      const enEdicion = this.codigoCursoEnEdicion;
      if (enEdicion) {
        // MODO EDICIÓN: Actualizar curso existente
        codigoCurso = enEdicion;

        // Actualizar estudiantes del curso
        await this.dataService.actualizarEstudiantesCurso(codigoCurso, estudiantesTransformados);

        // Obtener metadata existente para preservar fechaCreacion y profesor
        const uiState = this.dataService.getUIState();
        const courseState = uiState.courseStates?.[codigoCurso];
        const metadataExistente = courseState?.metadata;

        // Actualizar metadata del curso preservando campos existentes
        const newMetadata: any = {
          nombre: this.cursoParseado.nombre,
          siglas: (this.cursoParseado as any).siglas,
          grupo: (this.cursoParseado as any).grupo,
          codigo: this.cursoParseado.codigo,
          bloque: this.cursoParseado.bloque,
          tipoIngreso: this.cursoParseado.ingreso || '', // A, B, C
          modalidad: this.cursoParseado.modalidad || 'VIRTUAL',
          fechaCreacion: metadataExistente?.fechaCreacion || new Date().toISOString(),
          profesor: metadataExistente?.profesor || '',
          nombreAbreviado: metadataExistente?.nombreAbreviado,
          codigoUnico: metadataExistente?.codigoUnico,
          ingreso: cohorteData
        };

        await this.dataService.updateCourseState(codigoCurso, {
          metadata: newMetadata
        });

        // Actualizar el color si se cambió
        if (this.colorCursoSeleccionado) {
          await this.dataService.updateCourseState(codigoCurso, {
            color: this.colorCursoSeleccionado
          });
        }
      } else {
        // MODO CREACIÓN: Crear nuevo curso
        codigoCurso = await this.dataService.crearCurso({
          nombre: this.cursoParseado.nombre,
          codigo: this.cursoParseado.codigo,
          bloque: this.cursoParseado.bloque,
          tipoIngreso: this.cursoParseado.ingreso || '', // A, B, C
          modalidad: this.cursoParseado.modalidad || 'VIRTUAL',
          fechaCreacion: new Date().toISOString(),
          profesor: '',
          estudiantes: estudiantesTransformados,
          cohorte: cohorteData
        });

        // Guardar el color seleccionado para el nuevo curso
        if (this.colorCursoSeleccionado) {
          await this.dataService.updateCourseState(codigoCurso, {
            color: this.colorCursoSeleccionado
          });
        }
      }

      // Si hay archivo de calificaciones, actualizarlo
      if (this.calificacionesCargadas) {
        await this.dataService.updateCourseState(codigoCurso, {
          archivoCalificaciones: this.calificacionesCargadas
        });
      }

      this.cargarCursos();

      // ✅ FIX: Seleccionar automáticamente el curso recién creado/editado
      // Esto asegura que se muestre el detalle del curso después de guardarlo
      setTimeout(() => {
        this.seleccionarCurso(codigoCurso);
      }, 150);

      // Detectar si hubo cambios
      let huboCambios = false;
      if (enEdicion && this.estadoOriginalCurso) {
        // Verificar cambios en color
        const cambioColor = this.estadoOriginalCurso.color !== this.colorCursoSeleccionado;
        // Verificar cambios en estudiantes (comparando longitud o contenido)
        const cambioEstudiantes = JSON.stringify(this.estadoOriginalCurso.estudiantes) !== JSON.stringify(estudiantesTransformados);
        // Verificar cambios en calificaciones
        const cambioCalificaciones = JSON.stringify(this.estadoOriginalCurso.calificaciones) !== JSON.stringify(this.calificacionesCargadas);

        huboCambios = cambioColor || cambioEstudiantes || cambioCalificaciones;
      }

      // Limpiar formulario sin mostrar toast de cancelación
      this.limpiarFormulario();
      this.modoEdicion.set(false);
      this.cursoSeleccionado.set(null);
      this.cursoSeleccionadoClave.set(null);
      this.estadoOriginalCurso = null;

      // Mostrar mensaje apropiado según si hubo cambios
      if (enEdicion) {
        const mensaje = huboCambios ? 'Cambios aplicados' : 'Sin cambios';
        await this.mostrarToastExito(mensaje);
      } else {
        await this.mostrarToastExito('Curso creado');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error guardando curso:', {
        error: errorMessage,
        codigo: this.cursoParseado?.codigo,
        modo: this.codigoCursoEnEdicion ? 'edición' : 'creación',
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al guardar curso: ${errorMessage}`,
        4000
      );
    }
  }

  async cancelarEdicion() {
    // Determinar si es curso nuevo o edición de curso existente
    const esCursoNuevo = !this.codigoCursoEnEdicion;
    const mensaje = esCursoNuevo
      ? 'Creación de nuevo curso cancelada'
      : 'Edición cancelada';

    this.modoEdicion.set(false);
    this.cursoSeleccionado.set(null);
    this.cursoSeleccionadoClave.set(null);
    this.limpiarFormulario();

    await this.mostrarToastWarning(mensaje);
  }

  limpiarFormulario() {
    this.estudiantesFileName = '';
    this.calificacionesFileName = '';
    this.rubricaFileName = '';
    this.estudiantesCargados = [];
    this.calificacionesCargadas = null;
    this.rubricaCargada = null;
    this.cursoParseado = null;
    this.codigoCursoEnEdicion = '';

    // Limpiar formulario de cohorte
    this.cohorteForm = {
      bloque: undefined,
      anio: undefined,
      ingreso: undefined
    };

    if (this.estudiantesFileInput) {
      this.estudiantesFileInput.nativeElement.value = '';
    }
    if (this.calificacionesFileInput) {
      this.calificacionesFileInput.nativeElement.value = '';
    }
    if (this.rubricaFileInput) {
      this.rubricaFileInput.nativeElement.value = '';
    }
  }

  limpiarEstudiantes() {
    this.estudiantesCargados = [];
    this.estudiantesFileName = '';
    this.cursoParseado = null;

    if (this.estudiantesFileInput?.nativeElement) {
      this.estudiantesFileInput.nativeElement.value = '';
    }
  }

  limpiarCalificaciones() {
    this.calificacionesFileName = '';
    this.calificacionesCargadas = null;
    this.calificacionesParseadas = [];
    if (this.calificacionesFileInput) {
      this.calificacionesFileInput.nativeElement.value = '';
    }
  }

  desvincularArchivoEstudiantes() {
    this.estudiantesFileName = '';
    this.estudiantesCargados = [];
    this.cursoParseado = null;
  }

  desvincularArchivoCalificaciones() {
    this.calificacionesFileName = '';
    this.calificacionesCargadas = null;
  }

  async eliminarCurso(curso: any, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `
        <p>¿Estás seguro de eliminar el curso <strong>"${curso.nombre}"</strong> (${curso.nombreAbreviado})?</p>
        
        <div style="margin: 16px 0; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px;">
          <p style="margin: 4px 0;"><strong>Código:</strong> ${curso.codigo}</p>
          <p style="margin: 4px 0;"><strong>Bloque:</strong> ${curso.bloque || '—'}</p>
        </div>
        
        <p style="margin-top: 16px;"><strong>Se eliminarán:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Todos los estudiantes del curso</li>
          <li>Todas las evaluaciones asociadas</li>
          <li>Comentarios y seguimiento</li>
        </ul>
        
        <p style="margin-top: 12px; color: #d32f2f;"><strong>⚠️ Esta acción no se puede deshacer.</strong></p>
      `,
      cssClass: 'premium-alert premium-alert--danger',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              const claveCurso = this.resolverClaveCurso(curso.codigo) || curso.codigo;
              await this.dataService.eliminarCurso(claveCurso);
              this.cargarCursos();

              if (this.cursoSeleccionado() === curso.codigo || this.cursoSeleccionadoClave() === claveCurso) {
                this.deseleccionarCurso();
              }

              await this.mostrarToastExito(`Curso "${curso.nombreAbreviado}" eliminado`);
            } catch (error) {
              Logger.error('Error eliminando curso:', error);
              await this.mostrarToastError('Error al eliminar curso');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  convertirBloqueTextoANumeroOld(texto: string): number {
    const bloques: Record<string, number> = {
      'PRIMER': 1, 'PRIMERO': 1, 'FIRST': 1,
      'SEGUNDO': 2, 'SECOND': 2,
      'TERCER': 3, 'TERCERO': 3, 'THIRD': 3,
      'CUARTO': 4, 'FOURTH': 4,
      'QUINTO': 5, 'FIFTH': 5,
      'SEXTO': 6, 'SIXTH': 6
    };
    return bloques[texto.toUpperCase()] || 1;
  }

  tieneArchivoCalificaciones(codigo: string): boolean {
    const claveCurso = this.resolverClaveCurso(codigo);
    if (!claveCurso) return false;
    return this.dataService.obtenerArchivoCalificaciones(claveCurso) !== null;
  }

  obtenerNombreArchivoCalificaciones(codigo: string): string {
    const claveCurso = this.resolverClaveCurso(codigo);
    if (!claveCurso) return '';
    const uiState = this.dataService.getUIState();
    const archivo = uiState.courseStates?.[claveCurso]?.archivoCalificaciones;
    return archivo?.nombre || '';
  }

  async eliminarArchivoCalificacionesGuardado() {
    if (!this.codigoCursoEnEdicion) return;

    await this.dataService.updateCourseState(this.codigoCursoEnEdicion, {
      archivoCalificaciones: undefined
    });

    await this.mostrarToastExito('Archivo de calificaciones eliminado');
  }

  private leerArchivo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }

  async onRubricaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.rubricaFileName = file.name;

    // Validar extensión
    if (!file.name.endsWith('.txt')) {
      await this.mostrarToastWarning('Solo se permiten archivos .txt');
      return;
    }

    try {
      const contenido = await this.leerArchivo(file);
      const rubrica = this.dataService.parsearArchivoRubrica(contenido);

      if (!rubrica) {
        await this.mostrarToastError('Error al parsear el archivo de rúbrica');
        return;
      }

      this.rubricaCargada = rubrica;
      await this.mostrarToastExito(`Rúbrica "${rubrica?.nombre || 'desconocida'}" cargada exitosamente`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando rúbrica:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al cargar rúbrica: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.rubricaCargada = null;
      this.rubricaFileName = '';
    }
  }

  async guardarRubrica() {
    if (!this.rubricaCargada) {
      await this.mostrarToastWarning('No hay rúbrica para guardar');
      return;
    }

    try {
      await this.dataService.guardarRubrica(this.rubricaCargada);

      await this.mostrarToastExito(`Rúbrica "${this.rubricaCargada?.nombre || 'desconocida'}" guardada exitosamente`);

      // Limpiar estado
      this.rubricaCargada = null;
      this.rubricaFileName = '';
      if (this.rubricaFileInput) {
        this.rubricaFileInput.nativeElement.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error guardando rúbrica:', {
        error: errorMessage,
        rubrica: this.rubricaCargada?.nombre,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al guardar rúbrica: ${errorMessage}`,
        4000
      );
    }
  }

  desvincularArchivoRubrica() {
    this.rubricaFileName = '';
    this.rubricaCargada = null;
    if (this.rubricaFileInput) {
      this.rubricaFileInput.nativeElement.value = '';
    }
  }

  obtenerColumnasCalificaciones(): string[] {
    if (this.calificacionesParseadas.length === 0) return [];
    return Object.keys(this.calificacionesParseadas[0]?.calificaciones || {});
  }

  verCalificaciones(codigo: string) {
    // Navegar a la página de calificaciones con el curso seleccionado
    Logger.log('Ver calificaciones:', codigo);
  }

  async exportarCalificaciones(codigo: string) {
    const claveCurso = this.resolverClaveCurso(codigo);
    if (!claveCurso) return;

    const uiState = this.dataService.getUIState();
    const archivo = uiState.courseStates?.[claveCurso]?.archivoCalificaciones;

    if (archivo) {
      const blob = new Blob([archivo.contenidoOriginal], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calificaciones_${codigo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      await this.mostrarToastExito('Calificaciones exportadas');
    }
  }

  /**
   * Obtiene la información de cohorte de un curso desde su metadata
   */
  getCursoCohorte(codigo: string): { nombre: string; ingreso?: 'A' | 'B' | 'C' } | null {
    const claveCurso = this.resolverClaveCurso(codigo);
    if (!claveCurso) return null;

    const uiState = this.dataService.getUIState();
    const metadata = uiState.courseStates?.[claveCurso]?.metadata;

    return metadata?.ingreso || null;
  }

  /**
   * Método helper para mostrar mensajes de error de forma consistente
   * Usa ToastService que respeta la preferencia del usuario
   */
  private async mostrarToastError(mensaje: string, duracion: number = 3000): Promise<void> {
    await this.toastService.error(mensaje, undefined, duracion);
  }

  /**
   * Método helper para mostrar mensajes de éxito de forma consistente
   * Usa ToastService que respeta la preferencia del usuario
   */
  private async mostrarToastExito(mensaje: string, duracion: number = 2000): Promise<void> {
    await this.toastService.success(mensaje, undefined, duracion);
  }

  /**
   * Método helper para mostrar mensajes de advertencia
   */
  private async mostrarToastWarning(mensaje: string, duracion: number = 2000): Promise<void> {
    await this.toastService.warning(mensaje, undefined, duracion);
  }

  /**
   * Genera acrónimo del curso manejando casos especiales como ÉNFASIS
   * @param nombreCompleto Nombre completo del curso (ej: "ÉNFASIS EN PROGRAMACIÓN MÓVIL")
   * @returns Acrónimo generado (ej: "EPM")
   * @example
   * generarAcronimoCurso("ÉNFASIS EN PROGRAMACIÓN MÓVIL") → "EPM"
   * generarAcronimoCurso("PROGRAMACIÓN MÓVIL") → "PM"
   * generarAcronimoCurso("REDES Y COMUNICACIONES") → "RC"
   */
  public generarAcronimoCurso(nombreCompleto: string): string {
    // Normalizar texto: quitar tildes y convertir a mayúsculas
    const normalizarTexto = (texto: string): string => {
      return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    };

    // Lista de preposiciones a excluir
    const preposiciones = new Set([
      'DE', 'EN', 'DEL', 'LA', 'EL', 'LOS', 'LAS',
      'A', 'CON', 'PARA', 'POR', 'Y', 'AL'
    ]);

    const palabras = nombreCompleto.split(/\s+/);
    const letrasSignificativas: string[] = [];

    palabras.forEach((palabra, index) => {
      // Normalizar la palabra
      const palabraNormalizada = normalizarTexto(palabra);

      // CASO ESPECIAL: Primera palabra es "ÉNFASIS" → tomar "E"
      if (index === 0 && palabraNormalizada === 'ENFASIS') {
        letrasSignificativas.push('E');
        return;
      }

      // Saltar preposiciones
      if (preposiciones.has(palabraNormalizada)) {
        return;
      }

      // CASO ESPECIAL: Si es un número (ej: "1", "2"), mantenerlo aunque sea corto
      if (/^\d+$/.test(palabraNormalizada)) {
        letrasSignificativas.push(palabraNormalizada);
        return;
      }

      // Saltar palabras muy cortas (1-2 letras) que no sean números
      if (palabra.length <= 2) {
        return;
      }

      // Tomar primera letra de palabra significativa
      letrasSignificativas.push(palabraNormalizada[0]);
    });

    return letrasSignificativas.join('');
  }

  /**
   * Formatea el label para los tabs de curso siguiendo el patrón:
   * Nombre completo del Curso (SIGLAS+Ingreso+GrupoNum)
   * @param curso Objeto del curso
   */
  getLabelTabCurso(curso: any): string {
    if (!curso) return '';

    const nombre = curso.nombre || '';
    const codigoClean = this.getStandardizedCode(curso);

    return `${nombre} (${codigoClean})`;
  }

  private convertirBloqueTextoANumero(texto: string): string {
    const t = (texto || '').toUpperCase().trim();
    if (t.includes('PRIMERO')) return '1';
    if (t.includes('SEGUNDO')) return '2';
    if (t.includes('TRANSVERSAL')) return 'TRV';
    const match = t.match(/\d+/);
    return match ? match[0] : '1';
  }
}
