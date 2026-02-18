# 🎯 Quick Start - Pruebas de Rendimiento

## ⚡ Instalación Rápida

### 1. Descargar e instalar

**Docker Desktop:**
- https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

**k6:**
- https://dl.k6.io/msi/k6-latest-amd64.msi

### 2. Construir imagen

```powershell
docker build -t ooh-app .
```

### 3. Ejecutar contenedor

```powershell
docker run -d -p 8080:8080 --name ooh-test ooh-app
```

### 4. Ejecutar pruebas (2 terminales)

**Terminal 1:**
```powershell
node monitor-docker.js
```

**Terminal 2 (espera 10 seg):**
```powershell
k6 run load-test.js
```

### 5. Generar reporte

```powershell
node generate-performance-report.js
```

---

## 📁 Ver resultados

Los reportes se guardan en: `performance-reports/`

---

**📖 Documentación completa**: Ver `PERFORMANCE_TESTS.md`
