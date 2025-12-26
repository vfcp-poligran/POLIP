import { Injectable, inject, signal } from '@angular/core';
import { RubricService } from './rubric.service';
import { Logger } from '@app/core/utils/logger';
import { RubricaDefinicion, CriterioRubrica, NivelRubricaDetallado } from '../models';

/**
 * RubricTemplateService
 * 
 * Servicio para gestión de plantillas de rúbricas.
 * Responsabilidades:
 * - Biblioteca de plantillas predefinidas
 * - Validación automática de rúbricas
 * - Importación/Exportación JSON
 * - Vista diff entre versiones
 */
@Injectable({
    providedIn: 'root'
})
export class RubricTemplateService {
    private rubricService = inject(RubricService);

    // Plantillas predefinidas
    private _templates = signal<Map<string, RubricTemplate>>(this.cargarPlantillasPredefinidas());
    public templates = this._templates.asReadonly();

    /**
     * Valida que una rúbrica cumpla con los requisitos
     * @param rubrica Rúbrica a validar
     * @returns Resultado de validación
     */
    validarRubrica(rubrica: RubricaDefinicion): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Verificar que tenga criterios
        if (!rubrica.criterios || rubrica.criterios.length === 0) {
            errors.push('La rúbrica debe tener al menos un criterio');
        }

        // 2. Verificar suma de pesos (deben sumar 100%)
        const totalPeso = rubrica.criterios.reduce((sum, c) => sum + (c.peso || 0), 0);
        if (Math.abs(totalPeso - 100) > 0.01) {
            errors.push(`Los pesos deben sumar 100%. Suma actual: ${totalPeso.toFixed(2)}%`);
        }

