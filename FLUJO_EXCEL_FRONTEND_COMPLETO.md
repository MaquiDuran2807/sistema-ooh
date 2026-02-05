# 🔄 PROCESAMIENTO COMPLETO DE EXCEL EN FRONTEND

## 📊 DIAGRAMA DEL FLUJO

```
Usuario arrastra Excel
    ↓
handleDrop() / handleFileSelect()
    ↓
processExcelFile(file)
    ├─ [1] Lee binarios con FileReader
    ├─ [2] Convierte a workbook con XLSX
    ├─ [3] Extrae raw data como array de arrays
    ├─ [4] Detecta automáticamente fila de headers
    ├─ [5] Mapea columnas (índices)
    ├─ [6] Normaliza y limpia datos
    ├─ [7] Filtra registros inválidos
    └─ [8] Muestra preview y guardar en state
         ↓
    Usuario ve preview y da click en "Crear Registros"
         ↓
    handleCreateAll()
    ├─ [9] Obtiene catálogos (brands, cities, types, providers)
    ├─ [10] Para CADA registro:
    │   ├─ Obtiene/crea MARCA → brand_id
    │   ├─ Obtiene/crea CIUDAD → city_id
    │   ├─ Obtiene/crea TIPO → ooh_type_id
    │   ├─ Obtiene/crea PROVEEDOR → provider_id
    │   ├─ Obtiene/crea CAMPAÑA → campaign_id
    │   ├─ Crea DIRECCIÓN → address_id (valida coords)
    │   └─ POST /api/ooh/create con TODOS los IDs
    └─ [11] Backend crea OOH record con relaciones
         ↓
    ✅ Registros creados exitosamente
```

---

## 📝 PASO 1-8: LECTURA Y NORMALIZACIÓN (processExcelFile)

### [1] Lee archivos en bytes

```javascript
const reader = new FileReader();
reader.readAsArrayBuffer(file);  // Convierte el Excel a bytes
reader.onload = (event) => {
  const data = new Uint8Array(event.target.result);  // Array de bytes
  // Pasar a XLSX para interpretar
}
```

### [2] Convierte bytes a workbook

```javascript
const workbook = XLSX.read(data, { type: 'array' });
const sheetName = workbook.SheetNames[0];  // Primera hoja
const worksheet = workbook.Sheets[sheetName];

console.log('📊 [EXCEL] Hoja encontrada:', sheetName);
console.log('📊 [EXCEL] Worksheet keys:', Object.keys(worksheet).slice(0, 5));
```

### [3] Extrae datos como array de arrays

```javascript
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
// Resultado: 
// [
//   [], 
//   ["BONIFICADO", "MICHELOB MUNDIAL", "ARRIENDO", ...],
//   ["BONIFICADO", "MICHELOB MUNDIAL", ...],
//   ["ESTADO", "MARCA", "TIPO", "CIUDAD", ...],  // Headers
//   ["BONIFICADO", "MICHELOB", "VALLA", "BOGOTA", ...]
// ]

console.log('📊 [EXCEL] Total filas:', jsonData.length);
console.log('📊 [EXCEL] Primeras 5 filas:', jsonData.slice(0, 5));
```

### [4] Detecta automáticamente fila de headers

```javascript
let headerRowIndex = -1;

// Busca la fila que contenga palabras clave
for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
  const row = jsonData[i];
  if (!Array.isArray(row)) continue;
  
  // Convierte toda la fila a texto y busca palabras clave
  const rowStr = row.map(cell => String(cell || '').toUpperCase()).join('|');
  const hasKeys = ['MARCA', 'CIUDAD', 'ESTADO', 'TIPO'].filter(k => rowStr.includes(k));
  
  if (hasKeys.length >= 2) {  // Encontró al menos 2 palabras clave
    headerRowIndex = i;
    console.log('🎯 [EXCEL] Headers detectados en fila', i);
    break;
  }
}

// Ejemplo de resultado:
// rowStr = "BONIFICADO|MICHELOB MUNDIAL|ARRIENDO|OPERACIONES...|BOGOTA|CIRCUITO 6|4023|4029|N/A|N/A"
// hasKeys = [] → NO tiene palabras clave

// Después:
// rowStr = "ESTADO|MARCA|TIPO|PROVEEDOR|CIUDAD|ELEMENTO|LATITUD|LONGITUD|FOTO"
// hasKeys = ["ESTADO", "MARCA", "TIPO", "CIUDAD"] → ✅ HEADERS ENCONTRADOS
```

