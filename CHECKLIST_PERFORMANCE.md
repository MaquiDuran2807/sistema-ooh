# ✅ Checklist - Preparación para Pruebas de Rendimiento

Usa esta lista para verificar que tienes todo listo antes de ejecutar las pruebas.

---

## 📦 Instalación de Software

- [ ] **Docker Desktop** instalado y corriendo
  - Descarga: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
  - Verificar: `docker --version`
  - Estado: Ícono de ballena en system tray sin parpadear

- [ ] **k6** instalado
  - Descarga: https://dl.k6.io/msi/k6-latest-amd64.msi
  - Verificar: `k6 version`

- [ ] **Node.js** instalado (18+)
  - Verificar: `node --version`

- [ ] **Git** instalado (para clonar repo)
  - Verificar: `git --version`

---

## 📂 Preparación del Proyecto

- [ ] Repositorio clonado en tu PC personal
  ```powershell
  git clone <url> ooh-app
  cd ooh-app
  ```

- [ ] Carpeta `performance-reports` creada (se crea automáticamente)

- [ ] Puerto 8080 disponible
  ```powershell
  netstat -ano | findstr :8080
  # No debe mostrar nada
  ```

---

## 🏗️ Build y Ejecución

- [ ] Imagen Docker construida
  ```powershell
  docker build -t ooh-app .
  ```
  ⏱️ Puede tardar 5-10 minutos

- [ ] Contenedor ejecutándose
  ```powershell
  docker run -d -p 8080:8080 --name ooh-test ooh-app
  ```

- [ ] API responde correctamente
  ```powershell
  curl http://localhost:8080/api/health
  # Debe devolver: {"status":"ok"}
  ```

---

## 🧪 Ejecución de Pruebas

### Terminal 1: Monitoreo Docker

- [ ] Terminal PowerShell abierta
- [ ] Ejecutar: `node monitor-docker.js`
- [ ] Debe mostrar tabla de métricas cada segundo

### Terminal 2: Pruebas k6 (esperar 10 segundos)

- [ ] Terminal PowerShell abierta
- [ ] Ejecutar: `k6 run load-test.js`
- [ ] Debe mostrar progreso de escenarios

### Esperar 20 minutos

- [ ] Ambos scripts terminaron sin errores
- [ ] Archivos generados en `performance-reports/`:
  - [ ] `k6-summary-*.json`
  - [ ] `docker-stats-*.json`
  - [ ] `docker-stats-*.csv`

---

## 📊 Generación de Reporte

- [ ] Ejecutar: `node generate-performance-report.js`
- [ ] Archivo generado: `performance-reports/performance-report-*.md`
- [ ] Revisar reporte con recomendaciones

---

## 🧹 Limpieza (Opcional)

Si quieres empezar de nuevo:

- [ ] Detener contenedor: `docker stop ooh-test`
- [ ] Eliminar contenedor: `docker rm ooh-test`
- [ ] Eliminar imagen (opcional): `docker rmi ooh-app`
- [ ] Limpiar reportes anteriores: `rmdir /s performance-reports`

---

## ❓ Troubleshooting

### ❌ "Cannot connect to Docker daemon"
- [ ] Abre Docker Desktop
- [ ] Espera a que inicie completamente (ícono deja de parpadear)
- [ ] Ejecuta: `docker ps`

### ❌ "Port 8080 already in use"
- [ ] Ejecuta: `docker ps -a`
- [ ] Si ves `ooh-test`, ejecuta: `docker rm -f ooh-test`
- [ ] Vuelve a ejecutar: `docker run -d -p 8080:8080 --name ooh-test ooh-app`

### ❌ "k6 command not found"
- [ ] Reinicia PowerShell
- [ ] Si persiste, usa ruta completa: `C:\Program Files\k6\k6.exe run load-test.js`

### ❌ Contenedor no responde
- [ ] Ver logs: `docker logs ooh-test`
- [ ] Si hay error, reconstruir: `docker build -t ooh-app . --no-cache`

---

## 🎯 Resultado Esperado

Al finalizar debes tener:

- ✅ Reporte en Markdown con métricas detalladas
- ✅ Recomendaciones de configuración para Cloud Run
- ✅ Estimación de costos mensuales
- ✅ Archivos CSV/JSON para análisis adicional

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa la sección Troubleshooting
2. Consulta logs del contenedor: `docker logs ooh-test`
3. Revisa `PERFORMANCE_TESTS.md` para más detalles
4. Verifica que Docker Desktop está corriendo

---

**¿Todo listo?** ✅

Ejecuta: `run-performance-tests.bat` para automatizar pasos 1-5 del checklist.
