import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { businessWaveService } from '../../services/api/business';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/shared/DataTable';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate, formatStatus, getStatusClass } from '../../utils/helpers';

const WavesHistory = () => {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [waves, setWaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'

  // Charger les convois clôturés
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
        // Filtrer uniquement les convois clôturés
        const closedWaves = allWaves.filter(wave => wave.status === 'closed');
        setWaves(closedWaves);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des convois clôturés:', error);
      setWaves([]);
    } finally {
      setLoading(false);
    }
  };

  // Naviguer vers la page de gestion du convoi
  const handleManage = (wave) => {
    navigate(`/business/waves/${wave.id}`);
  };

  // Calculer les statuts des trajets pour l'affichage
  const getConvoysByStatus = (wave) => {
    const convoys = wave.convoys || [];
    return {
      planned: convoys.filter(c => c.status === 'planned').length,
      in_transit: convoys.filter(c => c.status === 'in_transit').length,
      arrived: convoys.filter(c => c.status === 'arrived').length,
      closed: convoys.filter(c => c.status === 'closed').length,
    };
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
    {
      header: 'Actions',
      accessor: (wave) => wave.id,
      render: (wave) => (
        <button
          onClick={() => handleManage(wave)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Voir détails
        </button>
      ),
      sortable: false,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec bouton Retour et toggle vue */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <Link to="/business/waves" className="text-sm text-blue-100 hover:text-white mb-2 inline-block font-medium">
            ← Retour aux convois
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Historique des Convois Clôturés</h1>
        </div>
        <div className="flex items-center space-x-3">
          {/* Toggle vue cards/table */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Message si aucun convoi clôturé */}
      {!loading && waves.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-100">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Aucun convoi clôturé</p>
          <p className="text-sm text-gray-500">Il n'y a pas encore de convois clôturés dans le système.</p>
        </div>
      )}

      {/* Affichage en cards */}
      {viewMode === 'cards' && waves.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {waves.map((wave) => {
            const convoysByStatus = getConvoysByStatus(wave);
            return (
              <div key={wave.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-gray-100 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{wave.name}</h3>
                    <p className="text-sm text-gray-500">Code: {wave.code}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(wave.status)}`}>
                    {formatStatus(wave.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Début: {formatDate(wave.start_date)}</span>
                  </div>
                  {wave.end_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Fin: {formatDate(wave.end_date)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Commandes</p>
                        <p className="font-semibold text-gray-900">{wave.orders_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Trajets</p>
                        <p className="font-semibold text-gray-900">{wave.convoys_count || 0}</p>
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

                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleManage(wave)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Voir détails</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Affichage en tableau */}
      {viewMode === 'table' && waves.length > 0 && (
        <DataTable
          data={waves}
          columns={columns}
          loading={loading}
          searchable={true}
          pagination={true}
          itemsPerPage={10}
          emptyMessage="Aucun convoi clôturé trouvé"
        />
      )}
    </div>
  );
};

export default WavesHistory;