### [5] Mapea columnas (índices)

```javascript
const headers = jsonData[headerRowIndex];
// headers = ["ESTADO", "MARCA", "TIPO", "PROVEEDOR ARRIENDO", "CIUDAD", "ELEMENTO/UBICACIÓN", "LATITUD", "LONGITUD", "FOTO"]
// Índices:  [0,        1,        2,      3,                  4,        5,                    6,        7,           8]

// Función para buscar columna por palabras clave (flexible)
const findColumnIndex = (headerList, keywords) => {
  return headerList.findIndex(h => {
    if (!h) return false;
    const hClean = String(h).trim().toUpperCase().replace(/\s+/g, ' ');
    return keywords.some(k => hClean.includes(k.toUpperCase()));  // Match parcial
  });
};

// Usa la función para cada columna
const colMarca = findColumnIndex(headers, ['MARCA']);              // Índice: 1
const colTipo = findColumnIndex(headers, ['TIPO']);                // Índice: 2
const colCiudad = findColumnIndex(headers, ['CIUDAD']);            // Índice: 4
const colDireccion = findColumnIndex(headers, ['ELEMENTO/UBICACIÓN', 'ELEMENTO', 'UBICACIÓN', 'DIRECCIÓN']);  // Índice: 5
const colFechaInicio = findColumnIndex(headers, ['INICIO DE VIGENCIA', 'INICIO']);  // Índice: -1 (no encontrado)
const colLatitud = findColumnIndex(headers, ['LATITUD']);          // Índice: 6
const colLongitud = findColumnIndex(headers, ['LONGITUD']);        // Índice: 7
const colProveedor = findColumnIndex(headers, ['PROVEEDOR ARRIENDO', 'PROVEEDOR']);  // Índice: 3
const colEstado = findColumnIndex(headers, ['ESTADO']);            // Índice: 0

console.log('🔍 [EXCEL] Índices encontrados:', {
  marca: colMarca,         // 1
  tipo: colTipo,           // 2
  ciudad: colCiudad,       // 4
  direccion: colDireccion, // 5
  latitud: colLatitud,     // 6
  longitud: colLongitud,   // 7
  proveedor: colProveedor, // 3
  estado: colEstado        // 0
});
```

### [6] Normaliza y limpia datos

