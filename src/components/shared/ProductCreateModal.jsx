import { useState } from 'react';
import { productService } from '../../services/api/business';
import Modal from './Modal';
import FormInput from './FormInput';

/**
 * Modal réutilisable pour créer un produit rapidement
 */
const ProductCreateModal = ({ isOpen, onClose, onSuccess, initialData = {}, defaultCurrency = null }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    sku: initialData.sku || '',
    description: initialData.description || '',
    purchase_price: initialData.purchase_price || '',
    sale_price: initialData.sale_price || '',
    currency: defaultCurrency || initialData.currency || 'CFA',
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
      };

      // Si SKU est vide, ne pas l'envoyer (génération auto côté backend)
      if (!dataToSend.sku || dataToSend.sku.trim() === '') {
        delete dataToSend.sku;
      }

      const response = await productService.create(dataToSend);
      
      if (response.data.success) {
        const newProduct = response.data.data;
        // Fermer le modal et notifier le parent
        handleClose();
        if (onSuccess) {
          onSuccess(newProduct);
        }
      } else {
        setErrors(response.data.errors || {});
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: ['Erreur lors de la création du produit'] });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Réinitialiser le formulaire
    setFormData({
      name: initialData.name || '',
      sku: initialData.sku || '',
      description: initialData.description || '',
      purchase_price: initialData.purchase_price || '',
      sale_price: initialData.sale_price || '',
      currency: defaultCurrency || initialData.currency || 'CFA',
      is_active: initialData.is_active !== undefined ? initialData.is_active : true,
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouveau produit" size="lg">
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.general}
          </div>
        )}

        <FormInput
          label="Nom du produit"
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name?.[0]}
          required
          disabled={saving}
          placeholder="Nom du produit"
        />

        <FormInput
          label="SKU (Code produit)"
          name="sku"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          error={errors.sku?.[0]}
          disabled={saving}
          placeholder="Laissez vide pour génération automatique"
          helpText="Laissez vide pour génération automatique"
        />

        <FormInput
          label="Description (optionnel)"
          name="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          error={errors.description?.[0]}
          disabled={saving}
          placeholder="Description du produit"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label={`Prix d'achat (${formData.currency})`}
            name="purchase_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            error={errors.purchase_price?.[0]}
            required
            disabled={saving}
            placeholder="0.00"
          />
          <FormInput
            label={`Prix de vente (${formData.currency})`}
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.sale_price}
            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
            error={errors.sale_price?.[0]}
            required
            disabled={saving}
            placeholder="0.00"
          />
        </div>

        <div className="flex items-center space-x-2 mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
              disabled={saving}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Produit actif</span>
          </label>
        </div>

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

export default ProductCreateModal;

