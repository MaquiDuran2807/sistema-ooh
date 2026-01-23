/**
 * SOLUCIÓN: Copiar archivo base PPTX y modificarlo
 * 
 * Como PptxGenJS no puede leer archivos existentes, hay 3 opciones:
 * 
 * 1. Usar python-pptx (Python) - Puede leer/modificar PPTX existentes
 * 2. Usar officegen (Node) - Pero solo genera, no lee
 * 3. Copiar manualmente el archivo base y agregar slides programáticamente
 * 
 * OPCIÓN RECOMENDADA: Script Python con python-pptx
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Genera reporte PPT usando el archivo base como plantilla
 * @param {Array} records - Registros de VALLAS filtrados
 * @param {string} month - Mes en formato YYYY-MM
 * @returns {Promise<Buffer>} - Buffer del archivo PPTX generado
 */
async function generateReportWithBase(records, month) {
  // Ruta al archivo base
  const basePPTPath = path.join(__dirname, 'REPORTE FACTURACIÓN BASE.pptx');
  
  if (!fs.existsSync(basePPTPath)) {
    throw new Error(`Archivo base no encontrado: ${basePPTPath}`);
  }
  
  // Crear archivo temporal de salida
  const outputPath = path.join(__dirname, `temp_reporte_${Date.now()}.pptx`);
  
  // Opción 1: Usar Python script (requiere python-pptx instalado)
  return new Promise((resolve, reject) => {
    // Crear datos en JSON para pasar al script Python
    const data = {
      base_file: basePPTPath,
      output_file: outputPath,
      records: records,
      month: month
    };
    
    const dataPath = path.join(__dirname, `temp_data_${Date.now()}.json`);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    // Ejecutar script Python
    const pythonScript = path.join(__dirname, 'generate_ppt_from_base.py');
    const python = spawn('python', [pythonScript, dataPath]);
    
    let errorOutput = '';
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      // Limpiar archivo temporal de datos
      try {
        fs.unlinkSync(dataPath);
      } catch (e) {}
      
      if (code !== 0) {
        return reject(new Error(`Python script failed: ${errorOutput}`));
      }
      
      // Leer el archivo generado
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('Output file not created'));
      }
      
      const buffer = fs.readFileSync(outputPath);
      
      // Limpiar archivo temporal de salida
      try {
        fs.unlinkSync(outputPath);
      } catch (e) {}
      
      resolve(buffer);
    });
  });
}

/**
 * Fallback: Copiar archivo base directamente sin modificar
 * (Solo como último recurso para entregar algo)
 */
function copyBaseFile() {
  const basePath = path.join(__dirname, 'REPORTE FACTURACIÓN BASE.pptx');
  return fs.readFileSync(basePath);
}

module.exports = {
  generateReportWithBase,
  copyBaseFile
};
