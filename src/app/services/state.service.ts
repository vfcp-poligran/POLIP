import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UnifiedStorageService } from './unified-storage.service';
import { UIState, CourseState } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private storage = inject(UnifiedStorageService);

  private readonly STORAGE_KEYS = {
    UI_STATE: 'appUIState'
  };

  private readonly DEFAULT_COURSE_STATE: CourseState = {
    activeDelivery: 'E1',
    activeGroup: null,
    activeStudent: null,
    activeType: null,
    filtroGrupo: '',
    emailsVisible: false,
    isScrollingTable: false,
    rubricasAsociadas: {
      entrega1: null,
      entrega1Individual: null,
      entrega2: null,
      entrega2Individual: null,
      entregaFinal: null,
      entregaFinalIndividual: null
    }
  };

  // Signal principal para el estado de la UI
  private _uiState = signal<UIState>({
    cursoActivo: null,
    grupoSeguimientoActivo: null,
    courseStates: {}
  });

  // Exponer como ReadOnlySignal
  public uiState = this._uiState.asReadonly();

  // Compatibilidad con RxJS (Legacy)
  public uiState$ = toObservable(this._uiState);

  constructor() {
    this.loadUIState();
  }

  async loadUIState(): Promise<void> {
    const uiState = await this.storage.get<UIState>(this.STORAGE_KEYS.UI_STATE) || {
      cursoActivo: null,
      grupoSeguimientoActivo: null,
      courseStates: {}
    };
    this._uiState.set(uiState);
  }

  async saveUIState(): Promise<void> {
    await this.storage.set(this.STORAGE_KEYS.UI_STATE, this._uiState());
  }

  getUIStateValue(): UIState {
    return this._uiState();
  }

  updateUIStateState(newState: UIState): void {
    this._uiState.set(newState);
  }

  async updateUIState(newState: Partial<UIState>): Promise<void> {
    const currentState = this._uiState();
    const updatedState = { ...currentState, ...newState } as UIState;
    this._uiState.set(updatedState);
    await this.saveUIState();
  }

  getUIState(): UIState {
    return this._uiState();
  }

  getCourseState(courseId: string): CourseState {
    const uiState = this.getUIState();
    if (!uiState.courseStates[courseId]) {
      // Retornar copia del default para evitar referencias compartidas
      return JSON.parse(JSON.stringify(this.DEFAULT_COURSE_STATE));
    }
    return uiState.courseStates[courseId];
  }

  async updateCourseState(courseId: string, stateUpdates: Partial<CourseState>): Promise<void> {
    const uiState = this.getUIState();
    const currentState = uiState.courseStates[courseId] || JSON.parse(JSON.stringify(this.DEFAULT_COURSE_STATE));

    uiState.courseStates[courseId] = {
      ...currentState,
      ...stateUpdates
    };

    await this.updateUIState(uiState);
  }

  async setCursoActivo(cursoId: string | null): Promise<void> {
    const uiState = this.getUIState();
    uiState.cursoActivo = cursoId;
    await this.updateUIState(uiState);
  }
}
