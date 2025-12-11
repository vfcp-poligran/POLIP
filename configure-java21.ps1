# Script para configurar Java 21 como versión por defecto
# Ejecutar como administrador para cambios permanentes

# Configurar JAVA_HOME para Java 21
$JAVA21_HOME = "C:\Users\vfcp1\.jdk\jdk-21.0.8(1)"

Write-Host "Configurando JAVA_HOME para Java 21..." -ForegroundColor Green
[Environment]::SetEnvironmentVariable("JAVA_HOME", $JAVA21_HOME, "User")

# Actualizar PATH para incluir Java 21
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = "$JAVA21_HOME\bin;$currentPath"

# Remover entradas previas de Java del PATH
$newPath = $newPath -replace "C:\\Program Files\\Eclipse Adoptium\\jdk-[^;]*;", ""
$newPath = $newPath -replace "C:\\Program Files\\Java\\jdk-[^;]*;", ""

Write-Host "Actualizando PATH..." -ForegroundColor Green
[Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

Write-Host "Configuración completada. Reinicia VS Code o el terminal para que los cambios surtan efecto." -ForegroundColor Yellow
Write-Host "Para verificar: java -version" -ForegroundColor Cyan
