import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonCard, IonCardContent, IonChip, IonToggle,
  ModalController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, saveOutline, addCircleOutline, trashOutline,
  createOutline, checkmarkCircleOutline, documentTextOutline,
  chevronDownOutline, chevronUpOutline, copyOutline, alertCircleOutline, listOutline, settingsOutline, alertCircle, checkmarkCircle } from 'ionicons/icons';

import { DataService } from '@app/services/data.service';
import {
  RubricaDefinicion, CriterioRubrica, NivelRubricaDetallado,
  TipoRubrica, TipoEntrega, EstadoRubrica, EscalaCalificacion,
  NIVELES_ESTANDAR, CANTIDAD_NIVELES
} from '@app/models';

/** Interfaz para el formulario de criterio */
interface CriterioFormulario {
  titulo: string;
  peso: number;
  niveles: NivelFormulario[];
  expandido: boolean;
}

/** Interfaz para el formulario de nivel */
interface NivelFormulario {
  titulo: string;
  descripcion: string;
  puntosMin: number;
  puntosMax: number;
}

@Component({
  selector: 'app-rubrica-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonCard, IonCardContent, IonChip, IonToggle
],
  templateUrl: './rubrica-editor.component.html',
  styleUrls: ['./rubrica-editor.component.scss']
})
export class RubricaEditorComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private dataService = inject(DataService);

  /** Rúbrica existente para editar (null = nueva) */
  @Input() rubricaExistente: RubricaDefinicion | null = null;
  /** Cursos disponibles pasados desde el padre */
  @Input() cursosDisponiblesInput: Array<{ codigo: string; nombre: string }> = [];
  /** Modo inline (true) o modal (false) */
  @Input() modoInline = false;

  /** Evento emitido cuando se guarda la rúbrica (modo inline) */
  @Output() guardado = new EventEmitter<{ guardado: boolean; rubrica?: RubricaDefinicion }>();
  /** Evento emitido cuando se cancela (modo inline) */
  @Output() cancelado = new EventEmitter<void>();

  // Datos del formulario principal
  tipoRubrica: TipoRubrica = 'PG';
  tipoEntrega: TipoEntrega = 'E1';
  cursoSeleccionado: string = '';
  nombreRubrica: string = '';
  puntuacionTotal: number = 100;
  rubricaActiva: boolean = true;

  // Preview de código generado
  codigoPreview: string = '';
  versionPreview: number = 1;

  // Información de duplicados
  duplicadoInfo: {
    existeDuplicado: boolean;
    rubricasCoincidentes: RubricaDefinicion[];
    nombreSugerido: string;
  } | null = null;

  // Escala de calificación
  escalaCalificacion: EscalaCalificacion[] = [];

  // Criterios dinámicos
  criterios: CriterioFormulario[] = [];
  cantidadCriterios: number = 3;

  // Cursos disponibles
  cursosDisponibles: Array<{ codigo: string; nombre: string }> = [];

  // Constantes
  readonly NIVELES_TITULOS = NIVELES_ESTANDAR;
  readonly NUM_NIVELES = CANTIDAD_NIVELES;

  // Estado
  guardando = false;

  /** Indica si estamos editando una rúbrica existente */
  get esModoEdicion(): boolean {
    return !!this.rubricaExistente;
  }

  /** Obtiene el nombre del curso actual */
  get nombreCursoActual(): string {
    if (this.cursoSeleccionado) {
      const curso = this.cursosDisponibles.find(c => c.codigo === this.cursoSeleccionado);
      return curso?.nombre || this.cursoSeleccionado;
    }
    return 'Sin curso';
  }

  constructor() {
    addIcons({closeOutline,saveOutline,checkmarkCircleOutline,settingsOutline,alertCircleOutline,alertCircle,checkmarkCircle,listOutline,addCircleOutline,copyOutline,trashOutline,documentTextOutline,createOutline,chevronDownOutline,chevronUpOutline});
  }

  ngOnInit(): void {
    this.cargarCursos();
    this.inicializarEscalaDefecto();

    if (this.rubricaExistente) {
      this.cargarRubricaExistente();
    } else {
      this.inicializarCriteriosVacios();
    }

    // Inicializar preview de código
    this.actualizarPreviewCodigo();
  }

  /** Carga los cursos disponibles desde el input o desde el servicio */
  private cargarCursos(): void {
    // Si se pasaron cursos desde el input, usarlos (ya vienen agrupados)
    if (this.cursosDisponiblesInput && this.cursosDisponiblesInput.length > 0) {
      this.cursosDisponibles = this.cursosDisponiblesInput;
      return;
    }

    // Si no, cargar desde el servicio agrupando por nombre de curso
    const uiState = this.dataService.getUIState();
    const cursosUnicos = new Map<string, { codigo: string; nombre: string }>();

    Object.entries(uiState.courseStates || {})
      .filter(([_, state]) => state.metadata)
      .forEach(([codigo, state]) => {
        const nombre = state.metadata?.nombre || codigo;
        // Solo agregar si el nombre no existe (evita duplicados por grupo)
        if (!cursosUnicos.has(nombre)) {
          cursosUnicos.set(nombre, { codigo, nombre });
        }
      });

    this.cursosDisponibles = Array.from(cursosUnicos.values());
  }

  /** Inicializa la escala de calificación por defecto */
  private inicializarEscalaDefecto(): void {
    this.escalaCalificacion = [
      { min: 0, max: 29, rango: '0-29', nivel: 'Insuficiente', descripcion: 'Requiere reelaboración significativa' },
      { min: 30, max: 49, rango: '30-49', nivel: 'Aceptable', descripcion: 'Cumple requisitos mínimos pero requiere mejoras' },
      { min: 50, max: 74, rango: '50-74', nivel: 'Bueno', descripcion: 'Cumple con lo esperado con buen nivel' },
      { min: 75, max: 100, rango: '75-100', nivel: 'Excelente', descripcion: 'Supera expectativas, alta calidad' }
    ];
  }

  /** Carga datos de una rúbrica existente para edición */
  private cargarRubricaExistente(): void {
    if (!this.rubricaExistente) return;

    this.tipoRubrica = this.rubricaExistente.tipoRubrica || 'PG';
    this.tipoEntrega = this.rubricaExistente.tipoEntrega || 'E1';
    this.cursoSeleccionado = this.rubricaExistente.cursosCodigos?.[0] || '';
    this.nombreRubrica = this.rubricaExistente.nombre || '';
    this.puntuacionTotal = this.rubricaExistente.puntuacionTotal || 100;
    this.rubricaActiva = this.rubricaExistente.activa ?? true;

    if (this.rubricaExistente.escalaCalificacion?.length) {
      this.escalaCalificacion = [...this.rubricaExistente.escalaCalificacion];
    }

    // Cargar criterios existentes
    this.criterios = this.rubricaExistente.criterios.map(c => ({
      titulo: c.titulo,
      peso: c.peso || c.pesoMaximo || 0,
      expandido: false,
      niveles: this.convertirNivelesAFormulario(c.nivelesDetalle)
    }));

    this.cantidadCriterios = this.criterios.length;
  }

  /** Convierte niveles del modelo al formulario */
  private convertirNivelesAFormulario(niveles: NivelRubricaDetallado[]): NivelFormulario[] {
    if (!niveles || niveles.length === 0) {
      return this.crearNivelesVacios(0);
    }

    return niveles.map(n => ({
      titulo: n.titulo,
      descripcion: n.descripcion,
      puntosMin: n.puntosMin,
      puntosMax: n.puntosMax
    }));
  }

  /** Inicializa criterios vacíos */
  private inicializarCriteriosVacios(): void {
    this.criterios = [];
    for (let i = 0; i < this.cantidadCriterios; i++) {
      this.agregarCriterio();
    }
  }

  /** Crea niveles vacíos para un criterio */
  private crearNivelesVacios(peso: number): NivelFormulario[] {
    const niveles: NivelFormulario[] = [];
    const pesoBase = peso || 10;

    for (let i = 0; i < this.NUM_NIVELES; i++) {
      const puntosMax = Math.round((pesoBase / this.NUM_NIVELES) * (i + 1));
      const puntosMin = i === 0 ? 0 : Math.round((pesoBase / this.NUM_NIVELES) * i) + 1;

      niveles.push({
        titulo: this.NIVELES_TITULOS[i],
        descripcion: '',
        puntosMin: i === 0 ? 0 : puntosMin,
        puntosMax: i === this.NUM_NIVELES - 1 ? pesoBase : puntosMax
      });
    }

    return niveles;
  }

  /** Agrega un nuevo criterio */
  agregarCriterio(): void {
    const pesoSugerido = this.calcularPesoSugerido();
    this.criterios.push({
      titulo: '',
      peso: pesoSugerido,
      expandido: true,
      niveles: this.crearNivelesVacios(pesoSugerido)
    });
    this.cantidadCriterios = this.criterios.length;
  }

  /** Calcula peso sugerido basado en puntuación restante */
  private calcularPesoSugerido(): number {
    const pesoUsado = this.criterios.reduce((sum, c) => sum + (c.peso || 0), 0);
    const restante = this.puntuacionTotal - pesoUsado;
    return Math.max(5, Math.min(restante, 20));
  }

  /** Elimina un criterio */
  async eliminarCriterio(index: number): Promise<void> {
    if (this.criterios.length <= 1) {
      await this.mostrarToast('Debe haber al menos un criterio', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Eliminar Criterio',
      message: `¿Eliminar el criterio "${this.criterios[index].titulo || 'Sin título'}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.criterios.splice(index, 1);
            this.cantidadCriterios = this.criterios.length;
          }
        }
      ]
    });
    await alert.present();
  }

  /** Duplica un criterio */
  duplicarCriterio(index: number): void {
    const original = this.criterios[index];
    const copia: CriterioFormulario = {
      titulo: `${original.titulo} (copia)`,
      peso: original.peso,
      expandido: true,
      niveles: original.niveles.map(n => ({ ...n }))
    };
    this.criterios.splice(index + 1, 0, copia);
    this.cantidadCriterios = this.criterios.length;
  }

  /** Toggle expandir/colapsar criterio */
  toggleCriterio(index: number): void {
    this.criterios[index].expandido = !this.criterios[index].expandido;
  }

  /** Actualiza los rangos de puntos de los niveles cuando cambia el peso */
  actualizarRangosNiveles(criterioIndex: number): void {
    const criterio = this.criterios[criterioIndex];
    const peso = criterio.peso || 10;

    criterio.niveles.forEach((nivel, i) => {
      const puntosMax = Math.round((peso / this.NUM_NIVELES) * (i + 1));
      const puntosMin = i === 0 ? 0 : Math.round((peso / this.NUM_NIVELES) * i) + 1;

      nivel.puntosMin = i === 0 ? 0 : puntosMin;
      nivel.puntosMax = i === this.NUM_NIVELES - 1 ? peso : puntosMax;
    });
  }

  /**
   * Valida y ajusta los intervalos de puntos de un nivel específico.
   * Asegura que no haya solapamiento y que los valores sean coherentes.
   */
  validarIntervaloNivel(criterioIndex: number, nivelIndex: number): void {
    const criterio = this.criterios[criterioIndex];
    const nivel = criterio.niveles[nivelIndex];
    const peso = criterio.peso || 10;

    // Asegurar que los valores estén dentro del rango válido
    nivel.puntosMin = Math.max(0, Math.min(nivel.puntosMin, peso));
    nivel.puntosMax = Math.max(nivel.puntosMin, Math.min(nivel.puntosMax, peso));

    // El primer nivel siempre debe empezar en 0
    if (nivelIndex === 0) {
      nivel.puntosMin = 0;
    }

    // El último nivel siempre debe terminar en el peso máximo
    if (nivelIndex === this.NUM_NIVELES - 1) {
      nivel.puntosMax = peso;
    }
  }

  /** Genera nombre automático de la rúbrica usando el servicio */
  generarNombreAutomatico(): void {
    const rubricaParcial = {
      tipoRubrica: this.tipoRubrica,
      tipoEntrega: this.tipoEntrega,
      cursosCodigos: this.cursoSeleccionado ? [this.cursoSeleccionado] : []
    };

    this.nombreRubrica = this.dataService.generarNombreAutomatico(rubricaParcial);
    this.verificarDuplicados();
    this.actualizarPreviewCodigo();
  }

  /** Actualiza el preview del código que se generará */
  actualizarPreviewCodigo(): void {
    // Si es edición de rúbrica existente, mostrar el código actual
    if (this.rubricaExistente?.codigo) {
      this.codigoPreview = this.rubricaExistente.codigo;
      this.versionPreview = this.rubricaExistente.version || 1;
      return;
    }

    // Si es nueva rúbrica, calcular el código que se generará
    const rubricaParcial = {
      tipoRubrica: this.tipoRubrica,
      tipoEntrega: this.tipoEntrega,
      cursosCodigos: this.cursoSeleccionado ? [this.cursoSeleccionado] : []
    };

    const preview = this.dataService.obtenerPreviewCodigo(rubricaParcial);
    this.codigoPreview = preview.codigo;
    this.versionPreview = preview.version;
  }

  /** Verifica si existe una rúbrica con nombre similar */
  verificarDuplicados(): void {
    if (!this.nombreRubrica.trim()) {
      this.duplicadoInfo = null;
      return;
    }

    const idExcluir = this.rubricaExistente?.id;
    const resultado = this.dataService.detectarRubricaDuplicada(this.nombreRubrica, idExcluir);

    this.duplicadoInfo = resultado.existeDuplicado ? {
      existeDuplicado: resultado.existeDuplicado,
      rubricasCoincidentes: resultado.rubricasCoincidentes,
      nombreSugerido: resultado.nombreSugerido
    } : null;
  }

  /** Aplica el nombre sugerido cuando hay duplicados */
  usarNombreSugerido(): void {
    if (this.duplicadoInfo?.nombreSugerido) {
      this.nombreRubrica = this.duplicadoInfo.nombreSugerido;
      this.verificarDuplicados();
    }
  }

  /** Abre diálogo para copiar la rúbrica a otro curso */
  async abrirCopiarACurso(): Promise<void> {
    // Filtrar cursos disponibles excluyendo el actual
    const cursosOtros = this.cursosDisponibles.filter(c => c.codigo !== this.cursoSeleccionado);

    if (cursosOtros.length === 0) {
      await this.mostrarToast('No hay otros cursos disponibles para copiar', 'warning');
      return;
    }

    const inputs = cursosOtros.map(curso => ({
      type: 'radio' as const,
      label: curso.nombre,
      value: curso.codigo
    }));

    const alert = await this.alertCtrl.create({
      header: 'Copiar rúbrica a otro curso',
      message: 'Seleccione el curso destino para crear una copia de esta rúbrica:',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear copia',
          handler: async (cursoDestino: string) => {
            if (!cursoDestino) {
              this.mostrarToast('Seleccione un curso', 'warning');
              return false;
            }
            await this.copiarRubricaACurso(cursoDestino);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  /** Crea una copia de la rúbrica actual para otro curso */
  private async copiarRubricaACurso(cursoDestinoCodigo: string): Promise<void> {
    try {
      const cursoDestino = this.cursosDisponibles.find(c => c.codigo === cursoDestinoCodigo);
      if (!cursoDestino) return;

      // Construir la rúbrica actual
      const rubricaActual = this.construirRubrica('borrador');

      // Generar nuevo nombre basado en el curso destino
      let nuevoNombre = rubricaActual.nombre;

      // Intentar reemplazar el nombre del curso actual por el destino
      if (this.nombreCursoActual && nuevoNombre.includes(this.nombreCursoActual)) {
        nuevoNombre = nuevoNombre.replace(this.nombreCursoActual, cursoDestino.nombre);
      } else {
        // Si no contiene el nombre del curso, agregar sufijo
        nuevoNombre = `${rubricaActual.nombre} - ${cursoDestino.nombre}`;
      }

      // Crear copia con nuevo curso - el código se generará automáticamente
      // basándose en cursosCodigos que ahora apunta al curso destino
      const rubricaCopia: RubricaDefinicion = {
        ...rubricaActual,
        id: this.generarIdUnico(),
        codigo: undefined, // Se generará nuevo código basado en cursoDestino
        version: undefined, // Se calculará automáticamente (v1 si es nuevo código base)
        cursosCodigos: [cursoDestinoCodigo], // Nuevo curso = nuevo código base
        cursoAsociado: cursoDestino.nombre,
        nombre: nuevoNombre,
        activa: false, // Copia siempre inactiva por defecto
        fechaCreacion: new Date(),
        fechaModificacion: new Date()
      };

      await this.dataService.guardarRubrica(rubricaCopia);

      // Recargar para obtener el código generado
      const rubricasActualizadas = this.dataService.obtenerRubricasArray();
      const rubricaGuardada = rubricasActualizadas.find(r => r.id === rubricaCopia.id);
      const codigoGenerado = rubricaGuardada?.codigo || 'N/A';

      await this.mostrarToast(`Rúbrica copiada: ${codigoGenerado} (inactiva)`, 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al copiar: ${error.message}`, 'danger');
    }
  }

  /** Se ejecuta cuando cambia el tipo de rúbrica o entrega */
  onTipoChange(): void {
    this.actualizarPreviewCodigo();
    // Si el nombre está vacío o es generado automáticamente, regenerarlo
    if (!this.nombreRubrica.trim() || this.esNombreGenerado()) {
      this.generarNombreAutomatico();
    }
  }

  /** Se ejecuta cuando cambia el curso seleccionado */
  onCursoChange(): void {
    this.actualizarPreviewCodigo();
    // Si el nombre está vacío o es generado automáticamente, regenerarlo
    if (!this.nombreRubrica.trim() || this.esNombreGenerado()) {
      this.generarNombreAutomatico();
    }
  }

  /** Verifica si el nombre actual parece ser generado automáticamente */
  private esNombreGenerado(): boolean {
    return this.nombreRubrica.startsWith('Rúbrica ');
  }

  /** Se ejecuta cuando cambia el nombre manualmente */
  onNombreChange(): void {
    this.verificarDuplicados();
  }

  /** Calcula el peso total de todos los criterios */
  get pesoTotalCriterios(): number {
    return this.criterios.reduce((sum, c) => sum + (c.peso || 0), 0);
  }

  /** Verifica si el peso total coincide con la puntuación total */
  get pesoCoincide(): boolean {
    return this.pesoTotalCriterios === this.puntuacionTotal;
  }

  /** Valida el formulario para guardar */
  validarFormulario(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!this.cursoSeleccionado) {
      errores.push('Debe seleccionar un curso');
    }

    if (!this.nombreRubrica.trim()) {
      errores.push('Debe ingresar un nombre para la rúbrica');
    }

    if (this.criterios.length === 0) {
      errores.push('Debe agregar al menos un criterio');
    }

    const criteriosSinTitulo = this.criterios.filter(c => !c.titulo.trim());
    if (criteriosSinTitulo.length > 0) {
      errores.push(`${criteriosSinTitulo.length} criterio(s) sin título`);
    }

    return { valido: errores.length === 0, errores };
  }

  /** Guarda como borrador */
  async guardarBorrador(): Promise<void> {
    await this.guardarRubrica('borrador');
  }

  /** Publica la rúbrica */
  async publicarRubrica(): Promise<void> {
    const validacion = this.validarFormulario();
    if (!validacion.valido) {
      await this.mostrarAlertaErrores(validacion.errores);
      return;
    }

    if (!this.pesoCoincide) {
      const confirmar = await this.confirmarPesoNoCoincide();
      if (!confirmar) return;
    }

    await this.guardarRubrica('publicada');
  }

  /** Muestra alerta de confirmación cuando el peso no coincide */
  private async confirmarPesoNoCoincide(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Peso no coincide',
        message: `El peso total de criterios (${this.pesoTotalCriterios}) no coincide con la puntuación total (${this.puntuacionTotal}). ¿Desea continuar?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: 'Continuar', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }

  /** Guarda la rúbrica con el estado especificado */
  private async guardarRubrica(estado: EstadoRubrica): Promise<void> {
    this.guardando = true;

    try {
      let rubrica = this.construirRubrica(estado);

      // CASO 1: Edición de rúbrica existente - verificar si hay cambios
      if (this.rubricaExistente?.codigo) {
        const comparacion = this.dataService.compararContenidoRubricas(rubrica, this.rubricaExistente);

        if (!comparacion.sonIdenticas) {
          // Hay cambios - preguntar si guardar como nueva versión
          const decision = await this.confirmarGuardarComoNuevaVersion(comparacion, estado);

          if (decision === 'cancelar') {
            return;
          }

          if (decision === 'nueva_version') {
            // Crear nueva versión (inactiva por defecto)
            rubrica = this.construirNuevaVersion(rubrica, estado);
          }
          // Si decision === 'sobrescribir', se guarda con el mismo código
        }
      }
      // CASO 2: Rúbrica nueva - verificar duplicados por nombre Y contenido
      else {
        const analisis = this.dataService.analizarRubricaParaGuardado(rubrica);

        if (analisis.tipo === 'duplicada_identica') {
          await this.mostrarAlertaDuplicadaIdentica(analisis.rubricaExistente!);
          return;
        }

        // NUEVO: Manejar duplicado por contenido (diferente nombre, mismo contenido)
        if (analisis.tipo === 'duplicada_contenido') {
          await this.mostrarAlertaDuplicadaContenido(analisis.rubricaExistente!);
          return;
        }

        if (analisis.tipo === 'nueva_version') {
          const confirmacion = await this.confirmarNuevaVersion(analisis, estado);
          if (!confirmacion.guardar) {
            return;
          }
          if (confirmacion.usarNombreVersionado) {
            rubrica.nombre = this.dataService.detectarRubricaDuplicada(rubrica.nombre).nombreSugerido;
          }
          // Nueva versión siempre inactiva por defecto
          rubrica.activa = false;
        }
      }

      await this.dataService.guardarRubrica(rubrica);

      const mensaje = rubrica.activa === false
        ? `Rúbrica guardada como nueva versión (inactiva)`
        : estado === 'borrador'
          ? 'Rúbrica guardada como borrador'
          : 'Rúbrica publicada exitosamente';

      await this.mostrarToast(mensaje, 'success');

      if (this.modoInline) {
        this.guardado.emit({ guardado: true, rubrica });
      } else {
        await this.modalCtrl.dismiss({ guardado: true, rubrica });
      }
    } catch (error: any) {
      await this.mostrarToast(`Error al guardar: ${error.message}`, 'danger');
    } finally {
      this.guardando = false;
    }
  }

  /** Construye una nueva versión de la rúbrica (sin código para que se genere nuevo) */
  private construirNuevaVersion(rubricaBase: RubricaDefinicion, estado: EstadoRubrica): RubricaDefinicion {
    return {
      ...rubricaBase,
      id: this.generarIdUnico(), // Nuevo ID
      codigo: undefined, // Se generará automáticamente
      version: undefined, // Se calculará automáticamente
      activa: false, // Nueva versión siempre inactiva
      estado,
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };
  }

  /** Confirma si guardar cambios como nueva versión o sobrescribir */
  private async confirmarGuardarComoNuevaVersion(
    comparacion: { sonIdenticas: boolean; diferencias: string[]; resumen: string },
    estado: EstadoRubrica
  ): Promise<'nueva_version' | 'sobrescribir' | 'cancelar'> {
    return new Promise(async (resolve) => {
      const diferencias = comparacion.diferencias;
      const listaDiferencias = diferencias.length <= 4
        ? diferencias.map((d: string) => `<li>${d}</li>`).join('')
        : diferencias.slice(0, 3).map((d: string) => `<li>${d}</li>`).join('') +
          `<li><em>...y ${diferencias.length - 3} cambios más</em></li>`;

      const estadoTexto = estado === 'publicada' ? 'Publicada' : 'Borrador';

      const alert = await this.alertCtrl.create({
        header: 'Cambios detectados',
        subHeader: 'La rúbrica ha sido modificada',
        message: `
          <div class="cambios-detectados">
            <p><strong>Cambios realizados:</strong></p>
            <ul class="diferencias-lista">${listaDiferencias}</ul>
            <hr>
            <p>¿Cómo desea guardar los cambios?</p>
            <p class="nota"><ion-icon name="information-circle-outline"></ion-icon>
              Las nuevas versiones se guardan <strong>inactivas</strong> por defecto.
              Puede activarlas desde el historial de versiones.
            </p>
          </div>
        `,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve('cancelar')
          },
          {
            text: 'Sobrescribir actual',
            cssClass: 'alert-button-secondary',
            handler: () => resolve('sobrescribir')
          },
          {
            text: 'Nueva versión',
            cssClass: 'alert-button-primary',
            handler: () => resolve('nueva_version')
          }
        ],
        cssClass: 'alerta-cambios-detectados'
      });
      await alert.present();
    });
  }

  /** Muestra alerta cuando la rúbrica es idéntica a una existente */
  private async mostrarAlertaDuplicadaIdentica(rubricaExistente: RubricaDefinicion): Promise<void> {
    this.guardando = false;

    const alert = await this.alertCtrl.create({
      header: 'Rúbrica duplicada',
      subHeader: 'No es necesario guardar',
      message: `
        <p>Ya existe una rúbrica con contenido idéntico:</p>
        <p><strong>${rubricaExistente.nombre}</strong></p>
        <p>Código: <code>${rubricaExistente.codigo || 'N/A'}</code></p>
        <p>Estado: ${rubricaExistente.estado === 'publicada' ? '✅ Publicada' : '📝 Borrador'}</p>
      `,
      buttons: ['Entendido'],
      cssClass: 'alerta-duplicada'
    });
    await alert.present();
  }

  /** Muestra alerta cuando el contenido es idéntico pero con diferente nombre */
  private async mostrarAlertaDuplicadaContenido(rubricaExistente: RubricaDefinicion): Promise<void> {
    this.guardando = false;

    const alert = await this.alertCtrl.create({
      header: 'Contenido duplicado',
      subHeader: 'Ya existe una rúbrica con el mismo contenido',
      message: `
        <div class="duplicado-contenido">
          <p><ion-icon name="warning-outline"></ion-icon> El contenido de esta rúbrica es <strong>idéntico</strong> a una existente:</p>
          <div class="rubrica-existente-info">
            <p><strong>Nombre:</strong> ${rubricaExistente.nombre}</p>
            <p><strong>Código:</strong> <code>${rubricaExistente.codigo || 'N/A'}</code></p>
            <p><strong>Tipo:</strong> ${rubricaExistente.tipoRubrica === 'PG' ? 'Grupal' : 'Individual'} - ${rubricaExistente.tipoEntrega}</p>
            <p><strong>Estado:</strong> ${rubricaExistente.estado === 'publicada' ? '✅ Publicada' : '📝 Borrador'}</p>
          </div>
          <hr>
          <p class="nota">Solo difiere el nombre. Considere usar la rúbrica existente o modificar el contenido.</p>
        </div>
      `,
      buttons: ['Entendido'],
      cssClass: 'alerta-duplicada-contenido'
    });
    await alert.present();
  }

  /** Muestra modal de confirmación para guardar nueva versión */
  private async confirmarNuevaVersion(
    analisis: ReturnType<typeof this.dataService.analizarRubricaParaGuardado>,
    estadoNuevo: EstadoRubrica
  ): Promise<{ guardar: boolean; usarNombreVersionado: boolean }> {
    return new Promise(async (resolve) => {
      const rubricaExistente = analisis.rubricaExistente!;
      const diferencias: string[] = analisis.comparacion?.diferencias || [];

      // Construir lista de diferencias para mostrar
      const listaDiferencias = diferencias.length <= 5
        ? diferencias.map((d: string) => `<li>${d}</li>`).join('')
        : diferencias.slice(0, 4).map((d: string) => `<li>${d}</li>`).join('') +
          `<li><em>...y ${diferencias.length - 4} diferencias más</em></li>`;

      const estadoTexto = estadoNuevo === 'publicada' ? 'Publicada (activa)' : 'Borrador';

      const alert = await this.alertCtrl.create({
        header: 'Nueva versión detectada',
        subHeader: `Se encontró una rúbrica existente con nombre similar`,
        message: `
          <div class="version-modal-content">
            <p><strong>Rúbrica existente:</strong> ${rubricaExistente.nombre}</p>
            <p><strong>Versión actual:</strong> v${rubricaExistente.version || 1} (${rubricaExistente.estado || 'borrador'})</p>
            <hr>
            <p><strong>Diferencias encontradas:</strong></p>
            <ul class="diferencias-lista">${listaDiferencias}</ul>
            <hr>
            <p><strong>Nueva versión:</strong> v${analisis.siguienteVersion}</p>
            <p><strong>Estado:</strong> ${estadoTexto}</p>
          </div>
        `,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve({ guardar: false, usarNombreVersionado: false })
          },
          {
            text: 'Guardar como nueva versión',
            handler: () => resolve({ guardar: true, usarNombreVersionado: true })
          }
        ],
        cssClass: 'alerta-nueva-version'
      });
      await alert.present();
    });
  }

  /** Construye el objeto RubricaDefinicion desde el formulario */
  private construirRubrica(estado: EstadoRubrica): RubricaDefinicion {
    const cursoData = this.cursosDisponibles.find(c => c.codigo === this.cursoSeleccionado);

    const criteriosRubrica: CriterioRubrica[] = this.criterios.map(c => ({
      titulo: c.titulo,
      peso: c.peso,
      pesoMaximo: c.peso,
      nivelesDetalle: c.niveles.map(n => ({
        titulo: n.titulo,
        descripcion: n.descripcion,
        puntos: n.puntosMin === n.puntosMax ? `${n.puntosMin}` : `${n.puntosMin}-${n.puntosMax}`,
        puntosMin: n.puntosMin,
        puntosMax: n.puntosMax,
        color: this.obtenerColorNivel(n.titulo)
      }))
    }));

    // Actualizar escala según puntuación total
    this.actualizarEscalaCalificacion();

    const rubrica: RubricaDefinicion = {
      id: this.rubricaExistente?.id || this.generarIdUnico(),
      nombre: this.nombreRubrica,
      descripcion: cursoData?.nombre || this.cursoSeleccionado,
      criterios: criteriosRubrica,
      puntuacionTotal: this.puntuacionTotal,
      escalaCalificacion: this.escalaCalificacion,
      cursosCodigos: [this.cursoSeleccionado],
      cursoAsociado: cursoData?.nombre || this.cursoSeleccionado,
      tipoRubrica: this.tipoRubrica,
      tipoEntrega: this.tipoEntrega,
      fechaCreacion: this.rubricaExistente?.fechaCreacion || new Date(),
      fechaModificacion: new Date(),
      estado,
      activa: this.rubricaActiva,
      // Preservar código y versión si es edición de rúbrica existente
      ...(this.rubricaExistente?.codigo && {
        codigo: this.rubricaExistente.codigo,
        version: this.rubricaExistente.version,
        timestamp: this.rubricaExistente.timestamp
      })
    };

    return rubrica;
  }

  /** Actualiza la escala de calificación según puntuación total */
  private actualizarEscalaCalificacion(): void {
    const total = this.puntuacionTotal;
    this.escalaCalificacion = [
      { min: 0, max: Math.round(total * 0.29), rango: `0-${Math.round(total * 0.29)}`, nivel: 'Insuficiente', descripcion: 'Requiere reelaboración significativa' },
      { min: Math.round(total * 0.30), max: Math.round(total * 0.49), rango: `${Math.round(total * 0.30)}-${Math.round(total * 0.49)}`, nivel: 'Aceptable', descripcion: 'Cumple requisitos mínimos pero requiere mejoras' },
      { min: Math.round(total * 0.50), max: Math.round(total * 0.74), rango: `${Math.round(total * 0.50)}-${Math.round(total * 0.74)}`, nivel: 'Bueno', descripcion: 'Cumple con lo esperado con buen nivel' },
      { min: Math.round(total * 0.75), max: total, rango: `${Math.round(total * 0.75)}-${total}`, nivel: 'Excelente', descripcion: 'Supera expectativas, alta calidad' }
    ];
  }

  /** Genera un ID único */
  private generarIdUnico(): string {
    return `rubrica_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** Obtiene color según el título del nivel */
  private obtenerColorNivel(titulo: string): string {
    const tituloLower = titulo.toLowerCase();
    if (tituloLower.includes('excelente')) return '#4caf50';
    if (tituloLower.includes('bueno')) return '#8bc34a';
    if (tituloLower.includes('aceptable')) return '#ff9800';
    if (tituloLower.includes('insuficiente')) return '#f44336';
    return '#9e9e9e';
  }

  /** Muestra alerta con errores de validación */
  private async mostrarAlertaErrores(errores: string[]): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Errores de validación',
      message: `<ul>${errores.map(e => `<li>${e}</li>`).join('')}</ul>`,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  /** Muestra toast */
  private async mostrarToast(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /** Cierra el modal o emite evento cancelado */
  async cerrar(): Promise<void> {
    const hayCambios = this.criterios.some(c => c.titulo.trim() !== '');

    if (hayCambios) {
      const alert = await this.alertCtrl.create({
        header: 'Descartar cambios',
        message: '¿Desea salir sin guardar? Los cambios se perderán.',
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Salir',
            role: 'destructive',
            handler: () => {
              if (this.modoInline) {
                this.cancelado.emit();
              } else {
                this.modalCtrl.dismiss({ guardado: false });
              }
            }
          }
        ]
      });
      await alert.present();
    } else {
      if (this.modoInline) {
        this.cancelado.emit();
      } else {
        await this.modalCtrl.dismiss({ guardado: false });
      }
    }
  }
}
