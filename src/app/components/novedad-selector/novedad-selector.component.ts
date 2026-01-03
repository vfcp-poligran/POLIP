import { Component, computed, inject, Input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { NovedadService } from '../../services/novedad.service';
import { TipoNovedad } from '../../models/novedad.model';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
    closeOutline,
    checkmarkCircle,
    search,
    optionsOutline,
    personOutline,
    peopleOutline,
    warningOutline,
    gitMergeOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-novedad-selector',
    templateUrl: './novedad-selector.component.html',
    styleUrls: ['./novedad-selector.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule, FormsModule]
})
export class NovedadSelectorComponent {
    private modalCtrl = inject(ModalController);
    novedadService = inject(NovedadService);

    // Inputs
    @Input() estudiantes: any[] = []; // Estudiantes seleccionados (objetivo)
    @Input() allStudents: any[] = []; // Todos los estudiantes del curso (para "Se unió con")

    // Signals
    searchTerm = signal('');
    selectedTipos = signal<Set<string>>(new Set());

    // Lógica "Se unió con"
    relatedStudentSearch = signal('');
    relatedStudentSelected = signal<any | null>(null);

    constructor() {
        addIcons({
            closeOutline,
            checkmarkCircle,
            search,
            optionsOutline,
            personOutline,
            peopleOutline,
            warningOutline,
            gitMergeOutline
        });
    }

    // Computed
    filteredTipos = computed(() => {
        const term = this.searchTerm().toLowerCase();
        return this.novedadService.tiposNovedad().filter(t =>
            t.activo && (t.nombre.toLowerCase().includes(term) || t.descripcion?.toLowerCase().includes(term))
        );
    });

    showRelatedStudentSelector = computed(() => {
        const tipoSeUnio = this.novedadService.tiposNovedad().find(t => t.nombre === 'Se unió con');
        return tipoSeUnio && this.selectedTipos().has(tipoSeUnio.id);
    });

    filteredRelatedStudents = computed(() => {
        const term = this.relatedStudentSearch().toLowerCase();
        // Excluir a los estudiantes seleccionados actualmente (target) para evitar auto-referencia
        const targetEmails = new Set(this.estudiantes.map(e => e.correo));

        return this.allStudents
            .filter(s => !targetEmails.has(s.correo)) // No mostrarse a sí mismos
            .filter(s => s.nombre.toLowerCase().includes(term) || s.correo.toLowerCase().includes(term))
            .slice(0, 5); // Limitar resultados
    });

    toggleSelection(tipo: TipoNovedad) {
        const current = new Set(this.selectedTipos());
        if (current.has(tipo.id)) {
            current.delete(tipo.id);
            // Limpiar selección relacional si desmarcamos el tipo especial
            if (tipo.nombre === 'Se unió con') {
                this.relatedStudentSelected.set(null);
            }
        } else {
            current.add(tipo.id);
        }
        this.selectedTipos.set(current);
    }

    isSelected(id: string): boolean {
        return this.selectedTipos().has(id);
    }

    selectRelatedStudent(student: any) {
        this.relatedStudentSelected.set(student);
        this.relatedStudentSearch.set(''); // Clear search logic visualization if needed
    }

    cancelar() {
        this.modalCtrl.dismiss(null, 'cancel');
    }

    confirmar() {
        const selected = this.novedadService.tiposNovedad()
            .filter(t => this.selectedTipos().has(t.id));

        this.modalCtrl.dismiss({
            selectedTypes: selected,
            relatedStudent: this.relatedStudentSelected()
        }, 'confirm');
    }

    async abrirGestionTipos() {
        const modal = await this.modalCtrl.create({
            component: (await import('../novedad-manager/novedad-manager.component')).NovedadManagerComponent,
            breakpoints: [0, 0.75, 1],
            initialBreakpoint: 0.75
        });
        await modal.present();
    }
}
