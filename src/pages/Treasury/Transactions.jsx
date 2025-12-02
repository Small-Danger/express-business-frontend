import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financialTransactionService } from '../../services/api/treasury';
import { formatCurrency, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import DataTable from '../../components/shared/DataTable';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    account_id: '',
    transaction_type: '',
    transaction_category: '',
    start_date: '',
    end_date: '',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  useEffect(() => {
    loadTransactions();
  }, [pagination.current_page, filters]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      };

      const response = await financialTransactionService.getAll(params);
      if (response.data.success) {
        setTransactions(response.data.data.data || []);
        setPagination({
          current_page: response.data.data.current_page || 1,
          per_page: response.data.data.per_page || 15,
          total: response.data.data.total || 0,
          last_page: response.data.data.last_page || 1,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, current_page: 1 });
  };

  const handleResetFilters = () => {
    setFilters({
      account_id: '',
      transaction_type: '',
      transaction_category: '',
      start_date: '',
      end_date: '',
    });
    setPagination({ ...pagination, current_page: 1 });
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

  const getCategoryLabel = (category) => {
    const labels = {
      order_purchase: 'Achat Commande',
      order_payment: 'Paiement Commande',
      order_pickup_payment: 'Paiement Récupération',
      convoy_cost: 'Frais Convoi',
      parcel_deposit: 'Dépôt Colis',
      parcel_pickup_payment: 'Paiement Récupération Colis',
      trip_cost: 'Frais Trajet',
      wave_cost: 'Frais Vague',
      transfer_conversion: 'Transfert Inter-comptes',
    };
    return labels[category] || category;
  };

  const columns = [
    {
      header: 'Référence',
      accessor: (row) => row.reference || '-',
    },
    {
      header: 'Date',
      accessor: (row) => row.created_at,
      format: 'date',
    },
    {
      header: 'Compte',
      accessor: (row) => row.account,
      render: (row) => (row.account ? `${row.account.name} (${row.account.type})` : '-'),
    },
    {
      header: 'Type',
      accessor: (row) => row.transaction_type,
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTransactionTypeColor(row.transaction_type)}`}>
          {getTransactionTypeLabel(row.transaction_type)}
        </span>
      ),
    },
    {
      header: 'Catégorie',
      accessor: (row) => row.transaction_category,
      render: (row) => getCategoryLabel(row.transaction_category),
    },
    {
      header: 'Montant',
      accessor: (row) => row.amount,
      render: (row) => formatCurrency(row.amount, row.currency),
    },
    {
      header: 'Description',
      accessor: (row) => row.description || '-',
    },
    {
      header: 'Créé par',
      accessor: (row) => row.created_by,
      render: (row) => (row.created_by ? row.created_by.name : '-'),
    },
  ];

  if (loading && transactions.length === 0) {
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Transactions Financières</h1>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="h-5 sm:h-6 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800">Filtres</h2>
          </div>
          {(filters.account_id || filters.transaction_type || filters.transaction_category || filters.start_date || filters.end_date) && (
            <button
              onClick={handleResetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Compte</label>
            <input
              type="text"
              value={filters.account_id}
              onChange={(e) => handleFilterChange('account_id', e.target.value)}
              placeholder="ID du compte"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
            <select
              value={filters.transaction_type}
              onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium"
            >
              <option value="">Tous</option>
              <option value="debit">Débit</option>
              <option value="credit">Crédit</option>
              <option value="transfer_out">Transfert Sortant</option>
              <option value="transfer_in">Transfert Entrant</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
            <input
              type="text"
              value={filters.transaction_category}
              onChange={(e) => handleFilterChange('transaction_category', e.target.value)}
              placeholder="Catégorie"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date début</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date fin</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <DataTable
          data={transactions}
          columns={columns}
          loading={loading}
          pagination={false}
          searchable={false}
          emptyMessage="Aucune transaction trouvée"
        />
        
        {/* Pagination personnalisée pour pagination côté serveur */}
        {pagination.last_page > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> à{' '}
              <span className="font-medium">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
              </span>{' '}
              sur <span className="font-medium">{pagination.total}</span> résultats
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page - 1 })}
                disabled={pagination.current_page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Précédent
              </button>
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                .filter((page) => {
                  if (pagination.last_page <= 7) return true;
                  return (
                    page === 1 ||
                    page === pagination.last_page ||
                    (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                  );
                })
                .map((page, index, array) => (
                  <div key={page} className="flex items-center space-x-1">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => setPagination({ ...pagination, current_page: page })}
                      className={`px-4 py-2 border rounded-lg ${
                        pagination.current_page === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))}
              <button
                onClick={() => setPagination({ ...pagination, current_page: pagination.current_page + 1 })}
                disabled={pagination.current_page === pagination.last_page}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message si aucune transaction */}
      {transactions.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-lg">Aucune transaction trouvée</p>
        </div>
      )}
    </div>
  );
};

export default Transactions;

