import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonLabel,
  IonChip,
  IonSegment,
  IonSegmentButton,
  IonFab,
  IonFabButton,
  IonFabList,
  AlertController,
  LoadingController,
  ModalController,
  ViewWillEnter,
  ViewWillLeave
} from '@ionic/angular/standalone';
import { ExportService } from '../../services/export.service';
import { DataService } from '../../services/data.service';
import { ToastService } from '../../services/toast.service';
import { RubricaDefinicion } from '../../models';
import { EvaluacionRubricaComponent } from '../../components/evaluacion-rubrica/evaluacion-rubrica.component';
import { RubricaEditorComponent } from '../../components/rubrica-editor/rubrica-editor.component';
import { RubricaVersionHistoryComponent } from '../../components/rubrica-version-history/rubrica-version-history.component';
import { addIcons } from 'ionicons';
import {
  // Iconos filled
  phonePortrait,
  documentText,
  cloudUpload,
  closeCircle,
  addCircle,
  close,
  save,
  calendar,
  pencil,
  trash,
  informationCircle,
  school,
  library,
  checkbox,
  list,
  trophy,
  clipboard,
  gitBranch,
  copy,
  person,
  people,
  add,
  removeCircle,
  download,
  brush,
  create,
  construct,
  ellipse,
  checkmarkCircle,
} from 'ionicons/icons';

@Component({
  selector: 'app-rubricas',
  templateUrl: './rubricas.page.html',
  styleUrls: ['./rubricas.page.scss'],
  standalone: true,
  imports: [IonFabList,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonFab,
    IonFabButton,
    IonChip,
    CommonModule,
    FormsModule,
    RubricaEditorComponent,
    RubricaVersionHistoryComponent
  ]
})
export class RubricasPage implements ViewWillEnter, ViewWillLeave {
  private exportService = inject(ExportService);
  private dataService = inject(DataService);
  private alertController = inject(AlertController);
  private toastService = inject(ToastService);
  private loadingController = inject(LoadingController);
  private modalController = inject(ModalController);

  /** Referencia al input de archivo para importación directa */
  @ViewChild('rubricaFileInput') rubricaFileInput!: ElementRef<HTMLInputElement>;

  /** Lista de rúbricas disponibles */
  rubricas: RubricaDefinicion[] = [];
  /** Rúbrica actualmente seleccionada para mostrar detalle */
  rubricaSeleccionada: RubricaDefinicion | null = null;
  /** Indica si está en modo selección de tipo de creación */
  modoSeleccionCrear = false;
  /** Indica si el texto informativo está expandido */
  infoExpanded = false;
  /** Indica si está en modo edición (importar archivo) */
  modoEdicion = false;
  /** Indica si está en modo creación (formulario inline) */
  modoCreacion = false;
  /** Tab activo en el panel de detalle ('detalle' | 'historial') */
  tabActivo: 'detalle' | 'historial' = 'detalle';
  /** Código de categoría para el historial de versiones */
  codigoCategoriaHistorial: string = '';
  /** Rúbrica en edición para el formulario inline */
  rubricaEnEdicion: RubricaDefinicion | null = null;
  /** Nombre del archivo de rúbrica cargado */
  rubricaFileName = '';
  /** Rúbrica cargada desde archivo pendiente de guardar */
  rubricaCargada: RubricaDefinicion | null = null;
  /** Cursos disponibles para asociar rúbricas */
  cursosDisponibles: Array<{ codigo: string; nombre: string; titulo: string }> = [];

  /** Columna actual de ordenamiento */
  columnaOrdenamiento: 'nombre' | 'codigo' | 'curso' | 'entrega' | null = null;
  /** Dirección del ordenamiento */
  direccionOrdenamiento: 'asc' | 'desc' = 'asc';

  /** Orden de entregas para ordenamiento */
  private readonly ORDEN_ENTREGAS: Record<string, number> = {
    'E1': 1, 'E2': 2, 'EF': 3
  };

  /** Getter que devuelve las rúbricas ordenadas */
  get rubricasOrdenadas(): RubricaDefinicion[] {
    if (!this.columnaOrdenamiento) {
      return this.rubricas;
    }

    return [...this.rubricas].sort((a, b) => {
      let comparacion = 0;

      switch (this.columnaOrdenamiento) {
        case 'entrega':
          // Ordenar por: Curso -> Tipo (PG/PI) -> Entrega (E1, E2, EF)
          const cursoA = a.cursosCodigos?.[0] || '';
          const cursoB = b.cursosCodigos?.[0] || '';
          comparacion = cursoA.localeCompare(cursoB);

          if (comparacion === 0) {
            // Mismo curso, ordenar por tipo (PG primero, luego PI)
            const tipoA = a.tipoRubrica === 'PG' ? 0 : 1;
            const tipoB = b.tipoRubrica === 'PG' ? 0 : 1;
            comparacion = tipoA - tipoB;
          }

          if (comparacion === 0) {
            // Mismo tipo, ordenar por entrega
            const ordenA = this.ORDEN_ENTREGAS[a.tipoEntrega || 'E1'] || 99;
            const ordenB = this.ORDEN_ENTREGAS[b.tipoEntrega || 'E1'] || 99;
            comparacion = ordenA - ordenB;
          }
          break;

        case 'nombre':
          comparacion = (a.nombre || '').localeCompare(b.nombre || '');
          break;

        case 'codigo':
          comparacion = (a.codigo || '').localeCompare(b.codigo || '');
          break;

        case 'curso':
          const nombreCursoA = this.obtenerNombreCurso(a);
          const nombreCursoB = this.obtenerNombreCurso(b);
          comparacion = nombreCursoA.localeCompare(nombreCursoB);
          break;
      }

      return this.direccionOrdenamiento === 'asc' ? comparacion : -comparacion;
    });
  }

  /** Cambia el ordenamiento al hacer clic en una cabecera */
  ordenarPor(columna: 'nombre' | 'codigo' | 'curso' | 'entrega'): void {
    if (this.columnaOrdenamiento === columna) {
      // Si ya está ordenado por esta columna, cambiar dirección o quitar ordenamiento
      if (this.direccionOrdenamiento === 'asc') {
        this.direccionOrdenamiento = 'desc';
      } else {
        // Quitar ordenamiento
        this.columnaOrdenamiento = null;
        this.direccionOrdenamiento = 'asc';
      }
    } else {
      // Nueva columna de ordenamiento
      this.columnaOrdenamiento = columna;
      this.direccionOrdenamiento = 'asc';
    }
  }

  /** Obtiene el icono de ordenamiento para una columna */
  getIconoOrdenamiento(columna: string): string {
    if (this.columnaOrdenamiento !== columna) {
      return '';
    }
    return this.direccionOrdenamiento === 'asc' ? '↑' : '↓';
  }

  /** Indica si hay contenido activo que requiere contraer la lista de rúbricas */
  get tieneContenidoActivo(): boolean {
    return this.rubricaSeleccionada !== null ||
      this.modoEdicion ||
      this.modoCreacion ||
      this.rubricaCargada !== null;
  }

