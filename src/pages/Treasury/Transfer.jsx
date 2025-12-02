import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountService, financialTransactionService } from '../../services/api/treasury';
import { systemSettingService } from '../../services/api/system';
import { formatCurrency } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import FormInput from '../../components/shared/FormInput';
import Modal from '../../components/shared/Modal';

const Transfer = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(63);
  const [formData, setFormData] = useState({
    source_account_id: '',
    destination_account_id: '',
    source_amount: '',
    source_currency: '',
    destination_amount: '',
    destination_currency: '',
    exchange_rate: '',
    description: '',
  });
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Charger le taux de change par défaut si non spécifié
    if (!formData.exchange_rate && exchangeRate) {
      setFormData({ ...formData, exchange_rate: exchangeRate });
    }
  }, [exchangeRate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, exchangeRateRes] = await Promise.all([
        accountService.getAll(),
        systemSettingService.getExchangeRate(),
      ]);

      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data || []);
      }

      if (exchangeRateRes.data.success) {
        const rate = parseFloat(exchangeRateRes.data.data) || 63;
        setExchangeRate(rate);
        setFormData({ ...formData, exchange_rate: rate });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    // Si le compte source change, mettre à jour la devise source
    if (field === 'source_account_id') {
      const sourceAccount = accounts.find((acc) => acc.id === parseInt(value));
      if (sourceAccount) {
        newFormData.source_currency = sourceAccount.currency;
      }
    }

    // Si le compte destination change, mettre à jour la devise destination
    if (field === 'destination_account_id') {
      const destinationAccount = accounts.find((acc) => acc.id === parseInt(value));
      if (destinationAccount) {
        newFormData.destination_currency = destinationAccount.currency;
      }
    }

    // Si le montant source ou le taux change, calculer le montant destination
    if (field === 'source_amount' || field === 'exchange_rate') {
      if (newFormData.source_amount && newFormData.exchange_rate) {
        const sourceAmount = parseFloat(newFormData.source_amount);
        const rate = parseFloat(newFormData.exchange_rate);

        if (newFormData.source_currency === 'CFA' && newFormData.destination_currency === 'MAD') {
          newFormData.destination_amount = (sourceAmount / rate).toFixed(2);
        } else if (newFormData.source_currency === 'MAD' && newFormData.destination_currency === 'CFA') {
          newFormData.destination_amount = (sourceAmount * rate).toFixed(2);
        } else {
          // Même devise, pas de conversion
          newFormData.destination_amount = sourceAmount.toFixed(2);
        }
      }
    }

    setFormData(newFormData);
    setErrors({ ...errors, [field]: '' });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.source_account_id) {
      newErrors.source_account_id = 'Le compte source est requis';
    }

    if (!formData.destination_account_id) {
      newErrors.destination_account_id = 'Le compte destination est requis';
    }

    if (formData.source_account_id === formData.destination_account_id) {
      newErrors.destination_account_id = 'Le compte destination doit être différent du compte source';
    }

    if (!formData.source_amount || parseFloat(formData.source_amount) <= 0) {
      newErrors.source_amount = 'Le montant source doit être supérieur à 0';
    }

    if (!formData.exchange_rate || parseFloat(formData.exchange_rate) <= 0) {
      newErrors.exchange_rate = 'Le taux de change doit être supérieur à 0';
    }

    if (!formData.destination_amount || parseFloat(formData.destination_amount) <= 0) {
      newErrors.destination_amount = 'Le montant destination est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      setSaving(true);
      const response = await financialTransactionService.transfer({
        source_account_id: parseInt(formData.source_account_id),
        destination_account_id: parseInt(formData.destination_account_id),
        source_amount: parseFloat(formData.source_amount),
        source_currency: formData.source_currency,
        destination_amount: parseFloat(formData.destination_amount),
        destination_currency: formData.destination_currency,
        exchange_rate: parseFloat(formData.exchange_rate),
        description: formData.description,
      });

      if (response.data.success) {
        alert('Transfert effectué avec succès !');
        navigate('/treasury/accounts');
      } else {
        alert('Erreur lors du transfert : ' + (response.data.message || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur lors du transfert:', error);
      alert('Erreur lors du transfert : ' + (error.response?.data?.message || 'Erreur inconnue'));
    } finally {
      setSaving(false);
      setShowConfirmModal(false);
    }
  };

  const sourceAccount = accounts.find((acc) => acc.id === parseInt(formData.source_account_id));
  const destinationAccount = accounts.find((acc) => acc.id === parseInt(formData.destination_account_id));

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <button
            onClick={() => navigate('/treasury/accounts')}
            className="text-white/90 hover:text-white flex items-center space-x-2 mb-3 sm:mb-4 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Retour à la trésorerie</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Transfert Inter-comptes</h1>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Compte source */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Compte Source <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.source_account_id}
              onChange={(e) => handleChange('source_account_id', e.target.value)}
              className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium ${
                errors.source_account_id ? 'border-red-500' : 'border-gray-200'
              }`}
            >
              <option value="">Sélectionner un compte</option>
              {accounts
                .filter((acc) => acc.is_active)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type}) - {account.currency}
                  </option>
                ))}
            </select>
            {errors.source_account_id && <p className="mt-1 text-sm text-red-500">{errors.source_account_id}</p>}
            {sourceAccount && (
              <p className="mt-1 text-sm text-gray-500">
                Solde actuel : {formatCurrency(sourceAccount.current_balance, sourceAccount.currency)}
              </p>
            )}
          </div>

          {/* Compte destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compte Destination <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.destination_account_id}
              onChange={(e) => handleChange('destination_account_id', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.destination_account_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner un compte</option>
              {accounts
                .filter((acc) => acc.is_active && acc.id !== parseInt(formData.source_account_id))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type}) - {account.currency}
                  </option>
                ))}
            </select>
            {errors.destination_account_id && (
              <p className="mt-1 text-sm text-red-500">{errors.destination_account_id}</p>
            )}
            {destinationAccount && (
              <p className="mt-1 text-sm text-gray-500">
                Solde actuel : {formatCurrency(destinationAccount.current_balance, destinationAccount.currency)}
              </p>
            )}
          </div>

          {/* Montant source */}
          <div>
            <FormInput
              label="Montant Source"
              type="number"
              step="0.01"
              value={formData.source_amount}
              onChange={(e) => handleChange('source_amount', e.target.value)}
              error={errors.source_amount}
              required
            />
            {sourceAccount && (
              <p className="mt-1 text-sm text-gray-500">Devise : {sourceAccount.currency}</p>
            )}
          </div>

          {/* Taux de change */}
          <div>
            <FormInput
              label="Taux de Change"
              type="number"
              step="0.01"
              value={formData.exchange_rate}
              onChange={(e) => handleChange('exchange_rate', e.target.value)}
              error={errors.exchange_rate}
              required
              helpText="1 MAD = X CFA"
            />
          </div>

          {/* Montant destination (calculé automatiquement) */}
          <div>
            <FormInput
              label="Montant Destination (calculé)"
              type="number"
              step="0.01"
              value={formData.destination_amount}
              onChange={(e) => handleChange('destination_amount', e.target.value)}
              error={errors.destination_amount}
              required
              disabled
            />
            {destinationAccount && (
              <p className="mt-1 text-sm text-gray-500">Devise : {destinationAccount.currency}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description optionnelle du transfert"
            />
          </div>
        </div>

        {/* Résumé */}
        {formData.source_amount && formData.destination_amount && sourceAccount && destinationAccount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Résumé du transfert :</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                Débiter <strong>{formatCurrency(parseFloat(formData.source_amount), sourceAccount.currency)}</strong>{' '}
                du compte <strong>{sourceAccount.name}</strong>
              </p>
              <p>
                Créditer <strong>{formatCurrency(parseFloat(formData.destination_amount), destinationAccount.currency)}</strong>{' '}
                sur le compte <strong>{destinationAccount.name}</strong>
              </p>
              <p>
                Taux utilisé : <strong>1 MAD = {formData.exchange_rate} CFA</strong>
              </p>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/treasury/accounts')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Effectuer le transfert'}
          </button>
        </div>
      </form>

      {/* Modal de confirmation */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmer le transfert"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir effectuer ce transfert inter-comptes ?
          </p>
          {sourceAccount && destinationAccount && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Source :</strong> {sourceAccount.name} -{' '}
                  {formatCurrency(parseFloat(formData.source_amount), sourceAccount.currency)}
                </p>
                <p>
                  <strong>Destination :</strong> {destinationAccount.name} -{' '}
                  {formatCurrency(parseFloat(formData.destination_amount), destinationAccount.currency)}
                </p>
                <p>
                  <strong>Taux :</strong> 1 MAD = {formData.exchange_rate} CFA
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmTransfer}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Traitement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transfer;

