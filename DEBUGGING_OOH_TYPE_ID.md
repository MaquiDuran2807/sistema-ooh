# 🐛 Debugging: ooh_type_id Undefined Issue

## Problem
OOH records were not being created after Excel import. Only addresses (direcciones) were created successfully, but the actual OOH records failed with error:
```
❌ Tipo OOH no encontrado con ID: undefined
```

The root cause: `ooh_type_id` was arriving at the backend as undefined/string "undefined".

## Root Cause Analysis

The issue could occur at several points:
1. **Excel Reading**: The `tipo_ooh` column may not be extracted correctly from the Excel file
2. **Type Finding**: `findOrCreateOOHType()` function may return undefined
3. **FormData Sending**: The ID may be lost when appending to FormData
4. **Backend Validation**: Extra string "undefined" checks needed

## Fixes Applied

### 1. Frontend ExcelUploader.js Improvements

#### A. Fixed Code Duplication (Lines 670-681)
- Removed duplicate console.log statements
- Cleaned up FormData append section
- Fixed try/catch structure

#### B. Enhanced tipo_ooh Extraction (Lines ~280-290)
```javascript
if (colTipo >= 0 && row[colTipo]) {
  const val = String(row[colTipo]).trim();
  if (val && val !== 'N/A' && !val.startsWith('#')) {
    record.tipo_ooh = val;
    console.log(`📺 [EXCEL] Tipo OOH extraído de fila ${idx}: "${val}"`);
  }
} else {
  console.log(`⚠️ [EXCEL] Fila ${idx}: Tipo OOH NO encontrado o vacío (colTipo=${colTipo}), usando default VALLA`);
}
```
**What it does**: Shows exactly what tipo_ooh value was extracted from each row

#### C. Improved findOrCreateOOHType() Function (Lines ~540-570)
```javascript
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
  let found = types.find(t => t.nombre?.toUpperCase() === nameUpper);
  if (!found) {
    const res = await axios.post('http://localhost:8080/api/ooh/types', { nombre: nameUpper });
    found = res.data?.data || res.data;
    types.push(found);
  }
  const typeId = found?.id;
  if (!typeId) {
    console.error('❌ [EXCEL] ERROR: found.id es undefined!', found);
    throw new Error('No se pudo obtener ID del tipo OOH: ' + nameUpper);
  }
  console.log('✅ [EXCEL] Tipo OOH retornando ID: ' + typeId + ' para nombre: ' + nameUpper);
  return typeId;
};
```
**What it does**: 
- Shows the exact value received
- Lists all available types for debugging
- Handles empty/undefined strings
- Validates that found.id is not undefined before returning
- Throws helpful error message if ID is missing

#### D. Enhanced Main Loop Logging (Lines ~615-628)
```javascript
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
```
**What it does**: Shows each ID as it's obtained, so you can see if ooh_type_id is undefined

### 2. Backend oohController.js Improvements

#### Enhanced Logging at Request Start (Lines 197-210)
```javascript
const createOOH = async (req, res) => {
  // ... 
  console.log(`📥 [${operationType}] Datos crudos recibidos:`, {
    keys: Object.keys(req.body),
    ooh_type_id: req.body.ooh_type_id,
    ooh_type_id_type: typeof req.body.ooh_type_id,
    brand_id: req.body.brand_id,
    campaign_id: req.body.campaign_id,
    city_id: req.body.city_id
  });
```
**What it does**: Shows exactly what ooh_type_id value the backend receives and its type

#### Validation with Cleanup (Already in place - Lines ~260-275)
```javascript
const ooh_type_id_clean = ooh_type_id === 'undefined' || ooh_type_id === '' ? undefined : ooh_type_id;
const ooh_type_id_final = parseInt(ooh_type_id_clean, 10);
```
**What it does**: Converts string "undefined" to actual undefined, then parses as integer

## How to Test

### Step 1: Reload Frontend
1. Open browser DevTools: Press **F12**
2. Go to Console tab
3. Reload the page: **Ctrl+R** or **Cmd+R**

### Step 2: Check Backend is Running
```bash
cd c:\Users\migduran\Documents\nuevo ooh\backend
npm start
```

### Step 3: Load Excel with Test Data
1. Open the frontend
2. Click "Cargar Archivo Excel"
3. Select your test Excel file
4. Review the data preview
5. Click "Crear Todos los Registros"

