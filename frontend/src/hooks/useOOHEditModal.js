import { useCallback, useState } from 'react';
import { syncRecordToBigQuery, updateRecord } from '../services/oohService';

const buildEditData = (record) => ({
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
  tipoOOH: record.tipo_ooh,
  brand_id: record.brand_id,
  campaign_id: record.campaign_id,
  ooh_type_id: record.ooh_type_id,
  provider_id: record.provider_id,
  city_id: record.city_id
});

export const useOOHEditModal = ({ onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [imageReplacements, setImageReplacements] = useState({});
  const [isSyncingBQ, setIsSyncingBQ] = useState(false);
  const [syncStatus, setSyncStatus] = useState({});
  const [showAddCampanaModal, setShowAddCampanaModal] = useState(false);

  const openModal = useCallback((record) => {
    console.log('🔍 [MODAL] Abriendo modal con registro:', record);
    setSelectedRecord(record);
    setEditData(buildEditData(record));
    console.log('🔍 [MODAL] IDs guardados:', {
      brand_id: record.brand_id,
      campaign_id: record.campaign_id,
      ooh_type_id: record.ooh_type_id,
      provider_id: record.provider_id,
      city_id: record.city_id
    });
    setEditMode(false);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedRecord(null);
    setEditMode(false);
    setEditData({});
    setImageReplacements({});
    setIsSyncingBQ(false);
  }, []);

  const handleEditChange = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleImageChangeSlot = useCallback((slot, fileList) => {
    const file = fileList && fileList[0];
    if (!file) return;
    setImageReplacements(prev => ({ ...prev, [slot]: file }));
  }, []);

  const saveChanges = useCallback(async () => {
    try {
      console.log('🔄 [OOHLIST - ACTUALIZAR] Editando registro existente ID:', editData.id);
      console.log('📝 Datos actuales:', editData);

      if (!editData.brand_id || !editData.campaign_id || !editData.ooh_type_id || !editData.provider_id || !editData.city_id) {
        alert('❌ Error: Faltan IDs en el registro. Cierra y vuelve a abrir el modal.');
        return;
      }

      const formData = new FormData();
      formData.append('existingId', editData.id);
      formData.append('brand_id', editData.brand_id);
      formData.append('campaign_id', editData.campaign_id);
      formData.append('city_id', editData.city_id);
      formData.append('ooh_type_id', editData.ooh_type_id);
      formData.append('provider_id', editData.provider_id);
      formData.append('direccion', editData.direccion);
      formData.append('latitud', editData.latitud);
      formData.append('longitud', editData.longitud);
      formData.append('fechaInicio', editData.fechaInicio);
      formData.append('fechaFin', editData.fechaFin);

      const slots = Object.keys(imageReplacements);
      if (slots.length > 0) {
        formData.append('imageIndexes', slots.join(','));
        slots.forEach(slot => {
          formData.append('imagenes', imageReplacements[slot]);
        });
      }

      const response = await updateRecord(formData);
      if (response?.success) {
        alert('✅ Registro actualizado correctamente');
        setEditMode(false);
        if (onRefresh) {
          onRefresh();
        }
        closeModal();
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      alert('❌ Error al guardar los cambios');
    }
  }, [editData, imageReplacements, onRefresh, closeModal]);

  const syncToBigQuery = useCallback(async () => {
    if (!selectedRecord?.id) {
      alert('⚠️ No hay registro seleccionado');
      return;
    }

    setIsSyncingBQ(true);
    try {
      const response = await syncRecordToBigQuery(selectedRecord.id);
      if (response?.success) {
        setSyncStatus(prev => ({
          ...prev,
          [selectedRecord.id]: {
            synced: true,
            syncedAt: response.data?.synced_to_bigquery
          }
        }));
        alert('✅ Registro sincronizado a BigQuery exitosamente');
        setSelectedRecord(prev => ({
          ...prev,
          synced_to_bigquery: response.data?.synced_to_bigquery,
          bq_sync_status: 'synced'
        }));
      } else {
        alert(`❌ Error: ${response?.error || 'Error sincronizando'}`);
      }
    } catch (error) {
      console.error('Error sincronizando a BigQuery:', error);
      alert(`❌ Error al sincronizar: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSyncingBQ(false);
    }
  }, [selectedRecord]);

  const openAddCampanaModal = useCallback(() => {
    setShowAddCampanaModal(true);
  }, []);

  const closeAddCampanaModal = useCallback(() => {
    setShowAddCampanaModal(false);
  }, []);

  const handleNewCampaignAdded = useCallback((newCampaign) => {
    console.log('🆕 Nueva campaña creada:', newCampaign);
    // Actualizar editData con la nueva campaña
    setEditData(prev => ({
      ...prev,
      campaign_id: newCampaign.id,
      campana: newCampaign.nombre
    }));
    closeAddCampanaModal();
  }, [closeAddCampanaModal]);

  return {
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
    openModal,
    closeModal,
    handleEditChange,
    handleImageChangeSlot,
    saveChanges,
    syncToBigQuery,
    openAddCampanaModal,
    closeAddCampanaModal,
    handleNewCampaignAdded
  };
};
