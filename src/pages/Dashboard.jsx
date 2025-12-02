import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/api/dashboard';
import KPICard from '../components/Dashboard/KPICard';
import RevenueChart from '../components/Dashboard/RevenueChart';
import TreasuryChart from '../components/Dashboard/TreasuryChart';
import TopClientsChart from '../components/Dashboard/TopClientsChart';
import ModuleDistributionChart from '../components/Dashboard/ModuleDistributionChart';
import TransactionsChart from '../components/Dashboard/TransactionsChart';
import TopProductsChart from '../components/Dashboard/TopProductsChart';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user, hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // day, week, month, quarter, year
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1))); // Début du mois
  const [endDate, setEndDate] = useState(new Date()); // Aujourd'hui

  // États pour les données
  const [businessStats, setBusinessStats] = useState(null);
  const [expressStats, setExpressStats] = useState(null);
  const [treasuryStats, setTreasuryStats] = useState(null);
  const [revenueEvolution, setRevenueEvolution] = useState(null);
  const [treasuryEvolution, setTreasuryEvolution] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [parcelsInTransit, setParcelsInTransit] = useState([]);

  // Charger les données
  useEffect(() => {
    calculateDates();
  }, [period]);

  useEffect(() => {
    if (startDate && endDate) {
      loadDashboardData();
    }
  }, [startDate, endDate]);

  const calculateDates = () => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date();
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }

    setStartDate(start);
    setEndDate(end);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger toutes les données en une seule requête optimisée
      const dashboardResponse = await dashboardService.getAll({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const dashboardData = dashboardResponse.data?.data || {};

      // Extraire les données
      setBusinessStats(dashboardData.business_stats);
      setExpressStats(dashboardData.express_stats);
      setTreasuryStats(dashboardData.treasury_summary);
      setRevenueEvolution(dashboardData.revenue_evolution);
      setTreasuryEvolution(dashboardData.treasury_evolution);

      // Charger les données récentes séparément (plus légères)
      if (hasAnyRole(['admin', 'boss'])) {
        const [transactions, orders, parcels] = await Promise.all([
          dashboardService.getRecentTransactions(),
          dashboardService.getRecentOrders(),
          dashboardService.getParcelsInTransit(),
        ]);
        setRecentTransactions(transactions.data?.data?.data || []);
        setRecentOrders(orders.data?.data?.data || orders.data?.data || []);
        setParcelsInTransit(parcels.data?.data?.data || parcels.data?.data || []);
      } else {
        const [orders, parcels] = await Promise.all([
          dashboardService.getRecentOrders(),
          dashboardService.getParcelsInTransit(),
        ]);
        setRecentOrders(orders.data?.data?.data || orders.data?.data || []);
        setParcelsInTransit(parcels.data?.data?.data || parcels.data?.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatage des montants
  const formatCurrency = (amount, currency = 'CFA') => {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CFA' ? 'XOF' : 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getWelcomeMessage = () => {
    const roleMessages = {
      admin: 'Bienvenue, Administrateur',
      boss: 'Bienvenue, Directeur',
      secretary: 'Bienvenue, Secrétaire',
      traveler: 'Bienvenue, Voyageur',
    };
    return roleMessages[user?.role] || 'Bienvenue';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Chargement des données...</div>
      </div>
    );
  }

  const totalRevenue = (businessStats?.summary?.total_revenue || 0) + (expressStats?.total_revenue || 0);
  const businessRevenue = businessStats?.summary?.total_revenue || 0;
  const expressRevenue = expressStats?.total_revenue || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 rounded-xl p-3 sm:p-4 shadow-lg">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">{getWelcomeMessage()}</h1>
          <p className="text-blue-100 dark:text-blue-200 mt-1 text-xs sm:text-sm font-medium">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-white/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white rounded-lg sm:rounded-xl focus:ring-2 focus:ring-white/50 focus:border-white/50 text-sm sm:text-base font-medium shadow-lg transition-all duration-200"
          >
            <option value="day" className="text-gray-900">Aujourd'hui</option>
            <option value="week" className="text-gray-900">Cette semaine</option>
            <option value="month" className="text-gray-900">Ce mois</option>
            <option value="quarter" className="text-gray-900">Ce trimestre</option>
            <option value="year" className="text-gray-900">Cette année</option>
          </select>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className={`grid ${hasAnyRole(['admin', 'boss']) ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3 sm:gap-4`}>
        {/* KPI 1: CA Total (Boss et Admin uniquement) */}
        {hasAnyRole(['admin', 'boss']) && (
          <KPICard
            title="CA Total"
            value={formatCurrency(totalRevenue)}
            subtitle="Business + Express"
            color="blue"
            icon={
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        )}

        {/* KPI 2: Commandes */}
        <KPICard
          title="Commandes"
          value={businessStats?.summary?.total_orders || 0}
          subtitle="Total commandes Business"
          color="green"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
        />

        {/* KPI 3: Colis */}
        <KPICard
          title="Colis"
          value={expressStats?.total_parcels || 0}
          subtitle={`${expressStats?.in_transit || 0} en transit`}
          color="purple"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />

        {/* KPI 4: Trésorerie (Boss/Admin uniquement) */}
        {hasAnyRole(['admin', 'boss']) && (
          <KPICard
            title="Trésorerie"
            value={formatCurrency(treasuryStats?.total_balance_cfa || 0, 'CFA')}
            subtitle={`${formatCurrency(treasuryStats?.total_balance_mad || 0, 'MAD')} MAD`}
            color="yellow"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          />
        )}

        {/* KPI 5: Marge (Boss/Admin uniquement) */}
        {hasAnyRole(['admin', 'boss']) && businessStats && (
          <KPICard
            title="Marge Business"
            value={formatCurrency(businessStats.summary?.total_margin || 0)}
            subtitle={`${(businessStats.summary?.average_margin_rate || 0).toFixed(1)}% taux moyen`}
            color="indigo"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          />
        )}

        {/* KPI 6: Dettes impayées */}
        {hasAnyRole(['admin', 'boss']) && businessStats && (
          <KPICard
            title="Dettes impayées"
            value={formatCurrency(businessStats.summary?.total_unpaid || 0)}
            subtitle="Total impayé Business"
            color="red"
          icon={
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          />
        )}
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Graphique 1: Évolution du CA */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2 sm:mb-3">
            <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Évolution du CA (12 mois)</h2>
          </div>
          <RevenueChart data={revenueEvolution} />
        </div>

        {/* Graphique 2: Évolution de la trésorerie (Boss/Admin) */}
        {hasAnyRole(['admin', 'boss']) && treasuryEvolution && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Évolution de la trésorerie (30 jours)</h2>
            </div>
            <TreasuryChart data={treasuryEvolution} />
          </div>
        )}

        {/* Graphique 3: Top clients */}
        {businessStats?.top_clients && businessStats.top_clients.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Top 5 clients (par CA)</h2>
            </div>
            <TopClientsChart data={businessStats.top_clients} />
          </div>
        )}

        {/* Graphique 4: Répartition CA par module */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2 sm:mb-3">
            <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-500 dark:to-red-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Répartition CA par module</h2>
          </div>
          <ModuleDistributionChart businessRevenue={businessRevenue} expressRevenue={expressRevenue} />
        </div>

        {/* Graphique 5: Top produits */}
        {businessStats?.top_products && businessStats.top_products.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-500 dark:to-cyan-500 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Top 5 produits (par quantité)</h2>
            </div>
            <TopProductsChart data={businessStats.top_products} />
          </div>
        )}
      </div>

      {/* Section Business détaillée */}
      {businessStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Statistiques Business</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Marge totale</p>
              <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-2">
                {formatCurrency(businessStats.summary?.total_margin || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Taux de marge moyen</p>
              <p className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-2">
                {(businessStats.summary?.average_margin_rate || 0).toFixed(2)}%
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Total payé</p>
              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-2">
                {formatCurrency(businessStats.summary?.total_paid || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 border border-red-200 dark:border-red-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Total impayé</p>
              <p className="text-2xl font-extrabold text-red-700 dark:text-red-400 mt-2">
                {formatCurrency(businessStats.summary?.total_unpaid || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section Express détaillée */}
      {expressStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-full"></div>
            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Statistiques Express</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Revenus totaux</p>
              <p className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-2">
                {formatCurrency(expressStats.total_revenue || 0, 'MAD')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Colis livrés</p>
              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-2">{expressStats.delivered || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">En transit</p>
              <p className="text-2xl font-extrabold text-yellow-700 dark:text-yellow-400 mt-2">{expressStats.in_transit || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Poids total</p>
              <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400 mt-2">
                {(expressStats.total_weight || 0).toFixed(2)} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tableaux de données récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Commandes récentes */}
        {recentOrders.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Commandes récentes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {order.reference || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {order.client ? `${order.client.first_name} ${order.client.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(order.total_amount || 0, order.currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                          order.status === 'in_transit' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                          order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {order.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Colis en transit */}
        {parcelsInTransit.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-3 sm:p-4 border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="h-1 w-5 sm:w-6 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 rounded-full"></div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Colis en transit</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Expéditeur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {parcelsInTransit.slice(0, 5).map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {parcel.reference || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {parcel.client ? `${parcel.client.first_name} ${parcel.client.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(parcel.price_mad || 0, 'MAD')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                          {parcel.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
