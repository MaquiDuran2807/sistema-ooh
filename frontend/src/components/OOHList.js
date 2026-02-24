import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './OOHList.css';
import RecordTableView from './RecordTableView';
import RecordCardsView from './RecordCardsView';
import MapPicker from './MapPicker';
import AddCampanaModal from './AddCampanaModal';
import { deleteRecord, downloadReportPPT, fetchAvailablePeriods, fetchRecords, updateRecordCheck } from '../services/oohService';
import { useOOHEditModal } from '../hooks/useOOHEditModal';
import { useOOHImages } from '../hooks/useOOHImages';
import { useApp } from '../context/AppContext';

const OOHList = ({ refreshTrigger }) => {
  const PAGE_SIZE = 30;
  const PREFETCH_MARGIN_PX = 6000; // Cargar mucho antes de llegar al final

  // Obtener datos del contexto global
  const { brands, campaigns, createCampaign } = useApp();

  const LazyImage = ({ src, alt, className, placeholder, onError }) => {
    const imgRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      if (!imgRef.current) return;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { root: null, rootMargin: '1200px', threshold: 0.01 }
      );

      observer.observe(imgRef.current);
      return () => observer.disconnect();
    }, []);

    if (!src) {
      return placeholder || null;
    }

    return (
      <img
        ref={imgRef}
        src={isVisible ? src : undefined}
        data-src={src}
        alt={alt}
        className={className}
        decoding="async"
        onError={onError}
      />
    );
  };

  // 🚫 Variables del contexto no usadas en este componente (se usan en RecordTableView/RecordCardsView via props)
  
  // 🔧 ESTADO LOCAL: No usar el contexto global para paginación
  const [records, setRecords] = useState([]);
  const [recordsPagination, setRecordsPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  const loadMoreRef = useRef(null);
  const pageRef = useRef(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  // Filtros
  const [searchDireccion, setSearchDireccion] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterCampana, setFilterCampana] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [availablePeriods, setAvailablePeriods] = useState({ years: [], periodsByYear: {} });
  const [filtersReady, setFiltersReady] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  
  // Listas únicas para filtros
  const [marcas, setMarcas] = useState([]);
  const [campanas, setCampanas] = useState([]);
  
  // 🔧 COMENTADO: Probar sin manipulación manual del scroll del navegador
  // useEffect(() => {
  //   if ('scrollRestoration' in window.history) {
  //     const originalScrollRestoration = window.history.scrollRestoration;
  //     window.history.scrollRestoration = 'manual';
  //     console.log('🔧 [SCROLL] ScrollRestoration configurado a "manual"');
  //     
  //     return () => {
  //       window.history.scrollRestoration = originalScrollRestoration;
  //       console.log('🔧 [SCROLL] ScrollRestoration restaurado');
  //     };
  //   }
  // }, []);
  
  // Cargar períodos disponibles al montar y establecer fecha actual del sistema como filtro por defecto
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await fetchAvailablePeriods();
        if (res.success) {
          setAvailablePeriods(res.data);
          
          // Usar siempre la fecha actual del sistema como filtro por defecto
          const now = new Date();
          let defaultYear = now.getFullYear().toString();
          let defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
          
          // Validar que el año existe en la BD
          const yearsAvailable = res.data.years.map(String);
          if (!yearsAvailable.includes(defaultYear)) {
            // Si el año actual no existe, usar el primer año disponible
            defaultYear = yearsAvailable[0] || '';
          }
          
          // Validar que el mes existe para el año seleccionado
          const monthsForYear = res.data.periodsByYear[defaultYear] || [];
          if (!monthsForYear.includes(defaultMonth)) {
            // Si el mes actual no existe, usar el primer mes disponible del año
            defaultMonth = monthsForYear[0] || '';
          }
          
          setFilterAno(defaultYear);
          setFilterMes(defaultMonth);
          setFiltersReady(true);
        }
      } catch (error) {
        console.error('Error cargando períodos disponibles:', error);
        setFiltersReady(true);
      }
    };
    loadPeriods();
  }, []);

  useEffect(() => {
    if (!filterAno) return;
    const monthsForYear = availablePeriods.periodsByYear[filterAno] || [];
    if (monthsForYear.length === 0) {
      if (filterMes) {
        setFilterMes('');
      }
      return;
    }
    if (!filterMes) {
      return;
    }
    if (!monthsForYear.includes(filterMes)) {
      setFilterMes(monthsForYear[monthsForYear.length - 1]);
    }
  }, [filterAno, filterMes, availablePeriods.periodsByYear]);
  
  // Selección múltiple de tarjetas
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkingStates, setCheckingStates] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportMethod, setReportMethod] = useState('base');
  const [isDownloading, setIsDownloading] = useState(false);

  // Actualizar estado de check en un registro
  const handleCheckedChange = useCallback((recordId, newCheckedState) => {
    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.id === recordId ? { ...r, checked: newCheckedState } : r
      )
    );
  }, [setRecords]);

  // 🔧 CUSTOM HOOKS: Modal de edición y gestión de imágenes  
  // Se define handleRefresh después de loadPage, así que se pasa como ref
  let loadPageRef = useRef();

  const editModalHook = useOOHEditModal({
    onRefresh: () => {
      pageRef.current = 1;
      loadPageRef.current && loadPageRef.current(1, false);
    }
  });

  const imagesHook = useOOHImages({
    selectedRecord: editModalHook.selectedRecord,
    onUpdateRecord: (updatedRecord) => {
      editModalHook.setSelectedRecord(updatedRecord);
      setRecords(prevRecords =>
        prevRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r)
      );
    }
  });

  // Desestructurar funciones y variables de los hooks para uso directo
  const {
    showModal,
    selectedRecord,
    setSelectedRecord,
    editMode,
    setEditMode,
    editData,
    imageReplacements,
    setImageReplacements,
    isSyncingBQ,
    syncStatus,
    showAddCampanaModal,
    openModal: openModalFromHook,
    closeModal,
    handleEditChange,
    handleImageChangeSlot,
    saveChanges,
    syncToBigQuery,
    openAddCampanaModal,
    closeAddCampanaModal,
    handleNewCampaignAdded
  } = editModalHook;

  const {
    showImagesModal,
    setShowImagesModal,
    recordImages,
    imagesLoading,
    imagesError,
    setImagesError,
    imagesUploading,
    cachedImages,
    boxAssignments,
    isDraggingOverDropZone,
    openImagesModal,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
    handleDropImages,
    assignImageToBox,
    getAssignedImage,
    handleSaveAllImages
  } = imagesHook;

  const openModal = openModalFromHook; // Alias para compatibilidad

  // Manejar el toggle de check en tabla
  const handleCheckInTable = useCallback(async (e, recordId, currentCheckedState) => {
    e.stopPropagation();
    setCheckingStates(prev => ({ ...prev, [recordId]: true }));
    try {
      const newCheckedState = !currentCheckedState;
      const response = await updateRecordCheck(recordId, newCheckedState);
      if (response.success) {
        handleCheckedChange(recordId, newCheckedState);
      }
    } catch (error) {
      console.error('Error al actualizar check:', error);
    } finally {
      setCheckingStates(prev => ({ ...prev, [recordId]: false }));
    }
  }, [handleCheckedChange]);

  const resolveImageUrl = (raw) => {
      if (!raw) return null;
      let val = String(raw);
      
      // Reemplazar backslashes JSON-escaped (\\) por barras normales
      val = val.replace(/\\\\/g, '\\');
      
      const lower = val.toLowerCase();

      // http/https directo - retornar URL estable
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        return val;
      }

      // Windows absoluta con backslashes
      if (/^[a-z]:\\/i.test(val) || val.includes('\\')) {
        // Buscar "local-images" en el path (insensible a mayúsculas)
        const regex = /local-images[\\/]/i;
        const match = val.match(regex);
        if (match) {
          const startIndex = val.indexOf(match[0]) + match[0].length;
          const rel = val.substring(startIndex).replace(/\\/g, '/');
          return `http://localhost:8080/api/images/${encodeURI(rel)}`;
        }
        // Si no tiene local-images, tomar solo el filename como fallback
        const filename = val.split(/[/\\]/).pop();
        return filename ? `http://localhost:8080/api/images/${encodeURI(filename)}` : null;
      }

      // Unix absoluta
      if (val.startsWith('/')) {
        const parts = val.split(/local-images/i);
        if (parts.length > 1) {
          const rel = parts[1].replace(/^\//, '');
          return `http://localhost:8080/api/images/${encodeURI(rel)}`;
        }
      }

      // Ruta relativa de API
      if (val.startsWith('/api/images')) {
        return `http://localhost:8080${encodeURI(val)}`;
      }

      return val;
    };

  // 🔧 Fetch local de records (NO usa el contexto global)
  const fetchRecordsLocal = useCallback(async (page = 1, limit = 30, options = {}) => {
    try {
      const params = { page, limit };
      if (options.mes) {
        params.mes = options.mes;
      }
      if (options.ano) {
        params.ano = options.ano;
      }
      // console.log(`📄 [LOCAL FETCH] Cargando registros: page=${page}, limit=${limit}`);
      const res = await fetchRecords(params);
      if (res.success) {
        const append = options.append === true;
        setRecords(prev => {
          if (!append) return res.data;
          const combined = [...prev, ...res.data];
          const seen = new Set();
          return combined.filter(item => {
            if (!item?.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
        if (res.pagination) {
          setRecordsPagination(res.pagination);
        }
        return {
          data: res.data,
          pagination: res.pagination
        };
      }
    } catch (error) {
      console.error('Error cargando registros:', error);
      return { data: [], pagination: null };
    }
  }, []);

  const loadPage = useCallback(async (page, append = false) => {
    // console.log(`📄 [LOAD PAGE] Iniciando carga: page=${page}, append=${append}`);
    
    setIsFetchingMore(true);
    try {
      const params = { append };
      if (filterAno && filterMes) {
        params.mes = `${filterAno}-${filterMes}`;
      } else if (filterAno && !filterMes) {
        params.ano = filterAno;
      }
      // console.log('📄 [LOAD PAGE] Parámetros:', params);
      const result = await fetchRecordsLocal(page, PAGE_SIZE, params);
      // console.log('📄 [LOAD PAGE] Resultado:', {
      //   dataLength: result?.data?.length,
      //   paginationTotal: result?.pagination?.total,
      //   paginationHasMore: result?.pagination?.hasMore
      // });
      setHasMorePages(!!result?.pagination?.hasMore);
      // console.log('📄 [LOAD PAGE] hasMorePages actualizado a:', !!result?.pagination?.hasMore);
      pageRef.current = page;
      
      return result;
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetchRecordsLocal, filterAno, filterMes]);

  // Asignar loadPage al ref para uso en hooks
  loadPageRef.current = loadPage;

  useEffect(() => {
    if (!filtersReady) return;
    if (filterAno) {
      const monthsForYear = availablePeriods.periodsByYear[filterAno] || [];
      if (monthsForYear.length > 0 && filterMes && !monthsForYear.includes(filterMes)) return;
    }
    // console.log('🔄 [INIT] Reiniciando lista, cargando página 1');
    pageRef.current = 1;
    setRecords([]);
    setRecordsPagination({ page: 1, limit: 30, total: 0, totalPages: 0, hasMore: false });
    setHasMorePages(true); // Reset hasMorePages antes de cargar
    loadPage(1, false);
    // 🔧 setRecords y setRecordsPagination NO en dependencias (son estables de useState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage, refreshTrigger, filterAno, filterMes, filtersReady, availablePeriods.periodsByYear]);

  // Actualizar datos locales cuando el contexto cambia
  useEffect(() => {
    if (records) {
      setFilteredData(records);
      
      // Extraer valores únicos para filtros
      const uniqueMarcas = [...new Set(records.map(r => r.marca))].filter(Boolean).sort();
      const uniqueCampanas = [...new Set(records.map(r => r.campana))].filter(Boolean).sort();
      setMarcas(uniqueMarcas);
      setCampanas(uniqueCampanas);
    }
  }, [records]);

  const applyFilters = useCallback(() => {
    if (!records) return;
    
    let filtered = [...records];

    // Filtro por búsqueda de dirección
    if (searchDireccion) {
      filtered = filtered.filter(record =>
        record.direccion?.toLowerCase().includes(searchDireccion.toLowerCase())
      );
    }

    // Filtro por marca
    if (filterMarca) {
      filtered = filtered.filter(record => record.marca === filterMarca);
    }

    // Filtro por campaña
    if (filterCampana) {
      filtered = filtered.filter(record => record.campana === filterCampana);
    }

    // Filtro por fecha inicio
    if (filterFechaInicio) {
      filtered = filtered.filter(record => {
        const recordFecha = new Date(record.fecha_inicio);
        const filterFecha = new Date(filterFechaInicio);
        return recordFecha >= filterFecha;
      });
    }

    // Filtro por fecha fin
    if (filterFechaFin) {
      filtered = filtered.filter(record => {
        const recordFecha = new Date(record.fecha_final);
        const filterFecha = new Date(filterFechaFin);
        return recordFecha <= filterFecha;
      });
    }

    setFilteredData(filtered);
  }, [records, searchDireccion, filterMarca, filterCampana, filterFechaInicio, filterFechaFin]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Filtros de búsqueda/texto que requieren filtrado en frontend
  const hasTextFilters = !!(searchDireccion || filterMarca || filterCampana || filterFechaInicio || filterFechaFin);
  // Filtros de fecha que se aplican en backend y permiten paginación
  const hasDateFilters = !!(filterAno || filterMes);
  // Para compatibilidad con código existente
  const hasActiveFilters = hasTextFilters;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortRecordsByDateStatus = (recordsToSort) => {
    return [...recordsToSort].sort((a, b) => {
      const aStart = new Date(a.fecha_inicio);
      const aEnd = new Date(a.fecha_final);
      const bStart = new Date(b.fecha_inicio);
      const bEnd = new Date(b.fecha_final);

      // Determinar si está activo (fecha actual entre inicio y fin)
      const aActive = today >= aStart && today <= aEnd;
      const bActive = today >= bStart && today <= bEnd;

      // Activos primero
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // Si ambos activos o ambos inactivos, ordenar por fecha más reciente
      return bStart - aStart; // Más reciente primero
    });
  };

  const displayData = useMemo(() => {
    if (hasActiveFilters) {
      // Ordenar solo cuando hay filtros activos
      return sortRecordsByDateStatus(filteredData);
    }
    // Mantener el orden del backend para evitar saltos al cargar más
    return records || [];
  }, [filteredData, records, hasActiveFilters]);

  const visibleRecords = useMemo(() => {
    return displayData;
  }, [displayData]);

  const loadedRecords = useMemo(() => {
    return displayData;
  }, [displayData]);

  const skeletonCount = useMemo(() => {
    // Calcular cuántos skeletons faltan por cargar
    if (hasActiveFilters && records.length > 0) return 0;
    const total = recordsPagination?.total || 0;
    const loaded = records.length || 0;
    const remaining = Math.max(total - loaded, 0);
    // console.log('🎯 [SKELETONS] total:', total, 'loaded:', loaded, 'remaining:', remaining);
    return remaining;
  }, [hasActiveFilters, recordsPagination?.total, loadedRecords.length, records.length]);

  // Permitir paginación cuando solo hay filtros de fecha (backend paginado) o sin filtros
  const hasMoreRecords = !hasTextFilters && (hasMorePages || isFetchingMore);
  

  
  const areAllVisibleSelected = useMemo(() => {
    if (visibleRecords.length === 0) return false;
    return visibleRecords.every(record => selectedCards.has(record.id));
  }, [visibleRecords, selectedCards]);

  const totalCount = useMemo(() => {
    if (hasActiveFilters) {
      return displayData.length;
    }
    const total = recordsPagination?.total ?? records.length ?? 0;
    // console.log('📊 [PAGINACIÓN] totalCount calculado:', {
    //   recordsLength: records.length,
    //   paginationTotal: recordsPagination?.total,
    //   loadedRecordsLength: records.length,
    //   hasActiveFilters
    // });
    return total;
  }, [hasActiveFilters, displayData.length, recordsPagination?.total, records.length]);

  // Refs para el observer - para evitar que las dependencias del useEffect cambien constantemente
  const observerStateRef = useRef({ hasTextFilters: false, isFetchingMore: false, hasMorePages: true });

  // Actualizar los refs cuando los valores cambien
  useEffect(() => {
    observerStateRef.current = {
      hasTextFilters,
      isFetchingMore,
      hasMorePages
    };
  }, [hasTextFilters, isFetchingMore, hasMorePages]);

  useEffect(() => {
    if (!loadMoreRef.current) {
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // console.log('👁️ [OBSERVER] Callback disparado, isIntersecting:', entry.isIntersecting, 'boundingRect:', entry.boundingClientRect);
        if (!entry.isIntersecting) return;
        
        const state = observerStateRef.current;
        // console.log('📊 [OBSERVER] Estado actual:', state);
        
        if (state.isFetchingMore) {
          // console.log('⏳ [OBSERVER] Ya está cargando, ignorando');
          return;
        }
        
        if (!state.hasMorePages) {
          // console.log('✋ [OBSERVER] No hay más páginas');
          return;
        }

        const nextPage = pageRef.current + 1;
        // console.log(`📥 [OBSERVER] ¡CARGANDO página ${nextPage}!`);
        loadPage(nextPage, true);
      },
      {
        root: null,
        rootMargin: '2000px', // Cargar 2000px ANTES de llegar al skeleton
        threshold: 0.01
      }
    );

    observer.observe(loadMoreRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [PREFETCH_MARGIN_PX, loadPage, hasMorePages, isFetchingMore, skeletonCount, viewMode]);

  const clearFilters = () => {
    setSearchDireccion('');
    setFilterMarca('');
    setFilterCampana('');
    setFilterFechaInicio('');
    setFilterFechaFin('');
  };

  const handleAnoChange = (e) => {
    const newYear = e.target.value;
    setFilterAno(newYear);
    if (!newYear) {
      setFilterMes('');
      setFiltersReady(true);
      return;
    }
    setFilterMes('');
    setFiltersReady(true);
    pageRef.current = 1;
  };

  const handleMesChange = (e) => {
    setFilterMes(e.target.value);
    setFiltersReady(true);
    pageRef.current = 1;
  };

  const openReportModal = () => {
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
  };

  const downloadReportPPTHandler = async () => {
    if (!reportMonth) {
      alert('⚠️ Por favor selecciona un mes');
      return;
    }

    try {
      setIsDownloading(true);
      const response = await downloadReportPPT({ 
        month: reportMonth,
        useBase: reportMethod === 'base' ? 'true' : 'false'
      });
      
      // Crear un link y descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_vallas_${reportMonth}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // console.log('✅ PPT descargado exitosamente');
      alert('✅ Reporte PPT descargado correctamente');
      closeReportModal();
    } catch (error) {
      console.error('❌ Error descargando PPT:', error);
      let errorMsg = 'Error al descargar el PPT';
      
      if (error.response?.data?.hint) {
        errorMsg += `\n\n💡 ${error.response.data.hint}`;
      } else if (error.response?.data?.error) {
        errorMsg += `\n${error.response.data.error}`;
      } else {
        errorMsg += `\n${error.message}`;
      }
      
      alert(errorMsg);
    } finally {
      setIsDownloading(false);
    }
  };



  // Manejar selección de tarjetas
  const toggleCardSelection = (recordId) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  // Seleccionar/deseleccionar todas
  const toggleSelectAll = () => {
    if (areAllVisibleSelected) {
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        visibleRecords.forEach(record => newSet.delete(record.id));
        return newSet;
      });
      return;
    }

    setSelectedCards(prev => {
      const newSet = new Set(prev);
      visibleRecords.forEach(record => newSet.add(record.id));
      return newSet;
    });
  };

  // Abrir modal de confirmación para eliminar
  const openDeleteConfirmModal = () => {
    if (selectedCards.size === 0) {
      alert('Selecciona al menos una tarjeta para eliminar');
      return;
    }
    setDeleteConfirmText('');
    setShowDeleteConfirmModal(true);
  };

  // Cerrar modal de confirmación
  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setDeleteConfirmText('');
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DEL') {
      alert('Debes escribir "DEL" para confirmar la eliminación');
      return;
    }

    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedCards);
      // console.log(`🗑️  Eliminando ${idsToDelete.length} registros...`);

      // Eliminar uno por uno
      const results = await Promise.all(
        idsToDelete.map(id =>
          deleteRecord(id)
            .then(() => ({ id, success: true }))
            .catch(err => ({ id, success: false, error: err.message }))
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      let message = `✅ ${successful.length} registro(s) eliminado(s) correctamente`;
      if (failed.length > 0) {
        message += `\n⚠️  ${failed.length} no se pudieron eliminar`;
      }
      alert(message);

      // Limpiar selección
      setSelectedCards(new Set());
      closeDeleteConfirmModal();

      // Recargar datos
      pageRef.current = 1;
      loadPage(1, false);
    } catch (error) {
      console.error('Error eliminando registros:', error);
      alert('❌ Error al eliminar los registros');
    } finally {
      setIsDeleting(false);
    }
  };



  // Función para parsear fechas en formato DD/MM/YYYY o D/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    
    // Si ya es una fecha válida ISO
    if (dateStr.includes('-')) {
      return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    // Parsear formato DD/MM/YYYY o D/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    
    return dateStr;
  };

  const handleRefresh = useCallback(() => {
    // console.log('🔄 [REFRESH] Recargando registros...');
    pageRef.current = 1;
    setRecords([]);
    setRecordsPagination({ page: 1, limit: 30, total: 0, totalPages: 0, hasMore: false });
    setHasMorePages(true);
    loadPage(1, false);
  }, [loadPage]);

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={() => loadPage(1, false)} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <div className="empty-container">
        <p>📭 No hay registros aún</p>
        <p>Crea el primer registro en la sección "Nuevo Registro"</p>
      </div>
    );
  }

  return (
    <div className="ooh-list-container">
      <div className="list-header">
        <h2>Registros OOH ({records.length} de {totalCount}){hasMoreRecords && ' ... cargando más'}</h2>
        <div className="header-buttons">
          {selectedCards.size > 0 && (
            <>
              <span className="selected-count">
                {selectedCards.size} seleccionado(s)
              </span>
              <button 
                onClick={toggleSelectAll} 
                className="btn-secondary"
                title="Seleccionar/deseleccionar todos"
              >
                {areAllVisibleSelected ? '✓ Deseleccionar' : '☐ Seleccionar todo'}
              </button>
              <button 
                onClick={openDeleteConfirmModal} 
                className="btn-danger"
                disabled={isDeleting}
                title="Eliminar registros seleccionados"
              >
                🗑️ Eliminar ({selectedCards.size})
              </button>
            </>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
            className="btn-secondary"
            title="Cambiar vista"
          >
            {viewMode === 'cards' ? '🗂️ Ver tabla' : '🖼️ Ver tarjetas'}
          </button>
          <button onClick={openReportModal} className="report-btn" title="Generar Reporte PPT de VALLAS">
            📄 Generar Reporte PPT
          </button>
          <button onClick={handleRefresh} className="refresh-btn" disabled={isFetchingMore}>
            {isFetchingMore ? '⏳ Actualizando...' : '🔄 Actualizar'}
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Buscar por dirección..."
            value={searchDireccion}
            onChange={(e) => setSearchDireccion(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <select 
            value={filterAno} 
            onChange={handleAnoChange}
            className="filter-select"
            title="Filtrar por año"
          >
            <option value="">Todos los años</option>
            {availablePeriods.years.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>

          <select 
            value={filterMes} 
            onChange={handleMesChange}
            className="filter-select"
            title="Filtrar por mes"
          >
            <option value="">Todos los meses</option>
            {filterAno && availablePeriods.periodsByYear[filterAno] ? (
              availablePeriods.periodsByYear[filterAno].map((mes) => {
                const mesesLabel = {
                  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
                  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
                  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
                };
                return (
                  <option key={mes} value={mes}>{mesesLabel[mes]}</option>
                );
              })
            ) : null}
          </select>

          <select 
            value={filterMarca} 
            onChange={(e) => setFilterMarca(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las marcas</option>
            {marcas.map((marca, idx) => (
              <option key={idx} value={marca}>{marca}</option>
            ))}
          </select>

          <select 
            value={filterCampana} 
            onChange={(e) => setFilterCampana(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas las campañas</option>
            {campanas.map((campana, idx) => (
              <option key={idx} value={campana}>{campana}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
            placeholder="Fecha inicio desde"
            className="filter-date"
            title="Fecha inicio desde"
          />

          <input
            type="date"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
            placeholder="Fecha fin hasta"
            className="filter-date"
            title="Fecha fin hasta"
          />

          <button onClick={clearFilters} className="clear-filters-btn">
            ✖️ Limpiar
          </button>
        </div>
      </div>

      {displayData.length === 0 ? (
        <div className="no-results">
          <p>🔍 No se encontraron registros con los filtros aplicados</p>
          <button onClick={clearFilters} className="btn-secondary">
            Limpiar filtros
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <RecordTableView
          displayData={displayData}
          records={records}
          recordsPagination={recordsPagination}
          hasTextFilters={hasTextFilters}
          hasMoreRecords={hasMoreRecords}
          loadMoreRef={loadMoreRef}
          openModal={openModal}
          formatDate={formatDate}
          handleCheckInTable={handleCheckInTable}
          checkingStates={checkingStates}
          skeletonCount={Math.max(0, (recordsPagination?.total || 0) - records.length)}
        />
      ) : (
        <RecordCardsView
          displayData={displayData}
          records={records}
          recordsPagination={recordsPagination}
          hasTextFilters={hasTextFilters}
          hasMoreRecords={hasMoreRecords}
          loadMoreRef={loadMoreRef}
          openModal={openModal}
          formatDate={formatDate}
          resolveImageUrl={resolveImageUrl}
          LazyImage={LazyImage}
          toggleCardSelection={toggleCardSelection}
          handleCheckedChange={handleCheckedChange}
          selectedCards={selectedCards}
          skeletonCount={Math.max(0, (recordsPagination?.total || 0) - records.length)}
        />
      )}

      {/* Modal de detalles */}
      {showModal && selectedRecord && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecord.marca} - {selectedRecord.campana}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Imagen principal */}
              {resolveImageUrl(selectedRecord.imagen_1) && (
                <div className="modal-image">
                  <LazyImage
                    src={resolveImageUrl(selectedRecord.imagen_1)}
                    alt={`${selectedRecord.marca} - ${selectedRecord.campana}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="300"%3E%3Crect fill="%23ddd" width="100%25" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ESin imagen%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}

              {/* Detalles del registro */}
              <div className="modal-details">
                <div className="detail-row">
                  <strong>ID:</strong>
                  <span>{selectedRecord.id}</span>
                </div>
                <div className="detail-row">
                  <strong>Marca:</strong>
                  <span>{selectedRecord.marca}</span>
                </div>
                <div className="detail-row">
                  <strong>Campaña:</strong>
                  <span>{selectedRecord.campana}</span>
                </div>
                <div className="detail-row">
                  <strong>Categoría:</strong>
                  <span>{selectedRecord.categoria}</span>
                </div>
                <div className="detail-row">
                  <strong>Proveedor:</strong>
                  <span>{selectedRecord.proveedor}</span>
                </div>
                <div className="detail-row">
                  <strong>Dirección:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.direccion} 
                      onChange={(e) => handleEditChange('direccion', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.direccion}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Ciudad:</strong>
                  <span>{selectedRecord.ciudad}</span>
                </div>
                <div className="detail-row">
                  <strong>Región:</strong>
                  <span>{selectedRecord.ciudad_region || selectedRecord.region}</span>
                </div>
                <div className="detail-row">
                  <strong>Coordenadas:</strong>
                  <span>{selectedRecord.latitud},{selectedRecord.longitud}</span>
                </div>

                {/* Mapa de ubicación */}
                {selectedRecord.latitud && selectedRecord.longitud && (
                  <div className="detail-row-full">
                    <strong>📍 Ubicación en el mapa:</strong>
                    <MapPicker
                      latitude={selectedRecord.latitud}
                      longitude={selectedRecord.longitud}
                      onLocationChange={null}
                      editable={false}
                      height="250px"
                      zoom={15}
                      showCoordinates={true}
                    />
                  </div>
                )}

                <div className="detail-row">
                  <strong>Fecha Inicio:</strong>
                  {editMode ? (
                    <input 
                      type="date" 
                      value={editData.fechaInicio} 
                      onChange={(e) => handleEditChange('fechaInicio', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{formatDate(selectedRecord.fecha_inicio)}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Fecha Fin:</strong>
                  {editMode ? (
                    <input 
                      type="date" 
                      value={editData.fechaFin} 
                      onChange={(e) => handleEditChange('fechaFin', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{formatDate(selectedRecord.fecha_final)}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Fotos:</strong>
                  <span>{[selectedRecord.imagen_1, selectedRecord.imagen_2, selectedRecord.imagen_3].filter(Boolean).length}</span>
                </div>
                <div className="detail-row">
                  <strong>Tipo OOH:</strong>
                  <span>{selectedRecord.tipo_ooh}</span>
                </div>
                {selectedRecord.review_required && (
                  <div className="detail-row review-warning">
                    <strong>⚠️ REQUIERE REVISIÓN:</strong>
                    <span>{selectedRecord.review_reason}</span>
                  </div>
                )}
              </div>

              {/* Galería de imágenes - Las 3 imágenes */}
              <div className="modal-gallery">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3>📸 Todas las imágenes ({[selectedRecord.imagen_1, selectedRecord.imagen_2, selectedRecord.imagen_3].filter(Boolean).length}/3)</h3>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={openImagesModal}
                  >
                    ➕ Ver más fotos
                  </button>
                </div>
                
                <div className="gallery-grid">
                  {[
                    { url: selectedRecord.imagen_1, num: 1 },
                    { url: selectedRecord.imagen_2, num: 2 },
                    { url: selectedRecord.imagen_3, num: 3 }
                  ].map((item, idx) => (
                    <div key={idx} className={`gallery-item ${!item.url ? 'empty' : ''}`}>
                      {item.url ? (
                        <>
                          <LazyImage
                            src={resolveImageUrl(item.url)}
                            alt={`Foto ${item.num}`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="200"%3E%3Crect fill="%23ddd" width="100%25" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div className="gallery-item-label">Foto {item.num}</div>
                          {editMode && (
                            <div className="replace-control">
                              <label className="upload-btn-modal">
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleImageChangeSlot(item.num, e.target.files)}
                                />
                                Cambiar esta foto
                              </label>
                              {imageReplacements[item.num] && (
                                <small>
                                  Nuevo: {imageReplacements[item.num].name}
                                </small>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="gallery-placeholder">
                          <span>📷 Foto {item.num}</span>
                          <small>No disponible</small>
                          {editMode && (
                            <div className="replace-control" style={{ marginTop: '8px' }}>
                              <label className="upload-btn-modal">
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleImageChangeSlot(item.num, e.target.files)}
                                />
                                Subir foto {item.num}
                              </label>
                              {imageReplacements[item.num] && (
                                <small style={{ display: 'block', marginTop: '6px', color: '#666' }}>
                                  Nuevo: {imageReplacements[item.num].name}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {!editMode ? (
                <>
                  <div className="footer-right">
                    <button className="modal-btn btn-edit" onClick={() => setEditMode(true)}>
                      ✏️ Editar
                    </button>
                    <button className="modal-btn btn-cancel" onClick={closeModal}>Cerrar</button>
                  </div>
                </>
              ) : (
                <>
                  <button className="modal-btn btn-save" onClick={saveChanges}>
                    💾 Guardar
                  </button>
                  <button className="modal-btn btn-cancel" onClick={() => { setEditMode(false); setImageReplacements({}); }}>
                    ❌ Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showImagesModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowImagesModal(false)}>
          <div className="modal-content" style={{ maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📸 Gestionar Imágenes - {selectedRecord.marca} - {selectedRecord.campana}</h2>
              <button className="modal-close" onClick={() => setShowImagesModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {imagesError && (
                <div 
                  style={{ 
                    padding: '10px', 
                    marginBottom: '12px', 
                    borderRadius: '4px',
                    backgroundColor: imagesError.startsWith('✅') ? '#d4edda' : '#f8d7da',
                    color: imagesError.startsWith('✅') ? '#155724' : '#721c24',
                    border: `1px solid ${imagesError.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
                    fontSize: '14px'
                  }}
                >
                  {imagesError}
                </div>
              )}

              {/* PARTE 1: 3 BOXES PRINCIPALES */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>📌 Imágenes Principales (1, 2, 3)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  {[1, 2, 3].map(slot => {
                    const assignedImage = getAssignedImage(slot);
                    const existingImage = recordImages.find(img => img.role === 'primary' && img.slot === slot);
                    const displayImage = assignedImage || existingImage;
                    
                    return (
                      <div 
                        key={slot}
                        onClick={() => {}}
                        style={{
                          border: assignedImage ? '3px solid #007bff' : '2px dashed #ccc',
                          borderRadius: '8px',
                          padding: '10px',
                          backgroundColor: assignedImage ? '#e7f3ff' : '#f9f9f9',
                          minHeight: '180px',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', fontSize: '18px' }}>
                          #{slot}
                        </div>

                        {displayImage && (
                          <div style={{ flex: 1, marginBottom: '8px', position: 'relative' }}>
                            <img
                              src={assignedImage ? assignedImage.preview : resolveImageUrl(existingImage.ruta)}
                              alt={`Slot ${slot}`}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'cover',
                                borderRadius: '4px'
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="120"%3E%3Crect fill="%23ddd" width="100%25" height="120"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ESin imagen%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            {assignedImage && (
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                backgroundColor: '#ff6b00',
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                zIndex: 10
                              }}
                              onClick={() => assignImageToBox(slot, assignedImage.id)}
                              >
                                ✕
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: '#666', wordBreak: 'break-word' }}>
                          {assignedImage ? (
                            <>
                              📝 {assignedImage.file.name.substring(0, 20)}...
                              <div style={{ fontSize: '10px', marginTop: '2px', color: '#ff6b00' }}>
                                (Click ✕ para desasignar)
                              </div>
                            </>
                          ) : (
                            'Selecciona del caché →'
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PARTE 2: CACHÉ DE IMÁGENES CARGADAS */}
              {cachedImages.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>
                    📦 Caché ({cachedImages.length} imagen/es - Click para asignar a box)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '6px',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {cachedImages.map(img => {
                      const assignedSlot = Object.entries(boxAssignments).find(([_, id]) => id === img.id)?.[0];
                      return (
                        <div
                          key={img.id}
                          onClick={() => {
                            // Buscar slot vacío
                            const emptySlot = [1, 2, 3].find(s => !boxAssignments[s]);
                            if (emptySlot) {
                              assignImageToBox(emptySlot, img.id);
                            } else {
                              setImagesError('❌ Los 3 boxes ya están asignados');
                            }
                          }}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: assignedSlot ? `2px solid #007bff` : '1px solid #ccc',
                            transform: assignedSlot ? 'scale(0.95)' : 'scale(1)',
                            opacity: assignedSlot ? 0.7 : 1
                          }}
                          title={img.file.name}
                        >
                          <img
                            src={img.preview}
                            alt="cache"
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'cover'
                            }}
                          />
                          {assignedSlot && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,123,255,0.8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '16px'
                            }}>
                              #{assignedSlot}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PARTE 3: DRAG & DROP INFERIOR */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>📤 Cargar Imágenes</h3>
                <div
                  onDragOver={handleDragOverDropZone}
                  onDragLeave={handleDragLeaveDropZone}
                  onDrop={handleDropImages}
                  style={{
                    border: `2px dashed ${isDraggingOverDropZone ? '#007bff' : '#ccc'}`,
                    borderRadius: '8px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    backgroundColor: isDraggingOverDropZone ? '#f0f8ff' : '#fafafa',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>
                    {isDraggingOverDropZone ? '📂' : '🖼️'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {isDraggingOverDropZone ? '¡Suelta aquí!' : 'Arrastra imágenes o carpetas'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    Soporta múltiples archivos y carpetas completas
                  </div>
                </div>
              </div>

              {/* PARTE 4: BOTÓN GUARDAR */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  onClick={handleSaveAllImages}
                  disabled={imagesUploading || cachedImages.length === 0}
                  style={{
                    padding: '12px 40px',
                    backgroundColor: (imagesUploading || cachedImages.length === 0) ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (imagesUploading || cachedImages.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {imagesUploading ? '⏳ Guardando...' : `💾 Guardar ${cachedImages.length} Imagen/es`}
                </button>
              </div>

              {/* PARTE 5: IMÁGENES EXISTENTES */}
              {imagesLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  ⏳ Cargando imágenes existentes...
                </div>
              ) : (
                recordImages.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>📂 Imágenes Existentes ({recordImages.length})</h3>
                    <div className="gallery-grid">
                      {recordImages.map((img) => (
                        <div key={img.id} className="gallery-item">
                          <LazyImage
                            src={resolveImageUrl(img.ruta)}
                            alt={`Imagen ${img.id}`}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="200"%3E%3Crect fill="%23ddd" width="100%25" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <div style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                            {img.role === 'primary' ? (
                              <span style={{ color: '#007bff', fontWeight: 'bold' }}>
                                ⭐ Principal #{img.slot}
                              </span>
                            ) : (
                              <span style={{ color: '#28a745' }}>
                                🖼️ Galería
                              </span>
                            )}
                            <br />
                            <span style={{ fontSize: '10px' }}>{img.created_at}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Reporte PPT */}
      {showReportModal && (
        <div className="modal-overlay" onClick={closeReportModal}>
          <div className="modal-content-report" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Generar Reporte PPT - VALLAS</h3>
              <button className="modal-close" onClick={closeReportModal}>✖</button>
            </div>

            <div className="modal-body-report">
              <div className="report-config-section">
                <label className="report-label">
                  📅 Mes del Reporte:
                  <input 
                    type="month" 
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="report-month-input"
                  />
                </label>
                <small className="report-hint">
                  Filtra VALLAS por fecha de inicio o fin dentro del mes seleccionado
                </small>
              </div>

              <div className="report-config-section">
                <label className="report-label">
                  🎨 Método de Generación:
                </label>
                <div className="report-method-options">
                  <label className="report-radio-option">
                    <input 
                      type="radio" 
                      name="reportMethod" 
                      value="base"
                      checked={reportMethod === 'base'}
                      onChange={(e) => setReportMethod(e.target.value)}
                    />
                    <div className="report-radio-label">
                      <strong>Con Archivo Base</strong>
                      <small>Usa "REPORTE FACTURACIÓN BASE.pptx" como plantilla</small>
                      <small style={{ color: '#666' }}>Requiere: python-pptx instalado</small>
                    </div>
                  </label>

                  <label className="report-radio-option">
                    <input 
                      type="radio" 
                      name="reportMethod" 
                      value="scratch"
                      checked={reportMethod === 'scratch'}
                      onChange={(e) => setReportMethod(e.target.value)}
                    />
                    <div className="report-radio-label">
                      <strong>Desde Cero</strong>
                      <small>Genera PPT con PptxGenJS (solo Node.js)</small>
                      <small style={{ color: '#666' }}>No requiere Python</small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="report-info-box">
                <strong>ℹ️ Información:</strong>
                <ul>
                  <li>Solo se incluyen registros con Tipo_OOH = "VALLA"</li>
                  <li>Cada VALLA genera un slide con: Dirección, Ciudad, 3 imágenes, Vigencia, Proveedor</li>
                  <li>El archivo se descargará automáticamente al generarse</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={closeReportModal} 
                className="modal-btn-cancel"
                disabled={isDownloading}
              >
                Cancelar
              </button>
              <button 
                onClick={downloadReportPPTHandler} 
                className="modal-btn-save"
                disabled={isDownloading || !reportMonth}
              >
                {isDownloading ? '⏳ Generando...' : '📥 Generar y Descargar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirmModal && (
        <div className="modal-overlay" onClick={closeDeleteConfirmModal}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirmar eliminación</h2>
              <button className="modal-close" onClick={closeDeleteConfirmModal}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '20px', fontSize: '16px' }}>
                Estás a punto de eliminar <strong>{selectedCards.size} registro(s)</strong>.
              </p>
              <p style={{ marginBottom: '20px', color: '#d32f2f', fontWeight: 'bold' }}>
                ⚠️ Esta acción es irreversible
              </p>
              <p style={{ marginBottom: '20px' }}>
                Para confirmar, escribe <strong>"DEL"</strong> en el campo:
              </p>
              
              <input
                type="text"
                placeholder='Escribe "DEL" para confirmar'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && deleteConfirmText === 'DEL' && confirmDelete()}
                className="delete-confirm-input"
                autoFocus
              />
            </div>

            <div className="modal-footer">
              <button 
                className="modal-btn btn-cancel"
                onClick={closeDeleteConfirmModal}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting || deleteConfirmText.toUpperCase() !== 'DEL'}
              >
                {isDeleting ? '⏳ Eliminando...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datalist de tipos OOH disponibles */}
      <datalist id="tiposOOH">
        <option value="VAYA" />
        <option value="PARADEROS" />
        <option value="VAYAS MOTORIZADAS" />
        <option value="CAJITAS DE LUZ" />
        <option value="PRODUCCIÓN" />
      </datalist>
    </div>
  );
};

export default OOHList;
