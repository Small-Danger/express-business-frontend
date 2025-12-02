import apiClient from '../config/axios';

/**
 * Service d'authentification
 */
export const authService = {
  /**
   * Connexion
   */
  login: async (email, password) => {
    const response = await apiClient.post('/login', { email, password });
    return response.data;
  },

  /**
   * Déconnexion
   */
  logout: async () => {
    const response = await apiClient.post('/logout');
    return response.data;
  },

  /**
   * Obtenir l'utilisateur connecté
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/me');
    return response.data;
  },
};
