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
  /** Identificador único del grupo/estudiante actual - fuerza re-inicialización al cambiar */
  @Input() grupoId: string = '';
  /** Entrega actual (E1, E2, EF) */
  @Input() entregaActual: string = '';
  @Output() puntuacionChange = new EventEmitter<number>();
  @Output() calificacionesChange = new EventEmitter<{ [criterio: string]: number }>();
  @Output() evaluacionGuardada = new EventEmitter<any>(); // Nuevo evento para guardar

  // Tracking interno para evitar re-inicializaciones innecesarias
  private _lastGrupoId: string = '';
  private _lastEntrega: string = '';


  calificaciones: { [criterio: string]: number } = {};
  observaciones: string = '';
  puntuacionTotal: number = 0;

  ngOnInit() {
    this.inicializarCalificaciones();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Detectar cambios relevantes
    const grupoChanged = changes['grupoId'] &&
      changes['grupoId'].currentValue !== changes['grupoId'].previousValue;
    const entregaChanged = changes['entregaActual'] &&
      changes['entregaActual'].currentValue !== changes['entregaActual'].previousValue;
    const rubricaChanged = changes['rubrica'] &&
      changes['rubrica'].currentValue?.id !== changes['rubrica'].previousValue?.id;
    const evaluacionChanged = changes['evaluacionExistente'];

    // 🔍 Logging detallado para debugging
    console.log('🔄 [EvaluacionRubrica] ngOnChanges:', {
      grupoChanged,
      entregaChanged,
      rubricaChanged,
      evaluacionChanged: !!evaluacionChanged,
      grupoId: this.grupoId,
      entrega: this.entregaActual,
      evaluacionExistente: this.evaluacionExistente ? 'SÍ tiene' : 'null',
      evaluacionPuntos: this.evaluacionExistente?.puntosTotales,
      previousGrupo: changes['grupoId']?.previousValue,
      currentGrupo: changes['grupoId']?.currentValue
    });

    // 🔑 OPTIMIZACIÓN: Re-inicializar si:
    // 1. Cambió el grupo/estudiante (indica navegación entre grupos)
    // 2. Cambió la entrega (E1, E2, EF)
    // 3. Cambió la rúbrica
    // 4. Cambió la evaluación existente (cargó datos guardados o limpió)
    const debeReinicializar = grupoChanged || entregaChanged || rubricaChanged ||
                              (evaluacionChanged && evaluacionChanged.currentValue !== evaluacionChanged.previousValue);

    if (debeReinicializar) {
      console.log('✅ [EvaluacionRubrica] Reinicializando calificaciones...');

      // Actualizar tracking interno
      this._lastGrupoId = this.grupoId;
      this._lastEntrega = this.entregaActual;

      this.inicializarCalificaciones();
    } else {
      console.log('⏭️ [EvaluacionRubrica] Sin cambios relevantes, manteniendo estado actual');
    }
  }

  /**
   * Inicializa las calificaciones desde cero o desde evaluación existente.
   * OPTIMIZADO: Maneja correctamente la persistencia de niveles seleccionados.
   */
  private inicializarCalificaciones() {
    if (!this.rubrica || !this.rubrica.criterios) {
      console.warn('⚠️ [EvaluacionRubrica] No hay rúbrica o criterios disponibles');
      return;
    }

    console.log('🔧 [EvaluacionRubrica] Inicializando calificaciones...', {
      rubricaId: this.rubrica.id,
      criterios: this.rubrica.criterios.length,
      hayEvaluacionExistente: !!this.evaluacionExistente
    });

    // 1️⃣ Resetear todo a 0 primero (limpieza completa)
    this.calificaciones = {};
    this.rubrica.criterios.forEach(criterio => {
      this.calificaciones[criterio.titulo] = 0;
    });
    this.observaciones = '';

    // 2️⃣ Si hay evaluación existente, cargar sus valores
    if (this.evaluacionExistente && this.evaluacionExistente.criterios) {
      console.log('📂 [EvaluacionRubrica] Restaurando evaluación guardada:', {
        puntosTotales: this.evaluacionExistente.puntosTotales,
        criteriosGuardados: this.evaluacionExistente.criterios.length
      });

      // Cargar calificaciones desde criterios guardados
      this.evaluacionExistente.criterios.forEach((criterioGuardado, index) => {
        const titulo = criterioGuardado.criterioTitulo;
        const puntos = criterioGuardado.puntosObtenidos || 0;

        this.calificaciones[titulo] = puntos;

        console.log(`  ✓ Criterio ${index + 1}: ${titulo} → ${puntos} pts (Nivel: ${criterioGuardado.nivelSeleccionado || 'N/A'})`);\n      });

      // Cargar observaciones generales si existen
      this.observaciones = this.evaluacionExistente.comentarioGeneral || '';

      console.log('✅ [EvaluacionRubrica] Evaluación restaurada correctamente');
    } else {
      console.log('🆕 [EvaluacionRubrica] Iniciando evaluación nueva (sin datos previos)');
    }

    // 3️⃣ Calcular total inicial
    this.calcularPuntuacionTotal();

    console.log('📊 [EvaluacionRubrica] Inicialización completada:', {
      puntuacionTotal: this.puntuacionTotal,
      calificaciones: Object.keys(this.calificaciones).length
    });
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

  /**
   * Verifica si los puntos actuales del criterio están dentro del rango del nivel
   * Esta función es usada por el template para marcar el nivel correcto como seleccionado
   */
  estaEnRangoNivel(criterioTitulo: string, puntosNivel: string): boolean {
    const puntosActuales = this.calificaciones[criterioTitulo] || 0;

    if (puntosNivel.includes('-')) {
      const partes = puntosNivel.split('-').map(p => parseInt(p.trim()));
      const min = partes[0];
      const max = partes[1];
      return puntosActuales >= min && puntosActuales <= max;
    } else {
      const puntoExacto = parseInt(puntosNivel);
      return puntosActuales === puntoExacto;
    }
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
