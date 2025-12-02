/**
 * Fonctions utilitaires
 */

/**
 * Formater un montant avec devise
 */
export const formatCurrency = (amount, currency = 'CFA') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'CFA' ? 'XOF' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formater une date
 */
export const formatDate = (date, format = 'DD/MM/YYYY') => {
  if (!date) return '-';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'DD/MM/YYYY HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

/**
 * Télécharger un fichier blob (PDF, etc.)
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Formater un statut pour l'affichage
 */
export const formatStatus = (status) => {
  const statusMap = {
    // Business Orders
    pending: 'En attente',
    confirmed: 'Confirmée',
    in_transit: 'En transit',
    arrived: 'Arrivée',
    ready_for_pickup: 'Prête pour récupération',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    
    // Express Parcels
    registered: 'Enregistré',
    ready_for_departure: 'Prêt pour départ',
    loaded: 'Embarqué',
    // in_transit déjà défini
    // arrived déjà défini
    // ready_for_pickup déjà défini
    // delivered déjà défini
    // cancelled déjà défini
    
    // Waves
    draft: 'Brouillon',
    open: 'Ouverte',
    closed: 'Fermée',
  };
  
  return statusMap[status] || status;
};

/**
 * Obtenir la classe CSS pour un statut
 */
export const getStatusClass = (status) => {
  const statusClasses = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-purple-100 text-purple-800',
    arrived: 'bg-green-100 text-green-800',
    ready_for_pickup: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    registered: 'bg-gray-100 text-gray-800',
    ready_for_departure: 'bg-yellow-100 text-yellow-800',
    loaded: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    open: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Valider un email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valider un numéro de téléphone
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

