// Script para verificar y limpiar rúbricas en el navegador
// Abre la consola del navegador (F12) y ejecuta:

console.log('=== VERIFICACIÓN DE RÚBRICAS ALMACENADAS ===');

// 1. Ver todas las keys en localStorage
console.log('📦 Keys en localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(  - );
}

// 2. Ver rúbricas específicas
const rubricasAntiguas = localStorage.getItem('rubricas');
const rubricasNuevas = localStorage.getItem('STORAGE_KEYS.RUBRICAS');

console.log('\n�� Rúbricas antiguas (localStorage.rubricas):');
if (rubricasAntiguas) {
  const parsed = JSON.parse(rubricasAntiguas);
  console.log(parsed);
} else {
  console.log('  (vacío)');
}

console.log('\n📋 Rúbricas nuevas (STORAGE_KEYS.RUBRICAS):');
if (rubricasNuevas) {
  const parsed = JSON.parse(rubricasNuevas);
  console.log(parsed);
} else {
  console.log('  (vacío)');
}

// 3. Para limpiar todo y empezar de cero:
console.log('\n🧹 Para limpiar TODO el almacenamiento:');
console.log('  localStorage.clear();');
console.log('  location.reload();');

// 4. Para limpiar solo rúbricas:
console.log('\n🧹 Para limpiar SOLO rúbricas:');
console.log('  localStorage.removeItem(\"rubricas\");');
console.log('  localStorage.removeItem(\"STORAGE_KEYS.RUBRICAS\");');
console.log('  localStorage.removeItem(\"rubricas_migrado\");');
console.log('  location.reload();');
