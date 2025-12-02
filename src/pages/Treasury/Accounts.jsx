import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountService, financialTransactionService } from '../../services/api/treasury';
import { formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../config/axios';
import { systemSettingService } from '../../services/api/system';

const Accounts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(63);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    account_number: '',
    bank_name: '',
    type: 'orange_money',
    currency: 'CFA',
    initial_balance: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, summaryRes, exchangeRateRes] = await Promise.all([
        accountService.getAll(),
        financialTransactionService.getSummary(),
        systemSettingService.getExchangeRate(),
      ]);

      if (accountsRes.data.success) {
        const accountsData = accountsRes.data.data || [];
        console.log('Comptes chargés:', accountsData.length, 'comptes', accountsData);
        setAccounts(accountsData);
        if (accountsData.length === 0) {
          console.warn('Aucun compte actif trouvé. Vérifiez que les comptes ont is_active = true');
        }
      } else {
        console.error('Erreur lors du chargement des comptes:', accountsRes.data);
        alert('Erreur lors du chargement des comptes: ' + (accountsRes.data.message || 'Erreur inconnue'));
      }

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }

      if (exchangeRateRes.data.success) {
        setExchangeRate(parseFloat(exchangeRateRes.data.data) || 63);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = (accountId) => {
    navigate(`/treasury/accounts/${accountId}`);
  };

  const handleNewTransfer = () => {
    navigate('/treasury/transfer');
  };

  const handleViewTransactions = () => {
    navigate('/treasury/transactions');
  };

  const handleCreateAccount = () => {
    setSelectedAccount(null);
    setFormData({
      name: '',
      account_number: '',
      bank_name: '',
      type: 'orange_money',
      currency: 'CFA',
      initial_balance: '',
      is_active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name || '',
      account_number: account.account_number || '',
      bank_name: account.bank_name || '',
      type: account.type || 'orange_money',
      currency: account.currency || 'CFA',
      initial_balance: account.initial_balance || '',
      is_active: account.is_active !== undefined ? account.is_active : true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteAccount = (account) => {
    setSelectedAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveAccount = async () => {
    try {
      setSaving(true);
      setErrors({});
      
      const dataToSend = {
        ...formData,
        initial_balance: parseFloat(formData.initial_balance) || 0,
      };

      let response;
      if (selectedAccount) {
        response = await accountService.update(selectedAccount.id, dataToSend);
      } else {
        response = await accountService.create(dataToSend);
      }

      if (response.data.success) {
        console.log('Compte sauvegardé avec succès:', response.data.data);
        // Afficher un message de succès immédiatement
        alert(selectedAccount ? 'Compte modifié avec succès !' : 'Compte créé avec succès !');
        // Fermer le modal
        setIsModalOpen(false);
        setSelectedAccount(null);
        // Réinitialiser le formulaire
        setFormData({
          name: '',
          account_number: '',
          bank_name: '',
          type: 'orange_money',
          currency: 'CFA',
          initial_balance: '',
          is_active: true,
        });
        setErrors({});
        // Attendre un peu pour s'assurer que le backend a terminé
        await new Promise(resolve => setTimeout(resolve, 500));
        // Recharger les données pour afficher le nouveau compte
        await loadData();
      } else {
        console.error('Erreur lors de la sauvegarde:', response.data);
        alert(response.data.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la sauvegarde';
        alert(errorMessage);
        console.error('Détails de l\'erreur:', error.response?.data);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      await accountService.delete(selectedAccount.id);
      setIsDeleteDialogOpen(false);
      setSelectedAccount(null);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      orange_money: 'Orange Money',
      cih_bank: 'CIH Bank',
    };
    return labels[type] || type;
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      orange_money: 'bg-orange-500',
      cih_bank: 'bg-blue-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getAlternativeCurrency = (currency) => {
    return currency === 'CFA' ? 'MAD' : 'CFA';
  };

  const convertBalance = (balance, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return balance;
    if (fromCurrency === 'CFA' && toCurrency === 'MAD') {
      return balance / exchangeRate;
    }
    if (fromCurrency === 'MAD' && toCurrency === 'CFA') {
      return balance * exchangeRate;
    }
    return balance;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête avec résumé global */}
      {summary && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-800 dark:to-purple-800 rounded-xl shadow-2xl p-3 sm:p-4 text-white">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="h-6 sm:h-7 w-1 bg-white/30 dark:bg-white/20 rounded-full"></div>
            <h2 className="text-lg sm:text-xl font-extrabold">Résumé de la Trésorerie</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 dark:border-white/10">
              <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total CFA</div>
              <div className="text-xl sm:text-2xl font-extrabold">{formatCurrency(summary.total_cfa, 'CFA')}</div>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 dark:border-white/10">
              <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total MAD</div>
              <div className="text-xl sm:text-2xl font-extrabold">{formatCurrency(summary.total_mad, 'MAD')}</div>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 dark:border-white/10">
              <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total Global (CFA)</div>
              <div className="text-xl sm:text-2xl font-extrabold">{formatCurrency(summary.total_global_cfa, 'CFA')}</div>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 dark:border-white/10">
              <div className="text-xs sm:text-sm font-semibold opacity-90 mb-1">Total Global (MAD)</div>
              <div className="text-xl sm:text-2xl font-extrabold">{formatCurrency(summary.total_global_mad, 'MAD')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'actions */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {user?.role === 'admin' && (
          <button
            onClick={handleCreateAccount}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouveau compte</span>
          </button>
        )}
        <button
          onClick={handleNewTransfer}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Nouveau transfert</span>
        </button>
        <button
          onClick={handleViewTransactions}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg sm:rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Voir toutes les transactions</span>
        </button>
      </div>

      {/* Cartes des comptes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const alternativeCurrency = getAlternativeCurrency(account.currency);
          const balanceInAlternative = convertBalance(account.current_balance, account.currency, alternativeCurrency);

          return (
            <div
              key={account.id}
              onClick={() => handleAccountClick(account.id)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer p-4 border-l-4 transform hover:-translate-y-1"
              style={{ borderLeftColor: account.type === 'orange_money' ? '#f97316' : '#3b82f6' }}
            >
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-full ${getAccountTypeColor(account.type)} flex items-center justify-center text-white font-bold text-sm`}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">{account.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  account.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {account.is_active ? 'Actif' : 'Inactif'}
                </div>
              </div>

              {/* Solde principal */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Solde actuel</div>
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {formatCurrency(account.current_balance, account.currency)}
                </div>
              </div>

              {/* Solde équivalent */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Équivalent en {alternativeCurrency}</div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {formatCurrency(balanceInAlternative, alternativeCurrency)}
                </div>
              </div>

              {/* Badge devise */}
              <div className="mt-4">
                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs font-semibold">
                  {account.currency}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucun compte */}
      {accounts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center border border-gray-100 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Aucun compte configuré</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Contactez un administrateur pour créer des comptes</p>
        </div>
      )}

      {/* Modal pour créer/éditer un compte */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAccount(null);
          setErrors({});
        }}
        title={selectedAccount ? 'Modifier le compte' : 'Nouveau compte'}
        size="md"
      >
        <div className="space-y-4">
          <FormInput
            label="Nom du compte"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name?.[0]}
            required
            placeholder="Ex: Orange Money Principal"
          />

          <FormInput
            label="Numéro de compte"
            name="account_number"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            error={errors.account_number?.[0]}
            placeholder="Numéro de compte (optionnel)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de compte <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="orange_money">Orange Money</option>
              <option value="cih_bank">CIH Bank</option>
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type[0]}</p>}
          </div>

          {formData.type === 'cih_bank' && (
            <FormInput
              label="Nom de la banque"
              name="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              error={errors.bank_name?.[0]}
              placeholder="Ex: CIH Bank"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.currency ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="CFA">CFA</option>
              <option value="MAD">MAD</option>
            </select>
            {errors.currency && <p className="mt-1 text-sm text-red-500">{errors.currency[0]}</p>}
          </div>

          <FormInput
            label="Solde initial"
            name="initial_balance"
            type="number"
            step="0.01"
            value={formData.initial_balance}
            onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
            error={errors.initial_balance?.[0]}
            placeholder="0.00"
            helpText={selectedAccount ? 'Le solde initial ne peut pas être modifié après création' : 'Solde de départ du compte'}
            disabled={!!selectedAccount}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Compte actif
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedAccount(null);
                setErrors({});
              }}
              className="px-5 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveAccount}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {saving ? 'Enregistrement...' : selectedAccount ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedAccount(null);
        }}
        onConfirm={confirmDeleteAccount}
        title="Supprimer le compte"
        message={`Êtes-vous sûr de vouloir supprimer le compte "${selectedAccount?.name}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Accounts;

