import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import './OOHList.css';
import { useApp } from '../context/AppContext';
import dbService from '../services/dbService';
import RecordCard from './RecordCard';

const OOHList = ({ refreshTrigger }) => {
  const PAGE_SIZE = 20;
  const PREFETCH_MARGIN_PX = 6000; // Cargar mucho antes de llegar al final

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

  const { 
    records, 
    setRecords,
    fetchRecords, 
    recordsPagination,
    setRecordsPagination,
    loading: contextLoading,
    brands,
    campaigns: campaignsList,
    cities: citiesList,
    oohTypes: oohTypesList,
    providers: providersList
  } = useApp();
  
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
  
  // Cargar períodos disponibles al montar
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/ooh/periods/available');
        if (res.data.success) {
          setAvailablePeriods(res.data.data);
          if (res.data.data.years.length > 0) {
            const now = new Date();
            const currentYear = now.getFullYear().toString();
            const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
            const years = res.data.data.years.map(String);
            const hasCurrentYear = years.includes(currentYear);
            const defaultYear = hasCurrentYear ? currentYear : years[0];
            setFilterAno(defaultYear);
            const monthsForYear = res.data.data.periodsByYear[defaultYear] || [];
            const defaultMonth = monthsForYear.includes(currentMonth)
              ? currentMonth
              : monthsForYear[monthsForYear.length - 1];
            if (defaultMonth) {
              setFilterMes(defaultMonth);
            }
            setFiltersReady(true);
          } else {
            setFiltersReady(true);
          }
        }
      } catch (error) {
        console.error('Error cargando períodos disponibles:', error);
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
    if (!monthsForYear.includes(filterMes)) {
      setFilterMes(monthsForYear[monthsForYear.length - 1]);
    }
  }, [filterAno, filterMes, availablePeriods.periodsByYear]);
  
  // Modal de detalles
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSyncingBQ, setIsSyncingBQ] = useState(false);
  const [syncStatus, setSyncStatus] = useState({});
  const [imageReplacements, setImageReplacements] = useState({});
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [recordImages, setRecordImages] = useState([]);
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState(null);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [imagesSaving, setImagesSaving] = useState(false);
  
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

  const getMaxPrimaryCount = useCallback((record) => {
    if (!record) return 3;
    const tipo = String(record.tipo_ooh || '').toUpperCase();
    if (tipo.includes('CAJA') || tipo.includes('LUZ')) return 12;
    return 3;
  }, []);

  const openImagesModal = useCallback(async () => {
    if (!selectedRecord) return;
    setShowImagesModal(true);
    setImagesLoading(true);
    setImagesError(null);
    try {
      const res = await axios.get(`http://localhost:8080/api/ooh/${selectedRecord.id}/images`);
      const images = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecordImages(images);

      const primaryIds = images
        .filter(img => img.role === 'primary')
        .sort((a, b) => (a.slot || 0) - (b.slot || 0))
        .map(img => img.id);
      setSelectedImageIds(primaryIds);
    } catch (err) {
      setImagesError(err.response?.data?.error || err.message || 'Error cargando imágenes');
    } finally {
      setImagesLoading(false);
    }
  }, [selectedRecord]);

  const handleUploadMoreImages = async (files) => {
    if (!selectedRecord || !files || files.length === 0) return;
    setImagesUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('imagenes', file));
      const res = await axios.post(`http://localhost:8080/api/ooh/${selectedRecord.id}/images/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const images = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecordImages(images);
    } catch (err) {
      setImagesError(err.response?.data?.error || err.message || 'Error subiendo imágenes');
    } finally {
      setImagesUploading(false);
    }
  };

  const handleSavePrimaryImages = async () => {
    if (!selectedRecord) return;
    setImagesSaving(true);
    try {
      const selections = selectedImageIds.map((id, idx) => ({ id, slot: idx + 1 }));
      const res = await axios.patch(`http://localhost:8080/api/ooh/${selectedRecord.id}/images/roles`, {
        selections
      });
      const images = Array.isArray(res.data?.data) ? res.data.data : [];
      setRecordImages(images);

      const primary = images
        .filter(img => img.role === 'primary')
        .sort((a, b) => (a.slot || 0) - (b.slot || 0))
        .map(img => img.ruta);

      setSelectedRecord(prev => ({
        ...prev,
        imagen_1: primary[0] || prev.imagen_1,
        imagen_2: primary[1] || prev.imagen_2,
        imagen_3: primary[2] || prev.imagen_3
      }));
    } catch (err) {
      setImagesError(err.response?.data?.error || err.message || 'Error guardando selección');
    } finally {
      setImagesSaving(false);
    }
  };

  // Manejar el toggle de check en tabla
  const handleCheckInTable = useCallback(async (e, recordId, currentCheckedState) => {
    e.stopPropagation();
    setCheckingStates(prev => ({ ...prev, [recordId]: true }));
    try {
      const newCheckedState = !currentCheckedState;
      const response = await axios.patch(
        `http://localhost:8080/api/ooh/${recordId}/check`,
        { checked: newCheckedState }
      );
      if (response.data.success) {
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

      // http/https directo - agregar cache-busting parameter
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        // Agregar timestamp para evitar caché del navegador
        const separator = val.includes('?') ? '&' : '?';
        return `${val}${separator}v=${Date.now()}`;
      }

      // Windows absoluta con backslashes
      if (/^[a-z]:\\/i.test(val) || val.includes('\\')) {
        // Buscar "local-images" en el path (insensible a mayúsculas)
        const regex = /local-images[\\/]/i;
        const match = val.match(regex);
        if (match) {
          const startIndex = val.indexOf(match[0]) + match[0].length;
          const rel = val.substring(startIndex).replace(/\\/g, '/');
          return `http://localhost:8080/api/images/${encodeURI(rel)}?v=${Date.now()}`;
        }
        // Si no tiene local-images, tomar solo el filename como fallback
        const filename = val.split(/[/\\]/).pop();
        return filename ? `http://localhost:8080/api/images/${encodeURI(filename)}?v=${Date.now()}` : null;
      }

      // Unix absoluta
      if (val.startsWith('/')) {
        const parts = val.split(/local-images/i);
        if (parts.length > 1) {
          const rel = parts[1].replace(/^\//, '');
          return `http://localhost:8080/api/images/${encodeURI(rel)}?v=${Date.now()}`;
        }
      }

      // Ruta relativa de API
      if (val.startsWith('/api/images')) {
        return `http://localhost:8080${encodeURI(val)}?v=${Date.now()}`;
      }

      return val;
    };

  const loadPage = useCallback(async (page, append = false) => {
    setIsFetchingMore(true);
    try {
      const params = { append };
      if (filterAno && filterMes) {
        params.mes = `${filterAno}-${filterMes}`;
      } else if (filterAno && !filterMes) {
        params.ano = filterAno;
      }
      const result = await fetchRecords(page, PAGE_SIZE, params);
      setHasMorePages(!!result?.pagination?.hasMore);
      pageRef.current = page;
      return result;
    } finally {
      setIsFetchingMore(false);
    }
  }, [fetchRecords, PAGE_SIZE, filterAno, filterMes]);

  useEffect(() => {
    if (!filtersReady) return;
    if (filterAno) {
      const monthsForYear = availablePeriods.periodsByYear[filterAno] || [];
      if (monthsForYear.length > 0 && filterMes && !monthsForYear.includes(filterMes)) return;
    }
    pageRef.current = 1;
    setRecords([]);
    setRecordsPagination({ page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false });
    loadPage(1, false);
  }, [loadPage, refreshTrigger, filterAno, filterMes, filtersReady, availablePeriods.periodsByYear, setRecords, setRecordsPagination]);

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

  const hasActiveFilters = !!(searchDireccion || filterMarca || filterCampana || filterFechaInicio || filterFechaFin);
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
    if (hasActiveFilters) return 0;
    const total = recordsPagination?.total || loadedRecords.length || 0;
    return Math.max(total - loadedRecords.length, 0);
  }, [hasActiveFilters, recordsPagination?.total, loadedRecords.length]);

  const hasMoreRecords = !hasActiveFilters && (hasMorePages || isFetchingMore);
  const areAllVisibleSelected = useMemo(() => {
    if (visibleRecords.length === 0) return false;
    return visibleRecords.every(record => selectedCards.has(record.id));
  }, [visibleRecords, selectedCards]);

  const totalCount = useMemo(() => {
    if (hasActiveFilters) {
      return displayData.length;
    }
    const total = recordsPagination?.total ?? 0;
    return total;
  }, [hasActiveFilters, displayData.length, recordsPagination?.total]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (hasActiveFilters) return;
        if (isFetchingMore || !hasMorePages) return;

        const nextPage = pageRef.current + 1;
        loadPage(nextPage, true);
      },
      {
        root: null,
        rootMargin: `${PREFETCH_MARGIN_PX}px`,
        threshold: 0.1
      }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [PREFETCH_MARGIN_PX, hasActiveFilters, hasMorePages, isFetchingMore, loadPage]);

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
    const monthsForYear = availablePeriods.periodsByYear[newYear] || [];
    const lastMonth = monthsForYear[monthsForYear.length - 1] || '';
    setFilterMes(lastMonth);
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

  const downloadReportPPT = async () => {
    if (!reportMonth) {
      alert('⚠️ Por favor selecciona un mes');
      return;
    }

    try {
      setIsDownloading(true);
      console.log(`📥 Descargando PPT de VAYAS para ${reportMonth}...`);
      console.log(`   Método: ${reportMethod === 'base' ? 'Con archivo base (Python)' : 'Desde cero (PptxGenJS)'}`);
      
      const response = await axios.get('http://localhost:8080/api/ooh/report/ppt', {
        params: { 
          month: reportMonth,
          useBase: reportMethod === 'base' ? 'true' : 'false'
        },
        responseType: 'blob',
        timeout: 60000 // 60 segundos de timeout
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
      
      console.log('✅ PPT descargado exitosamente');
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

  const openModal = (record) => {
    setSelectedRecord(record);
    setEditData({
      id: record.id,
      marca: record.marca,
      categoria: record.categoria,
      proveedor: record.proveedor,
      campana: record.campana,
      direccion: record.direccion,
      ciudad: record.ciudad,
      region: record.ciudad_region || record.region,
      latitud: record.latitud,
      longitud: record.longitud,
      fechaInicio: record.fecha_inicio,
      fechaFin: record.fecha_final,
      tipoOOH: record.tipo_ooh
    });
    setEditMode(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setEditMode(false);
    setEditData({});
    setImageReplacements({});
    setIsSyncingBQ(false);
  };

  // Sincronizar registro individual a BigQuery
  const syncToBigQuery = async () => {
    if (!selectedRecord?.id) {
      alert('⚠️ No hay registro seleccionado');
      return;
    }

    setIsSyncingBQ(true);
    try {
      const response = await axios.post(
        `http://localhost:8080/api/ooh/${selectedRecord.id}/sync-bigquery`
      );

      if (response.data.success) {
        setSyncStatus(prev => ({
          ...prev,
          [selectedRecord.id]: {
            synced: true,
            syncedAt: response.data.data.synced_to_bigquery
          }
        }));
        alert('✅ Registro sincronizado a BigQuery exitosamente');
        // Actualizar el registro en la lista
        setSelectedRecord(prev => ({
          ...prev,
          synced_to_bigquery: response.data.data.synced_to_bigquery,
          bq_sync_status: 'synced'
        }));
      } else {
        alert(`❌ Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error sincronizando a BigQuery:', error);
      alert(`❌ Error al sincronizar: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSyncingBQ(false);
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
      console.log(`🗑️  Eliminando ${idsToDelete.length} registros...`);

      // Eliminar uno por uno
      const results = await Promise.all(
        idsToDelete.map(id =>
          axios
            .delete(`http://localhost:8080/api/ooh/${id}`)
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

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChangeSlot = (slot, fileList) => {
    const file = fileList && fileList[0];
    if (!file) return;
    setImageReplacements(prev => ({ ...prev, [slot]: file }));
  };

  const saveChanges = async () => {
    try {
      console.log('🔄 [OOHLIST - ACTUALIZAR] Editando registro existente ID:', editData.id);
      console.log('📝 Datos actuales:', editData);
      
      // ✅ NUEVO: Obtener IDs desde AppContext (no enviar nombres)
      console.log('🔍 [ACTUALIZAR] Mapeando nombres a IDs...');
      
      const brand = await dbService.getBrandByName(editData.marca, brands);
      const city = await dbService.getCityByName(editData.ciudad, citiesList);
      const oohType = await dbService.getOOHTypeByName(editData.tipoOOH, oohTypesList);
      const provider = await dbService.getProviderByName(editData.proveedor, providersList);
      const campaign = await dbService.getCampaignByName(editData.campana, campaignsList);
      
      console.log('📊 [ACTUALIZAR] IDs obtenidos:');
      console.log(`   brand_id: ${brand?.id} (${editData.marca})`);
      console.log(`   city_id: ${city?.id} (${editData.ciudad})`);
      console.log(`   ooh_type_id: ${oohType?.id} (${editData.tipoOOH})`);
      console.log(`   provider_id: ${provider?.id} (${editData.proveedor})`);
      console.log(`   campaign_id: ${campaign?.id} (${editData.campana})`);
      
      // Validar que se obtuvieron todos los IDs
      if (!brand?.id || !city?.id || !oohType?.id || !provider?.id || !campaign?.id) {
        const missing = [];
        if (!brand?.id) missing.push(`marca "${editData.marca}"`);
        if (!city?.id) missing.push(`ciudad "${editData.ciudad}"`);
        if (!oohType?.id) missing.push(`tipo OOH "${editData.tipoOOH}"`);
        if (!provider?.id) missing.push(`proveedor "${editData.proveedor}"`);
        if (!campaign?.id) missing.push(`campaña "${editData.campana}"`);
        
        alert(`❌ No se encontraron: ${missing.join(', ')}. Verifica los datos ingresados.`);
        return;
      }
      
      // Preparar FormData para enviar con IDs (no nombres)
      const formData = new FormData();
      formData.append('existingId', editData.id); // ← ESTO INDICA AL BACKEND QUE ES UPDATE
      
      // ✅ ENVIAR IDs en lugar de nombres
      formData.append('brand_id', brand.id);
      formData.append('campaign_id', campaign.id);
      formData.append('city_id', city.id);
      formData.append('ooh_type_id', oohType.id);
      formData.append('provider_id', provider.id);
      
      // ✅ CAMPOS COMUNES (sin nombres)
      formData.append('direccion', editData.direccion);
      formData.append('latitud', editData.latitud);
      formData.append('longitud', editData.longitud);
      formData.append('fechaInicio', editData.fechaInicio);
      formData.append('fechaFin', editData.fechaFin);

      // Agregar nuevas imágenes si se seleccionaron (por slot)
      const slots = Object.keys(imageReplacements);
      if (slots.length > 0) {
        console.log(`🖼️ [ACTUALIZAR] Reemplazando ${slots.length} imagen(es) en slots:`, slots);
        formData.append('imageIndexes', slots.join(',')); // slots en base 1
        slots.forEach(slot => {
          formData.append('imagenes', imageReplacements[slot]);
        });
      } else {
        console.log('🖼️ [ACTUALIZAR] Sin cambios de imágenes');
      }

      console.log('📤 [ACTUALIZAR] Enviando a POST /api/ooh/create con existingId...');
      const response = await axios.post('http://localhost:8080/api/ooh/create', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        console.log('✅ [ACTUALIZAR] Registro actualizado exitosamente:', response.data);
        alert('✅ Registro actualizado correctamente');
        setEditMode(false);
        pageRef.current = 1;
        loadPage(1, false); // Recargar datos
        closeModal();
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      alert('❌ Error al guardar los cambios');
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

  if (contextLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando registros...</p>
      </div>
    );
  }

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
        <h2>Registros OOH ({visibleRecords.length} de {totalCount})</h2>
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
          <button onClick={fetchRecords} className="refresh-btn">
            🔄 Actualizar
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
        <div className="records-table-wrapper">
          <table className="records-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Campaña</th>
                <th>Categoría</th>
                <th>Ciudad</th>
                <th>Dirección</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Tipo OOH</th>
                <th>Proveedor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadedRecords.map((record) => (
                <tr key={record.id} className="records-table-row" onClick={() => openModal(record)}>
                  <td>{record.marca || '-'}</td>
                  <td>{record.campana || '-'}</td>
                  <td>{record.categoria || '-'}</td>
                  <td>{record.ciudad || '-'}</td>
                  <td>{record.direccion || '-'}</td>
                  <td>{formatDate(record.fecha_inicio)}</td>
                  <td>{formatDate(record.fecha_final)}</td>
                  <td>{record.tipo_ooh || '-'}</td>
                  <td>{record.proveedor || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={`check-btn-table ${record.checked ? 'checked' : ''} ${checkingStates[record.id] ? 'loading' : ''}`}
                      onClick={(e) => handleCheckInTable(e, record.id, record.checked)}
                      disabled={checkingStates[record.id]}
                      title={record.checked ? 'Desmarcar como chequeado' : 'Marcar como chequeado'}
                    >
                      {record.checked ? '✓ Chequeado' : '○ Chequear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMoreRecords && !hasActiveFilters && (
            <div ref={loadMoreRef} className="load-more-sentinel">
              <div className="load-more-spinner" />
              <span>Cargando más registros...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="records-grid">
          {loadedRecords.map((record) => {
            const isSelected = selectedCards.has(record.id);
            return (
              <RecordCard
                key={record.id}
                record={record}
                isSelected={isSelected}
                onSelect={toggleCardSelection}
                onOpenModal={openModal}
                formatDate={formatDate}
                resolveImageUrl={resolveImageUrl}
                LazyImage={LazyImage}
                toggleCardSelection={toggleCardSelection}
                onCheckedChange={handleCheckedChange}
              />
            );
          })}

          {hasMoreRecords && !hasActiveFilters && (
            <div ref={loadMoreRef} className="load-more-sentinel">
              <div className="load-more-spinner" />
              <span>Cargando más registros...</span>
            </div>
          )}

          {!hasActiveFilters && skeletonCount > 0 &&
            Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="record-card skeleton">
                <div className="card-image skeleton-block" />
                <div className="card-content">
                  <div className="skeleton-line title" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
        </div>
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
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.marca} 
                      onChange={(e) => handleEditChange('marca', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.marca}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Campaña:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.campana} 
                      onChange={(e) => handleEditChange('campana', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.campana}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Categoría:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.categoria} 
                      onChange={(e) => handleEditChange('categoria', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.categoria}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Proveedor:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.proveedor} 
                      onChange={(e) => handleEditChange('proveedor', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.proveedor}</span>
                  )}
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
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.ciudad} 
                      onChange={(e) => handleEditChange('ciudad', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.ciudad}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Región:</strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.region} 
                      onChange={(e) => handleEditChange('region', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{selectedRecord.ciudad_region || selectedRecord.region}</span>
                  )}
                </div>
                <div className="detail-row">
                  <strong>Coordenadas:</strong>
                  {editMode ? (
                    <div style={{display: 'flex', gap: '5px'}}>
                      <input 
                        type="text" 
                        value={editData.latitud} 
                        onChange={(e) => handleEditChange('latitud', e.target.value)}
                        className="edit-input"
                        placeholder="Latitud"
                        style={{flex: 1}}
                      />
                      <input 
                        type="text" 
                        value={editData.longitud} 
                        onChange={(e) => handleEditChange('longitud', e.target.value)}
                        className="edit-input"
                        placeholder="Longitud"
                        style={{flex: 1}}
                      />
                    </div>
                  ) : (
                    <span>{selectedRecord.latitud},{selectedRecord.longitud}</span>
                  )}
                </div>
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
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.tipoOOH} 
                      onChange={(e) => handleEditChange('tipoOOH', e.target.value)}
                      className="edit-input"
                      list="tiposOOH"
                    />
                  ) : (
                    <span>{selectedRecord.tipo_ooh}</span>
                  )}
                </div>
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
                  <div className="footer-left">
                    <div className="sync-status">
                      {selectedRecord?.synced_to_bigquery ? (
                        <>
                          <span>✅ Sincronizado a BigQuery</span>
                          <small>{new Date(selectedRecord.synced_to_bigquery).toLocaleString()}</small>
                        </>
                      ) : (
                        <>
                          <span>⏳ Pendiente de sincronizar</span>
                          <button 
                            className="modal-btn btn-confirm" 
                            onClick={syncToBigQuery}
                            disabled={isSyncingBQ}
                          >
                            {isSyncingBQ ? '⏳ Sincronizando...' : '✓ Confirmar a BigQuery'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📸 Galería completa - {selectedRecord.marca} - {selectedRecord.campana}</h2>
              <button className="modal-close" onClick={() => setShowImagesModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '10px', fontSize: '13px', color: '#555' }}>
                Puedes subir varias imágenes y elegir las principales. {getMaxPrimaryCount(selectedRecord)} principales permitidas para este tipo.
              </div>

              {imagesError && (
                <div className="error-message">❌ {imagesError}</div>
              )}

              <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn-secondary" style={{ cursor: imagesUploading ? 'not-allowed' : 'pointer' }}>
                  📤 Subir más fotos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    disabled={imagesUploading}
                    onChange={(e) => handleUploadMoreImages(e.target.files)}
                  />
                </label>
                {imagesUploading && <span>Subiendo...</span>}
                <button
                  className="btn-primary"
                  onClick={handleSavePrimaryImages}
                  disabled={imagesSaving || selectedImageIds.length === 0}
                >
                  {imagesSaving ? 'Guardando...' : '💾 Guardar principales'}
                </button>
              </div>

              {imagesLoading ? (
                <div>Cargando imágenes...</div>
              ) : (
                <div className="gallery-grid">
                  {recordImages.map((img) => {
                    const isSelected = selectedImageIds.includes(img.id);
                    return (
                      <div key={img.id} className="gallery-item">
                        <LazyImage
                          src={resolveImageUrl(img.ruta)}
                          alt={`Imagen ${img.id}`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="200"%3E%3Crect fill="%23ddd" width="100%25" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ESin imagen%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="gallery-item-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const maxPrimary = getMaxPrimaryCount(selectedRecord);
                                if (e.target.checked && selectedImageIds.length >= maxPrimary) {
                                  return;
                                }
                                const next = new Set(selectedImageIds);
                                if (e.target.checked) next.add(img.id);
                                else next.delete(img.id);
                                setSelectedImageIds(Array.from(next));
                              }}
                            />{' '}
                            Principal {isSelected ? `(${selectedImageIds.indexOf(img.id) + 1})` : ''}
                          </label>
                          <span style={{ fontSize: '10px', color: '#666' }}>Subida: {img.created_at}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                onClick={downloadReportPPT} 
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
