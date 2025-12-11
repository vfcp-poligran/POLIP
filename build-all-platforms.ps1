# build-all-platforms.ps1
# Script PowerShell para compilar en todas las plataformas

Write-Host "🚀 Iniciando compilación multiplataforma..." -ForegroundColor Green

# 1. Limpiar builds anteriores
Write-Host "🧹 Limpiando builds anteriores..." -ForegroundColor Yellow
if (Test-Path "www") {
    Remove-Item -Recurse -Force "www"
}

# 2. Build de producción
Write-Host "📦 Construyendo aplicación para producción..." -ForegroundColor Blue
& ionic build --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en build de producción" -ForegroundColor Red
    exit 1
}

# 3. Sincronizar con plataformas nativas
Write-Host "🔄 Sincronizando con plataformas nativas..." -ForegroundColor Blue
& npx cap sync

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en sincronización" -ForegroundColor Red
    exit 1
}

# 4. Verificar archivos generados
Write-Host "✅ Verificando archivos generados..." -ForegroundColor Green

if (Test-Path "www") {
    $wwwSize = (Get-ChildItem -Recurse www | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   ✅ Web PWA: www/ generado correctamente" -ForegroundColor Green
    Write-Host "      📊 Tamaño: $([math]::Round($wwwSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ Web PWA: www/ no encontrado" -ForegroundColor Red
}

if (Test-Path "android/app/src/main/assets/public") {
    Write-Host "   ✅ Android: Código sincronizado" -ForegroundColor Green
    Write-Host "      📁 Assets: android/app/src/main/assets/public/" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ Android: Assets no sincronizados" -ForegroundColor Red
}

if (Test-Path "ios/App/App/public") {
    Write-Host "   ✅ iOS: Código sincronizado" -ForegroundColor Green
    Write-Host "      📁 Assets: ios/App/App/public/" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ iOS: Assets no sincronizados" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 ¡Compilación multiplataforma completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   🌐 Web PWA: Servir desde /www con servidor HTTPS" -ForegroundColor White
Write-Host "   🤖 Android: Abrir /android en Android Studio" -ForegroundColor White
Write-Host "   🍎 iOS: Abrir /ios/App/App.xcworkspace en Xcode" -ForegroundColor White
Write-Host ""

# Estadísticas del build
if (Test-Path "www") {
    $jsFiles = (Get-ChildItem -Recurse www -Filter "*.js").Count
    $cssFiles = (Get-ChildItem -Recurse www -Filter "*.css").Count
    $assetFiles = if (Test-Path "www/assets") { (Get-ChildItem -Recurse www/assets -File).Count } else { 0 }
    
    Write-Host "📊 Estadísticas del build:" -ForegroundColor Yellow
    Write-Host "   📦 Archivos JS: $jsFiles" -ForegroundColor Cyan
    Write-Host "   🎨 Archivos CSS: $cssFiles" -ForegroundColor Cyan
    Write-Host "   🖼️ Archivos de assets: $assetFiles" -ForegroundColor Cyan
}