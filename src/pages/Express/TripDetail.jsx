import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { expressTripService, expressParcelService, expressWaveService, receiptService, expressTripCostService } from '../../services/api/express';
import { clientService } from '../../services/api/business';
import { systemSettingService } from '../../services/api/system';
import { accountService } from '../../services/api/treasury';
import { useAuth } from '../../contexts/AuthContext';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import FormInput from '../../components/shared/FormInput';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ClientSelect from '../../components/shared/ClientSelect';
import { formatDate, formatCurrency, formatStatus, getStatusClass, downloadBlob } from '../../utils/helpers';

const TripDetail = () => {
  const { hasAnyRole } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [wave, setWave] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]); // Comptes pour sélection
  const [companySettings, setCompanySettings] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(63.0); // Taux par défaut: 1 MAD = 63 CFA
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState(null);
  const [tripCosts, setTripCosts] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [viewedParcel, setViewedParcel] = useState(null);
  const [pickupParcel, setPickupParcel] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    receiver_client_id: '',
    reference: '',
    description: '',
    weight_kg: '',
    rate: '',
    rate_currency: 'MAD',
    price_mad: '',
    price_cfa: '',
    deposit_payment_account_id: '', // Compte pour le dépôt
    payments: [], // Paiements fractionnés pour le dépôt [{ account_id, amount }]
    status: 'registered',
  });
  const [pickupData, setPickupData] = useState({
    pickup_receiver_name: '',
    pickup_receiver_phone: '',
    pickup_receiver_id_number: '',
    pickup_receiver_note: '',
    payments: [], // Paiements fractionnés [{ account_id, amount }]
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [closeCosts, setCloseCosts] = useState([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
  const [costFormData, setCostFormData] = useState({
    type: 'flight_ticket',
    label: '',
    amount: '',
    currency: 'CFA',
    account_id: '',
    notes: '',
  });
  const [secondaryCurrencies, setSecondaryCurrencies] = useState([]); // Devises secondaires (MAD, EUR, etc.)

  // Charger le trajet, la vague et les colis
  useEffect(() => {
    loadTrip();
    loadParcels();
    loadData();
    loadCompanySettings();
    loadExchangeRate();
    loadSecondaryCurrencies();
    loadTripCosts();
  }, [id]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const response = await expressTripService.getById(id);
      if (response.data.success) {
        const tripData = response.data.data;
        setTrip(tripData);
        if (tripData.wave) {
          setWave(tripData.wave);
        } else if (tripData.express_wave_id) {
          try {
            const waveResponse = await expressWaveService.getById(tripData.express_wave_id);
            if (waveResponse.data.success) {
              setWave(waveResponse.data.data);
            }
          } catch (waveError) {
            console.error('Erreur lors du chargement de la vague:', waveError);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du trajet:', error);
      alert('Trajet non trouvé');
      navigate('/express/waves');
    } finally {
      setLoading(false);
    }
  };

  // Charger les frais du trajet
  const loadTripCosts = async () => {
    try {
      const response = await expressTripCostService.getAll({ express_trip_id: id });
      if (response.data.success) {
        const data = response.data.data;
        setTripCosts(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des frais:', error);
      setTripCosts([]);
    }
  };

  const loadParcels = async () => {
    try {
      setLoading(true);
      const response = await expressParcelService.getAll({ express_trip_id: id });
      if (response.data.success) {
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setParcels(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setParcels(responseData.data);
        } else {
          setParcels([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [clientsRes, accountsRes] = await Promise.all([
        clientService.getAll({ per_page: 100 }),
        accountService.getAll(),
      ]);
      if (clientsRes.data.success) {
        const data = clientsRes.data.data;
        setClients(Array.isArray(data) ? data : (data?.data || []));
      }
      if (accountsRes.data.success) {
        setAccounts(accountsRes.data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const [nameRes, addressRes, phoneRes] = await Promise.all([
        systemSettingService.getByKey('company_name'),
        systemSettingService.getByKey('company_address'),
        systemSettingService.getByKey('company_phone'),
      ]);

      setCompanySettings({
        name: nameRes.data.success ? nameRes.data.data?.value : '',
        address: addressRes.data.success ? addressRes.data.data?.value : '',
        phone: phoneRes.data.success ? phoneRes.data.data?.value : '',
      });
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres entreprise:', error);
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

  // Ouvrir le modal pour créer un nouveau colis
  const handleCreate = () => {
    if (!trip?.id) {
      alert('Erreur: Le trajet n\'est pas chargé. Veuillez réessayer.');
      return;
    }
    setSelectedParcel(null);
    setFormData({
      client_id: '',
      receiver_client_id: '',
      reference: '',
      description: '',
      weight_kg: '',
      rate: '',
      rate_currency: 'MAD',
      price_mad: '',
      price_cfa: '',
      deposit_payment_account_id: '',
      payments: [],
      status: 'registered',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour modifier un colis
  const handleEdit = async (parcel) => {
    try {
      const response = await expressParcelService.getById(parcel.id);
      if (response.data.success) {
        const parcelData = response.data.data;
        setSelectedParcel(parcelData);
        // Calculer le rate à partir du prix existant
        const weight = parseFloat(parcelData.weight_kg) || 0;
        let rate = '';
        let rateCurrency = 'MAD';
        
        if (weight > 0) {
          // Si on a un prix MAD, utiliser MAD comme rate_currency
          if (parcelData.price_mad && parseFloat(parcelData.price_mad) > 0) {
            rate = (parseFloat(parcelData.price_mad) / weight).toFixed(2);
            rateCurrency = 'MAD';
          }
          // Sinon, utiliser CFA
          else if (parcelData.price_cfa && parseFloat(parcelData.price_cfa) > 0) {
            rate = (parseFloat(parcelData.price_cfa) / weight).toFixed(2);
            rateCurrency = 'CFA';
          }
        }
        
        setFormData({
          client_id: parcelData.client_id || '',
          receiver_client_id: parcelData.receiver_client_id || '',
          reference: parcelData.reference || '',
          description: parcelData.description || '',
          weight_kg: parcelData.weight_kg || '',
          rate: rate,
          rate_currency: rateCurrency,
          price_mad: parcelData.price_mad || '',
          price_cfa: parcelData.price_cfa || '',
          status: parcelData.status || 'registered',
        });
        setErrors({});
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du colis:', error);
      alert('Erreur lors du chargement du colis');
    }
  };

  // Ouvrir le modal pour voir un colis
  const handleView = async (parcel) => {
    try {
      const response = await expressParcelService.getById(parcel.id);
      if (response.data.success) {
        setViewedParcel(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du colis:', error);
    }
  };

  // Ouvrir le modal pour la récupération
  const handlePickup = (parcel) => {
    if (parcel.status !== 'ready_for_pickup') {
      alert('Ce colis n\'est pas encore disponible pour récupération.');
      return;
    }
    setPickupParcel(parcel);
    
    // Calculer le reste à payer
    const totalAmount = parcel.price_mad > 0 ? parcel.price_mad : parcel.price_cfa / exchangeRate;
    const currentPaid = parseFloat(parcel.total_paid) || 0;
    const remainingDebt = Math.max(0, totalAmount - currentPaid);
    
    setPickupData({
      pickup_receiver_name: '',
      pickup_receiver_phone: '',
      pickup_receiver_id_number: '',
      pickup_receiver_note: '',
      payments: parcel.has_debt && remainingDebt > 0 ? [{ account_id: '', amount: remainingDebt.toFixed(2) }] : [],
    });
    setErrors({});
    setIsPickupModalOpen(true);
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (parcel) => {
    setSelectedParcel(parcel);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await expressParcelService.delete(selectedParcel.id);
      await loadParcels();
      setIsDeleteDialogOpen(false);
      setSelectedParcel(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression du colis';
      alert(message);
    }
  };

  // Charger les devises secondaires configurées
  const loadSecondaryCurrencies = async () => {
    try {
      const response = await systemSettingService.getSecondaryCurrencies();
      if (response.data.success && Array.isArray(response.data.data)) {
        setSecondaryCurrencies(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des devises secondaires:', error);
      setSecondaryCurrencies([]);
    }
  };

  // Calculer le prix CFA à partir du prix MAD
  const calculateCfaFromMad = (mad) => {
    if (!mad || mad === '') return '';
    const madValue = parseFloat(mad);
    if (isNaN(madValue)) return '';
    return (madValue * exchangeRate).toFixed(2);
  };

  // Calculer le prix MAD à partir du prix CFA
  const calculateMadFromCfa = (cfa) => {
    if (!cfa || cfa === '') return '';
    const cfaValue = parseFloat(cfa);
    if (isNaN(cfaValue) || exchangeRate === 0) return '';
    return (cfaValue / exchangeRate).toFixed(2);
  };

  // Fonctions de conversion génériques (comme dans Products.jsx)
  // Convertir un montant de sa devise d'origine vers CFA
  const convertToCFA = (amount, fromCurrency) => {
    if (fromCurrency === 'CFA') return amount;
    
    const currencyConfig = secondaryCurrencies.find(c => c.code === fromCurrency);
    if (currencyConfig) {
      return amount * currencyConfig.rate_to_cfa;
    }
    
    return amount;
  };

  // Convertir un montant de CFA vers une devise cible
  const convertFromCFA = (amountCFA, targetCurrency) => {
    if (targetCurrency === 'CFA') return amountCFA;
    
    const currencyConfig = secondaryCurrencies.find(c => c.code === targetCurrency);
    if (currencyConfig) {
      return amountCFA / currencyConfig.rate_to_cfa;
    }
    
    return amountCFA;
  };

  // Obtenir le prix dans une devise donnée depuis la devise d'enregistrement
  const getPriceInCurrency = (amount, fromCurrency, targetCurrency) => {
    if (fromCurrency === targetCurrency) return amount;
    
    if (fromCurrency === 'CFA') {
      return convertFromCFA(amount, targetCurrency);
    }
    
    if (targetCurrency === 'CFA') {
      return convertToCFA(amount, fromCurrency);
    }
    
    // Sinon, convertir: devise d'enregistrement -> CFA -> devise cible
    const amountCFA = convertToCFA(amount, fromCurrency);
    return convertFromCFA(amountCFA, targetCurrency);
  };


  // Actions dynamiques selon le statut
  const handleMarkReadyForDeparture = async (parcel) => {
    try {
      await expressParcelService.update(parcel.id, { status: 'ready_for_departure' });
      await loadParcels();
    } catch (error) {
      console.error('Erreur lors du marquage prêt pour départ:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage prêt pour départ');
    }
  };

  const handleMarkLoaded = async (parcel) => {
    try {
      await expressParcelService.update(parcel.id, { status: 'loaded' });
      await loadParcels();
    } catch (error) {
      console.error('Erreur lors du marquage embarqué:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage embarqué');
    }
  };

  const handleMarkInTransit = async (parcel) => {
    try {
      await expressParcelService.update(parcel.id, { status: 'in_transit' });
      await loadParcels();
    } catch (error) {
      console.error('Erreur lors du marquage en transit:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage en transit');
    }
  };

  const handleMarkArrived = async (parcel) => {
    try {
      await expressParcelService.update(parcel.id, { status: 'arrived' });
      await loadParcels();
    } catch (error) {
      console.error('Erreur lors du marquage comme arrivé:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage comme arrivé');
    }
  };

  const handleMarkReadyForPickup = async (parcel) => {
    try {
      await expressParcelService.update(parcel.id, { status: 'ready_for_pickup' });
      await loadParcels();
    } catch (error) {
      console.error('Erreur lors du marquage prêt pour récupération:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage prêt pour récupération');
    }
  };

  const handleConfirmPickup = async () => {
    try {
      setSaving(true);
      setErrors({});

      if (!pickupData.pickup_receiver_name || !pickupData.pickup_receiver_name.trim()) {
        setErrors({ pickup_receiver_name: ['Le nom du récupérateur est requis'] });
        setSaving(false);
        return;
      }

      // Calculer le nouveau montant payé total
      const totalAmount = pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate;
      const currentPaid = parseFloat(pickupParcel.total_paid) || 0;
      const additionalPaid = parseFloat(pickupData.amount_paid) || 0;
      const newTotalPaid = currentPaid + additionalPaid;
      const remainingDebtBefore = Math.max(0, totalAmount - currentPaid);
      const remainingDebtAfter = Math.max(0, totalAmount - newTotalPaid);

      // Utiliser une tolérance adaptative selon le montant (plus large pour les grands montants)
      const tolerance = remainingDebtBefore > 1000 ? 1 : 0.01;
      
      // Arrondir pour éviter les problèmes de précision décimale
      const additionalPaidRounded = Math.round(additionalPaid * 100) / 100;
      const remainingDebtBeforeRounded = Math.round(remainingDebtBefore * 100) / 100;
      const remainingDebtAfterRounded = Math.round(remainingDebtAfter * 100) / 100;

      // Valider que si il y a une dette, le montant payé doit être supérieur ou égal à la dette
      if (pickupParcel.has_debt && remainingDebtBeforeRounded > tolerance) {
        // Si aucun paiement n'est saisi et qu'il y a une dette, bloquer
        if (!pickupData.payments || pickupData.payments.length === 0 || additionalPaidRounded <= 0) {
          alert(`Veuillez saisir le(s) paiement(s) pour régler la dette de ${formatCurrency(remainingDebtBeforeRounded, pickupParcel.price_mad > 0 ? 'MAD' : 'CFA')}.`);
          setErrors({ payments: ['Le(s) paiement(s) est/sont requis(s) pour régler la dette'] });
          setSaving(false);
          return;
        }
        
        // Si le montant payé est inférieur à la dette restante, bloquer
        if (additionalPaidRounded < remainingDebtBeforeRounded - tolerance) {
          alert(`Le montant payé (${formatCurrency(additionalPaidRounded, pickupParcel.price_mad > 0 ? 'MAD' : 'CFA')}) est inférieur à la dette restante (${formatCurrency(remainingDebtBeforeRounded, pickupParcel.price_mad > 0 ? 'MAD' : 'CFA')}). Le montant doit être supérieur ou égal à la dette pour autoriser la récupération.`);
          setErrors({ payments: ['Le montant payé doit être supérieur ou égal à la dette restante'] });
          setSaving(false);
          return;
        }

        // Si après paiement il reste encore une dette significative (au-delà de la tolérance), bloquer
        if (remainingDebtAfterRounded > tolerance) {
          alert(`Attention: Après ce paiement, il reste encore ${formatCurrency(remainingDebtAfterRounded, pickupParcel.price_mad > 0 ? 'MAD' : 'CFA')} à payer. Le montant doit couvrir complètement la dette.`);
          setErrors({ payments: ['Le montant payé doit couvrir complètement la dette restante'] });
          setSaving(false);
          return;
        }
      }

      // Préparer les données avec les paiements fractionnés
      const pickupDataToSend = {
        pickup_receiver_name: pickupData.pickup_receiver_name,
        pickup_receiver_phone: pickupData.pickup_receiver_phone || null,
        pickup_receiver_id_number: pickupData.pickup_receiver_id_number || null,
        pickup_receiver_note: pickupData.pickup_receiver_note || null,
        payments: pickupData.payments && pickupData.payments.length > 0
          ? pickupData.payments.filter(p => p.account_id && p.amount > 0).map(p => ({
              account_id: parseInt(p.account_id),
              amount: parseFloat(p.amount),
            }))
          : [],
      };
      
      const response = await expressParcelService.pickup(pickupParcel.id, pickupDataToSend);

      if (response.data.success) {
        setIsPickupModalOpen(false);
        await loadParcels();
        setPickupParcel(null);
        setPickupData({
          pickup_receiver_name: '',
          pickup_receiver_phone: '',
          pickup_receiver_id_number: '',
          pickup_receiver_note: '',
          payments: [],
        });
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Erreur lors de la récupération');
      }
    } finally {
      setSaving(false);
    }
  };

  // Bouton WhatsApp
  const handleWhatsApp = (parcel) => {
    const client = parcel.client;
    if (!client || !client.phone) {
      alert('Aucun numéro de téléphone disponible pour ce client');
      return;
    }

    let message = `Bonjour ${client.first_name} ${client.last_name},\n\n`;
    message += `Votre colis #${parcel.reference} est arrivé et disponible pour récupération.\n\n`;

    if (companySettings) {
      message += `${companySettings.name ? `Entreprise: ${companySettings.name}\n` : ''}`;
      message += `${companySettings.address ? `📍 Adresse: ${companySettings.address}\n` : ''}`;
      message += `${companySettings.phone ? `📞 Téléphone: ${companySettings.phone}\n` : ''}`;
      message += `\n`;
    }

    message += `📦 Référence: ${parcel.reference}\n`;
    message += `⚖️ Poids: ${parcel.weight_kg} kg\n`;
    if (parcel.price_mad > 0) {
      message += `💰 Prix MAD: ${formatCurrency(parcel.price_mad, 'MAD')}\n`;
    }
    if (parcel.price_cfa > 0) {
      message += `💰 Prix CFA: ${formatCurrency(parcel.price_cfa, 'CFA')}\n`;
    }

    message += `\n📍 Lieu de récupération: ${companySettings?.address || 'À confirmer'}\n\n`;
    message += `Merci !`;

    const phoneNumber = (client.whatsapp_phone || client.phone).replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Générer un reçu
  const handleGenerateReceipt = async (parcelId) => {
    try {
      const response = await receiptService.generate(parcelId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadBlob(blob, `recu-${parcelId}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du reçu:', error);
      alert('Erreur lors de la génération du reçu');
    }
  };

  // Ouvrir le modal pour créer un nouveau frais
  const handleCreateCost = () => {
    setSelectedCost(null);
    setCostFormData({
      type: 'flight_ticket',
      label: '',
      amount: '',
      currency: 'CFA',
      account_id: '',
      notes: '',
    });
    setErrors({});
    setIsCostModalOpen(true);
  };

  // Ouvrir le modal pour modifier un frais
  const handleEditCost = (cost) => {
    setSelectedCost(cost);
    setCostFormData({
      type: cost.type || 'flight_ticket',
      label: cost.label || '',
      amount: cost.amount || '',
      currency: cost.currency || 'CFA',
      account_id: cost.account_id || '',
      notes: cost.notes || '',
    });
    setErrors({});
    setIsCostModalOpen(true);
  };

  // Sauvegarder un frais (création ou modification)
  const handleSaveCost = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validation
      if (!costFormData.label || !costFormData.amount || !costFormData.account_id) {
        setErrors({ general: ['Le libellé, le montant et le compte sont obligatoires'] });
        return;
      }

      const costData = {
        express_trip_id: id,
        type: costFormData.type,
        label: costFormData.label,
        amount: parseFloat(costFormData.amount),
        currency: costFormData.currency,
        account_id: parseInt(costFormData.account_id),
        notes: costFormData.notes || null,
      };

      if (selectedCost) {
        // Modifier
        await expressTripCostService.update(selectedCost.id, costData);
      } else {
        // Créer
        await expressTripCostService.create(costData);
      }

      setIsCostModalOpen(false);
      await loadTripCosts();
      alert(selectedCost ? 'Frais modifié avec succès' : 'Frais créé avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du frais:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Erreur lors de la sauvegarde du frais');
      }
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un frais
  const handleDeleteCost = async (cost) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le frais "${cost.label}" ?`)) {
      return;
    }

    try {
      await expressTripCostService.delete(cost.id);
      await loadTripCosts();
      alert('Frais supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du frais:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression du frais');
    }
  };

  // Ouvrir le modal de clôture avec frais
  const handleCloseTrip = () => {
    // Vérifier qu'il n'y a pas de colis en transit
    const parcelsInTransit = parcels.filter(p => p.status === 'in_transit');
    
    if (parcelsInTransit.length > 0) {
      alert(`Impossible de clôturer le trajet. ${parcelsInTransit.length} colis sont encore en transit. Tous les colis doivent être livrés ou annulés.`);
      return;
    }

    // Vérifier que tous les colis sont livrés ou annulés
    const parcelsNotDelivered = parcels.filter(p => 
      !['delivered', 'cancelled'].includes(p.status)
    );

    if (parcelsNotDelivered.length > 0) {
      alert(`Impossible de clôturer le trajet. ${parcelsNotDelivered.length} colis ne sont pas encore livrés ou annulés. Tous les colis doivent être livrés ou annulés avant de clôturer le trajet.`);
      return;
    }

    // Charger les frais existants dans le modal de clôture
    const existingCosts = tripCosts.map(cost => ({
      id: cost.id,
      type: cost.type,
      label: cost.label,
      amount: cost.amount,
      currency: cost.currency,
      account_id: cost.account_id,
      notes: cost.notes || '',
    }));

    if (existingCosts.length > 0) {
      setCloseCosts(existingCosts);
    } else {
      setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
    }

    setIsCloseModalOpen(true);
    setErrors({});
  };

  // Ajouter un frais au formulaire de clôture
  const addCloseCost = () => {
    setCloseCosts([...closeCosts, { type: 'other', label: '', amount: '', currency: 'CFA', notes: '' }]);
  };

  // Supprimer un frais du formulaire de clôture
  const removeCloseCost = (index) => {
    setCloseCosts(closeCosts.filter((_, i) => i !== index));
  };

  // Mettre à jour un frais dans le formulaire de clôture
  const updateCloseCost = (index, field, value) => {
    const newCosts = [...closeCosts];
    newCosts[index] = { ...newCosts[index], [field]: value };
    setCloseCosts(newCosts);
  };

  // Confirmer la clôture avec frais
  const handleConfirmClose = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validation des frais
      const validCosts = closeCosts.filter(cost => cost.label && cost.amount && parseFloat(cost.amount) > 0 && cost.account_id);
      
      if (validCosts.length === 0) {
        setErrors({ costs: ['Au moins un frais avec un compte doit être renseigné pour clôturer le trajet'] });
        return;
      }

      // Préparer les données (inclure l'ID si c'est un frais existant)
      const costsToSend = validCosts.map(cost => ({
        ...(cost.id && { id: cost.id }), // Inclure l'ID seulement si c'est un frais existant
        type: cost.type,
        label: cost.label,
        amount: parseFloat(cost.amount),
        currency: cost.currency,
        account_id: parseInt(cost.account_id),
        notes: cost.notes || null,
      }));

      const response = await expressTripService.close(id, { costs: costsToSend });

      if (response.data.success) {
        setIsCloseModalOpen(false);
        setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
        await loadTrip();
        await loadParcels();
        await loadTripCosts();
      }
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Erreur lors de la clôture du trajet');
      }
    } finally {
      setSaving(false);
    }
  };

  // Calculer les prix automatiquement à partir du poids et du taux
  const calculatePricesFromRate = () => {
    const weight = parseFloat(formData.weight_kg) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const rateCurrency = formData.rate_currency || 'MAD';

    if (weight > 0 && rate > 0) {
      if (rateCurrency === 'MAD') {
        // Si le taux est en MAD : price_mad = poids × rate_mad, price_cfa = price_mad × exchange_rate
        const priceMad = weight * rate;
        const priceCfa = priceMad * exchangeRate;
        return { price_mad: priceMad, price_cfa: priceCfa };
      } else {
        // Si le taux est en CFA : price_cfa = poids × rate_cfa, price_mad = price_cfa / exchange_rate
        const priceCfa = weight * rate;
        const priceMad = priceCfa / exchangeRate;
        return { price_mad: priceMad, price_cfa: priceCfa };
      }
    }
    return { price_mad: 0, price_cfa: 0 };
  };

  // Sauvegarder (créer ou modifier)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validation
      if (!formData.client_id) {
        setErrors({ client_id: ['Le client expéditeur est requis'] });
        return;
      }

      if (!formData.weight_kg || parseFloat(formData.weight_kg) <= 0) {
        setErrors({ weight_kg: ['Le poids est requis et doit être supérieur à 0'] });
        return;
      }

      if (!formData.rate || parseFloat(formData.rate) <= 0) {
        setErrors({ rate: ['Le taux est requis et doit être supérieur à 0'] });
        return;
      }

      // Calculer automatiquement les prix à partir du poids × taux
      const calculatedPrices = calculatePricesFromRate();

      // Préparer les données
      const dataToSend = {
        client_id: parseInt(formData.client_id),
        receiver_client_id: formData.receiver_client_id ? parseInt(formData.receiver_client_id) : null,
        express_trip_id: parseInt(id),
        reference: formData.reference || '',
        description: formData.description || '',
        weight_kg: parseFloat(formData.weight_kg),
        price_mad: calculatedPrices.price_mad,
        price_cfa: calculatedPrices.price_cfa,
        deposit_payment_account_id: parseInt(formData.deposit_payment_account_id) || null,
        payments: formData.payments.filter(p => p.account_id && p.amount > 0).map(p => ({
          account_id: parseInt(p.account_id),
          amount: parseFloat(p.amount),
        })),
        status: selectedParcel ? formData.status : 'registered',
      };

      let response;
      if (selectedParcel) {
        // Modifier
        response = await expressParcelService.update(selectedParcel.id, dataToSend);
      } else {
        // Créer
        response = await expressParcelService.create(dataToSend);
      }

      if (response?.data?.success) {
        setIsModalOpen(false);
        setSelectedParcel(null);
        setFormData({
          client_id: '',
          receiver_client_id: '',
          reference: '',
          description: '',
          weight_kg: '',
          rate: '',
          rate_currency: 'MAD',
          price_mad: '',
          price_cfa: '',
          deposit_payment_account_id: '',
          payments: [],
          status: 'registered',
        });
        setErrors({});
        await loadParcels();
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

  // Obtenir les actions disponibles selon le statut
  const getAvailableActions = (parcel) => {
    if (!parcel || !parcel.status) {
      return [
        { label: 'Voir', action: () => handleView(parcel), color: 'blue' },
        { label: 'Générer reçu', action: () => handleGenerateReceipt(parcel.id), color: 'green' }
      ];
    }

    const isTripClosed = trip?.status === 'closed';
    const actions = [];
    const status = parcel.status.toLowerCase();
    
    // Toujours disponible
    actions.push({ label: 'Voir', action: () => handleView(parcel), color: 'blue' });
    
    // Générer reçu toujours disponible (sauf si annulé)
    if (status !== 'cancelled') {
      actions.push({ label: 'Générer reçu', action: () => handleGenerateReceipt(parcel.id), color: 'green' });
    }
    
    // Si le trajet est fermé, on ne permet pas les autres actions
    if (isTripClosed) {
      return actions;
    }
    
    // Modifier et Supprimer uniquement pour les statuts initiaux
    if (['registered'].includes(status)) {
      actions.push({ label: 'Modifier', action: () => handleEdit(parcel), color: 'yellow' });
      actions.push({ label: 'Supprimer', action: () => handleDelete(parcel), color: 'red' });
    }
    
    // Actions selon le statut
    switch (status) {
      case 'registered':
        actions.push({ label: 'Prêt pour départ', action: () => handleMarkReadyForDeparture(parcel), color: 'green' });
        break;
        
      case 'ready_for_departure':
        actions.push({ label: 'Embarquer', action: () => handleMarkLoaded(parcel), color: 'purple' });
        break;
        
      case 'loaded':
        actions.push({ label: 'Marquer en transit', action: () => handleMarkInTransit(parcel), color: 'blue' });
        break;
        
      case 'in_transit':
        actions.push({ label: 'Marquer arrivé', action: () => handleMarkArrived(parcel), color: 'green' });
        break;
        
      case 'arrived':
        actions.push({ label: 'Marquer disponible', action: () => handleMarkReadyForPickup(parcel), color: 'green' });
        break;
        
      case 'ready_for_pickup':
        actions.push({ label: 'Informer WhatsApp', action: () => handleWhatsApp(parcel), color: 'green' });
        actions.push({ 
          label: 'Confirmer récupération', 
          action: () => handlePickup(parcel), 
          color: 'green' 
        });
        break;
        
      case 'cancelled':
        // Aucune action supplémentaire pour les colis annulés
        break;
        
      default:
        console.warn(`Statut inconnu: ${status} pour le colis ${parcel.id}`);
        break;
    }
    
    return actions;
  };

  // Générer les colonnes du tableau dynamiquement avec conversions de devises
  const generateColumns = () => {
    const baseColumns = [
      {
        header: 'Référence',
        accessor: (parcel) => parcel.reference,
        sortable: true,
      },
      {
        header: 'Client expéditeur',
        accessor: (parcel) => parcel.client?.first_name + ' ' + parcel.client?.last_name,
        render: (parcel) => (
          <span className="text-sm text-gray-900">
            {parcel.client ? `${parcel.client.first_name} ${parcel.client.last_name}` : '-'}
          </span>
        ),
        sortable: false,
      },
      {
        header: 'Client receveur',
        accessor: (parcel) => parcel.receiver_client?.first_name + ' ' + parcel.receiver_client?.last_name,
        render: (parcel) => (
          <span className="text-sm text-gray-900">
            {parcel.receiver_client ? `${parcel.receiver_client.first_name} ${parcel.receiver_client.last_name}` : '-'}
          </span>
        ),
        sortable: false,
      },
      {
        header: 'Poids (kg)',
        accessor: (parcel) => parcel.weight_kg,
        render: (parcel) => (
          <span className="text-sm text-gray-900">{parcel.weight_kg || '-'}</span>
        ),
        sortable: true,
      },
      // Colonnes prix en devise d'origine
      {
        header: 'Prix MAD',
        accessor: (parcel) => parcel.price_mad,
        format: 'currency',
        render: (parcel) => formatCurrency(parcel.price_mad, 'MAD'),
        sortable: true,
      },
      {
        header: 'Prix CFA',
        accessor: (parcel) => parcel.price_cfa,
        format: 'currency',
        render: (parcel) => formatCurrency(parcel.price_cfa, 'CFA'),
        sortable: true,
      },
      // Colonnes Payé en CFA et MAD
      {
        header: 'Payé (CFA)',
        accessor: (parcel) => {
          const priceCFA = parcel.price_cfa;
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          return getPriceInCurrency(totalPaid, fromCurrency, 'CFA');
        },
        format: 'currency',
        render: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const paidCFA = getPriceInCurrency(totalPaid, fromCurrency, 'CFA');
          return formatCurrency(paidCFA, 'CFA');
        },
        sortable: true,
      },
      {
        header: 'Payé (MAD)',
        accessor: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          return getPriceInCurrency(totalPaid, fromCurrency, 'MAD');
        },
        format: 'currency',
        render: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const paidMAD = getPriceInCurrency(totalPaid, fromCurrency, 'MAD');
          return formatCurrency(paidMAD, 'MAD');
        },
        sortable: true,
      },
      // Reste à payer en CFA
      {
        header: 'Reste à payer (CFA)',
        accessor: (parcel) => {
          const priceCFA = parcel.price_cfa;
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalAmount = priceMAD > 0 ? parcel.price_mad : parcel.price_cfa;
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const totalAmountCFA = getPriceInCurrency(totalAmount, fromCurrency, 'CFA');
          const paidCFA = getPriceInCurrency(totalPaid, fromCurrency, 'CFA');
          return totalAmountCFA - paidCFA;
        },
        format: 'currency',
        render: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalAmount = priceMAD > 0 ? parcel.price_mad : parcel.price_cfa;
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const totalAmountCFA = getPriceInCurrency(totalAmount, fromCurrency, 'CFA');
          const paidCFA = getPriceInCurrency(totalPaid, fromCurrency, 'CFA');
          const remaining = totalAmountCFA - paidCFA;
          return (
            <span className={remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {formatCurrency(remaining, 'CFA')}
            </span>
          );
        },
        sortable: true,
      },
      // Reste à payer en MAD
      {
        header: 'Reste à payer (MAD)',
        accessor: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalAmount = priceMAD > 0 ? parcel.price_mad : parcel.price_cfa;
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const totalAmountMAD = getPriceInCurrency(totalAmount, fromCurrency, 'MAD');
          const paidMAD = getPriceInCurrency(totalPaid, fromCurrency, 'MAD');
          return totalAmountMAD - paidMAD;
        },
        format: 'currency',
        render: (parcel) => {
          const priceMAD = parcel.price_mad;
          const fromCurrency = priceMAD > 0 ? 'MAD' : 'CFA';
          const totalAmount = priceMAD > 0 ? parcel.price_mad : parcel.price_cfa;
          const totalPaid = parseFloat(parcel.total_paid) || 0;
          const totalAmountMAD = getPriceInCurrency(totalAmount, fromCurrency, 'MAD');
          const paidMAD = getPriceInCurrency(totalPaid, fromCurrency, 'MAD');
          const remaining = totalAmountMAD - paidMAD;
          return (
            <span className={remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {formatCurrency(remaining, 'MAD')}
            </span>
          );
        },
        sortable: true,
      },
    ];

    // Ajouter les colonnes de conversion pour chaque devise secondaire
    // Pour les colis Express, on a déjà price_mad et price_cfa, donc on convertit depuis ces deux
    const conversionColumns = [];
    secondaryCurrencies.forEach((currencyConfig) => {
      const currencyCode = currencyConfig.code;
      
      // Éviter les doublons si la devise est déjà MAD ou CFA
      if (currencyCode === 'MAD' || currencyCode === 'CFA') return;
      
      // Colonne équivalent Prix (basé sur le prix principal)
      // On prend le prix le plus élevé entre MAD et CFA converti
      conversionColumns.push({
        header: `Prix (${currencyCode})`,
        accessor: (parcel) => {
          // Convertir depuis MAD si disponible
          if (parcel.price_mad > 0) {
            return getPriceInCurrency(parcel.price_mad, 'MAD', currencyCode);
          }
          // Sinon convertir depuis CFA
          if (parcel.price_cfa > 0) {
            return getPriceInCurrency(parcel.price_cfa, 'CFA', currencyCode);
          }
          return 0;
        },
        render: (parcel) => {
          let priceInCurrency = 0;
          if (parcel.price_mad > 0) {
            priceInCurrency = getPriceInCurrency(parcel.price_mad, 'MAD', currencyCode);
          } else if (parcel.price_cfa > 0) {
            priceInCurrency = getPriceInCurrency(parcel.price_cfa, 'CFA', currencyCode);
          }
          return formatCurrency(priceInCurrency, currencyCode);
        },
        sortable: true,
      });
    });

    // Colonnes finales
    const finalColumns = [
      {
        header: 'Statut',
        accessor: (parcel) => parcel.status,
        format: 'status',
        render: (parcel) => (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(parcel.status)}`}>
              {formatStatus(parcel.status)}
            </span>
            {parcel.has_debt && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                Dette
              </span>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        header: 'Actions',
        accessor: () => null,
        render: (parcel) => {
          const actions = getAvailableActions(parcel);
          return (
            <div className="flex items-center space-x-2 flex-wrap">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.action}
                  className={`px-2 py-1 text-xs rounded ${
                    action.color === 'red' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                    action.color === 'green' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                    action.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                    action.color === 'purple' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  } transition-colors`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          );
        },
        sortable: false,
      },
    ];

    // Combiner toutes les colonnes
    return [...baseColumns, ...conversionColumns, ...finalColumns];
  };

  // Générer les colonnes à chaque fois que les devises secondaires changent
  const columns = generateColumns();

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Un trajet peut être clôturé si :
  // - Il a au moins un colis
  // - Tous les colis sont livrés (delivered) ou annulés (cancelled)
  // - Aucun colis n'est en transit (in_transit)
  const canCloseTrip = parcels.length > 0 && 
    parcels.every(p => ['delivered', 'cancelled'].includes(p.status)) &&
    !parcels.some(p => p.status === 'in_transit');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Link to="/express/waves" className="hover:text-blue-600 font-medium">Vagues Express</Link>
        <span>/</span>
        {wave && (
          <>
            <Link to={`/express/waves/${wave.id}`} className="hover:text-blue-600 font-medium">{wave.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-semibold">{trip.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{trip.name}</h1>
          <p className="text-green-100 dark:text-green-200 text-sm sm:text-base mt-1">
            {trip.traveler_name} | {trip.direction === 'A_to_B' ? 'A → B' : 'B → A'}
          </p>
          <p className="text-green-100 dark:text-green-200 text-sm sm:text-base">
            {trip.from_city}, {trip.from_country} → {trip.to_city}, {trip.to_country}
          </p>
          <p className="text-green-100 dark:text-green-200 text-sm sm:text-base">
            Date prévue: {formatDate(trip.planned_date)}
            {trip.end_date && (
              <> | Date de fin: {formatDate(trip.end_date)}</>
            )}
          </p>
          <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(trip.status)}`}>
            {formatStatus(trip.status)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {canCloseTrip && trip.status !== 'closed' && (
            <button
              onClick={handleCloseTrip}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Clôturer le trajet
            </button>
          )}
          {trip?.status !== 'closed' && (
            <button
              onClick={handleCreate}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-lg sm:rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer un colis</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Frais du trajet (Boss et Admin uniquement) */}
      {trip?.status !== 'closed' && hasAnyRole(['boss', 'admin']) && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Frais du trajet</h2>
            <button
              onClick={handleCreateCost}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white rounded-lg sm:rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Ajouter un frais</span>
            </button>
          </div>

          {tripCosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun frais enregistré. Cliquez sur "Ajouter un frais" pour en créer un.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Libellé</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Compte</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tripCosts.map((cost) => (
                    <tr key={cost.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cost.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cost.label}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(cost.amount, cost.currency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cost.account ? `${cost.account.name} (${cost.account.type})` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(cost.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditCost(cost)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteCost(cost)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tableau des colis */}
      <DataTable
        data={parcels}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucun colis trouvé"
      />

      {/* Modal pour créer/éditer un colis */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedParcel(null);
          setErrors({});
        }}
        title={selectedParcel ? `Modifier le colis ${selectedParcel.reference}` : 'Nouveau colis'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Vague:</strong> {wave?.name || 'Chargement...'} | <strong>Trajet:</strong> {trip?.name || 'Chargement...'}
            </p>
            <p className="text-xs text-blue-700 mt-1">Le colis sera automatiquement rattaché à ce trajet.</p>
            <p className="text-xs text-blue-700 mt-1">Taux de change: 1 MAD = {exchangeRate} FCFA (calcul automatique)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <ClientSelect
                label="Client expéditeur"
                value={formData.client_id?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, client_id: value })}
                error={errors.client_id?.[0]}
                required
                disabled={loadingData}
                filterType="express"
                placeholder="Rechercher un client Express..."
                onClientCreated={async (newClient) => {
                  // Recharger la liste des clients dans le parent
                  const clientsRes = await clientService.getAll({ per_page: 100 });
                  if (clientsRes.data.success) {
                    const data = clientsRes.data.data;
                    setClients(Array.isArray(data) ? data : (data?.data || []));
                  }
                }}
              />
            </div>

            <div>
              <ClientSelect
                label="Client receveur (optionnel)"
                value={formData.receiver_client_id?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, receiver_client_id: value || '' })}
                disabled={loadingData}
                placeholder="Rechercher un client receveur..."
                onClientCreated={async (newClient) => {
                  // Recharger la liste des clients dans le parent
                  const clientsRes = await clientService.getAll({ per_page: 100 });
                  if (clientsRes.data.success) {
                    const data = clientsRes.data.data;
                    setClients(Array.isArray(data) ? data : (data?.data || []));
                  }
                }}
              />
            </div>
          </div>

          <FormInput
            label="Référence (optionnel)"
            name="reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            error={errors.reference?.[0]}
            placeholder="Auto-généré si vide"
          />

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
              placeholder="Description du colis..."
            />
            {errors.description?.[0] && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
          </div>

          <FormInput
            label="Poids (kg)"
            name="weight_kg"
            type="number"
            step="0.001"
            min="0"
            value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
            error={errors.weight_kg?.[0]}
            required
            placeholder="0.000"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-2">
                Taux (par kg) *
              </label>
              <input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.rate?.[0] && <p className="mt-1 text-sm text-red-600">{errors.rate[0]}</p>}
            </div>

            <div>
              <label htmlFor="rate_currency" className="block text-sm font-medium text-gray-700 mb-2">
                Devise du taux *
              </label>
              <select
                id="rate_currency"
                name="rate_currency"
                value={formData.rate_currency}
                onChange={(e) => setFormData({ ...formData, rate_currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MAD">MAD</option>
                <option value="CFA">FCFA</option>
              </select>
            </div>
          </div>

          {/* Aperçu du prix calculé automatiquement */}
          {(formData.weight_kg && formData.rate && parseFloat(formData.weight_kg) > 0 && parseFloat(formData.rate) > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Prix calculé automatiquement :</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Prix total (MAD):</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {formatCurrency(calculatePricesFromRate().price_mad, 'MAD')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Prix total (FCFA):</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {formatCurrency(calculatePricesFromRate().price_cfa, 'CFA')}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-gray-500 mt-2">
                  Calcul: {formData.weight_kg} kg × {formData.rate} {formData.rate_currency} = {
                    formData.rate_currency === 'MAD' 
                      ? `${(parseFloat(formData.weight_kg) * parseFloat(formData.rate)).toFixed(2)} MAD (${(parseFloat(formData.weight_kg) * parseFloat(formData.rate) * exchangeRate).toFixed(2)} FCFA)`
                      : `${(parseFloat(formData.weight_kg) * parseFloat(formData.rate)).toFixed(2)} FCFA (${(parseFloat(formData.weight_kg) * parseFloat(formData.rate) / exchangeRate).toFixed(2)} MAD)`
                  }
                </div>
              </div>
            </div>
          )}

          {/* Compte pour le dépôt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compte pour le dépôt (optionnel)
            </label>
            <select
              value={formData.deposit_payment_account_id}
              onChange={(e) => setFormData({ ...formData, deposit_payment_account_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Aucun (pas d'avance)</option>
              {accounts
                .filter((acc) => acc.is_active)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type}) - {account.currency}
                  </option>
                ))}
            </select>
          </div>

          {/* Paiements fractionnés pour le dépôt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Avance payée (optionnel) - Paiements fractionnés
              </label>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    payments: [...formData.payments, { account_id: '', amount: '' }],
                  });
                }}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                + Ajouter un paiement
              </button>
            </div>
            {formData.payments.length === 0 && (
              <p className="text-sm text-gray-500 mb-2">Aucun paiement. Cliquez sur "Ajouter un paiement" pour en ajouter.</p>
            )}
            {formData.payments.map((payment, index) => (
              <div key={index} className="grid grid-cols-2 gap-3 mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Compte</label>
                  <select
                    value={payment.account_id}
                    onChange={(e) => {
                      const newPayments = [...formData.payments];
                      newPayments[index].account_id = e.target.value;
                      setFormData({ ...formData, payments: newPayments });
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un compte</option>
                    {accounts
                      .filter((acc) => acc.is_active)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Montant</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payment.amount}
                      onChange={(e) => {
                        const newPayments = [...formData.payments];
                        newPayments[index].amount = e.target.value;
                        setFormData({ ...formData, payments: newPayments });
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  {formData.payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newPayments = formData.payments.filter((_, i) => i !== index);
                        setFormData({ ...formData, payments: newPayments });
                      }}
                      className="px-2 py-2 text-red-600 hover:text-red-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {formData.payments.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Total payé : {formatCurrency(
                  formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                  formData.rate_currency
                )}
              </p>
            )}
          </div>

          {/* Aperçu du résumé de paiement */}
          {(formData.payments.length > 0 || formData.weight_kg) && (
            (formData.weight_kg && formData.rate && parseFloat(formData.weight_kg) > 0 && parseFloat(formData.rate) > 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Résumé :</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Prix total:</span>
                    <span className="ml-2 font-semibold">
                      {formData.rate_currency === 'MAD' 
                        ? formatCurrency(calculatePricesFromRate().price_mad, 'MAD')
                        : formatCurrency(calculatePricesFromRate().price_cfa, 'CFA')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avance payée:</span>
                    <span className="ml-2 font-semibold">
                      {formatCurrency(
                        formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                        formData.rate_currency
                      )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Reste à payer:</span>
                    <span className={`ml-2 font-semibold ${(() => {
                      const total = formData.rate_currency === 'MAD' ? calculatePricesFromRate().price_mad : calculatePricesFromRate().price_cfa;
                      const paid = formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                      const remaining = total - paid;
                      return remaining > 0 ? 'text-red-600' : 'text-green-600';
                    })()}`}>
                      {(() => {
                        const total = formData.rate_currency === 'MAD' ? calculatePricesFromRate().price_mad : calculatePricesFromRate().price_cfa;
                        const paid = formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                        const remaining = total - paid;
                        return formatCurrency(Math.max(0, remaining), formData.rate_currency);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}

          {selectedParcel && (
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
                <option value="registered">Enregistré</option>
                <option value="ready_for_departure">Prêt pour départ</option>
                <option value="loaded">Embarqué</option>
                <option value="in_transit">En transit</option>
                <option value="arrived">Arrivé</option>
                <option value="ready_for_pickup">Prêt pour récupération</option>
                <option value="delivered">Livré</option>
                <option value="cancelled">Annulé</option>
              </select>
              {errors.status?.[0] && <p className="mt-1 text-sm text-red-600">{errors.status[0]}</p>}
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedParcel(null);
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
                <span>{selectedParcel ? 'Modifier' : 'Créer'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pour voir un colis */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewedParcel(null);
        }}
        title={`Colis ${viewedParcel?.reference || ''}`}
        size="xl"
      >
        {viewedParcel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Client expéditeur</p>
                <p className="font-medium">
                  {viewedParcel.client ? `${viewedParcel.client.first_name} ${viewedParcel.client.last_name}` : '-'}
                </p>
                {viewedParcel.client?.phone && (
                  <p className="text-xs text-gray-500">{viewedParcel.client.phone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Client receveur</p>
                <p className="font-medium">
                  {viewedParcel.receiver_client ? `${viewedParcel.receiver_client.first_name} ${viewedParcel.receiver_client.last_name}` : '-'}
                </p>
                {viewedParcel.receiver_client?.phone && (
                  <p className="text-xs text-gray-500">{viewedParcel.receiver_client.phone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(viewedParcel.status)}`}>
                  {formatStatus(viewedParcel.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Poids</p>
                <p className="font-medium">{viewedParcel.weight_kg} kg</p>
              </div>
            </div>

            {viewedParcel.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-sm text-gray-900">{viewedParcel.description}</p>
              </div>
            )}

            {/* Prix */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Prix</h3>
              <div className="space-y-2">
                {viewedParcel.price_mad > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Prix MAD:</span>
                    <span className="font-semibold">{formatCurrency(viewedParcel.price_mad, 'MAD')}</span>
                  </div>
                )}
                {viewedParcel.price_cfa > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Prix CFA:</span>
                    <span className="font-semibold">{formatCurrency(viewedParcel.price_cfa, 'CFA')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informations de récupération si livré */}
            {viewedParcel.status === 'delivered' && viewedParcel.pickup_receiver_name && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Informations de récupération</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">Récupéré par:</span> {viewedParcel.pickup_receiver_name}</p>
                  {viewedParcel.pickup_receiver_phone && (
                    <p><span className="text-gray-600">Téléphone:</span> {viewedParcel.pickup_receiver_phone}</p>
                  )}
                  {viewedParcel.pickup_receiver_id_number && (
                    <p><span className="text-gray-600">Pièce d'identité:</span> {viewedParcel.pickup_receiver_id_number}</p>
                  )}
                  {viewedParcel.picked_up_at && (
                    <p><span className="text-gray-600">Date de récupération:</span> {formatDate(viewedParcel.picked_up_at)}</p>
                  )}
                  {viewedParcel.pickup_receiver_note && (
                    <p><span className="text-gray-600">Note:</span> {viewedParcel.pickup_receiver_note}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleGenerateReceipt(viewedParcel.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Générer reçu
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewedParcel(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal pour la récupération */}
      <Modal
        isOpen={isPickupModalOpen}
        onClose={() => {
          setIsPickupModalOpen(false);
          setPickupParcel(null);
          setPickupData({
            pickup_receiver_name: '',
            pickup_receiver_phone: '',
            pickup_receiver_id_number: '',
            pickup_receiver_note: '',
          });
          setErrors({});
        }}
        title={`Récupération - Colis ${pickupParcel?.reference || ''}`}
        size="md"
      >
        {pickupParcel && (
          <div className="space-y-4">
            {/* Informations du colis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Informations du colis</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Client:</span> {pickupParcel.client ? `${pickupParcel.client.first_name} ${pickupParcel.client.last_name}` : '-'}</p>
                <p><span className="text-gray-600">Poids:</span> {pickupParcel.weight_kg} kg</p>
                {pickupParcel.price_mad > 0 && (
                  <p><span className="text-gray-600">Prix MAD:</span> {formatCurrency(pickupParcel.price_mad, 'MAD')}</p>
                )}
                {pickupParcel.price_cfa > 0 && (
                  <p><span className="text-gray-600">Prix CFA:</span> {formatCurrency(pickupParcel.price_cfa, 'CFA')}</p>
                )}
                {pickupParcel.has_debt && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Attention:</span> Ce colis a une dette de{' '}
                      {formatCurrency(
                        (pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate) - (parseFloat(pickupParcel.total_paid) || 0),
                        pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'
                      )}. Le montant payé doit couvrir complètement la dette.
                    </p>
                  </div>
                )}
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Avance payée:</span>{' '}
                    {formatCurrency(
                      parseFloat(pickupParcel.total_paid) || 0,
                      pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="font-medium">Reste à payer:</span>{' '}
                    <span className={pickupParcel.has_debt ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {formatCurrency(
                        Math.max(0, (pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate) - (parseFloat(pickupParcel.total_paid) || 0)),
                        pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'
                      )}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <FormInput
              label="Nom du récupérateur"
              name="pickup_receiver_name"
              value={pickupData.pickup_receiver_name}
              onChange={(e) => setPickupData({ ...pickupData, pickup_receiver_name: e.target.value })}
              error={errors.pickup_receiver_name?.[0]}
              required
              placeholder="Nom complet"
            />

            <FormInput
              label="Téléphone du récupérateur"
              name="pickup_receiver_phone"
              value={pickupData.pickup_receiver_phone}
              onChange={(e) => setPickupData({ ...pickupData, pickup_receiver_phone: e.target.value })}
              error={errors.pickup_receiver_phone?.[0]}
              placeholder="+212 6XX XXX XXX"
            />

            <FormInput
              label="Numéro de pièce d'identité"
              name="pickup_receiver_id_number"
              value={pickupData.pickup_receiver_id_number}
              onChange={(e) => setPickupData({ ...pickupData, pickup_receiver_id_number: e.target.value })}
              error={errors.pickup_receiver_id_number?.[0]}
              placeholder="CI / Passeport"
            />

            <div>
              <label htmlFor="pickup_receiver_note" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="pickup_receiver_note"
                name="pickup_receiver_note"
                rows={3}
                value={pickupData.pickup_receiver_note}
                onChange={(e) => setPickupData({ ...pickupData, pickup_receiver_note: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notes additionnelles..."
              />
            </div>

            {/* Paiements fractionnés si le colis a une dette */}
            {pickupParcel && pickupParcel.has_debt && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Paiements pour régler la dette ({pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPickupData({
                          ...pickupData,
                          payments: [...(pickupData.payments || []), { account_id: '', amount: '' }],
                        });
                      }}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      + Ajouter un paiement
                    </button>
                  </div>
                  {(!pickupData.payments || pickupData.payments.length === 0) && (
                    <p className="text-sm text-gray-500 mb-2">Aucun paiement. Cliquez sur "Ajouter un paiement" pour en ajouter.</p>
                  )}
                  {pickupData.payments && pickupData.payments.map((payment, index) => (
                    <div key={index} className="grid grid-cols-2 gap-3 mb-3 p-3 border border-gray-200 rounded-lg bg-white">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Compte</label>
                        <select
                          value={payment.account_id}
                          onChange={(e) => {
                            const newPayments = [...(pickupData.payments || [])];
                            newPayments[index].account_id = e.target.value;
                            setPickupData({ ...pickupData, payments: newPayments });
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sélectionner un compte</option>
                          {accounts
                            .filter((acc) => acc.is_active)
                            .map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Montant</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payment.amount}
                            onChange={(e) => {
                              const newPayments = [...(pickupData.payments || [])];
                              newPayments[index].amount = e.target.value;
                              setPickupData({ ...pickupData, payments: newPayments });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                        {(pickupData.payments?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPayments = (pickupData.payments || []).filter((_, i) => i !== index);
                              setPickupData({ ...pickupData, payments: newPayments });
                            }}
                            className="px-2 py-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {pickupData.payments && pickupData.payments.length > 0 && (
                    <div className="mt-2 text-xs space-y-1">
                      <p className="text-gray-600">
                        Total payé : {formatCurrency(
                          pickupData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                          pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'
                        )}
                      </p>
                      {(() => {
                        const totalPaid = pickupData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                        const totalAmount = pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate;
                        const remainingDebt = totalAmount - pickupParcel.total_paid - totalPaid;
                        if (remainingDebt <= 0.01) {
                          return <p className="text-green-700 font-medium">✓ Le montant couvre la dette. Récupération autorisée.</p>;
                        } else {
                          return <p className="text-red-700 font-medium">✗ Reste à payer: {formatCurrency(remainingDebt, pickupParcel.price_mad > 0 ? 'MAD' : 'CFA')}. La récupération sera bloquée.</p>;
                        }
                      })()}
                      <p className="text-gray-500">
                        Dette restante avant paiement : {formatCurrency(
                          Math.max(0, (pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate) - (parseFloat(pickupParcel.total_paid) || 0)),
                          pickupParcel.price_mad > 0 ? 'MAD' : 'CFA'
                        )}
                      </p>
                    </div>
                  )}
                  {errors.payments && (
                    <p className="mt-1 text-sm text-red-500">{errors.payments[0]}</p>
                  )}
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsPickupModalOpen(false);
                  setPickupParcel(null);
                  setPickupData({
                    pickup_receiver_name: '',
                    pickup_receiver_phone: '',
                    pickup_receiver_id_number: '',
                    pickup_receiver_note: '',
                    payments: [],
                  });
                  setErrors({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={(() => {
                  const isRequiredFieldsFilled = pickupData.pickup_receiver_name && pickupData.pickup_receiver_name.trim();
                  if (!pickupParcel) return true;
                  if (!isRequiredFieldsFilled) return true;
                  
                  // Si le colis a une dette, vérifier que le montant payé couvre la dette
                  if (pickupParcel.has_debt) {
                    const totalAmount = pickupParcel.price_mad > 0 ? pickupParcel.price_mad : pickupParcel.price_cfa / exchangeRate;
                    const currentPaid = parseFloat(pickupParcel.total_paid) || 0;
                    const remainingDebt = Math.max(0, totalAmount - currentPaid);
                    const amountPaid = pickupData.payments && pickupData.payments.length > 0
                      ? pickupData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                      : 0;
                    const tolerance = remainingDebt > 1000 ? 1 : 0.01;
                    const remainingDebtAfter = Math.max(0, remainingDebt - amountPaid);
                    const isDebtCovered = amountPaid >= remainingDebt - tolerance && remainingDebtAfter <= tolerance;
                    return !isDebtCovered;
                  }
                  
                  return false;
                })()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Confirmer la récupération</span>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal pour créer/modifier un frais */}
      <Modal
        isOpen={isCostModalOpen}
        onClose={() => {
          setIsCostModalOpen(false);
          setSelectedCost(null);
          setCostFormData({
            type: 'flight_ticket',
            label: '',
            amount: '',
            currency: 'CFA',
            account_id: '',
            notes: '',
          });
          setErrors({});
        }}
        title={selectedCost ? `Modifier le frais "${selectedCost.label}"` : 'Nouveau frais'}
        size="lg"
      >
        <div className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de frais <span className="text-red-500">*</span>
              </label>
              <select
                value={costFormData.type}
                onChange={(e) => setCostFormData({ ...costFormData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="flight_ticket">Billet d'avion</option>
                <option value="customs">Douane</option>
                <option value="logistics">Logistique</option>
                <option value="fuel">Carburant</option>
                <option value="lodging">Hébergement</option>
                <option value="other">Autre</option>
              </select>
              {errors.type?.[0] && <p className="mt-1 text-sm text-red-600">{errors.type[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise <span className="text-red-500">*</span>
              </label>
              <select
                value={costFormData.currency}
                onChange={(e) => setCostFormData({ ...costFormData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CFA">CFA</option>
                <option value="MAD">MAD</option>
              </select>
              {errors.currency?.[0] && <p className="mt-1 text-sm text-red-600">{errors.currency[0]}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={costFormData.label}
              onChange={(e) => setCostFormData({ ...costFormData, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Billet d'avion Casablanca - Paris"
            />
            {errors.label?.[0] && <p className="mt-1 text-sm text-red-600">{errors.label[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costFormData.amount}
                onChange={(e) => setCostFormData({ ...costFormData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.amount?.[0] && <p className="mt-1 text-sm text-red-600">{errors.amount[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compte <span className="text-red-500">*</span>
              </label>
              <select
                value={costFormData.account_id}
                onChange={(e) => setCostFormData({ ...costFormData, account_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingData}
              >
                <option value="">Sélectionner un compte</option>
                {accounts
                  .filter(account => account.is_active && account.currency === costFormData.currency)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) - {formatCurrency(account.current_balance || account.initial_balance, account.currency)}
                    </option>
                  ))}
              </select>
              {errors.account_id?.[0] && <p className="mt-1 text-sm text-red-600">{errors.account_id[0]}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={costFormData.notes}
              onChange={(e) => setCostFormData({ ...costFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes additionnelles..."
            />
            {errors.notes?.[0] && <p className="mt-1 text-sm text-red-600">{errors.notes[0]}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsCostModalOpen(false);
                setSelectedCost(null);
                setCostFormData({
                  type: 'flight_ticket',
                  label: '',
                  amount: '',
                  currency: 'CFA',
                  account_id: '',
                  notes: '',
                });
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveCost}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>{selectedCost ? 'Modification...' : 'Création...'}</span>
                </>
              ) : (
                <span>{selectedCost ? 'Modifier' : 'Créer'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pour clôturer le trajet avec frais */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
          setErrors({});
        }}
        title="Clôturer le trajet"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Attention:</strong> Pour clôturer le trajet, vous devez renseigner les frais payés (billet, douane, etc.). 
              La date de fin sera automatiquement définie à aujourd'hui.
            </p>
          </div>

          {/* Liste des frais */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Frais du trajet</h3>
              <button
                onClick={addCloseCost}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Ajouter un frais
              </button>
            </div>

            {errors.costs && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.costs[0]}</p>
              </div>
            )}

            {closeCosts.map((cost, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-gray-900">Frais #{index + 1}</h4>
                  {closeCosts.length > 1 && (
                    <button
                      onClick={() => removeCloseCost(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de frais
                    </label>
                    <select
                      value={cost.type}
                      onChange={(e) => updateCloseCost(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="flight_ticket">Billet d'avion</option>
                      <option value="customs">Douane</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Devise
                    </label>
                    <select
                      value={cost.currency}
                      onChange={(e) => updateCloseCost(index, 'currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CFA">CFA</option>
                      <option value="MAD">MAD</option>
                    </select>
                  </div>
                </div>

                <FormInput
                  label="Libellé du frais"
                  name={`cost_label_${index}`}
                  value={cost.label}
                  onChange={(e) => updateCloseCost(index, 'label', e.target.value)}
                  error={errors[`costs.${index}.label`]?.[0]}
                  required
                  placeholder="Ex: Billet aller Maroc → Cameroun"
                />

                <FormInput
                  label="Montant"
                  name={`cost_amount_${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost.amount}
                  onChange={(e) => updateCloseCost(index, 'amount', e.target.value)}
                  error={errors[`costs.${index}.amount`]?.[0]}
                  required
                  placeholder="0.00"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={cost.notes}
                    onChange={(e) => updateCloseCost(index, 'notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes additionnelles..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsCloseModalOpen(false);
                setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmClose}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Clôture...</span>
                </>
              ) : (
                <span>Clôturer le trajet</span>
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
          setSelectedParcel(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer le colis"
        message={`Êtes-vous sûr de vouloir supprimer le colis "${selectedParcel?.reference}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default TripDetail;

