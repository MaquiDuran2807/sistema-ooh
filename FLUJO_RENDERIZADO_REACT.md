# 🔄 Flujo de Renderizado: OOHList → RecordCards

## 📦 Jerarquía de Componentes

```
App.js (Root)
  └── AppContext (Estado Global)
       └── OOHList (Componente Padre)
            ├── RecordCard (muchas instancias)  ← Componentes Hijos
            ├── RecordCard
            ├── RecordCard
            └── ...
```

---

## 🎯 ¿Qué Pasa Cuando Cambias un Estado?

### Escenario 1: `useState` LOCAL en OOHList

```javascript
// OOHList.js - línea 64
const [filteredData, setFilteredData] = useState([]);
const [selectedCards, setSelectedCards] = useState(new Set());
const [hasMorePages, setHasMorePages] = useState(true);
```

**Cuando cambias estos estados:**
```javascript
setHasMorePages(false);  // ← Trigger de re-render
```

**React hace:**
1. ✅ **Re-renderiza SOLO OOHList** (componente padre)
2. ✅ **Re-evalúa el JSX** (recalcula qué mostrar)
3. ⚠️ **Puede NO re-renderizar RecordCards** (depende de React.memo)

---

### Escenario 2: `records` del CONTEXTO GLOBAL

```javascript
// OOHList.js - línea 51-53
const { 
  records,         // ← Estado del AppContext
  setRecords,      // ← Función para actualizar
  fetchRecords     // ← Función para cargar desde API
} = useApp();
```

**Cuando cambias `records` desde el contexto:**
```javascript
setRecords([...prev, ...newRecords]);  // ← Agregar registros
```

**React hace:**
1. ✅ **AppContext actualiza su estado**
2. ✅ **TODOS los componentes que usan `useApp()` se re-renderizan**
3. ✅ **OOHList se re-renderiza completamente**
4. ⚠️ **RecordCards individuales: depende de React.memo**

---

## 🧠 React.memo: La Clave de la Optimización

### RecordCard está envuelto con React.memo

```javascript
// RecordCard.js - línea 165
export default React.memo(RecordCard);
```

**¿Qué hace `React.memo`?**

Cuando OOHList se re-renderiza, React compara las **props** de cada RecordCard:

```javascript
<RecordCard
  key={record.id}           // 🔑 Key única
  record={record}           // 📊 Datos del registro
  isSelected={isSelected}   // ✅ Estado de selección
  onSelect={toggleCardSelection}  // ⚙️ Función
  onOpenModal={openModal}   // ⚙️ Función
  formatDate={formatDate}   // 🔧 Utilidad
  resolveImageUrl={resolveImageUrl}  // 🔧 Utilidad
  LazyImage={LazyImage}     // 🖼️ Componente
  toggleCardSelection={toggleCardSelection}  // ⚙️ Función
  onCheckedChange={handleCheckedChange}  // ⚙️ Función
/>
```

### Comparación Superficial (Shallow Comparison)

```
Props anteriores    vs    Props nuevas
─────────────────────────────────────────
record: {id:1}      ===   record: {id:1}   ✅ IGUALES → NO re-renderiza
isSelected: false   ===   isSelected: false ✅ IGUALES → NO re-renderiza
onSelect: fn1       ===   onSelect: fn1     ✅ IGUALES → NO re-renderiza
```

**Si UNA prop cambia:**
```
isSelected: false   !==   isSelected: true  ❌ DIFERENTE → RE-RENDERIZA
```

---

## 📋 Ejemplo Práctico: Cargar Página 2

### 1️⃣ Usuario hace scroll → Observer dispara

```javascript
// OOHList.js - línea 543
const observer = new IntersectionObserver((entries) => {
  if (entry.isIntersecting) {
    loadPage(nextPage, true);  // ← Llamada a loadPage
  }
});
```

### 2️⃣ loadPage ejecuta fetchRecords

```javascript
// OOHList.js - línea 337
const result = await fetchRecords(page, PAGE_SIZE, params);
```

### 3️⃣ AppContext actualiza `records`

```javascript
// AppContext.js - línea 217-228
setRecords(prev => {
  if (!append) return res.data.data;  // Reemplazar
  
  const combined = [...prev, ...res.data.data];  // Agregar
  // Eliminar duplicados
  return combined.filter(item => !seen.has(item.id));
});
```

### 4️⃣ useEffect detecta cambio en `records`

```javascript
// OOHList.js - línea 392-398
useEffect(() => {
  if (records) {
    setFilteredData(records);  // ← Estado local actualizado
    // Recalcular filtros...
  }
}, [records]);  // ← Dependencia: se ejecuta cuando records cambia
```

### 5️⃣ OOHList re-renderiza

```javascript
// OOHList.js - línea 1212-1226
{loadedRecords.map((record) => {  // ← loadedRecords tiene 38 registros ahora
  return (
    <RecordCard key={record.id} record={record} ... />
  );
})}
```

### 6️⃣ React.memo decide qué RecordCards actualizar

**Para las primeras 30 RecordCards:**
- Props NO cambiaron (mismo `record`, mismo `isSelected`)
- ✅ **React REUTILIZA el componente anterior** (NO re-renderiza)
- ⚡ Súper rápido

**Para las nuevas 8 RecordCards:**
- Son completamente nuevas (no existían antes)
- ✅ **React CREA nuevos componentes**
- 🆕 Primera renderización

---

## ⚡ Beneficio de React.memo