### Step 4: Monitor Console Logs

#### In Browser Console (F12):
Look for these log messages in order:
1. `📚 [EXCEL] Catálogos obtenidos:` - Shows available types
2. `📺 [EXCEL] Tipo OOH extraído de fila...` - Shows tipo_ooh from Excel
3. `🔍 [EXCEL] findOrCreateOOHType() llamado con name:` - Shows value passed
4. `✅ [EXCEL] Tipo OOH retornando ID:` - Shows the ID that will be used
5. `   ✓ ooh_type_id: ${ooh_type_id}` - Confirms ID in main loop

#### In Backend Terminal:
Look for these log messages:
1. `📥 [CREATE OOH] Datos crudos recibidos:` - Shows what ooh_type_id value arrived
2. `📋 [CREATE OOH] Datos recibidos (IDs):` - Shows ooh_type_id and other IDs
3. `   ooh_type_id: ${ooh_type_id} (clean: ${ooh_type_id_clean})` - Shows cleaned value
4. `✅ Todos los IDs validados en BD` - If reaches here, validation passed

### Step 5: Check Database
After running the import, check SQLite:
```bash
# In another terminal
sqlite3 backend/ooh_records.db

# Then in SQLite:
SELECT COUNT(*) as registros_totales FROM ooh_records;
SELECT COUNT(*) as direcciones_totales FROM addresses;
```

## Expected Behavior

✅ **Success**: 
- Both address count and ooh_records count increase
- Frontend shows "Se crearon X registros exitosamente"
- Console logs show ooh_type_id as a number (1, 2, 3, etc.)

❌ **Failure with debug info**:
- If ooh_type_id is still undefined:
  - Check if `📺 [EXCEL] Tipo OOH extraído` shows a value
  - Check if it's an empty string or unexpected value
  - Check if types list is populated correctly

## Common Issues & Solutions

### Issue 1: tipo_ooh shows as undefined in extraction
**Cause**: Excel column not found (colTipo = -1) or cell is empty
**Solution**: Ensure Excel has a column with header containing "TIPO", "TYPE", "OOH_TYPE", or similar

### Issue 2: Tipos disponibles list is empty
**Cause**: Types not loaded from database
**Solution**: Check database has OOH types: `SELECT * FROM ooh_types;`

### Issue 3: ooh_type_id still undefined at backend
**Cause**: FormData may not be serializing the ID correctly
**Solution**: Check browser Network tab → POST /api/ooh/create → Request payload → verify ooh_type_id is present

## Log Examples

### Example: Successful Flow
```
📺 [EXCEL] Tipo OOH extraído de fila 2: "VALLA"
🔍 [EXCEL] findOrCreateOOHType() llamado con name: VALLA tipo: string
📺 [EXCEL] Buscando tipo normalizado: "VALLA"
   Tipos disponibles: [
     { id: 1, nombre: 'VALLA' },
     { id: 2, nombre: 'POSTER' }
   ]
✅ [EXCEL] Tipo OOH retornando ID: 1 para nombre: VALLA
   ✓ ooh_type_id: 1 (de tipo_ooh: "VALLA")
```

### Example: Backend Success
```
📥 [CREATE OOH] Datos crudos recibidos: {
  keys: ['brand_id', 'campaign_id', 'ooh_type_id', ...],
  ooh_type_id: '1',
  ooh_type_id_type: 'string',
  ...
}
📋 [CREATE OOH] Datos recibidos (IDs): {
  brand_id: '1',
  campaign_id: '1',
  ooh_type_id: '1'
  ...
}
   ooh_type_id: 1 (clean: 1)
✅ Todos los IDs validados en BD
```

## Next Steps if Still Failing

1. **Take a screenshot of browser console** showing the tipo_ooh extraction
2. **Copy backend logs** from terminal when error occurs
3. **Check Excel file**: Make sure tipo_ooh column exists and has values
4. **Verify database**: `sqlite3 backend/ooh_records.db` then `SELECT * FROM ooh_types;`

## Files Modified

- `frontend/src/components/ExcelUploader.js` - Added enhanced logging and validation
- `backend/controllers/oohController.js` - Added enhanced logging at request start
- This document created for troubleshooting reference
