import apiClient from '../../config/axios';

/**
 * Service API pour les paramètres système (Admin uniquement)
 */

// Paramètres système
export const systemSettingService = {
  getAll: (params = {}) => apiClient.get('/system-settings', { params }),
  getById: (id) => apiClient.get(`/system-settings/${id}`),
  getByKey: (key) => apiClient.get(`/system-settings/key/${key}`),
  create: (data) => apiClient.post('/system-settings', data),
  update: (id, data) => apiClient.put(`/system-settings/${id}`, data),
  updateByKey: (key, data) => apiClient.put(`/system-settings/key/${key}`, data),
  delete: (id) => apiClient.delete(`/system-settings/${id}`),
  getExchangeRate: () => apiClient.get('/exchange-rate'),
  getSecondaryCurrencies: () => apiClient.get('/secondary-currencies'),
};

// Utilisateurs (Admin uniquement)
export const userService = {
  getAll: (params = {}) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
};

