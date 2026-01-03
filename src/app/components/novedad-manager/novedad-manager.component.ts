import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { NovedadService } from '../../services/novedad.service';
import { TipoNovedad } from '../../models/novedad.model';
import { addIcons } from 'ionicons';
import {
    add,
    closeOutline,
    pencilOutline,
    trashOutline,
    saveOutline,
    colorPaletteOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-novedad-manager',
    templateUrl: './novedad-manager.component.html',
    styleUrls: ['./novedad-manager.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule]
})
export class NovedadManagerComponent {
    private modalCtrl = inject(ModalController);
    public novedadService = inject(NovedadService); // Public for HTML access

    // Estado del formulario
    isEditing = signal(false);
    editingId = signal<string | null>(null);

    // Modelo del formulario
    formNombre = signal('');
    formDescripcion = signal('');
    formIcono = signal('alert-circle-outline'); // Default
    formColor = signal('#ff9800'); // Default

    // Lista de iconos disponibles para seleccionar (simple por ahora)
    availableIcons = [
        'person-outline', 'people-outline', 'warning-outline',
        'close-circle-outline', 'checkmark-circle-outline',
        'time-outline', 'star-outline', 'heart-outline',
        'briefcase-outline', 'school-outline'
    ];

    constructor() {
        addIcons({ add, closeOutline, pencilOutline, trashOutline, saveOutline, colorPaletteOutline });
    }

    cancelar() {
        this.modalCtrl.dismiss();
    }

    iniciarCreacion() {
        this.resetForm();
        this.isEditing.set(true);
        this.editingId.set(null);
    }

    editarTipo(tipo: TipoNovedad) {
        this.formNombre.set(tipo.nombre);
        this.formDescripcion.set(tipo.descripcion || '');
        this.formIcono.set(tipo.icono);
        this.formColor.set(tipo.color);

        this.editingId.set(tipo.id);
        this.isEditing.set(true);
    }

    eliminarTipo(tipo: TipoNovedad) {
        // Soft delete para mantener consistencia con historial existente
        // TODO: UI should probably confirm with alert instead of window.confirm for mobile feel, but this works for now.
        if (confirm(`¿Estás seguro de eliminar "${tipo.nombre}"?`)) {
            this.novedadService.desactivarTipoNovedad(tipo.id);
        }
    }

    guardar() {
        if (!this.formNombre()) return;

        if (this.editingId()) {
            // Update
            this.novedadService.actualizarTipoNovedad(this.editingId()!, {
                nombre: this.formNombre(),
                descripcion: this.formDescripcion(),
                icono: this.formIcono(),
                color: this.formColor()
            });
        } else {
            // Create
            this.novedadService.crearTipoNovedad({
                nombre: this.formNombre(),
                descripcion: this.formDescripcion(),
                icono: this.formIcono(),
                color: this.formColor(),
                esRecurrente: true,
                activo: true
            });
        }

        this.resetForm();
        this.isEditing.set(false);
    }

    resetForm() {
        this.formNombre.set('');
        this.formDescripcion.set('');
        this.formIcono.set('alert-circle-outline');
        this.formColor.set('#ff9800');
        this.editingId.set(null);
    }
}