```javascript
// Función 6a: Normalizar MARCA
const normalizeMarca = (marca) => {
  if (!marca) return null;
  let clean = String(marca).trim().toUpperCase().replace(/\s+/g, ' ');
  
  const marcaMap = {
    'MICHELOB MUNDIAL': 'MICHELOB',
    'MICHELOB': 'MICHELOB',
    'AGUILA AON': 'AGUILA',
    'AGUILA FRANCHISE_AON': 'AGUILA',
    'AGUILA MUNDIAL': 'AGUILA',
    // ... más mappings
  };
  
  for (const [key, value] of Object.entries(marcaMap)) {
    if (clean === key || clean.includes(key) || key.includes(clean.split(' ')[0])) {
      return value;
    }
  }
  return clean || null;
};

// Función 6b: Normalizar CIUDAD
const normalizeCiudad = (ciudad) => {
  if (!ciudad) return null;
  let clean = String(ciudad).trim().toUpperCase().replace(/\s+/g, ' ');
  
  const ciudadMap = {
    'BOGOTA': 'BOGOTA',
    'BOGOTÁ': 'BOGOTA',      // ← Convierte acentos
    'MEDELLIN': 'MEDELLIN',
    'MEDELLÍN': 'MEDELLIN',  // ← Convierte acentos
    'CARTAGENA DE INDIAS': 'CARTAGENA',  // ← Normaliza nombres largos
    // ... más mappings
  };
  
  return ciudadMap[clean] || clean || null;
};

// Procesa cada fila de datos
const processedRecords = dataRows.map((row, idx) => {
  const record = {
    marca: null,
    tipo_ooh: 'VALLA',  // Default si no viene
    ciudad: null,
    direccion: null,
    fecha_inicio: null,
    fecha_final: null,
    latitud: null,
    longitud: null,
    proveedor: null,
    estado: null,
    categoria: 'CERVEZAS',
    campana: null,
    ciudad_region: null,
    anunciante: 'BAVARIA',
  };

  // Ejemplo de fila: ["BONIFICADO", "MICHELOB", "VALLA", "OPERACIONES...", "BOGOTA", "CIRCUITO 6", "4.70", "-74.01", "N/A"]
  //                 [0,            1,           2,       3,                4,        5,           6,       7,        8]

  // Extrae MARCA (columna 1)
  if (colMarca >= 0 && row[colMarca]) {
    const val = String(row[colMarca]).trim();  // "MICHELOB" (sin espacios)
    if (val && val !== 'N/A' && !val.startsWith('#')) {  // Valida que no sea vacío/N/A/error
      record.marca = normalizeMarca(val);  // "MICHELOB" → "MICHELOB"
    }
  }

  // Extrae CIUDAD (columna 4)
  if (colCiudad >= 0 && row[colCiudad]) {
    const val = String(row[colCiudad]).trim();  // "BOGOTA"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      record.ciudad = normalizeCiudad(val);  // "BOGOTA" → "BOGOTA"
    }
  }

  // Extrae TIPO (columna 2)
  if (colTipo >= 0 && row[colTipo]) {
    const val = String(row[colTipo]).trim();  // "VALLA"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      record.tipo_ooh = val;  // "VALLA"
    }
  }

  // Extrae DIRECCIÓN (columna 5)
  if (colDireccion >= 0 && row[colDireccion]) {
    const val = String(row[colDireccion]).trim();  // "CIRCUITO 6 VALLAS LED EN BOGOTA"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      record.direccion = val;
    }
  }

  // Extrae FECHA INICIO (columna -1, no encontrada)
  if (colFechaInicio >= 0 && row[colFechaInicio]) {
    const val = String(row[colFechaInicio]).trim();  // "2026-01-15 10:30:00"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      const dateStr = val.split(' ')[0];  // Extrae solo fecha "2026-01-15"
      record.fecha_inicio = dateStr;
    }
  } else {
    record.fecha_inicio = null;  // No viene
  }

  // Extrae LATITUD (columna 6)
  if (colLatitud >= 0 && row[colLatitud]) {
    const val = parseFloat(String(row[colLatitud]));  // "4.70" → 4.70
    if (!isNaN(val)) {
      record.latitud = val;
    }
  }

  // Extrae LONGITUD (columna 7)
  if (colLongitud >= 0 && row[colLongitud]) {
    const val = parseFloat(String(row[colLongitud]));  // "-74.01" → -74.01
    if (!isNaN(val)) {
      record.longitud = val;
    }
  }

  // Extrae PROVEEDOR (columna 3)
  if (colProveedor >= 0 && row[colProveedor]) {
    const val = String(row[colProveedor]).trim();  // "OPERACIONES EN PUBLICIDAD EXTERIOR OUTDOOR SAS"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      record.proveedor = val;
    }
  }

  // Extrae ESTADO (columna 0)
  if (colEstado >= 0 && row[colEstado]) {
    const val = String(row[colEstado]).trim();  // "BONIFICADO"
    if (val && val !== 'N/A' && !val.startsWith('#')) {
      record.estado = val;
    }
  }

  // Auto-genera CAMPAÑA si no existe
  if (!record.campana && record.marca) {
    record.campana = record.estado 
      ? `${record.marca} - ${record.estado}`  // "MICHELOB - BONIFICADO"
      : record.marca;  // "MICHELOB"
  }

  // Auto-genera REGIÓN basada en CIUDAD
  if (record.ciudad) {
    const cityLower = record.ciudad.toLowerCase();
    if (['bogota', 'facatativa', 'mosquera', 'la mesa'].some(c => cityLower.includes(c))) {
      record.ciudad_region = 'CO Centro';
    } else if (['medellin', 'armenia', 'manizales', 'pereira', 'cali'].some(c => cityLower.includes(c))) {
      record.ciudad_region = 'CO Andes';
    } else if (['barranquilla', 'cartagena', 'santa marta', 'monteria'].some(c => cityLower.includes(c))) {
      record.ciudad_region = 'CO Norte';
    }
  }

  return record;
});

// Resultado después de procesar una fila:
// {
//   marca: "MICHELOB",
//   tipo_ooh: "VALLA",
//   ciudad: "BOGOTA",
//   direccion: "CIRCUITO 6 VALLAS LED EN BOGOTA",
//   fecha_inicio: null,
//   fecha_final: null,
//   latitud: 4.7,
//   longitud: -74.01,
//   proveedor: "OPERACIONES EN PUBLICIDAD EXTERIOR OUTDOOR SAS",
//   estado: "BONIFICADO",
//   categoria: "CERVEZAS",
//   campana: "MICHELOB - BONIFICADO",
//   ciudad_region: "CO Centro",
//   anunciante: "BAVARIA"
// }
```

