const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script para monitorear CPU y memoria de un contenedor Docker
 * Genera un archivo CSV con métricas cada segundo
 */

const CONTAINER_NAME = process.env.CONTAINER_NAME || 'ooh-test';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '1000', 10);
const DURATION_MINUTES = parseInt(process.env.DURATION_MIN || '20', 10);
const OUTPUT_DIR = path.join(__dirname, 'performance-reports');

// Crear directorio de reportes si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const csvFile = path.join(OUTPUT_DIR, `docker-stats-${timestamp}.csv`);
const jsonFile = path.join(OUTPUT_DIR, `docker-stats-${timestamp}.json`);

// Datos recolectados
const metrics = [];
let startTime = Date.now();
let isRunning = true;

// Escribir encabezados CSV
fs.writeFileSync(csvFile, 'timestamp,cpu_percent,memory_mb,memory_percent,network_rx_mb,network_tx_mb\n');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   📊 MONITOREO DE CONTENEDOR DOCKER                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log(`📦 Contenedor: ${CONTAINER_NAME}`);
console.log(`⏱️  Duración: ${DURATION_MINUTES} minutos`);
console.log(`📈 Intervalo: ${INTERVAL_MS}ms`);
console.log(`📁 Salida CSV: ${csvFile}`);
console.log(`📁 Salida JSON: ${jsonFile}\n`);
console.log('Presiona Ctrl+C para detener antes de tiempo\n');
console.log('─'.repeat(80));
console.log('Timestamp            | CPU %  | RAM (MB) | RAM %  | RX (MB) | TX (MB)');
console.log('─'.repeat(80));

// Función para parsear la salida de docker stats
function parseDockerStats(output) {
  try {
    const lines = output.trim().split('\n');
    if (lines.length < 2) return null;
    
    // Línea de datos (segunda línea)
    const data = lines[1].split(/\s+/);
    
    // CONTAINER ID   NAME        CPU %   MEM USAGE / LIMIT     MEM %   NET I/O         BLOCK I/O
    // abc123         ooh-test    0.50%   50MiB / 2GiB          2.44%   1.2MB / 850kB   0B / 0B
    
    const cpuPercent = parseFloat(data[2].replace('%', ''));
    const memUsage = data[3];
    const memLimit = data[5];
    const memPercent = parseFloat(data[6].replace('%', ''));
    const netIO = data[7]; // "1.2MB / 850kB"
    
    // Convertir memoria a MB
    const memMB = convertToMB(memUsage);
    
    // Parsear red (RX / TX)
    const [netRx, netTx] = netIO.split('/').map(s => convertToMB(s.trim()));
    
    return {
      cpu: cpuPercent,
      memoryMB: memMB,
      memoryPercent: memPercent,
      networkRxMB: netRx,
      networkTxMB: netTx
    };
  } catch (error) {
    console.error('Error parseando docker stats:', error.message);
    return null;
  }
}

// Función para convertir tamaños a MB
function convertToMB(size) {
  const value = parseFloat(size);
  if (size.includes('GiB') || size.includes('GB')) {
    return value * 1024;
  } else if (size.includes('MiB') || size.includes('MB')) {
    return value;
  } else if (size.includes('KiB') || size.includes('KB') || size.includes('kB')) {
    return value / 1024;
  } else if (size.includes('B')) {
    return value / (1024 * 1024);
  }
  return value;
}

// Función para obtener stats del contenedor
function getDockerStats() {
  return new Promise((resolve, reject) => {
    exec(`docker stats ${CONTAINER_NAME} --no-stream --format "table {{.Container}}\\t{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}"`, 
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      }
    );
  });
}

// Función para recolectar métricas
async function collectMetrics() {
  try {
    const output = await getDockerStats();
    const stats = parseDockerStats(output);
    
    if (!stats) {
      console.error('⚠️  No se pudieron obtener estadísticas');
      return;
    }
    
    const now = new Date();
    const metric = {
      timestamp: now.toISOString(),
      ...stats
    };
    
    metrics.push(metric);
    
    // Escribir a CSV
    const csvLine = `${metric.timestamp},${metric.cpu},${metric.memoryMB.toFixed(2)},${metric.memoryPercent},${metric.networkRxMB.toFixed(2)},${metric.networkTxMB.toFixed(2)}\n`;
    fs.appendFileSync(csvFile, csvLine);
    
    // Mostrar en consola
    const timeStr = now.toLocaleTimeString('es-CO');
    console.log(
      `${timeStr.padEnd(20)} | ` +
      `${metric.cpu.toFixed(2).padStart(6)}% | ` +
      `${metric.memoryMB.toFixed(2).padStart(8)} | ` +
      `${metric.memoryPercent.toFixed(2).padStart(6)}% | ` +
      `${metric.networkRxMB.toFixed(2).padStart(7)} | ` +
      `${metric.networkTxMB.toFixed(2).padStart(7)}`
    );
    
  } catch (error) {
    console.error('❌ Error recolectando métricas:', error.message);
  }
}

