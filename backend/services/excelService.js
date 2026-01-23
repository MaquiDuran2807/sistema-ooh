const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const EXCEL_FILE = process.env.EXCEL_FILE_PATH || path.join(__dirname, '../ooh_data.xlsx');

const initializeExcel = async () => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('OOH Data');

      // Encabezados
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Marca', key: 'marca', width: 20 },
        { header: 'Categoría', key: 'categoria', width: 15 },
        { header: 'Proveedor', key: 'proveedor', width: 20 },
        { header: 'Campaña', key: 'campana', width: 25 },
        { header: 'Dirección', key: 'direccion', width: 30 },
        { header: 'Ciudad', key: 'ciudad', width: 15 },
        { header: 'Región', key: 'region', width: 15 },
        { header: 'Latitud', key: 'latitud', width: 15 },
        { header: 'Longitud', key: 'longitud', width: 15 },
        { header: 'Imagen 1', key: 'imagen1', width: 40 },
        { header: 'Imagen 2', key: 'imagen2', width: 40 },
        { header: 'Imagen 3', key: 'imagen3', width: 40 },
        { header: 'Fecha Inicio', key: 'fechaInicio', width: 15 },
        { header: 'Fecha Fin', key: 'fechaFin', width: 15 },
        { header: 'Fecha de Creación', key: 'fechaCreacion', width: 20 }
      ];

      // Estilizar encabezados
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      await workbook.xlsx.writeFile(EXCEL_FILE);
    }
  } catch (error) {
    console.error('Error al inicializar Excel:', error);
  }
};

const addToExcel = async (data) => {
  try {
    await initializeExcel();
    
    if (!fs.existsSync(EXCEL_FILE)) {
      throw new Error('No se pudo crear el archivo Excel');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const worksheet = workbook.getWorksheet('OOH Data');

    if (!worksheet) {
      throw new Error('Worksheet no encontrada');
    }

    worksheet.addRow({
      id: data.id,
      marca: data.marca,
      categoria: data.categoria,
      proveedor: data.proveedor,
      campana: data.campana,
      direccion: data.direccion,
      ciudad: data.ciudad,
      region: data.region,
      latitud: data.latitud,
      longitud: data.longitud,
      imagen1: data.imagenes[0] || '',
      imagen2: data.imagenes[1] || '',
      imagen3: data.imagenes[2] || '',
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      fechaCreacion: data.fechaCreacion
    });

    await workbook.xlsx.writeFile(EXCEL_FILE);
    console.log('Registro añadido a Excel exitosamente');
  } catch (error) {
    console.error('Error al agregar fila a Excel:', error);
    throw error;
  }
};

const getAllFromExcel = async () => {
  try {
    console.log('📂 Iniciando getAllFromExcel...');
    await initializeExcel();
    
    if (!fs.existsSync(EXCEL_FILE)) {
      console.warn('⚠️ Archivo Excel no existe en:', EXCEL_FILE);
      return [];
    }

    console.log('✅ Archivo Excel encontrado:', EXCEL_FILE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    console.log('✅ Workbook cargado');
    
    const worksheet = workbook.getWorksheet('OOH Data');

    if (!worksheet) {
      console.warn('⚠️ Worksheet "OOH Data" no encontrada');
      console.log('📋 Worksheets disponibles:', workbook.worksheets.map(ws => ws.name));
      return [];
    }

    console.log('✅ Worksheet encontrada. Filas totales:', worksheet.rowCount);

    const data = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        console.log(`📝 Fila ${rowNumber}:`, row.values);
        data.push(row.values);
      }
    });

    console.log(`📊 Total registros encontrados: ${data.length}`);
    return data;
  } catch (error) {
    console.error('❌ Error al leer Excel:', error);
    console.error('Stack:', error.stack);
    return []; // Retornar array vacío en lugar de lanzar error
  }
};

const findExistingRecord = async (direccion, fechaInicio, marca, campana) => {
  try {
    await initializeExcel();
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return { row: null, rowNumber: null };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const worksheet = workbook.getWorksheet('OOH Data');

    if (!worksheet) {
      console.warn('Worksheet no encontrada en findExistingRecord');
      return { row: null, rowNumber: null };
    }

    let foundRow = null;
    let foundRowNumber = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        try {
          const rowData = row.values;
          if (rowData && rowData[6] === direccion && rowData[14] === fechaInicio && rowData[2] === marca && rowData[5] === campana) {
            foundRow = rowData;
            foundRowNumber = rowNumber;
          }
        } catch (rowError) {
          console.warn(`Error procesando fila ${rowNumber}:`, rowError.message);
        }
      }
    });

    return { row: foundRow, rowNumber: foundRowNumber };
  } catch (error) {
    console.error('Error al buscar registro:', error);
    return { row: null, rowNumber: null };
  }
};

const findExistingRecordById = async (id) => {
  try {
    await initializeExcel();
    
    if (!fs.existsSync(EXCEL_FILE)) {
      return { row: null, rowNumber: null };
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const worksheet = workbook.getWorksheet('OOH Data');

    if (!worksheet) {
      console.warn('Worksheet no encontrada en findExistingRecordById');
      return { row: null, rowNumber: null };
    }

    console.log('🔎 Buscando ID en Excel:', id);

    let foundRow = null;
    let foundRowNumber = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        try {
          const rowData = row.values;
          const excelId = rowData && rowData[1] ? String(rowData[1]).trim() : '';
          console.log(`📋 Fila ${rowNumber}: ID="${excelId}"`);
          
          if (excelId === id.trim()) {
            console.log('✅ ID encontrado en línea', rowNumber);
            foundRow = rowData;
            foundRowNumber = rowNumber;
          }
        } catch (rowError) {
          console.warn(`Error procesando fila ${rowNumber}:`, rowError.message);
        }
      }
    });

    if (!foundRow) {
      console.log('❌ ID no encontrado en Excel');
    }

    return { row: foundRow, rowNumber: foundRowNumber };
  } catch (error) {
    console.error('Error al buscar registro por ID:', error);
    return { row: null, rowNumber: null };
  }
};

const updateExcelRow = async (rowNumber, data) => {
  try {
    if (!fs.existsSync(EXCEL_FILE)) {
      throw new Error('Archivo Excel no existe');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);
    const worksheet = workbook.getWorksheet('OOH Data');

    if (!worksheet) {
      throw new Error('Worksheet no encontrada');
    }

    const row = worksheet.getRow(rowNumber);
    if (!row) {
      throw new Error(`Fila ${rowNumber} no encontrada`);
    }

    row.values = {
      id: data.id,
      marca: data.marca,
      categoria: data.categoria,
      proveedor: data.proveedor,
      campana: data.campana,
      direccion: data.direccion,
      ciudad: data.ciudad,
      region: data.region,
      latitud: data.latitud,
      longitud: data.longitud,
      imagen1: data.imagenes[0] || '',
      imagen2: data.imagenes[1] || '',
      imagen3: data.imagenes[2] || '',
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      fechaCreacion: data.fechaCreacion
    };

    await workbook.xlsx.writeFile(EXCEL_FILE);
    console.log(`Registro actualizado en fila ${rowNumber}`);
  } catch (error) {
    console.error('Error al actualizar fila en Excel:', error);
    throw error;
  }
};

module.exports = {
  initializeExcel,
  addToExcel,
  getAllFromExcel,
  findExistingRecord,
  findExistingRecordById,
  updateExcelRow
};
