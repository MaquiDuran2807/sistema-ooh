# 📊 Guía de Pruebas de Rendimiento

Esta guía te ayudará a medir el rendimiento de la aplicación OOH usando Docker y k6.

---

## 📋 Pre-requisitos

### 1. Instalar Docker Desktop para Windows

**Opción A: Descarga directa (.exe)**
- Descarga: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
- Ejecuta el instalador
- Reinicia tu PC cuando te lo pida
- Abre Docker Desktop y espera a que inicie

**Verificar instalación:**
```powershell
docker --version
docker ps
```

### 2. Instalar k6 (herramienta de pruebas de carga)

**Opción A: Descarga directa (.msi)**
- Descarga: https://dl.k6.io/msi/k6-latest-amd64.msi
- Ejecuta el instalador
- Abre una nueva terminal PowerShell

**Opción B: Con Chocolatey**
```powershell
choco install k6
```

**Verificar instalación:**
```powershell
k6 version
```

---

## 🚀 Pasos para Ejecutar las Pruebas

### Paso 1: Clonar el repositorio (en tu PC personal)

```powershell
cd C:\
git clone <url-del-repositorio> ooh-app
cd ooh-app
```

### Paso 2: Construir la imagen Docker

```powershell
docker build -t ooh-app .
```

⏱️ Este paso puede tardar 5-10 minutos la primera vez.

### Paso 3: Ejecutar el contenedor

```powershell
docker run -d -p 8080:8080 --name ooh-test ooh-app
```

**Verificar que esté corriendo:**
```powershell
docker ps
```

Deberías ver algo como:
```
CONTAINER ID   IMAGE      COMMAND        STATUS         PORTS                    NAMES
abc123def456   ooh-app    "node server"  Up 10 seconds  0.0.0.0:8080->8080/tcp   ooh-test
```

**Verificar que responde:**
```powershell
curl http://localhost:8080/api/health
```

### Paso 4: Ejecutar pruebas de rendimiento

Abre **DOS TERMINALES** de PowerShell en el directorio del proyecto:

#### Terminal 1: Monitoreo de Docker (CPU/Memoria)

```powershell
node monitor-docker.js
```

Este script:
- Recolecta CPU y memoria cada segundo
- Dura 20 minutos (para cubrir todas las pruebas k6)
- Genera archivos CSV y JSON en `performance-reports/`

#### Terminal 2: Pruebas de carga con k6 (después de 10 segundos)

```powershell
k6 run load-test.js
```

Este script:
- Escenario 1 (0-5 min): Idle - 1 usuario
- Escenario 2 (5-10 min): Tráfico bajo - 1-3 usuarios
- Escenario 3 (10-15 min): Tráfico normal - 5-10 usuarios
- Escenario 4 (15-20 min): Tráfico alto - 15-20 usuarios
- Genera archivo JSON en `performance-reports/`

⏱️ Las pruebas duran **20 minutos** en total.

### Paso 5: Generar reporte final

Cuando ambas pruebas terminen, ejecuta:

```powershell
node generate-performance-report.js
```

Este script:
- Lee los resultados de k6 y Docker
- Genera un reporte Markdown consolidado
- Incluye métricas, gráficos y recomendaciones

---

## 📁 Archivos Generados

Todos los reportes se guardan en `performance-reports/`:

```
performance-reports/
├── k6-summary-2026-02-12T10-30-00.json          # Métricas de k6
├── docker-stats-2026-02-12T10-30-00.json        # Métricas de Docker (JSON)
├── docker-stats-2026-02-12T10-30-00.csv         # Métricas de Docker (CSV)
└── performance-report-2026-02-12T10-50-00.md    # Reporte final
```

---

## 🔧 Comandos Útiles de Docker

### Ver logs del contenedor
```powershell
docker logs ooh-test
```

### Ver logs en tiempo real
```powershell
docker logs -f ooh-test
```

### Entrar al contenedor (debug)
```powershell
docker exec -it ooh-test sh
```

### Detener el contenedor
```powershell
docker stop ooh-test
```

### Eliminar el contenedor
```powershell
docker rm ooh-test
```

