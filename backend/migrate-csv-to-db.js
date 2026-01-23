#!/usr/bin/env node

/**
 * Script de migración: CSV -> SQLite
 * Migra desde CSV a modelo relacional normalizado (brands, campaigns, ooh_types, ooh_records)
 * Uso: node migrate-csv-to-db.js
 */

const fs = require('fs');
const path = require('path');
const dbService = require('./services/dbService');
const { marcas } = require('../frontend/src/data/marcas');

const CSV_FILE = path.join(__dirname, 'ooh_data.csv');

const normalizeText = (v) => String(v || '').trim().toUpperCase();

// Pre-poblar marcas y campañas desde data estática
const preloadBrandsAndCampaigns = async () => {
  console.log('📦 Pre-cargando marcas y campañas desde data estática...\n');
  
  for (const marca of marcas) {
    const brandId = await dbService.addBrand(marca.nombre, marca.categoria);
    
    for (const campana of marca.campanas || []) {
      await dbService.addCampaign(campana, brandId);
    }
  }
  
  console.log('✅ Marcas y campañas pre-cargadas\n');
};

// Pre-poblar tipos de OOH corregidos
const preloadOOHTypes = async () => {
  console.log('📦 Pre-cargando tipos de OOH...\n');
  
  const tiposOOH = [
    'VALLA',
    'PARADEROS', 
    'VALLAS MOTORIZADAS',
    'CAJITAS DE LUZ',
    'PRODUCCIÓN'
  ];
  
  for (const tipo of tiposOOH) {
    await dbService.addOOHType(tipo);
  }
  
  console.log('✅ Tipos OOH pre-cargados\n');
};

const migrateCSVToDB = async () => {
  console.log('🔄 Iniciando migración de CSV a SQLite con modelo relacional...\n');

  // Inicializar BD y pre-cargar entidades
  await dbService.initDB();
  await preloadBrandsAndCampaigns();
  await preloadOOHTypes();

  // Leer CSV
  if (!fs.existsSync(CSV_FILE)) {
    console.log('ℹ️  No existe CSV. BD vacía lista para nuevos registros.');
    return;
  }

  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = content.split('\n');

  if (lines.length <= 1) {
    console.log('ℹ️  CSV vacío. BD lista.');
    return;
  }

  // Saltear encabezado (línea 0)
  let migrated = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(';');
    
    // Mapeo CSV: [0]=ID, [1]=Marca, [2]=Anunciante, [3]=Categoria, [4]=Tipo_OOH, [5]=Campana, 
    // [6]=Ciudad, [7]=Ciudad_Dashboard, [8]=Direccion, [9]=Coordenadas, [10]=Fecha_Inicio, 
    // [11]=Fecha_Final, [12]=Imagen_1, [13]=Imagen_2, [14]=Imagen_3, [15]=Region, [16]=Proveedor
    
    if (values.length < 13) {
      console.log(`⚠️  Línea ${i + 1} incompleta, saltada`);
      skipped++;
      continue;
    }

    const [lat, lng] = values[9] ? values[9].split(',').map(v => parseFloat(v.trim())) : [0, 0];

    // Corregir "VAYA" → "VALLA"
    let tipoOOH = normalizeText(values[4]);
    if (tipoOOH === 'VAYA' || tipoOOH === 'VAYAS') {
      tipoOOH = 'VALLA';
    }

    const record = {
      id: values[0].trim(),
      marca: normalizeText(values[1]),
      categoria: normalizeText(values[3]),
      tipoOOH: tipoOOH,
      campana: normalizeText(values[5]),
      ciudad: normalizeText(values[6]),
      direccion: normalizeText(values[8]),
      latitud: lat,
      longitud: lng,
      fechaInicio: values[10].trim(),
      fechaFinal: values[11].trim(),
      imagenes: [values[12], values[13], values[14]].map(v => (v || '').trim()).filter(v => v),
      region: normalizeText(values[15] || ''),
      proveedor: normalizeText(values[16] || 'APX')
    };

    try {
      const existing = await dbService.findExistingById(record.id);
      if (existing) {
        console.log(`ℹ️  Registro ${record.id} ya existe, actualizando...`);
        await dbService.updateRecord(record.id, record);
        skipped++;
      } else {
        await dbService.addRecord(record);
        migrated++;
      }
    } catch (error) {
      console.error(`❌ Error migrando línea ${i + 1}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Migración completada:`);
  console.log(`   - Registros migrados: ${migrated}`);
  console.log(`   - Registros saltados: ${skipped}`);
  console.log(`   - Total en BD: ${dbService.countRecords()}`);
};

migrateCSVToDB().catch(error => {
  console.error('❌ Error en migración:', error);
  process.exit(1);
});
