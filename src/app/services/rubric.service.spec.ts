import { TestBed } from '@angular/core/testing';
import { RubricService } from './rubric.service';
import { UnifiedStorageService } from './unified-storage.service';
import { RubricaDefinicion } from '../models';

describe('RubricService', () => {
    let service: RubricService;
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
                RubricService,
                { provide: UnifiedStorageService, useValue: storageMock }
            ]
        });

        service = TestBed.inject(RubricService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('loadRubricas', () => {
        it('should load rubricas from storage', async () => {
            const mockRubricas: { [key: string]: RubricaDefinicion } = {
                'RUB001': {
                    id: 'RUB001',
                    codigo: 'RGE1-EPM',
                    nombre: 'Rúbrica Grupal E1',
                    tipoRubrica: 'PG',
                    tipoEntrega: 'E1',
                    descripcion: 'Test Desc',
                    criterios: [],
                    escalaCalificacion: [],
                    puntuacionTotal: 100,
                    activa: true,
                    version: 1,
                    fechaCreacion: new Date(),
                    fechaModificacion: new Date()
                }
            };

            storageMock.get.mockResolvedValue(mockRubricas);

            await service.loadRubricas();

            expect(storageMock.get).toHaveBeenCalledWith('rubricDefinitionsData');
            expect(service.rubricasValue).toEqual(mockRubricas);
        });

        it('should initialize with empty object if no data in storage', async () => {
            storageMock.get.mockResolvedValue(null);

            await service.loadRubricas();

            expect(service.rubricasValue).toEqual({});
        });
    });

    describe('getRubrica', () => {
        it('should return rubrica when found', () => {
            const mockRubrica: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Test Rubrica',
                tipoRubrica: 'PG',
                tipoEntrega: 'E1',
                descripcion: 'Test Desc',
                criterios: [],
                escalaCalificacion: [],
                puntuacionTotal: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date(),
                fechaModificacion: new Date()
            };

            service.updateRubricasState({ 'RUB001': mockRubrica });

            const result = service.getRubrica('RUB001');
            expect(result).toEqual(mockRubrica);
        });

        it('should return undefined when rubrica not found', () => {
            service.updateRubricasState({});

            const result = service.getRubrica('NON_EXISTENT');
            expect(result).toBeUndefined();
        });
    });

    describe('guardarRubrica', () => {
        it('should add new rubrica to the list', async () => {
            const newRubrica: RubricaDefinicion = {
                id: 'RUB002',
                codigo: 'RGE2-EPM',
                nombre: 'New Rubrica',
                tipoRubrica: 'PG',
                tipoEntrega: 'E2',
                descripcion: 'Test Desc',
                criterios: [],
                escalaCalificacion: [],
                puntuacionTotal: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date(),
                fechaModificacion: new Date()
            };

            service.updateRubricasState({});
            storageMock.set.mockResolvedValue(undefined);

            await service.guardarRubrica(newRubrica);

            const rubricas = service.rubricasValue;
            expect(rubricas['RUB002']).toMatchObject({
                id: 'RUB002',
                codigo: 'RGE2-EPM',
                nombre: 'New Rubrica'
            });
            expect(storageMock.set).toHaveBeenCalled();
        });

        it('should update existing rubrica', async () => {
            const existingRubrica: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Old Name',
                tipoRubrica: 'PG',
                tipoEntrega: 'E1',
                descripcion: 'Test Desc',
                criterios: [],
                escalaCalificacion: [],
                puntuacionTotal: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date(),
                fechaModificacion: new Date()
            };

            const updatedRubrica: RubricaDefinicion = {
                ...existingRubrica,
                nombre: 'Updated Name',
                version: 2
            };

            service.updateRubricasState({ 'RUB001': existingRubrica });
            storageMock.set.mockResolvedValue(undefined);

            await service.guardarRubrica(updatedRubrica);

            const rubricas = service.rubricasValue;
            expect(rubricas['RUB001'].nombre).toBe('Updated Name');
            expect(rubricas['RUB001'].version).toBe(2);
        });
    });

    describe('eliminarRubrica', () => {
        it('should remove rubrica from list', async () => {
            const rubrica1: RubricaDefinicion = {
                id: 'RUB001',
                codigo: 'RGE1-EPM',
                nombre: 'Rubrica 1',
                tipoRubrica: 'PG',
                tipoEntrega: 'E1',
                descripcion: 'Test Desc',
                criterios: [],
                escalaCalificacion: [],
                puntuacionTotal: 100,
                activa: true,
                version: 1,
                fechaCreacion: new Date(),
                fechaModificacion: new Date()
            };

            const rubrica2: RubricaDefinicion = {
                ...rubrica1,
                id: 'RUB002',
                nombre: 'Rubrica 2'
            };

            service.updateRubricasState({
                'RUB001': rubrica1,
                'RUB002': rubrica2
            });
            storageMock.set.mockResolvedValue(undefined);

            await service.eliminarRubrica('RUB001');

            const rubricas = service.rubricasValue;
            expect(rubricas['RUB001']).toBeUndefined();
            expect(rubricas['RUB002']).toBeDefined();
            expect(storageMock.set).toHaveBeenCalled();
        });
    });
});
