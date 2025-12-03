import { useState, useEffect } from 'react';

// Hook simple pour gérer les notifications
// Peut être étendu plus tard pour se connecter à une vraie API
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Charger les notifications toutes les 30 secondes
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // TODO: Remplacer par un vrai appel API
      // Pour l'instant, on retourne un tableau vide
      // const response = await notificationService.getAll();
      // if (response.data.success) {
      //   setNotifications(response.data.data);
      // }
      
      // Exemple de notifications statiques pour la démo
      // À remplacer par une vraie API
      setNotifications([]);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    // TODO: Appel API pour marquer comme lu
    // await notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    // TODO: Appel API pour tout marquer comme lu
    // await notificationService.markAllAsRead();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
};

export default useNotifications;

