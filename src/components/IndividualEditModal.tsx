import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Save, DollarSign, CreditCard, Upload, Eye, Trash2, FileText, X, Edit2, Calendar } from 'lucide-react';
import { Individual, PaymentCard, ServiceEmployee, ServiceType } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface IndividualEditModalProps {
  individual: Individual;
  onClose: () => void;
  onSave: (updatedIndividual: Individual) => void;
}

const IndividualEditModal: React.FC<IndividualEditModalProps> = ({ individual, onClose, onSave }) => {
  const { user, isSuperAdmin } = useAuth();
  const [creditUsage, setCreditUsage] = useState<any>(null);
  const [loadingCreditUsage, setLoadingCreditUsage] = useState(false);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [serviceEmployees, setServiceEmployees] = useState<ServiceEmployee[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);

  const [formData, setFormData] = useState({
    individualName: individual.individualName || '',
    nationality: individual.nationality || '',
    phone1: individual.phone1 || '',
    phone2: individual.phone2 || '',
    email1: individual.email1 || '',
    email2: individual.email2 || '',
    address: individual.address || '',
    idNumber: individual.idNumber || '',
    passportNumber: individual.passportNumber || '',
    passportExpiry: individual.passportExpiry || '',
    emiratesId: individual.emiratesId || '',
    emiratesIdExpiry: individual.emiratesIdExpiry || '',
    visaNumber: individual.visaNumber || '',
    visaExpiry: individual.visaExpiry || '',
    licenseNumber: individual.licenseNumber || '',
    creditLimit: individual.creditLimit?.toString() || '',
    status: individual.status || 'active'
  });

  // Advance payment state
  const [showAdvancePayment, setShowAdvancePayment] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });

  // Existing advance payments state
  const [existingAdvancePayments, setExistingAdvancePayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: '',
    description: ''
  });

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [advancePaymentReceipt, setAdvancePaymentReceipt] = useState<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);

  // Load payment cards
  const loadPaymentCards = async () => {
    try {
      const cards = await dbHelpers.getPaymentCards();
      setPaymentCards(cards);
    } catch (error) {
      console.error('Error loading payment cards:', error);
    }
  };

  // Load service employees
  const loadServiceEmployees = async () => {
    try {
      const employees = await dbHelpers.getServiceEmployees();
      setServiceEmployees(employees);
    } catch (error) {
      console.error('Error loading service employees:', error);
    }
  };

  // Load services
  const loadServices = async () => {
    try {
      const serviceTypes = await dbHelpers.getServiceTypes();
      setServices(serviceTypes);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  // Load individual documents
  const loadIndividualDocuments = async () => {
    if (documentsLoaded) return;
    
    try {
      const { data: docs, error } = await supabase
        .from('individual_documents')
        .select('*')
        .eq('individual_id', individual.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedDocs = (docs || []).map(doc => ({
        id: doc.id,
        expiryDate: doc.expiry_date || '',
        serviceId: doc.service_id || '',
        file: null,
        fileUrl: doc.file_url,
        preview: null,
        isExisting: true,
        originalData: doc
      }));

      setDocuments(processedDocs);
      setDocumentsLoaded(true);
    } catch (error) {
      console.error('Error loading individual documents:', error);
      toast.error('Failed to load documents');
    }
  };

  // Load existing advance payments
  const loadExistingAdvancePayments = async () => {
    setLoadingPayments(true);
    try {
      const payments = await dbHelpers.getCustomerAdvancePayments(individual.id, 'individual');
      console.log('📋 Loaded existing advance payments:', payments);
      setExistingAdvancePayments(payments);
    } catch (error) {
      console.error('Error loading advance payments:', error);
      toast.error('Failed to load advance payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Load credit usage information and payment cards
  useEffect(() => {
    const loadCreditUsage = async () => {
      setLoadingCreditUsage(true);
      try {
        const usage = await dbHelpers.getIndividualCreditUsage(individual.id);
        setCreditUsage(usage);
      } catch (error) {
        console.error('Error loading credit usage:', error);
      } finally {
        setLoadingCreditUsage(false);
      }
    };

    // Reset documents loaded flag when individual changes
    setDocumentsLoaded(false);
    setDocuments([]);

    loadCreditUsage();
    loadPaymentCards();
    loadServiceEmployees();
    loadServices();
    loadIndividualDocuments();
    loadExistingAdvancePayments();
  }, [individual.id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.individualName.trim()) newErrors.individualName = 'Individual name is required';
    if (!formData.nationality?.trim()) newErrors.nationality = 'Nationality is required';
    if (!formData.phone1.trim()) newErrors.phone1 = 'Phone number is required';
    if (!formData.email1.trim()) newErrors.email1 = 'Email is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email1 && !emailRegex.test(formData.email1)) {
      newErrors.email1 = 'Invalid email format';
    }
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      newErrors.email2 = 'Invalid email format';
    }

    // Numeric validation
    if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
      newErrors.creditLimit = 'Credit limit must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAdvancePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdvancePaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.amount.toString(),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method === 'credit_card' ? 'card' : payment.payment_method,
      paymentReference: payment.payment_reference || '',
      notes: payment.notes || '',
      description: payment.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
    setEditPaymentForm({
      amount: '',
      paymentDate: '',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
      description: ''
    });
  };

  const handleSaveEditedPayment = async () => {
    if (!editingPayment) return;

    try {
      const updateData = {
        amount: editPaymentForm.amount,
        payment_date: editPaymentForm.paymentDate,
        payment_method: editPaymentForm.paymentMethod,
        notes: editPaymentForm.notes,
        description: editPaymentForm.description
      };

      const result = await dbHelpers.updateAdvancePayment(editingPayment.id, updateData);

      // Check if this fixed a data inconsistency
      if (result._wasOverApplied) {
        toast.success(
          `✅ Advance payment updated and data inconsistency fixed!\n` +
          `The receipt was previously over-applied (AED ${result._totalApplied} applied from AED ${result._oldAmount} receipt). ` +
          `This has now been corrected.`,
          { duration: 6000 }
        );
      } else {
        toast.success('Advance payment updated successfully!');
      }

      // Trigger storage event to notify other components (e.g., Service Billing)
      localStorage.setItem('advance_payment_updated', Date.now().toString());
      localStorage.removeItem('advance_payment_updated');

      // Reload payments
      await loadExistingAdvancePayments();

      // Clear editing state
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating advance payment:', error);

      // Show the full error message if it's a data inconsistency error
      const errorMessage = error instanceof Error ? error.message : 'Failed to update advance payment';

      if (errorMessage.includes('Data Inconsistency')) {
        // Show detailed error in an alert for better visibility
        alert(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setLoading(true);
    try {
      // Prepare update data for Supabase
      const updateData = {
        individual_name: formData.individualName,
        nationality: formData.nationality,
        phone1: formData.phone1,
        phone2: formData.phone2 || null,
        email1: formData.email1,
        email2: formData.email2 || null,
        address: formData.address || null,
        id_number: formData.idNumber || null,
        passport_number: formData.passportNumber || null,
        passport_expiry: formData.passportExpiry || null,
        emirates_id: formData.emiratesId || null,
        emirates_id_expiry: formData.emiratesIdExpiry || null,
        visa_number: formData.visaNumber || null,
        visa_expiry: formData.visaExpiry || null,
        license_number: formData.licenseNumber || null,
        credit_limit: parseFloat(formData.creditLimit),
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      console.log('Updating individual with data:', updateData);

      // Update individual in Supabase
      const { error: updateError } = await supabase
        .from('individuals')
        .update(updateData)
        .eq('id', individual.id);

      if (updateError) throw updateError;

      // Process advance payment if provided
      if (showAdvancePayment && advancePaymentForm.amount && parseFloat(advancePaymentForm.amount) > 0) {
        try {
          console.log('💰 Processing advance payment:', advancePaymentForm);

          const paymentData = {
            company_id: null,
            individual_id: individual.id,
            amount: parseFloat(advancePaymentForm.amount),
            payment_date: advancePaymentForm.paymentDate,
            payment_method: advancePaymentForm.paymentMethod,
            payment_reference: advancePaymentForm.paymentReference || null,
            notes: advancePaymentForm.notes || null,
            description: `Advance payment for individual: ${formData.individualName}`,
            created_by: user?.name || 'System'
          };

          console.log('💾 Saving advance payment:', paymentData);

          const createdPayment = await dbHelpers.createCustomerAdvancePayment(paymentData);

          console.log('✅ Advance payment created:', createdPayment);

          // Trigger storage event to notify other components (e.g., Service Billing)
          localStorage.setItem('advance_payment_updated', Date.now().toString());
          localStorage.removeItem('advance_payment_updated');

          // Reload existing payments list
          await loadExistingAdvancePayments();

          // Set receipt data for modal
          setAdvancePaymentReceipt({
            ...createdPayment,
            customerName: formData.individualName,
            customerType: 'individual'
          });

          // Show receipt modal
          setShowReceiptModal(true);

          toast.success(`💰 Advance payment of AED ${parseFloat(advancePaymentForm.amount).toLocaleString()} recorded successfully!`);
        } catch (error) {
          console.error('❌ Error processing advance payment:', error);
          toast.error('Failed to process advance payment. Individual updated successfully.');
        }
      }

      // Create updated individual object
      const updatedIndividual: Individual = {
        ...individual,
        individualName: formData.individualName,
        nationality: formData.nationality,
        phone1: formData.phone1,
        phone2: formData.phone2 || undefined,
        email1: formData.email1,
        email2: formData.email2 || undefined,
        address: formData.address || undefined,
        idNumber: formData.idNumber || undefined,
        passportNumber: formData.passportNumber || undefined,
        passportExpiry: formData.passportExpiry || undefined,
        emiratesId: formData.emiratesId || undefined,
        emiratesIdExpiry: formData.emiratesIdExpiry || undefined,
        visaNumber: formData.visaNumber || undefined,
        visaExpiry: formData.visaExpiry || undefined,
        licenseNumber: formData.licenseNumber || undefined,
        creditLimit: parseFloat(formData.creditLimit),
        status: formData.status as 'active' | 'inactive' | 'pending'
      };

      onSave(updatedIndividual);

      toast.success('Individual updated successfully!');
    } catch (error) {
      console.error('Error updating individual:', error);
      toast.error(`Error updating individual: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit Individual - {individual.individualName}</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Individual Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="individualName"
                value={formData.individualName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.individualName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter individual name"
              />
              {errors.individualName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.individualName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nationality <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.nationality ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter nationality"
              />
              {errors.nationality && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.nationality}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone1"
                value={formData.phone1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.phone1 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter primary phone number"
              />
              {errors.phone1 && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone 2</label>
              <input
                type="tel"
                name="phone2"
                value={formData.phone2}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter secondary phone number"
              />
            </div>
          </div>

          {/* Email Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email1"
                value={formData.email1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email1 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter primary email"
              />
              {errors.email1 && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email 2</label>
              <input
                type="email"
                name="email2"
                value={formData.email2}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email2 ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter secondary email"
              />
              {errors.email2 && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email2}
                </p>
              )}
            </div>
          </div>

          {/* Address and Credit Limit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit (AED)</label>
              <input
                type="number"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.creditLimit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.creditLimit && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.creditLimit}
                </p>
              )}
            </div>
          </div>

          {/* Document Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ID number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
              <input
                type="text"
                name="passportNumber"
                value={formData.passportNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter passport number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Passport Expiry</label>
              <input
                type="date"
                name="passportExpiry"
                value={formData.passportExpiry}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
              <input
                type="text"
                name="emiratesId"
                value={formData.emiratesId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Emirates ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID Expiry</label>
              <input
                type="date"
                name="emiratesIdExpiry"
                value={formData.emiratesIdExpiry}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
              <input
                type="text"
                name="visaNumber"
                value={formData.visaNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter visa number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
              <input
                type="date"
                name="visaExpiry"
                value={formData.visaExpiry}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter license number"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Advance Payment Section */}
          <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Advance Payments</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View and manage advance payments for this individual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancePayment(!showAdvancePayment)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                <span>{showAdvancePayment ? 'Hide' : 'Add New'} Advance Payment</span>
              </button>
            </div>

            {/* Existing Advance Payments List */}
            {loadingPayments ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading advance payments...</p>
              </div>
            ) : existingAdvancePayments.length > 0 ? (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Advance Payments</h4>
                <div className="space-y-3">
                  {existingAdvancePayments.map((payment) => (
                    <div key={payment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {editingPayment?.id === payment.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (AED) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                name="amount"
                                value={editPaymentForm.amount}
                                onChange={handleEditPaymentChange}
                                min="0.01"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                name="paymentDate"
                                value={editPaymentForm.paymentDate}
                                onChange={handleEditPaymentChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method <span className="text-red-500">*</span>
                              </label>
                              <select
                                name="paymentMethod"
                                value={editPaymentForm.paymentMethod}
                                onChange={handleEditPaymentChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                                <option value="card">Card</option>
                                <option value="online">Online</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                              <input
                                type="text"
                                name="paymentReference"
                                value={editPaymentForm.paymentReference}
                                onChange={handleEditPaymentChange}
                                placeholder="Transaction ID, Cheque number, etc."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="col-span-full">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                              <textarea
                                name="notes"
                                value={editPaymentForm.notes}
                                onChange={handleEditPaymentChange}
                                rows={2}
                                placeholder="Additional notes..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEditedPayment}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-600">Amount</p>
                              <p className="text-lg font-semibold text-gray-900">AED {parseFloat(payment.amount).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Payment Date</p>
                              <p className="text-sm font-medium text-gray-900 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(payment.payment_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Payment Method</p>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {payment.payment_method === 'credit_card' ? 'Card' : payment.payment_method.replace('_', ' ')}
                              </p>
                            </div>
                            {payment.receipt_number && (
                              <div>
                                <p className="text-xs text-gray-600">Receipt Number</p>
                                <p className="text-sm font-medium text-gray-900">{payment.receipt_number}</p>
                              </div>
                            )}
                            {payment.payment_reference && (
                              <div>
                                <p className="text-xs text-gray-600">Reference</p>
                                <p className="text-sm font-medium text-gray-900">{payment.payment_reference}</p>
                              </div>
                            )}
                            {payment.notes && (
                              <div className="col-span-full">
                                <p className="text-xs text-gray-600">Notes</p>
                                <p className="text-sm text-gray-700">{payment.notes}</p>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEditPayment(payment)}
                            className="ml-4 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No advance payments recorded yet</p>
                <p className="text-xs text-gray-500 mt-1">Click "Add New Advance Payment" to record one</p>
              </div>
            )}

            {showAdvancePayment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={advancePaymentForm.amount}
                    onChange={handleAdvancePaymentChange}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={advancePaymentForm.paymentDate}
                    onChange={handleAdvancePaymentChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMethod"
                    value={advancePaymentForm.paymentMethod}
                    onChange={handleAdvancePaymentChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                {/* Payment Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                  <input
                    type="text"
                    name="paymentReference"
                    value={advancePaymentForm.paymentReference}
                    onChange={handleAdvancePaymentChange}
                    placeholder="Transaction ID, Cheque number, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={advancePaymentForm.notes}
                    onChange={handleAdvancePaymentChange}
                    rows={3}
                    placeholder="Additional notes about the payment..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualEditModal;
