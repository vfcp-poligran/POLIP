/**
 * =============================================================================
 * UTILIDADES PARA PARSING Y GENERACIÓN DE CÓDIGOS DE CURSO
 * =============================================================================
 * 
 * Este módulo contiene funciones para parsear nombres de cursos desde CSV
 * y generar los diferentes tipos de códigos según las reglas del negocio.
 * 
 * FORMATO DEL CAMPO "SECCIONES" EN CSV:
 * "SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]"
 * "SEGUNDO BLOQUE-TEORICO - VIRTUAL/FUNDAMENTOS DE GESTIÓN INFORMÁTICA-[GRUPO B02]"
 * 
 * ESTRUCTURA:
 * 1. Bloque y Modalidad: "SEGUNDO BLOQUE-VIRTUAL" o "SEGUNDO BLOQUE-TEORICO - VIRTUAL"
 *    - Bloque: PRIMERO o SEGUNDO
 *    - Modalidad: VIRTUAL, PRESENCIAL, TEORICO-VIRTUAL, etc.
 *    - Nota: Modalidades compuestas se normalizan (espacios alrededor de guiones se eliminan)
 * 2. Separador: "/" (marca donde empieza el nombre del curso)
 * 3. Nombre del Curso: "ÉNFASIS EN PROGRAMACIÓN MÓVIL"
 *    - Termina en el guion "-" antes de los corchetes
 * 4. Código del Curso: "[GRUPO B01]"
 *    - Entre corchetes []
 *    - Formato: GRUPO + espacio + código
 * 
 * TIPOS DE CÓDIGOS:
 * 
 * 1. CÓDIGO BASE (ej: "EPM")
 *    - Generado con iniciales del nombre del curso
 *    - Omite preposiciones (EN, DE, LA, EL, etc.)
 *    - Si el nombre tiene número al final, se agrega
 *    - Usado para asociar rúbricas
 * 
 * 2. CÓDIGO DEL CURSO (ej: "EPMB01")
 *    - Contenido entre corchetes después de "GRUPO "
 *    - Vocales con tilde se reemplazan por sin tilde
 *    - Formato: [Iniciales][Grupo]
 * 
 * 3. CÓDIGO ÚNICO (ej: "EPMB01-1703012345678")
 *    - Código del curso + timestamp
 *    - Garantiza unicidad en el sistema
 * 
 * EJEMPLOS:
 * 
 * Input: "SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]"
 * Output:
 *   - Bloque: "SEGUNDO"
 *   - Modalidad: "VIRTUAL"
 *   - Nombre: "ÉNFASIS EN PROGRAMACIÓN MÓVIL"
 *   - Código Base: "EPM"
 *   - Código Curso: "EPMB01"
 *   - Código Único: "EPMB01-1703012345678"
 * 
 * Input: "PRIMER BLOQUE-PRESENCIAL/SISTEMAS OPERATIVOS 2-[GRUPO A03]"
 * Output:
 *   - Bloque: "PRIMERO"
 *   - Modalidad: "PRESENCIAL"
 *   - Nombre: "SISTEMAS OPERATIVOS 2"
 *   - Código Base: "SO2"
 *   - Código Curso: "SO2A03"
 *   - Código Único: "SO2A03-1703012345678"
 * 
 * Input: "SEGUNDO BLOQUE-TEORICO - VIRTUAL/FUNDAMENTOS DE GESTIÓN INFORMÁTICA-[GRUPO B02]"
 * Output:
 *   - Bloque: "SEGUNDO"
 *   - Modalidad: "TEORICO-VIRTUAL"
 *   - Nombre: "FUNDAMENTOS DE GESTIÓN INFORMÁTICA"
 *   - Código Base: "FGI"
 *   - Código Curso: "FGIB02"
 *   - Código Único: "FGIB02-1703012345678"
 */

/**
 * Preposiciones a omitir al generar códigos
 */
const PREPOSICIONES = new Set([
    'EN', 'DE', 'LA', 'EL', 'LOS', 'LAS', 'DEL', 'AL', 'A', 'Y', 'O', 'U'
]);

/**
 * Normaliza texto removiendo tildes
 */
