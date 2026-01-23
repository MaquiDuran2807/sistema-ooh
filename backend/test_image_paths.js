// Script para verificar que las rutas de imágenes son correctas
const fs = require('fs');
const path = require('path');

// Simular la función getLocalImagePath
const getLocalImagePath = (apiPath) => {
  if (!apiPath) return null;
  const cleanPath = apiPath.replace(/^\/api\//, '');
  const fullPath = path.join(__dirname, '..', cleanPath);
  return fullPath;
};

// Rutas de ejemplo del CSV
const testPaths = [
  '/api/images/CLUB_COLOMBIA/TRIGO/2026-04/900ba645-2440-4010-b793-63e1c4439167_CLUB_COLOMBIA_TRIGO_PLLAZA_DE_BOLIVAR_1.jpg',
  '/api/images/CLUB_COLOMBIA/TRago/2026-04/900ba645-2440-4010-b793-63e1c4439167_CLUB_COLOMBIA_TRago_PLLAZA_DE_BOLIVAR_1.jpg',
  '/api/images/CLUB_COLOMBIA/TRIGO/2026-01/900ba645-2440-4010-b793-63e1c4439167_CLUB_COLOMBIA_TRIGO_PLLAZA_DE_BOLIVAR_3.jpg'
];

console.log('🔍 VERIFICANDO RUTAS DE IMÁGENES\n');
console.log(`📁 __dirname: ${__dirname}\n`);

testPaths.forEach((apiPath, idx) => {
  const localPath = getLocalImagePath(apiPath);
  const exists = fs.existsSync(localPath);
  
  console.log(`[${idx + 1}] ${exists ? '✅' : '❌'}`);
  console.log(`    API: ${apiPath}`);
  console.log(`    Local: ${localPath}`);
  console.log(`    Existe: ${exists}`);
  
  if (!exists) {
    // Buscar en el directorio padre por si las imágenes están en otro lugar
    const dir = path.dirname(localPath);
    if (fs.existsSync(dir)) {
      console.log(`    ℹ️ Directorio existe, pero archivo no`);
      const files = fs.readdirSync(dir);
      console.log(`    Archivos en directorio: ${files.length}`);
      if (files.length > 0) {
        console.log(`    Primeros 3: ${files.slice(0, 3).join(', ')}`);
      }
    } else {
      console.log(`    ❌ Directorio NO existe: ${dir}`);
    }
  }
  console.log();
});

// Buscar el directorio images desde el script
console.log('\n📂 BUSCANDO DIRECTORIO images...');
const imagesDir = path.join(__dirname, '..', 'images');
console.log(`Ruta esperada: ${imagesDir}`);
console.log(`Existe: ${fs.existsSync(imagesDir)}`);

if (fs.existsSync(imagesDir)) {
  const subdirs = fs.readdirSync(imagesDir);
  console.log(`Subdirectorios: ${subdirs.join(', ')}`);
}
