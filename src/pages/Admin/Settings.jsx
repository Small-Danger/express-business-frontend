import { useState, useEffect } from 'react';
import { systemSettingService } from '../../services/api/system';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/helpers';

const Settings = () => {
  const [settings, setSettings] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    type: 'string',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les paramètres et le taux de change
  useEffect(() => {
    loadSettings();
    loadExchangeRate();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await systemSettingService.getAll();
      if (response.data.success) {
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setSettings(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setSettings(responseData.data);
        } else {
          setSettings([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      setLoadingExchangeRate(true);
      const response = await systemSettingService.getExchangeRate();
      if (response.data.success) {
        setExchangeRate(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du taux de change:', error);
      setExchangeRate(null);
    } finally {
      setLoadingExchangeRate(false);
    }
  };

  // Ouvrir le modal pour créer un nouveau paramètre
  const handleCreate = () => {
    setSelectedSetting(null);
    setFormData({
      key: '',
      value: '',
      type: 'string',
      description: '',
      is_active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour éditer un paramètre
  const handleEdit = (setting) => {
    setSelectedSetting(setting);
    setFormData({
      key: setting.key || '',
      value: setting.value || '',
      type: setting.type || 'string',
      description: setting.description || '',
      is_active: setting.is_active !== undefined ? setting.is_active : true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (setting) => {
    setSelectedSetting(setting);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await systemSettingService.delete(selectedSetting.id);
      await loadSettings();
      setIsDeleteDialogOpen(false);
      setSelectedSetting(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du paramètre');
    }
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Convertir la valeur selon le type
      let valueToSend = formData.value;
      if (formData.type === 'boolean') {
        valueToSend = formData.value === 'true' || formData.value === true ? '1' : '0';
      }

      const dataToSend = {
        ...formData,
        value: valueToSend,
      };

      let response;
      if (selectedSetting) {
        // Modifier
        response = await systemSettingService.update(selectedSetting.id, dataToSend);
      } else {
        // Créer
        response = await systemSettingService.create(dataToSend);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadSettings();
        if (formData.key === 'mad_to_cfa_rate') {
          await loadExchangeRate();
        }
        setSelectedSetting(null);
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

  // Obtenir le libellé du type
  const getTypeLabel = (type) => {
    const types = {
      string: 'Texte',
      integer: 'Nombre entier',
      decimal: 'Nombre décimal',
      boolean: 'Oui/Non',
    };
    return types[type] || type;
  };

  // Obtenir le type d'input selon le type
  const getInputType = (type) => {
    switch (type) {
      case 'integer':
        return 'number';
      case 'decimal':
        return 'number';
      case 'boolean':
        return 'select';
      default:
        return 'text';
    }
  };

  // Colonnes du tableau
  const columns = [
    {
      header: 'Clé',
      accessor: (setting) => setting.key,
      sortable: true,
    },
    {
      header: 'Valeur',
      accessor: (setting) => setting.value,
      render: (setting) => {
        if (setting.type === 'boolean') {
          return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              setting.value === '1' || setting.value === 'true' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {setting.value === '1' || setting.value === 'true' ? 'Oui' : 'Non'}
            </span>
          );
        }
        if (setting.type === 'decimal' && setting.key.includes('rate')) {
          return formatCurrency(parseFloat(setting.value || 0), 'CFA');
        }
        return <span className="text-sm text-gray-900">{setting.value}</span>;
      },
      sortable: true,
    },
    {
      header: 'Type',
      accessor: (setting) => setting.type,
      render: (setting) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
          {getTypeLabel(setting.type)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Description',
      accessor: (setting) => setting.description,
      render: (setting) => (
        <span className="text-sm text-gray-600">{setting.description || '-'}</span>
      ),
      sortable: false,
    },
    {
      header: 'Statut',
      accessor: (setting) => setting.is_active,
      render: (setting) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          setting.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {setting.is_active ? 'Actif' : 'Inactif'}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Modifié le',
      accessor: (setting) => setting.updated_at,
      format: 'date',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Paramètres Système</h1>
          <p className="text-blue-100 mt-1 text-sm sm:text-base font-medium">Gérez les paramètres de l'application</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouveau paramètre</span>
        </button>
      </div>

      {/* Taux de change */}
      {exchangeRate && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Taux de Change</h3>
              <p className="text-sm text-gray-600 font-medium">MAD vers CFA</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">
                1 MAD = {exchangeRate.rate} CFA
              </p>
            </div>
            <div className="bg-blue-100 rounded-full p-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des paramètres */}
      <DataTable
        data={settings}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucun paramètre trouvé"
      />

      {/* Modal pour créer/éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSetting(null);
          setErrors({});
        }}
        title={selectedSetting ? 'Modifier le paramètre' : 'Nouveau paramètre'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Clé"
              name="key"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              error={errors.key?.[0]}
              required
              placeholder="mad_to_cfa_rate"
              disabled={!!selectedSetting}
            />
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => {
                  setFormData({ ...formData, type: e.target.value, value: '' });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!selectedSetting}
                required
              >
                <option value="string">Texte</option>
                <option value="integer">Nombre entier</option>
                <option value="decimal">Nombre décimal</option>
                <option value="boolean">Oui/Non</option>
              </select>
              {errors.type?.[0] && <p className="mt-1 text-sm text-red-600">{errors.type[0]}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
              Valeur <span className="text-red-500">*</span>
            </label>
            {formData.type === 'boolean' ? (
              <select
                id="value"
                name="value"
                value={formData.value === '1' || formData.value === 'true' || formData.value === true ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            ) : formData.type === 'decimal' || formData.type === 'integer' ? (
              <input
                type="number"
                id="value"
                name="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                step={formData.type === 'decimal' ? '0.01' : '1'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder={formData.type === 'decimal' ? '0.00' : '0'}
              />
            ) : (
              <input
                type="text"
                id="value"
                name="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Valeur du paramètre"
              />
            )}
            {errors.value?.[0] && <p className="mt-1 text-sm text-red-600">{errors.value[0]}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description du paramètre..."
            />
            {errors.description?.[0] && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Paramètre actif
            </label>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedSetting(null);
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
                <span>{selectedSetting ? 'Modifier' : 'Créer'}</span>
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
          setSelectedSetting(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le paramètre"
        message={`Êtes-vous sûr de vouloir supprimer le paramètre "${selectedSetting?.key}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Settings;
