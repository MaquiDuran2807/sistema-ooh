import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import './ExcelUploader.css';

// 🔍 UTILIDAD: Calcular distancia de Levenshtein para similitud de strings
const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // eliminación
        matrix[i][j - 1] + 1,      // inserción
        matrix[i - 1][j - 1] + cost // sustitución
      );
    }
  }

  return matrix[len1][len2];
};

// 🔍 UTILIDAD: Calcular porcentaje de similitud entre dos strings
const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
};

// 🔍 UTILIDAD: Normalizar nombre para comparación (sin acentos, sin espacios extras, uppercase)
const normalizeForComparison = (str) => {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^A-Z0-9]/g, ' ')      // Solo letras, números y espacios
    .replace(/\s+/g, ' ')             // Espacios múltiples a uno
    .trim();
};

// 🔍 UTILIDAD: Buscar ciudad más similar en array de ciudades
const findMostSimilarCity = (searchName, cities, threshold = 85) => {
  const normalizedSearch = normalizeForComparison(searchName);
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const city of cities) {
    const normalizedCity = normalizeForComparison(city.nombre);
    
    // Coincidencia exacta (normalizada)
    if (normalizedCity === normalizedSearch) {
      return { city, similarity: 100, exactMatch: true };
    }

    // Verificar si uno contiene al otro (ej: BOGOTA vs BOGOTA DC)
    if (normalizedCity.includes(normalizedSearch) || normalizedSearch.includes(normalizedCity)) {
      const similarity = calculateSimilarity(normalizedCity, normalizedSearch);
      if (similarity > bestSimilarity) {
        bestMatch = city;
        bestSimilarity = similarity;
      }
      continue;
    }

    // Calcular similitud por Levenshtein
    const similarity = calculateSimilarity(normalizedCity, normalizedSearch);
    if (similarity > bestSimilarity) {
      bestMatch = city;
      bestSimilarity = similarity;
    }
  }

  // Solo retornar si supera el threshold de similitud
  if (bestMatch && bestSimilarity >= threshold) {
    return { city: bestMatch, similarity: bestSimilarity, exactMatch: false };
  }

  return null;
};