### [7] Filtra registros inválidos

```javascript
const validRecords = processedRecords.filter(r => {
  const valid = r.marca && r.ciudad;  // Requiere MARCA y CIUDAD obligatoriamente
  if (!valid && (r.marca || r.ciudad)) {
    console.log('⚠️ [EXCEL] Fila incompleta (rechazada):', r);
    // Log ayuda al usuario a entender por qué se rechazó
  }
  return valid;  // Solo mantiene registros con marca Y ciudad
});

// Ejemplo:
// Rechaza: { marca: null, ciudad: "BOGOTA", ... }  ← Falta marca
// Rechaza: { marca: "MICHELOB", ciudad: null, ... }  ← Falta ciudad
// Acepta: { marca: "MICHELOB", ciudad: "BOGOTA", ... }  ✅
```

### [8] Muestra preview y guarda en state

```javascript
if (validRecords.length === 0) {
  setError(`No se encontraron registros válidos. Se requiere al menos MARCA y CIUDAD en cada fila.`);
  setIsProcessing(false);
  return;  // ← Detiene el flujo si no hay registros válidos
}

setRecords(validRecords);  // Guarda en state para mostrar en preview
setStep('preview');        // Cambia a pantalla de vista previa
setIsProcessing(false);    // Permite al usuario hacer clic en "Crear"

// Ahora el usuario ve:
// - Preview de los primeros 10 registros
// - Cantidad total de registros a crear
// - Botón "Crear Registros"
```

---

## 🚀 PASO 9-11: ENVÍO AL BACKEND (handleCreateAll)

### [9] Obtiene catálogos del backend

```javascript
const handleCreateAll = async () => {
  setStep('creating');  // Muestra progress bar
  setCreatedCount(0);   // Resetea contador

  try {
    // Solicita en PARALELO los catálogos existentes
    const [brandsRes, citiesRes, typesRes, providersRes] = await Promise.all([
      axios.get('http://localhost:8080/api/ooh/brands'),
      axios.get('http://localhost:8080/api/ooh/cities'),
      axios.get('http://localhost:8080/api/ooh/types'),
      axios.get('http://localhost:8080/api/ooh/providers')
    ]);

    // Normaliza respuestas (algunos endpoints devuelven {data: [...]}, otros solo [...])
    const brands = Array.isArray(brandsRes.data) ? brandsRes.data : (brandsRes.data.data || []);
    const cities = Array.isArray(citiesRes.data) ? citiesRes.data : (citiesRes.data.data || []);
    const types = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data.data || []);
    const providers = Array.isArray(providersRes.data) ? providersRes.data : (providersRes.data.data || []);

    console.log('📚 [EXCEL] Catálogos obtenidos:', {
      brands: brands.length,      // 11 marcas
      cities: cities.length,      // 34 ciudades
      types: types.length,        // 7 tipos OOH
      providers: providers.length // 3 proveedores
    });

    // Caché en memoria para no hacer requests innecesarios
    // Si "MICHELOB" aparece en 5 registros, solo se busca 1 vez
  }
}
```

### [10a] Para CADA registro: Obtiene/crea MARCA

