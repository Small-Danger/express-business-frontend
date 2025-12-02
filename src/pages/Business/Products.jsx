import { useState, useEffect } from 'react';
import { productService } from '../../services/api/business';
import { systemSettingService } from '../../services/api/system';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/helpers';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewedProduct, setViewedProduct] = useState(null);
  const [filters, setFilters] = useState({
    currency: '',
    is_active: '',
  });
  const [secondaryCurrencies, setSecondaryCurrencies] = useState([]); // Devises secondaires (MAD, EUR, etc.)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    purchase_price: '',
    sale_price: '',
    currency: 'CFA',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les produits et les devises secondaires
  useEffect(() => {
    loadSecondaryCurrencies();
  }, []);

  // Recharger les produits quand les filtres changent
  useEffect(() => {
    loadProducts();
  }, [filters]);

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

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Ajouter les filtres aux paramètres
      if (filters.currency) params.currency = filters.currency;
      if (filters.is_active !== '') params.is_active = filters.is_active === 'true';
      
      const response = await productService.getAll(params);
      if (response.data.success) {
        // Gérer la pagination Laravel : data peut être un tableau ou un objet de pagination
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setProducts(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          // Pagination Laravel : extraire le tableau des données
          setProducts(responseData.data);
        } else {
          setProducts([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le modal pour créer un nouveau produit
  const handleCreate = () => {
    setSelectedProduct(null);
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
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour voir les détails d'un produit
  const handleView = async (product) => {
    try {
      const response = await productService.getById(product.id);
      if (response.data.success) {
        setViewedProduct(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du produit:', error);
      alert('Erreur lors du chargement des informations du produit');
    }
  };

  // Ouvrir le modal pour éditer un produit
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      purchase_price: product.purchase_price || '',
      sale_price: product.sale_price || '',
      currency: product.currency || 'MAD',
      is_active: product.is_active !== undefined ? product.is_active : true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      currency: '',
      is_active: '',
    });
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await productService.delete(selectedProduct.id);
      await loadProducts();
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du produit');
    }
  };

  // Fonctions de conversion
  // Convertir un montant de sa devise d'origine vers CFA
  const convertToCFA = (amount, fromCurrency) => {
    if (fromCurrency === 'CFA') return amount;
    
    // Trouver le taux de change pour cette devise vers CFA
    // Exemple: 1 MAD = 63 CFA, donc 100 MAD * 63 = 6300 CFA
    const currencyConfig = secondaryCurrencies.find(c => c.code === fromCurrency);
    if (currencyConfig) {
      return amount * currencyConfig.rate_to_cfa;
    }
    
    return amount; // Si pas de taux, retourner tel quel
  };

  // Convertir un montant de CFA vers une devise cible
  const convertFromCFA = (amountCFA, targetCurrency) => {
    if (targetCurrency === 'CFA') return amountCFA;
    
    // Trouver le taux de change pour cette devise depuis CFA
    // Exemple: 1 MAD = 63 CFA, donc 6300 CFA / 63 = 100 MAD
    const currencyConfig = secondaryCurrencies.find(c => c.code === targetCurrency);
    if (currencyConfig) {
      return amountCFA / currencyConfig.rate_to_cfa;
    }
    
    return amountCFA; // Si pas de taux, retourner tel quel
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

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Convertir les prix en nombres
      const dataToSend = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
      };

      // Si SKU est vide et c'est une création, ne pas l'envoyer (génération auto côté backend)
      if (!selectedProduct && (!dataToSend.sku || dataToSend.sku.trim() === '' || dataToSend.sku === 'Généré automatiquement')) {
        delete dataToSend.sku;
      }

      let response;
      if (selectedProduct) {
        // Modifier
        response = await productService.update(selectedProduct.id, dataToSend);
      } else {
        // Créer
        response = await productService.create(dataToSend);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadProducts();
        setSelectedProduct(null);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  // Générer les colonnes du tableau dynamiquement
  const generateColumns = () => {
    const baseColumns = [
      {
        header: 'SKU',
        accessor: (product) => product.sku,
        sortable: true,
      },
      {
        header: 'Nom',
        accessor: (product) => product.name,
        sortable: true,
      },
      // Colonne CFA (toujours présente - devise par défaut)
      {
        header: 'Prix d\'achat (CFA)',
        accessor: (product) => getPriceInCurrency(product.purchase_price, product.currency, 'CFA'),
        render: (product) => {
          const priceCFA = getPriceInCurrency(product.purchase_price, product.currency, 'CFA');
          return formatCurrency(priceCFA, 'CFA');
        },
        sortable: true,
      },
      {
        header: 'Prix de vente (CFA)',
        accessor: (product) => getPriceInCurrency(product.sale_price, product.currency, 'CFA'),
        render: (product) => {
          const priceCFA = getPriceInCurrency(product.sale_price, product.currency, 'CFA');
          return formatCurrency(priceCFA, 'CFA');
        },
        sortable: true,
      },
      {
        header: 'Marge (CFA)',
        accessor: (product) => {
          const purchaseCFA = getPriceInCurrency(product.purchase_price, product.currency, 'CFA');
          const saleCFA = getPriceInCurrency(product.sale_price, product.currency, 'CFA');
          const margin = saleCFA - purchaseCFA;
          return margin > 0 ? margin : 0;
        },
        render: (product) => {
          const purchaseCFA = getPriceInCurrency(product.purchase_price, product.currency, 'CFA');
          const saleCFA = getPriceInCurrency(product.sale_price, product.currency, 'CFA');
          const margin = saleCFA - purchaseCFA;
          const marginPercent = saleCFA > 0 
            ? ((margin / saleCFA) * 100).toFixed(1) 
            : 0;
          return margin > 0 
            ? `${formatCurrency(margin, 'CFA')} (${marginPercent}%)`
            : '-';
        },
        sortable: true,
      },
    ];

    // Ajouter les colonnes pour chaque devise secondaire
    const secondaryCurrencyColumns = [];
    secondaryCurrencies.forEach((currencyConfig) => {
      const currencyCode = currencyConfig.code;
      
      // Colonne prix d'achat pour cette devise
      secondaryCurrencyColumns.push({
        header: `Prix d'achat (${currencyCode})`,
        accessor: (product) => getPriceInCurrency(product.purchase_price, product.currency, currencyCode),
        render: (product) => {
          const priceInCurrency = getPriceInCurrency(product.purchase_price, product.currency, currencyCode);
          return formatCurrency(priceInCurrency, currencyCode);
        },
        sortable: true,
      });

      // Colonne prix de vente pour cette devise
      secondaryCurrencyColumns.push({
        header: `Prix de vente (${currencyCode})`,
        accessor: (product) => getPriceInCurrency(product.sale_price, product.currency, currencyCode),
        render: (product) => {
          const priceInCurrency = getPriceInCurrency(product.sale_price, product.currency, currencyCode);
          return formatCurrency(priceInCurrency, currencyCode);
        },
        sortable: true,
      });

      // Colonne marge pour cette devise
      secondaryCurrencyColumns.push({
        header: `Marge (${currencyCode})`,
        accessor: (product) => {
          const purchaseInCurrency = getPriceInCurrency(product.purchase_price, product.currency, currencyCode);
          const saleInCurrency = getPriceInCurrency(product.sale_price, product.currency, currencyCode);
          const margin = saleInCurrency - purchaseInCurrency;
          return margin > 0 ? margin : 0;
        },
        render: (product) => {
          const purchaseInCurrency = getPriceInCurrency(product.purchase_price, product.currency, currencyCode);
          const saleInCurrency = getPriceInCurrency(product.sale_price, product.currency, currencyCode);
          const margin = saleInCurrency - purchaseInCurrency;
          const marginPercent = saleInCurrency > 0 
            ? ((margin / saleInCurrency) * 100).toFixed(1) 
            : 0;
          return margin > 0 
            ? `${formatCurrency(margin, currencyCode)} (${marginPercent}%)`
            : '-';
        },
        sortable: true,
      });
    });

    // Colonnes finales (statut, date)
    const finalColumns = [
      {
        header: 'Statut',
        accessor: (product) => product.is_active ? 'active' : 'inactive',
        render: (product) => (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            product.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {product.is_active ? 'Actif' : 'Inactif'}
          </span>
        ),
        sortable: true,
      },
      {
        header: 'Créé le',
        accessor: (product) => product.created_at,
        format: 'date',
        sortable: true,
      },
    ];

    // Combiner toutes les colonnes
    return [...baseColumns, ...secondaryCurrencyColumns, ...finalColumns];
  };

  // Générer les colonnes à chaque fois que les devises secondaires changent
  const columns = generateColumns();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestion des Produits</h1>
          <p className="text-orange-100 dark:text-orange-200 mt-1 text-sm sm:text-base font-medium">Gérez votre catalogue de produits</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg sm:rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouveau produit</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className="h-5 sm:h-6 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Filtres</h2>
          </div>
          {(filters.currency || filters.is_active !== '') && (
            <button 
              onClick={handleResetFilters} 
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter-currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Devise
            </label>
            <select
              id="filter-currency"
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Toutes les devises</option>
              <option value="CFA">CFA</option>
              <option value="MAD">MAD</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statut
            </label>
            <select
              id="filter-status"
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des produits */}
      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucun produit trouvé"
      />

      {/* Modal pour créer/éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
          setErrors({});
        }}
        title={selectedProduct ? 'Modifier le produit' : 'Nouveau produit'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="SKU"
              name="sku"
              value={formData.sku || (selectedProduct ? '' : 'Généré automatiquement')}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              error={errors.sku?.[0]}
              placeholder={selectedProduct ? "SKU-001" : "Généré automatiquement"}
              disabled={!selectedProduct}
              helpText={selectedProduct ? "Vous pouvez modifier le SKU" : "Le SKU sera généré automatiquement lors de la création"}
            />
            <FormInput
              label="Nom"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name?.[0]}
              required
              placeholder="Nom du produit"
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
                      <p className="text-xs text-blue-600 mb-1">Marge en {currencyCode} :</p>
                      <p className="text-sm text-blue-700 font-medium">
                        {formatCurrency(marginInCurrency, currencyCode)} ({marginPercent}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedProduct(null);
                setErrors({});
              }}
              className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-semibold bg-white dark:bg-gray-800"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>{selectedProduct ? 'Modifier' : 'Créer'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pour voir les détails d'un produit */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewedProduct(null);
        }}
        title={`Détails du produit - ${viewedProduct?.sku || ''}`}
        size="lg"
      >
        {viewedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">SKU</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewedProduct.sku || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nom</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{viewedProduct.name || '-'}</p>
              </div>
            </div>

            {viewedProduct.description && (
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Description</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewedProduct.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Prix d'achat</p>
                <p className="text-sm text-gray-600">{formatCurrency(viewedProduct.purchase_price, viewedProduct.currency)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Prix de vente</p>
                <p className="text-sm text-gray-600">{formatCurrency(viewedProduct.sale_price, viewedProduct.currency)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Devise</p>
                <p className="text-sm text-gray-600">{viewedProduct.currency || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Statut</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  viewedProduct.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {viewedProduct.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            {/* Marge */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">Marge</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Marge en {viewedProduct.currency} :</p>
                  <p className="text-sm font-medium text-gray-900">
                    {(() => {
                      const margin = viewedProduct.sale_price - viewedProduct.purchase_price;
                      const marginPercent = viewedProduct.sale_price > 0 
                        ? ((margin / viewedProduct.sale_price) * 100).toFixed(1) 
                        : 0;
                      return `${formatCurrency(margin, viewedProduct.currency)} (${marginPercent}%)`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Marge en CFA :</p>
                  <p className="text-sm font-medium text-gray-900">
                    {(() => {
                      const purchaseCFA = getPriceInCurrency(viewedProduct.purchase_price, viewedProduct.currency, 'CFA');
                      const saleCFA = getPriceInCurrency(viewedProduct.sale_price, viewedProduct.currency, 'CFA');
                      const marginCFA = saleCFA - purchaseCFA;
                      const marginPercent = saleCFA > 0 ? ((marginCFA / saleCFA) * 100).toFixed(1) : 0;
                      return `${formatCurrency(marginCFA, 'CFA')} (${marginPercent}%)`;
                    })()}
                  </p>
                </div>
                {secondaryCurrencies.map((currencyConfig) => {
                  const currencyCode = currencyConfig.code;
                  const purchaseInCurrency = getPriceInCurrency(viewedProduct.purchase_price, viewedProduct.currency, currencyCode);
                  const saleInCurrency = getPriceInCurrency(viewedProduct.sale_price, viewedProduct.currency, currencyCode);
                  const marginInCurrency = saleInCurrency - purchaseInCurrency;
                  const marginPercent = saleInCurrency > 0 ? ((marginInCurrency / saleInCurrency) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={currencyCode}>
                      <p className="text-xs text-gray-600">Marge en {currencyCode} :</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(marginInCurrency, currencyCode)} ({marginPercent}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-800">Créé le</p>
                <p className="text-sm text-gray-600">{formatDate(viewedProduct.created_at)}</p>
              </div>
              {viewedProduct.updated_at && (
                <div>
                  <p className="text-sm font-semibold text-gray-800">Modifié le</p>
                  <p className="text-sm text-gray-600">{formatDate(viewedProduct.updated_at)}</p>
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewedProduct(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewedProduct);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Modifier
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer le produit "${selectedProduct?.name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Products;
