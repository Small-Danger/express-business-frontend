import apiClient from '../../config/axios';

// Services API pour la trésorerie

// Comptes
export const accountService = {
  getAll: () => apiClient.get('/accounts'),
  getById: (id) => apiClient.get(`/accounts/${id}`),
  getBalance: (id) => apiClient.get(`/accounts/${id}/balance`),
  getTransactions: (id, params = {}) => apiClient.get(`/accounts/${id}/transactions`, { params }),
  create: (data) => apiClient.post('/accounts', data),
  update: (id, data) => apiClient.put(`/accounts/${id}`, data),
  delete: (id) => apiClient.delete(`/accounts/${id}`),
};

// Transactions financières
export const financialTransactionService = {
  getAll: (params = {}) => apiClient.get('/financial-transactions', { params }),
  getById: (id) => apiClient.get(`/financial-transactions/${id}`),
  transfer: (data) => apiClient.post('/financial-transactions/transfer', data),
  getSummary: () => apiClient.get('/financial-transactions/summary'),
};