function normalizarTexto(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

/**
 * Resultado del parsing de un nombre de curso desde CSV
 */
export interface CursoParseado {
    /** Bloque académico (PRIMERO, SEGUNDO o TRANSVERSAL) */
    bloque: 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL';
    /** Modalidad del curso (VIRTUAL, PRESENCIAL, etc.) */
    modalidad: string;
    /** Nombre completo del curso */
    nombre: string;
    /** Código base generado con iniciales (ej: "EPM", "SO2") */
    codigoBase: string;
    /** Código del curso con grupo (ej: "EPMB01") */
    codigoCurso: string;
    /** Código único con timestamp (ej: "EPMB01-1703012345678") */
    codigoUnico: string;
    /** Año extraído del timestamp o actual */
    anio: number;
    /** 
     * Código abreviado de bloque-modalidad
     * Formato: [Bloque][Modalidad] donde:
     * - Bloque: P (PRIMERO), S (SEGUNDO), T (TRANSVERSAL)
     * - Modalidad: V (VIRTUAL), TV (TEORICO-VIRTUAL), PV (PROYECTO-VIRTUAL), CBV (CIENCIAS BASICAS-VIRTUAL)
     * @example "PV", "STV", "SCBV", "TV"
     */
    codigoBloqueModalidad: string;
    /** 
     * Ingreso académico (A, B, C)
     * Primera letra del código de grupo (ej: de "B01" → "B")
     */
    ingreso: string;
    /** 
     * Código completo para mostrar
     * Formato: codigoBase-ingreso+numero (ej: "EPM-B01")
     */
    codigo: string;
}

/**
 * Mapeo de modalidades a códigos abreviados
 */
const MODALIDADES_ABREVIADAS: Record<string, string> = {
    'VIRTUAL': 'V',
    'TEORICO-VIRTUAL': 'TV',
    'PROYECTO-VIRTUAL': 'PV',
    'CIENCIAS BASICAS-VIRTUAL': 'CBV',
    'CIENCIASBASICAS-VIRTUAL': 'CBV', // Sin espacio
};

/**
 * Genera código abreviado de bloque
 * @param bloque PRIMERO, SEGUNDO o TRANSVERSAL
 * @returns "P", "S" o "T"
 */
export function abreviarBloque(bloque: 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL'): string {
    if (bloque === 'PRIMERO') return 'P';
    if (bloque === 'SEGUNDO') return 'S';
    if (bloque === 'TRANSVERSAL') return 'T';
    return 'P'; // Default
}

/**
 * Genera código abreviado de modalidad
 * Busca en el mapeo predefinido o genera abreviación automática
 * 
 * @param modalidad Modalidad completa (ej: "TEORICO-VIRTUAL")
 * @returns Código abreviado (ej: "TV")
 * 
 * @example
 * abreviarModalidad("VIRTUAL") → "V"
 * abreviarModalidad("TEORICO-VIRTUAL") → "TV"
 * abreviarModalidad("PROYECTO-VIRTUAL") → "PV"
 */
export function abreviarModalidad(modalidad: string): string {
    // Normalizar para búsqueda
    const modalidadNormalizada = modalidad.replace(/\s+/g, '').toUpperCase();

    // Buscar en mapeo predefinido
    if (MODALIDADES_ABREVIADAS[modalidad]) {
        return MODALIDADES_ABREVIADAS[modalidad];
    }

    if (MODALIDADES_ABREVIADAS[modalidadNormalizada]) {
        return MODALIDADES_ABREVIADAS[modalidadNormalizada];
    }

    // Generar abreviación automática tomando iniciales
    const partes = modalidad.split('-');
    return partes.map(parte => {
        const palabras = parte.trim().split(/\s+/);
        return palabras.map(p => p[0]).join('');
    }).join('');
}

/**
 * Genera código completo de bloque-modalidad
 * Formato: [P|S|T][V|TV|PV|CBV|...]
 * 
 * @param bloque PRIMERO, SEGUNDO o TRANSVERSAL
 * @param modalidad Modalidad completa
 * @returns Código abreviado (ej: "PV", "STV", "TV", "SCBV")
 * 
 * @example
 * generarCodigoBloqueModalidad("PRIMERO", "VIRTUAL") → "PV"
 * generarCodigoBloqueModalidad("SEGUNDO", "TEORICO-VIRTUAL") → "STV"
 * generarCodigoBloqueModalidad("TRANSVERSAL", "VIRTUAL") → "TV"
 * generarCodigoBloqueModalidad("SEGUNDO", "CIENCIAS BASICAS-VIRTUAL") → "SCBV"
 */
export function generarCodigoBloqueModalidad(
    bloque: 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL',
    modalidad: string
): string {
    const codigoBloque = abreviarBloque(bloque);
    const codigoModalidad = abreviarModalidad(modalidad);
    return codigoBloque + codigoModalidad;
}

/**
 * Genera el código base a partir del nombre del curso
 * Reglas:
 * - Toma iniciales de palabras significativas
 * - Omite preposiciones
 * - Si hay número al final del nombre, lo agrega
 * - Normaliza vocales con tilde
 * 
 * @example
 * generarCodigoBase("ÉNFASIS EN PROGRAMACIÓN MÓVIL") → "EPM"
 * generarCodigoBase("SISTEMAS OPERATIVOS 2") → "SO2"
 * generarCodigoBase("BASE DE DATOS") → "BD"
 */
export function generarCodigoBase(nombreCurso: string): string {
    const palabras = normalizarTexto(nombreCurso).split(/\s+/);
    const letrasSignificativas: string[] = [];
    let numeroFinal = '';

    palabras.forEach((palabra, index) => {
        // Verificar si es un número
        if (/^\d+$/.test(palabra)) {
            numeroFinal = palabra;
            return;
        }

        // Omitir preposiciones
        if (PREPOSICIONES.has(palabra)) {
            return;
        }

        // Saltar palabras muy cortas (1-2 letras) excepto si es la primera
        if (palabra.length <= 2 && index > 0) {
            return;
        }

        // Tomar primera letra
        letrasSignificativas.push(palabra[0]);
    });

    return letrasSignificativas.join('') + numeroFinal;
}

/**
 * Extrae el código del curso desde el texto entre corchetes
 * Formato esperado: "[GRUPO B01]" → "B01"
 * Luego combina con código base: "EPM" + "B01" → "EPMB01"
 * 
 * @example
 * extraerCodigoCurso("[GRUPO B01]", "EPM") → "EPMB01"
 * extraerCodigoCurso("[GRUPO A03]", "SO2") → "SO2A03"
 */
export function extraerCodigoCurso(textoBrackets: string, codigoBase: string): { codigoCurso: string; codigoGrupo: string; ingreso: string } {
    // Remover corchetes
    const contenido = textoBrackets.replace(/[\[\]]/g, '').trim();

    // Buscar "GRUPO " y tomar lo que sigue
    const match = contenido.match(/GRUPO\s+(.+)/i);
    if (!match) {
        return {
            codigoCurso: codigoBase,
            codigoGrupo: '',
            ingreso: ''
        };
    }

    const codigoGrupo = normalizarTexto(match[1].trim());
    // El ingreso es la primera letra del código de grupo (A, B, C)
    const ingreso = codigoGrupo.charAt(0);

    return {
        codigoCurso: codigoBase + codigoGrupo,
        codigoGrupo,
        ingreso
    };
}

/**
 * Genera código único agregando timestamp
 * 
 * @example
 * generarCodigoUnico("EPMB01") → "EPMB01-1703012345678"
 */
export function generarCodigoUnico(codigoCurso: string): string {
    const timestamp = Date.now();
    return `${codigoCurso}-${timestamp}`;
}

/**
 * Extrae el bloque del texto inicial
 * Busca "PRIMER", "SEGUNDO" o "TRANSVERSAL" en el texto
 * 
 * @example
 * extraerBloque("SEGUNDO BLOQUE-VIRTUAL") → "SEGUNDO"
 * extraerBloque("PRIMER BLOQUE-PRESENCIAL") → "PRIMERO"
 * extraerBloque("TRANSVERSAL-VIRTUAL") → "TRANSVERSAL"
 */
export function extraerBloque(textoBloque: string): 'PRIMERO' | 'SEGUNDO' | 'TRANSVERSAL' {
    const textoNormalizado = normalizarTexto(textoBloque);

    if (textoNormalizado.includes('TRANSVERSAL') || textoNormalizado.includes('TRV')) {
        return 'TRANSVERSAL';
    } else if (textoNormalizado.includes('PRIMER')) {
        return 'PRIMERO';
    } else if (textoNormalizado.includes('SEGUNDO')) {
        return 'SEGUNDO';
    }

    // Default
    return 'PRIMERO';
}

/**
 * Extrae la modalidad del texto de bloque
 * Toma todo lo que está después de "BLOQUE-" y normaliza espacios
 * 
 * @example
 * extraerModalidad("SEGUNDO BLOQUE-VIRTUAL") → "VIRTUAL"
 * extraerModalidad("PRIMER BLOQUE-PRESENCIAL") → "PRESENCIAL"
 * extraerModalidad("SEGUNDO BLOQUE-TEORICO - VIRTUAL") → "TEORICO-VIRTUAL"
 */
export function extraerModalidad(textoBloque: string): string {
    // Buscar todo lo que está después de "BLOQUE-" o "BLOQUE -"
    const match = textoBloque.match(/BLOQUE\s*-\s*(.+)$/i);

    if (match) {
        // Normalizar espacios alrededor de guiones para modalidades compuestas
        // "TEORICO - VIRTUAL" → "TEORICO-VIRTUAL"
        const modalidad = match[1].trim()
            .replace(/\s*-\s*/g, '-')  // Normalizar espacios alrededor de guiones
            .toUpperCase();

        return normalizarTexto(modalidad);
    }

    return 'VIRTUAL'; // Default (nunca PRESENCIAL según el usuario)
}

/**
 * Parsea el campo "Secciones" del CSV y extrae toda la información del curso
 * 
 * Formato esperado:
 * "SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]"
 * 
 * @param seccionesText Texto del campo "Secciones" del CSV
 * @returns Objeto con toda la información parseada del curso
 * 
 * @example
 * parsearNombreCurso("SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]")
 * // Retorna:
 * {
 *   bloque: "SEGUNDO",
 *   modalidad: "VIRTUAL",
 *   nombre: "ÉNFASIS EN PROGRAMACIÓN MÓVIL",
 *   codigoBase: "EPM",
 *   codigoCurso: "EPMB01",
 *   codigoUnico: "EPMB01-1703012345678",
 *   anio: 2024
 * }
 */
export function parsearNombreCurso(seccionesText: string): CursoParseado {
    // 1. Dividir por "/" para separar bloque/modalidad del nombre
    const partes = seccionesText.split('/');

    if (partes.length < 2) {
        throw new Error(`Formato inválido. Se esperaba "/" en: ${seccionesText}`);
    }

    const textoBloque = partes[0].trim();
    const restoTexto = partes.slice(1).join('/').trim();

    // 2. Extraer bloque y modalidad
    const bloque = extraerBloque(textoBloque);
    const modalidad = extraerModalidad(textoBloque);

    // 3. Separar nombre del curso y código entre corchetes
    const matchNombreCodigo = restoTexto.match(/^(.+?)-\[(.+?)\]$/);

    if (!matchNombreCodigo) {
        throw new Error(`Formato inválido. Se esperaba "-[GRUPO XXX]" en: ${restoTexto}`);
    }

    const nombreCurso = matchNombreCodigo[1].trim();
    const textoBrackets = `[${matchNombreCodigo[2].trim()}]`;

    // 4. Generar códigos
    const codigoBase = generarCodigoBase(nombreCurso);
    const { codigoCurso, codigoGrupo, ingreso } = extraerCodigoCurso(textoBrackets, codigoBase);
    const codigoUnico = generarCodigoUnico(codigoCurso);

    // 5. Extraer año del timestamp o usar actual
    const anio = new Date().getFullYear();

    // 6. Generar código bloque-modalidad
    const codigoBloqueModalidad = generarCodigoBloqueModalidad(bloque, modalidad);

    // 7. Generar código para mostrar (ej: "EPM-B01")
    const codigo = codigoGrupo ? `${codigoBase}-${codigoGrupo}` : codigoBase;

    return {
        bloque,
        modalidad,
        nombre: nombreCurso,
        codigoBase,
        codigoCurso,
        codigoUnico,
        anio,
        codigoBloqueModalidad,
        ingreso,
        codigo
    };
}

/**
 * Función de prueba para validar el parsing
 * Útil para debugging y verificación
 */
export function probarParsing(ejemplos: string[]): void {
    console.log('='.repeat(80));
    console.log('PRUEBAS DE PARSING DE NOMBRES DE CURSO');
    console.log('='.repeat(80));

    ejemplos.forEach((ejemplo, index) => {
        console.log(`\n[${index + 1}] Input:`);
        console.log(`    "${ejemplo}"`);

        try {
            const resultado = parsearNombreCurso(ejemplo);
            console.log('    Output:');
            console.log(`      Bloque:              ${resultado.bloque}`);
            console.log(`      Modalidad:           ${resultado.modalidad}`);
            console.log(`      Código Bloque-Mod:   ${resultado.codigoBloqueModalidad}`);
            console.log(`      Nombre:              ${resultado.nombre}`);
            console.log(`      Código Base:         ${resultado.codigoBase}`);
            console.log(`      Código Curso:        ${resultado.codigoCurso}`);
            console.log(`      Código Único:        ${resultado.codigoUnico}`);
            console.log(`      Año:                 ${resultado.anio}`);
        } catch (error) {
            console.error(`    ❌ Error: ${(error as Error).message}`);
        }
    });

    console.log('\n' + '='.repeat(80));
}
