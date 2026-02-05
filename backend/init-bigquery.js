require('dotenv').config();
const bigQueryService = require('./services/bigQueryService');

async function init() {
  try {
    console.log('🔧 Inicializando BigQuery...');
    console.log(`   Project ID: ${process.env.GCP_PROJECT_ID}`);
    console.log(`   Dataset: ${process.env.BQ_DATASET_ID || 'ooh_dataset'}`);
    console.log(`   Table: ${process.env.BQ_TABLE_ID || 'ooh_records'}`);
    console.log('');
    
    await bigQueryService.initializeBigQuery();
    
    console.log('');
    console.log('✅ BigQuery inicializado correctamente');
    console.log('');
    console.log('Puedes verificar en:');
    console.log(`https://console.cloud.google.com/bigquery?project=${process.env.GCP_PROJECT_ID}`);
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error al inicializar BigQuery:', error.message);
    console.error('');
    console.error('Verifica:');
    console.error('  1. Que las credenciales de GCP estén configuradas correctamente');
    console.error('  2. Que la cuenta de servicio tenga permisos de BigQuery Admin');
    console.error('  3. Que el proyecto ID sea correcto');
    console.error('');
    process.exit(1);
  }
}

init();
