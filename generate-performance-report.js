const fs = require('fs');
const path = require('path');

/**
 * Script para generar reporte de rendimiento combinando:
 * - Métricas de k6 (latencia, errores, throughput)
 * - Métricas de Docker (CPU, memoria)
 */

const REPORTS_DIR = path.join(__dirname, 'performance-reports');

function findLatestFiles() {
  if (!fs.existsSync(REPORTS_DIR)) {
    console.error(`❌ Directorio ${REPORTS_DIR} no existe`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(REPORTS_DIR);
  
  const k6Files = files.filter(f => f.startsWith('k6-summary-') && f.endsWith('.json'));
  const dockerFiles = files.filter(f => f.startsWith('docker-stats-') && f.endsWith('.json'));
  
  if (k6Files.length === 0) {
    console.error('❌ No se encontraron archivos de k6');
    return null;
  }
  
  if (dockerFiles.length === 0) {
    console.error('❌ No se encontraron archivos de Docker stats');
    return null;
  }
  
  // Ordenar por fecha y tomar el más reciente
  k6Files.sort().reverse();
  dockerFiles.sort().reverse();
  
  return {
    k6: path.join(REPORTS_DIR, k6Files[0]),
    docker: path.join(REPORTS_DIR, dockerFiles[0])
  };
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
    return null;
  }
}

function generateMarkdownReport(k6Data, dockerData) {
  const timestamp = new Date().toISOString();
  
  let md = `# 📊 Reporte de Rendimiento - Aplicación OOH

**Fecha:** ${new Date(timestamp).toLocaleString('es-CO')}  
**Duración total:** ~${Math.ceil(k6Data.state.testRunDurationMs / 1000 / 60)} minutos

---

## 🎯 Resumen Ejecutivo

`;

  // CPU y Memoria
  md += `### 💻 Recursos del Servidor

| Recurso | Promedio | Mínimo | Máximo | P95 | P99 |
|---------|----------|--------|--------|-----|-----|
| **CPU** | ${dockerData.cpu.avg}% | ${dockerData.cpu.min}% | ${dockerData.cpu.max}% | ${dockerData.cpu.p95}% | ${dockerData.cpu.p99}% |
| **Memoria** | ${dockerData.memory_mb.avg} MB | ${dockerData.memory_mb.min} MB | ${dockerData.memory_mb.max} MB | ${dockerData.memory_mb.p95} MB | ${dockerData.memory_mb.p99} MB |

`;

  // Latencia HTTP
  const httpDuration = k6Data.metrics.http_req_duration.values;
  md += `### ⚡ Latencia de Respuesta

| Métrica | Valor |
|---------|-------|
| **Promedio** | ${httpDuration.avg.toFixed(2)} ms |
| **Mínimo** | ${httpDuration.min.toFixed(2)} ms |
| **Máximo** | ${httpDuration.max.toFixed(2)} ms |
| **Mediana (P50)** | ${httpDuration.med.toFixed(2)} ms |
| **P95** | ${httpDuration['p(95)'].toFixed(2)} ms |
| **P99** | ${httpDuration['p(99)'].toFixed(2)} ms |

`;

  // Tráfico
  const httpReqs = k6Data.metrics.http_reqs.values;
  const iterations = k6Data.metrics.iterations.values;
  const durationSec = k6Data.state.testRunDurationMs / 1000;
  
  md += `### 📈 Tráfico y Volumen

| Métrica | Valor |
|---------|-------|
| **Total de requests HTTP** | ${httpReqs.count.toLocaleString()} |
| **Requests/segundo** | ${(httpReqs.rate).toFixed(2)} req/s |
| **Iteraciones totales** | ${iterations.count.toLocaleString()} |
| **VUs máximos** | ${k6Data.metrics.vus_max.values.max} |
| **Duración** | ${(durationSec / 60).toFixed(2)} min |

`;

  // Errores
  const httpFailed = k6Data.metrics.http_req_failed.values;
  const checks = k6Data.metrics.checks ? k6Data.metrics.checks.values : null;
  
  md += `### ❌ Tasa de Errores

| Métrica | Valor |
|---------|-------|
| **HTTP requests fallidos** | ${(httpFailed.rate * 100).toFixed(2)}% |
| **Checks exitosos** | ${checks ? checks.passes.toLocaleString() : 'N/A'} |
| **Checks fallidos** | ${checks ? checks.fails.toLocaleString() : 'N/A'} |
| **Tasa de éxito** | ${checks ? (checks.rate * 100).toFixed(2) : 'N/A'}% |

`;

  // Desglose por escenario
  md += `---

## 📊 Desglose por Escenario

`;

  const scenarios = ['idle', 'low_traffic', 'normal_traffic', 'high_traffic'];
  const scenarioNames = {
    'idle': '😴 Idle (sin tráfico)',
    'low_traffic': '🟢 Tráfico Bajo (1-3 usuarios)',
    'normal_traffic': '🟡 Tráfico Normal (5-10 usuarios)',
    'high_traffic': '🔴 Tráfico Alto (15-20 usuarios)'
  };

  scenarios.forEach(scenario => {
    const metricKey = `http_req_duration{scenario:${scenario}}`;
    const metric = k6Data.metrics[metricKey];
    
    if (!metric) return;
    
    md += `### ${scenarioNames[scenario]}

| Métrica | Valor |
|---------|-------|
| **Promedio** | ${metric.values.avg.toFixed(2)} ms |
| **P95** | ${metric.values['p(95)'].toFixed(2)} ms |
| **P99** | ${metric.values['p(99)'].toFixed(2)} ms |

`;
  });

  // Recomendaciones
  md += `---

## 💡 Recomendaciones

`;

  const recommendations = [];
  
  // Análisis de CPU
  if (parseFloat(dockerData.cpu.avg) > 50) {
    recommendations.push('⚠️ **CPU Promedio Alta**: El uso promedio de CPU es mayor al 50%. Considera aumentar los recursos o optimizar queries.');
  } else if (parseFloat(dockerData.cpu.avg) < 20) {
    recommendations.push('✅ **CPU Óptima**: El uso de CPU es bajo. Los recursos asignados son suficientes.');
  }
  
  if (parseFloat(dockerData.cpu.p95) > 80) {
    recommendations.push('🔴 **CPU P95 Crítica**: El P95 de CPU supera el 80%. En picos de tráfico puede haber degradación.');
  }
  
  // Análisis de Memoria
  const memAvgMB = parseFloat(dockerData.memory_mb.avg);
  if (memAvgMB > 512) {
    recommendations.push(`⚠️ **Memoria Alta**: Uso promedio de ${memAvgMB.toFixed(0)} MB. Considera optimizar carga de datos en memoria.`);
  } else if (memAvgMB < 256) {
    recommendations.push('✅ **Memoria Óptima**: El consumo de memoria es bajo y eficiente.');
  }
  
  // Análisis de Latencia
  const p95Latency = httpDuration['p(95)'];
  if (p95Latency > 2000) {
    recommendations.push(`🔴 **Latencia P95 Alta**: ${p95Latency.toFixed(0)}ms. Los usuarios pueden experimentar lentitud en picos de tráfico.`);
  } else if (p95Latency < 500) {
    recommendations.push('✅ **Latencia Excelente**: El P95 de latencia es menor a 500ms. Rendimiento óptimo.');
  } else if (p95Latency < 1000) {
    recommendations.push('✅ **Latencia Buena**: El P95 de latencia es menor a 1 segundo. Rendimiento aceptable.');
  }
  
  // Análisis de Errores
  const errorRate = httpFailed.rate * 100;
  if (errorRate > 5) {
    recommendations.push(`🔴 **Tasa de Error Alta**: ${errorRate.toFixed(2)}% de requests fallan. Revisar logs de errores.`);
  } else if (errorRate > 1) {
    recommendations.push(`⚠️ **Algunos Errores**: ${errorRate.toFixed(2)}% de requests fallan. Monitorear.`);
  } else if (errorRate < 0.1) {
    recommendations.push('✅ **Tasa de Error Baja**: Menos del 0.1% de errores. Sistema estable.');
  }
  
  // Recomendaciones para Cloud Run
  md += `### 🚀 Configuración Recomendada para Cloud Run

Basado en los resultados de las pruebas:

`;

  let cpuRec = '1 vCPU';
  let memRec = '512 MB';
  let concurrencyRec = '10';
  
  if (parseFloat(dockerData.cpu.p95) > 70) {
    cpuRec = '2 vCPU';
  }
  
  if (memAvgMB > 400) {
    memRec = '1 GB';
  } else if (memAvgMB > 256) {
    memRec = '512 MB';
  } else {
    memRec = '256 MB';
  }
  
  // Para 15 usuarios reales
  concurrencyRec = '20'; // Margen de seguridad
  
  md += `\`\`\`yaml
resources:
  limits:
    cpu: ${cpuRec}
    memory: ${memRec}

scaling:
  minInstances: 0
  maxInstances: 3
  concurrency: ${concurrencyRec}  # requests por instancia
  
timeout: 60s  # para requests largos (importación)
\`\`\`

`;

  md += `### 📝 Lista de Recomendaciones

`;
  recommendations.forEach(rec => {
    md += `- ${rec}\n`;
  });

  md += `
---

## 📁 Archivos de Datos

- **K6 JSON**: \`${path.basename(files.k6)}\`
- **Docker Stats JSON**: \`${path.basename(files.docker)}\`
- **Docker Stats CSV**: \`${path.basename(files.docker).replace('.json', '.csv')}\`

---

*Reporte generado automáticamente por \`generate-performance-report.js\`*
`;

  return md;
}

// Main
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   📊 GENERADOR DE REPORTE DE RENDIMIENTO                ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const files = findLatestFiles();

if (!files) {
  console.error('\n❌ No se pudieron encontrar los archivos necesarios');
  process.exit(1);
}

console.log(`📂 Cargando archivos:\n`);
console.log(`   K6:     ${path.basename(files.k6)}`);
console.log(`   Docker: ${path.basename(files.docker)}\n`);

const k6Data = loadJSON(files.k6);
const dockerData = loadJSON(files.docker);

if (!k6Data || !dockerData) {
  console.error('❌ Error cargando archivos JSON');
  process.exit(1);
}

console.log('✅ Archivos cargados correctamente\n');
console.log('📝 Generando reporte en Markdown...\n');

const report = generateMarkdownReport(k6Data, dockerData);

const outputFile = path.join(REPORTS_DIR, `performance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
fs.writeFileSync(outputFile, report);

console.log('═'.repeat(60));
console.log('✨ Reporte generado exitosamente');
console.log('═'.repeat(60));
console.log(`\n📁 Archivo: ${outputFile}\n`);

// Mostrar preview del reporte
console.log('─'.repeat(60));
console.log('PREVIEW DEL REPORTE:');
console.log('─'.repeat(60));
console.log(report.split('\n').slice(0, 30).join('\n'));
console.log('\n... (ver archivo completo para más detalles)\n');
