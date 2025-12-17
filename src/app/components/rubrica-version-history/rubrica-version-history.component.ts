import { Component, Input, Output, EventEmitter, OnInit, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonContent, IonItem, IonLabel, IonBadge,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonChip, IonAccordion, IonAccordionGroup,
  IonNote, ModalController, AlertController, ToastController,
  IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircleOutline, timeOutline, gitBranchOutline,
  gitCommitOutline, eyeOutline, swapHorizontalOutline, addOutline,
  removeOutline, createOutline, alertCircleOutline, checkmarkOutline,
  chevronForwardOutline, documentTextOutline, swapVerticalOutline } from 'ionicons/icons';

import { DataService } from '@app/services/data.service';
import { RubricaDefinicion, CriterioRubrica } from '@app/models';

/** Representa un cambio detectado entre versiones */
interface CambioVersion {
  tipo: 'agregado' | 'eliminado' | 'modificado';
  categoria: 'criterio' | 'nivel' | 'peso' | 'puntuacion' | 'descripcion' | 'general';
  descripcion: string;
  valorAnterior?: string | number;
  valorNuevo?: string | number;
  criterioTitulo?: string;
}

/** Comparación entre dos versiones */
interface ComparacionVersiones {
  versionBase: RubricaDefinicion;
  versionComparada: RubricaDefinicion;
  cambios: CambioVersion[];
  resumen: {
    criteriosAgregados: number;
    criteriosEliminados: number;
    criteriosModificados: number;
    cambiosTotales: number;
  };
}

@Component({
  selector: 'app-rubrica-version-history',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonIcon, IonContent, IonItem, IonLabel, IonBadge,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonChip, IonAccordion, IonAccordionGroup,
    IonNote, IonGrid, IonRow, IonCol
  ],
  templateUrl: './rubrica-version-history.component.html',
  styleUrls: ['./rubrica-version-history.component.scss']
})
export class RubricaVersionHistoryComponent implements OnInit, OnChanges {
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private dataService = inject(DataService);

  /**
   * Código base de la categoría (incluye iniciales del curso).
   *
   * IMPORTANTE: Las categorías son únicas por CURSO:
   * - "RGE1-EPM" → Rúbrica Grupal E1 para Programación Móvil
   * - "RGE1-SO"  → Rúbrica Grupal E1 para Sistemas Operativos
   *
   * @example "RGE1-EPM", "RIE2-SO", "RGEF-BD"
   */
  @Input() codigoCategoria!: string;

  /** Si es true, oculta el header del componente (para uso embebido en tabs) */
  @Input() sinEncabezado = false;

  /** Todas las versiones de esta categoría (específica del curso) */
  versiones: RubricaDefinicion[] = [];

  /** Versión actualmente activa */
  versionActiva?: RubricaDefinicion;

  /** Versión seleccionada para comparar (izquierda) */
  versionBaseSeleccionada?: RubricaDefinicion;

  /** Versión seleccionada para comparar (derecha) */
  versionComparadaSeleccionada?: RubricaDefinicion;

  /** Resultado de la comparación actual */
  comparacionActual?: ComparacionVersiones;

  /** Modo de visualización */
  modoVista: 'timeline' | 'comparacion' = 'timeline';

  /** Evento emitido cuando se activa una versión */
  @Output() versionActivada = new EventEmitter<RubricaDefinicion>();

  constructor() {
    addIcons({gitBranchOutline,closeOutline,gitCommitOutline,swapHorizontalOutline,checkmarkCircleOutline,checkmarkOutline,timeOutline,documentTextOutline,alertCircleOutline,swapVerticalOutline,addOutline,removeOutline,createOutline,eyeOutline,chevronForwardOutline});
  }

