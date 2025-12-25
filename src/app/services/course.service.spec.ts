import { TestBed } from '@angular/core/testing';
import { CourseService } from './course.service';
import { UnifiedStorageService } from './unified-storage.service';

describe('CourseService', () => {
    let service: CourseService;
    let storageSpy: jasmine.SpyObj<UnifiedStorageService>;

    beforeEach(() => {
        // Crear spy del storage service
        const spy = jasmine.createSpyObj('UnifiedStorageService', ['get', 'set', 'remove', 'init']);

        TestBed.configureTestingModule({
            providers: [
                CourseService,
                { provide: UnifiedStorageService, useValue: spy }
            ]
        });

        service = TestBed.inject(CourseService);
        storageSpy = TestBed.inject(UnifiedStorageService) as jasmine.SpyObj<UnifiedStorageService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('extraerCodigoBaseCurso', () => {
        it('should extract base code from full course code', () => {
            expect(service.extraerCodigoBaseCurso('EPM-B01-BLQ2-V')).toBe('EPM');
            expect(service.extraerCodigoBaseCurso('SO-B09-BLQ2')).toBe('SO');
            expect(service.extraerCodigoBaseCurso('BD-B05')).toBe('BD');
        });

        it('should handle codes without dashes', () => {
            expect(service.extraerCodigoBaseCurso('EPM')).toBe('EPM');
        });

        it('should handle empty strings', () => {
            expect(service.extraerCodigoBaseCurso('')).toBe('');
        });
    });

    describe('getCurso', () => {
        it('should return undefined for non-existent course', () => {
            const result = service.getCurso('NON_EXISTENT');
            expect(result).toBeUndefined();
        });

        it('should return course data when course exists', () => {
            // Setup: agregar un curso al signal
            const mockEstudiantes = [
                {
                    correo: 'test@test.com',
                    nombres: 'Test',
                    apellidos: 'User',
                    grupo: '1'
                }
            ];

            // Simular que el curso existe
            service['_cursos'].set({
                'TEST-COURSE': mockEstudiantes
            });

            const result = service.getCurso('TEST-COURSE');
            expect(result).toEqual(mockEstudiantes);
        });
    });

    describe('loadCursos', () => {
        it('should load courses from storage', async () => {
            const mockCursos = {
                'EPM-B01': [{ correo: 'test@test.com', nombres: 'Test', apellidos: 'User', grupo: '1' }]
            };

            storageSpy.get.and.returnValue(Promise.resolve(mockCursos));

            await service.loadCursos();

            expect(storageSpy.get).toHaveBeenCalledWith('gestorCursosData');
            expect(service.getCursosValue()).toEqual(mockCursos);
        });

        it('should initialize with empty object if no data in storage', async () => {
            storageSpy.get.and.returnValue(Promise.resolve(null));

            await service.loadCursos();

            expect(service.getCursosValue()).toEqual({});
        });
    });

    describe('saveCursos', () => {
        it('should save courses to storage', async () => {
            const mockCursos = {
                'EPM-B01': [{ correo: 'test@test.com', nombres: 'Test', apellidos: 'User', grupo: '1' }]
            };

            storageSpy.set.and.returnValue(Promise.resolve());

            await service.saveCursos(mockCursos);

            expect(storageSpy.set).toHaveBeenCalledWith('gestorCursosData', mockCursos);
            expect(service.getCursosValue()).toEqual(mockCursos);
        });
    });

    describe('actualizarEstudiantesCurso', () => {
        it('should update students for a course', async () => {
            const initialCursos = {
                'EPM-B01': [{ correo: 'old@test.com', nombres: 'Old', apellidos: 'User', grupo: '1' }]
            };

            const newEstudiantes = [
                { correo: 'new@test.com', nombres: 'New', apellidos: 'User', grupo: '1' }
            ];

            service['_cursos'].set(initialCursos);
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.actualizarEstudiantesCurso('EPM-B01', newEstudiantes);

            const updatedCursos = service.getCursosValue();
            expect(updatedCursos['EPM-B01']).toEqual(newEstudiantes);
            expect(storageSpy.set).toHaveBeenCalled();
        });
    });

    describe('eliminarCursoData', () => {
        it('should remove course from data', async () => {
            const initialCursos = {
                'EPM-B01': [{ correo: 'test@test.com', nombres: 'Test', apellidos: 'User', grupo: '1' }],
                'SO-B02': [{ correo: 'test2@test.com', nombres: 'Test2', apellidos: 'User2', grupo: '1' }]
            };

            service['_cursos'].set(initialCursos);
            storageSpy.set.and.returnValue(Promise.resolve());

            await service.eliminarCursoData('EPM-B01');

            const updatedCursos = service.getCursosValue();
            expect(updatedCursos['EPM-B01']).toBeUndefined();
            expect(updatedCursos['SO-B02']).toBeDefined();
            expect(storageSpy.set).toHaveBeenCalled();
        });
    });
});
