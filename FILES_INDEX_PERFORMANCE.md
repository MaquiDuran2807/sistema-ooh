# 📦 Archivos de Pruebas de Rendimiento - Índice

Este documento describe todos los archivos creados para las pruebas de rendimiento.

---

## 🔧 Archivos de Configuración Docker

### `Dockerfile`
Imagen Docker multi-stage para producción:
- Stage 1: Build del frontend React
- Stage 2: Backend Node.js + frontend estático
- Optimizado para Cloud Run
- Incluye health check

### `.dockerignore`
Excluye archivos innecesarios del build:
- node_modules, logs, tests
- Archivos de desarrollo
- Documentación
- Reduce tamaño de imagen en ~70%

---

## 📊 Scripts de Pruebas

### `load-test.js` (k6)
**Propósito**: Simular tráfico de usuarios y medir rendimiento

**Escenarios** (20 minutos total):
1. **Idle** (0-5 min): 1 usuario - Mide consumo base
2. **Tráfico bajo** (5-10 min): 1-3 usuarios
3. **Tráfico normal** (10-15 min): 5-10 usuarios
4. **Tráfico alto** (15-20 min): 15-20 usuarios

**Endpoints testeados**:
- Health check
- Listar ciudades, registros, marcas, campañas
- Búsqueda con fuzzy match
- Geocodificación
- Crear ciudad (ocasional)
- Crear registro OOH (ocasional)

**Salida**: `performance-reports/k6-summary-<timestamp>.json`

---

### `monitor-docker.js` (Node.js)
**Propósito**: Monitorear CPU y memoria del contenedor Docker

**Funcionamiento**:
- Recolecta métricas cada segundo
- Duración: 20 minutos (configurable)
- Muestra tabla en tiempo real en consola

**Métricas capturadas**:
- CPU %
- Memoria MB y %
- Red RX/TX MB

**Salidas**:
- `performance-reports/docker-stats-<timestamp>.json` (completo)
- `performance-reports/docker-stats-<timestamp>.csv` (para Excel)

---

### `generate-performance-report.js` (Node.js)
**Propósito**: Consolidar resultados y generar reporte final

**Funcionamiento**:
- Lee últimos archivos de k6 y Docker
- Calcula promedios, P95, P99, min/max
- Genera recomendaciones automáticas

**Análisis incluido**:
- ✅ Uso de CPU y memoria
- ✅ Latencia de respuesta (avg, P95, P99)
- ✅ Tráfico y volumen de requests
- ✅ Tasa de errores
- ✅ Desglose por escenario
- ✅ Recomendaciones para Cloud Run
- ✅ Estimación de costos

**Salida**: `performance-reports/performance-report-<timestamp>.md`

---

## 📖 Documentación

### `PERFORMANCE_TESTS.md`
**Propósito**: Guía completa paso a paso

**Contenido**:
- Pre-requisitos (Docker, k6)
- Enlaces de descarga (.exe)
- Pasos detallados de ejecución
- Comandos útiles de Docker
- Interpretación de resultados
- Troubleshooting común
- Configuración recomendada Cloud Run

**Audiencia**: Usuario técnico que ejecutará las pruebas

---

### `QUICK_START_PERFORMANCE.md`
**Propósito**: Referencia rápida

**Contenido**:
- Instalación en 2 pasos
- Comandos esenciales
- Sin explicaciones largas

**Audiencia**: Usuario que ya ejecutó una vez y necesita recordatorio

---

### `CHECKLIST_PERFORMANCE.md`
**Propósito**: Lista de verificación paso a paso

**Contenido**:
- ☑️ Instalación de software
- ☑️ Preparación del proyecto
- ☑️ Build y ejecución
- ☑️ Ejecución de pruebas
- ☑️ Generación de reporte
- ☑️ Troubleshooting

**Audiencia**: Usuario que ejecuta por primera vez

---

### `RESUMEN_APP.md`
**Propósito**: Descripción técnica y comercial de la app

