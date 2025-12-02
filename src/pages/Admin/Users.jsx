import { useState, useEffect } from 'react';
import { userService } from '../../services/api/system';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'secretary',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getAll();
      if (response.data.success) {
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setUsers(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setUsers(responseData.data);
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir le modal pour créer un nouvel utilisateur
  const handleCreate = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'secretary',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour éditer un utilisateur
  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'secretary',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await userService.delete(selectedUser.id);
      await loadUsers();
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur';
      alert(message);
    }
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Valider les mots de passe
      if (!selectedUser && formData.password !== formData.confirmPassword) {
        setErrors({ password: ['Les mots de passe ne correspondent pas'] });
        return;
      }

      if (!selectedUser && formData.password.length < 8) {
        setErrors({ password: ['Le mot de passe doit contenir au moins 8 caractères'] });
        return;
      }

      // Préparer les données (exclure confirmPassword)
      const { confirmPassword, ...dataToSend } = formData;
      
      // Si c'est une modification et pas de nouveau mot de passe, ne pas envoyer password
      if (selectedUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      let response;
      if (selectedUser) {
        // Modifier
        response = await userService.update(selectedUser.id, dataToSend);
      } else {
        // Créer
        response = await userService.create(dataToSend);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadUsers();
        setSelectedUser(null);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'secretary',
        });
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

  // Obtenir le libellé du rôle
  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Administrateur',
      boss: 'Directeur',
      secretary: 'Secrétaire',
      traveler: 'Voyageur',
    };
    return roles[role] || role;
  };

  // Colonnes du tableau
  const columns = [
    {
      header: 'Nom',
      accessor: (user) => user.name,
      sortable: true,
    },
    {
      header: 'Email',
      accessor: (user) => user.email,
      sortable: true,
    },
    {
      header: 'Rôle',
      accessor: (user) => user.role,
      render: (user) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
          {getRoleLabel(user.role)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Créé le',
      accessor: (user) => user.created_at,
      format: 'date',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gestion des Utilisateurs</h1>
          <p className="text-blue-100 dark:text-blue-200 mt-1 text-sm sm:text-base font-medium">Gérez les accès et permissions</p>
        </div>
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      {/* Tableau des utilisateurs */}
      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucun utilisateur trouvé"
      />

      {/* Modal pour créer/éditer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
          setErrors({});
        }}
        title={selectedUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="md"
      >
        <div className="space-y-4">
          <FormInput
            label="Nom"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name?.[0]}
            required
            placeholder="Nom complet"
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email?.[0]}
            required
            placeholder="email@example.com"
          />

          {!selectedUser && (
            <>
              <FormInput
                label="Mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password?.[0]}
                required
                placeholder="Minimum 8 caractères"
              />

              <FormInput
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                error={errors.confirmPassword?.[0]}
                required
                placeholder="Retapez le mot de passe"
              />
            </>
          )}

          {selectedUser && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Laisser le mot de passe vide pour ne pas le modifier. Sinon, remplissez les champs ci-dessous.
              </p>
            </div>
          )}

          {selectedUser && (
            <>
              <FormInput
                label="Nouveau mot de passe (optionnel)"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password?.[0]}
                placeholder="Laisser vide pour ne pas modifier"
              />

              {formData.password && (
                <FormInput
                  label="Confirmer le nouveau mot de passe"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  error={errors.confirmPassword?.[0]}
                  placeholder="Retapez le nouveau mot de passe"
                />
              )}
            </>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rôle <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="admin">Administrateur</option>
              <option value="boss">Directeur</option>
              <option value="secretary">Secrétaire</option>
              <option value="traveler">Voyageur</option>
            </select>
            {errors.role?.[0] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role[0]}</p>}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedUser(null);
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
                <span>{selectedUser ? 'Modifier' : 'Créer'}</span>
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
          setSelectedUser(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer l'utilisateur "${selectedUser?.name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Users;