### Ver estadísticas en tiempo real
```powershell
docker stats ooh-test
```

### Reiniciar prueba limpia
```powershell
docker stop ooh-test
docker rm ooh-test
docker run -d -p 8080:8080 --name ooh-test ooh-app
```

---

## 📊 Interpretación de Resultados

### CPU

- **< 20%**: Recursos sobran, puedes usar instancias más pequeñas
- **20-50%**: Rango óptimo para producción
- **50-70%**: Considerar más recursos en picos
- **> 70%**: Necesitas más CPU o optimización

### Memoria

- **< 256 MB**: Excelente, app ligera
- **256-512 MB**: Normal para apps Node.js
- **512 MB - 1 GB**: Considera optimizar queries o cachés
- **> 1 GB**: Revisar memory leaks o datos en memoria

### Latencia (P95)

- **< 500 ms**: Excelente
- **500 ms - 1s**: Bueno
- **1s - 2s**: Aceptable
- **> 2s**: Usuarios percibirán lentitud

### Tasa de Errores

- **< 0.1%**: Excelente
- **0.1% - 1%**: Aceptable
- **1% - 5%**: Revisar logs
- **> 5%**: Problema crítico

---

## 🚀 Configuración Recomendada para Cloud Run

Basado en tu escenario (15 usuarios concurrentes máximo):

```yaml
# cloud-run-config.yaml
resourceLimits:
  cpu: 1        # 1 vCPU
  memory: 512Mi # 512 MB

autoscaling:
  minInstances: 0   # Scale to zero cuando no hay tráfico
  maxInstances: 3   # Para picos de tráfico
  concurrency: 20   # Requests por instancia

timeout: 300s       # 5 minutos para importaciones

environment:
  NODE_ENV: production
  USE_GCS: true
  USE_BIGQUERY: true
```

### Estimación de Costos (mensual)

Con 15 usuarios, ~5 días/semana, ~4 horas/día:

```
CPU: ~20 horas/mes × $0.024/vCPU-hour = ~$0.48
Memoria: ~20 horas/mes × $0.0025/GB-hour × 0.5GB = ~$0.03
Requests: ~50,000/mes × $0.40/millón = ~$0.02

Total estimado: ~$0.53/mes (dentro de free tier de $300)
```

---

## ❓ Troubleshooting

### Error: "Cannot connect to Docker daemon"
- Abre Docker Desktop
- Espera a que el ícono de la ballena deje de parpadear
- Verifica: `docker ps`

### Error: "port 8080 already in use"
```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :8080

# Detener contenedor anterior
docker stop ooh-test
docker rm ooh-test
```

### k6 no se reconoce como comando
- Reinicia PowerShell después de instalar
- O usa ruta completa: `C:\Program Files\k6\k6.exe run load-test.js`

### El monitoreo no encuentra el contenedor
```powershell
# Verificar nombre del contenedor
docker ps

# Si el nombre es diferente, especifica:
$env:CONTAINER_NAME="nombre-real"
node monitor-docker.js
```

### La app no responde en localhost:8080
```powershell
# Ver logs del contenedor
docker logs ooh-test

# Verificar que esté corriendo
docker ps

# Reiniciar
docker restart ooh-test
```

---

## 📚 Recursos Adicionales

- **Documentación k6**: https://k6.io/docs/
- **Docker Docs**: https://docs.docker.com/
- **Cloud Run Pricing**: https://cloud.google.com/run/pricing
- **Cloud Run Best Practices**: https://cloud.google.com/run/docs/tips

---

## 🎯 Próximos Pasos

1. Ejecuta las pruebas en tu PC personal
2. Revisa el reporte generado
3. Ajusta configuración de Cloud Run según recomendaciones
4. Despliega en Cloud Run con:
   ```bash
   gcloud run deploy ooh-app \
     --image gcr.io/PROJECT_ID/ooh-app \
     --platform managed \
     --region us-central1 \
     --cpu 1 \
     --memory 512Mi \
     --max-instances 3
   ```
5. Monitorea métricas en Cloud Console

---

*¿Preguntas? Revisa la sección de Troubleshooting o consulta los logs del contenedor.*
