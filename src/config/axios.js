import axios from 'axios';

// Configuration de l'URL de base de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Créer une instance Axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Pour CORS
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et les erreurs
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si l'utilisateur n'est pas authentifié (401), rediriger vers login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Gérer les erreurs de validation (422)
    if (error.response?.status === 422) {
      return Promise.reject(error.response.data);
    }
    
    // Gérer les erreurs serveur (500, etc.)
    if (error.response?.status >= 500) {
      console.error('Erreur serveur:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

