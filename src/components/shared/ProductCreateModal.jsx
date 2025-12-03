import { useState, useEffect } from 'react';
import { productService } from '../../services/api/business';
import { systemSettingService } from '../../services/api/system';
import Modal from './Modal';
import FormInput from './FormInput';
import { formatCurrency } from '../../utils/helpers';

/**
 * Modal réutilisable pour créer un produit rapidement
 * Identique au formulaire de création dans Products.jsx
 */
const ProductCreateModal = ({ isOpen, onClose, onSuccess, initialData = {}, defaultCurrency = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    purchase_price: '',
    sale_price: '',
    currency: 'CFA',
    is_active: true,
  });

  // Mettre à jour le formulaire quand le modal s'ouvre ou que initialData/defaultCurrency change
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        purchase_price: initialData.purchase_price || '',
        sale_price: initialData.sale_price || '',
        currency: defaultCurrency || initialData.currency || 'CFA',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true,
      });
      setErrors({}); // Réinitialiser les erreurs aussi
    }
  }, [isOpen, initialData.name, initialData.currency, defaultCurrency]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [secondaryCurrencies, setSecondaryCurrencies] = useState([]); // Devises secondaires (MAD, EUR, etc.)

  // Charger les devises secondaires configurées
  useEffect(() => {
    if (isOpen) {
      loadSecondaryCurrencies();
    }
  }, [isOpen]);

  // Charger les devises secondaires configurées
  const loadSecondaryCurrencies = async () => {
    try {
      const response = await systemSettingService.getSecondaryCurrencies();
      if (response.data.success && Array.isArray(response.data.data)) {
        setSecondaryCurrencies(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des devises secondaires:', error);
      // Garder un tableau vide par défaut
      setSecondaryCurrencies([]);
    }
  };

  // Fonctions de conversion
  // Convertir un montant de sa devise d'origine vers CFA
  const convertToCFA = (amount, fromCurrency) => {
    if (fromCurrency === 'CFA') return amount;
    
    // Trouver le taux de change pour cette devise vers CFA
    const currencyConfig = secondaryCurrencies.find(c => c.code === fromCurrency);
    if (currencyConfig) {
      return amount * currencyConfig.rate_to_cfa;
    }
    
    return amount; // Si pas de taux, retourner tel quel
  };

  // Convertir un montant de CFA vers une autre devise
  const convertFromCFA = (amount, targetCurrency) => {
    if (targetCurrency === 'CFA') return amount;
    
    // Trouver le taux de change pour cette devise depuis CFA
    const currencyConfig = secondaryCurrencies.find(c => c.code === targetCurrency);
    if (currencyConfig && currencyConfig.rate_to_cfa > 0) {
      return amount / currencyConfig.rate_to_cfa;
    }
    
    return amount; // Si pas de taux, retourner tel quel
  };

  // Obtenir le prix dans une devise donnée depuis la devise d'enregistrement
  const getPriceInCurrency = (amount, fromCurrency, targetCurrency) => {
    // Si la devise cible est la même que la devise d'enregistrement, retourner tel quel
    if (fromCurrency === targetCurrency) return amount;
    
    // Si la devise d'enregistrement est CFA
    if (fromCurrency === 'CFA') {
      // Convertir depuis CFA vers la devise cible
      return convertFromCFA(amount, targetCurrency);
    }
    
    // Si la devise cible est CFA
    if (targetCurrency === 'CFA') {
      // Convertir depuis la devise d'enregistrement vers CFA
      return convertToCFA(amount, fromCurrency);
    }
    
    // Sinon, convertir: devise d'enregistrement -> CFA -> devise cible
    const amountCFA = convertToCFA(amount, fromCurrency);
    return convertFromCFA(amountCFA, targetCurrency);
  };

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
      if (!dataToSend.sku || dataToSend.sku.trim() === '' || dataToSend.sku === 'Généré automatiquement') {
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
    // Réinitialiser le formulaire aux valeurs par défaut
    setFormData({
      name: '',
      sku: '',
      description: '',
      purchase_price: '',
      sale_price: '',
      currency: 'CFA',
      is_active: true,
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

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="SKU"
            name="sku"
            value={formData.sku || 'Généré automatiquement'}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            error={errors.sku?.[0]}
            placeholder="Généré automatiquement"
            disabled={saving}
            helpText="Le SKU sera généré automatiquement lors de la création"
          />
          <FormInput
            label="Nom"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name?.[0]}
            required
            placeholder="Nom du produit"
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="Description du produit..."
            disabled={saving}
          />
          {errors.description?.[0] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description[0]}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Prix d'achat"
            name="purchase_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            error={errors.purchase_price?.[0]}
            placeholder="0.00"
            disabled={saving}
          />
          <FormInput
            label="Prix de vente"
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            value={formData.sale_price}
            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
            error={errors.sale_price?.[0]}
            placeholder="0.00"
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Devise
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={saving}
          >
            <option value="CFA">CFA (Franc CFA)</option>
            <option value="MAD">MAD (Dirham Marocain)</option>
          </select>
          {errors.currency?.[0] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currency[0]}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
            disabled={saving}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Produit actif
          </label>
        </div>

        {/* Aperçu de la marge */}
        {formData.purchase_price && formData.sale_price && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Aperçu de la marge :</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Marge dans la devise d'enregistrement */}
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Marge en {formData.currency} :</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  {formatCurrency(
                    parseFloat(formData.sale_price) - parseFloat(formData.purchase_price) || 0,
                    formData.currency
                  )}
                  {' '}
                  ({formData.sale_price > 0 
                    ? (((parseFloat(formData.sale_price) - parseFloat(formData.purchase_price)) / parseFloat(formData.sale_price)) * 100).toFixed(1)
                    : 0}%)
                </p>
              </div>
              {/* Marge en CFA (toujours présente) */}
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Marge en CFA :</p>
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                  {(() => {
                    const saleCFA = getPriceInCurrency(parseFloat(formData.sale_price) || 0, formData.currency, 'CFA');
                    const purchaseCFA = getPriceInCurrency(parseFloat(formData.purchase_price) || 0, formData.currency, 'CFA');
                    const marginCFA = saleCFA - purchaseCFA;
                    const marginPercent = saleCFA > 0 ? ((marginCFA / saleCFA) * 100).toFixed(1) : 0;
                    return `${formatCurrency(marginCFA, 'CFA')} (${marginPercent}%)`;
                  })()}
                </p>
              </div>
              {/* Marges dans les devises secondaires */}
              {secondaryCurrencies.map((currencyConfig) => {
                const currencyCode = currencyConfig.code;
                const saleInCurrency = getPriceInCurrency(parseFloat(formData.sale_price) || 0, formData.currency, currencyCode);
                const purchaseInCurrency = getPriceInCurrency(parseFloat(formData.purchase_price) || 0, formData.currency, currencyCode);
                const marginInCurrency = saleInCurrency - purchaseInCurrency;
                const marginPercent = saleInCurrency > 0 ? ((marginInCurrency / saleInCurrency) * 100).toFixed(1) : 0;
                
                return (
                  <div key={currencyCode}>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Marge en {currencyCode} :</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                      {formatCurrency(marginInCurrency, currencyCode)} ({marginPercent}%)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-semibold bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {saving ? 'Création...' : 'Créer et sélectionner'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductCreateModal;