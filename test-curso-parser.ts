/**
 * Script de prueba para validar el parsing de nombres de curso
 * Ejecutar con: ts-node test-curso-parser.ts
 */

import { parsearNombreCurso, probarParsing } from './src/app/utils/curso-parser.util';

// Ejemplos de nombres de cursos reales
const ejemplos = [
    'SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B01]',
    'SEGUNDO BLOQUE-TEORICO - VIRTUAL/FUNDAMENTOS DE GESTIÓN INFORMÁTICA-[GRUPO B02]',
    'PRIMER BLOQUE-VIRTUAL/CONCEPTOS FUNDAMENTALES DE PROGRAMACIÓN-[GRUPO B01]',
    'SEGUNDO BLOQUE-PROYECTO - VIRTUAL/PARADIGMAS DE PROGRAMACIÓN-[GRUPO B01]',
    'PRIMER BLOQUE-CIENCIAS BASICAS - VIRTUAL/HERRAMIENTAS PARA LA PRODUCTIVIDAD-[GRUPO E01]'
];

console.log('\n🧪 PRUEBAS DE PARSING DE CURSOS\n');
console.log('='.repeat(80));

ejemplos.forEach((ejemplo, index) => {
    console.log(`\n[${index + 1}] Input:`);
    console.log(`    "${ejemplo}"`);

    try {
        const resultado = parsearNombreCurso(ejemplo);
        console.log('    ✅ Output:');
        console.log(`       Bloque:              ${resultado.bloque}`);
        console.log(`       Modalidad:           ${resultado.modalidad}`);
        console.log(`       Código Bloque-Mod:   ${resultado.codigoBloqueModalidad} ⭐`);
        console.log(`       Nombre:              ${resultado.nombre}`);
        console.log(`       Código Base:         ${resultado.codigoBase}`);
        console.log(`       Código Curso:        ${resultado.codigoCurso}`);
        console.log(`       Código Único:        ${resultado.codigoUnico}`);
        console.log(`       Año:                 ${resultado.anio}`);
    } catch (error) {
        console.error(`    ❌ Error: ${(error as Error).message}`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 RESUMEN DE CÓDIGOS BLOQUE-MODALIDAD:\n');

ejemplos.forEach((ejemplo, index) => {
    try {
        const resultado = parsearNombreCurso(ejemplo);
        console.log(`${index + 1}. ${resultado.codigoBloqueModalidad.padEnd(6)} - ${resultado.nombre}`);
    } catch (error) {
        console.log(`${index + 1}. ERROR  - ${ejemplo}`);
    }
});

console.log('\n');
