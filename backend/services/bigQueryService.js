const { BigQuery } = require('@google-cloud/bigquery');

// Inicializar BigQuery con las credenciales de la cuenta de servicio
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const datasetId = process.env.BQ_DATASET_ID || 'ooh_dataset';
const tableId = process.env.BQ_TABLE_ID || 'ooh_records';

/**
 * Inicializa el dataset y tabla en BigQuery si no existen
 */
const initializeBigQuery = async () => {
  try {
    // Verificar/crear dataset
    const dataset = bigquery.dataset(datasetId);
    const [datasetExists] = await dataset.exists();
    
    if (!datasetExists) {
      console.log(`📊 Creando dataset: ${datasetId}`);
      await bigquery.createDataset(datasetId, {
        location: 'US', // Puedes cambiar la ubicación según necesites
      });
      console.log(`✅ Dataset ${datasetId} creado`);
    }

    // Verificar/crear tabla
    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();
    
    if (!tableExists) {
      console.log(`📊 Creando tabla: ${tableId}`);
      const schema = [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'brand_id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'campaign_id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'ooh_type_id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'provider_id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'city_id', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'category_id', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'region_id', type: 'INTEGER', mode: 'NULLABLE' },

        // Denormalized text
        { name: 'brand_name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'campaign_name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'ooh_type_name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'provider_name', type: 'STRING', mode: 'NULLABLE' },
        { name: 'city_name', type: 'STRING', mode: 'NULLABLE' },

        // Location
        { name: 'address', type: 'STRING', mode: 'NULLABLE' },
        { name: 'latitude', type: 'FLOAT', mode: 'NULLABLE' },
        { name: 'longitude', type: 'FLOAT', mode: 'NULLABLE' },

        // Dates
        { name: 'start_date', type: 'DATE', mode: 'NULLABLE' },
        { name: 'end_date', type: 'DATE', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE' },

        // Image URLs
        { name: 'image_1_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'image_2_url', type: 'STRING', mode: 'NULLABLE' },
        { name: 'image_3_url', type: 'STRING', mode: 'NULLABLE' },

        // Review flag
        { name: 'checked', type: 'BOOLEAN', mode: 'NULLABLE' }
      ];

      // Configurar tabla con particionamiento y clustering
      const options = {
        schema: schema,
        // 📅 Particionamiento por MES/AÑO (end_date - fecha fin de campaña)
        timePartitioning: {
          type: 'MONTH',
          field: 'end_date',
        },
        // 🏷️ Clustering por marca y ciudad (para búsquedas rápidas)
        clustering: {
          fields: ['brand_name', 'city_name'],
        },
        // Descripción
        description: 'Registros OOH - Particionado por mes/año (end_date), clusterizado por marca y ciudad',
      };

      await dataset.createTable(tableId, options);
      console.log(`✅ Tabla ${tableId} creada`);
      console.log(`   📅 Particionada por: MES/AÑO (end_date)`);
      console.log(`   🏷️ Clusterizada por: brand_name, city_name`);

    }

    console.log('✅ BigQuery inicializado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar BigQuery:', error);
    throw error;
  }
};

/**
 * Inserta un registro de OOH en BigQuery
 * @param {Object} record - Registro completo de OOH
 * @returns {Promise<Object>} Resultado de la inserción
 */
const insertOOHRecord = async (record) => {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // Preparar el row para BigQuery
    const row = {
      id: record.id,
      brand_id: record.brand_id,
      campaign_id: record.campaign_id,
      ooh_type_id: record.ooh_type_id,
      provider_id: record.provider_id,
      city_id: record.city_id,
      category_id: record.category_id || null,
      region_id: record.region_id || null,

      brand_name: record.brand_name || null,
      campaign_name: record.campaign_name || null,
      ooh_type_name: record.ooh_type_name || null,
      provider_name: record.provider_name || null,
      city_name: record.city_name || null,

      address: record.address || null,
      latitude: record.latitude || null,
      longitude: record.longitude || null,

      start_date: record.start_date || null,
      end_date: record.end_date || null,
      created_at: record.created_at || new Date().toISOString(),

      image_1_url: record.image_1_url || null,
      image_2_url: record.image_2_url || null,
      image_3_url: record.image_3_url || null,
      checked: typeof record.checked === 'undefined' ? null : !!record.checked
    };

    await table.insert([row]);
    console.log(`✅ Registro ${record.id} insertado en BigQuery`);
    
    return { success: true, id: record.id };
  } catch (error) {
    console.error('❌ Error al insertar registro en BigQuery:', error);
    
    // Si el error es por filas duplicadas, intentar actualizar
    if (error.code === 409 || error.message?.includes('duplicate')) {
      console.log('⚠️ Registro duplicado, intentando actualizar...');
      return await updateOOHRecord(record);
    }
    
    throw error;
  }
};

/**
 * Actualiza un registro existente en BigQuery
 * @param {Object} record - Registro actualizado
 * @returns {Promise<Object>} Resultado de la actualización
 */
const updateOOHRecord = async (record) => {
  try {
    // BigQuery no soporta UPDATE directo de la misma forma que SQL tradicional
    // La estrategia es usar MERGE o DELETE + INSERT
    const dataset = bigquery.dataset(datasetId);
    
    // Primero eliminamos el registro existente
    const deleteQuery = `
      DELETE FROM \`${process.env.GCP_PROJECT_ID}.${datasetId}.${tableId}\`
      WHERE id = @id
    `;
    
    await bigquery.query({
      query: deleteQuery,
      params: { id: record.id }
    });
    
    // Luego insertamos el nuevo
    return await insertOOHRecord(record);
  } catch (error) {
    console.error('❌ Error al actualizar registro en BigQuery:', error);
    throw error;
  }
};

/**
 * Busca registros en BigQuery por diferentes criterios
 * @param {Object} filters - Filtros de búsqueda
 * @returns {Promise<Array>} Array de registros encontrados
 */
const queryOOHRecords = async (filters = {}) => {
  try {
    let query = `SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${datasetId}.${tableId}\``;
    const whereClauses = [];
    const params = {};
    
    if (filters.brand || filters.marca) {
      whereClauses.push('brand_name = @brand_name');
      params.brand_name = filters.brand || filters.marca;
    }
    
    if (filters.city || filters.ciudad) {
      whereClauses.push('city_name = @city_name');
      params.city_name = filters.city || filters.ciudad;
    }
    
    if (filters.startDate || filters.fechaInicio) {
      whereClauses.push('start_date >= @start_date');
      params.start_date = filters.startDate || filters.fechaInicio;
    }
    
    if (filters.endDate || filters.fechaFin) {
      whereClauses.push('end_date <= @end_date');
      params.end_date = filters.endDate || filters.fechaFin;
    }
    
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }
    
    const [rows] = await bigquery.query({ query, params });
    
    console.log(`✅ Se encontraron ${rows.length} registros en BigQuery`);
    return rows;
  } catch (error) {
    console.error('❌ Error al consultar BigQuery:', error);
    throw error;
  }
};

