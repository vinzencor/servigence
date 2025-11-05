import React, { useState, useEffect } from 'react';
import { CreditCard, Building2, DollarSign, FileText, Globe, Plus, Check, X } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface PaymentMethodSelectorProps {
  customerId: string;
  customerType: 'company' | 'individual';
  selectedPaymentType: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
  onPaymentMethodSelect?: (method: CustomerPaymentMethod | null) => void;
  onPaymentDetailsChange?: (details: PaymentDetails) => void;
  className?: string;
}

interface CustomerPaymentMethod {
  id: string;
  payment_type: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
  method_name: string;
  card_number_last_four?: string;
  card_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  swift_code?: string;
  cheque_details?: string;
  online_payment_id?: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
}

interface PaymentDetails {
  cardNumberLastFour?: string;
  cardHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  chequeDetails?: string;
  onlinePaymentId?: string;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  customerId,
  customerType,
  selectedPaymentType,
  onPaymentMethodSelect,
  onPaymentDetailsChange,
  className = ''
}) => {
  const [savedMethods, setSavedMethods] = useState<CustomerPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<CustomerPaymentMethod | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newMethodForm, setNewMethodForm] = useState<PaymentDetails>({});

  // Load saved payment methods when component mounts or customer/payment type changes
  useEffect(() => {
    if (customerId && selectedPaymentType !== 'cash') {
      loadSavedMethods();
    } else {
      setSavedMethods([]);
      setSelectedMethod(null);
    }
  }, [customerId, customerType, selectedPaymentType]);

  const loadSavedMethods = async () => {
    try {
      setLoading(true);
      const methods = await dbHelpers.getCustomerPaymentMethods(customerId, customerType);
      
      // Filter methods by payment type
      const filteredMethods = methods.filter(m => m.payment_type === selectedPaymentType);
      setSavedMethods(filteredMethods);

      // Auto-select default method if available
      const defaultMethod = filteredMethods.find(m => m.is_default);
      if (defaultMethod) {
        handleSelectMethod(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Failed to load saved payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method: CustomerPaymentMethod) => {
    setSelectedMethod(method);
    setShowAddNew(false);
    
    // Notify parent component
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(method);
    }

    // Populate payment details
    const details: PaymentDetails = {
      cardNumberLastFour: method.card_number_last_four,
      cardHolderName: method.card_holder_name,
      bankName: method.bank_name,
      accountNumber: method.account_number,
      iban: method.iban,
      swiftCode: method.swift_code,
      chequeDetails: method.cheque_details,
      onlinePaymentId: method.online_payment_id
    };

    if (onPaymentDetailsChange) {
      onPaymentDetailsChange(details);
    }
  };

  const handleAddNewMethod = () => {
    setSelectedMethod(null);
    setShowAddNew(true);
    setNewMethodForm({});
    
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(null);
    }
  };

  const handleSaveNewMethod = async (saveForFuture: boolean) => {
    try {
      if (saveForFuture) {
        // Save to database
        const methodData: any = {
          customerId,
          customerType,
          paymentType: selectedPaymentType,
          methodName: getMethodName(),
          ...newMethodForm,
          isDefault: savedMethods.length === 0 // Set as default if it's the first method
        };

        await dbHelpers.createCustomerPaymentMethod(methodData);
        toast.success('Payment method saved successfully');
        
        // Reload methods
        await loadSavedMethods();
      }

      // Notify parent with the details
      if (onPaymentDetailsChange) {
        onPaymentDetailsChange(newMethodForm);
      }

      setShowAddNew(false);
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error('Failed to save payment method');
    }
  };

  const getMethodName = (): string => {
    switch (selectedPaymentType) {
      case 'credit_card':
        return `${newMethodForm.bankName || 'Card'} *${newMethodForm.cardNumberLastFour || '****'}`;
      case 'bank_transfer':
        return `${newMethodForm.bankName || 'Bank'} - ${newMethodForm.accountNumber || 'Account'}`;
      case 'cheque':
        return `Cheque - ${newMethodForm.bankName || 'Bank'}`;
      case 'online':
        return `Online - ${newMethodForm.onlinePaymentId || 'Payment'}`;
      default:
        return 'Payment Method';
    }
  };

  const getPaymentIcon = () => {
    switch (selectedPaymentType) {
      case 'credit_card': return CreditCard;
      case 'bank_transfer': return Building2;
      case 'cheque': return FileText;
      case 'online': return Globe;
      default: return DollarSign;
    }
  };

  // Don't show selector for cash payments
  if (selectedPaymentType === 'cash') {
    return null;
  }

  const Icon = getPaymentIcon();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 inline mr-2" />
          Saved Payment Methods
        </label>
        {savedMethods.length > 0 && !showAddNew && (
          <button
            type="button"
            onClick={handleAddNewMethod}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading saved methods...</div>
      ) : savedMethods.length === 0 && !showAddNew ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-600 mb-2">No saved payment methods found.</p>
          <button
            type="button"
            onClick={handleAddNewMethod}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Payment Method
          </button>
        </div>
      ) : (
        <>
          {/* Saved Methods List */}
          {!showAddNew && savedMethods.length > 0 && (
            <div className="space-y-2">
              {savedMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => handleSelectMethod(method)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedMethod?.id === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{method.method_name}</div>
                        {method.bank_name && (
                          <div className="text-xs text-gray-500">{method.bank_name}</div>
                        )}
                      </div>
                    </div>
                    {selectedMethod?.id === method.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                    {method.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Method Form */}
          {showAddNew && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Add New Payment Method</h4>
                <button
                  type="button"
                  onClick={() => setShowAddNew(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Credit Card Fields */}
              {selectedPaymentType === 'credit_card' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Card Holder Name
                    </label>
                    <input
                      type="text"
                      value={newMethodForm.cardHolderName || ''}
                      onChange={(e) => setNewMethodForm(prev => ({ ...prev, cardHolderName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newMethodForm.cardNumberLastFour || ''}
                      onChange={(e) => setNewMethodForm(prev => ({ ...prev, cardNumberLastFour: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1234"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={newMethodForm.bankName || ''}
                      onChange={(e) => setNewMethodForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Emirates NBD, ADCB, etc."
                    />
                  </div>
                </>
              )}

              {/* Bank Transfer Fields */}
              {selectedPaymentType === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={newMethodForm.bankName || ''}
                      onChange={(e) => setNewMethodForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Emirates NBD"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={newMethodForm.accountNumber || ''}
                      onChange={(e) => setNewMethodForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="1234567890"
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveNewMethod(true)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700"
                >
                  Save & Use
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewMethod(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-200"
                >
                  Use Once
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentMethodSelector;