```javascript
for (let i = 0; i < records.length; i++) {
  const record = records[i];
  
  console.log(`📝 [EXCEL] Procesando registro ${i + 1}/${records.length}:`, {
    marca: record.marca,           // "MICHELOB"
    ciudad: record.ciudad,         // "BOGOTA"
    direccion: record.direccion,   // "CIRCUITO 6..."
    latitud: record.latitud,       // 4.7
    longitud: record.longitud      // -74.01
  });

  // Obtiene o crea MARCA
  const findOrCreateBrand = async (name) => {
    if (!name) return null;
    
    const nameUpper = name.toUpperCase();  // "MICHELOB"
    
    // Busca en el caché en memoria (no hace request)
    let found = brands.find(b => b.nombre?.toUpperCase() === nameUpper);
    
    if (!found) {
      // No existe → crea nueva marca en backend
      console.log('✨ [EXCEL] Marca no existe, creando:', nameUpper);
      
      const res = await axios.post('http://localhost:8080/api/ooh/brands', {
        nombre: nameUpper  // POST /api/ooh/brands
      });
      
      found = res.data;  // { id: 1, nombre: "MICHELOB", category_id: 2 }
      brands.push(found);  // Agrega al caché para reutilizar
      
      console.log('✨ [EXCEL] Marca creada:', found);
    } else {
      console.log('✅ [EXCEL] Marca existe:', found);
    }
    
    return found.id;  // Retorna el ID de la marca
  };

  const brand_id = await findOrCreateBrand(record.marca);  // brand_id = 1
}
```

### [10b] Obtiene/crea CIUDAD

```javascript
const findOrCreateCity = async (name) => {
  if (!name) return null;
  
  const nameUpper = name.toUpperCase();  // "BOGOTA"
  
  // Busca en el caché
  let found = cities.find(c => c.nombre?.toUpperCase() === nameUpper);
  
  if (!found) {
    // No existe → crea nueva ciudad en backend
    console.log('✨ [EXCEL] Ciudad no existe, creando:', nameUpper);
    
    const res = await axios.post('http://localhost:8080/api/ooh/cities', {
      nombre: nameUpper,
      latitud: null,
      longitud: null
      // POST /api/ooh/cities
    });
    
    found = res.data;  // { id: 15, nombre: "BOGOTA", region_id: 1 }
    cities.push(found);
    
    console.log('✨ [EXCEL] Ciudad creada:', found);
  } else {
    console.log('✅ [EXCEL] Ciudad existe:', found);
  }
  
  return found.id;  // city_id = 15
};

const city_id = await findOrCreateCity(record.ciudad);  // city_id = 15
```

### [10c] Obtiene/crea TIPO OOH

```javascript
const findOrCreateOOHType = async (name) => {
  if (!name) {
    // Default: retorna ID de "VALLA"
    return types.find(t => t.nombre?.toUpperCase() === 'VALLA')?.id || 1;
  }
  
  const nameUpper = name.toUpperCase();  // "VALLA"
  
  let found = types.find(t => t.nombre?.toUpperCase() === nameUpper);
  
  if (!found) {
    const res = await axios.post('http://localhost:8080/api/ooh/types', {
      nombre: nameUpper  // POST /api/ooh/types
    });
    
    found = res.data;  // { id: 3, nombre: "VALLA" }
    types.push(found);
    
    console.log('✨ [EXCEL] Tipo OOH creado:', found);
  }
  
  return found.id;  // ooh_type_id = 3
};

const ooh_type_id = await findOrCreateOOHType(record.tipo_ooh);  // ooh_type_id = 3
```

### [10d] Obtiene/crea PROVEEDOR

```javascript
const findOrCreateProvider = async (name) => {
  if (!name) return null;
  
  const nameUpper = name.toUpperCase();  // "OPERACIONES EN PUBLICIDAD EXTERIOR OUTDOOR SAS"
  
  let found = providers.find(p => p.nombre?.toUpperCase() === nameUpper);
  
  if (!found) {
    const res = await axios.post('http://localhost:8080/api/ooh/providers', {
      nombre: nameUpper  // POST /api/ooh/providers
    });
    
    found = res.data;  // { id: 2, nombre: "OPERACIONES..." }
    providers.push(found);
    
    console.log('✨ [EXCEL] Proveedor creado:', found);
  }
  
  return found.id;  // provider_id = 2
};

const provider_id = await findOrCreateProvider(record.proveedor);  // provider_id = 2
```

