import { Component, OnInit, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logger } from '@app/core/utils/logger';
import {
  IonContent,
  IonIcon,
  IonButton,
  IonChip,
  IonLabel,
  IonList,
  IonItem,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  ToastController,
  AlertController,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  listOutline,
  add,
  addCircleOutline,
  createOutline,
  save,
  saveOutline,
  closeOutline,
  trashOutline,
  peopleOutline,
  statsChartOutline,
  checkmarkCircleOutline,
  checkmarkCircle,
  ellipseOutline,
  closeCircle,
  documentTextOutline,
  schoolOutline,
  pricetagOutline,
  refreshOutline,
  eyeOutline,
  downloadOutline,
  documentOutline,
  cloudUploadOutline,
  cloudUpload,
  ribbonOutline,
  star,
  calendar,
  codeSlash,
  people,
  person,
  documentText,
  school, documentsOutline, calendarOutline, library, informationCircleOutline, timeOutline } from 'ionicons/icons';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-cursos',
  templateUrl: './cursos.page.html',
  styleUrls: ['./cursos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonButton,
    IonList,
    IonItem,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonLabel
  ]
})
export class CursosPage implements OnInit, ViewWillEnter {
  private dataService = inject(DataService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  @ViewChild('estudiantesFileInput') estudiantesFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('calificacionesFileInput') calificacionesFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('rubricaFileInput') rubricaFileInput!: ElementRef<HTMLInputElement>;

  cursosDisponibles: any[] = [];
  cursoSeleccionado: string | null = null;
  modoEdicion = false;
  rubricasAsociadas: any[] = [];

  estudiantesFileName = '';
  calificacionesFileName = '';
  rubricaFileName = '';
  estudiantesCargados: any[] = [];
  calificacionesCargadas: any = null;
  calificacionesParseadas: any[] = [];
  rubricaCargada: any = null;

  cursoParseado: any = null;
  codigoCursoEnEdicion = '';
  infoExpanded = false;

  constructor() {
    addIcons({school,addCircleOutline,saveOutline,informationCircleOutline,cloudUpload,closeCircle,checkmarkCircle,ellipseOutline,createOutline,trashOutline,calendarOutline,timeOutline,add,documentText,library,peopleOutline,cloudUploadOutline,statsChartOutline,closeOutline,documentTextOutline,ribbonOutline,calendar,schoolOutline,save,documentsOutline,codeSlash,eyeOutline,downloadOutline,star,checkmarkCircleOutline,documentOutline,listOutline,pricetagOutline,refreshOutline,people,person});
  }

  private cd = inject(ChangeDetectorRef);

  ngOnInit() {
    // Setup inicial que NO depende de recarga de datos
  }

  /**
   * Lifecycle hook de Ionic - se ejecuta cada vez que la vista va a aparecer
   * Esto EVITA recrear el componente completo
   */
  ionViewWillEnter() {
    this.cargarCursos();
  }

  /**
   * Editar un curso desde la tabla
   */
  editarCurso(curso: any) {
    this.cursoSeleccionado = curso.codigo;
    this.editarCursoSeleccionado();
  }

  /**
   * Confirmar eliminación de un curso desde la tabla
   */
  async confirmarEliminarCurso(curso: any) {
    // Crear un evento dummy para el método existente
    const dummyEvent = new Event('click');
    await this.eliminarCurso(curso, dummyEvent);
  }

  cargarCursos(): void {
    try {
      const uiState = this.dataService.getUIState();

      if (!uiState || !uiState.courseStates) {
        Logger.warn('[CursosPage] No hay estados de curso disponibles');
        this.cursosDisponibles = [];
        return;
      }

      const courseStates = uiState.courseStates;

      this.cursosDisponibles = Object.entries(courseStates)
        .map(([nombreCurso, state]) => {
          if (!state || typeof state !== 'object') {
            Logger.warn(`[CursosPage] Estado inválido para curso: ${nombreCurso}`);
            return null;
          }

          try {
            const codigoUnico = state.metadata?.codigoUnico || nombreCurso;
            const tieneArchivo = this.dataService.obtenerArchivoCalificaciones(nombreCurso) !== null;

            return {
              nombre: state.metadata?.nombre || nombreCurso,
              nombreAbreviado: state.metadata?.nombreAbreviado || '',
              codigo: codigoUnico,
              codigoBase: state.metadata?.codigo || '',
              bloque: state.metadata?.bloque || '',
              fechaCreacion: state.metadata?.fechaCreacion || '',
              tieneCalificaciones: tieneArchivo
            };
          } catch (error) {
            Logger.error(`[CursosPage] Error procesando curso ${nombreCurso}:`, error);
            return null;
          }
        })
        .filter((curso): curso is NonNullable<typeof curso> => curso !== null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      Logger.log(`[CursosPage] ${this.cursosDisponibles.length} cursos cargados exitosamente`);
    } catch (error) {
      Logger.error('[CursosPage] Error crítico al cargar cursos:', error);
      this.cursosDisponibles = [];
      this.mostrarToastError('Error al cargar la lista de cursos');
    }
  }

  iniciarCreacionCurso() {
    Logger.log('🔘 [CursosPage] Click en Crear Curso - Iniciando...');
    // alert('Click detectado'); // Feedback inmediato
    try {
      this.modoEdicion = true;
      this.cursoSeleccionado = null;
      this.limpiarFormulario();
      this.cd.detectChanges(); // Forzar actualización de vista
      Logger.log('✅ [CursosPage] Modo edición activado');
    } catch (error) {
      Logger.error('❌ [CursosPage] Error al iniciar creación:', error);
    }
  }

  async cancelarCreacionCurso() {
    this.modoEdicion = false;
    this.limpiarFormulario();
    Logger.log('🔘 [CursosPage] Creación de curso cancelada');
    
    const toast = await this.toastController.create({
      message: 'Operación cancelada',
      duration: 2000,
      color: 'warning',
      position: 'middle'
    });
    await toast.present();
  }

  toggleInfo() {
    this.infoExpanded = !this.infoExpanded;
  }

  seleccionarCurso(codigo: string) {
    this.cursoSeleccionado = codigo;
    this.modoEdicion = false;
    this.cargarRubricasAsociadas(codigo);
  }

  deseleccionarCurso() {
    this.cursoSeleccionado = null;
    this.modoEdicion = false;
    this.limpiarFormulario();
    this.rubricasAsociadas = [];
  }

  cargarRubricasAsociadas(codigoCurso: string) {
    const todasRubricas = this.dataService.obtenerRubricasArray();
    this.rubricasAsociadas = todasRubricas.filter(rubrica =>
      rubrica.cursosCodigos?.includes(codigoCurso)
    ).sort((a, b) => {
      // Ordenar por tipo de entrega
      const ordenEntrega: any = { 'E1': 1, 'E2': 2, 'EF': 3 };
      const ordenA = ordenEntrega[a.tipoEntrega || ''] || 999;
      const ordenB = ordenEntrega[b.tipoEntrega || ''] || 999;

      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }

      // Luego por tipo de rúbrica (PG antes que PI)
      const tipoA = a.tipoRubrica === 'PG' ? 0 : 1;
      const tipoB = b.tipoRubrica === 'PG' ? 0 : 1;

      return tipoA - tipoB;
    });
  }

  editarCursoSeleccionado() {
    if (!this.cursoSeleccionado) return;

    const curso = this.cursosDisponibles.find(c => c.codigo === this.cursoSeleccionado);
    if (!curso) return;

    this.modoEdicion = true;
    this.codigoCursoEnEdicion = curso.codigo;
    this.cursoParseado = {
      nombre: curso.nombre,
      codigo: curso.codigo,
      bloque: curso.bloque
    };

    // Cargar estudiantes del curso desde storage
    const estudiantes = this.dataService.getCurso(curso.codigo);
    if (estudiantes && estudiantes.length > 0) {
      this.estudiantesCargados = estudiantes;
      this.estudiantesFileName = `${curso.codigo}_estudiantes.csv`;
    }

    // Cargar archivo de calificaciones si existe
    const archivo = this.dataService.obtenerArchivoCalificaciones(curso.codigo);
    if (archivo) {
      this.calificacionesCargadas = archivo;
      this.calificacionesFileName = archivo.nombre;
    }
  }

  async onEstudiantesFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.estudiantesFileName = file.name;

    try {
      const contenido = await this.leerArchivo(file);

      // Parsear CSV con soporte para campos con comas entre comillas
      const lineas = contenido.split('\n').filter(l => l.trim());
      if (lineas.length < 2) throw new Error('Archivo CSV vacío');

      // Función para parsear línea CSV respetando comillas
      const parsearLineaCSV = (linea: string): string[] => {
        const resultado: string[] = [];
        let dentroComillas = false;
        let valorActual = '';

        for (let i = 0; i < linea.length; i++) {
          const char = linea[i];

          if (char === '"') {
            dentroComillas = !dentroComillas;
          } else if (char === ',' && !dentroComillas) {
            resultado.push(valorActual.trim());
            valorActual = '';
          } else {
            valorActual += char;
          }
        }
        resultado.push(valorActual.trim());
        return resultado;
      };

      const headers = parsearLineaCSV(lineas[0]);
      Logger.log('========================================');
      Logger.log('📋 ANÁLISIS COMPLETO DEL CSV');
      Logger.log('========================================');
      Logger.log('Total de líneas en el archivo:', lineas.length);
      Logger.log('Headers completos:', headers);
      Logger.log('Primeros 4 headers:', headers.slice(0, 4));

      // Detectar índices de columnas importantes
      // Mapeo correcto para formato Canvas:
      // Student, ID, SIS Login ID, Section, [otras columnas de tareas], [columnas de grupo si aplica]
      const nombreIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'student' || lower === 'nombre';
      });
      const canvasUserIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'id' || lower === 'canvas_user_id' || lower === 'canvas user id';
      });
      const loginIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'sis login id' || lower === 'login_id' || lower === 'sis user id';
      });
      const seccionesIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'section' || lower === 'secciones';
      });
      const groupNameIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'group_name' || lower === 'group name';
      });
      const canvasGroupIdIndex = headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return lower === 'canvas_group_id' || lower === 'canvas group id';
      });

      // Para CSV con columnas separadas
      const apellidoIndex = headers.findIndex(h => h.toLowerCase().trim().includes('apellido'));
      const correoIndex = headers.findIndex(h => h.toLowerCase().trim().includes('correo'));
      const pgIndex = headers.findIndex(h => h.toLowerCase().trim() === 'pg');
      const piIndex = headers.findIndex(h => h.toLowerCase().trim() === 'pi');

      Logger.log('📍 Índices de columnas detectados:', {
        nombreIndex,
        canvasUserIdIndex,
        loginIdIndex,
        seccionesIndex,
        groupNameIndex,
        canvasGroupIdIndex,
        apellidoIndex,
        correoIndex,
        pgIndex,
        piIndex
      });

      // Verificar línea 2 (puede ser "Manual Posting" o "Points Possible")
      if (lineas.length > 1) {
        const linea2 = parsearLineaCSV(lineas[1]);
        Logger.log('Línea 2:', linea2.slice(0, 6));
      }
      if (lineas.length > 2) {
        const linea3 = parsearLineaCSV(lineas[2]);
        Logger.log('Línea 3:', linea3.slice(0, 6));
      }

      // Filtrar líneas de datos (saltar "Manual Posting", "Points Possible" y líneas vacías)
      const lineasDatos = lineas.slice(1).filter((linea, idx) => {
        const valores = parsearLineaCSV(linea);
        const primeraColumna = valores[0]?.trim().toLowerCase() || '';

        // Detectar líneas a filtrar
        const esPointsPossible = primeraColumna.includes('points possible');
        const esManualPosting = primeraColumna === '' && valores[5]?.toLowerCase().includes('manual posting');
        const esVacia = primeraColumna === '' && linea.trim() === '';

        if (idx < 4) {
          Logger.log(`Filtro línea ${idx + 2}: "${primeraColumna.substring(0, 30)}" - Points:${esPointsPossible}, ManualPosting:${esManualPosting}, Vacía:${esVacia}`);
        }

        // Filtrar "Manual Posting", "Points Possible" y líneas vacías
        return !esPointsPossible && !esManualPosting && !esVacia;
      });

      Logger.log(`📊 Total de líneas de datos después de filtrar: ${lineasDatos.length}`);

      const estudiantes = lineasDatos.map((linea, index) => {
        const valores = parsearLineaCSV(linea).map(v => v.trim());

        // Debug: mostrar valores de las primeras 3 líneas
        if (index < 3) {
          Logger.log(`🔍 DEBUG Línea ${index + 1} del CSV:`);
          Logger.log(`   Total columnas: ${valores.length}`);
          valores.slice(0, 6).forEach((val, idx) => {
            Logger.log(`   [${idx}]: "${val}"`);
          });
        }

        // Obtener el nombre completo del CSV (formato: "APELLIDOS, NOMBRE")
        let nombreCompleto = '';
        let apellido = '';
        let nombre = '';

        if (nombreIndex >= 0 && nombreIndex < valores.length) {
          // Si hay columna "Student" en el CSV de Canvas (índice 0)
          nombreCompleto = (valores[nombreIndex] || '').trim();

          if (index === 0) {
            Logger.log(`📝 Valor en nombreIndex [${nombreIndex}]: "${nombreCompleto}"`);
          }

          // Separar por coma: "APELLIDOS, NOMBRE" -> apellidos / nombres
          if (nombreCompleto.includes(',')) {
            const partes = nombreCompleto.split(',').map(p => p.trim());
            apellido = partes[0] || '';
            nombre = partes[1] || '';
          } else {
            // Si no tiene coma, usar el valor completo como apellido
            apellido = nombreCompleto;
            nombre = '';
          }
        } else if (apellidoIndex >= 0) {
          // Si hay columnas separadas de apellido/nombre
          apellido = (valores[apellidoIndex] || '').trim();
          nombre = (valores[0] || '').trim();
        } else {
          // Fallback
          apellido = (valores[1] || '').trim();
          nombre = (valores[0] || '').trim();
        }

        // Extraer número de grupo del groupName (ej: "G1" -> "1", "Grupo 2" -> "2")
        const groupNameValue = groupNameIndex >= 0 ? (valores[groupNameIndex] || '').trim() : '';
        let grupoNumero = '';
        if (groupNameValue) {
          const grupoMatch = groupNameValue.match(/\d+/);
          grupoNumero = grupoMatch ? grupoMatch[0] : '';
        }

        // Crear objeto base con información del estudiante
        const estudiante: any = {
          canvasUserId: canvasUserIdIndex >= 0 ? (valores[canvasUserIdIndex] || '').trim() : '',
          canvasGroupId: canvasGroupIdIndex >= 0 ? (valores[canvasGroupIdIndex] || '').trim() : '',
          apellido: apellido,
          nombre: nombre,
          correo: loginIdIndex >= 0 ? (valores[loginIdIndex] || '').trim() : (correoIndex >= 0 ? (valores[correoIndex] || '').trim() : ''),
          grupo: grupoNumero,
          groupName: groupNameValue,
          secciones: seccionesIndex >= 0 ? (valores[seccionesIndex] || '').trim() : '',
          pg: pgIndex >= 0 ? (valores[pgIndex] || '').trim() : '',
          pi: piIndex >= 0 ? (valores[piIndex] || '').trim() : '',
          calificaciones: {} // Objeto para almacenar todas las calificaciones
        };

        // Extraer columnas de calificaciones (después de Section, índice 4 en adelante)
        // Saltar columnas de metadatos que terminan en "Points", "Score", etc.
        const primeraColumnaCalificaciones = Math.max(4, seccionesIndex + 1);

        // Debug: Mostrar mapeo de columnas para el primer estudiante
        if (index === 0) {
          Logger.log('🔍 MAPEO DE COLUMNAS (Primer estudiante):');
          Logger.log('Total valores parseados:', valores.length);
          Logger.log('Total headers:', headers.length);
          for (let i = 4; i < Math.min(10, headers.length); i++) {
            Logger.log(`  [${i}] "${headers[i]}" = "${valores[i] || '(vacío)'}"`);
          }
        }

        for (let i = primeraColumnaCalificaciones; i < valores.length && i < headers.length; i++) {
          const headerName = headers[i];
          const valor = valores[i];
          const headerLower = headerName.toLowerCase().trim();

          // PRIMERO: Filtrar todas las columnas de metadata de Canvas
          // Estas columnas NUNCA deben incluirse como calificaciones
          const esColumnaMetadata = headerLower.includes('current points') ||
            headerLower.includes('final points') ||
            headerLower.includes('current score') ||
            headerLower.includes('final score') ||
            headerLower.includes('unposted') ||
            headerLower.includes('solo lectura') ||
            headerLower.includes('tareas current') ||
            headerLower.includes('tareas final') ||
            headerLower.includes('tareas unposted') ||
            headerLower.includes('herramientas profesor');

          // Filtrar columna "Notas" vacía (si existe)
          const esColumnaNotas = headerLower === 'notas';

          // Si es metadata o "Notas", saltar esta columna
          if (esColumnaMetadata || esColumnaNotas) {
            continue;
          }

          // SEGUNDO: Solo incluir columnas que realmente son entregas/evaluaciones
          // Estas deben contener palabras específicas de entregas
          const esColumnaEntrega = headerName.trim() !== '' &&
            (headerLower.includes('entrega') ||
              headerLower.includes('proyecto') ||
              headerLower.includes('escenario') ||
              headerLower.includes('sustentacion'));

          if (esColumnaEntrega) {
            estudiante.calificaciones[headerName] = valor || '';
          }
        }

        if (index === 0) {
          Logger.log('👤 Primer estudiante parseado:', estudiante);
          Logger.log('📊 Calificaciones extraídas:', Object.keys(estudiante.calificaciones));
        }

        return estudiante;
      }).filter(e => {
        // Filtrar líneas vacías y la línea de "Points Possible" si quedó alguna
        const tieneNombre = (e.nombre || e.apellido) && (e.nombre + e.apellido).toLowerCase() !== 'points possible';
        const tieneCorreo = e.correo && e.correo.includes('@');
        return tieneNombre || tieneCorreo;
      });

      // Parsear información del curso desde la columna 'secciones' del CSV
      // Formato esperado: "SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]"
      const primeraSeccion = estudiantes[0]?.secciones || '';

      let nombreCompleto = '';
      let codigoAbreviado = '';
      let bloqueTexto = '';

      if (primeraSeccion) {
        // Extraer nombre completo del énfasis (todo lo que está entre / y -)
        const enfasisMatch = primeraSeccion.match(/\/([^-]+)-/);
        nombreCompleto = enfasisMatch?.[1]?.trim() || '';

        // Generar siglas del énfasis (ej: ÉNFASIS EN PROGRAMACIÓN MÓVIL → EPM)
        // Normalizar texto: quitar tildes y convertir a mayúsculas
        const normalizarTexto = (texto: string): string => {
          return texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        };

        // Lista de preposiciones a excluir
        const preposiciones = ['DE', 'EN', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'A', 'CON', 'PARA', 'POR', 'Y'];

        const palabras = nombreCompleto.split(/\s+/);
        const siglas = palabras
          .filter(p => p.length > 2)
          .map(p => normalizarTexto(p))
          .filter(p => !preposiciones.includes(p))
          .map(p => p[0])
          .join('');
        const enfasisCodigo = 'E' + siglas; // Agregar E de "Énfasis"

        // Extraer grupo (ej: B01)
        const grupoMatch = primeraSeccion.match(/\[GRUPO\s+([A-Z0-9]+)\]/i);
        const grupo = grupoMatch?.[1] || 'B01';

        // Extraer bloque (ej: SEGUNDO → 2)
        const bloqueMatch = primeraSeccion.match(/^([A-Z]+)\s+BLOQUE/i);
        bloqueTexto = bloqueMatch?.[1] || '';
        const bloqueNum = this.convertirBloqueTextoANumero(bloqueTexto);

        // Extraer modalidad (ej: VIRTUAL → V)
        const modalidadMatch = primeraSeccion.match(/BLOQUE-([A-Z]+)\//i);
        const modalidad = modalidadMatch?.[1]?.[0] || 'P';

        // Generar código abreviado: EPM-B01-BLQ2-V
        codigoAbreviado = `${enfasisCodigo}-${grupo}-BLQ${bloqueNum}-${modalidad}`;
      } else {
        // Fallback: usar nombre del archivo
        const nombreArchivo = file.name.replace('.csv', '');
        const codigoMatch = nombreArchivo.match(/^([A-Z]{2,4})(?=B\d+)|([A-Z]{2,4})(?=_)|([A-Z]{2,4})$/);
        const bloqueMatch = nombreArchivo.match(/(B\d+)/i);

        nombreCompleto = nombreArchivo;
        codigoAbreviado = codigoMatch?.[0] || '';
        bloqueTexto = bloqueMatch?.[1] || '';
      }

      this.estudiantesCargados = estudiantes;
      this.cursoParseado = {
        nombre: nombreCompleto,
        codigo: codigoAbreviado,
        bloque: bloqueTexto
      }; const toast = await this.toastController.create({
        message: `${estudiantes.length} estudiantes cargados`,
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        icon: 'checkmark-circle'
      });
      await toast.present();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando estudiantes:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al cargar archivo de estudiantes: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.estudiantesCargados = [];
      this.estudiantesFileName = '';
    }
  }

  async onCalificacionesFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.calificacionesFileName = file.name;

    try {
      const contenido = await this.leerArchivo(file);

      // Parsear calificaciones usando el método del servicio
      const calificaciones = this.parsearCalificacionesCanvasLocal(contenido);

      this.calificacionesCargadas = {
        nombre: file.name,
        fechaCarga: new Date().toISOString(),
        contenidoOriginal: contenido,  // CSV completo para exportar
        calificaciones: calificaciones  // Array procesado para búsquedas
      };

      Logger.log('✅ Calificaciones cargadas:', {
        archivo: file.name,
        totalRegistros: calificaciones.length,
        primerRegistro: calificaciones[0]
      });

      // Parsear calificaciones para vista previa
      this.parsearCalificaciones(contenido);

      // OPTIMIZACIÓN: Notificar al sistema que las calificaciones cambiaron
      // Esto invalidará el cache en cursos.page.ts cuando se guarde
      Logger.log('🔄 [cargarArchivoCalificaciones] Calificaciones cargadas - cache se invalidará al guardar');

      const toast = await this.toastController.create({
        message: 'Archivo de calificaciones cargado',
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        cssClass: 'toast-success'
      });
      await toast.present();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando calificaciones:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al procesar calificaciones: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.calificacionesCargadas = null;
      this.calificacionesFileName = '';
      this.calificacionesParseadas = [];
    }
  }

  /**
   * Parsea el CSV de calificaciones Canvas extrayendo solo los campos necesarios
   */
  private parsearCalificacionesCanvasLocal(contenido: string): Array<{
    id: string;
    e1: string;
    e2: string;
    ef: string;
  }> {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 3) return [];

    // Saltar header (línea 0) y "Points Possible" (línea 1)
    const calificaciones = [];
    for (let i = 2; i < lineas.length; i++) {
      const campos = this.parseCSVRow(lineas[i]);

      if (campos.length >= 7) {
        calificaciones.push({
          id: campos[1] || '',   // Campo 1: ID de Canvas (canvasUserId)
          e1: campos[4] || '',   // Campo 4: Entrega proyecto 1 - Escenario 3
          e2: campos[5] || '',   // Campo 5: Entrega proyecto 2 - Escenario 5
          ef: campos[6] || ''    // Campo 6: Entrega final y sustentacion - Escenario 7 y 8
        });
      }
    }

    return calificaciones;
  }

  /**
   * Parser CSV robusto que maneja comillas correctamente
   */
  private parseCSVRow(csvRow: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csvRow.length) {
      const char = csvRow[i];

      if (char === '"' && (i === 0 || csvRow[i - 1] === ',')) {
        insideQuotes = true;
      } else if (char === '"' && insideQuotes && (i === csvRow.length - 1 || csvRow[i + 1] === ',')) {
        insideQuotes = false;
      } else if (char === ',' && !insideQuotes) {
        result.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
      }

      i++;
    }

    result.push(currentField.trim());
    return result;
  }

  parsearCalificaciones(contenido: string) {
    const lineas = contenido.split('\n').filter(l => l.trim());
    if (lineas.length < 2) return;

    // Parser CSV con soporte para comillas
    const parsearLineaCSV = (linea: string): string[] => {
      return this.parseCSVRow(linea);
    };

    const headers = parsearLineaCSV(lineas[0]);

    // Filtrar líneas de datos (saltar "Points Possible" y líneas vacías)
    const lineasDatos = lineas.slice(1).filter((linea) => {
      const valores = parsearLineaCSV(linea);
      const primeraColumna = valores[0]?.trim().toLowerCase() || '';
      return !primeraColumna.includes('points possible') && primeraColumna !== '';
    });

    // Detectar índices de columnas
    const nombreIndex = headers.findIndex(h => h.toLowerCase().trim() === 'student' || h.toLowerCase().trim() === 'nombre');
    const loginIdIndex = headers.findIndex(h => h.toLowerCase().trim() === 'sis login id' || h.toLowerCase().trim() === 'login_id');
    const seccionesIndex = headers.findIndex(h => h.toLowerCase().trim() === 'section' || h.toLowerCase().trim() === 'secciones');

    // Parsear estudiantes con calificaciones
    this.calificacionesParseadas = lineasDatos.map(linea => {
      const valores = parsearLineaCSV(linea);
      const estudiante: any = {
        nombre: valores[nombreIndex] || '',
        correo: valores[loginIdIndex] || '',
        seccion: valores[seccionesIndex] || '',
        calificaciones: {}
      };

      // Extraer columnas de calificaciones (índice 4 en adelante)
      for (let i = 4; i < Math.min(valores.length, headers.length); i++) {
        const headerName = headers[i];
        const valor = valores[i];
        const headerLower = headerName.toLowerCase().trim();

        // Filtrar metadata
        const esColumnaMetadata = headerLower.includes('current points') ||
          headerLower.includes('final points') ||
          headerLower.includes('current score') ||
          headerLower.includes('final score') ||
          headerLower.includes('unposted') ||
          headerLower.includes('solo lectura') ||
          headerLower.includes('tareas current') ||
          headerLower.includes('tareas final') ||
          headerLower.includes('tareas unposted') ||
          headerLower.includes('herramientas profesor');

        if (esColumnaMetadata || headerLower === 'notas') continue;

        // Solo incluir columnas de entregas
        const esColumnaEntrega = headerName.trim() !== '' &&
          (headerLower.includes('entrega') ||
            headerLower.includes('proyecto') ||
            headerLower.includes('escenario') ||
            headerLower.includes('sustentacion'));

        if (esColumnaEntrega) {
          estudiante.calificaciones[headerName] = valor || '';
        }
      }

      return estudiante;
    });
  }

  async guardarCurso() {
    if (!this.cursoParseado || this.estudiantesCargados.length === 0) {
      const toast = await this.toastController.create({
        message: 'Debe cargar al menos el archivo de estudiantes',
        duration: 3000,
        color: 'warning',
        position: 'middle',
        cssClass: 'toast-warning'
      });
      await toast.present();
      return;
    }

    // Validar que se haya detectado el código del curso
    if (!this.cursoParseado.codigo) {
      const toast = await this.toastController.create({
        message: 'No se pudo detectar el código del curso. Por favor, renombre el archivo con formato: CODIGOB##.csv (ej: EPMB01.csv)',
        duration: 4000,
        color: 'warning',
        position: 'middle',
        cssClass: 'toast-warning'
      });
      await toast.present();
      return;
    }

    try {
      // Transformar estudiantes al formato correcto incluyendo canvas_user_id, canvas_group_id y grupo
      const estudiantesTransformados = this.estudiantesCargados.map(est => {
        return {
          canvasUserId: est.canvasUserId || '',
          canvasGroupId: est.canvasGroupId || '',
          // Soportar tanto formato singular (apellido/nombre) como plural (apellidos/nombres)
          apellidos: (est as any).apellidos || (est as any).apellido || '',
          nombres: (est as any).nombres || (est as any).nombre || '',
          correo: est.correo || '',
          grupo: est.grupo || '', // Ya fue extraído en el parser del CSV
          groupName: est.groupName || ''
        };
      });

      let codigoCurso: string;

      // Verificar si es edición o creación
      if (this.codigoCursoEnEdicion) {
        // MODO EDICIÓN: Actualizar curso existente
        codigoCurso = this.codigoCursoEnEdicion;

        // Actualizar estudiantes del curso
        await this.dataService.actualizarEstudiantesCurso(codigoCurso, estudiantesTransformados);

        // Obtener metadata existente para preservar fechaCreacion y profesor
        const uiState = this.dataService.getUIState();
        const courseState = uiState.courseStates?.[codigoCurso];
        const metadataExistente = courseState?.metadata;

        // Actualizar metadata del curso preservando campos existentes
        await this.dataService.updateCourseState(codigoCurso, {
          metadata: {
            nombre: this.cursoParseado.nombre,
            codigo: this.cursoParseado.codigo,
            bloque: this.cursoParseado.bloque,
            fechaCreacion: metadataExistente?.fechaCreacion || new Date().toISOString(),
            profesor: metadataExistente?.profesor || '',
            nombreAbreviado: metadataExistente?.nombreAbreviado,
            codigoUnico: metadataExistente?.codigoUnico
          }
        });
      } else {
        // MODO CREACIÓN: Crear nuevo curso
        codigoCurso = await this.dataService.crearCurso({
          nombre: this.cursoParseado.nombre,
          codigo: this.cursoParseado.codigo,
          bloque: this.cursoParseado.bloque,
          fechaCreacion: new Date().toISOString(),
          profesor: '',
          estudiantes: estudiantesTransformados
        });
      }

      // Si hay archivo de calificaciones, actualizarlo
      if (this.calificacionesCargadas) {
        await this.dataService.updateCourseState(codigoCurso, {
          archivoCalificaciones: this.calificacionesCargadas
        });
      }

      // Logger.log('🔄 Recargando lista de cursos...');
      this.cargarCursos();
      // Logger.log('📋 Cursos disponibles:', this.cursosDisponibles.length);

      // Limpiar formulario sin mostrar toast de cancelación
      this.limpiarFormulario();
      this.modoEdicion = false;
      this.cursoSeleccionado = null;

      const mensajeExito = this.codigoCursoEnEdicion ? 'Curso actualizado exitosamente' : 'Curso creado';
      const toast = await this.toastController.create({
        message: mensajeExito,
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        icon: 'checkmark-circle'
      });
      await toast.present();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error guardando curso:', {
        error: errorMessage,
        codigo: this.cursoParseado?.codigo,
        modo: this.codigoCursoEnEdicion ? 'edición' : 'creación',
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al guardar curso: ${errorMessage}`,
        4000
      );
    }
  }

  async cancelarEdicion() {
    // Determinar si es curso nuevo o edición de curso existente
    const esCursoNuevo = !this.codigoCursoEnEdicion;
    const mensaje = esCursoNuevo
      ? 'Creación de nuevo curso cancelada'
      : 'Edición cancelada';

    this.modoEdicion = false;
    this.cursoSeleccionado = null;
    this.limpiarFormulario();

    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: 'warning',
      position: 'middle',
      cssClass: 'toast-warning'
    });
    await toast.present();
  }

  limpiarFormulario() {
    this.estudiantesFileName = '';
    this.calificacionesFileName = '';
    this.rubricaFileName = '';
    this.estudiantesCargados = [];
    this.calificacionesCargadas = null;
    this.rubricaCargada = null;
    this.cursoParseado = null;
    this.codigoCursoEnEdicion = '';

    if (this.estudiantesFileInput) {
      this.estudiantesFileInput.nativeElement.value = '';
    }
    if (this.calificacionesFileInput) {
      this.calificacionesFileInput.nativeElement.value = '';
    }
    if (this.rubricaFileInput) {
      this.rubricaFileInput.nativeElement.value = '';
    }
  }

  limpiarEstudiantes() {
    this.estudiantesCargados = [];
    this.estudiantesFileName = '';
    this.cursoParseado = null;

    if (this.estudiantesFileInput?.nativeElement) {
      this.estudiantesFileInput.nativeElement.value = '';
    }
  }

  limpiarCalificaciones() {
    this.calificacionesFileName = '';
    this.calificacionesCargadas = null;
    this.calificacionesParseadas = [];
    if (this.calificacionesFileInput) {
      this.calificacionesFileInput.nativeElement.value = '';
    }
  }

  desvincularArchivoEstudiantes() {
    this.estudiantesFileName = '';
    this.estudiantesCargados = [];
    this.cursoParseado = null;
  }

  desvincularArchivoCalificaciones() {
    this.calificacionesFileName = '';
    this.calificacionesCargadas = null;
  }

  async eliminarCurso(curso: any, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: '⚠️ Confirmar Eliminación de Curso',
      message: `¿Estás seguro de eliminar el curso "${curso.nombre}" (${curso.nombreAbreviado})?<br><br><strong>Se eliminarán:</strong><br>• Todos los estudiantes del curso<br>• Todas las evaluaciones asociadas<br>• Comentarios y seguimiento<br><br>Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              // USAR CÓDIGO ÚNICO (curso.codigo contiene el código único completo)
              await this.dataService.eliminarCurso(curso.codigo);
              this.cargarCursos();

              if (this.cursoSeleccionado === curso.codigo) {
                this.deseleccionarCurso();
              }

              const toast = await this.toastController.create({
                message: `Curso "${curso.nombreAbreviado}" eliminado`,
                duration: 2000,
                color: 'tertiary',
                position: 'middle',
                cssClass: 'toast-success'
              });
              await toast.present();
            } catch (error) {
              Logger.error('Error eliminando curso:', error);

              const toast = await this.toastController.create({
                message: 'Error al eliminar curso',
                duration: 3000,
                color: 'danger',
                position: 'middle',
                cssClass: 'toast-danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  convertirBloqueTextoANumero(texto: string): number {
    const bloques: Record<string, number> = {
      'PRIMER': 1, 'PRIMERO': 1, 'FIRST': 1,
      'SEGUNDO': 2, 'SECOND': 2,
      'TERCER': 3, 'TERCERO': 3, 'THIRD': 3,
      'CUARTO': 4, 'FOURTH': 4,
      'QUINTO': 5, 'FIFTH': 5,
      'SEXTO': 6, 'SIXTH': 6
    };
    return bloques[texto.toUpperCase()] || 1;
  }

  tieneArchivoCalificaciones(codigo: string): boolean {
    // Buscar el curso en courseStates usando el código
    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    // Buscar por nombreCurso (clave de courseStates)
    const cursoEntry = Object.entries(courseStates).find(
      ([nombreCurso, _]) => nombreCurso === codigo
    );

    if (!cursoEntry) return false;

    const [nombreCurso, _] = cursoEntry;
    return this.dataService.obtenerArchivoCalificaciones(nombreCurso) !== null;
  }

  obtenerNombreArchivoCalificaciones(codigo: string): string {
    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    const cursoEntry = Object.entries(courseStates).find(
      ([_, state]) => state.metadata?.codigo === codigo
    );

    return cursoEntry?.[1].archivoCalificaciones?.nombre || '';
  }

  async eliminarArchivoCalificacionesGuardado() {
    if (!this.codigoCursoEnEdicion) return;

    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    const cursoEntry = Object.entries(courseStates).find(
      ([_, state]) => state.metadata?.codigo === this.codigoCursoEnEdicion
    );

    if (cursoEntry) {
      const [nombreCurso, _] = cursoEntry;
      await this.dataService.updateCourseState(nombreCurso, {
        archivoCalificaciones: undefined
      });

      const toast = await this.toastController.create({
        message: 'Archivo de calificaciones eliminado',
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        cssClass: 'toast-success'
      });
      await toast.present();
    }
  }

  private leerArchivo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsText(file);
    });
  }

  async onRubricaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.rubricaFileName = file.name;

    // Validar extensión
    if (!file.name.endsWith('.txt')) {
      const toast = await this.toastController.create({
        message: 'Solo se permiten archivos .txt',
        duration: 2000,
        color: 'warning',
        position: 'middle',
        cssClass: 'toast-warning'
      });
      await toast.present();
      return;
    }

    try {
      const contenido = await this.leerArchivo(file);
      const rubrica = this.dataService.parsearArchivoRubrica(contenido);

      if (!rubrica) {
        const toast = await this.toastController.create({
          message: 'Error al parsear el archivo de rúbrica',
          duration: 3000,
          color: 'danger',
          position: 'middle',
          cssClass: 'toast-danger'
        });
        await toast.present();
        return;
      }

      this.rubricaCargada = rubrica;

      const toast = await this.toastController.create({
        message: `Rúbrica "${rubrica.nombre}" cargada exitosamente`,
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        cssClass: 'toast-success'
      });
      await toast.present();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error cargando rúbrica:', {
        error: errorMessage,
        archivo: file.name,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al cargar rúbrica: ${errorMessage}`,
        4000
      );

      // Limpiar estado en caso de error
      this.rubricaCargada = null;
      this.rubricaFileName = '';
    }
  }

  async guardarRubrica() {
    if (!this.rubricaCargada) {
      const toast = await this.toastController.create({
        message: 'No hay rúbrica para guardar',
        duration: 2000,
        color: 'warning',
        position: 'middle',
        cssClass: 'toast-warning'
      });
      await toast.present();
      return;
    }

    try {
      await this.dataService.guardarRubrica(this.rubricaCargada);

      const toast = await this.toastController.create({
        message: `Rúbrica "${this.rubricaCargada.nombre}" guardada exitosamente`,
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        cssClass: 'toast-success'
      });
      await toast.present();

      // Limpiar estado
      this.rubricaCargada = null;
      this.rubricaFileName = '';
      if (this.rubricaFileInput) {
        this.rubricaFileInput.nativeElement.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('[CursosPage] Error guardando rúbrica:', {
        error: errorMessage,
        rubrica: this.rubricaCargada?.nombre,
        stack: error instanceof Error ? error.stack : undefined
      });

      await this.mostrarToastError(
        `Error al guardar rúbrica: ${errorMessage}`,
        4000
      );
    }
  }

  desvincularArchivoRubrica() {
    this.rubricaFileName = '';
    this.rubricaCargada = null;
    if (this.rubricaFileInput) {
      this.rubricaFileInput.nativeElement.value = '';
    }
  }

  obtenerColumnasCalificaciones(): string[] {
    if (this.calificacionesParseadas.length === 0) return [];
    return Object.keys(this.calificacionesParseadas[0]?.calificaciones || {});
  }

  verCalificaciones(codigo: string) {
    // Navegar a la página de calificaciones con el curso seleccionado
    Logger.log('Ver calificaciones:', codigo);
  }

  async exportarCalificaciones(codigo: string) {
    const uiState = this.dataService.getUIState();
    const courseStates = uiState.courseStates || {};

    const cursoEntry = Object.entries(courseStates).find(
      ([_, state]) => state.metadata?.codigo === codigo
    );

    if (cursoEntry && cursoEntry[1].archivoCalificaciones) {
      const archivo = cursoEntry[1].archivoCalificaciones;
      const blob = new Blob([archivo.contenidoOriginal], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calificaciones_${codigo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      const toast = await this.toastController.create({
        message: 'Calificaciones exportadas',
        duration: 2000,
        color: 'tertiary',
        position: 'middle',
        cssClass: 'toast-success'
      });
      await toast.present();
    }
  }

  /**
   * Método helper para mostrar mensajes de error de forma consistente
   */
  private async mostrarToastError(mensaje: string, duracion: number = 3000): Promise<void> {
    try {
      const toast = await this.toastController.create({
        message: mensaje,
        duration: duracion,
        color: 'danger',
        position: 'middle',
        icon: 'close-circle',
        cssClass: 'toast-danger'
      });
      await toast.present();
    } catch (error) {
      // Fallback si falla mostrar el toast
      Logger.error('[CursosPage] Error mostrando toast de error:', error);
      console.error(mensaje);
    }
  }

  /**
   * Método helper para mostrar mensajes de éxito de forma consistente
   */
  private async mostrarToastExito(mensaje: string, duracion: number = 2000): Promise<void> {
    try {
      const toast = await this.toastController.create({
        message: mensaje,
        duration: duracion,
        color: 'tertiary',
        position: 'middle',
        icon: 'checkmark-circle',
        cssClass: 'toast-success'
      });
      await toast.present();
    } catch (error) {
      Logger.error('[CursosPage] Error mostrando toast de éxito:', error);
    }
  }
}

