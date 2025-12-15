import { Component, OnInit, inject } from '@angular/core';
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
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  ToastController,
  AlertController,
  LoadingController,
  ModalController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { ExportService } from '../../services/export.service';
import { DataService } from '../../services/data.service';
import { RubricaDefinicion } from '../../models';
import { EvaluacionRubricaComponent } from '../../components/evaluacion-rubrica/evaluacion-rubrica.component';
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
  // Iconos outline
  documentTextOutline,
  cloudUploadOutline,
  createOutline,
  saveOutline,
  closeOutline,
  addCircleOutline,
  trashOutline,
  documentsOutline,
  eyeOutline,
  eyeOffOutline,
  informationCircleOutline,
  listOutline,
  calendarOutline,
  timeOutline,
  barChartOutline,
  checkboxOutline,
  peopleOutline,
  schoolOutline,
  trophyOutline,
  documentOutline,
  downloadOutline,
  phonePortraitOutline,
  pencilOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-rubricas',
  templateUrl: './rubricas.page.html',
  styleUrls: ['./rubricas.page.scss'],
  standalone: true,
  imports: [
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
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    CommonModule,
    FormsModule
  ]
})
export class RubricasPage implements OnInit, ViewWillEnter {
  private exportService = inject(ExportService);
  private dataService = inject(DataService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private modalController = inject(ModalController);

  rubricas: RubricaDefinicion[] = [];
  rubricaSeleccionada: RubricaDefinicion | null = null;
  modoEdicion = false;
  rubricaFileName = '';
  rubricaCargada: RubricaDefinicion | null = null;
  cursosDisponibles: any[] = [];
  infoExpanded = false;

  // Imports de iconos
  constructor() {
    addIcons({
      // Filled icons
      phonePortrait, documentText, cloudUpload, closeCircle, addCircle, close, save,
      calendar, pencil, trash, informationCircle, school, library, checkbox, list, trophy, clipboard,
      // Outline icons
      addCircleOutline, closeOutline, saveOutline, calendarOutline, createOutline,
      trashOutline, informationCircleOutline, schoolOutline, documentTextOutline,
      listOutline, cloudUploadOutline, documentsOutline, eyeOutline, eyeOffOutline,
      timeOutline, barChartOutline, peopleOutline, trophyOutline, documentOutline,
      downloadOutline, phonePortraitOutline, checkboxOutline
    });
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.cargarRubricas();
    this.cargarCursosDisponibles();
  }

  cargarRubricas() {
    // Las rúbricas se cargan directamente del servicio
    this.rubricas = this.dataService.obtenerRubricasArray();
  }

  cargarCursosDisponibles() {
    const uiState = this.dataService.getUIState();
    const cursos = this.dataService.getCursos();

    this.cursosDisponibles = Object.keys(cursos).map(codigo => {
      const metadata = uiState.courseStates?.[codigo]?.metadata;
      return {
        codigo: codigo,
        nombre: metadata?.nombre || codigo,
        titulo: metadata ? `${metadata.nombre} -[${codigo}]` : codigo
      };
    });
  }

  async mostrarVistaPrevia(rubrica: RubricaDefinicion) {
    const alert = await this.alertController.create({
      header: 'Vista Previa de Rúbrica',
      message: `
  < strong > Título: </strong> ${rubrica.nombre}<br>
    < strong > Puntuación Total: </strong> ${rubrica.puntuacionTotal || 'N/A'}<br>
      < strong > Criterios: </strong> ${rubrica.criterios.length}<br>
        < strong > Escalas: </strong> ${rubrica.escalaCalificacion?.length || 0}
          `,
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
      header: 'Configurar Rúbrica',
      message: 'Asocia la rúbrica con cursos y especifica el tipo de entrega:',
      inputs: [
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega 1',
          value: 'Entrega 1',
          checked: true
        },
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega 2',
          value: 'Entrega 2'
        },
        {
          name: 'tipoEntrega',
          type: 'radio',
          label: 'Entrega Final',
          value: 'Entrega Final'
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
      header: 'Seleccionar Cursos',
      message: `Selecciona los cursos para la rúbrica "${rubrica.nombre}" - ${tipoEntrega}: `,
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
            rubrica.tipoEntrega = tipoEntrega;
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

  async eliminarRubrica(rubrica: RubricaDefinicion, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación de Rúbrica',
      message: `¿Estás seguro de eliminar la rúbrica "${rubrica.nombre}" ? <br><br><strong>Información de la rúbrica: </strong><br>• Tipo: ${rubrica.tipoRubrica === 'PG' ? 'Grupal' : 'Individual'}<br>• Entrega: ${rubrica.tipoEntrega || 'No especificada'}<br>• Puntos totales: ${rubrica.puntuacionTotal}<br>• Criterios: ${rubrica.criterios.length}<br><br>Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
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
      header: 'Evaluar con Rúbrica',
      message: 'Ingresa los datos del estudiante a evaluar:',
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

  async exportarRubrica(rubrica: RubricaDefinicion) {
    try {
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

      await this.mostrarToast('Rúbrica exportada exitosamente', 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al exportar: ${error.message}`, 'danger');
    }
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
      texto += `${escala.rango}|${escala.descripcion}\n`;
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
      header: 'Exportar Datos de Cursos',
      message: 'Selecciona qué curso exportar:',
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

    // Validar extensión
    if (!file.name.endsWith('.txt')) {
      await this.mostrarToast('Solo se permiten archivos .txt', 'warning');
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
        header: 'Error al Importar Rúbrica',
        message: error.message || 'Error desconocido al importar la rúbrica',
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
      header: 'Tipo de Rúbrica',
      message: 'Selecciona el tipo de evaluación para esta rúbrica:',
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
            const tipoTexto = tipoSeleccionado === 'PG' ? 'Grupal' : 'Individual';
            this.mostrarToast(`Rúbrica configurada como ${tipoTexto}`, 'success');
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
      header: 'Tipo de Entrega',
      message: 'Selecciona la entrega a la que corresponde esta rúbrica:',
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
            rubrica.tipoEntrega = tipoSeleccionado;
            rubrica.fechaModificacion = new Date();
            this.mostrarToast(`Rúbrica asignada a ${tipoSeleccionado}`, 'success');
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
    } else {
      this.rubricaSeleccionada = rubrica;
    }
  }

  nuevaRubrica() {
    this.modoEdicion = true;
    this.rubricaSeleccionada = null;
    this.infoExpanded = true;
    this.mostrarToast('Importa un archivo de rúbrica para crear una nueva', 'primary');
  }

  editarRubrica(rubrica: RubricaDefinicion) {
    this.rubricaSeleccionada = rubrica;
    this.modoEdicion = true;
    this.mostrarToast(`Editando rúbrica: ${rubrica.nombre}`, 'primary');
  }

  async editarRubricaSeleccionada() {
    if (!this.rubricaSeleccionada) {
      await this.mostrarToast('Selecciona una rúbrica primero', 'warning');
      return;
    }

    this.modoEdicion = true;
    await this.mostrarToast('Modo edición activado', 'primary');
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
    this.mostrarToast('Creación de rúbrica cancelada', 'warning');
  }

  toggleInfo() {
    this.infoExpanded = !this.infoExpanded;
  }

  limpiarRubrica() {
    this.rubricaCargada = null;
    this.rubricaFileName = '';
    this.mostrarToast('Archivo de rúbrica eliminado', 'warning');
  }

  async confirmarEliminarRubrica(rubrica: RubricaDefinicion) {
    await this.eliminarRubrica(rubrica);
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
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar la rúbrica "${this.rubricaSeleccionada.nombre}"?`,
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
              await this.eliminarRubrica(this.rubricaSeleccionada);
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
      header: 'Editar Texto de Rúbrica',
      message: 'Edita el contenido de la rúbrica en formato texto:',
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
      ],
      cssClass: 'alert-large'
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
      header: 'Crear Rúbrica en Blanco',
      message: 'Ingresa los parámetros para la nueva rúbrica:',
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

        await this.mostrarToast('Plantilla descargada y rúbrica creada. Asigna cursos y guarda.', 'success');
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

    // Determinar clase CSS estandarizada y color de Ionic
    let cssClass: string;
    let ionicColor: string;

    if (color === 'success' || color === 'primary') {
      cssClass = 'toast-success';
      ionicColor = 'success';
    } else if (color === 'warning') {
      cssClass = 'toast-warning';
      ionicColor = 'warning';
    } else {
      cssClass = 'toast-danger';
      ionicColor = 'danger';
    }

    const toast = await this.toastController.create({
      message: cleanMessage,
      duration: 2000,
      color: ionicColor,
      position: 'middle',
      cssClass: cssClass
    });
    await toast.present();
  }
}

