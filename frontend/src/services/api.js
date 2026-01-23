import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

export const createOOH = async (formData) => {
  try {
    const response = await api.post('/api/ooh/create', formData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllOOH = async () => {
  try {
    const response = await api.get('/api/ooh/all');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getOOHById = async (id) => {
  try {
    const response = await api.get(`/api/ooh/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
