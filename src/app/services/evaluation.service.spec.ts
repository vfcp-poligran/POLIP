import { TestBed } from '@angular/core/testing';
import { EvaluationService } from './evaluation.service';
import { UnifiedStorageService } from './unified-storage.service';
import { Evaluacion } from '../models';

describe('EvaluationService', () => {
    let service: EvaluationService;
    let storageMock: jest.Mocked<UnifiedStorageService>;

    beforeEach(() => {
        storageMock = {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            init: jest.fn()
        } as any;

        TestBed.configureTestingModule({
            providers: [
                EvaluationService,
                { provide: UnifiedStorageService, useValue: storageMock }
            ]
        });

        service = TestBed.inject(EvaluationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadEvaluaciones', () => {
        it('should load evaluaciones from storage', async () => {
            const mockEvaluaciones: { [key: string]: Evaluacion } = {
                'EPM-B01_E1_PG_G1': {
                    cursoNombre: 'EPM-B01',
                    entrega: 'E1',
                    tipo: 'PG',
                    identificador: 'G1', // This property doesn't exist in model, will fix
                    criteriosEvaluados: [], // This name changed to criteria in saved but Evaluacion interface has 'criterios'
                    puntajeTotal: 85, // This is 'puntosTotales' in model
                    estado: 'completada', // This doesn't exist in Evaluacion model
                    fechaEvaluacion: new Date(),
                    evaluadorId: 'profesor1', // This doesn't exist in Evaluacion model
                    rubricaId: 'RUB001',
                    criterios: []
                } as any
            };

            storageMock.get.mockResolvedValue(mockEvaluaciones);

            await service.loadEvaluaciones();

            expect(storageMock.get).toHaveBeenCalledWith('evaluacionesData');
            expect(service.getEvaluacionesValue()).toEqual(mockEvaluaciones);
        });

        it('should initialize with empty object if no data in storage', async () => {
            storageMock.get.mockResolvedValue(null);

            await service.loadEvaluaciones();

            expect(service.getEvaluacionesValue()).toEqual({});
        });
    });

    describe('getEvaluacion', () => {
        it('should return evaluacion when found', () => {
            const mockEvaluacion: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                rubricaId: 'RUB001',
                criterios: [],
                puntosTotales: 85,
                fechaEvaluacion: new Date()
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': mockEvaluacion
            });

            const result = service.getEvaluacion('EPM-B01_E1_PG_G1');
            expect(result).toEqual(mockEvaluacion);
        });

        it('should return undefined when evaluacion not found', () => {
            service['_evaluaciones'].set({});

            const result = service.getEvaluacion('NON_EXISTENT');
            expect(result).toBeUndefined();
        });
    });

    describe('guardarEvaluacion', () => {
        it('should add new evaluacion', async () => {
            const newEvaluacion: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E2',
                tipo: 'PG',
                rubricaId: 'RUB001',
                criterios: [],
                puntosTotales: 90,
                fechaEvaluacion: new Date()
            };

            service['_evaluaciones'].set({});
            storageMock.set.mockResolvedValue(undefined);

            await service.guardarEvaluacion(newEvaluacion, 'EPM-B01_E2_PG_G2');

            const evaluaciones = service.getEvaluacionesValue();
            expect(evaluaciones['EPM-B01_E2_PG_G2']).toEqual(newEvaluacion);
            expect(storageMock.set).toHaveBeenCalled();
        });
    });

    describe('borrarEvaluacion', () => {
        it('should remove evaluacion from storage', async () => {
            const evaluacion1: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                rubricaId: 'RUB001',
                criterios: [],
                puntosTotales: 85,
                fechaEvaluacion: new Date()
            };

            const evaluacion2: Evaluacion = {
                ...evaluacion1,
                puntosTotales: 90
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': evaluacion1,
                'EPM-B01_E1_PG_G2': evaluacion2
            });
            storageMock.set.mockResolvedValue(undefined);

            await service.borrarEvaluacion('EPM-B01_E1_PG_G1');

            const evaluaciones = service.getEvaluacionesValue();
            expect(evaluaciones['EPM-B01_E1_PG_G1']).toBeUndefined();
            expect(evaluaciones['EPM-B01_E1_PG_G2']).toBeDefined();
            expect(storageMock.set).toHaveBeenCalled();
        });
    });

    describe('borrarEvaluacionesPorCurso', () => {
        it('should remove all evaluaciones for a specific course', async () => {
            const evaluacionEPM1: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                rubricaId: 'RUB001',
                criterios: [],
                puntosTotales: 85,
                fechaEvaluacion: new Date()
            };

            const evaluacionSO: Evaluacion = {
                cursoNombre: 'SO-B02',
                entrega: 'E1',
                tipo: 'PG',
                rubricaId: 'RUB001',
                criterios: [],
                puntosTotales: 90,
                fechaEvaluacion: new Date()
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': evaluacionEPM1,
                'SO-B02_E1_PG_G1': evaluacionSO
            });
            storageMock.set.mockResolvedValue(undefined);

            const eliminadas = await service.borrarEvaluacionesPorCurso('EPM-B01');

            expect(eliminadas).toBe(1);
            const evaluaciones = service.getEvaluacionesValue();
            expect(Object.keys(evaluaciones).length).toBe(1);
            expect(storageMock.set).toHaveBeenCalled();
        });
    });
});
