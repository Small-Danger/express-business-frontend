import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { accountService } from '../../services/api/treasury';
import { systemSettingService } from '../../services/api/system';
import { formatCurrency, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import DataTable from '../../components/shared/DataTable';

const AccountDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(63);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  useEffect(() => {
    loadAccountDetail();
  }, [id, pagination.current_page]);

  const loadAccountDetail = async () => {
    try {
      setLoading(true);
      const [accountRes, transactionsRes, exchangeRateRes] = await Promise.all([
        accountService.getById(id),
        accountService.getTransactions(id, { page: pagination.current_page, per_page: pagination.per_page }),
        systemSettingService.getExchangeRate(),
      ]);

      if (accountRes.data.success) {
        setAccount(accountRes.data.data.account);
        if (accountRes.data.data.current_balance !== undefined) {
          setAccount((prev) => ({ ...prev, current_balance: accountRes.data.data.current_balance }));
        }
      }

      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.data.data || []);
        setPagination({
          current_page: transactionsRes.data.data.current_page || 1,
          per_page: transactionsRes.data.data.per_page || 15,
          total: transactionsRes.data.data.total || 0,
          last_page: transactionsRes.data.data.last_page || 1,
        });
      }

      if (exchangeRateRes.data.success) {
        setExchangeRate(parseFloat(exchangeRateRes.data.data) || 63);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      debit: 'Débit',
      credit: 'Crédit',
      transfer_out: 'Transfert Sortant',
      transfer_in: 'Transfert Entrant',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      debit: 'bg-red-100 text-red-800',
      credit: 'bg-green-100 text-green-800',
      transfer_out: 'bg-orange-100 text-orange-800',
      transfer_in: 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      orange_money: 'Orange Money',
      cih_bank: 'CIH Bank',
    };
    return labels[type] || type;
  };

  const columns = [
    { key: 'reference', label: 'Référence' },
    { key: 'created_at', label: 'Date', render: (value) => formatDate(value, 'DD/MM/YYYY HH:mm') },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTransactionTypeColor(value)}`}>
          {getTransactionTypeLabel(value)}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (value, row) => formatCurrency(value, row.currency),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value || '-',
    },
  ];

  if (loading && !account) {
    return <LoadingSpinner />;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Compte introuvable</p>
        <button
          onClick={() => navigate('/treasury/accounts')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Retour à la trésorerie
        </button>
      </div>
    );
  }

  const alternativeCurrency = account.currency === 'CFA' ? 'MAD' : 'CFA';
  const balanceInAlternative = account.currency === 'CFA'
    ? account.current_balance / exchangeRate
    : account.current_balance * exchangeRate;

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Détails du Compte</h1>
        </div>
      </div>

      {/* Informations du compte */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 mb-4">{account.name}</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 font-medium">Type :</span>
                <span className="ml-2 font-bold text-gray-800">{getAccountTypeLabel(account.type)}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 font-medium">Devise :</span>
                <span className="ml-2 font-bold text-gray-800">{account.currency}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 font-medium">Statut :</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {account.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-4">Soldes</h3>
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-md">
                <div className="text-sm text-blue-600 mb-1 font-semibold">Solde actuel ({account.currency})</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-800">
                  {formatCurrency(account.current_balance || 0, account.currency)}
                </div>
              </div>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 shadow-md">
                <div className="text-sm text-gray-600 mb-1 font-semibold">Équivalent en {alternativeCurrency}</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {formatCurrency(balanceInAlternative, alternativeCurrency)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {account.notes && (
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-600">{account.notes}</p>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800">Historique des Transactions</h2>
        </div>
        {loading && transactions.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            data={transactions}
            columns={columns}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, current_page: page })}
          />
        )}
        {transactions.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            Aucune transaction trouvée
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetail;