const ExcelUploader = ({ onDataLoaded, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'creating' | 'report' | 'duplicate-check'
  const [createdCount, setCreatedCount] = useState(0);
  const [failedRecords, setFailedRecords] = useState([]); // Registros que fallaron
  const [duplicateInfo, setDuplicateInfo] = useState(null); // Info del duplicado encontrado
  const [applyToAll, setApplyToAll] = useState(null); // 'create' | 'update' | null
  const [importSummary, setImportSummary] = useState(null); // Resumen para modal de errores
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [duplicateBatch, setDuplicateBatch] = useState([]); // Duplicados acumulados
  const [duplicateBatchContext, setDuplicateBatchContext] = useState(null);
  const [showDuplicateBatch, setShowDuplicateBatch] = useState(false);
  const fileInputRef = useRef(null);

  const handleCloseReport = () => {
    if (onDataLoaded) onDataLoaded();
    onClose();
  };

  const processDuplicateBatch = async () => {
    if (!duplicateBatchContext) return;
    const failed = [...(duplicateBatchContext.failed || [])];
    let successCount = duplicateBatchContext.successCount || 0;

    setStep('creating');

    for (const item of duplicateBatch) {
      const { record, rowNumber, action, selectedIds, brand_id, campaign_id, city_id, provider_id, ooh_type_id, state_id } = item;

      if (action === 'skip') {
        failed.push({ rowNumber, record, reason: 'Omitido por usuario (duplicado encontrado)' });
        continue;
      }

      if (action === 'update' && (!selectedIds || selectedIds.length === 0)) {
        failed.push({ rowNumber, record, reason: 'Sin selección para actualizar (duplicado encontrado)' });
        continue;
      }

      try {
        // Crear o recuperar dirección (valida coordenadas por ciudad)
        await axios.post('http://localhost:8080/api/ooh/addresses/create', {
          city_id: city_id,
          descripcion: record.direccion,
          latitud: record.latitud,
          longitud: record.longitud
        });

        const buildFormData = (existingId) => {
          const formData = new FormData();
          formData.append('brand_id', brand_id);
          formData.append('campaign_id', campaign_id);
          formData.append('ooh_type_id', ooh_type_id);
          formData.append('city_id', city_id);
          formData.append('estado_id', state_id);
          if (provider_id) formData.append('provider_id', provider_id);
          formData.append('direccion', record.direccion || '');
          formData.append('latitud', record.latitud || '');
          formData.append('longitud', record.longitud || '');
          formData.append('anunciante', 'ABI');
          formData.append('fechaInicio', record.fecha_inicio || '');
          formData.append('fechaFinal', record.fecha_final || '');
          formData.append('fromExcel', 'true');
          if (record.estado) formData.append('estado', record.estado);
          if (existingId) formData.append('existingId', existingId);
          return formData;
        };

        if (action === 'update') {
          for (const existingId of selectedIds) {
            const formData = buildFormData(existingId);
            await axios.post('http://localhost:8080/api/ooh/create', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            successCount++;
          }
        } else {
          const formData = buildFormData();
          await axios.post('http://localhost:8080/api/ooh/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          successCount++;
        }
      } catch (err) {
        const reason = err.response?.data?.error || err.message || 'Error desconocido';
        const details = err.response?.data?.details || err.response?.data?.detalles || '';
        const fullReason = details ? `${reason}: ${details}` : reason;
        failed.push({ rowNumber, record, reason: fullReason });
      }
    }

    setShowDuplicateBatch(false);
    setDuplicateBatch([]);
    setDuplicateBatchContext(null);

    // Guardar registros fallidos y mostrar reporte
    setFailedRecords(failed);
    if (failed.length === 0) {
      alert(`✅ Se crearon ${successCount} registros exitosamente`);
      if (onDataLoaded) onDataLoaded();
      onClose();
    } else {
      setImportSummary({
        success: successCount - failed.length,
        failed: failed.length,
        geoErrors: failed.filter(f => f.reason.includes('Coordenadas fuera del rango') || f.reason.includes('coordenadas')).length
      });
      setShowImportSummary(true);
      setStep('report');
    }
  };

  // 📅 UTILIDAD: Convertir fecha serial de Excel a formato ISO (yyyy-MM-dd)
  const excelSerialToDate = (serial) => {
    // Excel almacena fechas como número de días desde 1900-01-01 (con bug del año 1900)
    if (typeof serial === 'number') {
      // Ajuste por el bug de Excel (considera 1900 como año bisiesto cuando no lo fue)
      const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
      const msPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + serial * msPerDay);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    // Si es string, intentar parsear diferentes formatos
    if (typeof serial === 'string') {
      const cleaned = serial.trim();
      
      // Ya está en formato ISO (yyyy-MM-dd)
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      
      // Formato dd/MM/yyyy o d/M/yyyy
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        const [day, month, year] = cleaned.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Formato MM/dd/yyyy (americano)
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        const date = new Date(cleaned);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      
      // Si es un número como string, convertir a número y procesar
      const asNumber = parseFloat(cleaned);
      if (!isNaN(asNumber) && asNumber > 1000) {
        return excelSerialToDate(asNumber);
      }
    }
    
    return null;
  };

  // 🔍 Buscar registros similares en BD (por marca, campaña, ubicación, coordenadas)
  const findSimilarRecords = async (record, brand_id, campaign_id, city_id, latitud, longitud) => {
    try {
      // Buscar registros en BD que coincidan en marca, campaña y ciudad
      const response = await axios.get('http://localhost:8080/api/ooh/all', {
        params: {
          page: 1,
          limit: 100 // Traer hasta 100 para buscar similares
        }
      });
      
      const allRecords = response.data?.data || [];
      
      // Filtrar registros similares
      const similares = allRecords.filter(existing => {
        // 1) Misma marca y campaña (por IDs o por nombre si no vienen IDs)
        const sameBrandCampaign =
          (existing.brand_id === brand_id && existing.campaign_id === campaign_id) ||
          (
            String(existing.marca || '').toUpperCase() === String(record.marca || '').toUpperCase() &&
            String(existing.campana || '').toUpperCase() === String(record.campana || '').toUpperCase()
          );
        
        // 2) Misma ciudad
        const sameCity =
          existing.city_id === city_id ||
          String(existing.ciudad || '').toUpperCase() === String(record.ciudad || '').toUpperCase();
        
        // 3) Coordenadas cercanas (±50 metros = ~0.0005 grados)
        const latDiff = Math.abs(existing.latitud - latitud);
        const lngDiff = Math.abs(existing.longitud - longitud);
        const nearCoordinates = latDiff < 0.0005 && lngDiff < 0.0005;
        
        // 4) Dirección similar (fallback si no hay IDs)
        const sameAddress = String(existing.direccion || '').toUpperCase().trim() === String(record.direccion || '').toUpperCase().trim();
        
        return sameBrandCampaign && sameCity && nearCoordinates && sameAddress;
      });
      
      return similares;
    } catch (error) {
      console.error('❌ Error buscando registros similares:', error);
      return [];
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processExcelFile = (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON sin encabezados automáticos para detectar dónde están
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log('📊 [EXCEL] Filas totales:', jsonData.length);
          console.log('📊 [EXCEL] Primeras 5 filas:', jsonData.slice(0, 5));
          
          if (jsonData.length < 2) {
            setError('El archivo debe tener al menos encabezados y 1 registro de datos');
            setIsProcessing(false);
            return;
          }

          // AUTO-DETECTAR FILA DE HEADERS buscando la que contenga "MARCA", "CIUDAD", "ESTADO"
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i];
            if (!Array.isArray(row)) continue;
            const rowStr = row.map(cell => String(cell || '').toUpperCase()).join('|');
            // Buscar la fila que contenga al menos 2 de estas palabras clave
            const hasKeys = ['MARCA', 'CIUDAD', 'ESTADO', 'TIPO'].filter(k => rowStr.includes(k));
            if (hasKeys.length >= 2) {
              headerRowIndex = i;
              console.log('🎯 [EXCEL] Headers detectados en fila', i, '- Palabras clave encontradas:', hasKeys);
              break;
            }
          }

          if (headerRowIndex === -1) {
            setError('No se encontraron encabezados válidos. El archivo debe contener MARCA, CIUDAD, etc.');
            setIsProcessing(false);
            return;
          }

          // Extraer headers y datos
          const headers = jsonData[headerRowIndex];
          const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => 
            Array.isArray(row) && row.length > 0 && row.some(cell => cell != null && cell !== '')
          );

          console.log('📋 [EXCEL] Headers (fila', headerRowIndex, '):', headers);
          console.log('📊 [EXCEL] Filas de datos a procesar:', dataRows.length);

          // Crear mapeo flexible de columnas (case-insensitive)
          const findColumnIndex = (headerList, keywords) => {
            const foundIndex = headerList.findIndex(h => {
              if (!h) return false;
              const hClean = String(h).trim().toUpperCase().replace(/\s+/g, ' ');
              const matched = keywords.some(k => {
                const kUpper = k.toUpperCase();
                // Primero intenta match exacto
                if (hClean === kUpper) return true;
                // Luego intenta match parcial
                return hClean.includes(kUpper);
              });
              if (matched) {
                console.log(`✅ [EXCEL] Columna encontrada: "${h}" matcheó con keywords:`, keywords);
              }
              return matched;
            });
            
            if (foundIndex === -1) {
              console.log(`⚠️ [EXCEL] Columna NO encontrada con keywords:`, keywords);
            }
            
            return foundIndex;
          };

          console.log('📋 [EXCEL] Headers RAW (antes de mapear):', headers);
          console.log('📋 [EXCEL] Total de columnas:', headers.length);

          // Encontrar índices de columnas clave CON PRIORIDAD EN ORDEN
          const colEstado = findColumnIndex(headers, ['ESTADO']);
          const colMarca = findColumnIndex(headers, ['MARCA']);
          const colTipo = findColumnIndex(headers, ['TIPO']);
          const colProveedor = findColumnIndex(headers, ['PROVEEDOR ARRIENDO', 'PROVEEDOR']);
          const colCiudad = findColumnIndex(headers, ['CIUDAD']);
          const colDireccion = findColumnIndex(headers, ['ELEMENTO/UBICACIÓN', 'ELEMENTO/UBICACION', 'ELEMENTO', 'UBICACIÓN', 'UBICACION']);
          const colFechaInicio = findColumnIndex(headers, ['INICIO DE VIGENCIA', 'INICIO']);
          const colFechaFin = findColumnIndex(headers, ['FIN DE VIGENCIA', 'FIN']);
          const colLatitud = findColumnIndex(headers, ['LATITUD']);
          const colLongitud = findColumnIndex(headers, ['LONGITUD']);
          const colFoto = findColumnIndex(headers, ['FOTO']);

          console.log('\n🔍 [EXCEL] ===== RESUMEN DE MAPEO DE COLUMNAS =====');
          console.log('🔍 [EXCEL] Índices encontrados:', {
            estado: colEstado,
            marca: colMarca,
            tipo: colTipo,
            proveedor: colProveedor,
            ciudad: colCiudad,
            direccion: colDireccion,
            fechaInicio: colFechaInicio,
            fechaFin: colFechaFin,
            latitud: colLatitud,
            longitud: colLongitud,
            foto: colFoto
          });
          console.log('🔍 [EXCEL] ============================================\n');
          
          // Validar que encontró las columnas críticas
          const missingCritical = [];
          if (colMarca === -1) missingCritical.push('MARCA');
          if (colCiudad === -1) missingCritical.push('CIUDAD');
          
          if (missingCritical.length > 0) {
            console.error('❌ [EXCEL] Columnas críticas NO encontradas:', missingCritical);
            setError(`No se encontraron columnas críticas: ${missingCritical.join(', ')}. Verifica los encabezados del Excel.`);
            setIsProcessing(false);
            return;
          }

          // 📋 NUEVA UTILIDAD: Parsear columna que tiene "MARCA - CAMPAÑA"
          // Extrae marca y campaña de strings como "CORONA - ENERO 2025"
          const parseMarcaCampana = (fullString) => {
            if (!fullString) return { marca: null, campana: null };
            
            const str = String(fullString).trim().toUpperCase();
            
            // Buscar separador común: " - " o " - " o "-"
            const parts = str.split(/\s*-\s*/);
            
            if (parts.length >= 2) {
              return {
                marca: parts[0].trim(),
                campana: parts.slice(1).join(' - ').trim() // Si hay varios "-", mantenerlos
              };
            }
            
            // Si no hay separador, asumir que todo es marca y generar campaña
            return {
              marca: str,
              campana: str // La campaña será el mismo nombre de la marca
            };
          };

          // Función para limpiar y normalizar MARCA
          const normalizeMarca = (marca) => {
            if (!marca) return null;
            let clean = String(marca).trim().toUpperCase();
            // Remover espacios extras
            clean = clean.replace(/\s+/g, ' ');
            // Mapeo de marcas estándar
            const marcaMap = {
              'MICHELOB MUNDIAL': 'MICHELOB',
              'MICHELOB': 'MICHELOB',
              'AGUILA AON': 'AGUILA',
              'AGUILA BRAND POWER': 'AGUILA',
              'AGUILA CARNAVAL DE BARRANQUILLA': 'AGUILA',
              'AGUILA FRANCHISE_AON': 'AGUILA',
              'AGUILA MUNDIAL': 'AGUILA',
              'AGUILA': 'AGUILA',
              'CLUB COLOMBIA TASCAS': 'CLUB COLOMBIA',
              'CLUB COLOMBIA TRIGO': 'CLUB COLOMBIA',
              'CLUB COLOMBIA': 'CLUB COLOMBIA',
              'COLA & POLA CARNAVAL': 'COLA & POLA',
              'COLA & POLA': 'COLA & POLA',
              'CORONA 100 AÑOS': 'CORONA',
              'CORONA BEER': 'CORONA',
              'CORONA CERO OCASSIONS': 'CORONA',
              'CORONA': 'CORONA',
              'COSTEÑA CENTRO': 'COSTEÑA',
              'COSTEÑA': 'COSTEÑA',
              'POKER FERIA DE CALI': 'POKER',
              'POKER FERIA DE MANIZALES': 'POKER',
              'POKER RENOVACIÓN': 'POKER',
              'POKER ROJA': 'POKER',
              'POKER': 'POKER',
              'PONY MALTA AON': 'PONY MALTA',
              'PONY MALTA BTS': 'PONY MALTA',
              'PONY MALTA': 'PONY MALTA',
              'REDDS BRAND POWER': 'REDDS',
              'REDDS': 'REDDS',
              'STELLA ARTOIS': 'STELLA ARTOIS',
              'PILSEN': 'PILSEN',
              'SEED': 'SEED',
              'MICHELOB ULTRA': 'MICHELOB',
              'BBC': 'BBC',
              'CFC': 'CFC',
              'CBM': 'CBM',
            };
            // Buscar en el mapa (búsqueda parcial también)
            for (const [key, value] of Object.entries(marcaMap)) {
              if (clean === key || clean.includes(key) || key.includes(clean.split(' ')[0])) {
                return value;
              }
            }
            return clean || null;
          };

          // Función para limpiar y normalizar CIUDAD
          const normalizeCiudad = (ciudad) => {
            if (!ciudad) return null;
            let clean = String(ciudad).trim().toUpperCase();
            clean = clean.replace(/\s+/g, ' ');
            // Mapeo de ciudades estándar
            const ciudadMap = {
              'BOGOTA': 'BOGOTA',
              'BOGOTÁ': 'BOGOTA',
              'MEDELLIN': 'MEDELLIN',
              'MEDELLÍN': 'MEDELLIN',
              'CALI': 'CALI',
              'BARRANQUILLA': 'BARRANQUILLA',
              'CARTAGENA': 'CARTAGENA',
              'CARTAGENA DE INDIAS': 'CARTAGENA',
              'ARMENIA': 'ARMENIA',
              'PEREIRA': 'PEREIRA',
              'MANIZALES': 'MANIZALES',
              'BUCARAMANGA': 'BUCARAMANGA',
              'CUCUTA': 'CUCUTA',
              'MONTERIA': 'MONTERIA',
              'CORDOBA': 'CORDOBA',
              'CÓRDOBA': 'CORDOBA',
              'VILLAVICENCIO': 'VILLAVICENCIO',
              'SANTA MARTA': 'SANTA MARTA',
              'POPAYAN': 'POPAYAN',
              'CHIA': 'CHIA',
              'FACATATIVA': 'FACATATIVA',
              'MOSQUERA': 'MOSQUERA',
              'LA MESA': 'LA MESA',
              'SESQUILE': 'SESQUILE',
              'VITERBO': 'VITERBO',
              'SINCELEJO': 'SINCELEJO',
            };
            return ciudadMap[clean] || clean || null;
          };

          // Procesar registros
          const processedRecords = dataRows
            .filter(row => row.length > 0 && row.some(cell => cell != null && cell !== ''))
            .map((row, idx) => {
              const record = {
                marca: null,
                tipo_ooh: 'VALLA', // Default
                ciudad: null,
                direccion: null,
                fecha_inicio: null,
                fecha_final: null,      // 📌 OPCIONAL
                latitud: null,
                longitud: null,
                proveedor: null,
                estado: null,           // 📌 NUEVO: Estado de la OOH (ACTIVO, BONIFICADO, CONSUMO, etc.)
                categoria: 'CERVEZAS',
                campana: null,
                ciudad_region: null,
                anunciante: 'BAVARIA',
              };

              // Extraer valores usando índices encontrados
              if (colMarca >= 0 && row[colMarca]) {
                const val = String(row[colMarca]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  // 📋 Parsear marca - campaña
                  const { marca, campana } = parseMarcaCampana(val);
                  record.marca = normalizeMarca(marca);
                  record.campana = campana;
                  console.log(`🏷️ [EXCEL] Columna marca parseada en fila ${idx}:`);
                  console.log(`   Original: "${val}"`);
                  console.log(`   → Marca: "${record.marca}"`);
                  console.log(`   → Campaña: "${record.campana}"`);
                }
              }

              if (colCiudad >= 0 && row[colCiudad]) {
                const val = String(row[colCiudad]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  record.ciudad = normalizeCiudad(val);
                }
              }

              if (colTipo >= 0 && row[colTipo]) {
                const val = String(row[colTipo]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  record.tipo_ooh = val;
                  console.log(`📺 [EXCEL] Tipo OOH extraído de fila ${idx}: "${val}"`);
                }
              } else {
                console.log(`⚠️ [EXCEL] Fila ${idx}: Tipo OOH NO encontrado o vacío (colTipo=${colTipo}, valor=${row ? row[colTipo] : 'row is null'}), usando default VALLA`);
              }

              if (colDireccion >= 0 && row[colDireccion]) {
                const val = String(row[colDireccion]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  record.direccion = val;
                }
              }

              if (colFechaInicio >= 0 && row[colFechaInicio]) {
                const rawValue = row[colFechaInicio];
                const convertedDate = excelSerialToDate(rawValue);
                if (convertedDate) {
                  record.fecha_inicio = convertedDate;
                  console.log(`📅 [EXCEL] Fecha inicio convertida en fila ${idx}: ${rawValue} → ${convertedDate}`);
                } else {
                  console.log(`⚠️ [EXCEL] Fecha inicio no se pudo parsear en fila ${idx}: ${rawValue}`);
                }
              }

              if (colFechaFin >= 0 && row[colFechaFin]) {
                const rawValue = row[colFechaFin];
                const convertedDate = excelSerialToDate(rawValue);
                if (convertedDate) {
                  record.fecha_final = convertedDate;
                  console.log(`📅 [EXCEL] Fecha fin convertida en fila ${idx}: ${rawValue} → ${convertedDate}`);
                } else {
                  // Si no se puede convertir, dejar como null (es opcional)
                  console.log(`⏭️ [EXCEL] Fecha fin no se pudo parsear o está vacía en fila ${idx}: ${rawValue}`);
                  record.fecha_final = null;
                }
              } else {
                // No hay columna de fecha_final, es opcional
                record.fecha_final = null;
              }

              if (colLatitud >= 0 && row[colLatitud]) {
                const val = parseFloat(String(row[colLatitud]));
                if (!isNaN(val)) {
                  record.latitud = val;
                  console.log(`📍 [EXCEL] Latitud extraída de fila ${idx}: ${val}`);
                }
              } else {
                console.log(`⚠️ [EXCEL] Fila ${idx}: Latitud NO encontrada (colLatitud=${colLatitud})`);
              }

              if (colLongitud >= 0 && row[colLongitud]) {
                const val = parseFloat(String(row[colLongitud]));
                if (!isNaN(val)) {
                  record.longitud = val;
                  console.log(`📍 [EXCEL] Longitud extraída de fila ${idx}: ${val}`);
                }
              } else {
                console.log(`⚠️ [EXCEL] Fila ${idx}: Longitud NO encontrada (colLongitud=${colLongitud})`);
              }

              if (colProveedor >= 0 && row[colProveedor]) {
                const val = String(row[colProveedor]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  record.proveedor = val;
                  console.log(`🏢 [EXCEL] Proveedor extraído de fila ${idx}: ${val}`);
                }
              } else {
                console.log(`⚠️ [EXCEL] Fila ${idx}: Proveedor NO encontrado (colProveedor=${colProveedor})`);
              }

              if (colEstado >= 0 && row[colEstado]) {
                const val = String(row[colEstado]).trim();
                if (val && val !== 'N/A' && !val.startsWith('#')) {
                  record.estado = val.toUpperCase();
                  console.log(`📊 [EXCEL] Estado extraído de fila ${idx}: "${record.estado}"`);
                }
              } else {
                // Estado por defecto
                record.estado = 'ACTIVO';
                console.log(`⏭️ [EXCEL] Fila ${idx}: Estado NO encontrado, usando default ACTIVO`);
              }

              // Generar campaña si no existe
              if (!record.campana && record.marca) {
                record.campana = record.estado ? `${record.marca} - ${record.estado}` : record.marca;
              }

              // Generar región basada en ciudad
              if (record.ciudad) {
                const cityLower = record.ciudad.toLowerCase();
                if (['bogota', 'facatativa', 'mosquera', 'la mesa', 'choconta', 'sesquile', 'chia'].some(c => cityLower.includes(c))) {
                  record.ciudad_region = 'CO Centro';
                } else if (['medellin', 'bello', 'armenia', 'manizales', 'pereira', 'cali', 'popayan'].some(c => cityLower.includes(c))) {
                  record.ciudad_region = 'CO Andes';
                } else if (['barranquilla', 'cartagena', 'santa marta', 'monteria', 'cordoba', 'cucuta', 'sincelejo'].some(c => cityLower.includes(c))) {
                  record.ciudad_region = 'CO Norte';
                } else {
                  record.ciudad_region = 'CO Centro';
                }
              }

              return record;
            })
            .filter(r => {
              const valid = r.marca && r.ciudad;
              if (!valid && (r.marca || r.ciudad)) {
                console.log('⚠️ [EXCEL] Fila incompleta:', r);
              }
              return valid;
            }); // Filtrar registros sin marca o ciudad

          console.log('✅ [EXCEL] Registros válidos encontrados:', processedRecords.length);
          if (processedRecords.length > 0) {
            console.log('📄 [EXCEL] Primeros 3 registros:', processedRecords.slice(0, 3));
          }

          if (processedRecords.length === 0) {
            setError(`No se encontraron registros válidos. Se requiere al menos MARCA y CIUDAD en cada fila. Se analizaron ${dataRows.length} filas. Revisa la consola (F12) para ver detalles.`);
            setIsProcessing(false);
            return;
          }

          setRecords(processedRecords);
          setStep('preview');
          setIsProcessing(false);
        } catch (err) {
          console.error('❌ Error procesando archivo:', err);
          setError(`Error procesando archivo: ${err.message}`);
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Error leyendo el archivo');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(`Error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processExcelFile(file);
      } else {
        setError('Por favor carga un archivo Excel (.xlsx o .xls)');
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      processExcelFile(file);
    }
  };

  // Función para validar datos críticos
  const validateRecord = (record, index) => {
    const missing = [];
    
    if (!record.marca) missing.push('Marca');
    if (!record.ciudad) missing.push('Ciudad');
    if (!record.direccion) missing.push('Dirección');
    if (!record.latitud || record.latitud === 0) missing.push('Latitud');
    if (!record.longitud || record.longitud === 0) missing.push('Longitud');
    
    return {
      valid: missing.length === 0,
      missing: missing
    };
  };

  // Función para exportar registros fallidos a CSV
  const exportFailedToCSV = () => {
    if (failedRecords.length === 0) return;

    const headers = ['Fila', 'Marca', 'Ciudad', 'Dirección', 'Latitud', 'Longitud', 'Motivo'];
    const rows = failedRecords.map(fr => [
      fr.rowNumber,
      fr.record.marca || '',
      fr.record.ciudad || '',
      fr.record.direccion || '',
      fr.record.latitud || '',
      fr.record.longitud || '',
      fr.reason
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registros_fallidos_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAll = async () => {
    setStep('creating');
    setCreatedCount(0);
    setApplyToAll(null); // Reset "aplicar a todos"
    const failed = [];
    let successCount = 0;
    const seenInBatch = new Set();
    const duplicatesFound = [];

    try {
      // Obtener catálogos existentes para mapear nombres a IDs
      const [brandsRes, citiesRes, typesRes, providersRes, statesRes] = await Promise.all([
        axios.get('http://localhost:8080/api/ooh/brands'),
        axios.get('http://localhost:8080/api/ooh/cities'),
        axios.get('http://localhost:8080/api/ooh/types'),
        axios.get('http://localhost:8080/api/ooh/providers'),
        axios.get('http://localhost:8080/api/ooh/states')
      ]);

      // Normalizar respuestas (manejar tanto array directo como {success, data})
      const brands = Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data.data || []);
      const cities = Array.isArray(citiesRes.data) ? citiesRes.data : (citiesRes.data.data || []);
      const types = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data.data || []);
      const providers = Array.isArray(providersRes.data) ? providersRes.data : (providersRes.data.data || []);
      const states = Array.isArray(statesRes.data) ? statesRes.data : (statesRes.data.data || []);

      console.log('📚 [EXCEL] Catálogos obtenidos:', { brands, cities, types, providers, states });

      // Función auxiliar para encontrar o crear entidades
      const findOrCreateBrand = async (name) => {
        if (!name) return null;
        const nameUpper = name.toUpperCase();
        let found = brands.find(b => b.nombre?.toUpperCase() === nameUpper);
        if (!found) {
          // Crear marca nueva
          console.log('   ⚡ Marca no encontrada, creando nueva:', nameUpper);
          const res = await axios.post('http://localhost:8080/api/ooh/brands', { nombre: nameUpper });
          found = res.data;
          brands.push(found); // Agregar al cache
          console.log('✨ [EXCEL] Marca creada:', found);
        } else {
          console.log('♻️ [EXCEL] Marca existente reutilizada:', nameUpper, '(ID:', found.id + ')');
        }
        return found.id;
      };

      const findOrCreateCity = async (name) => {
        if (!name) return null;
        const nameUpper = name.toUpperCase();
        
        // 🔍 BÚSQUEDA FUZZY: Buscar ciudad similar (threshold 85%)
        const similarMatch = findMostSimilarCity(nameUpper, cities, 85);
        
        if (similarMatch) {
          const { city, similarity, exactMatch } = similarMatch;
          if (exactMatch) {
            console.log('♻️ [EXCEL] Ciudad existente (coincidencia exacta):', city.nombre, '(ID:', city.id + ')');
          } else {
            console.log(`🔍 [EXCEL] Ciudad similar encontrada (${similarity.toFixed(1)}% similitud):`);
            console.log(`   Buscado: "${nameUpper}"`);
            console.log(`   Encontrado: "${city.nombre}" (ID: ${city.id})`);
            console.log('   ✅ Reutilizando ciudad existente para evitar duplicados');
          }
          return city.id;
        }
        
        // No se encontró ciudad similar, crear nueva
        console.log('   ⚡ Ciudad no encontrada (ni similar), creando nueva (INCOMPLETA - falta centro y radio):', nameUpper);
        const res = await axios.post('http://localhost:8080/api/ooh/cities', { 
          nombre: nameUpper,
          latitud: null,   // ⚠️ PENDIENTE: Agregar centro de ciudad
          longitud: null   // ⚠️ PENDIENTE: Agregar centro de ciudad
        });
        const newCity = res.data;
        cities.push(newCity); // Agregar al cache
        console.log('⚠️ [EXCEL] Ciudad creada INCOMPLETA:', newCity, '- Requiere agregar latitud, longitud y radio');
        return newCity.id;
      };

      const findOrCreateProvider = async (name) => {
        if (!name) return null;
        const nameUpper = name.toUpperCase();
        let found = providers.find(p => p.nombre?.toUpperCase() === nameUpper);
        if (!found) {
          // Crear proveedor nuevo
          console.log('   ⚡ Proveedor no encontrado, creando nuevo:', nameUpper);
          const res = await axios.post('http://localhost:8080/api/ooh/providers', { nombre: nameUpper });
          found = res.data;
          providers.push(found); // Agregar al cache
          console.log('✨ [EXCEL] Proveedor creado:', found);
        } else {
          console.log('♻️ [EXCEL] Proveedor existente reutilizado:', nameUpper, '(ID:', found.id + ')');
        }
        return found.id;
      };

      const findOrCreateState = async (name) => {
        if (!name) return null;
        const nameUpper = name.toUpperCase();
        let found = states.find(s => s.nombre?.toUpperCase() === nameUpper);
        if (!found) {
          // Crear estado nuevo
          console.log('   ⚡ Estado no encontrado, creando nuevo:', nameUpper);
          try {
            const res = await axios.post('http://localhost:8080/api/ooh/states', { nombre: nameUpper });
            found = res.data;
            states.push(found); // Agregar al cache
            console.log('✨ [EXCEL] Estado creado:', found);
          } catch (err) {
            console.warn('⚠️ Error creando estado, usando ACTIVO por defecto:', err.message);
            // Usar ACTIVO por defecto si falla
            found = states.find(s => s.nombre === 'ACTIVO') || { id: 1, nombre: 'ACTIVO' };
          }
        } else {
          console.log('♻️ [EXCEL] Estado existente reutilizado:', nameUpper, '(ID:', found.id + ')');
        }
        return found.id;
      };

      const findOrCreateOOHType = async (name) => {
        console.log('🔍 [EXCEL] findOrCreateOOHType() llamado con name:', name, 'tipo:', typeof name);
        
        if (!name || name === '' || name === 'undefined') {
          // Default: VALLA
          const vallaId = types.find(t => t.nombre?.toUpperCase() === 'VALLA')?.id;
          console.log('📺 [EXCEL] Tipo OOH no especificado o vacío, usando default VALLA (ID: ' + vallaId + ')');
          console.log('   Tipos disponibles:', types.map(t => ({ id: t.id, nombre: t.nombre })));
          return vallaId || 1;
        }
        const nameUpper = String(name).toUpperCase().trim();
        console.log('📺 [EXCEL] Buscando tipo normalizado: "' + nameUpper + '"');
        console.log('   Tipos disponibles:', types.map(t => ({ id: t.id, nombre: t.nombre })));
        
        let found = types.find(t => t.nombre?.toUpperCase() === nameUpper);
        if (!found) {
          // Crear tipo nuevo
          console.log('   ⚡ Tipo no encontrado, creando nuevo...');
          const res = await axios.post('http://localhost:8080/api/ooh/types', { nombre: nameUpper });
          found = res.data?.data || res.data; // Manejar respuesta envuelta
          types.push(found);
          console.log('✨ [EXCEL] Tipo OOH creado:', found);
        }
        const typeId = found?.id;
        if (!typeId) {
          console.error('❌ [EXCEL] ERROR: found.id es undefined!', found);
          throw new Error('No se pudo obtener ID del tipo OOH: ' + nameUpper);
        }
        console.log('✅ [EXCEL] Tipo OOH retornando ID: ' + typeId + ' para nombre: ' + nameUpper);
        return typeId;
      };

      const findOrCreateCampaign = async (name, brandId) => {
        if (!name) return null;
        // Obtener campañas existentes
        const campaignsRes = await axios.get('http://localhost:8080/api/ooh/campaigns');
        const campaigns = Array.isArray(campaignsRes.data) ? campaignsRes.data : (campaignsRes.data.data || []);
        const nameUpper = name.toUpperCase();
        let found = campaigns.find(c => c.nombre?.toUpperCase() === nameUpper && c.brand_id === brandId);
        if (!found) {
          // Crear campaña nueva
          console.log('   ⚡ Campaña no encontrada, creando nueva:', nameUpper, 'para brand_id:', brandId);
          const res = await axios.post('http://localhost:8080/api/ooh/campaigns', { 
            nombre: nameUpper,
            brandId: brandId  // Cambiar brand_id a brandId
          });
          found = res.data.data || res.data;  // Manejar respuesta envuelta
          console.log('✨ [EXCEL] Campaña creada:', found);
        } else {
          console.log('♻️ [EXCEL] Campaña existente reutilizada:', nameUpper, '(ID:', found.id + ')');
        }
        return found.id;
      };

      // Crear registros uno por uno
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 1;
        
        console.log(`📝 [EXCEL] Procesando registro ${rowNumber}/${records.length}:`, record);

        // 1. Validar datos críticos ANTES de intentar crear
        const validation = validateRecord(record, rowNumber);
        if (!validation.valid) {
          const reason = `Faltan datos críticos: ${validation.missing.join(', ')}`;
          console.log(`⚠️ [EXCEL] Registro ${rowNumber} omitido: ${reason}`);
          failed.push({ rowNumber, record, reason });
          setCreatedCount(i + 1);
          continue; // Saltar este registro
        }

        try {
          // Obtener o crear IDs
          console.log(`🔄 [EXCEL] Obteniendo IDs para registro ${rowNumber}...`);
          const brand_id = await findOrCreateBrand(record.marca);
          console.log(`   ✓ brand_id: ${brand_id}`);
          const city_id = await findOrCreateCity(record.ciudad);
          console.log(`   ✓ city_id: ${city_id}`);
          const provider_id = await findOrCreateProvider(record.proveedor);
          console.log(`   ✓ provider_id: ${provider_id}`);
          const ooh_type_id = await findOrCreateOOHType(record.tipo_ooh);
          console.log(`   ✓ ooh_type_id: ${ooh_type_id} (de tipo_ooh: "${record.tipo_ooh}")`);
          const campaign_id = await findOrCreateCampaign(record.campana, brand_id);
          console.log(`   ✓ campaign_id: ${campaign_id}`);
          const state_id = await findOrCreateState(record.estado);
          console.log(`   ✓ state_id: ${state_id} (de estado: "${record.estado}")`);

          // 🔒 PROTECCIÓN DUPLICADOS: Evitar duplicados dentro del mismo Excel
          const batchKey = [
            brand_id,
            campaign_id,
            city_id,
            String(record.direccion || '').toUpperCase().trim(),
            Number(record.latitud).toFixed(6),
            Number(record.longitud).toFixed(6)
          ].join('|');

          if (seenInBatch.has(batchKey)) {
            console.log(`⏭️ [DUPLICADO] Registro ${rowNumber} repetido en el mismo Excel`);
            failed.push({ rowNumber, record, reason: 'Duplicado en este archivo (mismo punto)' });
            setCreatedCount(i + 1);
            continue;
          }
          seenInBatch.add(batchKey);

          // 🔍 DETECCIÓN DE DUPLICADOS: Buscar registros similares en BD
          const similarRecords = await findSimilarRecords(
            record, 
            brand_id, 
            campaign_id, 
            city_id, 
            record.latitud, 
            record.longitud
          );

          // Si hay duplicados, acumularlos para decidir en lote
          if (similarRecords.length > 0) {
            console.log(`🔍 [DUPLICADO] Encontrados ${similarRecords.length} registro(s) similar(es)`);
            duplicatesFound.push({
              key: `${rowNumber}`,
              rowNumber,
              record,
              similarRecords,
              selectedIds: similarRecords.map(r => r.id),
              action: 'update',
              brand_id,
              campaign_id,
              city_id,
              provider_id,
              ooh_type_id,
              state_id
            });
            setCreatedCount(i + 1);
            continue;
          }

          // 1) Crear o recuperar dirección (valida coordenadas por ciudad)
          let addressData;
          try {
            const addressRes = await axios.post('http://localhost:8080/api/ooh/addresses/create', {
              city_id: city_id,
              descripcion: record.direccion,
              latitud: record.latitud,
              longitud: record.longitud
            });
            addressData = addressRes.data?.data || addressRes.data;
            console.log('📍 [EXCEL] Dirección lista:', addressData);
          } catch (addressErr) {
            // Capturar error específico de validación geográfica
            const addressError = addressErr.response?.data?.error || addressErr.message;
            const addressDetails = addressErr.response?.data?.details || '';
            const fullMessage = addressDetails ? `${addressError}: ${addressDetails}` : addressError;
            console.error(`❌ [EXCEL] Error validación de coordenadas en registro ${rowNumber}:`, fullMessage);
            throw new Error(fullMessage);
          }

        // 2) Preparar FormData con IDs (usando nombres exactos que espera el backend)
        const buildFormData = (existingId) => {
          const formData = new FormData();
          formData.append('brand_id', brand_id);
          formData.append('campaign_id', campaign_id);
          formData.append('ooh_type_id', ooh_type_id);
          formData.append('city_id', city_id);
          formData.append('estado_id', state_id);  // 📌 NUEVO: Estado OOH
          if (provider_id) formData.append('provider_id', provider_id);
          formData.append('direccion', record.direccion || '');
          formData.append('latitud', record.latitud || '');
          formData.append('longitud', record.longitud || '');
          formData.append('anunciante', 'ABI');  // Todos los registros de Excel son de ABI
          formData.append('fechaInicio', record.fecha_inicio || '');  // Backend espera fechaInicio
          formData.append('fechaFinal', record.fecha_final || '');     // Backend espera fechaFinal
          formData.append('fromExcel', 'true');  // Marcar como importación de Excel (permite sin imágenes)
          if (record.estado) formData.append('estado', record.estado);
          if (existingId) formData.append('existingId', existingId);
          return formData;
        };

        console.log('🚀 [EXCEL] Enviando registro con IDs:', {
          rowNumber,
          brand_id,
          campaign_id,
          ooh_type_id,
          city_id,
          provider_id,
          state_id,          // 📌 NUEVO
          direccion: record.direccion,
          latitud: record.latitud,
          longitud: record.longitud,
          anunciante: 'ABI'
        });

        // Validar que ooh_type_id NO sea undefined
        if (!ooh_type_id || ooh_type_id === 'undefined') {
          throw new Error(`Tipo OOH no válido: ${ooh_type_id}. Usa VALLA, POSTER, PISO, FASCIA o DIGITAL`);
        }

        // Crear o actualizar registro
        try {
          const formData = buildFormData();
          await axios.post('http://localhost:8080/api/ooh/create', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          successCount++;
          console.log(`✅ [EXCEL] Registro ${rowNumber} creado exitosamente`);
        } catch (createErr) {
          // Capturar error específico de creación del registro
          const createError = createErr.response?.data?.error || createErr.message || 'Error desconocido al crear registro';
          const createDetails = createErr.response?.data?.details || createErr.response?.data?.detalles || '';
          const fullError = createDetails ? `${createError}. ${createDetails}` : createError;
          
          console.error(`❌ [EXCEL] Error creando registro ${rowNumber}:`, fullError);
          console.error(`   📍 Coordenadas: ${record.latitud}, ${record.longitud}`);
          console.error(`   🏙️  Ciudad: ${record.ciudad}`);
          
          throw new Error(fullError);
        }
          
        } catch (err) {
          // Capturar error individual y continuar
          const reason = err.response?.data?.error || err.message || 'Error desconocido';
          const details = err.response?.data?.details || err.response?.data?.detalles || '';
          const fullReason = details ? `${reason}: ${details}` : reason;
          console.error(`❌ [EXCEL] Error final en registro ${rowNumber}:`, fullReason);
          
          // Si es error de coordenadas, mostrar alerta inmediata
          if (fullReason.includes('Coordenadas fuera del rango') || fullReason.includes('coordenadas')) {
            console.warn(`⚠️⚠️⚠️ ERROR GEOGRÁFICO en fila ${rowNumber}:`);
            console.warn(`   ${fullReason}`);
            console.warn(`   Marca: ${record.marca}, Ciudad: ${record.ciudad}`);
            console.warn(`   Lat: ${record.latitud}, Lng: ${record.longitud}`);
          }
          
          failed.push({ rowNumber, record, reason: fullReason });
        }

        setCreatedCount(i + 1);
      }

      // Si hay duplicados, mostrar modal de decisiones en lote
      if (duplicatesFound.length > 0) {
        setDuplicateBatch(duplicatesFound);
        setDuplicateBatchContext({ failed, successCount });
        setShowDuplicateBatch(true);
        setStep('duplicate-batch');
        return;
      }

      // Guardar registros fallidos y mostrar reporte
      setFailedRecords(failed);
      
      if (failed.length === 0) {
        // Todos exitosos
        alert(`✅ Se crearon ${successCount} registros exitosamente`);
        if (onDataLoaded) onDataLoaded();
        onClose();
      } else {
        // Mostrar reporte con éxitos y fallos
        const geoErrors = failed.filter(f => f.reason.includes('Coordenadas fuera del rango') || f.reason.includes('coordenadas')).length;
        
        setImportSummary({
          success: successCount - failed.length,
          failed: failed.length,
          geoErrors
        });
        setShowImportSummary(true);
        setStep('report');
      }
      
    } catch (err) {
      console.error('❌ [EXCEL] Error crítico:', err);
      setError(`Error crítico: ${err.message}`);
      setStep('preview');
    }
  };

  return (
    <div className="excel-uploader-modal">
      {showImportSummary && importSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ marginTop: 0, color: '#dc3545' }}>⚠️ Importación con errores</h3>
            <p style={{ marginBottom: '12px' }}>
              Se completó la importación, pero algunos registros no se pudieron crear.
            </p>
            <ul style={{ paddingLeft: '18px', marginBottom: '16px' }}>
              <li>✅ Exitosos: <strong>{importSummary.success}</strong></li>
              <li>❌ Fallidos: <strong>{importSummary.failed}</strong></li>
              {importSummary.geoErrors > 0 && (
                <li>📍 Errores de coordenadas: <strong>{importSummary.geoErrors}</strong></li>
              )}
            </ul>
            <p style={{ fontSize: '13px', color: '#555' }}>
              Revisa la tabla de errores en la siguiente pantalla para corregir tu Excel.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowImportSummary(false)}
              >
                Ver errores
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="excel-uploader-content">
        <div className="excel-uploader-header">
          <h2>📊 Cargar Excel con Registros OOH</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div className="excel-uploader-body">
            <div
              className={`drag-drop-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="drag-drop-content">
                <p className="drag-drop-icon">📁</p>
                <p className="drag-drop-text">Arrastra tu Excel aquí</p>
                <p className="drag-drop-subtext">o</p>
                <button
                  className="btn-select-file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  Seleccionar archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <p className="drag-drop-hint">
                  Formato esperado: Excel con fila 2 como encabezados y datos desde fila 3
                </p>
              </div>
              {isProcessing && <div className="loading-spinner">Procesando...</div>}
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="excel-uploader-body">
            <div className="preview-info">
              <p>✅ Se encontraron <strong>{records.length} registros</strong> para importar</p>
            </div>

            <div className="records-preview" style={{ overflowX: 'auto' }}>
              <table className="preview-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estado</th>
                    <th>Marca</th>
                    <th>Ciudad</th>
                    <th>Tipo</th>
                    <th>Proveedor</th>
                    <th>Dirección</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th>F.Inicio</th>
                    <th>F.Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 10).map((record, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{record.estado || '-'}</td>
                      <td><strong>{record.marca}</strong></td>
                      <td>{record.ciudad}</td>
                      <td>{record.tipo_ooh}</td>
                      <td>{record.proveedor?.substring(0, 20) || '-'}</td>
                      <td>{record.direccion?.substring(0, 25) || '-'}</td>
                      <td>{record.latitud ? record.latitud.toFixed(4) : '❌'}</td>
                      <td>{record.longitud ? record.longitud.toFixed(4) : '❌'}</td>
                      <td>{record.fecha_inicio || '❌'}</td>
                      <td>{record.fecha_final || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length > 10 && (
                <p className="more-records">... y {records.length - 10} registros más</p>
              )}
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                💡 Verifica que latitud/longitud/fechas tengan valores correctos. ❌ indica dato faltante.
              </div>
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <div className="excel-uploader-footer">
              <button className="btn-secondary" onClick={() => setStep('upload')}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreateAll}>
                🚀 Crear {records.length} registros
              </button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="excel-uploader-body">
            <div className="progress-container">
              <p>Creando registros...</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(createdCount / records.length) * 100}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {createdCount} de {records.length} registros procesados
              </p>
              <div className="loading-spinner"></div>
            </div>
          </div>
        )}

        {step === 'duplicate-check' && duplicateInfo && (
          <div className="excel-uploader-body">
            <div className="duplicate-check-container">
              <h3>🔍 Registro Duplicado Detectado</h3>
              
              <div className="duplicate-info">
                <p className="duplicate-message">
                  Se encontró{duplicateInfo.similarRecords.length > 1 ? 'ron' : ''} <strong>{duplicateInfo.similarRecords.length}</strong> registro{duplicateInfo.similarRecords.length > 1 ? 's' : ''} similar{duplicateInfo.similarRecords.length > 1 ? 'es' : ''} en la base de datos:
                </p>
                
                <div className="new-record-info">
                  <h4>📝 Registro Nuevo (Fila {duplicateInfo.rowNumber})</h4>
                  <div className="record-details">
                    <p><strong>Marca:</strong> {duplicateInfo.record.marca}</p>
                    <p><strong>Campaña:</strong> {duplicateInfo.record.campana}</p>
                    <p><strong>Ciudad:</strong> {duplicateInfo.record.ciudad}</p>
                    <p><strong>Dirección:</strong> {duplicateInfo.record.direccion}</p>
                    <p><strong>Coordenadas:</strong> ({duplicateInfo.record.latitud}, {duplicateInfo.record.longitud})</p>
                    <p><strong>Fecha Inicio:</strong> {duplicateInfo.record.fecha_inicio}</p>
                  </div>
                </div>

                <div className="existing-records-info">
                  <h4>📚 Registro{duplicateInfo.similarRecords.length > 1 ? 's' : ''} Existente{duplicateInfo.similarRecords.length > 1 ? 's' : ''} en BD</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={(duplicateInfo.selectedIds || []).length === duplicateInfo.similarRecords.length}
                        onChange={(e) => {
                          const allIds = duplicateInfo.similarRecords.map(r => r.id);
                          setDuplicateInfo({
                            ...duplicateInfo,
                            selectedIds: e.target.checked ? allIds : []
                          });
                        }}
                      />{' '}
                      Seleccionar todos
                    </label>
                  </div>
                  {duplicateInfo.similarRecords.map((existing, idx) => {
                    const isSelected = (duplicateInfo.selectedIds || []).includes(existing.id);
                    return (
                      <div key={existing.id} className="existing-record" style={{ border: isSelected ? '2px solid #28a745' : '1px solid #ddd' }}>
                        <p className="record-number">Registro {idx + 1} de {duplicateInfo.similarRecords.length}</p>
                        <label style={{ fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const current = new Set(duplicateInfo.selectedIds || []);
                              if (e.target.checked) current.add(existing.id);
                              else current.delete(existing.id);
                              setDuplicateInfo({
                                ...duplicateInfo,
                                selectedIds: Array.from(current)
                              });
                            }}
                          />{' '}
                          Actualizar este registro (ID: {existing.id})
                        </label>
                        <div className="record-details">
                          <p><strong>Marca:</strong> {existing.marca}</p>
                          <p><strong>Campaña:</strong> {existing.campana}</p>
                          <p><strong>Ciudad:</strong> {existing.ciudad}</p>
                          <p><strong>Dirección:</strong> {existing.direccion}</p>
                          <p><strong>Coordenadas:</strong> ({existing.latitud}, {existing.longitud})</p>
                          <p><strong>Fecha Inicio:</strong> {existing.fecha_inicio}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="duplicate-actions">
                <h4>¿Qué deseas hacer?</h4>
                
                <div className="action-buttons">
                  <button 
                    className="btn-action btn-create"
                    onClick={() => {
                      duplicateInfo.onDecision('create', []);
                      setDuplicateInfo(null);
                    }}
                  >
                    ➕ Nuevo Registro
                  </button>

                  <button 
                    className="btn-action btn-create"
                    disabled={!duplicateInfo.selectedIds || duplicateInfo.selectedIds.length === 0}
                    onClick={() => {
                      duplicateInfo.onDecision('update', duplicateInfo.selectedIds || []);
                      setDuplicateInfo(null);
                    }}
                  >
                    🔄 Actualizar seleccionados
                  </button>
                  
                  <button 
                    className="btn-action btn-skip"
                    onClick={() => {
                      duplicateInfo.onDecision('skip', []);
                      setDuplicateInfo(null);
                    }}
                  >
                    ⏭️ Omitir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'duplicate-batch' && showDuplicateBatch && (
          <div className="excel-uploader-body">
            <div className="duplicate-check-container" style={{ maxWidth: '1100px' }}>
              <h3>🔍 Duplicados encontrados ({duplicateBatch.length})</h3>
              <p style={{ fontSize: '12px', color: '#666' }}>
                Revisa los duplicados, selecciona los registros a actualizar y elige la acción.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  className="btn-action btn-create"
                  onClick={() => {
                    setDuplicateBatch(prev => prev.map(d => ({ ...d, action: 'create' })));
                  }}
                >
                  ➕ Nuevo registro (todos)
                </button>
                <button
                  className="btn-action btn-skip"
                  onClick={() => {
                    setDuplicateBatch(prev => prev.map(d => ({ ...d, action: 'skip' })));
                  }}
                >
                  ⏭️ Omitir (todos)
                </button>
                <button
                  className="btn-action btn-create"
                  onClick={() => {
                    setDuplicateBatch(prev => prev.map(d => ({
                      ...d,
                      action: 'update',
                      selectedIds: d.similarRecords.map(r => r.id)
                    })));
                  }}
                >
                  🔄 Actualizar todos (seleccionar todo)
                </button>
              </div>

              <div style={{ maxHeight: '420px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '8px' }}>
                {duplicateBatch.map((dup, idx) => (
                  <div key={dup.key} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>Fila {dup.rowNumber}</strong>
                      <select
                        value={dup.action}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDuplicateBatch(prev => prev.map(d => d.key === dup.key ? { ...d, action: value } : d));
                        }}
                      >
                        <option value="update">Actualizar</option>
                        <option value="create">Nuevo registro</option>
                        <option value="skip">Omitir</option>
                      </select>
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '12px' }}>
                      <strong>{dup.record.marca}</strong> | {dup.record.campana} | {dup.record.ciudad}
                      <div>{dup.record.direccion}</div>
                      <div>({dup.record.latitud}, {dup.record.longitud})</div>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '12px' }}>
                        <input
                          type="checkbox"
                          checked={(dup.selectedIds || []).length === dup.similarRecords.length}
                          onChange={(e) => {
                            const allIds = dup.similarRecords.map(r => r.id);
                            setDuplicateBatch(prev => prev.map(d => d.key === dup.key ? {
                              ...d,
                              selectedIds: e.target.checked ? allIds : []
                            } : d));
                          }}
                        />{' '}
                        Seleccionar todos
                      </label>
                    </div>

                    <div style={{ marginTop: '6px', display: 'grid', gap: '6px' }}>
                      {dup.similarRecords.map(existing => {
                        const checked = (dup.selectedIds || []).includes(existing.id);
                        return (
                          <label key={existing.id} style={{ fontSize: '12px' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const current = new Set(dup.selectedIds || []);
                                if (e.target.checked) current.add(existing.id);
                                else current.delete(existing.id);
                                setDuplicateBatch(prev => prev.map(d => d.key === dup.key ? {
                                  ...d,
                                  selectedIds: Array.from(current)
                                } : d));
                              }}
                            />{' '}
                            ID {existing.id} | {existing.direccion}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button className="btn-secondary" onClick={() => { setShowDuplicateBatch(false); setStep('preview'); }}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={processDuplicateBatch}>
                  ✅ Procesar duplicados
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'report' && (
          <div className="excel-uploader-body">
            <div className="report-container">
              <h3 style={{ color: failedRecords.length > 0 ? '#dc3545' : '#28a745' }}>
                {failedRecords.length > 0 ? '⚠️ REPORTE DE IMPORTACIÓN - CON ERRORES' : '✅ Reporte de Importación'}
              </h3>
              
              {failedRecords.length > 0 && (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  border: '2px solid #ffc107', 
                  padding: '15px', 
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  <strong>⚠️ Atención:</strong> Algunos registros no pudieron ser creados. 
                  Revisa la tabla de abajo para ver los detalles y corregir los datos en tu Excel.
                </div>
              )}
              
              <div className="report-summary">
                <div className="summary-item success">
                  <span className="summary-icon">✅</span>
                  <div>
                    <div className="summary-number">{createdCount - failedRecords.length}</div>
                    <div className="summary-label">Registros creados</div>
                  </div>
                </div>
                <div className="summary-item failed">
                  <span className="summary-icon">❌</span>
                  <div>
                    <div className="summary-number">{failedRecords.length}</div>
                    <div className="summary-label">Registros omitidos</div>
                  </div>
                </div>
              </div>

              {failedRecords.length > 0 && (
                <>
                  <div className="failed-records-section">
                    <h4>⚠️ Registros no creados - Revisa los detalles:</h4>
                    <div className="failed-records-list">
                      <table className="failed-table">
                        <thead>
                          <tr>
                            <th>Fila</th>
                            <th>Marca</th>
                            <th>Ciudad</th>
                            <th>Dirección</th>
                            <th>Lat</th>
                            <th>Lng</th>
                            <th style={{ width: '300px' }}>Motivo / Detalles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedRecords.slice(0, 20).map((fr, idx) => {
                            const isGeoError = fr.reason.includes('Coordenadas fuera del rango') || fr.reason.includes('coordenadas');
                            return (
                            <tr key={idx} style={{ backgroundColor: isGeoError ? '#fff3cd' : 'transparent' }}>
                              <td><strong>{fr.rowNumber}</strong></td>
                              <td>{fr.record.marca || '❌'}</td>
                              <td>{fr.record.ciudad || '❌'}</td>
                              <td>{fr.record.direccion?.substring(0, 20) || '❌'}</td>
                              <td>{fr.record.latitud ? fr.record.latitud.toFixed(4) : '❌'}</td>
                              <td>{fr.record.longitud ? fr.record.longitud.toFixed(4) : '❌'}</td>
                              <td style={{ 
                                fontSize: '10px', 
                                color: isGeoError ? '#856404' : '#c33', 
                                wordBreak: 'break-word', 
                                maxWidth: '300px',
                                fontWeight: isGeoError ? 'bold' : 'normal'
                              }}>
                                {isGeoError && '📍 '}{fr.reason}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {failedRecords.length > 20 && (
                        <p className="more-records">... y {failedRecords.length - 20} registros más</p>
                      )}
                    </div>
                  </div>

                  <button className="btn-download-csv" onClick={exportFailedToCSV}>
                    📥 Descargar CSV de registros fallidos
                  </button>
                </>
              )}
            </div>

            <div className="excel-uploader-footer">
              <button className="btn-primary" onClick={handleCloseReport}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelUploader;
