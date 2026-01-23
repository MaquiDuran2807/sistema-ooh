# Script para reorganizar imágenes a estructura simple: MARCA/id_N.jpg

$baseDir = "c:\Users\migduran\Documents\nuevo ooh\backend\local-images"

Write-Host "Reorganizando imagenes..." -ForegroundColor Cyan

# Obtener todos los archivos de imagen
$allFiles = Get-ChildItem -Path $baseDir -Recurse -File -Filter "*.jpg"

$moved = 0
$skipped = 0

foreach ($file in $allFiles) {
    # Extraer ID del nombre del archivo (GUID al inicio)
    if ($file.Name -match '^([a-f0-9\-]{36})') {
        $id = $matches[1]
        
        # Extraer número de imagen del final (_1.jpg, _2.jpg, _3.jpg)
        if ($file.Name -match '_(\d+)\.jpg$') {
            $num = $matches[1]
        } else {
            Write-Host "No se pudo extraer numero de: $($file.Name)" -ForegroundColor Yellow
            $skipped++
            continue
        }
        
        # Determinar marca desde el path relativo
        $relativePath = $file.Directory.FullName.Substring($baseDir.Length).TrimStart('\')
        $marca = $relativePath.Split('\')[0]
        
        if ([string]::IsNullOrWhiteSpace($marca)) {
            Write-Host "No se pudo determinar marca de: $($file.FullName)" -ForegroundColor Yellow
            $skipped++
            continue
        }
        
        # Nueva ruta: MARCA/id_N.jpg
        $newDir = Join-Path -Path $baseDir -ChildPath $marca
        $newName = "${id}_${num}.jpg"
        $newPath = Join-Path -Path $newDir -ChildPath $newName
        
        # Crear directorio si no existe
        if (-not (Test-Path $newDir)) {
            New-Item -Path $newDir -ItemType Directory -Force | Out-Null
        }
        
        # Si ya existe en la nueva ubicación, skip
        if ($file.FullName -eq $newPath) {
            Write-Host "Ya esta en la ubicacion correcta: $newName" -ForegroundColor Green
            $skipped++
            continue
        }
        
        # Si ya existe un archivo con ese nombre, omitir
        if (Test-Path $newPath) {
            Write-Host "Ya existe $newName, omitiendo..." -ForegroundColor Yellow
            $skipped++
            continue
        }
        
        # Mover archivo
        Move-Item -Path $file.FullName -Destination $newPath -Force
        Write-Host "Movido: $($file.Name) -> $marca\$newName" -ForegroundColor Green
        $moved++
    } else {
        Write-Host "Formato de nombre no reconocido: $($file.Name)" -ForegroundColor Yellow
        $skipped++
    }
}

Write-Host ""
Write-Host "Reorganizacion completada:" -ForegroundColor Cyan
Write-Host "   - Archivos movidos: $moved" -ForegroundColor Green
Write-Host "   - Archivos omitidos: $skipped" -ForegroundColor Yellow

# Limpiar carpetas vacías
Write-Host ""
Write-Host "Limpiando carpetas vacias..." -ForegroundColor Cyan
Get-ChildItem -Path $baseDir -Recurse -Directory | 
    Where-Object { (Get-ChildItem $_.FullName -Recurse -File).Count -eq 0 } |
    Remove-Item -Recurse -Force

Write-Host "Listo!" -ForegroundColor Green
