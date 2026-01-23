# Script para iniciar ambos servidores OOH
# Uso: .\start-all.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   INICIANDO SERVIDOR OOH" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "c:\Users\migduran\Documents\nuevo ooh"
$backendPath = "$projectPath\backend"
$frontendPath = "$projectPath\frontend"
$nodePath = "C:\Program Files\nodejs"

# Agregar Node al PATH
$env:PATH = "$nodePath;$env:PATH"

Write-Host "[*] BACKEND iniciando en puerto 8080..."
Write-Host "[*] FRONTEND iniciando en puerto 3000..."
Write-Host ""
Write-Host "Espera a que las ventanas se abran..."
Write-Host ""

# Iniciar Backend en ventana nueva
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$backendPath`" && `"$nodePath\node.exe`" server.js" `
    -WindowStyle Normal `
    -PassThru | Out-Null

Write-Host "[✓] Backend iniciado" -ForegroundColor Green

# Esperar 3 segundos
Start-Sleep -Seconds 3

# Iniciar Frontend en ventana nueva
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontendPath`" && `"$nodePath\npm.cmd`" start" `
    -WindowStyle Normal `
    -PassThru | Out-Null

Write-Host "[✓] Frontend iniciado" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   ✅ AMBOS SERVIDORES INICIADOS" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Las ventanas de los servidores están activas. Ciérralas para detener."