  /** Obtiene las versiones de una rúbrica por su código base */
  obtenerVersionesRubrica(rubrica: RubricaDefinicion): RubricaDefinicion[] {
    if (!rubrica.codigo) return [rubrica];

    // Extraer código base (sin versión)
    const codigoBase = rubrica.codigo.replace(/V\d+$/, '');

    return this.rubricas
      .filter(r => {
        if (!r.codigo) return false;
        // Incluir si es el código base exacto O si empieza con codigoBase + 'V'
        return r.codigo === codigoBase || r.codigo.startsWith(codigoBase + 'V');
      })
      .sort((a, b) => (b.version || 0) - (a.version || 0)); // Orden descendente por versión
  }

  // Imports de iconos
  constructor() {
    addIcons({
      // Filled icons
      phonePortrait, documentText, cloudUpload, closeCircle, addCircle, close, save,
      calendar, pencil, trash, informationCircle, school, library, checkbox, list, trophy, clipboard, create,
      download,
      brush,
      construct,
      ellipse,
      gitBranch, copy, people, person, add, checkmarkCircle
    });
  }

  ionViewWillEnter() {
    this.cargarRubricas();
    this.cargarCursosDisponibles();
    // Restaurar estado de modoSeleccionCrear desde UIState
    const uiState = this.dataService.getUIState();
    if (uiState.rubricasModoSeleccionCrear) {
      this.modoSeleccionCrear = true;
    }
  }

  /**
   * Ciclo de vida Ionic: se ejecuta cuando la vista está a punto de salir.
   * Ideal para limpiar recursos que no deben estar activos cuando la página no está visible.
   * @see https://ionicframework.com/docs/angular/lifecycle
   */
  ionViewWillLeave() {
    // Cerrar paneles expandidos al salir de la vista
    this.infoExpanded = false;
  }

  cargarRubricas() {
    // Las rúbricas se cargan directamente del servicio
    this.rubricas = this.dataService.obtenerRubricasArray();
  }

  cargarCursosDisponibles() {
    const uiState = this.dataService.getUIState();
    const cursos = this.dataService.getCursos();

    // Agrupar por nombre de curso para evitar duplicados por grupo
    const cursosUnicos = new Map<string, { codigo: string; nombre: string; titulo: string; codigos: string[] }>();

    Object.keys(cursos).forEach(codigo => {
      const metadata = uiState.courseStates?.[codigo]?.metadata;
      const nombre = metadata?.nombre || codigo;

      if (cursosUnicos.has(nombre)) {
        // Agregar código a la lista de códigos del curso existente
        cursosUnicos.get(nombre)!.codigos.push(codigo);
      } else {
        // Nuevo curso único
        cursosUnicos.set(nombre, {
          codigo: codigo, // Usar el primer código como referencia
          nombre: nombre,
          titulo: nombre,
          codigos: [codigo]
        });
      }
    });

    this.cursosDisponibles = Array.from(cursosUnicos.values()).map(c => ({
      codigo: c.codigo,
      nombre: c.nombre,
      titulo: c.titulo
    }));
  }

  /**
   * Obtiene el nombre del curso asociado a la rúbrica.
   * Como la rúbrica aplica al curso en general (no a grupos específicos),
   * solo muestra el nombre base del curso sin indicar grupos individuales.
   */
  obtenerNombreCurso(rubrica: RubricaDefinicion): string {
    // Primero intentar obtener el nombre desde cursoAsociado
    if (rubrica.cursoAsociado) {
      return rubrica.cursoAsociado;
    }

    // Si no hay cursoAsociado, usar descripcion
    if (rubrica.descripcion) {
      return rubrica.descripcion;
    }

    // Fallback: buscar en cursosCodigos
    if (!rubrica.cursosCodigos || rubrica.cursosCodigos.length === 0) {
      return '—';
    }

    // Buscar el primer curso para obtener el nombre base
    const primerCodigo = rubrica.cursosCodigos[0];
    const curso = this.cursosDisponibles.find(c => c.codigo === primerCodigo);

    if (curso && curso.nombre) {
      return curso.nombre;
    }

    return primerCodigo;
  }

  /**
   * Obtiene el código base de la rúbrica sin la versión.
   * Ejemplo: "RGE1-EPMV2" → "RGE1-EPM"
   */
  obtenerCodigoBase(rubrica: RubricaDefinicion): string {
    if (!rubrica.codigo) {
      return rubrica.id || '—';
    }
    // Remover la versión (V1, V2, etc.) del final
    return rubrica.codigo.replace(/V\d+$/, '');
  }

