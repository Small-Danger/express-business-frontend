import apiClient from '../../config/axios';

/**
 * Service API pour le Dashboard
 */

export const dashboardService = {
  // Récupérer toutes les données du dashboard en une seule requête
  getAll: (params = {}) => 
    apiClient.get('/dashboard', { params }),

  // Récupérer les statistiques Business
  getBusinessStats: (params = {}) => 
    apiClient.get('/business/analytics/dashboard', { params }),

  // Récupérer les statistiques Express (à calculer côté frontend pour l'instant)
  getExpressStats: async (params = {}) => {
    try {
      // Récupérer les colis avec filtres
      const parcelsResponse = await apiClient.get('/express/parcels', {
        params: {
          ...params,
          per_page: 1000, // Récupérer beaucoup pour calculer les stats
        },
      });

      const parcels = parcelsResponse.data?.data?.data || parcelsResponse.data?.data || [];

      // Calculer les statistiques Express
      const totalParcels = parcels.length;
      const totalRevenue = parcels.reduce((sum, p) => sum + (parseFloat(p.price_mad) || 0), 0);
      const inTransit = parcels.filter(p => p.status === 'in_transit').length;
      const delivered = parcels.filter(p => p.status === 'delivered').length;
      const readyForPickup = parcels.filter(p => p.status === 'ready_for_pickup').length;
      const totalWeight = parcels.reduce((sum, p) => sum + (parseFloat(p.weight_kg) || 0), 0);
      const totalPaid = parcels.reduce((sum, p) => sum + (parseFloat(p.total_paid) || 0), 0);
      const totalDebt = totalRevenue - totalPaid;

      // Top destinations (par pays/ville)
      const destinations = {};
      parcels.forEach(p => {
        const trip = p.trip;
        if (trip && trip.destination_country) {
          const key = `${trip.destination_country}${trip.destination_city ? ' - ' + trip.destination_city : ''}`;
          destinations[key] = (destinations[key] || 0) + 1;
        }
      });

      const topDestinations = Object.entries(destinations)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        success: true,
        data: {
          total_parcels: totalParcels,
          total_revenue: totalRevenue,
          in_transit: inTransit,
          delivered: delivered,
          ready_for_pickup: readyForPickup,
          total_weight: totalWeight,
          total_paid: totalPaid,
          total_debt: totalDebt,
          top_destinations: topDestinations,
        },
      };
    } catch (error) {
      console.error('Erreur lors du calcul des stats Express:', error);
      return {
        success: false,
        data: {
          total_parcels: 0,
          total_revenue: 0,
          in_transit: 0,
          delivered: 0,
          ready_for_pickup: 0,
          total_weight: 0,
          total_paid: 0,
          total_debt: 0,
          top_destinations: [],
        },
      };
    }
  },

  // Récupérer le résumé de la trésorerie
  getTreasurySummary: () => 
    apiClient.get('/financial-transactions/summary'),

  // Récupérer l'évolution du CA (12 derniers mois)
  getRevenueEvolution: async (params = {}) => {
    try {
      const now = new Date();
      const months = [];
      const businessData = [];
      const expressData = [];

      // Générer les 12 derniers mois
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
        months.push(monthName);

        // Récupérer les stats Business pour ce mois
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        try {
          const businessStats = await apiClient.get('/business/analytics/dashboard', {
            params: {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
            },
          });
          businessData.push(businessStats.data?.data?.summary?.total_revenue || 0);
        } catch (error) {
          businessData.push(0);
        }

        // Récupérer les stats Express pour ce mois
        try {
          const expressParcels = await apiClient.get('/express/parcels', {
            params: {
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              per_page: 1000,
            },
          });

          const parcels = expressParcels.data?.data?.data || expressParcels.data?.data || [];
          const revenue = parcels.reduce((sum, p) => sum + (parseFloat(p.price_mad) || 0), 0);
          expressData.push(revenue);
        } catch (error) {
          expressData.push(0);
        }
      }

      return {
        success: true,
        data: {
          labels: months,
          business: businessData,
          express: expressData,
        },
      };
    } catch (error) {
      console.error('Erreur lors du calcul de l\'évolution du CA:', error);
      return {
        success: false,
        data: {
          labels: [],
          business: [],
          express: [],
        },
      };
    }
  },

  // Récupérer l'évolution de la trésorerie (30 derniers jours)
  getTreasuryEvolution: async (accountId = null) => {
    try {
      const now = new Date();
      const days = [];
      const balances = [];

      // Générer les 30 derniers jours
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        days.push(dayName);

        // Récupérer le résumé de la trésorerie jusqu'à ce jour
        try {
          const summary = await apiClient.get('/financial-transactions/summary', {
            params: {
              date: date.toISOString(),
              account_id: accountId,
            },
          });
          balances.push(summary.data?.data?.total_balance_cfa || 0);
        } catch (error) {
          // Si l'endpoint ne supporte pas le paramètre date, utiliser le résumé actuel
          if (i === 0) {
            const summary = await apiClient.get('/financial-transactions/summary');
            balances.push(summary.data?.data?.total_balance_cfa || 0);
          } else {
            balances.push(0);
          }
        }
      }

      return {
        success: true,
        data: {
          labels: days,
          balances: balances,
        },
      };
    } catch (error) {
      console.error('Erreur lors du calcul de l\'évolution de la trésorerie:', error);
      return {
        success: false,
        data: {
          labels: [],
          balances: [],
        },
      };
    }
  },

  // Récupérer les transactions récentes
  getRecentTransactions: (params = {}) => 
    apiClient.get('/financial-transactions', {
      params: {
        per_page: 10,
        ...params,
      },
    }),

  // Récupérer les commandes récentes
  getRecentOrders: (params = {}) => 
    apiClient.get('/business/orders', {
      params: {
        per_page: 10,
        ...params,
      },
    }),

  // Récupérer les colis en transit
  getParcelsInTransit: (params = {}) => 
    apiClient.get('/express/parcels', {
      params: {
        status: 'in_transit',
        per_page: 10,
        ...params,
      },
    }),
};

