import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erreur lors du parsing de l\'utilisateur:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Fonction de connexion
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { user: userData, token } = response.data.data;
        
        // Sauvegarder le token et l'utilisateur
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      }
      
      return { success: false, message: response.data.message || 'Erreur de connexion' };
    } catch (error) {
      // Gérer différents types d'erreurs avec des messages plus explicites
      let errorMessage = 'Erreur de connexion';
      
      if (error.response) {
        // Erreur avec réponse du serveur
        if (error.response.status === 401) {
          errorMessage = 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
        } else if (error.response.status === 422) {
          errorMessage = 'Données invalides. Vérifiez les informations saisies.';
          if (error.response.data?.errors) {
            const validationErrors = Object.values(error.response.data.errors).flat().join(', ');
            errorMessage += ` ${validationErrors}`;
          }
        } else if (error.response.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.response.status === 0 || !error.response.status) {
          errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
        } else {
          errorMessage = error.response.data?.message || `Erreur ${error.response.status}. Veuillez réessayer.`;
        }
      } else if (error.request) {
        // Pas de réponse du serveur (problème réseau)
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et que le serveur est accessible.';
      } else {
        // Autre erreur
        errorMessage = error.message || 'Une erreur inattendue est survenue.';
      }
      
      return {
        success: false,
        message: errorMessage,
        errors: error.response?.data?.errors,
      };
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyer le localStorage et l'état
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Obtenir les informations de l'utilisateur connecté
  const getCurrentUser = async () => {
    try {
      const response = await apiClient.get('/me');
      if (response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      logout();
    }
  };

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Vérifier si l'utilisateur a l'un des rôles spécifiés
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    getCurrentUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

