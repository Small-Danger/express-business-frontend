import { useState, useEffect, useRef } from 'react';
import { clientService } from '../../services/api/business';
import ClientCreateModal from './ClientCreateModal';

/**
 * Composant de sélection de client avec autocomplete et création rapide
 */
const ClientSelect = ({
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  filterType = null, // 'business' ou 'express' pour filtrer les clients
  placeholder = 'Rechercher un client...',
  className = '',
  onClientCreated = null, // Callback quand un client est créé
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Charger les clients
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getAll({ per_page: 1000 });
      
      if (response.data.success) {
        const data = response.data.data;
        const clientsList = Array.isArray(data) ? data : (data?.data || []);
        
        // Filtrer par type si spécifié
        let filtered = clientsList;
        if (filterType === 'business') {
          filtered = clientsList.filter(c => c.is_business_client);
        } else if (filterType === 'express') {
          filtered = clientsList.filter(c => c.is_express_client);
        }
        
        setClients(filtered);
        setFilteredClients(filtered);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les clients en fonction de la recherche
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const phone = (client.phone || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      
      return fullName.includes(search) || phone.includes(search) || email.includes(search);
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  // Trouver le client sélectionné
  const selectedClient = clients.find(c => c.id.toString() === value?.toString());

  // Gérer la sélection d'un client
  const handleSelectClient = (client) => {
    onChange(client.id.toString());
    setSearchTerm('');
    setIsOpen(false);
  };

  // Gérer la création d'un nouveau client
  const handleCreateClient = async (newClient) => {
    // Ajouter le nouveau client à la liste
    const updatedClients = [...clients, newClient];
    setClients(updatedClients);
    setFilteredClients(updatedClients);
    
    // Sélectionner automatiquement le nouveau client
    handleSelectClient(newClient);
    
    // Fermer le modal
    setShowCreateModal(false);
    
    // Recharger la liste complète pour s'assurer que tout est à jour
    await loadClients();
    
    // Notifier le parent si callback fourni
    if (onClientCreated) {
      onClientCreated(newClient);
    }
  };

  // Extraire le nom depuis la recherche pour pré-remplir le formulaire
  const extractNameFromSearch = () => {
    const parts = searchTerm.trim().split(' ');
    if (parts.length >= 2) {
      return {
        first_name: parts[0],
        last_name: parts.slice(1).join(' '),
      };
    } else if (parts.length === 1) {
      return {
        first_name: parts[0],
        last_name: '',
      };
    }
    return {};
  };

  // Gérer les clics en dehors du composant
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Réinitialiser la recherche si un client est sélectionné
        if (selectedClient) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedClient]);

  // Formater l'affichage d'un client
  const formatClientDisplay = (client) => {
    return `${client.first_name} ${client.last_name} - ${client.phone || 'Pas de téléphone'}`;
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
            value={isOpen ? searchTerm : (selectedClient ? formatClientDisplay(selectedClient) : '')}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              // Si un client était sélectionné, le désélectionner
              if (selectedClient) {
                onChange('');
              }
            }}
            onFocus={() => {
              setIsOpen(true);
              if (selectedClient) {
                setSearchTerm('');
              }
            }}
            placeholder={selectedClient ? '' : placeholder}
            disabled={disabled || loading}
            className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 ${
              error ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'
            } ${disabled || loading ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''} ${className}`}
          />
          
          {/* Icône de recherche ou bouton d'effacement */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {selectedClient && !isOpen && (
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
            {(!selectedClient || isOpen) && (
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
            ) : filteredClients.length > 0 ? (
              <>
                {filteredClients.slice(0, 10).map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                      value === client.id.toString() ? 'bg-blue-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {client.phone || 'Pas de téléphone'}
                      {client.email && ` • ${client.email}`}
                    </div>
                  </button>
                ))}
                {filteredClients.length > 10 && (
                  <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                    ... et {filteredClients.length - 10} autres
                  </div>
                )}
              </>
            ) : searchTerm.trim() ? (
              <button
                type="button"
                onClick={() => {
                  const initialData = extractNameFromSearch();
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
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
                  Cliquez pour créer un nouveau client
                </div>
              </button>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Commencez à taper pour rechercher un client
              </div>
            )}
            
            {/* Bouton pour créer un nouveau client manuellement */}
            {searchTerm.trim() && (
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
                  <span>+ Créer un nouveau client</span>
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

      {/* Modal de création de client */}
      <ClientCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateClient}
        initialData={extractNameFromSearch()}
        defaultType={filterType}
      />
    </div>
  );
};

export default ClientSelect;