// Función para generar resumen final
function generateSummary() {
  if (metrics.length === 0) {
    console.error('\n❌ No se recolectaron métricas');
    return;
  }
  
  // Calcular estadísticas
  const cpuValues = metrics.map(m => m.cpu);
  const memValues = metrics.map(m => m.memoryMB);
  const memPercentValues = metrics.map(m => m.memoryPercent);
  
  const summary = {
    container: CONTAINER_NAME,
    duration_minutes: ((Date.now() - startTime) / 1000 / 60).toFixed(2),
    samples: metrics.length,
    cpu: {
      avg: (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(2),
      min: Math.min(...cpuValues).toFixed(2),
      max: Math.max(...cpuValues).toFixed(2),
      p50: percentile(cpuValues, 0.5).toFixed(2),
      p95: percentile(cpuValues, 0.95).toFixed(2),
      p99: percentile(cpuValues, 0.99).toFixed(2),
    },
    memory_mb: {
      avg: (memValues.reduce((a, b) => a + b, 0) / memValues.length).toFixed(2),
      min: Math.min(...memValues).toFixed(2),
      max: Math.max(...memValues).toFixed(2),
      p50: percentile(memValues, 0.5).toFixed(2),
      p95: percentile(memValues, 0.95).toFixed(2),
      p99: percentile(memValues, 0.99).toFixed(2),
    },
    memory_percent: {
      avg: (memPercentValues.reduce((a, b) => a + b, 0) / memPercentValues.length).toFixed(2),
      min: Math.min(...memPercentValues).toFixed(2),
      max: Math.max(...memPercentValues).toFixed(2),
    },
    metrics: metrics
  };
  
  // Guardar JSON
  fs.writeFileSync(jsonFile, JSON.stringify(summary, null, 2));
  
  // Mostrar resumen
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RESUMEN DE MONITOREO');
  console.log('═'.repeat(80));
  console.log(`⏱️  Duración: ${summary.duration_minutes} minutos`);
  console.log(`📈 Muestras: ${summary.samples}`);
  console.log(`\n🖥️  CPU:`);
  console.log(`   Promedio: ${summary.cpu.avg}%`);
  console.log(`   Mínimo:   ${summary.cpu.min}%`);
  console.log(`   Máximo:   ${summary.cpu.max}%`);
  console.log(`   P95:      ${summary.cpu.p95}%`);
  console.log(`\n💾 Memoria:`);
  console.log(`   Promedio: ${summary.memory_mb.avg} MB (${summary.memory_percent.avg}%)`);
  console.log(`   Mínimo:   ${summary.memory_mb.min} MB`);
  console.log(`   Máximo:   ${summary.memory_mb.max} MB`);
  console.log(`   P95:      ${summary.memory_mb.p95} MB`);
  console.log(`\n📁 Archivos generados:`);
  console.log(`   CSV:  ${csvFile}`);
  console.log(`   JSON: ${jsonFile}`);
  console.log('═'.repeat(80) + '\n');
}

// Función para calcular percentiles
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[index];
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Deteniendo monitoreo...\n');
  isRunning = false;
  generateSummary();
  process.exit(0);
});

// Loop principal
async function monitor() {
  const endTime = startTime + (DURATION_MINUTES * 60 * 1000);
  
  while (isRunning && Date.now() < endTime) {
    await collectMetrics();
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }
  
  if (isRunning) {
    console.log('\n⏱️  Tiempo completado\n');
    generateSummary();
    process.exit(0);
  }
}

// Verificar que el contenedor existe
exec(`docker ps -a --filter name=${CONTAINER_NAME} --format "{{.Names}}"`, (error, stdout) => {
  if (error || !stdout.trim()) {
    console.error(`❌ Contenedor "${CONTAINER_NAME}" no encontrado`);
    console.error('   Asegúrate de que el contenedor esté corriendo con:');
    console.error(`   docker run -d -p 8080:8080 --name ${CONTAINER_NAME} ooh-app`);
    process.exit(1);
  }
  
  // Iniciar monitoreo
  monitor().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
});
