import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UnifiedStorageService } from './unified-storage.service';
import { Logger } from '@app/core/utils/logger';
import {
  RubricaDefinicion,
  TipoRubrica,
  TipoEntrega
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class RubricService {
  private storage = inject(UnifiedStorageService);
  
  private readonly STORAGE_KEY = 'rubricDefinitionsData';

  private rubricasSubject = new BehaviorSubject<{ [key: string]: RubricaDefinicion }>({});
  public rubricas$ = this.rubricasSubject.asObservable();

  get rubricasValue(): { [key: string]: RubricaDefinicion } {
    return this.rubricasSubject.value;
  }

  updateRubricasState(rubricas: { [key: string]: RubricaDefinicion }): void {
    this.rubricasSubject.next(rubricas);
  }

  constructor() {
    this.loadRubricas();
  }

  async loadRubricas(): Promise<void> {
    let rubricas = await this.storage.get<{ [key: string]: RubricaDefinicion }>(this.STORAGE_KEY);

    if (!rubricas) {
      rubricas = {} as { [key: string]: RubricaDefinicion };
      await this.storage.set(this.STORAGE_KEY, rubricas);
    } else {
      // Migrar rúbricas existentes sin código estructurado
      let huboCambios = false;
      for (const id of Object.keys(rubricas)) {
        const rubrica = rubricas[id];
        if (!rubrica.codigo && rubrica.tipoRubrica && rubrica.tipoEntrega) {
          const codigoInfo = this.generarCodigoRubrica(rubrica);
          rubrica.codigo = codigoInfo.codigo;
          rubrica.version = codigoInfo.version;
          rubrica.timestamp = Date.now();
          rubrica.activa = rubrica.activa ?? true; // Por defecto activa
          huboCambios = true;
          Logger.log(`📝 Migrada rúbrica ${id} -> código: ${rubrica.codigo}`);
        }
      }

      if (huboCambios) {
        await this.storage.set(this.STORAGE_KEY, rubricas);
        Logger.log('✅ Rúbricas migradas con códigos estructurados');
      }
    }

    this.rubricasSubject.next(rubricas);
  }

  getRubrica(id: string): RubricaDefinicion | undefined {
    const rubricas = this.rubricasSubject.value;
    const rubrica = rubricas[id];

    if (!rubrica) {
      Logger.warn(`⚠️ [RubricService.getRubrica] Rúbrica no encontrada con ID: ${id}`);
    }

    return rubrica;
  }

  obtenerRubricasArray(): RubricaDefinicion[] {
    return Object.values(this.rubricasSubject.value);
  }

  async guardarRubrica(rubrica: RubricaDefinicion): Promise<void> {
    const rubricas = this.rubricasSubject.value;

    if (!rubrica.fechaCreacion) {
      rubrica.fechaCreacion = new Date();
    }
    rubrica.fechaModificacion = new Date();

    // Generar código estructurado y versión si no existe
    if (!rubrica.codigo) {
      const codigoInfo = this.generarCodigoRubrica(rubrica);
      rubrica.codigo = codigoInfo.codigo;
      rubrica.version = codigoInfo.version;
      rubrica.timestamp = Date.now();
      rubrica.activa = rubrica.activa ?? true; // Por defecto nueva rúbrica está activa
    }

    // Si la rúbrica se está activando, desactivar otras del mismo tipo/entrega/curso
    if (rubrica.activa) {
      this.desactivarRubricasMismaCategoria(rubricas, rubrica);
    }

    rubricas[rubrica.id] = rubrica;

    await this.storage.set(this.STORAGE_KEY, rubricas);
    this.rubricasSubject.next(rubricas);
  }

  async eliminarRubrica(id: string): Promise<void> {
    const rubricas = this.rubricasSubject.value;
    if (rubricas[id]) {
      delete rubricas[id];
      await this.storage.set(this.STORAGE_KEY, rubricas);
      this.rubricasSubject.next(rubricas);
      Logger.log(`🗑️ Rúbrica eliminada: ${id}`);
    }
  }

  async activarRubrica(rubricaId: string): Promise<void> {
    const rubricas = this.rubricasSubject.value;
    const rubrica = rubricas[rubricaId];

    if (!rubrica) {
      throw new Error(`Rúbrica no encontrada: ${rubricaId}`);
    }

    // Desactivar otras de la misma categoría
    this.desactivarRubricasMismaCategoria(rubricas, rubrica);

    // Activar la rúbrica seleccionada
    rubrica.activa = true;
    rubrica.fechaModificacion = new Date();

    await this.storage.set(this.STORAGE_KEY, rubricas);
    this.rubricasSubject.next(rubricas);

    Logger.log(`✅ Rúbrica "${rubrica.nombre}" (v${rubrica.version}) activada`);
  }

  async activarVersionRubrica(rubricaId: string): Promise<void> {
    const rubricas = this.rubricasSubject.value;
    const rubricaActivar = rubricas[rubricaId];

    if (!this.esRubricaValida(rubricaActivar)) {
      Logger.warn('⚠️ No se puede activar: rúbrica no encontrada o sin código válido');
      return;
    }

    const codigoBase = this.extraerCodigoBase(rubricaActivar.codigo!);
    if (!codigoBase) {
      Logger.warn('⚠️ Código de rúbrica inválido');
      return;
    }

    const versionesActualizadas = this.actualizarEstadoVersiones(rubricas, codigoBase, rubricaId);

    await this.storage.set(this.STORAGE_KEY, rubricas);
    this.rubricasSubject.next(rubricas);

    Logger.log(`✅ Versión ${rubricaActivar.codigo} activada. ${versionesActualizadas - 1} versiones desactivadas.`);
  }

  private esRubricaValida(rubrica: RubricaDefinicion | undefined): rubrica is RubricaDefinicion {
    return !!rubrica && !!rubrica.codigo;
  }

  private actualizarEstadoVersiones(
    rubricas: Record<string, RubricaDefinicion>,
    codigoBase: string,
    rubricaIdActiva: string
  ): number {
    // Patrón para nuevo formato: RGE1-EPMV
    const patronNuevo = `${codigoBase}V`;
    // Patrón para formato anterior: RGE1-EPM-
    const patronAnterior = `${codigoBase}-`;
    let contador = 0;

    Object.values(rubricas).forEach(rubrica => {
      // Verificar si es el código base exacto O si empieza con los patrones de versión
      const esVersion = rubrica.codigo === codigoBase || 
                        rubrica.codigo?.startsWith(patronNuevo) || 
                        rubrica.codigo?.startsWith(patronAnterior);

      if (esVersion) {
        rubrica.activa = rubrica.id === rubricaIdActiva;
        rubrica.fechaModificacion = new Date();
        contador++;
      }
    });

    return contador;
  }

  private desactivarRubricasMismaCategoria(
    rubricas: Record<string, RubricaDefinicion>,
    rubricaActiva: RubricaDefinicion
  ): void {
    const { tipoRubrica, tipoEntrega, cursosCodigos } = rubricaActiva;
    const cursoPrincipal = cursosCodigos?.[0];

    // Obtener código base si existe
    const codigoBase = rubricaActiva.codigo ? this.extraerCodigoBase(rubricaActiva.codigo) : null;

    if (!tipoRubrica || !tipoEntrega || !cursoPrincipal) return;

    Object.values(rubricas).forEach(r => {
      // No desactivar la misma rúbrica
      if (r.id === rubricaActiva.id) return;

      // Verificar si es de la misma categoría por código base O por tipo+entrega+curso
      const mismoCodigoBase = codigoBase && r.codigo && this.extraerCodigoBase(r.codigo) === codigoBase;
      const mismaCategoria =
        r.tipoRubrica === tipoRubrica &&
        r.tipoEntrega === tipoEntrega &&
        r.cursosCodigos?.includes(cursoPrincipal);

      if ((mismoCodigoBase || mismaCategoria) && r.activa) {
        r.activa = false;
        Logger.log(`📋 Rúbrica "${r.nombre}" (v${r.version}) desactivada - misma categoría que "${rubricaActiva.nombre}"`);
      }
    });
  }

  obtenerRubricasMismaCategoria(rubrica: RubricaDefinicion): RubricaDefinicion[] {
    const rubricas = this.obtenerRubricasArray();
    const cursoPrincipal = rubrica.cursosCodigos?.[0];

    if (!rubrica.tipoRubrica || !rubrica.tipoEntrega || !cursoPrincipal) {
      return [];
    }

    return rubricas.filter(r =>
      r.tipoRubrica === rubrica.tipoRubrica &&
      r.tipoEntrega === rubrica.tipoEntrega &&
      r.cursosCodigos?.includes(cursoPrincipal)
    ).sort((a, b) => (b.version || 1) - (a.version || 1)); // Ordenar por versión descendente
  }

  generarCodigoRubrica(rubrica: RubricaDefinicion): { codigo: string; version: number } {
    // Formato: R[TIPO][ENTREGA]-[CURSO]V[VERSION]
    // Ejemplo: RGE1-EPMV1 (Rúbrica Grupal Entrega 1 - Curso EPM Versión 1)

    const tipo = rubrica.tipoRubrica || 'G'; // G o I
    const entrega = rubrica.tipoEntrega || 'E1';
    const curso = rubrica.cursosCodigos?.[0] || 'GEN'; // GENérico si no hay curso

    // Extraer código base del curso (ej: EPM-B01 -> EPM)
    const cursoBase = curso.split('-')[0];

    const codigoBase = `R${tipo}${entrega}-${cursoBase}`;

    // Buscar versiones existentes
    const rubricas = this.obtenerRubricasArray();
    const versiones = rubricas
      .filter(r => r.codigo && r.codigo.startsWith(codigoBase))
      .map(r => {
        const match = r.codigo!.match(/V(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

    const maxVersion = versiones.length > 0 ? Math.max(...versiones) : 0;
    const nuevaVersion = maxVersion + 1;

    return {
      codigo: `${codigoBase}V${nuevaVersion}`,
      version: nuevaVersion
    };
  }

  private extraerCodigoBase(codigo: string): string | null {
    // Buscar patrón V seguido de números al final
    const match = codigo.match(/^(.+)V\d+$/);
    if (match) {
      return match[1]; // Retorna todo antes de V[N]
    }
    // Compatibilidad con formato anterior: RGE1-EPM-001
    const matchOld = codigo.match(/^(.+)-\d+$/);
    if (matchOld) {
      return matchOld[1];
    }
    
    // Si no tiene formato de versión, asumir que es el código base
    return codigo;
  }

  generarNombreAutomatico(rubrica: Partial<RubricaDefinicion>, nombreCurso?: string): string {
    const tipoTexto = rubrica.tipoRubrica === 'PG' ? 'Grupal' :
                      rubrica.tipoRubrica === 'PI' ? 'Individual' : '';
    const entrega = rubrica.tipoEntrega || 'E1';

    const partes = ['Rúbrica', tipoTexto, entrega].filter(Boolean);
    if (nombreCurso) {
      partes.push('-', nombreCurso);
    }

    return partes.join(' ').replace(/\s+/g, ' ').trim();
  }

  detectarRubricaDuplicada(nombre: string, idExcluir?: string): {
    existeDuplicado: boolean;
    rubricasCoincidentes: RubricaDefinicion[];
    siguienteVersion: number;
    nombreSugerido: string;
  } {
    const rubricas = this.obtenerRubricasArray();
    const nombreNormalizado = this.normalizarNombreParaComparacion(nombre);

    // Buscar rúbricas con nombre similar
    const coincidentes = rubricas.filter(r => {
      if (idExcluir && r.id === idExcluir) return false;
      const nombreRubricaNorm = this.normalizarNombreParaComparacion(r.nombre);
      return nombreRubricaNorm === nombreNormalizado;
    });

    if (coincidentes.length === 0) {
      return {
        existeDuplicado: false,
        rubricasCoincidentes: [],
        siguienteVersion: 1,
        nombreSugerido: nombre
      };
    }

    // Calcular siguiente versión basada en los duplicados encontrados
    const versionesExistentes = coincidentes.map(r => r.version || 1);
    const maxVersion = Math.max(...versionesExistentes);
    const siguienteVersion = maxVersion + 1;

    // Generar nombre sugerido con indicador de versión
    const nombreSugerido = this.generarNombreConVersion(nombre, siguienteVersion);

    return {
      existeDuplicado: true,
      rubricasCoincidentes: coincidentes,
      siguienteVersion,
      nombreSugerido
    };
  }

  private normalizarNombreParaComparacion(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private generarNombreConVersion(nombreBase: string, version: number): string {
    // Remover versión existente si la hay (ej: "Rúbrica (v2)" → "Rúbrica")
    const nombreSinVersion = nombreBase.replace(/\s*\(v\d+\)\s*$/i, '').trim();
    return version > 1 ? `${nombreSinVersion} (v${version})` : nombreSinVersion;
  }

  compararContenidoRubricas(rubrica1: RubricaDefinicion, rubrica2: RubricaDefinicion): {
    sonIdenticas: boolean;
    diferencias: string[];
    resumen: string;
  } {
    const diferencias: string[] = [];

    // Comparar propiedades básicas
    if (rubrica1.puntuacionTotal !== rubrica2.puntuacionTotal) {
      diferencias.push(`Puntuación total: ${rubrica2.puntuacionTotal} → ${rubrica1.puntuacionTotal}`);
    }

    if (rubrica1.tipoRubrica !== rubrica2.tipoRubrica) {
      diferencias.push(`Tipo: ${rubrica2.tipoRubrica || 'N/A'} → ${rubrica1.tipoRubrica || 'N/A'}`);
    }

    if (rubrica1.tipoEntrega !== rubrica2.tipoEntrega) {
      diferencias.push(`Entrega: ${rubrica2.tipoEntrega || 'N/A'} → ${rubrica1.tipoEntrega || 'N/A'}`);
    }

    // Comparar criterios
    const criterios1 = rubrica1.criterios || [];
    const criterios2 = rubrica2.criterios || [];

    if (criterios1.length !== criterios2.length) {
      diferencias.push(`Cantidad de criterios: ${criterios2.length} → ${criterios1.length}`);
    } else {
      // Comparar cada criterio
      for (let i = 0; i < criterios1.length; i++) {
        const c1 = criterios1[i];
        const c2 = criterios2[i];

        if (c1.titulo !== c2.titulo) {
          diferencias.push(`Criterio ${i + 1} título: "${c2.titulo}" → "${c1.titulo}"`);
        }

        if (c1.peso !== c2.peso) {
          diferencias.push(`Criterio "${c1.titulo}" peso: ${c2.peso} → ${c1.peso}`);
        }

        // Comparar niveles del criterio
        const niveles1 = c1.nivelesDetalle || [];
        const niveles2 = c2.nivelesDetalle || [];

        if (niveles1.length !== niveles2.length) {
          diferencias.push(`Criterio "${c1.titulo}" niveles: ${niveles2.length} → ${niveles1.length}`);
        } else {
          for (let j = 0; j < niveles1.length; j++) {
            const n1 = niveles1[j];
            const n2 = niveles2[j];

            if (n1.descripcion !== n2.descripcion) {
              diferencias.push(`Criterio "${c1.titulo}" nivel ${j + 1} descripción modificada`);
            }

            if (n1.puntosMin !== n2.puntosMin || n1.puntosMax !== n2.puntosMax) {
              diferencias.push(`Criterio "${c1.titulo}" nivel ${j + 1} puntos: ${n2.puntosMin}-${n2.puntosMax} → ${n1.puntosMin}-${n1.puntosMax}`);
            }
          }
        }
      }
    }

    return {
      sonIdenticas: diferencias.length === 0,
      diferencias,
      resumen: diferencias.length === 0 
        ? 'Las rúbricas son idénticas' 
        : `Se encontraron ${diferencias.length} diferencias`
    };
  }
}
