import { TestBed } from '@angular/core/testing';
import { EvaluationService } from './evaluation.service';
import { UnifiedStorageService } from './unified-storage.service';
import { Evaluacion } from '../models';

describe('EvaluationService', () => {
    let service: EvaluationService;
    let storageSpy: jasmine.SpyObj<UnifiedStorageService>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('UnifiedStorageService', ['get', 'set', 'remove', 'init']);

        TestBed.configureTestingModule({
            providers: [
                EvaluationService,
                { provide: UnifiedStorageService, useValue: spy }
            ]
        });

        service = TestBed.inject(EvaluationService);
        storageSpy = TestBed.inject(UnifiedStorageService) as jasmine.SpyObj<UnifiedStorageService>;
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
                    identificador: 'G1',
                    criteriosEvaluados: [],
                    puntajeTotal: 85,
                    estado: 'completada',
                    fechaEvaluacion: new Date().toISOString(),
                    evaluadorId: 'profesor1'
                }
            };

            storageSpy.get.and.returnValue(Promise.resolve(mockEvaluaciones));

            await service.loadEvaluaciones();

            expect(storageSpy.get).toHaveBeenCalledWith('evaluacionesData');
            expect(service.getEvaluacionesValue()).toEqual(mockEvaluaciones);
        });

        it('should initialize with empty object if no data in storage', async () => {
            storageSpy.get.and.returnValue(Promise.resolve(null));

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
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 85,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
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
                identificador: 'G2',
                criteriosEvaluados: [],
                puntajeTotal: 90,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            service['_evaluaciones'].set({});
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.guardarEvaluacion(newEvaluacion, 'EPM-B01_E2_PG_G2');

            const evaluaciones = service.getEvaluacionesValue();
            expect(evaluaciones['EPM-B01_E2_PG_G2']).toEqual(newEvaluacion);
            expect(storageSpy.set).toHaveBeenCalled();
        });

        it('should update existing evaluacion', async () => {
            const existingEvaluacion: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 85,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            const updatedEvaluacion: Evaluacion = {
                ...existingEvaluacion,
                puntajeTotal: 95,
                estado: 'revisada'
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': existingEvaluacion
            });
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.guardarEvaluacion(updatedEvaluacion, 'EPM-B01_E1_PG_G1');

            const evaluaciones = service.getEvaluacionesValue();
            expect(evaluaciones['EPM-B01_E1_PG_G1'].puntajeTotal).toBe(95);
            expect(evaluaciones['EPM-B01_E1_PG_G1'].estado).toBe('revisada');
        });
    });

    describe('borrarEvaluacion', () => {
        it('should remove evaluacion from storage', async () => {
            const evaluacion1: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 85,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            const evaluacion2: Evaluacion = {
                ...evaluacion1,
                identificador: 'G2'
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': evaluacion1,
                'EPM-B01_E1_PG_G2': evaluacion2
            });
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.borrarEvaluacion('EPM-B01_E1_PG_G1');

            const evaluaciones = service.getEvaluacionesValue();
            expect(evaluaciones['EPM-B01_E1_PG_G1']).toBeUndefined();
            expect(evaluaciones['EPM-B01_E1_PG_G2']).toBeDefined();
            expect(storageSpy.set).toHaveBeenCalled();
        });
    });

    describe('borrarEvaluacionesPorCurso', () => {
        it('should remove all evaluaciones for a specific course', async () => {
            const evaluacionEPM1: Evaluacion = {
                cursoNombre: 'EPM-B01',
                entrega: 'E1',
                tipo: 'PG',
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 85,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            const evaluacionEPM2: Evaluacion = {
                ...evaluacionEPM1,
                entrega: 'E2'
            };

            const evaluacionSO: Evaluacion = {
                cursoNombre: 'SO-B02',
                entrega: 'E1',
                tipo: 'PG',
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 90,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            service['_evaluaciones'].set({
                'EPM-B01_E1_PG_G1': evaluacionEPM1,
                'EPM-B01_E2_PG_G1': evaluacionEPM2,
                'SO-B02_E1_PG_G1': evaluacionSO
            });
            storageSpy.set.and.returnValue(Promise.resolve());

            const eliminadas = await service.borrarEvaluacionesPorCurso('EPM-B01');

            expect(eliminadas).toBe(2);
            const evaluaciones = service.getEvaluacionesValue();
            expect(Object.keys(evaluaciones).length).toBe(1);
            expect(evaluaciones['SO-B02_E1_PG_G1']).toBeDefined();
            expect(storageSpy.set).toHaveBeenCalled();
        });

        it('should return 0 when no evaluaciones match the course', async () => {
            const evaluacionSO: Evaluacion = {
                cursoNombre: 'SO-B02',
                entrega: 'E1',
                tipo: 'PG',
                identificador: 'G1',
                criteriosEvaluados: [],
                puntajeTotal: 90,
                estado: 'completada',
                fechaEvaluacion: new Date().toISOString(),
                evaluadorId: 'profesor1'
            };

            service['_evaluaciones'].set({
                'SO-B02_E1_PG_G1': evaluacionSO
            });
            storageSpy.set.and.returnValue(Promise.resolve());

            const eliminadas = await service.borrarEvaluacionesPorCurso('EPM-B01');

            expect(eliminadas).toBe(0);
            expect(storageSpy.set).not.toHaveBeenCalled();
        });
    });

    describe('saveEvaluaciones', () => {
        it('should save evaluaciones to storage', async () => {
            const mockEvaluaciones: { [key: string]: Evaluacion } = {
                'EPM-B01_E1_PG_G1': {
                    cursoNombre: 'EPM-B01',
                    entrega: 'E1',
                    tipo: 'PG',
                    identificador: 'G1',
                    criteriosEvaluados: [],
                    puntajeTotal: 85,
                    estado: 'completada',
                    fechaEvaluacion: new Date().toISOString(),
                    evaluadorId: 'profesor1'
                }
            };

            storageSpy.set.and.returnValue(Promise.resolve());

            await service.saveEvaluaciones(mockEvaluaciones);

            expect(storageSpy.set).toHaveBeenCalledWith('evaluacionesData', mockEvaluaciones);
            expect(service.getEvaluacionesValue()).toEqual(mockEvaluaciones);
        });
    });
});
