export class CsvUtils {
  /**
   * Parsea una fila CSV manejando comillas correctamente
   */
  static parseCSVRow(csvRow: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < csvRow.length) {
      const char = csvRow[i];

      if (char === '"' && (i === 0 || csvRow[i - 1] === ',')) {
        // Inicio de campo con comillas
        insideQuotes = true;
      } else if (char === '"' && insideQuotes && (i === csvRow.length - 1 || csvRow[i + 1] === ',')) {
        // Final de campo con comillas
        insideQuotes = false;
      } else if (char === ',' && !insideQuotes) {
        // Separador de campo
        result.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
      }

      i++;
    }

    // Agregar último campo
    result.push(currentField.trim());

    return result;
  }

  /**
   * Construye una fila CSV manejando comillas cuando sea necesario
   */
  static buildCSVRow(fields: string[]): string {
    return fields.map(field => {
      const fieldStr = field?.toString() || '';
      // Agregar comillas si el campo contiene comas, comillas o saltos de línea
      if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
        return `"${fieldStr.replace(/"/g, '""')}"`;
      }
      return fieldStr;
    }).join(',');
  }
}
