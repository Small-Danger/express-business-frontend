import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Fonction pour obtenir le thème initial
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
      // Vérifier la préférence système
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (error) {
      console.error('Error getting initial theme:', error);
      return false;
    }
  };

  const [isDark, setIsDark] = useState(() => {
    const initialTheme = getInitialTheme();
    // Appliquer le thème immédiatement au chargement
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (initialTheme) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    return initialTheme;
  });

  // Appliquer le thème au document quand il change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      
      // Appliquer immédiatement pour éviter le délai
      const root = document.documentElement;
      if (newValue) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem('theme', newValue ? 'dark' : 'light');
      } catch (e) {
        console.error('Error saving theme to localStorage:', e);
      }
      
      return newValue;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

