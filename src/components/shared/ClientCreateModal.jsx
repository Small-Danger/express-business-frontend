import { useState } from 'react';
import { clientService } from '../../services/api/business';
import Modal from './Modal';
import FormInput from './FormInput';

/**
 * Modal réutilisable pour créer un client rapidement
 */
const ClientCreateModal = ({ isOpen, onClose, onSuccess, initialData = {}, defaultType = null }) => {
  const [formData, setFormData] = useState({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    phone: initialData.phone || '',
    whatsapp_phone: initialData.whatsapp_phone || '',
    email: initialData.email || '',
    country: initialData.country || '',
    city: initialData.city || '',
    address: initialData.address || '',
    is_business_client: defaultType === 'business' || initialData.is_business_client || false,
    is_express_client: defaultType === 'express' || initialData.is_express_client || false,
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation : au moins un type doit être sélectionné
    if (!formData.is_business_client && !formData.is_express_client) {
      setErrors({
        is_business_client: ['Le client doit être au moins Business ou Express.'],
      });
      return;
    }

    setSaving(true);
    try {
      const response = await clientService.create(formData);
      
      if (response.data.success) {
        const newClient = response.data.data;
        // Fermer le modal et notifier le parent
        handleClose();
        if (onSuccess) {
          onSuccess(newClient);
        }
      } else {
        setErrors(response.data.errors || {});
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: ['Erreur lors de la création du client'] });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Réinitialiser le formulaire
    setFormData({
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      phone: initialData.phone || '',
      whatsapp_phone: initialData.whatsapp_phone || '',
      email: initialData.email || '',
      country: initialData.country || '',
      city: initialData.city || '',
      address: initialData.address || '',
      is_business_client: defaultType === 'business' || initialData.is_business_client || false,
      is_express_client: defaultType === 'express' || initialData.is_express_client || false,
      notes: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouveau client" size="lg">
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Prénom"
            name="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            error={errors.first_name?.[0]}
            required
            disabled={saving}
          />
          <FormInput
            label="Nom"
            name="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            error={errors.last_name?.[0]}
            required
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Téléphone"
            name="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={errors.phone?.[0]}
            placeholder="+212 6XX XXX XXX"
            required
            disabled={saving}
          />
          <FormInput
            label="WhatsApp (optionnel)"
            name="whatsapp_phone"
            value={formData.whatsapp_phone}
            onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
            error={errors.whatsapp_phone?.[0]}
            placeholder="+212 6XX XXX XXX"
            disabled={saving}
          />
        </div>

        <FormInput
          label="Email (optionnel)"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email?.[0]}
          placeholder="email@example.com"
          disabled={saving}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Pays"
            name="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            error={errors.country?.[0]}
            placeholder="Maroc"
            required
            disabled={saving}
          />
          <FormInput
            label="Ville"
            name="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            error={errors.city?.[0]}
            placeholder="Casablanca"
            required
            disabled={saving}
          />
        </div>

        <FormInput
          label="Adresse (optionnel)"
          name="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          error={errors.address?.[0]}
          placeholder="Adresse complète"
          disabled={saving}
        />

        <div className="flex items-center space-x-6 mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_business_client}
              onChange={(e) => setFormData({ ...formData, is_business_client: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
              disabled={saving}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Business</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_express_client}
              onChange={(e) => setFormData({ ...formData, is_express_client: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
              disabled={saving}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Express</span>
          </label>
        </div>

        {errors.is_business_client && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{errors.is_business_client[0]}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Création...' : 'Créer et sélectionner'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientCreateModal;

