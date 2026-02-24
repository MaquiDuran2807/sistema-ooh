import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export const fetchAvailablePeriods = async () => {
  const res = await axios.get(`${API_BASE}/ooh/periods/available`);
  return res.data;
};

export const fetchRecords = async (params) => {
  const res = await axios.get(`${API_BASE}/ooh/all`, { params });
  return res.data;
};

export const updateRecordCheck = async (recordId, checked) => {
  const res = await axios.patch(`${API_BASE}/ooh/${recordId}/check`, { checked });
  return res.data;
};

export const fetchRecordImages = async (recordId) => {
  const res = await axios.get(`${API_BASE}/ooh/${recordId}/images`);
  return res.data;
};

export const uploadImagesWithSlots = async (recordId, formData) => {
  const res = await axios.post(`${API_BASE}/ooh/${recordId}/images/upload-with-slots`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const uploadImagesGallery = async (recordId, formData) => {
  const res = await axios.post(`${API_BASE}/ooh/${recordId}/images/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const updateRecord = async (formData) => {
  const res = await axios.post(`${API_BASE}/ooh/create`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const syncRecordToBigQuery = async (recordId) => {
  const res = await axios.post(`${API_BASE}/ooh/${recordId}/sync-bigquery`);
  return res.data;
};

export const deleteRecord = async (recordId) => {
  const res = await axios.delete(`${API_BASE}/ooh/${recordId}`);
  return res.data;
};

export const downloadReportPPT = async (params) => {
  return axios.get(`${API_BASE}/ooh/report/ppt`, {
    params,
    responseType: 'blob',
    timeout: 60000
  });
};
