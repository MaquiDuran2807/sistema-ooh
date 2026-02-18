import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');

// Configuración base
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Configuración de escenarios
export const options = {
  scenarios: {
    // Escenario 1: Idle - sin tráfico
    idle: {
      executor: 'constant-vus',
      vus: 1,
      duration: '5m',
      startTime: '0s',
      tags: { scenario: 'idle' },
    },
    
    // Escenario 2: Tráfico bajo - 1-3 usuarios
    low_traffic: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 3 },   // Rampa a 3 usuarios
        { duration: '3m', target: 3 },   // Mantener 3 usuarios
        { duration: '1m', target: 0 },   // Rampa abajo
      ],
      startTime: '5m',
      tags: { scenario: 'low_traffic' },
    },
    
    // Escenario 3: Tráfico normal - 5-10 usuarios
    normal_traffic: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },   // Rampa a 5 usuarios
        { duration: '2m', target: 10 },  // Rampa a 10 usuarios
        { duration: '1m', target: 10 },  // Mantener 10 usuarios
        { duration: '1m', target: 0 },   // Rampa abajo
      ],
      startTime: '10m',
      tags: { scenario: 'normal_traffic' },
    },
    
    // Escenario 4: Tráfico alto - 15-20 usuarios
    high_traffic: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 15 },  // Rampa a 15 usuarios
        { duration: '2m', target: 20 },  // Rampa a 20 usuarios
        { duration: '1m', target: 20 },  // Mantener 20 usuarios
        { duration: '1m', target: 0 },   // Rampa abajo
      ],
      startTime: '15m',
      tags: { scenario: 'high_traffic' },
    },
  },
  
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% de requests < 2s
    'http_req_failed': ['rate<0.05'],     // Menos del 5% de errores
    'errors': ['rate<0.05'],
  },
};

// Datos de prueba
const testCity = {
  nombre: `TEST_CITY_${Date.now()}`,
  region: 'CO Centro',
  latitud: 4.7110,
  longitud: -74.0721,
  radio: 5
};

const testRecord = {
  ooh_type_id: 1,
  brand_id: 1,
  campaign_id: 1,
  provider_id: 1,
  ciudad: 'BOGOTA DC',
  direccion: 'Calle Test 123',
  LATITUD: 4.7110,
  LONGITUD: -74.0721,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  investment: 1000000,
  ooh_state_id: 1
};

// Función principal que simula un flujo de usuario
export default function () {
  // 1. Health check (más común)
  let res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(0.5);

  // 2. Listar ciudades (común)
  res = http.get(`${BASE_URL}/api/ooh/cities`);
  check(res, {
    'list cities success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // 3. Listar registros (muy común)
  res = http.get(`${BASE_URL}/api/ooh`);
  check(res, {
    'list records success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // 4. Obtener marcas (común)
  res = http.get(`${BASE_URL}/api/ooh/brands`);
  check(res, {
    'list brands success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(0.5);

  // 5. Obtener campañas (común)
  res = http.get(`${BASE_URL}/api/ooh/campaigns`);
  check(res, {
    'list campaigns success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(0.5);

  // 6. Obtener tipos OOH (común)
  res = http.get(`${BASE_URL}/api/ooh/types`);
  check(res, {
    'list types success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(0.5);

  // 7. Buscar ciudad con fuzzy match (ocasional)
  const searchCity = 'bogota';
  res = http.get(`${BASE_URL}/api/ooh/cities?search=${searchCity}`);
  check(res, {
    'search city success': (r) => r.status === 200,
  }) || errorRate.add(1);
  sleep(1);

  // 8. Geocodificar ciudad (ocasional - solo en escenarios normales/altos)
  if (Math.random() > 0.7) {
    res = http.get(`${BASE_URL}/api/ooh/cities/coordinates?nombre=Medellin`);
    check(res, {
      'geocode city success': (r) => r.status === 200,
    }) || errorRate.add(1);
    sleep(2);
  }

  // 9. Crear ciudad (raro - solo en escenarios normales/altos)
  if (Math.random() > 0.85) {
    res = http.post(
      `${BASE_URL}/api/ooh/cities`,
      JSON.stringify(testCity),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    check(res, {
      'create city success': (r) => r.status === 201 || r.status === 400, // 400 si ya existe
    }) || errorRate.add(1);
    sleep(1);
  }

  // 10. Crear registro OOH (ocasional)
  if (Math.random() > 0.8) {
    res = http.post(
      `${BASE_URL}/api/ooh`,
      JSON.stringify(testRecord),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    check(res, {
      'create record success': (r) => r.status === 201 || r.status === 400,
    }) || errorRate.add(1);
    sleep(1);
  }

  // Pausa entre iteraciones para simular tiempo de navegación del usuario
  sleep(Math.random() * 3 + 2); // Entre 2 y 5 segundos
}

// Hook que se ejecuta al finalizar la prueba
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    [`performance-reports/k6-summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Función auxiliar para generar resumen de texto
function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let output = '\n' + indent + '='.repeat(60) + '\n';
  output += indent + 'K6 PERFORMANCE TEST SUMMARY\n';
  output += indent + '='.repeat(60) + '\n\n';
  
  // Estadísticas generales
  output += indent + 'General:\n';
  output += indent + `  Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  output += indent + `  VUs Max: ${data.metrics.vus_max.values.max}\n`;
  output += indent + `  Iterations: ${data.metrics.iterations.values.count}\n\n`;
  
  // HTTP requests
  output += indent + 'HTTP Requests:\n';
  output += indent + `  Total: ${data.metrics.http_reqs.values.count}\n`;
  output += indent + `  Failed: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  output += indent + `  Duration avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += indent + `  Duration p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += indent + `  Duration p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // Checks
  if (data.metrics.checks) {
    output += indent + 'Checks:\n';
    output += indent + `  Passed: ${data.metrics.checks.values.passes}\n`;
    output += indent + `  Failed: ${data.metrics.checks.values.fails}\n`;
    output += indent + `  Success rate: ${(data.metrics.checks.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  output += indent + '='.repeat(60) + '\n';
  
  return output;
}