### [10e] Obtiene/crea CAMPAÑA

```javascript
const findOrCreateCampaign = async (name, brandId) => {
  if (!name) return null;
  
  // Obtiene campañas del backend
  const campaignsRes = await axios.get('http://localhost:8080/api/ooh/campaigns');
  const campaigns = Array.isArray(campaignsRes.data) ? campaignsRes.data : (campaignsRes.data.data || []);
  
  const nameUpper = name.toUpperCase();  // "MICHELOB - BONIFICADO"
  
  // Busca campaña con ese nombre Y esa marca
  let found = campaigns.find(c => 
    c.nombre?.toUpperCase() === nameUpper && c.brand_id === brandId
  );
  
  if (!found) {
    const res = await axios.post('http://localhost:8080/api/ooh/campaigns', {
      nombre: nameUpper,
      brandId: brandId  // ← Vinculada a la marca
      // POST /api/ooh/campaigns
    });
    
    found = res.data.data || res.data;  // { id: 5, nombre: "MICHELOB - BONIFICADO", brand_id: 1 }
    
    console.log('✨ [EXCEL] Campaña creada:', found);
  } else {
    console.log('✅ [EXCEL] Campaña existe:', found);
  }
  
  return found.id;  // campaign_id = 5
};

const campaign_id = await findOrCreateCampaign(record.campana, brand_id);  // campaign_id = 5
```

### [10f] Crea DIRECCIÓN (con validación geográfica)

```javascript
// Valida que tenga los datos obligatorios
if (!record.direccion || !record.latitud || !record.longitud) {
  throw new Error(`Registro ${i + 1}: Faltan dirección/latitud/longitud`);
}

// Envía dirección al backend para crear/recuperar
const addressRes = await axios.post('http://localhost:8080/api/ooh/addresses/create', {
  city_id: city_id,              // 15
  descripcion: record.direccion, // "CIRCUITO 6 VALLAS LED EN BOGOTA"
  latitud: record.latitud,       // 4.7
  longitud: record.longitud      // -74.01
  // POST /api/ooh/addresses/create
});

// Backend:
// 1. Busca si dirección ya existe para esa ciudad
// 2. Si existe → retorna address_id (reutiliza)
// 3. Si no existe → valida coordenadas contra ciudad
// 4. Si coords son válidas → crea address_id
// 5. Si coords son inválidas → error (coordenadas fuera de la ciudad)

const addressData = addressRes.data?.data || addressRes.data;
const address_id = addressData.id;

console.log('📍 [EXCEL] Dirección lista:', {
  address_id: address_id,  // 42
  ciudad: addressData.ciudad,
  descripcion: addressData.descripcion,
  latitud: addressData.latitud,
  longitud: addressData.longitud
});
```

### [10g] Construye y ENVÍA datos al backend

```javascript
// Todos los IDs ya están listos:
// - brand_id = 1
// - campaign_id = 5
// - ooh_type_id = 3
// - provider_id = 2
// - city_id = 15
// - address_id = 42 (creada en paso anterior)

// Construye FormData con TODOS los IDs
const formData = new FormData();
formData.append('brand_id', brand_id);              // ID de marca
formData.append('campaign_id', campaign_id);        // ID de campaña
formData.append('ooh_type_id', ooh_type_id);        // ID de tipo OOH
formData.append('city_id', city_id);                // ID de ciudad
if (provider_id) formData.append('provider_id', provider_id);  // ID de proveedor
formData.append('direccion', record.direccion);     // Texto de dirección
formData.append('latitud', record.latitud);         // Número flotante
formData.append('longitud', record.longitud);       // Número flotante
formData.append('anunciante', record.anunciante);   // "BAVARIA"
formData.append('fechaInicio', record.fecha_inicio);  // "2026-01-15"
formData.append('fechaFinal', record.fecha_final);    // null
if (record.estado) formData.append('estado', record.estado);  // "BONIFICADO"

console.log('🚀 [EXCEL] Enviando registro con IDs:', {
  brand_id: 1,
  campaign_id: 5,
  ooh_type_id: 3,
  city_id: 15,
  provider_id: 2,
  direccion: "CIRCUITO 6 VALLAS LED EN BOGOTA",
  latitud: 4.7,
  longitud: -74.01,
  fechaInicio: "2026-01-15"
});

// POST al backend
const response = await axios.post(
  'http://localhost:8080/api/ooh/create',  // ← El endpoint
  formData,
  {
    headers: { 'Content-Type': 'multipart/form-data' }
  }
);

console.log('✅ [EXCEL] Registro creado:', response.data);

setCreatedCount(i + 1);  // Actualiza progress bar
```

