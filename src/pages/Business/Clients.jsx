import { useState, useEffect } from 'react';
import { clientService } from '../../services/api/business';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate } from '../../utils/helpers';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewedClient, setViewedClient] = useState(null);
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    clientType: '', // 'business', 'express', 'both', ''
  });
  const [formData, setFormData] = useState({
    code: '',
    first_name: '',
    last_name: '',
    phone: '',
    whatsapp_phone: '',
    email: '',
    country: '',
    city: '',
    address: '',
    is_business_client: false,
    is_express_client: false,
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Extraire les pays et villes uniques pour les filtres
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  // Charger les clients avec filtres
  useEffect(() => {
    loadClients();
  }, [filters]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Ajouter les filtres aux paramètres
      if (filters.country) params.country = filters.country;
      if (filters.city) params.city = filters.city;
      if (filters.clientType) params.client_type = filters.clientType;
      
      const response = await clientService.getAll(params);
      if (response.data.success) {
        // Gérer la pagination Laravel : data peut être un tableau ou un objet de pagination
        const responseData = response.data.data;
        let clientsData = [];
        if (Array.isArray(responseData)) {
          clientsData = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          // Pagination Laravel : extraire le tableau des données
          clientsData = responseData.data;
        }
        
        setClients(clientsData);
        
        // Extraire les pays uniques pour les filtres (depuis tous les clients chargés)
        const uniqueCountries = [...new Set(clientsData.map(c => c.country).filter(Boolean))].sort();
        setCountries(uniqueCountries);
        
        // Filtrer les villes selon le pays sélectionné
        if (filters.country) {
          const filteredCities = [...new Set(
            clientsData
              .filter(c => c.country === filters.country)
              .map(c => c.city)
              .filter(Boolean)
          )].sort();
          setCities(filteredCities);
        } else {
          // Si pas de filtre pays, afficher toutes les villes
          const uniqueCities = [...new Set(clientsData.map(c => c.city).filter(Boolean))].sort();
          setCities(uniqueCities);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setClients([]); // S'assurer que clients reste un tableau en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le modal pour créer un nouveau client
  const handleCreate = () => {
    setSelectedClient(null);
    setFormData({
      code: '',
      first_name: '',
      last_name: '',
      phone: '',
      whatsapp_phone: '',
      email: '',
      country: '',
      city: '',
      address: '',
      is_business_client: false,
      is_express_client: false,
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour voir les informations d'un client
  const handleView = async (client) => {
    try {
      const response = await clientService.getById(client.id);
      if (response.data.success) {
        setViewedClient(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du client:', error);
      alert('Erreur lors du chargement des informations du client');
    }
  };

  // Ouvrir le modal pour éditer un client
  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      code: client.code || '',
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      phone: client.phone || '',
      whatsapp_phone: client.whatsapp_phone || '',
      email: client.email || '',
      country: client.country || '',
      city: client.city || '',
      address: client.address || '',
      is_business_client: client.is_business_client || false,
      is_express_client: client.is_express_client || false,
      notes: client.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      country: '',
      city: '',
      clientType: '',
    });
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await clientService.delete(selectedClient.id);
      await loadClients();
      setIsDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du client');
    }
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    // Validation frontend : au moins un type doit être sélectionné
    if (!formData.is_business_client && !formData.is_express_client) {
      setErrors({
        is_business_client: ['Le client doit être au moins Business ou Express.']
      });
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      // Préparer les données (ne pas envoyer code si vide, il sera généré automatiquement)
      const dataToSend = { ...formData };
      if (!dataToSend.code || dataToSend.code.trim() === '') {
        delete dataToSend.code;
      }

      let response;
      if (selectedClient) {
        // Modifier
        response = await clientService.update(selectedClient.id, dataToSend);
      } else {
        // Créer
        response = await clientService.create(dataToSend);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadClients();
        setSelectedClient(null);
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

  // Colonnes du tableau
  const columns = [
    {
      header: 'Code',
      accessor: (client) => client.code,
      sortable: true,
    },
    {
      header: 'Nom complet',
      accessor: (client) => `${client.first_name} ${client.last_name}`,
      sortable: true,
    },
    {
      header: 'Téléphone',
      accessor: (client) => client.phone,
      sortable: true,
    },
    {
      header: 'Email',
      accessor: (client) => client.email,
      sortable: true,
    },
    {
      header: 'Ville',
      accessor: (client) => client.city,
      sortable: true,
    },
    {
      header: 'Types',
      accessor: (client) => {
        const types = [];
        if (client.is_business_client) types.push('Business');
        if (client.is_express_client) types.push('Express');
        return types.join(', ') || '-';
      },
      sortable: false,
    },
    {
      header: 'Créé le',
      accessor: (client) => client.created_at,
      format: 'date',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestion des Clients</h1>
          <p className="text-orange-100 dark:text-orange-200 mt-1 text-sm sm:text-base font-medium">Gérez vos clients Business et Express</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg sm:rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouveau client</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className="h-5 sm:h-6 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Filtres</h2>
          </div>
          {(filters.country || filters.city || filters.clientType) && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filter-client-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de client
            </label>
            <select
              id="filter-client-type"
              value={filters.clientType}
              onChange={(e) => setFilters({ ...filters, clientType: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tous</option>
              <option value="business">Business uniquement</option>
              <option value="express">Express uniquement</option>
              <option value="both">Business et Express</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="filter-country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pays
            </label>
            <select
              id="filter-country"
              value={filters.country}
              onChange={(e) => {
                setFilters({ ...filters, country: e.target.value, city: '' });
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Tous les pays</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="filter-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ville
            </label>
            <select
              id="filter-city"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={!filters.country}
            >
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des clients */}
      <DataTable
        data={clients}
        columns={columns}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucun client trouvé"
      />

      {/* Modal pour créer/éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
          setErrors({});
        }}
        title={selectedClient ? 'Modifier le client' : 'Nouveau client'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Code"
              name="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={errors.code?.[0]}
              placeholder="Code du client (auto-généré si vide)"
              helpText="Laissez vide pour génération automatique"
            />
            <FormInput
              label="Prénom"
              name="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={errors.first_name?.[0]}
              required
            />
          </div>

          <FormInput
            label="Nom"
            name="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            error={errors.last_name?.[0]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={errors.phone?.[0]}
              placeholder="+212 6XX XXX XXX"
            />
            <FormInput
              label="WhatsApp"
              name="whatsapp_phone"
              value={formData.whatsapp_phone}
              onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
              error={errors.whatsapp_phone?.[0]}
              placeholder="+212 6XX XXX XXX"
            />
          </div>

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email?.[0]}
            placeholder="email@example.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Pays"
              name="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              error={errors.country?.[0]}
              placeholder="Maroc"
            />
            <FormInput
              label="Ville"
              name="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              error={errors.city?.[0]}
              placeholder="Casablanca"
            />
          </div>

          <FormInput
            label="Adresse"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            error={errors.address?.[0]}
            placeholder="Adresse complète"
          />

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_business_client}
                onChange={(e) => setFormData({ ...formData, is_business_client: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Business</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_express_client}
                onChange={(e) => setFormData({ ...formData, is_express_client: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Express</span>
            </label>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
              placeholder="Notes additionnelles..."
            />
            {errors.notes?.[0] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.notes[0]}</p>}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedClient(null);
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
                <span>{selectedClient ? 'Modifier' : 'Créer'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pour voir les informations d'un client */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewedClient(null);
        }}
        title={`Informations du client - ${viewedClient?.code || ''}`}
        size="lg"
      >
        {viewedClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Code</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{viewedClient.code || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Nom complet</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {viewedClient.first_name} {viewedClient.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Téléphone</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{viewedClient.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{viewedClient.whatsapp_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900">{viewedClient.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pays</p>
                <p className="font-medium text-gray-900">{viewedClient.country || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ville</p>
                <p className="font-medium text-gray-900">{viewedClient.city || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Types</p>
                <div className="flex space-x-2 mt-1">
                  {viewedClient.is_business_client && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Business
                    </span>
                  )}
                  {viewedClient.is_express_client && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Express
                    </span>
                  )}
                  {!viewedClient.is_business_client && !viewedClient.is_express_client && (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>
            </div>
            
            {viewedClient.address && (
              <div>
                <p className="text-sm text-gray-600">Adresse</p>
                <p className="font-medium text-gray-900">{viewedClient.address}</p>
              </div>
            )}
            
            {viewedClient.notes && (
              <div>
                <p className="text-sm text-gray-600">Notes</p>
                <p className="font-medium text-gray-900">{viewedClient.notes}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-600">Créé le</p>
                <p className="font-medium text-gray-900">
                  {formatDate(viewedClient.created_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Modifié le</p>
                <p className="font-medium text-gray-900">
                  {formatDate(viewedClient.updated_at)}
                </p>
              </div>
            </div>

            {/* Statistiques (si disponibles) */}
            {(viewedClient.business_orders_count !== undefined || viewedClient.express_parcels_count !== undefined) && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Statistiques</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewedClient.business_orders_count !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Commandes Business</p>
                      <p className="font-medium text-gray-900">{viewedClient.business_orders_count || 0}</p>
                    </div>
                  )}
                  {viewedClient.express_parcels_count !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Colis Express</p>
                      <p className="font-medium text-gray-900">{viewedClient.express_parcels_count || 0}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewedClient(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewedClient);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
          setSelectedClient(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le client"
        message={`Êtes-vous sûr de vouloir supprimer le client "${selectedClient?.first_name} ${selectedClient?.last_name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Clients;