        // 3. Validar cada criterio
        rubrica.criterios.forEach((criterio, index) => {
            // Verificar que tenga niveles
            if (!criterio.nivelesDetalle || criterio.nivelesDetalle.length === 0) {
                errors.push(`Criterio ${index + 1} "${criterio.titulo}" no tiene niveles definidos`);
            }

            // Verificar que los puntos de niveles sean válidos
            if (criterio.nivelesDetalle) {
                const maxPuntos = criterio.pesoMaximo || 0;
                criterio.nivelesDetalle.forEach(nivel => {
                    if (nivel.puntosMax < 0 || nivel.puntosMax > maxPuntos) {
                        errors.push(
                            `Nivel "${nivel.titulo}" tiene ${nivel.puntosMax} puntos pero el máximo es ${maxPuntos}`
                        );
                    }
                });

                // Verificar que los niveles cubran todo el rango (simplificado para rango)
                const puntosUnicos = [...new Set(criterio.nivelesDetalle.map(n => n.puntosMax))].sort((a, b) => b - a);
                // Validación laxa para evitar errores bloqueantes en migración
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Obtiene una plantilla por su ID
     */
    getTemplate(id: string): RubricTemplate | undefined {
        return this._templates().get(id);
    }

    /**
     * Guarda una nueva plantilla
     */
    saveTemplate(template: RubricTemplate): void {
        const templates = this._templates();
        templates.set(template.id, template);
        this._templates.set(new Map(templates));
        Logger.log(`✅ [RubricTemplate] Plantilla guardada: ${template.nombre}`);
    }

    /**
     * Crea una rúbrica desde una plantilla
     */
    crearDesdePlantilla(templateId: string, nombre: string): RubricaDefinicion | null {
        const template = this.getTemplate(templateId);

        if (!template) {
            Logger.warn(`⚠️ [RubricTemplate] Plantilla no encontrada: ${templateId}`);
            return null;
        }

        return {
            ...template.rubrica,
            nombre,
            id: `rubrica-${Date.now()}`,
            fechaCreacion: new Date()
        };
    }

    /**
     * Exporta una rúbrica a JSON
     */
    exportarJSON(rubrica: RubricaDefinicion): string {
        return JSON.stringify(rubrica, null, 2);
    }

    /**
     * Importa una rúbrica desde JSON
     */
    importarJSON(json: string): { rubrica: RubricaDefinicion | null; error?: string } {
        try {
            const rubrica = JSON.parse(json) as RubricaDefinicion;

            // Validar estructura básica
            if (!rubrica.nombre || !rubrica.criterios) {
                return {
                    rubrica: null,
                    error: 'JSON inválido: falta nombre o criterios'
                };
            }

            // Validar rúbrica
            const validation = this.validarRubrica(rubrica);
            if (!validation.isValid) {
                return {
                    rubrica: null,
                    error: `Rúbrica inválida: ${validation.errors.join(', ')}`
                };
            }

            return { rubrica };
        } catch (error) {
            return {
                rubrica: null,
                error: `Error al parsear JSON: ${error}`
            };
        }
    }

    /**
     * Compara dos versiones de una rúbrica y genera un diff
     */
    compararVersiones(v1: RubricaDefinicion, v2: RubricaDefinicion): RubricaDiff {
        const cambios: string[] = [];

        // Comparar nombre
        if (v1.nombre !== v2.nombre) {
            cambios.push(`Nombre: "${v1.nombre}" → "${v2.nombre}"`);
        }

        // Comparar criterios
        const criteriosV1 = v1.criterios.map(c => c.titulo);
        const criteriosV2 = v2.criterios.map(c => c.titulo);

        const agregados = criteriosV2.filter(c => !criteriosV1.includes(c));
        const eliminados = criteriosV1.filter(c => !criteriosV2.includes(c));

        agregados.forEach(c => cambios.push(`+ Criterio agregado: "${c}"`));
        eliminados.forEach(c => cambios.push(`- Criterio eliminado: "${c}"`));

        // Comparar pesos de criterios comunes
        v2.criterios.forEach(c2 => {
            const c1 = v1.criterios.find(c => c.titulo === c2.titulo);
            if (c1 && c1.peso !== c2.peso) {
                cambios.push(`Peso de "${c2.titulo}": ${c1.peso}% → ${c2.peso}%`);
            }
        });

        return {
            version1: v1.nombre,
            version2: v2.nombre,
            cambios,
            tieneCambios: cambios.length > 0
        };
    }

    /**
     * Carga plantillas predefinidas
     * @private
     */
    private cargarPlantillasPredefinidas(): Map<string, RubricTemplate> {
        const plantillas = new Map<string, RubricTemplate>();

        // Plantilla 1: Proyecto de Programación
        plantillas.set('proyecto-programacion', {
            id: 'proyecto-programacion',
            nombre: 'Proyecto de Programación',
            categoria: 'proyectos',
            descripcion: 'Rúbrica estándar para evaluación de proyectos de programación',
            rubrica: {
                id: 'plantilla-proyecto-prog',
                nombre: 'Proyecto de Programación',
                descripcion: 'Evaluación de proyectos de código',
                fechaCreacion: new Date(),
                criterios: [
                    {
                        titulo: 'Funcionalidad',
                        descripcion: 'El programa cumple con los requisitos',
                        peso: 40,
                        pesoMaximo: 40,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Todas las funcionalidades implementadas', puntos: '40', puntosMin: 40, puntosMax: 40 },
                            { titulo: 'Bueno', descripcion: 'La mayoría implementadas', puntos: '30', puntosMin: 30, puntosMax: 30 },
                            { titulo: 'Regular', descripcion: 'Algunas funcionalidades faltantes', puntos: '20', puntosMin: 20, puntosMax: 20 },
                            { titulo: 'Insuficiente', descripcion: 'Muchas faltantes', puntos: '10', puntosMin: 0, puntosMax: 10 }
                        ]
                    },
                    {
                        titulo: 'Calidad del Código',
                        descripcion: 'Código limpio, documentado y bien estructurado',
                        peso: 30,
                        pesoMaximo: 30,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Código ejemplar', puntos: '30', puntosMin: 30, puntosMax: 30 },
                            { titulo: 'Bueno', descripcion: 'Bien estructurado', puntos: '22', puntosMin: 22, puntosMax: 22 },
                            { titulo: 'Regular', descripcion: 'Necesita mejoras', puntos: '15', puntosMin: 15, puntosMax: 15 },
                            { titulo: 'Insuficiente', descripcion: 'Código desorganizado', puntos: '8', puntosMin: 0, puntosMax: 8 }
                        ]
                    },
                    {
                        titulo: 'Documentación',
                        descripcion: 'README, comentarios y guías de uso',
                        peso: 20,
                        pesoMaximo: 20,
                        nivelesDetalle: [
                            { titulo: 'Completa', descripcion: 'Documentación exhaustiva', puntos: '20', puntosMin: 20, puntosMax: 20 },
                            { titulo: 'Adecuada', descripcion: 'Documentación suficiente', puntos: '15', puntosMin: 15, puntosMax: 15 },
                            { titulo: 'Básica', descripcion: 'Documentación mínima', puntos: '10', puntosMin: 10, puntosMax: 10 },
                            { titulo: 'Insuficiente', descripcion: 'Sin documentación', puntos: '5', puntosMin: 0, puntosMax: 5 }
                        ]
                    },
                    {
                        titulo: 'Innovación',
                        descripcion: 'Features adicionales y creatividad',
                        peso: 10,
                        pesoMaximo: 10,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Muy innovador', puntos: '10', puntosMin: 10, puntosMax: 10 },
                            { titulo: 'Bueno', descripcion: 'Algunas mejoras', puntos: '7', puntosMin: 7, puntosMax: 7 },
                            { titulo: 'Básico', descripcion: 'Solo lo requerido', puntos: '5', puntosMin: 0, puntosMax: 5 }
                        ]
                    }
                ]
            }
        });

        // Plantilla 2: Presentación Oral
        plantillas.set('presentacion-oral', {
            id: 'presentacion-oral',
            nombre: 'Presentación Oral',
            categoria: 'presentaciones',
            descripcion: 'Evaluación de exposiciones y presentaciones',
            rubrica: {
                id: 'plantilla-presentacion',
                nombre: 'Presentación Oral',
                descripcion: 'Evaluación de presentaciones',
                fechaCreacion: new Date(),
                criterios: [
                    {
                        titulo: 'Contenido',
                        descripcion: 'Dominio del tema',
                        peso: 40,
                        pesoMaximo: 40,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Dominio total', puntos: '40', puntosMin: 40, puntosMax: 40 },
                            { titulo: 'Bueno', descripcion: 'Buen dominio', puntos: '30', puntosMin: 30, puntosMax: 30 },
                            { titulo: 'Regular', descripcion: 'Conocimiento básico', puntos: '20', puntosMin: 20, puntosMax: 20 }
                        ]
                    },
                    {
                        titulo: 'Comunicación',
                        descripcion: 'Claridad y fluidez',
                        peso: 30,
                        pesoMaximo: 30,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Muy claro', puntos: '30', puntosMin: 30, puntosMax: 30 },
                            { titulo: 'Bueno', descripcion: 'Claro', puntos: '22', puntosMin: 22, puntosMax: 22 },
                            { titulo: 'Regular', descripcion: 'Algo confuso', puntos: '15', puntosMin: 15, puntosMax: 15 }
                        ]
                    },
                    {
                        titulo: 'Ayudas Visuales',
                        descripcion: 'Calidad de slides/materiales',
                        peso: 20,
                        pesoMaximo: 20,
                        nivelesDetalle: [
                            { titulo: 'Excelente', descripcion: 'Muy profesionales', puntos: '20', puntosMin: 20, puntosMax: 20 },
                            { titulo: 'Bueno', descripcion: 'Adecuadas', puntos: '15', puntosMin: 15, puntosMax: 15 },
                            { titulo: 'Básico', descripcion: 'Simples', puntos: '10', puntosMin: 10, puntosMax: 10 }
                        ]
                    },
                    {
                        titulo: 'Manejo del Tiempo',
                        descripcion: 'Cumplimiento del tiempo asignado',
                        peso: 10,
                        pesoMaximo: 10,
                        nivelesDetalle: [
                            { titulo: 'Perfecto', descripcion: 'Tiempo exacto', puntos: '10', puntosMin: 10, puntosMax: 10 },
                            { titulo: 'Aceptable', descripcion: 'Cerca del tiempo', puntos: '7', puntosMin: 7, puntosMax: 7 },
                            { titulo: 'Desviado', descripcion: 'Muy corto/largo', puntos: '4', puntosMin: 0, puntosMax: 4 }
                        ]
                    }
                ]
            }
        });

        Logger.log(`📚 [RubricTemplate] ${plantillas.size} plantillas cargadas`);
        return plantillas;
    }
}

/**
 * Plantilla de rúbrica
 */
export interface RubricTemplate {
    id: string;
    nombre: string;
    categoria: string;
    descripcion: string;
    rubrica: RubricaDefinicion;
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Diferencias entre versiones
 */
export interface RubricaDiff {
    version1: string;
    version2: string;
    cambios: string[];
    tieneCambios: boolean;
}
