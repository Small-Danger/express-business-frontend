import apiClient from '../../config/axios';

/**
 * Service API pour le module Express
 */

// Vagues Express
export const expressWaveService = {
  getAll: (params = {}) => apiClient.get('/express/waves', { params }),
  getById: (id) => apiClient.get(`/express/waves/${id}`),
  create: (data) => apiClient.post('/express/waves', data),
  update: (id, data) => apiClient.put(`/express/waves/${id}`, data),
  delete: (id) => apiClient.delete(`/express/waves/${id}`),
};

// Trajets Express
export const expressTripService = {
  getAll: (params = {}) => apiClient.get('/express/trips', { params }),
  getById: (id) => apiClient.get(`/express/trips/${id}`),
  create: (data) => apiClient.post('/express/trips', data),
  update: (id, data) => apiClient.put(`/express/trips/${id}`, data),
  delete: (id) => apiClient.delete(`/express/trips/${id}`),
  close: (id, data) => apiClient.post(`/express/trips/${id}/close`, data),
};

// Colis Express
export const expressParcelService = {
  getAll: (params = {}) => apiClient.get('/express/parcels', { params }),
  getById: (id) => apiClient.get(`/express/parcels/${id}`),
  create: (data) => apiClient.post('/express/parcels', data),
  update: (id, data) => apiClient.put(`/express/parcels/${id}`, data),
  delete: (id) => apiClient.delete(`/express/parcels/${id}`),
  pickup: (id, data) => apiClient.post(`/express/parcels/${id}/pickup`, data),
};

// Frais des vagues Express
export const expressWaveCostService = {
  getAll: (params = {}) => apiClient.get('/express/wave-costs', { params }),
  getById: (id) => apiClient.get(`/express/wave-costs/${id}`),
  create: (data) => apiClient.post('/express/wave-costs', data),
  update: (id, data) => apiClient.put(`/express/wave-costs/${id}`, data),
  delete: (id) => apiClient.delete(`/express/wave-costs/${id}`),
};

// Frais des trajets Express
export const expressTripCostService = {
  getAll: (params = {}) => apiClient.get('/express/trip-costs', { params }),
  getById: (id) => apiClient.get(`/express/trip-costs/${id}`),
  create: (data) => apiClient.post('/express/trip-costs', data),
  update: (id, data) => apiClient.put(`/express/trip-costs/${id}`, data),
  delete: (id) => apiClient.delete(`/express/trip-costs/${id}`),
};

// Tâches automatisées
export const taskService = {
  confirmLoading: (tripId, data) => apiClient.post(`/express/tasks/confirm-loading/${tripId}`, data),
  confirmArrival: (data) => apiClient.post('/express/tasks/confirm-arrival', data),
  markReadyForPickup: (data) => apiClient.post('/express/tasks/mark-ready-for-pickup', data),
};

// Gestion des livraisons
export const deliveryService = {
  getReadyForPickup: (params = {}) => apiClient.get('/express/deliveries/ready-for-pickup', { params }),
  getClientParcels: (clientId) => apiClient.get(`/express/deliveries/client/${clientId}/parcels`),
  checkClientPayment: (clientId) => apiClient.get(`/express/deliveries/client/${clientId}/check-payment`),
  calculateWaveProfit: (waveId) => apiClient.get(`/express/deliveries/wave/${waveId}/profit`),
};

// Reçus
export const receiptService = {
  generate: (id) => apiClient.get(`/express/receipts/${id}/generate`, { responseType: 'blob' }),
  preview: (id) => apiClient.get(`/express/receipts/${id}/preview`, { responseType: 'blob' }),
};
