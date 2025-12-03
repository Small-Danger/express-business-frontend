import { useState, useEffect, useRef } from 'react';
import { productService } from '../../services/api/business';
import ProductCreateModal from './ProductCreateModal';
import { formatCurrency } from '../../utils/helpers';

/**
 * Composant de sélection de produit avec autocomplete et création rapide
 */
const ProductSelect = ({
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  currency = null, // Filtrer par devise (optionnel, si null affiche tous les produits)
  placeholder = 'Rechercher un produit...',
  className = '',
  onProductCreated = null, // Callback quand un produit est créé
  onProductSelected = null, // Callback quand un produit est sélectionné (retourne le produit complet)
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Charger les produits
  useEffect(() => {
    loadProducts();
  }, [currency]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Charger TOUS les produits actifs (sans filtre par devise au niveau API)
      // On affichera tous les produits, mais on priorisera ceux de la devise de la commande
      const params = { per_page: 1000, is_active: true };
      
      const response = await productService.getAll(params);
      
      if (response.data.success) {
        const data = response.data.data;
        // Gérer la pagination Laravel : data peut être un tableau ou un objet de pagination
        let productsList = [];
        if (Array.isArray(data)) {
          productsList = data;
        } else if (data?.data && Array.isArray(data.data)) {
          productsList = data.data;
        }
        
        // Trier les produits : ceux de la devise de la commande en premier si spécifiée
        if (currency && productsList.length > 0) {
          productsList.sort((a, b) => {
            const aMatches = a.currency === currency ? 1 : 0;
            const bMatches = b.currency === currency ? 1 : 0;
            return bMatches - aMatches; // Les produits correspondants en premier
          });
        }
        
        setProducts(productsList);
        setFilteredProducts(productsList);
        
        // Log pour déboguer
        const matchingCurrency = currency ? productsList.filter(p => p.currency === currency).length : 0;
        console.log(`ProductSelect: ${productsList.length} produits chargés${currency ? ` (${matchingCurrency} en ${currency})` : ''}`);
      } else {
        console.error('Erreur lors du chargement des produits:', response.data);
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      console.error('Détails de l\'erreur:', error.response?.data || error.message);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les produits en fonction de la recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      
      return name.includes(search) || sku.includes(search) || description.includes(search);
    });

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Trouver le produit sélectionné
  const selectedProduct = products.find(p => p.id.toString() === value?.toString());

  // Gérer la sélection d'un produit
  const handleSelectProduct = (product) => {
    onChange(product.id.toString());
    setSearchTerm('');
    setIsOpen(false);
    if (onProductSelected) {
      onProductSelected(product);
    }
  };

  // Gérer la création d'un nouveau produit
  const handleCreateProduct = async (newProduct) => {
    // Ajouter le nouveau produit à la liste
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
    
    // Sélectionner automatiquement le nouveau produit
    handleSelectProduct(newProduct);
    
    // Fermer le modal
    setShowCreateModal(false);
    
    // Recharger la liste complète pour s'assurer que tout est à jour
    await loadProducts();
    
    // Notifier le parent si callback fourni
    if (onProductCreated) {
      onProductCreated(newProduct);
    }
  };

  // Gérer les clics en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Réinitialiser la recherche si un produit est sélectionné
        if (selectedProduct) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedProduct]);

  // Formater l'affichage d'un produit
  const formatProductDisplay = (product) => {
    if (!product) return '';
    return `${product.name}${product.sku ? ` (${product.sku})` : ''} - ${formatCurrency(product.sale_price || 0, product.currency || 'CFA')}`;
  };

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
        </label>
      )}

      <div ref={wrapperRef} className="relative">
        {/* Champ de recherche */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : (selectedProduct ? formatProductDisplay(selectedProduct) : '')}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              // Si un produit était sélectionné, le désélectionner
              if (selectedProduct) {
                onChange('');
              }
            }}
            onFocus={() => {
              setIsOpen(true);
              if (selectedProduct) {
                setSearchTerm('');
              }
            }}
            placeholder={selectedProduct ? '' : placeholder}
            disabled={disabled || loading}
            className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 ${
              error ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
            } ${disabled || loading ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''} ${className}`}
          />
          
          {/* Icône de recherche ou bouton d'effacement */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {selectedProduct && !isOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Effacer la sélection"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {(!selectedProduct || isOpen) && (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Dropdown avec résultats */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Chargement...
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {filteredProducts.slice(0, 10).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                      value === product.id.toString() ? 'bg-blue-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {product.sku && `${product.sku} • `}
                      {formatCurrency(product.sale_price || 0, product.currency || 'CFA')}
                      {product.currency && ` (${product.currency})`}
                    </div>
                  </button>
                ))}
                {filteredProducts.length > 10 && (
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                    ... et {filteredProducts.length - 10} autres
                  </div>
                )}
                {/* Toujours afficher l'option de création en bas */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(true);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>+ Créer un nouveau produit</span>
                  </button>
                </div>
              </>
            ) : searchTerm.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Créer "{searchTerm.trim()}"
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cliquez pour créer un nouveau produit
                </div>
              </button>
            ) : (
              <div className="px-4 py-3">
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
                  {currency 
                    ? `Aucun produit actif en ${currency} trouvé`
                    : 'Aucun produit actif trouvé'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 border-t border-gray-200 dark:border-gray-700 pt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Créer un nouveau produit</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Champ caché pour le formulaire */}
        <input
          type="hidden"
          value={value || ''}
          name={label?.toLowerCase().replace(/\s+/g, '_')}
          required={required}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Modal de création de produit */}
      <ProductCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateProduct}
        initialData={{ name: searchTerm.trim() }}
        defaultCurrency={currency}
      />
    </div>
  );
};

export default ProductSelect;

