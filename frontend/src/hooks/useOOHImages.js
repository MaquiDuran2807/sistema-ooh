import { useCallback, useState } from 'react';
import { cacheRecordImages, getCachedImages, invalidateCache } from '../utils/imageCache';
import { fetchRecordImages, uploadImagesGallery, uploadImagesWithSlots } from '../services/oohService';

export const useOOHImages = ({ selectedRecord, onUpdateRecord }) => {
  const [showImagesModal, setShowImagesModal] = useState(false);
  const [recordImages, setRecordImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState(null);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [cachedImages, setCachedImages] = useState([]);
  const [boxAssignments, setBoxAssignments] = useState({ 1: null, 2: null, 3: null });
  const [isDraggingOverDropZone, setIsDraggingOverDropZone] = useState(false);

  const openImagesModal = useCallback(async () => {
    if (!selectedRecord) return;
    setShowImagesModal(true);
    setImagesLoading(true);
    setImagesError(null);

    cachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setCachedImages([]);
    setBoxAssignments({ 1: null, 2: null, 3: null });

    const cached = getCachedImages(selectedRecord.id);
    if (cached) {
      console.log('✅ [CACHE] Imágenes cargadas desde caché:', cached.length);
      setRecordImages(cached);
      setImagesLoading(false);
      return;
    }

    try {
      const res = await fetchRecordImages(selectedRecord.id);
      const images = Array.isArray(res?.data) ? res.data : [];
      setRecordImages(images);
      cacheRecordImages(selectedRecord.id, images);
      console.log('💾 [CACHE] Imágenes guardadas en caché:', images.length);
    } catch (err) {
      setImagesError(err.response?.data?.error || err.message || 'Error cargando imágenes');
    } finally {
      setImagesLoading(false);
    }
  }, [selectedRecord, cachedImages]);

  const handleDragOverDropZone = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverDropZone(true);
  }, []);

  const handleDragLeaveDropZone = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDraggingOverDropZone(false);
    }
  }, []);

  const handleDropImages = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverDropZone(false);

    if (!selectedRecord) return;

    const items = e.dataTransfer.items;
    const files = [];

    const readDirectory = async (dirReader) => {
      return new Promise((resolve) => {
        const entries = [];
        const readEntries = () => {
          dirReader.readEntries(async (results) => {
            if (results.length === 0) {
              resolve(entries);
            } else {
              for (const entry of results) {
                entries.push(entry);
              }
              readEntries();
            }
          });
        };
        readEntries();
      });
    };

    const processEntry = async (entry) => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            if (file.type.startsWith('image/')) {
              files.push(file);
              console.log(`📤 [DROP] Archivo: ${file.name}`);
            }
            resolve();
          });
        });
      }
      if (entry.isDirectory) {
        console.log(`📤 [DROP] Carpeta: ${entry.name}`);
        const dirReader = entry.createReader();
        const entries = await readDirectory(dirReader);
        for (const subEntry of entries) {
          await processEntry(subEntry);
        }
      }
    };

    if (items && items.length > 0) {
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            promises.push(processEntry(entry));
          }
        }
      }
      await Promise.all(promises);
    } else {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      files.push(...droppedFiles);
    }

    if (files.length > 0) {
      console.log(`✅ [DROP] ${files.length} imagen(es) cargadas al caché`);
      const newImages = Array.from(files).map((file, idx) => ({
        id: `cache_${Date.now()}_${idx}`,
        file,
        preview: URL.createObjectURL(file)
      }));

      setCachedImages(prev => [...prev, ...newImages]);
      setImagesError(`✅ ${files.length} imagen(es) en caché. Asigna las 3 principales a los boxes de arriba.`);
      setTimeout(() => setImagesError(null), 4000);
    }
  }, [selectedRecord]);

  const assignImageToBox = useCallback((slot, cachedImageId) => {
    setBoxAssignments(prev => ({
      ...prev,
      [slot]: cachedImageId === prev[slot] ? null : cachedImageId
    }));
    console.log(`📌 [ASSIGN] Imagen ${cachedImageId} asignada a slot ${slot}`);
  }, []);

  const getAssignedImage = useCallback((slot) => {
    const imageId = boxAssignments[slot];
    if (!imageId) return null;
    return cachedImages.find(img => img.id === imageId);
  }, [boxAssignments, cachedImages]);

  const handleSaveAllImages = useCallback(async () => {
    if (!selectedRecord) return;

    console.log('💾 [SAVE] Guardando imágenes...');
    console.log('💾 [SAVE] Box assignments:', boxAssignments);
    console.log('💾 [SAVE] Cached images:', cachedImages.length);

    setImagesUploading(true);
    setImagesError(null);

    try {
      const imagesToUpload = [];
      let galleryOrder = 4;
      cachedImages.forEach(img => {
        const slot = Object.entries(boxAssignments).find(([_, id]) => id === img.id)?.[0];
        if (slot) {
          imagesToUpload.push({
            file: img.file,
            slot: parseInt(slot, 10),
            name: img.file.name
          });
        } else {
          imagesToUpload.push({
            file: img.file,
            slot: undefined,
            order: galleryOrder++,
            name: img.file.name
          });
        }
      });

      const primaryImages = imagesToUpload.filter(img => img.slot);
      if (primaryImages.length > 0) {
        const formData = new FormData();
        primaryImages.forEach(img => {
          formData.append('imagenes', img.file);
          formData.append('slots', img.slot);
          console.log(`📤 [SAVE] PRIMARY: ${img.file.name} → Slot ${img.slot}`);
        });

        await uploadImagesWithSlots(selectedRecord.id, formData);
        console.log('✅ [SAVE] PRIMARY imágenes subidas');
      }

      const galleryImages = imagesToUpload.filter(img => !img.slot);
      if (galleryImages.length > 0) {
        const formData = new FormData();
        galleryImages.forEach(img => {
          formData.append('imagenes', img.file);
          console.log(`📤 [SAVE] GALLERY: ${img.file.name}`);
        });

        await uploadImagesGallery(selectedRecord.id, formData);
        console.log('✅ [SAVE] GALLERY imágenes subidas');
      }

      invalidateCache(selectedRecord.id);
      const res = await fetchRecordImages(selectedRecord.id);
      const images = Array.isArray(res?.data) ? res.data : [];
      setRecordImages(images);
      cacheRecordImages(selectedRecord.id, images);

      const primaryImg = images.find(img => img.role === 'primary' && img.slot === 1);
      const updatedRecord = {
        ...selectedRecord,
        imagen_1: primaryImg?.ruta || selectedRecord.imagen_1,
        imagen_2: images.find(img => img.role === 'primary' && img.slot === 2)?.ruta || selectedRecord.imagen_2,
        imagen_3: images.find(img => img.role === 'primary' && img.slot === 3)?.ruta || selectedRecord.imagen_3
      };

      if (onUpdateRecord) {
        onUpdateRecord(updatedRecord);
      }

      cachedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setCachedImages([]);
      setBoxAssignments({ 1: null, 2: null, 3: null });

      setImagesError('✅ Imágenes guardadas correctamente. Tarjetas actualizadas.');
      setTimeout(() => setImagesError(null), 4000);
    } catch (err) {
      console.error('❌ [SAVE] Error:', err);
      setImagesError('❌ ' + (err.response?.data?.error || err.message || 'Error guardando'));
    } finally {
      setImagesUploading(false);
    }
  }, [selectedRecord, boxAssignments, cachedImages, onUpdateRecord]);

  return {
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
  };
};