/**
 * Obtiene un registro específico por ID
 * @param {String} id - ID del registro
 * @returns {Promise<Object>} Registro encontrado
 */
const getOOHRecordById = async (id) => {
  try {
    const query = `
      SELECT * FROM \`${process.env.GCP_PROJECT_ID}.${datasetId}.${tableId}\`
      WHERE id = @id
      LIMIT 1
    `;
    
    const [rows] = await bigquery.query({
      query,
      params: { id }
    });
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('❌ Error al obtener registro de BigQuery:', error);
    throw error;
  }
};

/**
 * Elimina un registro de BigQuery
 * @param {String} id - ID del registro a eliminar
 * @returns {Promise<Object>} Resultado de la eliminación
 */
const deleteOOHRecord = async (id) => {
  try {
    const query = `
      DELETE FROM \`${process.env.GCP_PROJECT_ID}.${datasetId}.${tableId}\`
      WHERE id = @id
    `;
    
    const [job] = await bigquery.query({
      query,
      params: { id }
    });
    
    console.log(`✅ Registro ${id} eliminado de BigQuery`);
    return { success: true, id };
  } catch (error) {
    console.error('❌ Error al eliminar registro de BigQuery:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de registros por marca
 * @returns {Promise<Array>} Estadísticas por marca
 */
const getStatsByBrand = async () => {
  try {
    const query = `
      SELECT 
        brand_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT city_name) as cities,
        MIN(start_date) as earliest_campaign,
        MAX(end_date) as latest_campaign
      FROM \`${process.env.GCP_PROJECT_ID}.${datasetId}.${tableId}\`
      GROUP BY brand_name
      ORDER BY total_records DESC
    `;
    
    const [rows] = await bigquery.query(query);
    return rows;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    throw error;
  }
};

/**
 * Reconstruye la tabla completa en BigQuery con los registros provistos.
 * Estrategia: borrar tabla -> crear -> insertar en batch (evita UPDATE/DELETE sobre streaming buffer)
 * @param {Array<Object>} records - Registros ya mapeados al schema de BigQuery
 * @returns {Promise<Object>} Resumen de la operación
 */
const rebuildTableWithRecords = async (records = []) => {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // Borrar tabla si existe
    const [exists] = await table.exists();
    if (exists) {
      console.log(`🧹 Borrando tabla BigQuery: ${tableId}`);
      await table.delete();
    }

    // Crear tabla nuevamente
    console.log('🛠️  Creando tabla BigQuery...');
    await initializeBigQuery();

    if (!records || records.length === 0) {
      console.log('⚠️ No hay registros para cargar en BigQuery');
      return { success: true, inserted: 0 };
    }

    // Insertar en batches para evitar límites
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await dataset.table(tableId).insert(batch, { ignoreUnknownValues: true });
      inserted += batch.length;
      console.log(`📥 Batch insertado: ${inserted}/${records.length}`);
    }

    console.log(`✅ Carga completa en BigQuery: ${inserted} registros`);
    return { success: true, inserted };
  } catch (error) {
    console.error('❌ Error reconstruyendo tabla en BigQuery:', error);
    throw error;
  }
};

module.exports = {
  initializeBigQuery,
  insertOOHRecord,
  updateOOHRecord,
  queryOOHRecords,
  getOOHRecordById,
  deleteOOHRecord,
  getStatsByBrand,
  rebuildTableWithRecords
};