### [11] Backend crea OOH record con relaciones

```javascript
// En backend (createOOH):

// 1. Valida que TODOS los IDs existan
const brand = await dbService.getBrandById(brand_id);      // ✅ Existe
const campaign = await dbService.getCampaignById(campaign_id);  // ✅ Existe
const city = await dbService.getCityById(city_id);         // ✅ Existe
const provider = await dbService.getProviderById(provider_id);  // ✅ Existe
const oohType = await dbService.getOOHTypeById(ooh_type_id);  // ✅ Existe

// 2. Busca dirección existente
const address = db.prepare(
  'SELECT id FROM addresses WHERE city_id = ? AND descripcion = ?'
).bind([city_id, direccion.toUpperCase()]);

// Si existe, recupera address_id
// Si no existe, crea nuevo address_id

// 3. Inserta registro OOH con TODAS las foreign keys
const stmt = db.prepare(`
  INSERT INTO ooh_records 
  (id, brand_id, campaign_id, ooh_type_id, provider_id, address_id, 
   fecha_inicio, fecha_final, checked, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

stmt.run([
  uuidv4(),           // id nuevo
  1,                  // brand_id ← Foreign key a brands
  5,                  // campaign_id ← Foreign key a campaigns
  3,                  // ooh_type_id ← Foreign key a ooh_types
  2,                  // provider_id ← Foreign key a providers
  42,                 // address_id ← Foreign key a addresses
  "2026-01-15",       // fecha_inicio
  null,               // fecha_final
  0,                  // checked = false
  new Date()          // created_at
]);

dbService.saveDB();  // Guarda en SQLite

// ✅ Registro creado con TODAS las relaciones
```

---

## 📊 RESUMEN DEL FLUJO EN FRONTEND

```
Excel crudos
  ↓
[processExcelFile] Lee → Detecta headers → Mapea columnas
  ↓
Normaliza → Limpia espacios, acentos, conversiones
  ↓
Filtra → Solo registros con MARCA y CIUDAD
  ↓
Preview → Usuario ve qué se va a crear
  ↓
[handleCreateAll] Obtiene catálogos (brands, cities, types, providers)
  ↓
Para CADA registro:
  ├─ findOrCreateBrand() → brand_id
  ├─ findOrCreateCity() → city_id
  ├─ findOrCreateOOHType() → ooh_type_id
  ├─ findOrCreateProvider() → provider_id
  ├─ findOrCreateCampaign(brand_id) → campaign_id
  └─ POST /api/ooh/addresses/create → address_id
      (valida coords, reutiliza si existe)
  ↓
Construye FormData con TODOS los IDs
  ↓
POST /api/ooh/create ← Backend crea record
  ↓
✅ Backend inserta OOH record con relaciones
```

## 🎯 DATOS QUE LLEGAN AL BACKEND

```javascript
{
  brand_id: 1,              // ← ID de marca (FK)
  campaign_id: 5,           // ← ID de campaña (FK)
  ooh_type_id: 3,           // ← ID de tipo OOH (FK)
  provider_id: 2,           // ← ID de proveedor (FK)
  city_id: 15,              // ← ID de ciudad (FK)
  direccion: "CIRCUITO 6...",
  latitud: 4.7,
  longitud: -74.01,
  anunciante: "BAVARIA",
  fechaInicio: "2026-01-15",
  fechaFinal: null,
  estado: "BONIFICADO"
}
```

**TODO viene como IDs y valores normalizados listos para insertar.**