  ngOnInit(): void {
    this.cargarVersiones();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['codigoCategoria']) {
      this.cargarVersiones();
    }
  }

  /** Carga todas las versiones de la categoría */
  private cargarVersiones(): void {
    if (!this.codigoCategoria) return;

    const todasRubricas = this.dataService.obtenerRubricasArray();

    // Filtrar por código base (sin versión)
    this.versiones = todasRubricas
      .filter(r => r.codigo?.startsWith(this.codigoCategoria + 'V') ||
                   r.codigo?.startsWith(this.codigoCategoria + '-'))
      .sort((a, b) => (b.version || 0) - (a.version || 0));

    this.versionActiva = this.versiones.find(v => v.activa);

    // Seleccionar automáticamente las dos últimas versiones para comparar
    if (this.versiones.length >= 2) {
      this.versionComparadaSeleccionada = this.versiones[0]; // Más reciente
      this.versionBaseSeleccionada = this.versiones[1]; // Anterior
      this.realizarComparacion();
    } else if (this.versiones.length === 1) {
      this.versionComparadaSeleccionada = this.versiones[0];
    }
  }

  /** Cambia el modo de visualización */
  cambiarModo(modo: 'timeline' | 'comparacion'): void {
    this.modoVista = modo;
    if (modo === 'comparacion' && this.versiones.length >= 2) {
      this.realizarComparacion();
    }
  }

  /** Selecciona versión base para comparar */
  seleccionarVersionBase(version: RubricaDefinicion): void {
    this.versionBaseSeleccionada = version;
    if (this.versionComparadaSeleccionada) {
      this.realizarComparacion();
    }
  }

  /** Selecciona versión a comparar */
  seleccionarVersionComparada(version: RubricaDefinicion): void {
    this.versionComparadaSeleccionada = version;
    if (this.versionBaseSeleccionada) {
      this.realizarComparacion();
    }
  }

  /** Intercambia las versiones seleccionadas */
  intercambiarVersiones(): void {
    const temp = this.versionBaseSeleccionada;
    this.versionBaseSeleccionada = this.versionComparadaSeleccionada;
    this.versionComparadaSeleccionada = temp;
    this.realizarComparacion();
  }

  /** Realiza la comparación entre las dos versiones seleccionadas */
  private realizarComparacion(): void {
    if (!this.versionBaseSeleccionada || !this.versionComparadaSeleccionada) {
      this.comparacionActual = undefined;
      return;
    }

    const cambios: CambioVersion[] = [];
    const vBase = this.versionBaseSeleccionada;
    const vComp = this.versionComparadaSeleccionada;

    // Comparar puntuación total
    if (vBase.puntuacionTotal !== vComp.puntuacionTotal) {
      cambios.push({
        tipo: 'modificado',
        categoria: 'puntuacion',
        descripcion: 'Puntuación total modificada',
        valorAnterior: vBase.puntuacionTotal,
        valorNuevo: vComp.puntuacionTotal
      });
    }

    // Comparar criterios
    const criteriosBase = vBase.criterios || [];
    const criteriosComp = vComp.criterios || [];

    // Criterios agregados (en nueva pero no en base)
    for (const criterioComp of criteriosComp) {
      const criterioEnBase = criteriosBase.find(c =>
        this.normalizarTexto(c.titulo) === this.normalizarTexto(criterioComp.titulo)
      );

      if (!criterioEnBase) {
        cambios.push({
          tipo: 'agregado',
          categoria: 'criterio',
          descripcion: `Criterio agregado: "${criterioComp.titulo}"`,
          valorNuevo: criterioComp.peso,
          criterioTitulo: criterioComp.titulo
        });
      } else {
        // Comparar peso
        if (criterioEnBase.peso !== criterioComp.peso) {
          cambios.push({
            tipo: 'modificado',
            categoria: 'peso',
            descripcion: `Peso modificado en "${criterioComp.titulo}"`,
            valorAnterior: criterioEnBase.peso,
            valorNuevo: criterioComp.peso,
            criterioTitulo: criterioComp.titulo
          });
        }

        // Comparar niveles
        this.compararNiveles(criterioEnBase, criterioComp, cambios);
      }
    }

    // Criterios eliminados (en base pero no en nueva)
    for (const criterioBase of criteriosBase) {
      const existeEnComp = criteriosComp.find(c =>
        this.normalizarTexto(c.titulo) === this.normalizarTexto(criterioBase.titulo)
      );

      if (!existeEnComp) {
        cambios.push({
          tipo: 'eliminado',
          categoria: 'criterio',
          descripcion: `Criterio eliminado: "${criterioBase.titulo}"`,
          valorAnterior: criterioBase.peso,
          criterioTitulo: criterioBase.titulo
        });
      }
    }

    // Calcular resumen
    const resumen = {
      criteriosAgregados: cambios.filter(c => c.tipo === 'agregado' && c.categoria === 'criterio').length,
      criteriosEliminados: cambios.filter(c => c.tipo === 'eliminado' && c.categoria === 'criterio').length,
      criteriosModificados: cambios.filter(c => c.tipo === 'modificado').length,
      cambiosTotales: cambios.length
    };

    this.comparacionActual = {
      versionBase: vBase,
      versionComparada: vComp,
      cambios,
      resumen
    };
  }

  /** Compara los niveles de dos criterios */
  private compararNiveles(criterioBase: CriterioRubrica, criterioComp: CriterioRubrica, cambios: CambioVersion[]): void {
    const nivelesBase = criterioBase.nivelesDetalle || [];
    const nivelesComp = criterioComp.nivelesDetalle || [];

    // Diferencia en cantidad de niveles
    if (nivelesBase.length !== nivelesComp.length) {
      cambios.push({
        tipo: 'modificado',
        categoria: 'nivel',
        descripcion: `Cantidad de niveles modificada en "${criterioComp.titulo}"`,
        valorAnterior: nivelesBase.length,
        valorNuevo: nivelesComp.length,
        criterioTitulo: criterioComp.titulo
      });
    }

    // Comparar niveles existentes
    const maxNiveles = Math.min(nivelesBase.length, nivelesComp.length);
    for (let i = 0; i < maxNiveles; i++) {
      const nivelBase = nivelesBase[i];
      const nivelComp = nivelesComp[i];

      // Comparar descripción del nivel
      if (this.normalizarTexto(nivelBase.descripcion) !== this.normalizarTexto(nivelComp.descripcion)) {
        cambios.push({
          tipo: 'modificado',
          categoria: 'descripcion',
          descripcion: `Descripción modificada en nivel "${nivelComp.titulo}" de "${criterioComp.titulo}"`,
          criterioTitulo: criterioComp.titulo
        });
      }

      // Comparar puntos
      if (nivelBase.puntosMin !== nivelComp.puntosMin || nivelBase.puntosMax !== nivelComp.puntosMax) {
        cambios.push({
          tipo: 'modificado',
          categoria: 'puntuacion',
          descripcion: `Puntos modificados en nivel "${nivelComp.titulo}" de "${criterioComp.titulo}"`,
          valorAnterior: `${nivelBase.puntosMin}-${nivelBase.puntosMax}`,
          valorNuevo: `${nivelComp.puntosMin}-${nivelComp.puntosMax}`,
          criterioTitulo: criterioComp.titulo
        });
      }
    }
  }

  /** Normaliza texto para comparación */
  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Activa una versión específica */
  async activarVersion(version: RubricaDefinicion): Promise<void> {
    if (version.activa) {
      await this.mostrarToast('Esta versión ya está activa', 'warning');
      return;
    }

    const confirmar = await this.confirmarActivacion(version);
    if (!confirmar) return;

    try {
      await this.dataService.activarVersionRubrica(version.id);
      this.cargarVersiones();
      this.versionActivada.emit(version);
      await this.mostrarToast(`Versión ${version.version} activada correctamente`, 'success');
    } catch (error) {
      await this.mostrarToast('Error al activar la versión', 'danger');
    }
  }

  /** Confirma la activación de una versión */
  private async confirmarActivacion(version: RubricaDefinicion): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Activar versión',
        message: `
          <p>¿Desea activar la <strong>versión ${version.version}</strong>?</p>
          <p class="text-muted">La versión actual (v${this.versionActiva?.version || 1}) será desactivada.</p>
        `,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: 'Activar', cssClass: 'alert-button-confirm', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }

  /** Muestra toast */
  private async mostrarToast(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /** Cierra el modal */
  cerrar(): void {
    this.modalCtrl.dismiss();
  }

  /** Obtiene el ícono según el tipo de cambio */
  getIconoCambio(tipo: 'agregado' | 'eliminado' | 'modificado'): string {
    switch (tipo) {
      case 'agregado': return 'add-outline';
      case 'eliminado': return 'remove-outline';
      case 'modificado': return 'create-outline';
    }
  }

  /** Obtiene el color según el tipo de cambio */
  getColorCambio(tipo: 'agregado' | 'eliminado' | 'modificado'): string {
    switch (tipo) {
      case 'agregado': return 'success';
      case 'eliminado': return 'danger';
      case 'modificado': return 'warning';
    }
  }

  /** Formatea fecha para mostrar */
  formatearFecha(fecha: Date | string | undefined): string {
    if (!fecha) return 'Sin fecha';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Obtiene estado textual de la rúbrica */
  getEstadoTexto(rubrica: RubricaDefinicion): string {
    if (rubrica.activa) return 'Activa';
    return rubrica.estado === 'publicada' ? 'Publicada' : 'Borrador';
  }

  /** Obtiene color del estado */
  getEstadoColor(rubrica: RubricaDefinicion): string {
    if (rubrica.activa) return 'success';
    return rubrica.estado === 'publicada' ? 'primary' : 'medium';
  }
}
