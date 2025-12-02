import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { businessConvoyService, businessOrderService, businessOrderItemService, clientService, productService, invoiceService, businessWaveService, businessConvoyCostService } from '../../services/api/business';
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

const ConvoyDetail = () => {
  const { hasAnyRole } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [convoy, setConvoy] = useState(null);
  const [wave, setWave] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]); // Comptes pour sélection
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState(null);
  const [convoyCosts, setConvoyCosts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewedOrder, setViewedOrder] = useState(null);
  const [pickupOrder, setPickupOrder] = useState(null);
  const [itemsOrder, setItemsOrder] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    reference: '',
    status: 'pending',
    currency: 'MAD',
    purchase_account_id: '', // Compte pour l'achat
    payments: [], // Paiements fractionnés [{ account_id, amount }]
    items: [],
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
  const [closeCosts, setCloseCosts] = useState([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', notes: '' }]);
  const [costFormData, setCostFormData] = useState({
    type: 'flight_ticket',
    label: '',
    amount: '',
    currency: 'CFA',
    account_id: '',
    notes: '',
  });
  const [secondaryCurrencies, setSecondaryCurrencies] = useState([]); // Devises secondaires (MAD, EUR, etc.)

  // Charger le convoi, la vague et les commandes
  useEffect(() => {
    loadConvoy();
    loadOrders();
    loadData();
    loadCompanySettings();
    loadSecondaryCurrencies();
    loadConvoyCosts();
  }, [id]);

  const loadConvoy = async () => {
    try {
      setLoading(true);
      const response = await businessConvoyService.getById(id);
      if (response.data.success) {
        const convoyData = response.data.data;
        setConvoy(convoyData);
        if (convoyData.wave) {
          setWave(convoyData.wave);
        } else if (convoyData.business_wave_id) {
          try {
            const waveResponse = await businessWaveService.getById(convoyData.business_wave_id);
            if (waveResponse.data.success) {
              setWave(waveResponse.data.data);
            } else {
              console.error('Vague non trouvée pour le convoi');
            }
          } catch (waveError) {
            console.error('Erreur lors du chargement de la vague:', waveError);
          }
        } else {
          console.error('Aucune vague associée au convoi');
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du convoi:', error);
      alert('Convoi non trouvé');
      navigate('/business/convoys');
    } finally {
      setLoading(false);
    }
  };

  // Charger les frais du convoi
  const loadConvoyCosts = async () => {
    try {
      const response = await businessConvoyCostService.getAll({ business_convoy_id: id });
      if (response.data.success) {
        const data = response.data.data;
        setConvoyCosts(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des frais:', error);
      setConvoyCosts([]);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await businessOrderService.getAll({ business_convoy_id: id });
      if (response.data.success) {
        const responseData = response.data.data;
        if (Array.isArray(responseData)) {
          setOrders(responseData);
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          setOrders(responseData.data);
        } else {
          setOrders([]);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [clientsRes, productsRes, accountsRes] = await Promise.all([
        clientService.getAll({ per_page: 100 }),
        productService.getAll({ per_page: 100, is_active: true }),
        accountService.getAll(),
      ]);

      if (clientsRes.data.success) {
        const data = clientsRes.data.data;
        setClients(Array.isArray(data) ? data : (data?.data || []));
      }

      if (productsRes.data.success) {
        const data = productsRes.data.data;
        setProducts(Array.isArray(data) ? data : (data?.data || []));
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

  // Fonctions de conversion
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

  // Ouvrir le modal pour créer une nouvelle commande
  const handleCreate = () => {
    if (!wave?.id) {
      alert('Erreur: La vague n\'est pas chargée. Veuillez réessayer.');
      return;
    }
    setSelectedOrder(null);
    setFormData({
      client_id: '',
      reference: '',
      status: 'pending',
      currency: 'MAD',
      purchase_account_id: '',
      payments: [],
      items: [{ product_id: '', product_name: '', quantity: 1, unit_price: '', purchase_price: '' }],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal pour modifier une commande
  const handleEdit = async (order) => {
    try {
      const response = await businessOrderService.getById(order.id);
      if (response.data.success) {
        const orderData = response.data.data;
        setSelectedOrder(orderData);
        setFormData({
          client_id: orderData.client_id || '',
          reference: orderData.reference || '',
          status: orderData.status || 'pending',
          currency: orderData.currency || 'MAD',
          purchase_account_id: orderData.purchase_account_id || '',
          payments: [], // Les paiements seront reconstruits si nécessaire
          items: orderData.items?.map(item => ({
            product_id: item.product_id || '',
            product_name: item.product?.name || item.product_name || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || '',
            purchase_price: item.purchase_price || '',
          })) || [{ product_id: '', product_name: '', quantity: 1, unit_price: '', purchase_price: '' }],
        });
        setErrors({});
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
      alert('Erreur lors du chargement de la commande');
    }
  };

  // Ouvrir le modal pour voir une commande
  const handleView = async (order) => {
    try {
      const response = await businessOrderService.getById(order.id);
      if (response.data.success) {
        setViewedOrder(response.data.data);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
    }
  };

  // Ouvrir le modal pour la récupération
  const handlePickup = (order) => {
    // Vérifier si la commande a une dette
    if (order.has_debt && order.total_paid < order.total_amount) {
      const remainingAmount = order.total_amount - order.total_paid;
      const message = `Cette commande a une dette de ${formatCurrency(remainingAmount, order.currency)}.\n\nVoulez-vous vraiment confirmer la récupération malgré la dette ?`;
      if (!window.confirm(message)) {
        return;
      }
      // Permettre la récupération mais afficher un avertissement dans le modal
    }
    setPickupOrder(order);
    const remainingDebt = order.total_amount - (order.total_paid || 0);
    setPickupData({
      pickup_receiver_name: '',
      pickup_receiver_phone: '',
      pickup_receiver_id_number: '',
      pickup_receiver_note: '',
      payments: order.has_debt && remainingDebt > 0 ? [{ account_id: '', amount: remainingDebt.toFixed(2) }] : [],
    });
    setErrors({});
    setIsPickupModalOpen(true);
  };

  // Ouvrir le modal pour gérer les items
  const handleManageItems = async (order) => {
    try {
      const response = await businessOrderService.getById(order.id);
      if (response.data.success) {
        setItemsOrder(response.data.data);
        setIsItemsModalOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la commande:', error);
    }
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleDelete = (order) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    try {
      await businessOrderService.delete(selectedOrder.id);
      await loadOrders();
      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression de la commande';
      alert(message);
    }
  };

  // Actions dynamiques selon le statut
  const handleConfirmOrder = async (order) => {
    try {
      await businessOrderService.update(order.id, { status: 'confirmed' });
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      alert(error.response?.data?.message || 'Erreur lors de la confirmation');
    }
  };

  const handleMarkInTransit = async (order) => {
    try {
      await businessOrderService.update(order.id, { status: 'in_transit' });
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors du marquage en transit:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage en transit');
    }
  };

  const handleMarkArrived = async (order) => {
    try {
      await businessOrderService.update(order.id, { status: 'arrived' });
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors du marquage comme arrivé:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage comme arrivé');
    }
  };

  const handleMarkReadyForPickup = async (order) => {
    try {
      await businessOrderService.update(order.id, { status: 'ready_for_pickup' });
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors du marquage prêt pour récupération:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage prêt pour récupération');
    }
  };

  const handleConfirmPickup = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Calculer le nouveau montant payé total
      const currentPaid = parseFloat(pickupOrder.total_paid) || 0;
      const totalAmount = parseFloat(pickupOrder.total_amount) || 0;
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
      if (pickupOrder.has_debt && remainingDebtBeforeRounded > tolerance) {
        // Si aucun paiement n'est saisi et qu'il y a une dette, bloquer
        if (!pickupData.payments || pickupData.payments.length === 0 || additionalPaidRounded <= 0) {
          alert(`Veuillez saisir le(s) paiement(s) pour régler la dette de ${formatCurrency(remainingDebtBeforeRounded, pickupOrder.currency)}.`);
          setErrors({ payments: ['Le(s) paiement(s) est/sont requis(s) pour régler la dette'] });
          return;
        }
        
        // Si le montant payé est inférieur à la dette restante, bloquer
        if (additionalPaidRounded < remainingDebtBeforeRounded - tolerance) {
          alert(`Le montant payé (${formatCurrency(additionalPaidRounded, pickupOrder.currency)}) est inférieur à la dette restante (${formatCurrency(remainingDebtBeforeRounded, pickupOrder.currency)}). Le montant doit être supérieur ou égal à la dette pour autoriser la récupération.`);
          setErrors({ amount_paid: ['Le montant payé doit être supérieur ou égal à la dette restante'] });
          return;
        }

        // Si après paiement il reste encore une dette significative (au-delà de la tolérance), bloquer
        if (remainingDebtAfterRounded > tolerance) {
          alert(`Attention: Après ce paiement, il reste encore ${formatCurrency(remainingDebtAfterRounded, pickupOrder.currency)} à payer. Le montant doit couvrir complètement la dette.`);
          setErrors({ amount_paid: ['Le montant payé doit couvrir complètement la dette restante'] });
          return;
        }
      }

      // Préparer les données de mise à jour
      const updateData = {
        pickup_receiver_name: pickupData.pickup_receiver_name,
        pickup_receiver_phone: pickupData.pickup_receiver_phone || null,
        pickup_receiver_id_number: pickupData.pickup_receiver_id_number || null,
        pickup_receiver_note: pickupData.pickup_receiver_note || null,
        status: 'delivered',
      };

      // Si un montant est payé, mettre à jour le total_paid
      // Le backend calculera automatiquement has_debt en fonction de total_paid vs total_amount
      if (additionalPaid > 0) {
        // Limiter le total_paid au total_amount maximum (pas de paiement en trop)
        updateData.total_paid = Math.min(newTotalPaid, pickupOrder.total_amount);
      }

      const response = await businessOrderService.update(pickupOrder.id, updateData);

      if (response.data.success) {
        setIsPickupModalOpen(false);
        await loadOrders();
        setPickupOrder(null);
        setPickupData({
          pickup_receiver_name: '',
          pickup_receiver_phone: '',
          pickup_receiver_id_number: '',
          pickup_receiver_note: '',
          amount_paid: '',
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

  const handleConfirmRemainingPayment = async (order) => {
    try {
      await businessOrderService.update(order.id, { total_paid: order.total_amount });
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors de la confirmation du reliquat:', error);
      alert(error.response?.data?.message || 'Erreur lors de la confirmation du reliquat');
    }
  };

  // Marquer un item comme reçu
  const handleMarkItemReceived = async (itemId, isReceived) => {
    try {
      await businessOrderItemService.update(itemId, { is_received: isReceived });
      await loadOrders();
      // Recharger la commande dans le modal si ouvert
      if (itemsOrder) {
        const response = await businessOrderService.getById(itemsOrder.id);
        if (response.data.success) {
          setItemsOrder(response.data.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du marquage de l\'item:', error);
      alert(error.response?.data?.message || 'Erreur lors du marquage de l\'item');
    }
  };

  // Actions en masse
  const handleMarkAllInTransit = async () => {
    if (!window.confirm('Voulez-vous marquer toutes les commandes en transit ?')) return;
    
    const ordersToUpdate = orders.filter(o => o.status === 'confirmed' || o.status === 'pending');
    try {
      await Promise.all(ordersToUpdate.map(order => 
        businessOrderService.update(order.id, { status: 'in_transit' })
      ));
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors du marquage en masse:', error);
      alert('Erreur lors du marquage en masse');
    }
  };

  const handleMarkAllArrived = async () => {
    if (!window.confirm('Voulez-vous marquer toutes les commandes comme arrivées ?')) return;
    
    const ordersToUpdate = orders.filter(o => o.status === 'in_transit');
    try {
      await Promise.all(ordersToUpdate.map(order => 
        businessOrderService.update(order.id, { status: 'arrived' })
      ));
      await loadOrders();
    } catch (error) {
      console.error('Erreur lors du marquage en masse:', error);
      alert('Erreur lors du marquage en masse');
    }
  };

  // Bouton WhatsApp
  const handleWhatsApp = (order) => {
    const client = order.client;
    if (!client || !client.phone) {
      alert('Aucun numéro de téléphone disponible pour ce client');
      return;
    }

    const remaining = order.total_amount - order.total_paid;
    const hasRemaining = remaining > 0;

    let message = `Bonjour ${client.first_name} ${client.last_name},\n\n`;
    message += `Votre commande #${order.reference} est arrivée et disponible pour récupération.\n\n`;

    if (companySettings) {
      message += `${companySettings.name ? `Entreprise: ${companySettings.name}\n` : ''}`;
      message += `${companySettings.address ? `📍 Adresse: ${companySettings.address}\n` : ''}`;
      message += `${companySettings.phone ? `📞 Téléphone: ${companySettings.phone}\n` : ''}`;
      message += `\n`;
    }

    message += `💰 Montant total: ${formatCurrency(order.total_amount, order.currency)}\n`;
    message += `💵 Déjà payé: ${formatCurrency(order.total_paid, order.currency)}\n`;
    if (hasRemaining) {
      message += `🔴 Reste à payer: ${formatCurrency(remaining, order.currency)}\n`;
    }

    message += `\n📍 Lieu de récupération: ${companySettings?.address || 'À confirmer'}\n\n`;
    message += `Merci !`;

    const phoneNumber = client.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
        business_convoy_id: id,
        type: costFormData.type,
        label: costFormData.label,
        amount: parseFloat(costFormData.amount),
        currency: costFormData.currency,
        account_id: parseInt(costFormData.account_id),
        notes: costFormData.notes || null,
      };

      if (selectedCost) {
        // Modifier
        await businessConvoyCostService.update(selectedCost.id, costData);
      } else {
        // Créer
        await businessConvoyCostService.create(costData);
      }

      setIsCostModalOpen(false);
      await loadConvoyCosts();
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
      await businessConvoyCostService.delete(cost.id);
      await loadConvoyCosts();
      alert('Frais supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du frais:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression du frais');
    }
  };

  // Ouvrir le modal de clôture avec frais
  const handleCloseConvoy = () => {
    // Vérifier qu'il n'y a pas de commandes en transit
    const ordersInTransit = orders.filter(o => o.status === 'in_transit');
    
    if (ordersInTransit.length > 0) {
      alert(`Impossible de clôturer le convoi. ${ordersInTransit.length} commande(s) sont encore en transit. Toutes les commandes doivent être livrées ou annulées.`);
      return;
    }

    // Vérifier que toutes les commandes sont livrées ou annulées (pas de pending, confirmed, arrived, ready_for_pickup)
    const ordersNotDelivered = orders.filter(o => 
      !['delivered', 'cancelled'].includes(o.status)
    );

    if (ordersNotDelivered.length > 0) {
      alert(`Impossible de clôturer le convoi. ${ordersNotDelivered.length} commande(s) ne sont pas encore livrées ou annulées. Toutes les commandes doivent être livrées ou annulées avant de clôturer le convoi.`);
      return;
    }

    // Charger les frais existants dans le modal de clôture
    const existingCosts = convoyCosts.map(cost => ({
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
    setCloseCosts([...closeCosts, { type: 'other', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
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
        setErrors({ costs: ['Au moins un frais avec un compte doit être renseigné pour clôturer le convoi'] });
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

      const response = await businessConvoyService.close(id, { costs: costsToSend });

      if (response.data.success) {
        setIsCloseModalOpen(false);
        setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', account_id: '', notes: '' }]);
        await loadConvoy();
        await loadOrders();
        await loadConvoyCosts();
      }
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        alert(error.response?.data?.message || 'Erreur lors de la clôture du convoi');
      }
    } finally {
      setSaving(false);
    }
  };

  // Ajouter un item à la commande
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', quantity: 1, unit_price: '', purchase_price: '' }],
    });
  };

  // Supprimer un item
  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // Mettre à jour un item
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id == value);
      if (product) {
        newItems[index].unit_price = product.sale_price || '';
        newItems[index].purchase_price = product.purchase_price || '';
        newItems[index].product_name = '';
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  // Calculer les totaux
  const calculateTotals = () => {
    let totalAmount = 0;
    let totalPurchaseCost = 0;

    formData.items.forEach(item => {
      if (item.quantity && item.unit_price) {
        totalAmount += parseFloat(item.quantity) * parseFloat(item.unit_price);
      }
      if (item.quantity && item.purchase_price) {
        totalPurchaseCost += parseFloat(item.quantity) * parseFloat(item.purchase_price);
      }
    });

    const totalMargin = totalAmount - totalPurchaseCost;
    const marginRate = totalAmount > 0 ? ((totalMargin / totalAmount) * 100).toFixed(2) : 0;

    return { totalAmount, totalPurchaseCost, totalMargin, marginRate };
  };

  // Sauvegarder (créer)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Valider qu'il y a au moins un item valide
      const validItems = formData.items.filter(item => (item.product_id || item.product_name) && item.quantity && item.unit_price !== '' && item.purchase_price !== '');
      
      if (validItems.length === 0) {
        alert('Veuillez ajouter au moins un produit valide avec quantité et prix.');
        return;
      }

      // Valider chaque item
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (item.product_id || item.product_name) {
          if (!item.quantity || parseInt(item.quantity) < 1) {
            alert(`La quantité du produit #${i + 1} est invalide.`);
            return;
          }
          if (!item.unit_price || parseFloat(item.unit_price) < 0) {
            alert(`Le prix unitaire du produit #${i + 1} est invalide.`);
            return;
          }
          if (!item.purchase_price || parseFloat(item.purchase_price) < 0) {
            alert(`Le prix d'achat du produit #${i + 1} est invalide.`);
            return;
          }
        }
      }

      // Nettoyer et convertir les prix (remplacer les virgules par des points)
      const cleanPrice = (price) => {
        if (typeof price === 'string') {
          return price.replace(',', '.');
        }
        return price;
      };

      const itemsToSend = validItems.map(item => {
        const unitPrice = cleanPrice(item.unit_price);
        const purchasePrice = cleanPrice(item.purchase_price);
        
        // Si product_id est fourni, ne pas envoyer product_name
        // Si product_name est fourni, ne pas envoyer product_id
        const itemData = {
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(unitPrice) || 0,
          purchase_price: parseFloat(purchasePrice) || 0,
        };
        
        if (item.product_id) {
          itemData.product_id = parseInt(item.product_id);
        } else if (item.product_name && item.product_name.trim()) {
          itemData.product_name = item.product_name.trim();
        }
        
        return itemData;
      });

      // Vérifier que la vague est chargée
      if (!wave?.id) {
        alert('Erreur: La vague n\'est pas chargée. Veuillez réessayer.');
        return;
      }

      const dataToSend = {
        client_id: parseInt(formData.client_id) || null,
        business_wave_id: parseInt(wave.id) || null,
        business_convoy_id: parseInt(id) || null,
        reference: formData.reference || '',
        status: selectedOrder ? formData.status : 'pending',
        currency: formData.currency,
        purchase_account_id: parseInt(formData.purchase_account_id) || null,
        payments: formData.payments.filter(p => p.account_id && p.amount > 0).map(p => ({
          account_id: parseInt(p.account_id),
          amount: parseFloat(p.amount),
        })),
        items: itemsToSend,
      };

      // Log pour déboguer
      console.log('Données envoyées au backend:', JSON.stringify(dataToSend, null, 2));

      let response;
      if (selectedOrder) {
        // Modifier la commande existante (on ne peut modifier que les items pour l'instant)
        // Pour une modification complète, il faudrait recréer la commande ou avoir un endpoint spécifique
        alert('La modification complète des commandes n\'est pas encore implémentée. Vous pouvez modifier les items via "Gérer items".');
        return;
      } else {
        // Créer une nouvelle commande
        response = await businessOrderService.create(dataToSend);
      }

      if (response?.data?.success) {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setFormData({
          client_id: '',
          reference: '',
          status: 'pending',
          currency: 'MAD',
          total_paid: '',
          items: [{ product_id: '', product_name: '', quantity: 1, unit_price: '', purchase_price: '' }],
        });
        setErrors({});
        await loadOrders();
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        console.error('Erreurs de validation:', error.response.data.errors);
        // Afficher les erreurs dans une alerte aussi pour voir rapidement
        const errorMessages = Object.entries(error.response.data.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
        alert(`Erreurs de validation:\n${errorMessages}`);
      } else {
        const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
        alert(message);
        console.error('Erreur lors de la sauvegarde:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  // Générer une facture
  const handleGenerateInvoice = async (orderId) => {
    try {
      const response = await invoiceService.generate(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadBlob(blob, `facture-${orderId}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      alert('Erreur lors de la génération de la facture');
    }
  };

  // Obtenir les actions disponibles selon le statut
  const getAvailableActions = (order) => {
    // Vérifier que l'ordre existe et a un statut
    if (!order || !order.status) {
      console.warn('Commande invalide ou sans statut:', order);
      return [{ label: 'Voir', action: () => handleView(order), color: 'blue' }];
    }

    // Si le convoi est fermé, seules les actions "Voir" et "Générer facture" sont disponibles
    const isConvoyClosed = convoy?.status === 'closed';
    if (isConvoyClosed) {
      return [
        { label: 'Voir', action: () => handleView(order), color: 'blue' },
        { label: 'Générer facture', action: () => handleGenerateInvoice(order.id), color: 'green' }
      ];
    }

    const actions = [];
    const status = order.status.toLowerCase(); // Normaliser le statut en minuscules
    
    // Toujours disponible
    actions.push({ label: 'Voir', action: () => handleView(order), color: 'blue' });
    actions.push({ label: 'Générer facture', action: () => handleGenerateInvoice(order.id), color: 'green' });
    
    // Modifier et Supprimer uniquement pour les statuts initiaux
    if (['pending', 'confirmed'].includes(status)) {
      actions.push({ label: 'Modifier', action: () => handleEdit(order), color: 'yellow' });
      actions.push({ label: 'Supprimer', action: () => handleDelete(order), color: 'red' });
    }
    
    // Actions selon le statut
    switch (status) {
      case 'pending':
        actions.push({ label: 'Confirmer', action: () => handleConfirmOrder(order), color: 'green' });
        break;
        
      case 'confirmed':
        actions.push({ label: 'Marquer en transit', action: () => handleMarkInTransit(order), color: 'purple' });
        break;
        
      case 'in_transit':
        actions.push({ label: 'Marquer arrivé', action: () => handleMarkArrived(order), color: 'blue' });
        break;
        
      case 'arrived':
        actions.push({ label: 'Marquer disponible', action: () => handleMarkReadyForPickup(order), color: 'green' });
        break;
        
      case 'ready_for_pickup':
        actions.push({ label: 'Informer WhatsApp', action: () => handleWhatsApp(order), color: 'green' });
        actions.push({ label: 'Gérer items', action: () => handleManageItems(order), color: 'blue' });
        // Toujours afficher le bouton de récupération, même avec dette (géré dans handlePickup)
        actions.push({ 
          label: order.has_debt ? 'Confirmer récupération (avec dette)' : 'Confirmer récupération', 
          action: () => handlePickup(order), 
          color: order.has_debt ? 'yellow' : 'green' 
        });
        break;
        
      case 'delivered':
        if (order.has_debt) {
          actions.push({ label: 'Confirmer reliquat', action: () => handleConfirmRemainingPayment(order), color: 'green' });
        }
        break;
        
      case 'cancelled':
        // Aucune action supplémentaire pour les commandes annulées
        break;
        
      default:
        // Pour tout autre statut, on garde au moins "Voir" et "Gérer items"
        console.warn(`Statut inconnu: ${status} pour la commande ${order.id}`);
        break;
    }
    
    // Ajouter "Gérer items" pour tous les statuts sauf delivered et cancelled, mais éviter le doublon avec ready_for_pickup
    if (status !== 'delivered' && status !== 'cancelled' && status !== 'ready_for_pickup') {
      actions.push({ label: 'Gérer items', action: () => handleManageItems(order), color: 'blue' });
    }
    
    return actions;
  };

  // Générer les colonnes du tableau dynamiquement avec conversions de devises
  const generateColumns = () => {
    const baseColumns = [
      {
        header: 'Référence',
        accessor: (order) => order.reference,
        sortable: true,
      },
      {
        header: 'Client',
        accessor: (order) => order.client?.first_name + ' ' + order.client?.last_name,
        render: (order) => (
          <span className="text-sm text-gray-900">
            {order.client ? `${order.client.first_name} ${order.client.last_name}` : '-'}
          </span>
        ),
        sortable: false,
      },
      // Colonnes toujours présentes : CFA et MAD
      // Montant total en CFA
      {
        header: 'Montant total (CFA)',
        accessor: (order) => getPriceInCurrency(order.total_amount, order.currency, 'CFA'),
        format: 'currency',
        render: (order) => {
          const amountCFA = getPriceInCurrency(order.total_amount, order.currency, 'CFA');
          return formatCurrency(amountCFA, 'CFA');
        },
        sortable: true,
      },
      // Montant total en MAD
      {
        header: 'Montant total (MAD)',
        accessor: (order) => getPriceInCurrency(order.total_amount, order.currency, 'MAD'),
        format: 'currency',
        render: (order) => {
          const amountMAD = getPriceInCurrency(order.total_amount, order.currency, 'MAD');
          return formatCurrency(amountMAD, 'MAD');
        },
        sortable: true,
      },
      // Payé en CFA
      {
        header: 'Payé (CFA)',
        accessor: (order) => getPriceInCurrency(order.total_paid, order.currency, 'CFA'),
        format: 'currency',
        render: (order) => {
          const paidCFA = getPriceInCurrency(order.total_paid, order.currency, 'CFA');
          return formatCurrency(paidCFA, 'CFA');
        },
        sortable: true,
      },
      // Payé en MAD
      {
        header: 'Payé (MAD)',
        accessor: (order) => getPriceInCurrency(order.total_paid, order.currency, 'MAD'),
        format: 'currency',
        render: (order) => {
          const paidMAD = getPriceInCurrency(order.total_paid, order.currency, 'MAD');
          return formatCurrency(paidMAD, 'MAD');
        },
        sortable: true,
      },
      // Reste à payer en CFA
      {
        header: 'Reste à payer (CFA)',
        accessor: (order) => {
          const totalCFA = getPriceInCurrency(order.total_amount, order.currency, 'CFA');
          const paidCFA = getPriceInCurrency(order.total_paid, order.currency, 'CFA');
          return totalCFA - paidCFA;
        },
        format: 'currency',
        render: (order) => {
          const totalCFA = getPriceInCurrency(order.total_amount, order.currency, 'CFA');
          const paidCFA = getPriceInCurrency(order.total_paid, order.currency, 'CFA');
          const remaining = totalCFA - paidCFA;
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
        accessor: (order) => {
          const totalMAD = getPriceInCurrency(order.total_amount, order.currency, 'MAD');
          const paidMAD = getPriceInCurrency(order.total_paid, order.currency, 'MAD');
          return totalMAD - paidMAD;
        },
        format: 'currency',
        render: (order) => {
          const totalMAD = getPriceInCurrency(order.total_amount, order.currency, 'MAD');
          const paidMAD = getPriceInCurrency(order.total_paid, order.currency, 'MAD');
          const remaining = totalMAD - paidMAD;
          return (
            <span className={remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {formatCurrency(remaining, 'MAD')}
            </span>
          );
        },
        sortable: true,
      },
    ];

    // Colonnes de conversion pour les autres devises secondaires (si configurées, ex: EUR)
    const conversionColumns = [];
    secondaryCurrencies.forEach((currencyConfig) => {
      const currencyCode = currencyConfig.code;
      
      // Ignorer CFA et MAD car déjà gérés ci-dessus
      if (currencyCode === 'CFA' || currencyCode === 'MAD') return;
      
      // Colonne équivalent Montant total
      conversionColumns.push({
        header: `Montant total (${currencyCode})`,
        accessor: (order) => getPriceInCurrency(order.total_amount, order.currency, currencyCode),
        render: (order) => {
          const amountInCurrency = getPriceInCurrency(order.total_amount, order.currency, currencyCode);
          return formatCurrency(amountInCurrency, currencyCode);
        },
        sortable: true,
      });

      // Colonne équivalent Payé
      conversionColumns.push({
        header: `Payé (${currencyCode})`,
        accessor: (order) => getPriceInCurrency(order.total_paid, order.currency, currencyCode),
        render: (order) => {
          const paidInCurrency = getPriceInCurrency(order.total_paid, order.currency, currencyCode);
          return formatCurrency(paidInCurrency, currencyCode);
        },
        sortable: true,
      });

      // Colonne équivalent Reste à payer
      conversionColumns.push({
        header: `Reste à payer (${currencyCode})`,
        accessor: (order) => {
          const totalInCurrency = getPriceInCurrency(order.total_amount, order.currency, currencyCode);
          const paidInCurrency = getPriceInCurrency(order.total_paid, order.currency, currencyCode);
          return totalInCurrency - paidInCurrency;
        },
        render: (order) => {
          const totalInCurrency = getPriceInCurrency(order.total_amount, order.currency, currencyCode);
          const paidInCurrency = getPriceInCurrency(order.total_paid, order.currency, currencyCode);
          const remaining = totalInCurrency - paidInCurrency;
          return (
            <span className={remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {formatCurrency(remaining, currencyCode)}
            </span>
          );
        },
        sortable: true,
      });
    });

    // Colonnes finales
    const finalColumns = [
      {
        header: 'Statut',
        accessor: (order) => order.status,
        format: 'status',
        render: (order) => (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(order.status)}`}>
              {formatStatus(order.status)}
            </span>
            {order.has_debt && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                Dette
              </span>
            )}
            {order.is_fully_received && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                Complète
              </span>
            )}
            {!order.is_fully_received && order.items?.some(i => i.is_received) && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                Partiel
              </span>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        header: 'Actions',
        accessor: () => null,
        render: (order) => {
          const actions = getAvailableActions(order);
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
                    'bg-orange-100 text-orange-700 hover:bg-orange-200'
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

  if (!convoy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Un convoi peut être clôturé si :
  // - Il a au moins une commande
  // - Toutes les commandes sont livrées (delivered) ou annulées (cancelled)
  // - Aucune commande n'est en transit (in_transit)
  const canCloseConvoy = orders.length > 0 && 
    orders.every(o => ['delivered', 'cancelled'].includes(o.status)) &&
    !orders.some(o => o.status === 'in_transit');
  
  const hasOrdersInTransit = orders.some(o => o.status === 'in_transit');
  const hasOrdersArrived = orders.some(o => o.status === 'arrived');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Link to="/business/waves" className="hover:text-orange-600 font-medium">Vagues</Link>
        <span>/</span>
        {wave && (
          <>
            <Link to={`/business/waves/${wave.id}`} className="hover:text-orange-600 font-medium">{wave.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-semibold">{convoy.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{convoy.name}</h1>
          <p className="text-orange-100 dark:text-orange-200 text-sm sm:text-base mt-1">
            {convoy.traveler_name} | {convoy.from_city}, {convoy.from_country} → {convoy.to_city}, {convoy.to_country}
          </p>
          <p className="text-orange-100 dark:text-orange-200 text-sm sm:text-base">
            {formatDate(convoy.planned_departure_date)} - {convoy.planned_arrival_date ? formatDate(convoy.planned_arrival_date) : 'En cours'}
            {convoy.end_date && (
              <> | Date de fin: {formatDate(convoy.end_date)}</>
            )}
          </p>
          <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(convoy.status)}`}>
            {formatStatus(convoy.status)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          {convoy?.status !== 'closed' && (
            <>
              {hasOrdersInTransit && (
                <button
                  onClick={handleMarkAllInTransit}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-purple-500 text-white rounded-lg sm:rounded-xl hover:bg-purple-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Marquer toutes en transit
                </button>
              )}
              {hasOrdersArrived && (
                <button
                  onClick={handleMarkAllArrived}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg sm:rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Marquer toutes arrivées
                </button>
              )}
            </>
          )}
          {canCloseConvoy && convoy.status !== 'closed' && (
            <button
              onClick={handleCloseConvoy}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Clôturer le convoi
            </button>
          )}
          {convoy?.status !== 'closed' && (
            <button
              onClick={handleCreate}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 rounded-lg sm:rounded-xl hover:bg-orange-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer une commande</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Frais du convoi (Boss et Admin uniquement) */}
      {convoy?.status !== 'closed' && hasAnyRole(['boss', 'admin']) && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Frais du convoi</h2>
            <button
              onClick={handleCreateCost}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Ajouter un frais</span>
            </button>
          </div>

          {convoyCosts.length === 0 ? (
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
                  {convoyCosts.map((cost) => (
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

      {/* Tableau des commandes */}
      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        itemsPerPage={10}
        emptyMessage="Aucune commande trouvée"
      />

      {/* Modal pour créer une commande */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
          setErrors({});
        }}
        title={selectedOrder ? `Modifier la commande ${selectedOrder.reference}` : 'Nouvelle commande'}
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-900 dark:text-orange-100">
              <strong>Vague:</strong> {wave?.name || 'Chargement...'} | <strong>Convoi:</strong> {convoy?.name || 'Chargement...'}
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">La commande sera automatiquement rattachée à cette vague et ce convoi.</p>
            {!wave?.id && (
              <p className="text-xs text-red-600 mt-1">⚠ Attention: La vague n'est pas encore chargée. Veuillez attendre un instant.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <ClientSelect
                label="Client"
                value={formData.client_id?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, client_id: value })}
                error={errors.client_id?.[0]}
                required
                disabled={loadingData}
                filterType="business"
                placeholder="Rechercher un client Business..."
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

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Référence (optionnel)"
                name="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                error={errors.reference?.[0]}
                placeholder="Auto-généré si vide"
              />
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                  Devise <span className="text-red-500">*</span>
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MAD">MAD</option>
                  <option value="CFA">CFA</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {/* Compte pour l'achat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compte pour l'achat <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchase_account_id}
                  onChange={(e) => setFormData({ ...formData, purchase_account_id: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.purchase_account_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
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
                {errors.purchase_account_id && (
                  <p className="mt-1 text-sm text-red-500">{errors.purchase_account_id[0]}</p>
                )}
              </div>

              {/* Paiements fractionnés */}
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
                      formData.currency
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lignes de commande */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Produits</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                + Ajouter un produit
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Produit #{index + 1}</h4>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Produit existant
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un produit</option>
                        {products
                          .filter(p => p.currency === formData.currency || !p.currency)
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.sale_price, product.currency)}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <FormInput
                        label="Ou nom du produit"
                        name={`product_name_${index}`}
                        value={item.product_name}
                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                        placeholder="Nom du produit"
                        disabled={!!item.product_id}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <FormInput
                      label="Quantité"
                      name={`quantity_${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      required
                    />
                    <FormInput
                      label={`Prix unitaire (${formData.currency})`}
                      name={`unit_price_${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                      required
                    />
                    <FormInput
                      label={`Prix d'achat (${formData.currency})`}
                      name={`purchase_price_${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.purchase_price}
                      onChange={(e) => updateItem(index, 'purchase_price', e.target.value)}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Résumé des totaux */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Résumé de la commande</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Montant total:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {formatCurrency(calculateTotals().totalAmount, formData.currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Avance payée:</span>
                <span className="ml-2 font-semibold text-orange-900 dark:text-orange-100">
                  {formatCurrency(
                    formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
                    formData.currency
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Reste à payer:</span>
                <span className={`ml-2 font-semibold ${
                  (calculateTotals().totalAmount - formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)) > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {formatCurrency(
                    Math.max(0, calculateTotals().totalAmount - formData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)),
                    formData.currency
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Coût d'achat:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {formatCurrency(calculateTotals().totalPurchaseCost, formData.currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Marge:</span>
                <span className="ml-2 font-semibold text-green-900">
                  {formatCurrency(calculateTotals().totalMargin, formData.currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Taux de marge:</span>
                <span className="ml-2 font-semibold text-green-900">{calculateTotals().marginRate}%</span>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSelectedOrder(null);
                setErrors({});
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !wave?.id}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>{selectedOrder ? 'Modification...' : 'Création...'}</span>
                </>
              ) : (
                <span>{selectedOrder ? 'Modifier la commande' : 'Créer la commande'}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal pour voir une commande */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewedOrder(null);
        }}
        title={`Commande ${viewedOrder?.reference || ''}`}
        size="xl"
      >
        {viewedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">
                  {viewedOrder.client ? `${viewedOrder.client.first_name} ${viewedOrder.client.last_name}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Vague</p>
                <p className="font-medium">{viewedOrder.wave?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Statut</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(viewedOrder.status)}`}>
                  {formatStatus(viewedOrder.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Devise</p>
                <p className="font-medium">{viewedOrder.currency}</p>
              </div>
            </div>

            {/* Items de la commande */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Produits</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qté</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">{item.product?.name || item.product_name || '-'}</td>
                        <td className="px-4 py-3 text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(item.unit_price, viewedOrder.currency)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(item.total_price, viewedOrder.currency)}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.is_received ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              ✓ Reçu
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                              En attente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Montant total:</span>
                <span className="font-semibold">{formatCurrency(viewedOrder.total_amount, viewedOrder.currency)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Payé:</span>
                <span className="font-semibold">{formatCurrency(viewedOrder.total_paid, viewedOrder.currency)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Reste à payer:</span>
                <span className={`font-semibold ${viewedOrder.has_debt ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(viewedOrder.total_amount - viewedOrder.total_paid, viewedOrder.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Marge:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(viewedOrder.total_margin_amount, viewedOrder.currency)} ({viewedOrder.margin_rate ? parseFloat(viewedOrder.margin_rate).toFixed(2) : '0.00'}%)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleGenerateInvoice(viewedOrder.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Générer facture
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setViewedOrder(null);
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
          setPickupOrder(null);
          setPickupData({
            pickup_receiver_name: '',
            pickup_receiver_phone: '',
            pickup_receiver_id_number: '',
            pickup_receiver_note: '',
            payments: [],
          });
          setErrors({});
        }}
        title={`Récupération - Commande ${pickupOrder?.reference || ''}`}
        size="md"
      >
        {pickupOrder && (
          <div className="space-y-4">
            {/* Informations de la commande */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Informations de la commande</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Client:</span> {pickupOrder.client ? `${pickupOrder.client.first_name} ${pickupOrder.client.last_name}` : '-'}</p>
                <p><span className="text-gray-600">Montant total:</span> {formatCurrency(pickupOrder.total_amount, pickupOrder.currency)}</p>
                <p><span className="text-gray-600">Payé:</span> {formatCurrency(pickupOrder.total_paid, pickupOrder.currency)}</p>
                {pickupOrder.has_debt && pickupOrder.total_paid < pickupOrder.total_amount && (
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-yellow-800 font-medium">⚠ Attention: Cette commande a une dette</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Reste à payer: <strong>{formatCurrency(pickupOrder.total_amount - pickupOrder.total_paid, pickupOrder.currency)}</strong>
                    </p>
                    <p className="text-yellow-700 text-xs mt-2">
                      Veuillez saisir le montant payé pour régler la dette. Le montant doit être supérieur ou égal à la dette restante.
                    </p>
                  </div>
                )}
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

            {/* Champ pour régler la dette si applicable */}
            {pickupOrder.has_debt && pickupOrder.total_paid < pickupOrder.total_amount && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <FormInput
                  label={`Montant payé pour régler la dette (${pickupOrder.currency})`}
                  name="amount_paid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pickupData.amount_paid}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPickupData({ ...pickupData, amount_paid: value });
                    // Réinitialiser l'erreur si on modifie
                    if (errors.amount_paid) {
                      setErrors({ ...errors, amount_paid: undefined });
                    }
                  }}
                  error={errors.amount_paid?.[0]}
                  required
                  placeholder="Montant à payer"
                  helpText={`Dette restante: ${formatCurrency(pickupOrder.total_amount - pickupOrder.total_paid, pickupOrder.currency)}`}
                />
                {pickupData.amount_paid && parseFloat(pickupData.amount_paid) > 0 && (
                  <div className="mt-2 text-xs">
                    {(() => {
                      const remainingDebt = pickupOrder.total_amount - pickupOrder.total_paid - parseFloat(pickupData.amount_paid) || 0;
                      if (remainingDebt <= 0.01) {
                        return <p className="text-green-700 font-medium">✓ Le montant couvre la dette. Récupération autorisée.</p>;
                      } else {
                        return <p className="text-red-700 font-medium">✗ Reste à payer: {formatCurrency(remainingDebt, pickupOrder.currency)}. La récupération sera bloquée.</p>;
                      }
                    })()}
                  </div>
                )}
              </div>
            )}

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

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsPickupModalOpen(false);
                  setPickupOrder(null);
                  setErrors({});
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Annuler
              </button>
              {(() => {
                // Calculer si la dette est couverte pour désactiver le bouton si nécessaire
                const currentPaid = parseFloat(pickupOrder?.total_paid) || 0;
                const totalAmount = parseFloat(pickupOrder?.total_amount) || 0;
                // Calculer le montant additionnel des paiements fractionnés
                const additionalPaid = pickupData.payments && pickupData.payments.length > 0
                  ? pickupData.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                  : 0;
                const newTotalPaid = currentPaid + additionalPaid;
                const remainingDebtBefore = Math.max(0, totalAmount - currentPaid);
                const remainingDebtAfter = Math.max(0, totalAmount - newTotalPaid);
                
                // Vérifier si les champs requis sont remplis
                const isRequiredFieldsFilled = pickupData.pickup_receiver_name && pickupData.pickup_receiver_name.trim().length > 0;
                
                // Si il y a une dette et que le montant payé ne couvre pas la dette, désactiver le bouton
                const hasDebt = pickupOrder?.has_debt && remainingDebtBefore > 0.01;
                
                // Dette couverte si : pas de dette OU (montant payé >= dette restante ET nouvelle dette reste <= petite tolérance)
                // On utilise une tolérance relative au montant pour gérer les arrondis
                // Pour les grands montants (comme 482000), on tolère jusqu'à 1 unité d'arrondi
                const tolerance = remainingDebtBefore > 1000 ? 1 : 0.01;
                
                // La dette est couverte si le montant payé couvre au moins la dette restante
                // On arrondit pour éviter les problèmes de précision décimale
                const additionalPaidRounded = Math.round(additionalPaid * 100) / 100;
                const remainingDebtBeforeRounded = Math.round(remainingDebtBefore * 100) / 100;
                const remainingDebtAfterRounded = Math.round(remainingDebtAfter * 100) / 100;
                
                // Simplifier : si le montant payé >= dette restante (avec tolérance), c'est OK
                // On vérifie aussi que la nouvelle dette restante est <= tolérance (pour s'assurer qu'il n'y a plus de dette significative)
                const isDebtCovered = !hasDebt || (
                  additionalPaidRounded >= remainingDebtBeforeRounded - tolerance && 
                  remainingDebtAfterRounded <= tolerance
                );
                
                // Debug log (à retirer en production)
                if (hasDebt) {
                  console.log('Debug récupération:', {
                    additionalPaid: additionalPaid,
                    additionalPaidRounded,
                    remainingDebtBefore: remainingDebtBefore,
                    remainingDebtBeforeRounded,
                    remainingDebtAfter: remainingDebtAfter,
                    remainingDebtAfterRounded,
                    tolerance,
                    isDebtCovered,
                    isRequiredFieldsFilled
                  });
                }
                
                // Désactiver si : en cours de sauvegarde OU champs requis manquants OU (dette non couverte)
                const isDisabled = saving || !isRequiredFieldsFilled || (hasDebt && !isDebtCovered);
                
                let disabledReason = '';
                if (!isRequiredFieldsFilled) {
                  disabledReason = 'Veuillez remplir le nom du récupérateur';
                } else if (hasDebt && !isDebtCovered) {
                  disabledReason = 'Le montant payé doit couvrir la dette restante';
                }
                
                return (
                  <button
                    onClick={handleConfirmPickup}
                    disabled={isDisabled}
                    className={`px-4 py-2 ${pickupOrder?.has_debt && pickupOrder?.total_paid < pickupOrder?.total_amount ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                    title={disabledReason}
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
                );
              })()}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal pour gérer les items */}
      <Modal
        isOpen={isItemsModalOpen}
        onClose={() => {
          setIsItemsModalOpen(false);
          setItemsOrder(null);
        }}
        title={`Gérer les items - Commande ${itemsOrder?.reference || ''}`}
        size="lg"
      >
        {itemsOrder && (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                <strong>Client:</strong> {itemsOrder.client ? `${itemsOrder.client.first_name} ${itemsOrder.client.last_name}` : '-'}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Marquez individuellement chaque article comme reçu pour mettre à jour le statut de la commande.
              </p>
            </div>

            <div className="space-y-3">
              {itemsOrder.items?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product?.name || item.product_name || '-'}</h4>
                      <p className="text-sm text-gray-600">
                        Quantité: {item.quantity} | Prix unitaire: {formatCurrency(item.unit_price, itemsOrder.currency)}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        Total: {formatCurrency(item.total_price, itemsOrder.currency)}
                      </p>
                    </div>
                    <div className="ml-4">
                      {item.is_received ? (
                        <button
                          onClick={() => handleMarkItemReceived(item.id, false)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                        >
                          Marquer non reçu
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkItemReceived(item.id, true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Marquer reçu
                        </button>
                      )}
                    </div>
                  </div>
                  {item.is_received && item.received_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Reçu le {formatDate(item.received_at)} par {item.received_by?.name || '-'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Articles reçus:</span>
                <span className="font-semibold">
                  {itemsOrder.items?.filter(i => i.is_received).length || 0} / {itemsOrder.items?.length || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Statut:</span>
                <span className={`font-semibold ${itemsOrder.is_fully_received ? 'text-green-600' : 'text-yellow-600'}`}>
                  {itemsOrder.is_fully_received ? 'Commande complète' : 'Commande partielle'}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsItemsModalOpen(false);
                  setItemsOrder(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fermer
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
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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

      {/* Modal pour clôturer le convoi avec frais */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', notes: '' }]);
          setErrors({});
        }}
        title="Clôturer le convoi"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Attention:</strong> Pour clôturer le convoi, vous devez renseigner les frais payés (billet, douane, logistique, etc.). 
              La date de fin sera automatiquement définie à aujourd'hui.
            </p>
          </div>

          {/* Liste des frais */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Frais du convoi</h3>
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
                      <option value="logistics">Logistique</option>
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
                  placeholder="Ex: Billet avion voyageur X"
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
                setCloseCosts([{ type: 'flight_ticket', label: '', amount: '', currency: 'CFA', notes: '' }]);
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
                <span>Clôturer le convoi</span>
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
          setSelectedOrder(null);
        }}
        onConfirm={confirmDelete}
        title="Supprimer la commande"
        message={`Êtes-vous sûr de vouloir supprimer la commande "${selectedOrder?.reference}" ?`}
        variant="danger"
        confirmText="Supprimer"
      />
    </div>
  );
};

export default ConvoyDetail;

