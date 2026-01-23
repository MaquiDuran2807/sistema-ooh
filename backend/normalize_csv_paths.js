#!/usr/bin/env node
/**
 * Normaliza rutas de imágenes en ooh_data.csv a rutas absolutas locales.
 */
const fs = require('fs');
const path = require('path');

const CSV_FILE = process.env.CSV_FILE_PATH || path.join(__dirname, 'ooh_data.csv');
const BASE_DIR = path.join(__dirname, 'local-images');

const buildAbsoluteImagePath = (rawPath) => {
  if (!rawPath) return '';
  if (path.isAbsolute(rawPath)) return path.normalize(rawPath);
  const clean = String(rawPath).replace(/^\/api\/images\//, '');
  const candidate = path.join(BASE_DIR, clean);
  if (fs.existsSync(candidate)) return candidate;
  const filename = path.basename(clean);
  const stack = [BASE_DIR];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.isFile() && entry.name === filename) return p;
    }
  }
  return candidate;
};

const HEADERS = [
  'ID','Marca','Anunciante','Categoria','Tipo_OOH','Campana','Ciudad','Ciudad_Dashboard','Direccion','Coordenadas','Fecha_Inicio','Fecha_Final','Imgur_Link','Imgur_Link_2','Imgur_Link_3','Region','Proveedor'
];

const run = () => {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`No existe CSV: ${CSV_FILE}`);
    process.exit(1);
  }
  const content = fs.readFileSync(CSV_FILE, 'utf8').split('\n');
  const out = [];
  let modified = 0;
  for (let i = 0; i < content.length; i++) {
    const line = content[i];
    if (!line.trim()) continue;
    if (i === 0 && line.startsWith('ID;')) { out.push(line); continue; }
    const values = line.split(';');
    if (values.length < 17) { out.push(line); continue; }
    const img1 = buildAbsoluteImagePath(values[12]);
    const img2 = buildAbsoluteImagePath(values[13]);
    const img3 = buildAbsoluteImagePath(values[14]);
    if (values[12] !== img1 || values[13] !== img2 || values[14] !== img3) modified++;
    values[12] = img1;
    values[13] = img2;
    values[14] = img3;
    out.push(values.join(';'));
  }
  fs.writeFileSync(CSV_FILE, out.join('\n') + '\n', 'utf8');
  console.log(`CSV normalizado. Líneas modificadas: ${modified}`);
};

run();
