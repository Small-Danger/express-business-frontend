import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expressWaveService } from '../../services/api/express';
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

  // Charger les vagues
  useEffect(() => {
    loadWaves();
  }, []);

  const loadWaves = async () => {
    try {
      setLoading(true);
      const response = await expressWaveService.getAll();
      if (response.data.success) {
        const responseData = response.data.data;
        let allWaves = [];
        if (Array.isArray(responseData)) {
          allWaves = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          allWaves = responseData.data;
        }
        // Filtrer pour exclure les vagues clôturées (elles sont dans Historiques)
        const activeWaves = allWaves.filter(wave => wave.status !== 'closed');
        setWaves(activeWaves);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des vagues:', error);
      setWaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Naviguer vers la page de gestion de la vague
  const handleManage = (wave) => {
    navigate(`/express/waves/${wave.id}`);
  };

  // Ouvrir le modal pour créer une nouvelle vague
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

  // Ouvrir le modal pour éditer une vague
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

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (wave) => {
    setSelectedWave(wave);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await expressWaveService.delete(selectedWave.id);
      await loadWaves();
      setIsDeleteDialogOpen(false);
      setSelectedWave(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression de la vague';
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
        response = await expressWaveService.update(selectedWave.id, formData);
      } else {
        // Créer
        response = await expressWaveService.create(formData);
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
      header: 'Trajets',
      accessor: (wave) => wave.trips_count || 0,
      render: (wave) => (
        <span className="text-sm font-medium text-gray-900">{wave.trips_count || 0}</span>
      ),
      sortable: true,
    },
    {
      header: 'Actions',
      accessor: () => null,
      render: (wave) => (
        <button
          onClick={() => handleManage(wave)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Gérer la vague
        </button>
      ),
      sortable: false,
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
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestion des Vagues Express</h1>
          <p className="text-green-100 dark:text-green-200 mt-1 text-sm sm:text-base font-medium">Gérez vos vagues de colis</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {/* Toggle vue cards/table */}
          <div className="flex items-center space-x-1 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-md' : 'text-white hover:bg-white/10 dark:hover:bg-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-md' : 'text-white hover:bg-white/10 dark:hover:bg-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => navigate('/express/waves/history')}
            className="w-full sm:w-auto px-4 py-2.5 bg-white/20 dark:bg-white/10 backdrop-blur-sm text-white rounded-lg sm:rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold border border-white/30 dark:border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Historiques</span>
          </button>
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-lg sm:rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouvelle vague</span>
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
              Aucune vague trouvée
            </div>
          ) : (
            waves.map((wave) => (
              <div key={wave.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-gray-100 dark:border-gray-700 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{wave.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Code: {wave.code}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(wave.status)}`}>
                    {formatStatus(wave.status)}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Date de début:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatDate(wave.start_date)}</span>
                  </div>
                  {wave.end_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Date de fin:</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatDate(wave.end_date)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Trajets:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{wave.trips_count || 0}</span>
                  </div>
                  {hasAnyRole(['boss', 'admin']) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Frais:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">{wave.costs_count || 0}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleManage(wave)}
                  className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Gérer la vague
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tableau des vagues */}
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
          emptyMessage="Aucune vague trouvée"
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
        title={selectedWave ? 'Modifier la vague' : 'Nouvelle vague'}
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
              placeholder="WAVE-EXPRESS-001"
              required
            />
            <FormInput
              label="Nom"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name?.[0]}
              required
              placeholder="Nom de la vague"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
        title="Supprimer la vague"
        message={`Êtes-vous sûr de vouloir supprimer la vague "${selectedWave?.name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Waves;