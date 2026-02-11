# 📜 Cómo Funciona el Scroll Infinito

## 🔄 Flujo Actual

### 1. **Carga Inicial (Página 1)**
```javascript
// OOHList.js - línea 349-360
useEffect(() => {
  // Se ejecuta cuando cambian: filtros, año, mes
  pageRef.current = 1;           // Página actual = 1
  setRecords([]);                // Limpia registros anteriores
  setHasMorePages(true);         // Habilita paginación
  loadPage(1, false);            // append=false (REEMPLAZA datos)
}, [filterAno, filterMes, refreshTrigger...]);
```

**Resultado:**
- Backend devuelve 30 registros de 38 total
- `records = [rec1, rec2, ..., rec30]`
- UI renderiza: **30 RecordCards + 8 skeleton cards**

---

### 2. **El Observer (IntersectionObserver)**
```javascript
// OOHList.js - línea 521-558
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entry.isIntersecting) {
        // Cuando el PRIMER SKELETON entra en viewport (+ 2000px)
        const nextPage = pageRef.current + 1;  // nextPage = 2
        loadPage(nextPage, true);              // append=TRUE (AGREGA datos)
      }
    },
    { rootMargin: '2000px' }  // Dispara 2000px ANTES de ver el skeleton
  );
  
  observer.observe(loadMoreRef.current);  // loadMoreRef = primer skeleton
}, [...]);
```

**El trigger está en el skeleton:**
```javascript
// OOHList.js - línea 1204
{!hasTextFilters && skeletonCount > 0 &&
  Array.from({ length: skeletonCount }).map((_, idx) => (
    <div key={`skeleton-${idx}`} className="record-card skeleton">
      {idx === 0 && hasMoreRecords && (
        <div ref={loadMoreRef} ... />  // ← Observer conectado AQUÍ
      )}
    </div>
  ))
}
```

---

### 3. **Carga de Página 2**
```javascript
// AppContext.js - línea 204-241
const fetchRecords = useCallback(async (page = 1, limit = 30, options = {}) => {
  const res = await axios.get('/api/ooh/all', { params: { page, limit } });
  
  const append = options.append === true;
  setRecords(prev => {
    if (!append) return res.data.data;  // REEMPLAZAR
    
    // AGREGAR nuevos registros SIN duplicados
    const combined = [...prev, ...res.data.data];
    const seen = new Set();
    return combined.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  });
}, []);
```

**Resultado:**
- Backend devuelve 8 registros restantes
- `records = [rec1, ..., rec30, rec31, ..., rec38]`
- UI actualiza: **38 RecordCards + 0 skeletons**

---

## ⚠️ PROBLEMA: Scroll se Resetea

### ¿Por qué se devuelve al inicio?

Cuando `setRecords` actualiza el estado global de `records`:

1. **React re-renderiza OOHList**
2. **El useEffect line 365 se dispara:**
   ```javascript
   useEffect(() => {
     if (records) {
       setFilteredData(records);  // ← Actualiza displayData
       // Recalcula filtros únicos...
     }
   }, [records]);  // ← Dependencia: cada vez que records cambia
   ```

3. **displayData cambia → loadedRecords cambia**
4. **El map() reconstruye TODAS las RecordCards:**
   ```javascript
   {loadedRecords.map((record) => (
     <RecordCard key={record.id} record={record} />
   ))}
   ```

5. **React reconciliation:**
   - Detecta que la lista pasó de 30+8 elementos a 38+0 elementos
   - Re-crea el DOM completo
   - **Pierde la referencia del scroll position**

---

## ✅ SOLUCIÓN: Preservar Scroll Position

Hay 3 enfoques:

### Opción 1: Guardar/Restaurar Scroll Manual
```javascript
const loadPage = useCallback(async (page, append = false) => {
  // Guardar posición actual
  const scrollY = window.scrollY;
  
  setIsFetchingMore(true);
  const result = await fetchRecords(page, PAGE_SIZE, { append });
  setIsFetchingMore(false);
  
  // Restaurar posición después del re-render
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
  });
}, [fetchRecords]);
```

### Opción 2: Usar ScrollRestoration API
```javascript
useEffect(() => {
  // Deshabilitar restauración automática del navegador
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  
  return () => {
    window.history.scrollRestoration = 'auto';
  };
}, []);
```

### Opción 3: Virtualización (Mejor para listas largas)
Usar `react-window` o `react-virtualized` para renderizar solo elementos visibles.

---

## 📊 Estado de las Variables Clave

### Durante Carga de Página 2:

| Variable | Valor | Efecto |
|----------|-------|--------|
| `pageRef.current` | 2 | Página actual |
| `hasMorePages` | false (después de carga) | No más páginas |
| `isFetchingMore` | true → false | Bloquea múltiples cargas |
| `records.length` | 30 → 38 | Trigger del useEffect |
| `skeletonCount` | 8 → 0 | Skeletons desaparecen |
| `hasMoreRecords` | true → false | Oculta sentinel |

### Ciclo de Re-render:
```
setRecords([...prev, ...new])
  ↓
useEffect([records]) dispara
  ↓
setFilteredData(records)
  ↓
displayData actualiza
  ↓
loadedRecords actualiza
  ↓
RecordCard[] se re-renderiza
  ↓
DOM cambia de 30+8 a 38+0 elementos
  ↓
🐛 Scroll se pierde
```

---

## 🔧 Recomendación de Fix

El problema NO es el código de paginación (funciona bien), sino la **pérdida de scroll position**.

**Fix más simple:**
Agregar scroll restoration en el useEffect del observer.
