import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { RubricaDefinicion, CriterioRubrica, Evaluacion } from '../../models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-evaluacion-rubrica',
  templateUrl: './evaluacion-rubrica.component.html',
  styleUrls: ['./evaluacion-rubrica.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class EvaluacionRubricaComponent implements OnInit, OnChanges {
  private modalController = inject(ModalController);
  private dataService = inject(DataService);
  private toastController = inject(ToastController);

  @Input() rubrica!: RubricaDefinicion;
  @Input() estudianteId: string = '';
  @Input() nombreEstudiante: string = '';
  @Input() evaluacionExistente: Evaluacion | null = null;
  @Output() puntuacionChange = new EventEmitter<number>();
  @Output() calificacionesChange = new EventEmitter<{ [criterio: string]: number }>();
  @Output() evaluacionGuardada = new EventEmitter<any>(); // Nuevo evento para guardar


  calificaciones: { [criterio: string]: number } = {};
  observaciones: string = '';
  puntuacionTotal: number = 0;

  ngOnInit() {
    this.inicializarCalificaciones();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si cambia la rúbrica o la evaluación existente, reinicializar
    if (changes['rubrica'] || changes['evaluacionExistente']) {
      console.log('🔄 [EvaluacionRubrica] Cambios detectados - Reinicializando...');
      this.inicializarCalificaciones();
    }
  }

  private inicializarCalificaciones() {
    if (!this.rubrica || !this.rubrica.criterios) return;

    // 1. Resetear todo a 0 primero
    this.calificaciones = {};
    this.rubrica.criterios.forEach(criterio => {
      this.calificaciones[criterio.titulo] = 0;
    });
    this.observaciones = '';

    // 2. Si hay evaluación existente, cargar sus valores
    if (this.evaluacionExistente) {
      console.log('📂 [EvaluacionRubrica] Cargando evaluación existente:', this.evaluacionExistente);
      console.log('📂 [EvaluacionRubrica] Criterios guardados:', this.evaluacionExistente.criterios);

      // Cargar calificaciones desde criterios (estructura real de Evaluacion)
      if (this.evaluacionExistente.criterios && this.evaluacionExistente.criterios.length > 0) {
        this.evaluacionExistente.criterios.forEach(c => {
          console.log(`   -> Cargando: ${c.criterioTitulo} = ${c.puntosObtenidos}`);
          this.calificaciones[c.criterioTitulo] = c.puntosObtenidos || 0;
        });
      }

      this.observaciones = this.evaluacionExistente.comentarioGeneral || '';
      console.log('📂 [EvaluacionRubrica] Calificaciones cargadas:', this.calificaciones);
    } else {
      console.log('🆕 [EvaluacionRubrica] No hay evaluación previa, iniciando en limpio');
    }


    // 3. Calcular total inicial
    this.calcularPuntuacionTotal();
  }


  onCalificacionChange(criterio: string, puntos: number) {
    this.calificaciones[criterio] = puntos;
    this.calcularPuntuacionTotal();
    // Emitir calificaciones actualizadas al padre
    this.calificacionesChange.emit({ ...this.calificaciones });
  }

  calcularPuntuacionTotal() {
    this.puntuacionTotal = this.dataService.calcularPuntuacionTotalRubrica(this.rubrica, this.calificaciones);
    this.puntuacionChange.emit(this.puntuacionTotal);
  }

  obtenerPuntosNivel(puntos: string): number {
    if (puntos.includes('-')) {
      // Obtener el valor máximo del rango (segundo elemento)
      const partes = puntos.split('-');
      return parseInt(partes[1].trim());
    }
    return parseInt(puntos);
  }

  obtenerNivelSeleccionado(criterio: CriterioRubrica): any {
    const puntos = this.calificaciones[criterio.titulo];
    return criterio.nivelesDetalle?.find(nivel => {
      const puntosNivel = nivel.puntos.includes('-')
        ? nivel.puntos.split('-').map((p: string) => parseInt(p.trim()))
        : [parseInt(nivel.puntos), parseInt(nivel.puntos)];

      if (puntosNivel.length === 2) {
        return puntos >= puntosNivel[0] && puntos <= puntosNivel[1];
      } else {
        return puntos === puntosNivel[0];
      }
    });
  }

  async guardarEvaluacion() {
    if (!this.estudianteId || !this.nombreEstudiante) {
      await this.mostrarToast('Falta información del estudiante', 'warning');
      return;
    }

    // Construir datos de evaluación
    const evaluacionData = {
      rubricaId: this.rubrica.id!,
      estudianteId: this.estudianteId,
      calificaciones: { ...this.calificaciones },
      puntuacionTotal: this.puntuacionTotal,
      observaciones: this.observaciones,
      fechaEvaluacion: new Date()
    };

    try {
      // Emitir evento al componente padre para que guarde
      console.log('📤 [EvaluacionRubrica] Emitiendo datos de evaluación al padre:', evaluacionData);
      this.evaluacionGuardada.emit(evaluacionData);

      await this.mostrarToast('Evaluación guardada exitosamente', 'success');
    } catch (error: any) {
      await this.mostrarToast(`Error al guardar: ${error.message}`, 'danger');
    }
  }

  cerrar(evaluacion?: any) {
    this.modalController.dismiss(evaluacion);
  }

  obtenerColorNota(): string {
    const porcentaje = (this.puntuacionTotal / (this.rubrica.puntuacionTotal || 1)) * 100;

    if (porcentaje >= 85) return 'success';
    if (porcentaje >= 70) return 'secondary';
    if (porcentaje >= 40) return 'warning';
    return 'danger';
  }

  obtenerTextoEscala(): string {
    const porcentaje = (this.puntuacionTotal / (this.rubrica.puntuacionTotal || 1)) * 100;

    if (!this.rubrica.escalaCalificacion || this.rubrica.escalaCalificacion.length === 0) {
      return 'Sin escala de calificación';
    }

    for (const escala of this.rubrica.escalaCalificacion) {
      const [min, max] = escala.rango.split('-').map(n => parseInt(n.trim()));
      if (porcentaje >= min && porcentaje <= max) {
        return escala.descripcion;
      }
    }

    return 'Sin calificación';
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'warning' | 'danger' = 'success') {
    // Limpiar emojis del mensaje ya que se agregan automáticamente con CSS
    const cleanMessage = mensaje.replace(/✅|⚠️|❌|🎉|📚|💾|🗑️|➕/g, '').trim();

    // Determinar clase CSS estandarizada y color de Ionic
    let cssClass: string;
    let ionicColor: string;

    if (color === 'success') {
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
      position: 'top',
      cssClass: cssClass
    });
    await toast.present();
  }
}