**Contenido**:
- 📝 Descripción ejecutiva
- 🎯 Capacidades principales
- 🏗️ Arquitectura técnica
- 📊 Especificaciones de desempeño
- 📦 Entregables
- 🚀 Opciones de despliegue
- 🛠️ Stack tecnológico completo

**Audiencia**: Stakeholders, cliente, documentación formal

---

## 🤖 Scripts de Automatización

### `run-performance-tests.bat` (Windows Batch)
**Propósito**: Automatizar setup completo

**Acciones**:
1. ✅ Verifica que Docker esté corriendo
2. ✅ Limpia contenedores anteriores
3. ✅ Construye imagen Docker
4. ✅ Ejecuta contenedor
5. ✅ Espera 10 segundos (inicio servidor)
6. ✅ Muestra instrucciones para siguientes pasos

**Uso**: Doble clic en el archivo o `run-performance-tests.bat` en CMD

---

## 📁 Estructura de Carpetas

```
nuevo ooh/
├── Dockerfile                          # Imagen Docker
├── .dockerignore                       # Exclusiones build
│
├── load-test.js                        # Pruebas k6
├── monitor-docker.js                   # Monitoreo Docker
├── generate-performance-report.js      # Generador reporte
│
├── run-performance-tests.bat           # Automatización
│
├── PERFORMANCE_TESTS.md                # Guía completa
├── QUICK_START_PERFORMANCE.md          # Referencia rápida
├── CHECKLIST_PERFORMANCE.md            # Checklist
├── RESUMEN_APP.md                      # Descripción app
├── FILES_INDEX_PERFORMANCE.md          # Este archivo
│
└── performance-reports/                # Resultados
    ├── .gitkeep
    ├── k6-summary-*.json
    ├── docker-stats-*.json
    ├── docker-stats-*.csv
    └── performance-report-*.md
```

---

## 🎯 Flujo de Trabajo Completo

```
1. Instalación (una vez)
   └─> Docker Desktop + k6

2. Setup (cada prueba)
   └─> run-performance-tests.bat
       └─> Build imagen
       └─> Ejecutar contenedor

3. Ejecución (20 minutos)
   ├─> Terminal 1: monitor-docker.js (primero)
   └─> Terminal 2: k6 run load-test.js (10 seg después)

4. Reporte (1 minuto)
   └─> node generate-performance-report.js
       └─> Lee k6 + Docker
       └─> Genera Markdown

5. Análisis
   └─> Revisar performance-report-*.md
       └─> Métricas
       └─> Recomendaciones
       └─> Costos estimados
```

---

## 💡 Tips de Uso

### Primera vez
1. Lee `CHECKLIST_PERFORMANCE.md`
2. Sigue `PERFORMANCE_TESTS.md`
3. Ejecuta `run-performance-tests.bat`

### Ejecuciones siguientes
1. Lee `QUICK_START_PERFORMANCE.md`
2. Ejecuta `run-performance-tests.bat`
3. Dos terminales para scripts
4. Genera reporte

### Para presentar resultados
1. Abre `performance-report-*.md` (más reciente)
2. Lee sección "Recomendaciones"
3. Comparte "Configuración Cloud Run"
4. Muestra "Estimación de costos"

---

## 🔍 Ubicación de Resultados

Todos los archivos generados están en:
```
performance-reports/
```

Para encontrar el reporte más reciente:
```powershell
# Windows
dir performance-reports\performance-report-*.md | sort LastWriteTime | select -last 1
```

---

## 📞 Troubleshooting Rápido

| Problema | Solución Rápida |
|----------|----------------|
| Docker no arranca | Abre Docker Desktop, espera 1 min |
| Puerto ocupado | `docker rm -f ooh-test` |
| k6 no encontrado | Reinicia PowerShell |
| Contenedor no responde | `docker logs ooh-test` |
| Sin resultados | Verifica `performance-reports/` |

---

**Última actualización**: Febrero 2026  
**Archivos creados**: 10 archivos principales
