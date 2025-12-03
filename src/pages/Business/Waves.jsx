import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessWaveService } from '../../services/api/business';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate, formatStatus, getStatusClass } from '../../utils/helpers';

const Waves = () => {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [waves, setWaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWave, setSelectedWave] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_date: '',
    status: 'open',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les convois
  useEffect(() => {
    loadWaves();
  }, []);

  const loadWaves = async () => {
    try {
      setLoading(true);
      const response = await businessWaveService.getAll();
      if (response.data.success) {
        const responseData = response.data.data;
        let allWaves = [];
        if (Array.isArray(responseData)) {
          allWaves = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          allWaves = responseData.data;
        }
        // Filtrer pour exclure les convois clôturés (ils sont dans Historiques)
        const activeWaves = allWaves.filter(wave => wave.status !== 'closed');
        setWaves(activeWaves);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des convois:', error);
      setWaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le modal pour créer un nouveau convoi
  const handleCreate = () => {
    setSelectedWave(null);
    setFormData({
      name: '',
      code: '',
      start_date: '',
      status: 'open',
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour éditer un convoi
  const handleEdit = (wave) => {
    setSelectedWave(wave);
    setFormData({
      name: wave.name || '',
      code: wave.code || '',
      start_date: wave.start_date ? wave.start_date.split('T')[0] : '',
      status: wave.status || 'open',
      notes: wave.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Naviguer vers la page de gestion du convoi
  const handleManage = (wave) => {
    navigate(`/business/waves/${wave.id}`);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (wave) => {
    setSelectedWave(wave);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await businessWaveService.delete(selectedWave.id);
      await loadWaves();
      setIsDeleteDialogOpen(false);
      setSelectedWave(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression du convoi';
      alert(message);
    }
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      let response;
      if (selectedWave) {
        // Modifier
        response = await businessWaveService.update(selectedWave.id, formData);
      } else {
        // Créer
        response = await businessWaveService.create(formData);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadWaves();
        setSelectedWave(null);
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
      accessor: (wave) => wave.code,
      sortable: true,
    },
    {
      header: 'Nom',
      accessor: (wave) => wave.name,
      sortable: true,
    },
    {
      header: 'Date de début',
      accessor: (wave) => wave.start_date,
      format: 'date',
      sortable: true,
    },
    {
      header: 'Date de fin',
      accessor: (wave) => wave.end_date,
      format: 'date',
      render: (wave) => wave.end_date ? formatDate(wave.end_date) : '-',
      sortable: true,
    },
    {
      header: 'Statut',
      accessor: (wave) => wave.status,
      format: 'status',
      render: (wave) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(wave.status)}`}>
          {formatStatus(wave.status)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Commandes',
      accessor: (wave) => wave.orders_count || 0,
      render: (wave) => (
        <span className="text-sm font-medium text-gray-900">{wave.orders_count || 0}</span>
      ),
      sortable: true,
    },
    {
      header: 'Trajets',
      accessor: (wave) => wave.convoys_count || 0,
      render: (wave) => (
        <span className="text-sm font-medium text-gray-900">{wave.convoys_count || 0}</span>
      ),
      sortable: true,
    },
    // Colonne Frais (Boss et Admin uniquement)
    ...(hasAnyRole(['boss', 'admin']) ? [{
      header: 'Frais',
      accessor: (wave) => wave.costs_count || 0,
      render: (wave) => (
        <span className="text-sm font-medium text-gray-900">{wave.costs_count || 0}</span>
      ),
      sortable: true,
    }] : []),
    {
      header: 'Créé le',
      accessor: (wave) => wave.created_at,
      format: 'date',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Ajouter et toggle vue */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestion des Convois Business</h1>
          <p className="text-orange-100 dark:text-orange-200 mt-1 text-sm sm:text-base font-medium">Gérez vos convois de commandes</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {/* Toggle vue cards/table */}
          <div className="flex items-center space-x-1 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-md' : 'text-white hover:bg-white/10 dark:hover:bg-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-md' : 'text-white hover:bg-white/10 dark:hover:bg-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => navigate('/business/waves/history')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white/20 dark:bg-white/10 backdrop-blur-sm text-white rounded-lg sm:rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold border border-white/30 dark:border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Historiques</span>
          </button>
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg sm:rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouveau convoi</span>
          </button>
        </div>
      </div>

      {/* Affichage en cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : waves.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              Aucun convoi trouvé
            </div>
          ) : (
            waves.map((wave) => {
              // Statistiques des trajets par statut (depuis les trajets chargés ou depuis les counts si disponibles)
              const trajetsByStatus = {
                planned: wave.convoys ? wave.convoys.filter(c => c.status === 'planned').length : 0,
                in_transit: wave.convoys ? wave.convoys.filter(c => c.status === 'in_transit').length : 0,
                arrived: wave.convoys ? wave.convoys.filter(c => c.status === 'arrived').length : 0,
                closed: wave.convoys ? wave.convoys.filter(c => c.status === 'closed').length : 0,
              };

              return (
                <div key={wave.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 transform hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{wave.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{wave.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(wave.status)}`}>
                      {formatStatus(wave.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(wave.start_date)} - {wave.end_date ? formatDate(wave.end_date) : 'En cours'}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Commandes</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{wave.orders_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Trajets</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{wave.convoys_count || 0}</p>
                        </div>
                      </div>

                      {wave.convoys_count > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Statut des trajets :</p>
                          <div className="flex flex-wrap gap-2">
                            {convoysByStatus.planned > 0 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {convoysByStatus.planned} Planifié{convoysByStatus.planned > 1 ? 's' : ''}
                              </span>
                            )}
                            {convoysByStatus.in_transit > 0 && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                {convoysByStatus.in_transit} En transit
                              </span>
                            )}
                            {convoysByStatus.arrived > 0 && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                {convoysByStatus.arrived} Arrivé{convoysByStatus.arrived > 1 ? 's' : ''}
                              </span>
                            )}
                            {convoysByStatus.closed > 0 && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                {convoysByStatus.closed} Fermé{convoysByStatus.closed > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(wave)}
                      className="text-sm text-orange-600 hover:text-orange-800 flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleManage(wave)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>Gérer le convoi</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Affichage en tableau */}
      {viewMode === 'table' && (
        <DataTable
          data={waves}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchable={true}
          pagination={true}
          itemsPerPage={10}
          emptyMessage="Aucun convoi trouvé"
        />
      )}

      {/* Modal pour créer/éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedWave(null);
          setErrors({});
        }}
        title={selectedWave ? 'Modifier le convoi' : 'Nouveau convoi'}
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
              placeholder="WAVE-001"
              required
            />
            <FormInput
              label="Nom"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name?.[0]}
              required
              placeholder="Nom du convoi"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Date de début"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              error={errors.start_date?.[0]}
              required
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Brouillon</option>
              <option value="open">Ouverte</option>
              <option value="closed">Fermée</option>
            </select>
            {errors.status?.[0] && <p className="mt-1 text-sm text-red-600">{errors.status[0]}</p>}
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes additionnelles..."
            />
            {errors.notes?.[0] && <p className="mt-1 text-sm text-red-600">{errors.notes[0]}</p>}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedWave(null);
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>{selectedWave ? 'Modifier' : 'Créer'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedWave(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le convoi"
        message={`Êtes-vous sûr de vouloir supprimer le convoi "${selectedWave?.name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Waves;
