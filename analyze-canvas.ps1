# Simular el contenido del CSV adjuntado
$csvContent = @"
Student,ID,SIS Login ID,Section,Entrega proyecto 1 - Escenario 3 (524895),Entrega proyecto 2 - Escenario 5 (524896)
    Points Possible,,,,150.00,150.00
"ACOSTA CAPERA, LANY MICHEL ",164324,lmiacosta@poligran.edu.co,SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B02],,
"Alejandro, Neira Moreno Diego",112167,dineiram@poligran.edu.co,SEGUNDO BLOQUE-VIRTUAL/ÉNFASIS EN PROGRAMACIÓN MÓVIL-[GRUPO B02],,
"@

$lines = $csvContent -split "`n"

Write-Host "=== ANÁLISIS DETALLADO CSV CANVAS CALIFICACIONES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "LÍNEA 0 (Headers):" -ForegroundColor Yellow
Write-Host $lines[0]
Write-Host ""
Write-Host "LÍNEA 1 (Points Possible):" -ForegroundColor Red
Write-Host $lines[1]
Write-Host ""
Write-Host "LÍNEA 2 (Primer estudiante):" -ForegroundColor Green
Write-Host $lines[2]
Write-Host ""
Write-Host "LÍNEA 3 (Segundo estudiante):" -ForegroundColor Green
Write-Host $lines[3]
Write-Host ""

# Parsear manualmente respetando comillas
function Parse-CSVLine {
    param([string]$line)
    $result = @()
    $inQuotes = $false
    $current = ''
    
    for ($i = 0; $i -lt $line.Length; $i++) {
        $char = $line[$i]
        
        if ($char -eq '"') {
            $inQuotes = -not $inQuotes
        }
        elseif ($char -eq ',' -and -not $inQuotes) {
            $result += $current.Trim()
            $current = ''
        }
        else {
            $current += $char
        }
    }
    $result += $current.Trim()
    return $result
}

Write-Host "=== DESGLOSE CAMPO POR CAMPO ===" -ForegroundColor Magenta
Write-Host ""
Write-Host "Headers parseados:" -ForegroundColor Yellow
$headers = Parse-CSVLine $lines[0]
for ($i = 0; $i -lt $headers.Count; $i++) {
    Write-Host "  [$i] = '$($headers[$i])'"
}

Write-Host ""
Write-Host "Línea 'Points Possible' parseada:" -ForegroundColor Red
$points = Parse-CSVLine $lines[1]
for ($i = 0; $i -lt [Math]::Min(6, $points.Count); $i++) {
    Write-Host "  [$i] = '$($points[$i])'"
}

Write-Host ""
Write-Host "Primer estudiante parseado:" -ForegroundColor Green
$est1 = Parse-CSVLine $lines[2]
for ($i = 0; $i -lt [Math]::Min(6, $est1.Count); $i++) {
    Write-Host "  [$i] = '$($est1[$i])'"
}

Write-Host ""
Write-Host "Segundo estudiante parseado:" -ForegroundColor Green
$est2 = Parse-CSVLine $lines[3]
for ($i = 0; $i -lt [Math]::Min(6, $est2.Count); $i++) {
    Write-Host "  [$i] = '$($est2[$i])'"
}