### Sin React.memo:
```
OOHList re-renderiza
  ↓
30 RecordCards existentes RE-RENDERIZAN  ❌ (innecesario)
  ↓
8 RecordCards nuevas RENDERIZAN          ✅
  ↓
Total: 38 renders  🐌 Lento
```

### Con React.memo:
```
OOHList re-renderiza
  ↓
30 RecordCards existentes REUTILIZADAS   ✅ (sin cambios)
  ↓
8 RecordCards nuevas RENDERIZAN          ✅
  ↓
Total: 8 renders  ⚡ Rápido
```

---

## 🔍 Casos Especiales: ¿Cuándo SÍ re-renderiza una RecordCard?

### 1. Usuario marca checkbox
```javascript
// RecordCard recibe nueva prop
isSelected: false → isSelected: true
```
✅ **Solo ESA tarjeta re-renderiza**

### 2. Usuario hace check en el botón
```javascript
// OOHList.js - línea 721
const handleCheckedChange = useCallback((recordId, newCheckedState) => {
  setRecords(prevRecords => 
    prevRecords.map(r => 
      r.id === recordId ? { ...r, checked: newCheckedState } : r
    )
  );
}, [setRecords]);
```

**Resultado:**
- `records` cambia (todo el array)
- OOHList re-renderiza
- Solo la tarjeta con `recordId` tiene un objeto `record` diferente
- ✅ **Solo ESA tarjeta re-renderiza** (gracias a React.memo)

---

## 📊 Estados y su Alcance

| Estado | Dónde Vive | Afecta a | Scope |
|--------|-----------|----------|-------|
| `records` | AppContext (global) | Todos los componentes que usan `useApp()` | 🌍 Global |
| `filteredData` | OOHList (local) | Solo OOHList y sus hijos | 📦 Local |
| `selectedCards` | OOHList (local) | Solo OOHList y RecordCards | 📦 Local |
| `isChecking` | RecordCard (local) | Solo esa RecordCard específica | 🎯 Muy Local |

---

## 🎬 Flujo Completo de Ejemplo

```
1. Usuario carga la app
   ↓
2. AppContext ejecuta initializeApp()
   └─ setRecords([rec1, rec2, ..., rec30])
   ↓
3. OOHList monta y lee records del contexto
   └─ useEffect([records]) dispara
      └─ setFilteredData(records)
   ↓
4. OOHList renderiza 30 RecordCards
   └─ {loadedRecords.map(...)}
   ↓
5. Usuario hace scroll
   ↓
6. IntersectionObserver detecta skeleton
   └─ loadPage(2, append=true)
      └─ fetchRecords(2)
         └─ setRecords([...prev, ...new])  ← +8 registros
   ↓
7. AppContext actualiza records
   └─ records: [rec1, ..., rec30, rec31, ..., rec38]
   ↓
8. useEffect([records]) dispara en OOHList
   └─ setFilteredData([...38 records])
   ↓
9. OOHList re-renderiza
   ├─ React.memo evalúa RecordCard #1
   │   └─ Props iguales → SKIP ✅
   ├─ React.memo evalúa RecordCard #2
   │   └─ Props iguales → SKIP ✅
   ├─ ... (hasta #30)
   ├─ RecordCard #31 (nueva)
   │   └─ RENDER 🆕
   ├─ RecordCard #32 (nueva)
   │   └─ RENDER 🆕
   └─ ... (hasta #38)
   ↓
10. UI actualizada con 38 tarjetas
    ✅ Solo 8 nuevas tarjetas renderizaron
    ⚡ Las 30 anteriores se reutilizaron
```

---

## 🚀 Optimizaciones Adicionales en el Código

### 1. useCallback para funciones estables
```javascript
// OOHList.js - línea 323
const loadPage = useCallback(async (page, append = false) => {
  // ...
}, [fetchRecords, filterAno, filterMes]);
```

**Sin useCallback:**
- Cada render crea una NUEVA función
- RecordCard detecta prop diferente
- ❌ Re-renderiza innecesariamente

**Con useCallback:**
- La función es la MISMA entre renders
- RecordCard no detecta cambio
- ✅ NO re-renderiza

### 2. useMemo para cálculos costosos
```javascript
// OOHList.js - línea 473
const skeletonCount = useMemo(() => {
  return Math.max(total - loaded, 0);
}, [recordsPagination?.total, loadedRecords.length]);
```

**Sin useMemo:**
- Se recalcula en CADA render
- Cálculo innecesario

**Con useMemo:**
- Solo recalcula cuando las dependencias cambian
- ⚡ Más eficiente

### 3. useMemo en RecordCard para extraer datos
```javascript
// RecordCard.js - línea 17-33
const recordData = useMemo(() => {
  return { 
    marca: record.marca || '',
    categoria: record.categoria || '',
    // ...
  };
}, [record]);
```

**Resultado:**
- Solo extrae datos cuando `record` cambia
- No reprocesa innecesariamente

---

## 🎯 Conclusión

**¿React re-renderiza TODO?**
- ❌ NO gracias a React.memo

**¿Cuándo se actualiza una RecordCard específica?**
- ✅ Solo cuando SUS props cambian

**¿El useState en OOHList afecta a todas las tarjetas?**
- ⚠️ Depende: si el estado afecta las props de RecordCard, sí
- ✅ Si no afecta las props, React.memo previene re-renders

**Performance:**
- ⚡ 30 tarjetas existentes: REUTILIZADAS
- 🆕 8 tarjetas nuevas: RENDERIZADAS
- 🚀 Total: Solo 8 renders en lugar de 38
