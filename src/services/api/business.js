import apiClient from '../../config/axios';

/**
 * Service API pour le module Business
 */

// Clients
export const clientService = {
  getAll: (params = {}) => apiClient.get('/business/clients', { params }),
  getById: (id) => apiClient.get(`/business/clients/${id}`),
  create: (data) => apiClient.post('/business/clients', data),
  update: (id, data) => apiClient.put(`/business/clients/${id}`, data),
  delete: (id) => apiClient.delete(`/business/clients/${id}`),
};

// Produits
export const productService = {
  getAll: (params = {}) => apiClient.get('/business/products', { params }),
  getById: (id) => apiClient.get(`/business/products/${id}`),
  create: (data) => apiClient.post('/business/products', data),
  update: (id, data) => apiClient.put(`/business/products/${id}`, data),
  delete: (id) => apiClient.delete(`/business/products/${id}`),
};

// Convois Business
export const businessWaveService = {
  getAll: (params = {}) => apiClient.get('/business/waves', { params }),
  getById: (id) => apiClient.get(`/business/waves/${id}`),
  create: (data) => apiClient.post('/business/waves', data),
  update: (id, data) => apiClient.put(`/business/waves/${id}`, data),
  delete: (id) => apiClient.delete(`/business/waves/${id}`),
};

// Convois Business
export const businessConvoyService = {
  getAll: (params = {}) => apiClient.get('/business/convoys', { params }),
  getById: (id) => apiClient.get(`/business/convoys/${id}`),
  create: (data) => apiClient.post('/business/convoys', data),
  update: (id, data) => apiClient.put(`/business/convoys/${id}`, data),
  delete: (id) => apiClient.delete(`/business/convoys/${id}`),
  close: (id, data) => apiClient.post(`/business/convoys/${id}/close`, data),
};

// Commandes Business
export const businessOrderService = {
  getAll: (params = {}) => apiClient.get('/business/orders', { params }),
  getById: (id) => apiClient.get(`/business/orders/${id}`),
  create: (data) => apiClient.post('/business/orders', data),
  update: (id, data) => apiClient.put(`/business/orders/${id}`, data),
  delete: (id) => apiClient.delete(`/business/orders/${id}`),
};

// Lignes de commande
export const businessOrderItemService = {
  getAll: (params = {}) => apiClient.get('/business/order-items', { params }),
  getById: (id) => apiClient.get(`/business/order-items/${id}`),
  create: (data) => apiClient.post('/business/order-items', data),
  update: (id, data) => apiClient.put(`/business/order-items/${id}`, data),
  delete: (id) => apiClient.delete(`/business/order-items/${id}`),
};

// Frais des convois
export const businessWaveCostService = {
  getAll: (params = {}) => apiClient.get('/business/wave-costs', { params }),
  getById: (id) => apiClient.get(`/business/wave-costs/${id}`),
  create: (data) => apiClient.post('/business/wave-costs', data),
  update: (id, data) => apiClient.put(`/business/wave-costs/${id}`, data),
  delete: (id) => apiClient.delete(`/business/wave-costs/${id}`),
};

// Frais des trajets
export const businessConvoyCostService = {
  getAll: (params = {}) => apiClient.get('/business/convoy-costs', { params }),
  getById: (id) => apiClient.get(`/business/convoy-costs/${id}`),
  create: (data) => apiClient.post('/business/convoy-costs', data),
  update: (id, data) => apiClient.put(`/business/convoy-costs/${id}`, data),
  delete: (id) => apiClient.delete(`/business/convoy-costs/${id}`),
};

// Analytics
export const analyticsService = {
  getDashboard: (params = {}) => apiClient.get('/business/analytics/dashboard', { params }),
  getWaveStats: (waveId) => apiClient.get(`/business/analytics/wave/${waveId}`),
  getClientStats: (clientId, params = {}) => 
    apiClient.get(`/business/analytics/client/${clientId}`, { params }),
};

// Factures
export const invoiceService = {
  generate: (id) => apiClient.get(`/business/invoices/${id}/generate`, { responseType: 'blob' }),
  preview: (id) => apiClient.get(`/business/invoices/${id}/preview`, { responseType: 'blob' }),
};
