# ============================================================
# ionic-restart.ps1 - Script de reinicio limpio para Ionic
# Gestor de Proyectos EPM - Politécnico Grancolombiano
# ============================================================

param(
    [switch]$Force,      # Forzar limpieza de caché
    [switch]$Quiet       # Modo silencioso
)

# Colores para mensajes
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warning($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Banner
if (-not $Quiet) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Magenta
    Write-Host "  IONIC RESTART - Gestor de Proyectos EPM  " -ForegroundColor Magenta
    Write-Host "============================================" -ForegroundColor Magenta
    Write-Host ""
}

# Obtener directorio del proyecto
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "$projectRoot\package.json")) {
    $projectRoot = Get-Location
}

Set-Location $projectRoot
Write-Info "Directorio del proyecto: $projectRoot"

# ============================================================
# PASO 1: Detectar procesos de Node.js relacionados con Ionic
# ============================================================
Write-Info "Buscando procesos de Node.js activos..."

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$ionicProcessCount = 0

if ($nodeProcesses) {
    $ionicProcessCount = $nodeProcesses.Count
    
    if ($ionicProcessCount -gt 0) {
        Write-Warning "Se encontraron $ionicProcessCount proceso(s) de Node.js activos"
        
        # Mostrar detalles de los procesos
        foreach ($proc in $nodeProcesses) {
            try {
                $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
                if ($cmdLine -match "ionic|angular|ng|vite|esbuild") {
                    Write-Host "  PID: $($proc.Id) - Memoria: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
                }
            } catch {
                Write-Host "  PID: $($proc.Id)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
}

# ============================================================
# PASO 2: Detener procesos conflictivos
# ============================================================
if ($ionicProcessCount -gt 0) {
    Write-Info "Deteniendo procesos de Node.js..."
    
    try {
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Verificar que se detuvieron
        $remainingProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Warning "Algunos procesos persisten, forzando terminación..."
            $remainingProcesses | ForEach-Object { 
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue 
            }
            Start-Sleep -Seconds 1
        }
        
        Write-Success "Procesos de Node.js detenidos correctamente"
    } catch {
        Write-Error "Error al detener procesos: $_"
    }
} else {
    Write-Success "No hay procesos de Node.js activos"
}

# ============================================================
# PASO 3: Verificar y limpiar caché de Angular
# ============================================================
$angularCache = Join-Path $projectRoot ".angular"
$cacheCorrupt = $false

if (Test-Path $angularCache) {
    # Verificar si hay archivos temporales huérfanos (indicador de caché corrupta)
    $tempFiles = Get-ChildItem -Path $angularCache -Recurse -Filter "*_temp_*" -ErrorAction SilentlyContinue
    $lockFiles = Get-ChildItem -Path $angularCache -Recurse -Filter "*.lock" -ErrorAction SilentlyContinue
    
    if ($tempFiles -or $lockFiles -or $Force) {
        $cacheCorrupt = $true
        Write-Warning "Caché de Angular posiblemente corrupta"
    }
}

if ($cacheCorrupt -or $Force) {
    Write-Info "Limpiando caché de Angular..."
    
    try {
        # Intentar eliminar varias veces (Windows a veces mantiene locks)
        $maxRetries = 3
        for ($i = 1; $i -le $maxRetries; $i++) {
            Remove-Item -Path $angularCache -Recurse -Force -ErrorAction SilentlyContinue
            
            if (-not (Test-Path $angularCache)) {
                Write-Success "Caché de Angular eliminada correctamente"
                break
            }
            
            if ($i -lt $maxRetries) {
                Write-Warning "Reintentando eliminación de caché ($i/$maxRetries)..."
                Start-Sleep -Seconds 2
            }
        }
        
        if (Test-Path $angularCache) {
            Write-Warning "No se pudo eliminar completamente la caché, continuando..."
        }
    } catch {
        Write-Error "Error al limpiar caché: $_"
    }
} else {
    Write-Info "Caché de Angular en buen estado"
}

# ============================================================
# PASO 4: Verificar puerto 8100
# ============================================================
Write-Info "Verificando disponibilidad del puerto 8100..."

$portInUse = Get-NetTCPConnection -LocalPort 8100 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Warning "Puerto 8100 en uso, liberando..."
    
    foreach ($conn in $portInUse) {
        try {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignorar errores
        }
    }
    Start-Sleep -Seconds 1
    Write-Success "Puerto 8100 liberado"
} else {
    Write-Success "Puerto 8100 disponible"
}

# ============================================================
# PASO 5: Iniciar Ionic Serve
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Iniciando servidor de desarrollo...      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Info "Ejecutando: ionic serve"
Write-Host ""

# Ejecutar ionic serve
try {
    & ionic serve
} catch {
    Write-Error "Error al iniciar Ionic: $_"
    exit 1
}