  /**
   * Activa o desactiva una versión de rúbrica.
   * Al activar, muestra selector de versiones disponibles.
   * Si la rúbrica está en borrador, pregunta si desea publicarla primero.
   * @param rubrica - Rúbrica a activar/desactivar
   * @param event - Evento del click (para stopPropagation)
   */
  async toggleActivaRubrica(rubrica: RubricaDefinicion, event?: Event): Promise<void> {
    event?.stopPropagation();

    const estaActiva = rubrica.activa !== false;
    const esBorrador = rubrica.estado === 'borrador';

    // Si ya está activa, preguntar si quiere desactivar
    if (estaActiva) {
      const alert = await this.alertController.create({
        header: '⚠️ Desactivar Rúbrica',
        message: `¿Deseas desactivar <strong>${rubrica.codigo}</strong>?<br><br>
                  <small>La rúbrica quedará inactiva y no podrá ser usada para evaluaciones.</small>`,
        cssClass: 'premium-alert premium-alert--warning',
        buttons: [
          {
            text: '<ion-icon name="close-circle"></ion-icon> Cancelar',
            role: 'cancel'
          },
          {
            text: '<ion-icon name="remove-circle"></ion-icon> Desactivar',
            handler: async () => {
              rubrica.activa = false;
              await this.dataService.guardarRubrica(rubrica);
              this.cargarRubricas();
              await this.mostrarToast(`Rúbrica ${rubrica.codigo} desactivada`, 'warning');
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Si está en borrador, no se puede activar directamente
    if (esBorrador) {
      const alert = await this.alertController.create({
        header: '📝 Rúbrica en Borrador',
        message: `<strong>${rubrica.codigo}</strong> está en estado <em>Borrador</em>.<br><br>
                  Solo se pueden activar rúbricas <strong>publicadas</strong>.<br><br>
                  ¿Deseas publicar esta rúbrica para poder activarla?`,
        cssClass: 'alert-info',
        buttons: [
          {
            text: 'No',
            role: 'cancel'
          },
          {
            text: 'Sí, Publicar',
            handler: async () => {
              // Cambiar estado a publicada
              rubrica.estado = 'publicada';
              rubrica.fechaModificacion = new Date();
              await this.dataService.guardarRubrica(rubrica);
              this.cargarRubricas();
              await this.mostrarToast(`Rúbrica ${rubrica.codigo} publicada. Ahora puede activarla.`, 'success');
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Si está inactiva y publicada, mostrar selector de versiones para activar
    await this.mostrarSelectorVersiones(rubrica);
  }

  /**
   * Muestra un selector con todas las versiones disponibles para activar
   */
  private async mostrarSelectorVersiones(rubrica: RubricaDefinicion): Promise<void> {
    const versiones = this.obtenerVersionesRubrica(rubrica);

    // Si solo hay una versión, activar directamente
    if (versiones.length <= 1) {
      await this.activarVersionDirectamente(rubrica);
      return;
    }

    // Encontrar la versión actualmente activa
    const versionActiva = versiones.find(v => v.activa !== false);

    // Crear inputs de tipo radio para cada versión
    const inputs = versiones.map(v => ({
      type: 'radio' as const,
      label: `v${v.version || 1} - ${v.nombre}${v.activa !== false ? ' (Activa)' : ''}`,
      value: v.id,
      checked: v.id === rubrica.id // Pre-seleccionar la versión clickeada
    }));

    const alert = await this.alertController.create({
      header: '🔄 Activar Versión',
      subHeader: `Código: ${rubrica.codigo?.replace(/V\d+$/, '')}`,
      message: `<small>Selecciona la versión que deseas activar.<br>Las demás versiones se desactivarán automáticamente.</small>`,
      cssClass: 'alert-selector-version',
      inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Activar',
          handler: async (versionId: string) => {
            if (!versionId) {
              this.mostrarToast('Selecciona una versión', 'warning');
              return false;
            }
            await this.dataService.activarVersionRubrica(versionId);
            this.cargarRubricas();
            const versionActivada = versiones.find(v => v.id === versionId);
            await this.mostrarToast(`✅ Versión v${versionActivada?.version || 1} activada`, 'success');
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Activa una versión directamente sin mostrar selector
   */
  private async activarVersionDirectamente(rubrica: RubricaDefinicion): Promise<void> {
    const alert = await this.alertController.create({
      header: '🔄 Activar Versión',
      message: `¿Deseas activar <strong>${rubrica.codigo}</strong>?<br><br>
                <small>Se desactivarán las demás versiones del mismo tipo automáticamente.</small>`,
      cssClass: 'alert-confirm',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Activar',
          handler: async () => {
            await this.dataService.activarVersionRubrica(rubrica.id);
            this.cargarRubricas();
            await this.mostrarToast(`✅ Versión ${rubrica.codigo} activada`, 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async mostrarVistaPrevia(rubrica: RubricaDefinicion) {
    const alert = await this.alertController.create({
      header: '📋 Vista Previa de Rúbrica',
      message: `<strong>Título:</strong> ${rubrica.nombre}<br><strong>Puntuación Total:</strong> ${rubrica.puntuacionTotal || 'N/A'}<br><strong>Criterios:</strong> ${rubrica.criterios.length}<br><strong>Escalas:</strong> ${rubrica.escalaCalificacion?.length || 0}`,
      cssClass: 'alert-info',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Configurar y Guardar',
          handler: () => {
            this.configurarRubrica(rubrica);
          }
        }
      ]
    });

    await alert.present();
  }

  async configurarRubrica(rubrica: RubricaDefinicion) {
    const alert = await this.alertController.create({
      header: '⚙️ Configurar Rúbrica',
      message: 'Asocia la rúbrica con cursos y especifica el tipo de entrega:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega 1 (E1)',
          value: 'E1',
          checked: true
        },
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega 2 (E2)',
          value: 'E2'
        },
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega Final (EF)',
          value: 'EF'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Seleccionar Cursos',
          handler: (data) => {
            this.seleccionarCursos(rubrica, data);
          }
        }
      ]
    });

    await alert.present();
  }

  async seleccionarCursos(rubrica: RubricaDefinicion, tipoEntrega: string) {
    const inputs = this.cursosDisponibles.map(curso => ({
      name: 'cursos',
      type: 'checkbox' as const,
      label: curso.titulo,
      value: curso.codigo
    }));

    const alert = await this.alertController.create({
      header: '📚 Seleccionar Cursos',
      message: `Selecciona los cursos para la rúbrica "${rubrica.nombre}" - ${tipoEntrega}:`,
      cssClass: 'alert-confirm',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: (cursosSeleccionados) => {
            rubrica.cursosCodigos = cursosSeleccionados || [];
            rubrica.tipoEntrega = tipoEntrega as 'E1' | 'E2' | 'EF';
            this.guardarRubrica(rubrica);
          }
        }
      ]
    });

    await alert.present();
  }

  async guardarRubrica(rubrica: RubricaDefinicion) {
    try {
      // Validar que tenga cursos asignados antes de guardar
      if (!rubrica.cursosCodigos || rubrica.cursosCodigos.length === 0) {
        await this.mostrarToast('No se puede guardar una rúbrica sin cursos asignados', 'danger');
        return;
      }

      await this.dataService.guardarRubrica(rubrica);
      this.cargarRubricas();
      this.modoEdicion = false; // Salir del modo edición después de guardar
      this.desvincularArchivoRubrica(); // Limpiar archivo cargado
      await this.mostrarToast('Rúbrica guardada exitosamente', 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al guardar la rúbrica: ${error.message} `, 'danger');
    }
  }

  async confirmarEliminarRubrica(rubrica: RubricaDefinicion, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar la rúbrica "${rubrica.nombre}"?<br><br><strong>Información:</strong><br>• Tipo: ${rubrica.tipoRubrica === 'PG' ? 'Grupal' : 'Individual'}<br>• Entrega: ${rubrica.tipoEntrega || 'No especificada'}<br>• Puntos totales: ${rubrica.puntuacionTotal}<br>• Criterios: ${rubrica.criterios.length}<br><br>Esta acción no se puede deshacer.`,
      cssClass: 'premium-alert premium-alert--danger',
      buttons: [
        {
          text: '<ion-icon name="close-circle"></ion-icon> Cancelar',
          role: 'cancel'
        },
        {
          text: '<ion-icon name="trash"></ion-icon> Eliminar',
          role: 'destructive',
          handler: async () => {
            if (rubrica.id) {
              await this.dataService.eliminarRubrica(rubrica.id);

              // Si la rúbrica eliminada era la seleccionada, limpiar selección
              if (this.rubricaSeleccionada?.id === rubrica.id) {
                this.rubricaSeleccionada = null;
                this.modoEdicion = false;
              }

              this.cargarRubricas();
              await this.mostrarToast('Rúbrica eliminada', 'success');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async usarRubrica(rubrica: RubricaDefinicion) {
    const alert = await this.alertController.create({
      header: '📝 Evaluar con Rúbrica',
      message: 'Ingresa los datos del estudiante a evaluar:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          name: 'estudianteId',
          type: 'text',
          placeholder: 'ID del estudiante'
        },
        {
          name: 'nombreEstudiante',
          type: 'text',
          placeholder: 'Nombre completo del estudiante'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Evaluar',
          handler: (data) => {
            if (data.estudianteId && data.nombreEstudiante) {
              this.abrirEvaluacion(rubrica, data.estudianteId, data.nombreEstudiante);
              return true;
            } else {
              this.mostrarToast('Debes completar todos los campos', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async abrirEvaluacion(rubrica: RubricaDefinicion, estudianteId: string, nombreEstudiante: string) {
    const modal = await this.modalController.create({
      component: EvaluacionRubricaComponent,
      componentProps: {
        rubrica: rubrica,
        estudianteId: estudianteId,
        nombreEstudiante: nombreEstudiante
      },
      backdropDismiss: false
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.mostrarToast('Evaluación completada exitosamente', 'success');
      }
    });

    await modal.present();
  }

  /**
   * Exporta una rúbrica al formato seleccionado
   * @param rubrica - Rúbrica a exportar
   * @param formato - 'json' | 'txt' (default: 'json')
   */
  async exportarRubrica(rubrica: RubricaDefinicion, formato: 'json' | 'txt' = 'json') {
    try {
      if (formato === 'json') {
        this.dataService.descargarRubricaComoJSON(rubrica);
      } else {
        const contenido = this.generarTextoRubrica(rubrica);
        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${rubrica.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      await this.mostrarToast(`Rúbrica exportada como ${formato.toUpperCase()}`, 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al exportar: ${error.message}`, 'danger');
    }
  }

  /**
   * Muestra opciones de exportación para una rúbrica
   */
  async mostrarOpcionesExportacion(rubrica: RubricaDefinicion) {
    const alert = await this.alertController.create({
      header: 'Exportar Rúbrica',
      message: 'Selecciona el formato de exportación:',
      buttons: [
        {
          text: 'JSON (Recomendado)',
          handler: () => this.exportarRubrica(rubrica, 'json')
        },
        {
          text: 'TXT (Legacy)',
          handler: () => this.exportarRubrica(rubrica, 'txt')
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  private generarTextoRubrica(rubrica: RubricaDefinicion): string {
    let texto = `=== ${rubrica.nombre.toUpperCase()} ===\n\n`;

    // Incluir tipo de rúbrica si existe
    if (rubrica.tipoRubrica) {
      const tipoTexto = rubrica.tipoRubrica === 'PG' ? 'Grupal' : 'Individual';
      texto += `TIPO: ${tipoTexto}\n`;
    }

    texto += `PUNTUACIÓN_TOTAL: ${rubrica.puntuacionTotal}\n\n`;

    texto += 'ESCALA_CALIFICACION:\n';
    rubrica.escalaCalificacion?.forEach(escala => {
      const rango = escala.rango || `${escala.min}-${escala.max}`;
      texto += `${rango}|${escala.descripcion}\n`;
    });

    texto += '\n---\n\n';

    rubrica.criterios.forEach((criterio, index) => {
      texto += `CRITERIO_${index + 1}: ${criterio.titulo}\n`;
      texto += `PESO: ${criterio.peso || criterio.pesoMaximo || 0}\n`;
      texto += `NIVELES: ${criterio.nivelesDetalle.length}\n\n`;

      criterio.nivelesDetalle.forEach((nivel, nivelIndex) => {
        texto += `NIVEL_${nivelIndex + 1}:\n`;
        texto += `PUNTOS: ${nivel.puntos}\n`;
        texto += `TITULO: ${nivel.titulo}\n`;
        texto += `DESCRIPCION: ${nivel.descripcion}\n\n`;
      });

      texto += '---\n\n';
    });

    texto += '=== FIN DE RÚBRICA ===\n';
    return texto;
  }

  async exportarRubricas() {
    try {
      const loading = await this.loadingController.create({
        message: 'Exportando rúbricas...',
        spinner: 'dots'
      });
      await loading.present();

      await this.exportService.exportarRubricas(this.rubricas);
      await loading.dismiss();
      await this.mostrarToast('Rúbricas exportadas exitosamente', 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al exportar rúbricas: ${error.message}`, 'danger');
    }
  }

  async exportarDatosCursos() {
    if (this.cursosDisponibles.length === 0) {
      await this.mostrarToast('No hay cursos disponibles para exportar', 'warning');
      return;
    }

    const inputs = this.cursosDisponibles.map(curso => ({
      name: 'cursos',
      type: 'radio' as const,
      label: curso.titulo,
      value: curso.codigo
    }));

    inputs.unshift({
      name: 'cursos',
      type: 'radio' as const,
      label: 'Todos los cursos',
      value: 'TODOS'
    });

    const alert = await this.alertController.create({
      header: '📤 Exportar Datos de Cursos',
      message: 'Selecciona qué curso exportar:',
      cssClass: 'alert-confirm',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Exportar',
          handler: async (cursoSeleccionado) => {
            if (cursoSeleccionado) {
              await this.realizarExportacionCurso(cursoSeleccionado);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async realizarExportacionCurso(codigoCurso: string) {
    try {
      const loading = await this.loadingController.create({
        message: codigoCurso === 'TODOS' ? 'Exportando todos los cursos...' : 'Exportando curso...',
        spinner: 'dots'
      });
      await loading.present();

      if (codigoCurso === 'TODOS') {
        await this.exportService.exportarTodosLosCursos();
      } else {
        await this.exportService.exportarDatosCurso(codigoCurso);
      }

      await loading.dismiss();
      await this.mostrarToast('Datos exportados exitosamente', 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al exportar: ${error.message}`, 'danger');
    }
  }

  private async mostrarAlert(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      cssClass: 'alert-info',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Maneja la selección de archivo de rúbrica .txt
   */
  async onRubricaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.rubricaFileName = file.name;

    // Validar extensión (JSON o TXT)
    const extension = file.name.toLowerCase();
    if (!extension.endsWith('.txt') && !extension.endsWith('.json')) {
      await this.mostrarToast('Solo se permiten archivos .json o .txt', 'warning');
      this.rubricaFileName = '';
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Importando rúbrica...'
    });
    await loading.present();

    try {
      // Usar el nuevo método de DataService para cargar archivo
      const rubrica = await this.dataService.cargarArchivoRubrica(file);

      if (!rubrica) {
        await loading.dismiss();
        await this.mostrarToast('Error al parsear el archivo de rúbrica', 'danger');
        return;
      }

      // Almacenar rúbrica cargada en modo edición
      this.rubricaCargada = rubrica;

      await loading.dismiss();

      // Construir mensaje de confirmación
      let mensajeCarga = `Rúbrica "${rubrica.nombre}"`;

      if (rubrica.tipoRubrica) {
        const tipoTexto = rubrica.tipoRubrica === 'PG' ? 'Grupal' : 'Individual';
        mensajeCarga += ` (${tipoTexto})`;
      }

      if (rubrica.tipoEntrega) {
        mensajeCarga += ` para Entrega ${rubrica.tipoEntrega}`;
      }

      mensajeCarga += ' cargada exitosamente';

      // Validar tipo de rúbrica
      if (!rubrica.tipoRubrica) {
        await this.solicitarTipoRubrica(rubrica);
      }

      // Validar tipo de entrega
      if (!rubrica.tipoEntrega) {
        await this.solicitarTipoEntrega(rubrica);
      }

      await this.mostrarToast(mensajeCarga, 'success');

      // Mostrar rúbrica en el panel derecho (modo vista previa)
      // Solo activar después de todas las validaciones y el toast de éxito
      this.rubricaSeleccionada = rubrica;
      this.modoEdicion = true; // Activar modo edición para mostrar botones Guardar/Cancelar
    } catch (error: any) {
      Logger.error('Error importando rúbrica:', error);
      await loading.dismiss();

      // Mostrar alert con el mensaje de error específico
      const alert = await this.alertController.create({
        header: '❌ Error al Importar Rúbrica',
        message: error.message || 'Error desconocido al importar la rúbrica',
        cssClass: 'alert-danger',
        buttons: ['Entendido']
      });
      await alert.present();
      this.desvincularArchivoRubrica();
    }

    // Limpiar el input
    input.value = '';
  }

  desvincularArchivoRubrica() {
    this.rubricaFileName = '';
    this.rubricaCargada = null;
  }

  /**
   * Solicita al usuario que seleccione el tipo de rúbrica (Grupal o Individual)
   */
  async solicitarTipoRubrica(rubrica: RubricaDefinicion): Promise<void> {
    const tipoActual = rubrica.tipoRubrica || 'PG';

    const alert = await this.alertController.create({
      header: '📋 Tipo de Rúbrica',
      message: 'Selecciona el tipo de evaluación para esta rúbrica:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          type: 'radio',
          label: 'Proyecto Grupal (PG)',
          value: 'PG',
          checked: tipoActual === 'PG'
        },
        {
          type: 'radio',
          label: 'Proyecto Individual (PI)',
          value: 'PI',
          checked: tipoActual === 'PI'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            if (!rubrica.tipoRubrica) {
              rubrica.tipoRubrica = 'PG'; // Por defecto si cancela y no tenía tipo
            }
          }
        },
        {
          text: 'Confirmar',
          handler: (tipoSeleccionado: 'PG' | 'PI') => {
            rubrica.tipoRubrica = tipoSeleccionado;
            rubrica.fechaModificacion = new Date();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Solicita al usuario que seleccione el tipo de entrega
   */
  async solicitarTipoEntrega(rubrica: RubricaDefinicion): Promise<void> {
    const tipoActual = rubrica.tipoEntrega || 'E1';

    const alert = await this.alertController.create({
      header: '📦 Tipo de Entrega',
      message: 'Selecciona la entrega a la que corresponde esta rúbrica:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          type: 'radio',
          label: 'Entrega 1 (E1)',
          value: 'E1',
          checked: tipoActual === 'E1'
        },
        {
          type: 'radio',
          label: 'Entrega 2 (E2)',
          value: 'E2',
          checked: tipoActual === 'E2'
        },
        {
          type: 'radio',
          label: 'Entrega Final (EF)',
          value: 'EF',
          checked: tipoActual === 'EF'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            if (!rubrica.tipoEntrega) {
              rubrica.tipoEntrega = 'E1'; // Por defecto si cancela y no tenía tipo
            }
          }
        },
        {
          text: 'Confirmar',
          handler: (tipoSeleccionado: string) => {
            rubrica.tipoEntrega = tipoSeleccionado as 'E1' | 'E2' | 'EF';
            rubrica.fechaModificacion = new Date();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Permite cambiar el tipo de rúbrica de una existente
   */
  async cambiarTipoRubrica(rubrica: RubricaDefinicion): Promise<void> {
    await this.solicitarTipoRubrica(rubrica);
    await this.dataService.guardarRubrica(rubrica);
    this.cargarRubricas();
  }

  /**
   * Obtiene el nombre del curso asociado a la rúbrica
   */
  obtenerNombreCursoAsociado(rubrica: RubricaDefinicion): string {
    if (!rubrica.cursosCodigos || rubrica.cursosCodigos.length === 0) {
      return 'Sin curso asignado';
    }

    const nombresCursos = rubrica.cursosCodigos.map(codigo => {
      const curso = this.cursosDisponibles.find(c => c.codigo === codigo);
      return curso ? curso.nombre : codigo;
    });

    return nombresCursos.join(', ');
  }

  /**
   * Verifica si un curso está asignado a la rúbrica
   */
  isCursoAsignado(codigoCurso: string, rubrica: RubricaDefinicion): boolean {
    return rubrica.cursosCodigos?.includes(codigoCurso) || false;
  }

  /**
   * Obtiene la lista de cursos asignados a una rúbrica
   */
  getCursosAsignados(rubrica: RubricaDefinicion | null): any[] {
    if (!rubrica) return [];
    return this.cursosDisponibles.filter(curso =>
      rubrica.cursosCodigos?.includes(curso.codigo)
    );
  }

  /**
   * Toggle asignación de curso a la rúbrica
   */
  async toggleCursoAsignacion(codigoCurso: string, rubrica: RubricaDefinicion, event: any): Promise<void> {
    const isChecked = event.detail.checked;

    // Validar que la rúbrica tenga tipo y entrega definidos
    if (!rubrica.tipoRubrica) {
      await this.mostrarToast('La rúbrica debe tener un tipo definido (Grupal o Individual)', 'warning');
      event.target.checked = false;
      return;
    }

    if (!rubrica.tipoEntrega) {
      await this.mostrarToast('La rúbrica debe tener una entrega definida (E1, E2 o EF)', 'warning');
      event.target.checked = false;
      return;
    }

    if (!rubrica.cursosCodigos) {
      rubrica.cursosCodigos = [];
    }

    // Obtener nombre del curso para mensajes más claros
    const curso = this.cursosDisponibles.find(c => c.codigo === codigoCurso);
    const nombreCurso = curso?.nombre || codigoCurso;
    const tipoTexto = rubrica.tipoRubrica === 'PG' ? 'Grupal' : 'Individual';

    if (isChecked) {
      // Agregar curso si no está
      if (!rubrica.cursosCodigos.includes(codigoCurso)) {
        rubrica.cursosCodigos.push(codigoCurso);

        // Guardar y asociar
        rubrica.fechaModificacion = new Date();
        await this.dataService.guardarRubrica(rubrica);
        await this.dataService.asociarRubricaConCursos(
          rubrica.id,
          rubrica.cursosCodigos,
          rubrica.tipoEntrega
        );

        await this.mostrarToast(
          `Rúbrica ${tipoTexto} (${rubrica.tipoEntrega}) vinculada a "${nombreCurso}"`,
          'success'
        );
      }
    } else {
      // Remover curso
      rubrica.cursosCodigos = rubrica.cursosCodigos.filter(c => c !== codigoCurso);

      // Desvincular del UIState
      await this.desvincularRubricaDeCurso(rubrica, codigoCurso);

      // Guardar cambios
      rubrica.fechaModificacion = new Date();
      await this.dataService.guardarRubrica(rubrica);

      // Si aún tiene cursos, actualizar asociación
      if (rubrica.cursosCodigos.length > 0) {
        await this.dataService.asociarRubricaConCursos(
          rubrica.id,
          rubrica.cursosCodigos,
          rubrica.tipoEntrega
        );
      }

      await this.mostrarToast(
        `Rúbrica ${tipoTexto} (${rubrica.tipoEntrega}) desvinculada de "${nombreCurso}"`,
        'success'
      );
    }

    this.cargarRubricas();
  }

  /**
   * Desvincula una rúbrica de un curso en el UIState
   */
  private async desvincularRubricaDeCurso(rubrica: RubricaDefinicion, codigoCurso: string): Promise<void> {
    const uiState = this.dataService.getUIState();

    if (!uiState.courseStates[codigoCurso]?.rubricasAsociadas) {
      return;
    }

    const rubricasAsociadas = uiState.courseStates[codigoCurso].rubricasAsociadas!;

    // Limpiar la asociación según tipo de entrega y tipo de rúbrica
    switch (rubrica.tipoEntrega) {
      case 'E1':
        if (rubrica.tipoRubrica === 'PG' && rubricasAsociadas.entrega1 === rubrica.id) {
          rubricasAsociadas.entrega1 = null;
        } else if (rubrica.tipoRubrica === 'PI' && rubricasAsociadas.entrega1Individual === rubrica.id) {
          rubricasAsociadas.entrega1Individual = null;
        }
        break;
      case 'E2':
        if (rubrica.tipoRubrica === 'PG' && rubricasAsociadas.entrega2 === rubrica.id) {
          rubricasAsociadas.entrega2 = null;
        } else if (rubrica.tipoRubrica === 'PI' && rubricasAsociadas.entrega2Individual === rubrica.id) {
          rubricasAsociadas.entrega2Individual = null;
        }
        break;
      case 'EF':
        if (rubrica.tipoRubrica === 'PG' && rubricasAsociadas.entregaFinal === rubrica.id) {
          rubricasAsociadas.entregaFinal = null;
        } else if (rubrica.tipoRubrica === 'PI' && rubricasAsociadas.entregaFinalIndividual === rubrica.id) {
          rubricasAsociadas.entregaFinalIndividual = null;
        }
        break;
    }

    await this.dataService.updateUIState(uiState);
  }

  /**
   * Lee un archivo de texto y devuelve su contenido
   */
  private leerArchivoTexto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenido = e.target?.result as string;
        resolve(contenido);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'UTF-8');
    });
  }

  // ============= MÉTODOS DE INTERACCIÓN CON RÚBRICAS =============

  seleccionarRubrica(rubrica: RubricaDefinicion) {
    // Toggle: si ya está seleccionada, la oculta; si no, la muestra
    if (this.rubricaSeleccionada?.id === rubrica.id) {
      this.rubricaSeleccionada = null;
      this.codigoCategoriaHistorial = '';
      this.tabActivo = 'detalle';
    } else {
      this.rubricaSeleccionada = rubrica;
      // Extraer código de categoría para el historial
      this.codigoCategoriaHistorial = rubrica.codigo?.replace(/V\d+$/, '') || '';
      this.tabActivo = 'detalle';
    }
  }

  /**
   * Activa el modo de selección de tipo de creación en el área principal
   */
  mostrarOpcionesCrear(): void {
    this.modoSeleccionCrear = true;
    this.modoEdicion = false;
    this.modoCreacion = false;
    this.rubricaSeleccionada = null;
    // Persistir estado en UIState
    this.dataService.updateUIState({ rubricasModoSeleccionCrear: true });
  }

  /**
   * Toggle para expandir/colapsar el texto informativo
   */
  toggleInfo(): void {
    this.infoExpanded = !this.infoExpanded;
  }

  /**
   * Cancela el modo de selección y vuelve a la lista
   */
  cancelarSeleccionCrear(): void {
    this.modoSeleccionCrear = false;
    // Limpiar estado en UIState
    this.dataService.updateUIState({ rubricasModoSeleccionCrear: false });
  }

  /**
   * Muestra opciones de creación para móvil mediante un alert con botones.
   * Versión optimizada para pantallas pequeñas que evita mostrar el panel desktop.
   */
  async mostrarOpcionesCrearMobile(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Crear Rúbrica',
      message: 'Selecciona cómo deseas crear la rúbrica:',
      cssClass: 'alert-options-crear',
      buttons: [
        {
          text: 'Nueva Rúbrica',
          cssClass: 'alert-button-primary',
          handler: () => {
            this.activarModoCreacion();
          }
        },
        {
          text: 'Importar desde Archivo',
          cssClass: 'alert-button-secondary',
          handler: () => {
            this.activarModoImportar();
          }
        },
        {
          text: 'Basada en Existente',
          cssClass: 'alert-button-secondary',
          handler: () => {
            this.mostrarSelectorRubricaBase();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        }
      ]
    });

    await alert.present();
  }


  /**
   * Activa el modo de creación con formulario inline (desktop)
   */
  activarModoCreacion(rubrica?: RubricaDefinicion): void {
    this.modoSeleccionCrear = false;
    this.modoCreacion = true;
    this.modoEdicion = false;
    this.rubricaEnEdicion = rubrica || null;
    this.rubricaSeleccionada = null;
    // Limpiar estado en UIState ya que pasamos a modo creación
    this.dataService.updateUIState({ rubricasModoSeleccionCrear: false });
  }

  /**
   * Cancela el modo de creación y vuelve a la lista
   */
  cancelarModoCreacion(): void {
    this.modoCreacion = false;
    this.rubricaEnEdicion = null;
  }

  /**
   * Callback cuando se guarda una rúbrica desde el editor inline
   */
  onRubricaGuardada(evento: { guardado: boolean; rubrica?: RubricaDefinicion }): void {
    if (evento.guardado) {
      this.cargarRubricas();
      const estado = evento.rubrica?.estado === 'borrador' ? 'guardada como borrador' : 'publicada';
      this.mostrarToast(`Rúbrica ${estado} exitosamente`, 'success');
    }
    this.cancelarModoCreacion();
  }

  /**
   * Activa el modo de importación abriendo directamente el selector de archivos.
   * Flujo simplificado: elimina el paso intermedio del panel de carga.
   */
  activarModoImportar(): void {
    this.modoSeleccionCrear = false;
    this.infoExpanded = false;
    // Limpiar estado persistido
    this.dataService.updateUIState({ rubricasModoSeleccionCrear: false });

    // Abrir selector de archivos directamente (flujo simplificado)
    // Usar setTimeout para asegurar que el DOM esté actualizado
    setTimeout(() => {
      if (this.rubricaFileInput?.nativeElement) {
        this.rubricaFileInput.nativeElement.click();
      } else {
        // Fallback: activar modoEdicion si el input no está disponible
        this.modoEdicion = true;
      }
    }, 0);
  }

  /**
   * Muestra un diálogo para seleccionar una rúbrica existente como base para crear una nueva.
   * La rúbrica seleccionada se clonará con nuevo ID y sin código (se generará automáticamente).
   */
  async mostrarSelectorRubricaBase(): Promise<void> {
    if (this.rubricas.length === 0) {
      await this.mostrarToast('No hay rúbricas disponibles para usar como base', 'warning');
      return;
    }

    // Agrupar rúbricas por código base para mostrar solo la versión más reciente de cada una
    const rubricasPorCodigoBase = new Map<string, RubricaDefinicion>();
    for (const rubrica of this.rubricas) {
      const codigoBase = rubrica.codigo?.replace(/-?[Vv]\d+$/, '') || rubrica.id;
      const existente = rubricasPorCodigoBase.get(codigoBase);
      if (!existente || (rubrica.version || 1) > (existente.version || 1)) {
        rubricasPorCodigoBase.set(codigoBase, rubrica);
      }
    }

    const rubricasUnicas = Array.from(rubricasPorCodigoBase.values());

    const inputs = rubricasUnicas.map((rubrica, index) => ({
      type: 'radio' as const,
      label: `${rubrica.codigo || rubrica.id} - ${rubrica.nombre}`,
      value: rubrica.id,
      checked: index === 0
    }));

    const alert = await this.alertController.create({
      header: 'Seleccionar Rúbrica Base',
      message: 'Selecciona una rúbrica existente para crear una copia editable:',
      cssClass: 'alert-selector-rubrica-base',
      inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear Copia',
          handler: (rubricaId: string) => {
            if (rubricaId) {
              this.crearRubricaBasadaEn(rubricaId);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Crea una nueva rúbrica basada en una existente, clonando sus datos
   * pero con nuevo ID y permitiendo edición completa.
   */
  private crearRubricaBasadaEn(rubricaBaseId: string): void {
    const rubricaBase = this.rubricas.find(r => r.id === rubricaBaseId);
    if (!rubricaBase) {
      this.mostrarToast('No se encontró la rúbrica seleccionada', 'danger');
      return;
    }

    // Crear una copia profunda de la rúbrica
    const rubricaCopia: RubricaDefinicion = {
      ...JSON.parse(JSON.stringify(rubricaBase)),
      id: this.generarIdUnico(),
      codigo: undefined, // Se generará nuevo código al guardar
      version: undefined, // Se calculará automáticamente
      nombre: `${rubricaBase.nombre} (copia)`,
      activa: false, // Copias siempre inactivas por defecto
      estado: 'borrador',
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    };

    // Abrir el editor con la copia para que el usuario pueda modificarla
    this.modoSeleccionCrear = false;
    this.dataService.updateUIState({ rubricasModoSeleccionCrear: false });
    this.activarModoCreacion(rubricaCopia);

    this.mostrarToast('Rúbrica cargada como borrador. Modifica y guarda para crear la nueva versión.', 'success');
  }

  /**
   * Genera un ID único para nuevas rúbricas
   */
  private generarIdUnico(): string {
    return `rubrica_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  editarRubrica(rubrica: RubricaDefinicion): void {
    // Abrir el editor inline con la rúbrica existente para edición
    this.activarModoCreacion(rubrica);
  }

  async editarRubricaSeleccionada() {
    if (!this.rubricaSeleccionada) {
      await this.mostrarToast('Selecciona una rúbrica primero', 'warning');
      return;
    }
    this.modoEdicion = true;
  }

  async guardarRubricaEditada() {
    // Determinar qué rúbrica guardar: cargada (nueva) o seleccionada (edición)
    const rubricaAGuardar = this.rubricaCargada || this.rubricaSeleccionada;

    if (!rubricaAGuardar) {
      await this.mostrarToast('No hay rúbrica para guardar', 'warning');
      return;
    }

    try {
      // Actualizar fecha de modificación
      rubricaAGuardar.fechaModificacion = new Date();

      // Guardar en storage
      await this.dataService.guardarRubrica(rubricaAGuardar);

      // Recargar lista
      this.cargarRubricas();

      // Limpiar estado
      this.modoEdicion = false;
      this.rubricaSeleccionada = null;
      this.rubricaCargada = null;
      this.rubricaFileName = '';

      await this.mostrarToast('Rúbrica guardada exitosamente', 'success');
    } catch (error) {
      Logger.error('Error guardando rúbrica:', error);
      await this.mostrarToast('Error al guardar la rúbrica', 'danger');
    }
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.rubricaSeleccionada = null;
    this.rubricaCargada = null;
    this.rubricaFileName = '';
    this.infoExpanded = false;
  }

  /**
   * Limpia la rúbrica cargada desde archivo.
   * Si no hay rúbrica seleccionada para editar, también cancela el modo edición.
   */
  limpiarRubrica(): void {
    this.rubricaCargada = null;
    this.rubricaFileName = '';

    // Si no hay rúbrica seleccionada, cancelar modo edición
    if (!this.rubricaSeleccionada) {
      this.modoEdicion = false;
    }
  }


  /**
   * Muestra el historial de versiones para una rúbrica en el área principal.
   * Muestra todas las versiones de rúbricas con el mismo código base.
   */
  verHistorialVersiones(rubrica: RubricaDefinicion, event?: Event) {
    event?.stopPropagation();

    if (!rubrica.codigo) {
      this.mostrarToast('Esta rúbrica no tiene código de versión', 'warning');
      return;
    }

    // Extraer código de categoría (sin versión): RGE1-EPMV2 → RGE1-EPM
    this.codigoCategoriaHistorial = rubrica.codigo.replace(/V\d+$/, '');
    this.rubricaSeleccionada = rubrica;
    this.tabActivo = 'historial';
  }

  /**
   * Cambia el tab activo en el panel de detalle
   */
  onTabChange(event: CustomEvent) {
    this.tabActivo = event.detail.value as 'detalle' | 'historial';
  }

  /**
   * Cierra el panel de detalle/historial
   */
  cerrarPanelDetalle() {
    this.rubricaSeleccionada = null;
    this.codigoCategoriaHistorial = '';
    this.tabActivo = 'detalle';
  }

  /**
   * Maneja el evento de activación de versión desde el componente de historial
   */
  onVersionActivada(version: RubricaDefinicion) {
    this.cargarRubricas();
    this.mostrarToast(`Versión ${version.version} de ${version.codigo} activada`, 'success');
  }

  /**
   * Verifica si una rúbrica tiene múltiples versiones
   */
  tieneMultiplesVersiones(rubrica: RubricaDefinicion): boolean {
    if (!rubrica.codigo) return false;
    const codigoBase = rubrica.codigo.replace(/V\d+$/, '');
    return this.rubricas.some(r =>
      r.id !== rubrica.id &&
      r.codigo?.replace(/V\d+$/, '') === codigoBase
    );
  }

  async guardarRubricaSeleccionada() {
    if (!this.rubricaSeleccionada) {
      await this.mostrarToast('Selecciona una rúbrica primero', 'warning');
      return;
    }

    try {
      // Actualizar fecha de modificación
      this.rubricaSeleccionada.fechaModificacion = new Date();

      // Guardar en storage
      await this.dataService.guardarRubrica(this.rubricaSeleccionada);

      // Recargar lista
      this.cargarRubricas();

      await this.mostrarToast(`Rúbrica "${this.rubricaSeleccionada.nombre}" guardada exitosamente`, 'success');
    } catch (error) {
      Logger.error('Error al guardar rúbrica:', error);
      await this.mostrarToast('Error al guardar la rúbrica', 'danger');
    }
  }

  async eliminarRubricaSeleccionada() {
    if (!this.rubricaSeleccionada) {
      await this.mostrarToast('Selecciona una rúbrica primero', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: '🗑️ Confirmar Eliminación',
      message: `¿Estás seguro de eliminar la rúbrica "${this.rubricaSeleccionada.nombre}"?`,
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
            if (this.rubricaSeleccionada) {
              await this.confirmarEliminarRubrica(this.rubricaSeleccionada);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Editar el texto de una rúbrica en formato .txt
   */
  async editarTextoRubrica(rubrica: RubricaDefinicion) {
    const textoRubrica = this.generarTextoRubrica(rubrica);

    const alert = await this.alertController.create({
      header: '✏️ Editar Texto de Rúbrica',
      message: 'Edita el contenido de la rúbrica en formato texto:',
      cssClass: 'alert-confirm alert-large',
      inputs: [
        {
          name: 'textoEditado',
          type: 'textarea',
          value: textoRubrica,
          attributes: {
            rows: 20,
            style: 'font-family: monospace; font-size: 12px;'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.textoEditado) {
              await this.guardarTextoEditado(rubrica, data.textoEditado);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Guardar texto editado de rúbrica
   */
  private async guardarTextoEditado(rubricaOriginal: RubricaDefinicion, textoEditado: string) {
    try {
      // Crear un archivo temporal para parsear
      const blob = new Blob([textoEditado], { type: 'text/plain' });
      const file = new File([blob], 'temp.txt', { type: 'text/plain' });

      // Usar el parser del DataService
      const rubricaParseada = await this.dataService.cargarArchivoRubrica(file);

      if (!rubricaParseada) {
        await this.mostrarToast('Error: El formato del texto no es válido', 'danger');
        return;
      }

      // Preservar ID y metadata original
      rubricaParseada.id = rubricaOriginal.id;
      rubricaParseada.tipoRubrica = rubricaOriginal.tipoRubrica;
      rubricaParseada.tipoEntrega = rubricaOriginal.tipoEntrega;
      rubricaParseada.cursosCodigos = rubricaOriginal.cursosCodigos;
      rubricaParseada.fechaCreacion = rubricaOriginal.fechaCreacion;
      rubricaParseada.fechaModificacion = new Date();

      // Guardar rúbrica actualizada
      await this.dataService.guardarRubrica(rubricaParseada);
      this.cargarRubricas();

      // Actualizar selección si es la rúbrica seleccionada
      if (this.rubricaSeleccionada?.id === rubricaOriginal.id) {
        this.rubricaSeleccionada = rubricaParseada;
      }

      await this.mostrarToast('Rúbrica actualizada exitosamente', 'success');
    } catch (error: any) {
      Logger.error('Error guardando texto editado:', error);
      await this.mostrarToast(`Error al guardar: ${error.message}`, 'danger');
    }
  }

  /**
   * Crear una nueva rúbrica en blanco con parámetros configurables
   */
  async crearRubricaEnBlanco() {
    const alert = await this.alertController.create({
      header: '➕ Crear Rúbrica en Blanco',
      message: 'Ingresa los parámetros para la nueva rúbrica:',
      cssClass: 'alert-confirm',
      inputs: [
        {
          name: 'nombre',
          type: 'text',
          placeholder: 'Nombre de la rúbrica',
          attributes: {
            required: true
          }
        },
        {
          name: 'puntuacionTotal',
          type: 'number',
          placeholder: 'Puntuación total (ej: 100)',
          value: '100',
          attributes: {
            min: 1,
            required: true
          }
        },
        {
          name: 'numeroCriterios',
          type: 'number',
          placeholder: 'Número de criterios (ej: 5)',
          value: '5',
          attributes: {
            min: 1,
            max: 20,
            required: true
          }
        },
        {
          name: 'numeroNiveles',
          type: 'number',
          placeholder: 'Niveles por criterio (ej: 4)',
          value: '4',
          attributes: {
            min: 2,
            max: 10,
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: async (data) => {
            if (data.nombre && data.puntuacionTotal && data.numeroCriterios && data.numeroNiveles) {
              await this.generarYDescargarRubricaBlanca(
                data.nombre,
                parseInt(data.puntuacionTotal),
                parseInt(data.numeroCriterios),
                parseInt(data.numeroNiveles)
              );
              return true;
            } else {
              this.mostrarToast('Todos los campos son obligatorios', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Generar y descargar rúbrica en blanco
   */
  private async generarYDescargarRubricaBlanca(
    nombre: string,
    puntuacionTotal: number,
    numeroCriterios: number,
    numeroNiveles: number
  ) {
    try {
      const textoRubrica = this.generarTextoRubricaBlanca(nombre, puntuacionTotal, numeroCriterios, numeroNiveles);

      // Descargar archivo .txt
      const blob = new Blob([textoRubrica], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombre.replace(/[^a-zA-Z0-9]/g, '_')}_plantilla.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Crear rúbrica en el sistema
      const file = new File([blob], 'temp.txt', { type: 'text/plain' });
      const rubrica = await this.dataService.cargarArchivoRubrica(file);

      if (rubrica) {
        // Solicitar tipo de rúbrica y entrega
        await this.solicitarTipoRubrica(rubrica);
        await this.solicitarTipoEntrega(rubrica);

        // Mostrar en modo edición para asociar cursos
        this.rubricaSeleccionada = rubrica;
        this.rubricaCargada = rubrica;
        this.modoEdicion = true;

        await this.mostrarToast('Rúbrica creada', 'success');
      }
    } catch (error: any) {
      Logger.error('Error generando rúbrica en blanco:', error);
      await this.mostrarToast(`Error al crear rúbrica: ${error.message}`, 'danger');
    }
  }

  /**
   * Generar texto de rúbrica en blanco
   */
  private generarTextoRubricaBlanca(
    nombre: string,
    puntuacionTotal: number,
    numeroCriterios: number,
    numeroNiveles: number
  ): string {
    let texto = `=== ${nombre.toUpperCase()} ===\n\n`;
    texto += `PUNTUACIÓN_TOTAL: ${puntuacionTotal}\n\n`;

    // Escala de calificación por defecto
    texto += 'ESCALA_CALIFICACION:\n';
    texto += '90-100|Excelente\n';
    texto += '80-89|Bueno\n';
    texto += '70-79|Aceptable\n';
    texto += '0-69|Insuficiente\n';
    texto += '\n---\n\n';

    // Generar criterios
    const pesoBase = Math.floor(puntuacionTotal / numeroCriterios);
    const puntosNivel = Math.floor(pesoBase / (numeroNiveles - 1));

    for (let i = 1; i <= numeroCriterios; i++) {
      texto += `CRITERIO_${i}: [Nombre del Criterio ${i}]\n`;
      texto += `PESO: ${pesoBase}\n`;
      texto += `NIVELES: ${numeroNiveles}\n\n`;

      for (let j = 1; j <= numeroNiveles; j++) {
        const puntos = (numeroNiveles - j) * puntosNivel;
        texto += `NIVEL_${j}:\n`;
        texto += `PUNTOS: ${puntos}\n`;
        texto += `TITULO: [Nivel ${j}]\n`;
        texto += `DESCRIPCION: [Descripción del nivel ${j} para el criterio ${i}]\n\n`;
      }

      texto += '---\n\n';
    }

    texto += '=== FIN DE RÚBRICA ===\n';
    return texto;
  }

  // ============= FIN MÉTODOS DE INTERACCIÓN =============

  private async mostrarToast(mensaje: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'success') {
    // Limpiar emojis del mensaje ya que se agregan automáticamente con CSS
    const cleanMessage = mensaje.replace(/✅|⚠️|❌|🎉|📚|💾|🗑️|➕/g, '').trim();

    // Mapear colores a tipos de toast
    const typeMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      success: 'success',
      primary: 'info',
      warning: 'warning',
      danger: 'error'
    };

    // Usar ToastService centralizado (respeta la preferencia del usuario)
    await this.toastService.show({
      message: cleanMessage,
      type: typeMap[color] || 'info',
      duration: 2000,
      position: 'middle'
    });
  }

  /**
   * Abre el editor de rúbricas para crear una nueva o editar existente
   * @param rubricaExistente - Rúbrica a editar (opcional, si no se pasa crea una nueva)
   */
  async abrirEditorRubrica(rubricaExistente?: RubricaDefinicion): Promise<void> {
    const modal = await this.modalController.create({
      component: RubricaEditorComponent,
      componentProps: {
        rubricaExistente,
        cursosDisponibles: this.cursosDisponibles
      },
      cssClass: 'rubrica-editor-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data?.guardado) {
      // Recargar la lista de rúbricas después de guardar
      this.cargarRubricas();
      const estado = data.rubrica?.estado === 'borrador' ? 'guardada como borrador' : 'publicada';
      await this.mostrarToast(`Rúbrica ${estado} exitosamente`, 'success');
    }
  }
}
