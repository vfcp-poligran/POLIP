import { TestBed } from '@angular/core/testing';
import { RubricService } from './rubric.service';
import { UnifiedStorageService } from './unified-storage.service';
import { RubricaDefinicion, TipoRubrica, TipoEntrega } from '../models';

describe('RubricService', () => {
    let service: RubricService;
    let storageSpy: jasmine.SpyObj<UnifiedStorageService>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('UnifiedStorageService', ['get', 'set', 'remove', 'init']);

        TestBed.configureTestingModule({
            providers: [
                RubricService,
                { provide: UnifiedStorageService, useValue: spy }
            ]
        });

        service = TestBed.inject(RubricService);
        storageSpy = TestBed.inject(UnifiedStorageService) as jasmine.SpyObj<UnifiedStorageService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadRubricas', () => {
        it('should load rubricas from storage', async () => {
            const mockRubricas: RubricaDefinicion[] = [
                {
                    id: 'RUB001',
                    codigo: 'RGE1-EPM',
                    nombre: 'Rúbrica Grupal E1',
                    tipo: 'grupal' as TipoRubrica,
                    entrega: 'E1' as TipoEntrega,
                    criterios: [],
                    escalaCalificacion: {
                        excelente: { min: 90, max: 100 },
                        bueno: { min: 75, max: 89 },
                        aceptable: { min: 60, max: 74 },
                        deficiente: { min: 0, max: 59 }
                    },
                    puntajeMaximo: 100,
                    activa: true,
                    version: 1,
                    fechaCreacion: new Date().toISOString(),
                    fechaModificacion: new Date().toISOString()
                }
            ];

            storageSpy.get.and.returnValue(Promise.resolve(mockRubricas));

            await service.loadRubricas();

            expect(storageSpy.get).toHaveBeenCalledWith('rubricDefinitionsData');
            expect(service.getRubricasValue()).toEqual(mockRubricas);
        });

        it('should initialize with empty array if no data in storage', async () => {
            storageSpy.get.and.returnValue(Promise.resolve(null));

            await service.loadRubricas();

            expect(service.getRubricasValue()).toEqual([]);
        });
    });

    describe('getRubricaById', () => {
        it('should return rubrica when found', () => {
            const mockRubrica: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Test Rubrica',
                tipo: 'grupal' as TipoRubrica,
                entrega: 'E1' as TipoEntrega,
                criterios: [],
                escalaCalificacion: {
                    excelente: { min: 90, max: 100 },
                    bueno: { min: 75, max: 89 },
                    aceptable: { min: 60, max: 74 },
                    deficiente: { min: 0, max: 59 }
                },
                puntajeMaximo: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            service['_rubricas'].set([mockRubrica]);

            const result = service.getRubricaById('RUB001');
            expect(result).toEqual(mockRubrica);
        });

        it('should return undefined when rubrica not found', () => {
            service['_rubricas'].set([]);

            const result = service.getRubricaById('NON_EXISTENT');
            expect(result).toBeUndefined();
        });
    });

    describe('saveRubrica', () => {
        it('should add new rubrica to the list', async () => {
            const newRubrica: RubricaDefinicion = {
                id: 'RUB002',
                codigo: 'RGE2-EPM',
                nombre: 'New Rubrica',
                tipo: 'grupal' as TipoRubrica,
                entrega: 'E2' as TipoEntrega,
                criterios: [],
                escalaCalificacion: {
                    excelente: { min: 90, max: 100 },
                    bueno: { min: 75, max: 89 },
                    aceptable: { min: 60, max: 74 },
                    deficiente: { min: 0, max: 59 }
                },
                puntajeMaximo: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            service['_rubricas'].set([]);
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.saveRubrica(newRubrica);

            const rubricas = service.getRubricasValue();
            expect(rubricas.length).toBe(1);
            expect(rubricas[0]).toEqual(newRubrica);
            expect(storageSpy.set).toHaveBeenCalled();
        });

        it('should update existing rubrica', async () => {
            const existingRubrica: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Old Name',
                tipo: 'grupal' as TipoRubrica,
                entrega: 'E1' as TipoEntrega,
                criterios: [],
                escalaCalificacion: {
                    excelente: { min: 90, max: 100 },
                    bueno: { min: 75, max: 89 },
                    aceptable: { min: 60, max: 74 },
                    deficiente: { min: 0, max: 59 }
                },
                puntajeMaximo: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            const updatedRubrica: RubricaDefinicion = {
                ...existingRubrica,
                nombre: 'Updated Name',
                version: 2
            };

            service['_rubricas'].set([existingRubrica]);
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.saveRubrica(updatedRubrica);

            const rubricas = service.getRubricasValue();
            expect(rubricas.length).toBe(1);
            expect(rubricas[0].nombre).toBe('Updated Name');
            expect(rubricas[0].version).toBe(2);
        });
    });

    describe('deleteRubrica', () => {
        it('should remove rubrica from list', async () => {
            const rubrica1: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Rubrica 1',
                tipo: 'grupal' as TipoRubrica,
                entrega: 'E1' as TipoEntrega,
                criterios: [],
                escalaCalificacion: {
                    excelente: { min: 90, max: 100 },
                    bueno: { min: 75, max: 89 },
                    aceptable: { min: 60, max: 74 },
                    deficiente: { min: 0, max: 59 }
                },
                puntajeMaximo: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date().toISOString(),
                fechaModificacion: new Date().toISOString()
            };

            const rubrica2: RubricaDefinicion = {
                ...rubrica1,
                id: 'RUB002',
                nombre: 'Rubrica 2'
            };

            service['_rubricas'].set([rubrica1, rubrica2]);
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.deleteRubrica('RUB001');

            const rubricas = service.getRubricasValue();
            expect(rubricas.length).toBe(1);
            expect(rubricas[0].id).toBe('RUB002');
            expect(storageSpy.set).toHaveBeenCalled();
        });
    });
});
