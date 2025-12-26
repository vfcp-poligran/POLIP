import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TabsPage } from './tabs.page';
import { DataService } from '../services/data.service';
import { SeguimientoService } from '../services/seguimiento.service';
import { FullscreenService } from '../services/fullscreen.service';
import { NovedadService } from '../services/novedad.service';
import { signal } from '@angular/core';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;
  let dataServiceMock: any;
  let seguimientoServiceMock: any;
  let fullscreenServiceMock: any;
  let novedadServiceMock: any;

  beforeEach(async () => {
    dataServiceMock = {
      uiState: signal({ cursoActivo: null }),
      cursos: signal({}),
      searchResults: signal({ results: [], term: '' }),
      getCourseState: jest.fn().mockReturnValue({}),
      setGlobalSearchTerm: jest.fn(),
      searchAcrossAllCourses: jest.fn(),
      searchBarVisible: signal(false)
    };

    seguimientoServiceMock = {
      seguimientoActual: signal(null),
      grupoSeleccionado: signal(0),
      grupoVisualizado: signal(0),
      setGrupoSeleccionado: jest.fn()
    };

    fullscreenServiceMock = {
      isFullscreen: signal(false)
    };

    novedadServiceMock = {
      novedadesPendientes: signal([]),
      getTipoConfig: jest.fn().mockReturnValue({ icono: 'doc', color: 'blue' })
    };

    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [
        provideRouter([]),
        { provide: DataService, useValue: dataServiceMock },
        { provide: SeguimientoService, useValue: seguimientoServiceMock },
        { provide: FullscreenService, useValue: fullscreenServiceMock },
        { provide: NovedadService, useValue: novedadServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
