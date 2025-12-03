import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { expressWaveService, expressTripService } from '../../services/api/express';
import { systemSettingService } from '../../services/api/system';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDate, formatStatus, getStatusClass, formatCurrency } from '../../utils/helpers';

const ExpressWaveDetail = () => {
  const { hasAnyRole } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [wave, setWave] = useState(null);
  const [trips, setTrips] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(63.0); // Taux par défaut: 1 MAD = 63 CFA
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'
  const [formData, setFormData] = useState({
    name: '',
    direction: 'A_to_B',
    from_country: '',
    from_city: '',
    to_country: '',
    to_city: '',
    planned_date: '',
    actual_date: '',
    traveler_name: '',
    status: 'planned',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Charger le convoi et ses trajets
  useEffect(() => {
    loadWave();
    loadTrips();
    loadExchangeRate();
  }, [id]);

  const loadWave = async () => {
    try {
      const response = await expressWaveService.getById(id);
      if (response.data.success) {
        setWave(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du convoi:', error);
      alert('Convoi non trouvé');
      navigate('/express/waves');
    }
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await expressTripService.getAll({ express_wave_id: id });
      if (response.data.success) {
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setTrips(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setTrips(responseData.data);
        } else {
          setTrips([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des trajets:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRate = async () => {
    try {
      const response = await systemSettingService.getExchangeRate();
      if (response.data.success && response.data.data) {
        setExchangeRate(parseFloat(response.data.data) || 63.0);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du taux de change:', error);
    }
  };

  // Naviguer vers la page de gestion du trajet
  const handleManage = (trip) => {
    navigate(`/express/trips/${trip.id}`);
  };

  // Ouvrir le modal pour créer un nouveau trajet
  const handleCreate = () => {
    setSelectedTrip(null);
    setFormData({
      name: '',
      direction: 'A_to_B',
      from_country: '',
      from_city: '',
      to_country: '',
      to_city: '',
      planned_date: '',
      actual_date: '',
      traveler_name: '',
      status: 'planned',
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour éditer un trajet
  const handleEdit = (trip) => {
    setSelectedTrip(trip);
    setFormData({
      name: trip.name || '',
      direction: trip.direction || 'A_to_B',
      from_country: trip.from_country || '',
      from_city: trip.from_city || '',
      to_country: trip.to_country || '',
      to_city: trip.to_city || '',
      planned_date: trip.planned_date ? trip.planned_date.split('T')[0] : '',
      actual_date: trip.actual_date ? trip.actual_date.replace('T', 'T').substring(0, 16) : '',
      traveler_name: trip.traveler_name || '',
      status: trip.status || 'planned',
      notes: trip.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (trip) => {
    setSelectedTrip(trip);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await expressTripService.delete(selectedTrip.id);
      await loadTrips();
      setIsDeleteDialogOpen(false);
      setSelectedTrip(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression du trajet';
      alert(message);
    }
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Préparer les données
      const dataToSend = {
        ...formData,
        express_wave_id: parseInt(id),
        actual_date: formData.actual_date || null,
      };

      let response;
      if (selectedTrip) {
        // Modifier
        response = await expressTripService.update(selectedTrip.id, dataToSend);
      } else {
        // Créer
        response = await expressTripService.create(dataToSend);
      }

      if (response.data.success) {
        setIsModalOpen(false);
        await loadTrips();
        setSelectedTrip(null);
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

  // Clôturer le convoi
  const handleCloseWave = async () => {
    // Vérifier que tous les trajets sont fermés
    const tripsNotClosed = trips.filter(t => t.status !== 'closed');
    
    if (tripsNotClosed.length > 0) {
      alert(`Impossible de clôturer le convoi. ${tripsNotClosed.length} trajet(s) ne sont pas encore fermés. Tous les trajets doivent être fermés avant de clôturer le convoi.`);
      return;
    }

    // Vérifier qu'il y a au moins un trajet
    if (trips.length === 0) {
      alert('Impossible de clôturer le convoi. Aucun trajet associé à ce convoi.');
      return;
    }

    if (!window.confirm('Voulez-vous vraiment clôturer ce convoi ? Tous les trajets doivent être fermés.')) return;

    try {
      await expressWaveService.update(id, { status: 'closed' });
      await loadWave();
      await loadTrips();
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      alert(error.response?.data?.message || 'Erreur lors de la clôture du convoi');
    }
  };

  // Colonnes du tableau
  const columns = [
    {
      header: 'Nom',
      accessor: (trip) => trip.name,
      sortable: true,
    },
    {
      header: 'Direction',
      accessor: (trip) => trip.direction,
      render: (trip) => (
        <span className="text-sm text-gray-900">
          {trip.direction === 'A_to_B' ? 'A → B' : 'B → A'}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'De',
      accessor: (trip) => `${trip.from_city}, ${trip.from_country}`,
      render: (trip) => (
        <span className="text-sm text-gray-900">{trip.from_city}, {trip.from_country}</span>
      ),
      sortable: false,
    },
    {
      header: 'Vers',
      accessor: (trip) => `${trip.to_city}, ${trip.to_country}`,
      render: (trip) => (
        <span className="text-sm text-gray-900">{trip.to_city}, {trip.to_country}</span>
      ),
      sortable: false,
    },
    {
      header: 'Voyageur',
      accessor: (trip) => trip.traveler_name,
      sortable: true,
    },
    {
      header: 'Date prévue',
      accessor: (trip) => trip.planned_date,
      format: 'date',
      sortable: true,
    },
    {
      header: 'Date de fin',
      accessor: (trip) => trip.end_date,
      format: 'date',
      render: (trip) => trip.end_date ? formatDate(trip.end_date) : '-',
      sortable: true,
    },
    {
      header: 'Statut',
      accessor: (trip) => trip.status,
      format: 'status',
      render: (trip) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(trip.status)}`}>
          {formatStatus(trip.status)}
        </span>
      ),
      sortable: true,
    },
    {
      header: 'Colis',
      accessor: (trip) => trip.parcels_count || 0,
      render: (trip) => (
        <span className="text-sm font-medium text-gray-900">{trip.parcels_count || 0}</span>
      ),
      sortable: true,
    },
  ];

  // Un convoi peut être clôturé si :
  // - Elle a au moins un trajet
  // - Tous les trajets sont fermés (closed)
  const canCloseWave = trips.length > 0 && 
    trips.every(t => t.status === 'closed');

  // Calculer la rentabilité du convoi
  const calculateProfitability = () => {
    if (!wave) return null;

    // Revenus totaux : utiliser la devise principale de chaque colis pour éviter les doublons
    // Déterminer la devise principale : si price_mad > 0, MAD est principal, sinon CFA
    // IMPORTANT : On utilise uniquement la devise principale, jamais les deux en même temps
    const getPriceInCurrency = (parcel, targetCurrency) => {
      const priceMAD = parseFloat(parcel.price_mad) || 0;
      const priceCFA = parseFloat(parcel.price_cfa) || 0;
      
      // Déterminer la devise principale : priorité à MAD si > 0, sinon CFA
      // Si les deux sont > 0, MAD a la priorité (c'est la logique du backend)
      const primaryCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
      const primaryAmount = primaryCurrency === 'MAD' ? priceMAD : priceCFA;
      
      // Si le montant principal est 0, retourner 0 (pas de colis)
      if (primaryAmount <= 0) {
        return 0;
      }
      
      // Si la devise cible est la même que la devise principale, retourner directement
      if (primaryCurrency === targetCurrency) {
        return primaryAmount;
      }
      
      // Convertir vers la devise cible
      if (primaryCurrency === 'MAD' && targetCurrency === 'CFA') {
        return primaryAmount * exchangeRate;
      } else if (primaryCurrency === 'CFA' && targetCurrency === 'MAD') {
        return primaryAmount / exchangeRate;
      }
      
      return 0;
    };

    // Revenus en CFA : utiliser la devise principale et convertir si nécessaire
    // Utiliser la variable 'trips' chargée séparément pour éviter les doublons avec wave.trips
    const totalRevenueCFA = trips.reduce((sum, trip) => {
      const tripRevenue = trip.parcels?.reduce((s, parcel) => {
        return s + getPriceInCurrency(parcel, 'CFA');
      }, 0) || 0;
      return sum + tripRevenue;
    }, 0);

    // Revenus en MAD : utiliser la devise principale et convertir si nécessaire
    // Utiliser la variable 'trips' chargée séparément pour éviter les doublons avec wave.trips
    const totalRevenueMAD = trips.reduce((sum, trip) => {
      const tripRevenue = trip.parcels?.reduce((s, parcel) => {
        return s + getPriceInCurrency(parcel, 'MAD');
      }, 0) || 0;
      return sum + tripRevenue;
    }, 0);

    // Frais du convoi (convertir selon la devise)
    const waveCostsMAD = wave.costs?.reduce((sum, cost) => {
      const amount = parseFloat(cost.amount) || 0;
      // Convertir en MAD si la devise est CFA
      if (cost.currency === 'CFA') {
        return sum + (amount / exchangeRate);
      }
      // Déjà en MAD
      return sum + amount;
    }, 0) || 0;

    const waveCostsCFA = wave.costs?.reduce((sum, cost) => {
      const amount = parseFloat(cost.amount) || 0;
      // Convertir en CFA si la devise est MAD
      if (cost.currency === 'MAD') {
        return sum + (amount * exchangeRate);
      }
      // Déjà en CFA
      return sum + amount;
    }, 0) || 0;

    // Frais des trajets (tous les trajets chargés avec leurs frais)
    const tripCostsMAD = trips.reduce((sum, trip) => {
      const tripCost = trip.costs?.reduce((s, cost) => {
        const amount = parseFloat(cost.amount) || 0;
        // Convertir en MAD si la devise est CFA
        if (cost.currency === 'CFA') {
          return s + (amount / exchangeRate);
        }
        // Déjà en MAD
        return s + amount;
      }, 0) || 0;
      return sum + tripCost;
    }, 0);

    const tripCostsCFA = trips.reduce((sum, trip) => {
      const tripCost = trip.costs?.reduce((s, cost) => {
        const amount = parseFloat(cost.amount) || 0;
        // Convertir en CFA si la devise est MAD
        if (cost.currency === 'MAD') {
          return s + (amount * exchangeRate);
        }
        // Déjà en CFA
        return s + amount;
      }, 0) || 0;
      return sum + tripCost;
    }, 0);

    // Total des frais (convoi + trajets)
    const totalCostsCFA = waveCostsCFA + tripCostsCFA;
    const totalCostsMAD = waveCostsMAD + tripCostsMAD;

    // Bénéfice net : calculer séparément pour chaque devise
    const netProfitMAD = totalRevenueMAD - totalCostsMAD;
    const netProfitCFA = totalRevenueCFA - totalCostsCFA;

    // Taux de rentabilité (basé sur MAD)
    const profitRateMAD = totalRevenueMAD > 0 ? ((netProfitMAD / totalRevenueMAD) * 100) : 0;
    const profitRateCFA = totalRevenueCFA > 0 ? ((netProfitCFA / totalRevenueCFA) * 100) : 0;

    return {
      totalRevenueMAD: totalRevenueMAD,
      totalRevenueCFA: totalRevenueCFA,
      waveCostsCFA: waveCostsCFA,
      waveCostsMAD: waveCostsMAD,
      tripCostsCFA: tripCostsCFA,
      tripCostsMAD: tripCostsMAD,
      totalCostsCFA: totalCostsCFA,
      totalCostsMAD: totalCostsMAD,
      netProfitMAD: netProfitMAD,
      netProfitCFA: netProfitCFA,
      profitRateMAD: profitRateMAD,
      profitRateCFA: profitRateCFA,
      isProfitable: netProfitMAD > 0,
    };
  };

  const profitability = calculateProfitability();

  if (!wave) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Link to="/express/waves" className="hover:text-blue-600 font-medium">Convois Express</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{wave.name}</span>
      </div>

      {/* Header avec bouton Retour et Ajouter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{wave.name}</h1>
          <p className="text-green-100 dark:text-green-200 text-sm sm:text-base mt-1">Code: {wave.code} | {formatDate(wave.start_date)} - {wave.end_date ? formatDate(wave.end_date) : 'En cours'}</p>
          <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(wave.status)}`}>
            {formatStatus(wave.status)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {/* Toggle vue cards/table */}
          <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-md' : 'text-white hover:bg-white/10'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          {wave.status !== 'closed' && (
            <button
              onClick={handleCreate}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-lg sm:rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer un trajet</span>
            </button>
          )}
          {canCloseWave && wave.status !== 'closed' && (
            <button
              onClick={handleCloseWave}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Clôturer le convoi</span>
            </button>
          )}
        </div>
      </div>

      {/* Récapitulatif de rentabilité (Boss et Admin uniquement) */}
      {profitability && hasAnyRole(['boss', 'admin']) && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center space-x-2 mb-4 sm:mb-6">
            <div className="h-1 w-6 sm:w-8 bg-gradient-to-r from-green-600 to-green-700 rounded-full"></div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Récapitulatif de rentabilité</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 font-semibold">Revenus totaux (MAD)</p>
              <p className="text-xl sm:text-2xl font-extrabold text-green-600">
                {formatCurrency(profitability.totalRevenueMAD, 'MAD')}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chiffre d'affaires</p>
              <p className="text-xs text-gray-400 mt-1">
                ({formatCurrency(profitability.totalRevenueCFA, 'CFA')})
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 font-semibold">Frais totaux (CFA)</p>
              <p className="text-xl sm:text-2xl font-extrabold text-red-600">
                {formatCurrency(profitability.totalCostsCFA, 'CFA')}
              </p>
              <div className="text-xs text-gray-500 mt-1">
                <p>({formatCurrency(profitability.totalCostsMAD, 'MAD')})</p>
                <p className="mt-1">Convoi: {formatCurrency(profitability.waveCostsCFA, 'CFA')}</p>
                <p>Trajets: {formatCurrency(profitability.tripCostsCFA, 'CFA')}</p>
              </div>
            </div>
            <div className={`bg-white rounded-xl p-4 shadow-md border-2 ${profitability.isProfitable ? 'border-green-500' : 'border-red-500'}`}>
              <p className="text-xs sm:text-sm text-gray-600 mb-1 font-semibold">Bénéfice net (MAD)</p>
              <p className={`text-xl sm:text-2xl font-extrabold ${profitability.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(profitability.netProfitMAD), 'MAD')}
              </p>
              <p className={`text-xs ${profitability.isProfitable ? 'text-green-600' : 'text-red-600'} mt-1`}>
                ({formatCurrency(Math.abs(profitability.netProfitCFA), 'CFA')})
              </p>
              <p className={`text-xs mt-1 ${profitability.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {profitability.isProfitable ? '✓ Rentable' : '✗ Déficitaire'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 font-semibold">Taux de rentabilité</p>
              <p className={`text-xl sm:text-2xl font-extrabold ${profitability.profitRateMAD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitability.profitRateMAD.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Marge sur revenus (MAD)</p>
              <p className="text-xs text-gray-400 mt-1">
                ({profitability.profitRateCFA.toFixed(2)}% CFA)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Affichage en cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : trips.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow p-6">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">Aucun trajet</p>
              <p className="text-sm text-gray-500 mb-4">Commencez par créer un nouveau trajet pour ce convoi</p>
              {wave.status !== 'closed' && (
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Créer un trajet
                </button>
              )}
            </div>
          ) : (
            trips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border border-gray-100 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{trip.name}</h3>
                    <p className="text-sm text-gray-500">{trip.traveler_name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(trip.status)}`}>
                    {formatStatus(trip.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{trip.direction === 'A_to_B' ? 'A → B' : 'B → A'}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{trip.from_city}, {trip.from_country} → {trip.to_city}, {trip.to_country}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Date prévue: {formatDate(trip.planned_date)}</span>
                  </div>

                  {trip.end_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Date de fin: {formatDate(trip.end_date)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Colis</span>
                      <span className="font-semibold text-gray-900">{trip.parcels_count || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  {wave.status !== 'closed' && (
                    <button
                      onClick={() => handleEdit(trip)}
                      className="text-sm text-green-600 hover:text-green-800 flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Modifier</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleManage(trip)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Gérer le trajet</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Affichage en tableau */}
      {viewMode === 'table' && (
        <DataTable
          data={trips}
          columns={columns}
          loading={loading}
          onEdit={wave.status !== 'closed' ? handleEdit : null}
          onDelete={wave.status !== 'closed' ? handleDelete : null}
          searchable={true}
          pagination={true}
          itemsPerPage={10}
          emptyMessage="Aucun trajet trouvé"
        />
      )}

      {/* Modal pour créer/éditer un trajet */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTrip(null);
          setErrors({});
        }}
        title={selectedTrip ? 'Modifier le trajet' : 'Nouveau trajet'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Nom"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name?.[0]}
              required
              placeholder="Nom du trajet"
            />
            <div>
              <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-2">
                Direction
              </label>
              <select
                id="direction"
                name="direction"
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A_to_B">A → B</option>
                <option value="B_to_A">B → A</option>
              </select>
              {errors.direction?.[0] && <p className="mt-1 text-sm text-red-600">{errors.direction[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">De</label>
              <div className="grid grid-cols-2 gap-2">
                <FormInput
                  label=""
                  name="from_city"
                  value={formData.from_city}
                  onChange={(e) => setFormData({ ...formData, from_city: e.target.value })}
                  error={errors.from_city?.[0]}
                  placeholder="Ville"
                  required
                />
                <FormInput
                  label=""
                  name="from_country"
                  value={formData.from_country}
                  onChange={(e) => setFormData({ ...formData, from_country: e.target.value })}
                  error={errors.from_country?.[0]}
                  placeholder="Pays"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vers</label>
              <div className="grid grid-cols-2 gap-2">
                <FormInput
                  label=""
                  name="to_city"
                  value={formData.to_city}
                  onChange={(e) => setFormData({ ...formData, to_city: e.target.value })}
                  error={errors.to_city?.[0]}
                  placeholder="Ville"
                  required
                />
                <FormInput
                  label=""
                  name="to_country"
                  value={formData.to_country}
                  onChange={(e) => setFormData({ ...formData, to_country: e.target.value })}
                  error={errors.to_country?.[0]}
                  placeholder="Pays"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Voyageur"
              name="traveler_name"
              value={formData.traveler_name}
              onChange={(e) => setFormData({ ...formData, traveler_name: e.target.value })}
              error={errors.traveler_name?.[0]}
              required
              placeholder="Nom du voyageur"
            />
            <FormInput
              label="Date prévue"
              name="planned_date"
              type="date"
              value={formData.planned_date}
              onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
              error={errors.planned_date?.[0]}
              required
            />
          </div>

          <FormInput
            label="Date réelle (optionnel)"
            name="actual_date"
            type="datetime-local"
            value={formData.actual_date}
            onChange={(e) => setFormData({ ...formData, actual_date: e.target.value })}
            error={errors.actual_date?.[0]}
          />

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
              <option value="planned">Planifié</option>
              <option value="in_transit">En transit</option>
              <option value="arrived">Arrivé</option>
              <option value="closed">Fermé</option>
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
                setSelectedTrip(null);
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
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>{selectedTrip ? 'Modifier' : 'Créer'}</span>
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
          setSelectedTrip(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le trajet"
        message={`Êtes-vous sûr de vouloir supprimer le trajet "${selectedTrip?.name}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default ExpressWaveDetail;

