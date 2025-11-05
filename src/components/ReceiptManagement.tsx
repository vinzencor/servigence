import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  User,
  Printer,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { dbHelpers, supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import PaymentMethodSelector from './PaymentMethodSelector';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  date: string;
  customerName: string;
  customerType: 'company' | 'individual';
  customerId: string;
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
  status: 'paid' | 'cancelled';
  transactionId?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  // Utilization fields
  totalApplied?: number;
  availableBalance?: number;
  utilizationPercentage?: number;
  isFullyUtilized?: boolean;
  applicationsCount?: number;
}

interface Company {
  id: string;
  company_name: string;
  phone1?: string;
  email1?: string;
  status: string;
}

interface Individual {
  id: string;
  individual_name: string;
  phone1?: string;
  email1?: string;
  status: string;
}

const ReceiptManagement: React.FC = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showEditReceipt, setShowEditReceipt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);

  // Customer data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Form state for add/edit receipt
  const [receiptForm, setReceiptForm] = useState({
    receiptNumber: '',
    customerName: '',
    customerType: 'company' as 'company' | 'individual',
    customerId: '',
    amount: '',
    description: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online',
    status: 'paid' as 'paid' | 'cancelled',
    transactionId: '',
    notes: ''
  });

  // Load receipts and customers on component mount
  useEffect(() => {
    loadReceipts();
    loadCompanies(); // Load companies by default
  }, []);

  // Load customers when customer type changes
  useEffect(() => {
    if (showAddReceipt || showEditReceipt) {
      loadCustomers(receiptForm.customerType);
    }
  }, [receiptForm.customerType, showAddReceipt, showEditReceipt]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Load receipts from account_transactions table
      // Receipts are stored as advance_payment transactions with receipt numbers in the reference_number field
      const { data: transactions, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          company:companies(company_name, phone1, email1),
          individual:individuals(individual_name, phone1, email1)
        `)
        .eq('transaction_type', 'advance_payment')
        .not('reference_number', 'is', null)
        .like('reference_number', 'RCP-%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading receipts:', error);
        throw error;
      }

      // Get all receipt IDs to fetch applications in bulk
      const receiptIds = (transactions || []).map(t => t.id);

      // Get all applications for these receipts
      let allApplications: any[] = [];
      if (receiptIds.length > 0) {
        const { data: applications } = await supabase
          .from('advance_payment_applications')
          .select('receipt_transaction_id, applied_amount')
          .in('receipt_transaction_id', receiptIds);

        allApplications = applications || [];
      }

      // Transform account_transactions to ReceiptData format with utilization info
      const loadedReceipts: ReceiptData[] = (transactions || []).map(txn => {
        const receiptAmount = parseFloat(txn.amount || 0);

        // Calculate total applied from this receipt
        const applications = allApplications.filter(app => app.receipt_transaction_id === txn.id);
        const totalApplied = applications.reduce((sum, app) => sum + parseFloat(app.applied_amount || 0), 0);
        const availableBalance = receiptAmount - totalApplied;
        const utilizationPercentage = receiptAmount > 0 ? (totalApplied / receiptAmount) * 100 : 0;

        return {
          id: txn.id,
          receiptNumber: txn.reference_number || '',
          date: txn.transaction_date,
          customerName: txn.company_id
            ? (txn.company?.company_name || 'Unknown Company')
            : (txn.individual?.individual_name || 'Unknown Individual'),
          customerType: txn.company_id ? 'company' : 'individual',
          customerId: txn.company_id || txn.individual_id || '',
          amount: receiptAmount,
          description: txn.description || '',
          paymentMethod: txn.payment_method as any || 'cash',
          status: txn.status === 'cancelled' ? 'cancelled' : 'paid',
          transactionId: txn.id,
          notes: txn.notes || '',
          createdAt: txn.created_at,
          createdBy: txn.created_by || 'system',
          // Add utilization fields
          totalApplied,
          availableBalance,
          utilizationPercentage,
          isFullyUtilized: availableBalance <= 0,
          applicationsCount: applications.length
        };
      });

      setReceipts(loadedReceipts);
      console.log('✅ Loaded receipts from database with utilization:', loadedReceipts.length);
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Failed to load receipts');
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies from Supabase
  const loadCompanies = async () => {
    try {
      setLoadingCustomers(true);
      console.log('🏢 Loading companies...');
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, phone1, email1, status')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      console.log('🏢 Loaded companies:', data?.length || 0);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load individuals from Supabase
  const loadIndividuals = async () => {
    try {
      setLoadingCustomers(true);
      console.log('👤 Loading individuals...');
      const { data, error } = await supabase
        .from('individuals')
        .select('id, individual_name, phone1, email1, status')
        .eq('status', 'active')
        .order('individual_name');

      if (error) throw error;
      console.log('👤 Loaded individuals:', data?.length || 0);
      setIndividuals(data || []);
    } catch (error) {
      console.error('Error loading individuals:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Load customers based on customer type
  const loadCustomers = async (customerType: 'company' | 'individual') => {
    if (customerType === 'company') {
      await loadCompanies();
    } else {
      await loadIndividuals();
    }
  };

  // Filter receipts based on search and filters
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = searchTerm === '' || 
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || receipt.status === filterStatus;
    const matchesPaymentMethod = filterPaymentMethod === 'all' || receipt.paymentMethod === filterPaymentMethod;
    
    const matchesDateRange = (!dateRange.startDate || receipt.date >= dateRange.startDate) &&
                            (!dateRange.endDate || receipt.date <= dateRange.endDate);

    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesDateRange;
  });

  // Calculate summary statistics
  const totalReceipts = filteredReceipts.length;
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const paidReceipts = filteredReceipts.filter(r => r.status === 'paid').length;
  const cancelledReceipts = filteredReceipts.filter(r => r.status === 'cancelled').length;

  // Calculate utilization statistics
  const totalAppliedAmount = filteredReceipts
    .filter(r => r.status === 'paid')
    .reduce((sum, receipt) => sum + (receipt.totalApplied || 0), 0);
  const totalAvailableAmount = filteredReceipts
    .filter(r => r.status === 'paid')
    .reduce((sum, receipt) => sum + (receipt.availableBalance || receipt.amount), 0);
  const fullyUtilizedReceipts = filteredReceipts.filter(r => r.status === 'paid' && r.isFullyUtilized).length;
  const partiallyUsedReceipts = filteredReceipts.filter(r => r.status === 'paid' && !r.isFullyUtilized && (r.totalApplied || 0) > 0).length;
  const availableReceipts = filteredReceipts.filter(r => r.status === 'paid' && (r.totalApplied || 0) === 0).length;

  const handleCreateReceipt = async () => {
    try {
      // Generate receipt number
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(3, '0')}`;

      const newReceipt: ReceiptData = {
        id: Date.now().toString(),
        receiptNumber,
        date: new Date().toISOString().split('T')[0],
        customerName: receiptForm.customerName,
        customerType: receiptForm.customerType,
        customerId: receiptForm.customerId,
        amount: parseFloat(receiptForm.amount),
        description: receiptForm.description,
        paymentMethod: receiptForm.paymentMethod,
        status: receiptForm.status,
        transactionId: receiptForm.transactionId,
        notes: receiptForm.notes,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user'
      };

      // Create corresponding account transaction for Outstanding Report integration
      console.log('💰 Creating account transaction for receipt:', receiptNumber);

      const transactionData = {
        transaction_type: 'advance_payment',
        category: 'Receipt Payment',
        description: receiptForm.description || `Payment via Receipt ${receiptNumber}`,
        amount: parseFloat(receiptForm.amount),
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: receiptForm.paymentMethod,
        reference_number: receiptNumber,
        status: receiptForm.status === 'cancelled' ? 'cancelled' : 'completed',
        created_by: 'current-user',
        notes: `Receipt Number: ${receiptNumber}${receiptForm.notes ? ` | ${receiptForm.notes}` : ''}`,
        // Set customer ID based on customer type
        ...(receiptForm.customerType === 'company'
          ? { company_id: receiptForm.customerId, individual_id: null }
          : { individual_id: receiptForm.customerId, company_id: null }
        )
      };

      const { data: transactionResult, error: transactionError } = await supabase
        .from('account_transactions')
        .insert([transactionData])
        .select();

      if (transactionError) {
        console.error('❌ Error creating account transaction:', transactionError);
        throw new Error(`Failed to create account transaction: ${transactionError.message}`);
      }

      console.log('✅ Account transaction created successfully:', transactionResult);

      // Update the receipt with the transaction ID
      if (transactionResult && transactionResult[0]) {
        newReceipt.transactionId = transactionResult[0].id;
      }

      setReceipts(prev => [newReceipt, ...prev]);
      setShowAddReceipt(false);
      resetReceiptForm();
      toast.success(`Receipt created successfully!\nReceipt Number: ${receiptNumber}\nAdvance payment recorded for Outstanding Report.`);
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.error(`Error creating receipt: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const resetReceiptForm = () => {
    setReceiptForm({
      receiptNumber: '',
      customerName: '',
      customerType: 'company',
      customerId: '',
      amount: '',
      description: '',
      paymentMethod: 'cash',
      status: 'paid',
      transactionId: '',
      notes: ''
    });
  };

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      setReceiptForm(prev => ({ ...prev, customerId: '', customerName: '' }));
      return;
    }

    const customer = receiptForm.customerType === 'company'
      ? companies.find(c => c.id === customerId)
      : individuals.find(i => i.id === customerId);

    if (customer) {
      const customerName = receiptForm.customerType === 'company'
        ? (customer as Company).company_name
        : (customer as Individual).individual_name;

      setReceiptForm(prev => ({
        ...prev,
        customerId: customerId,
        customerName: customerName
      }));
    }
  };

  // Handle customer type change
  const handleCustomerTypeChange = (customerType: 'company' | 'individual') => {
    setReceiptForm(prev => ({
      ...prev,
      customerType,
      customerId: '', // Reset selected customer
      customerName: '' // Reset customer name
    }));
  };

  const handleViewReceipt = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetails(true);
  };

  const handleEditReceipt = (receipt: ReceiptData) => {
    setSelectedReceipt(receipt);
    setReceiptForm({
      receiptNumber: receipt.receiptNumber,
      customerName: receipt.customerName,
      customerType: receipt.customerType,
      customerId: receipt.customerId,
      amount: receipt.amount.toString(),
      description: receipt.description,
      paymentMethod: receipt.paymentMethod,
      status: receipt.status,
      transactionId: receipt.transactionId || '',
      notes: receipt.notes || ''
    });
    setShowEditReceipt(true);
  };

  const handleUpdateReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      const updatedReceipt: ReceiptData = {
        ...selectedReceipt,
        customerName: receiptForm.customerName,
        customerType: receiptForm.customerType,
        customerId: receiptForm.customerId,
        amount: parseFloat(receiptForm.amount),
        description: receiptForm.description,
        paymentMethod: receiptForm.paymentMethod,
        status: receiptForm.status,
        transactionId: receiptForm.transactionId,
        notes: receiptForm.notes
      };

      // Update corresponding account transaction if it exists
      if (selectedReceipt.transactionId) {
        console.log('💰 Updating account transaction for receipt:', selectedReceipt.receiptNumber);

        const transactionUpdateData = {
          description: receiptForm.description || `Payment via Receipt ${selectedReceipt.receiptNumber}`,
          amount: parseFloat(receiptForm.amount),
          payment_method: receiptForm.paymentMethod,
          status: receiptForm.status === 'cancelled' ? 'cancelled' : 'completed',
          notes: `Receipt Number: ${selectedReceipt.receiptNumber}${receiptForm.notes ? ` | ${receiptForm.notes}` : ''}`,
          // Update customer ID based on customer type
          ...(receiptForm.customerType === 'company'
            ? { company_id: receiptForm.customerId, individual_id: null }
            : { individual_id: receiptForm.customerId, company_id: null }
          )
        };

        const { error: transactionError } = await supabase
          .from('account_transactions')
          .update(transactionUpdateData)
          .eq('id', selectedReceipt.transactionId);

        if (transactionError) {
          console.error('❌ Error updating account transaction:', transactionError);
          // Don't throw error, just log it - receipt update should still proceed
        } else {
          console.log('✅ Account transaction updated successfully');
        }
      }

      setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? updatedReceipt : r));
      setShowEditReceipt(false);
      setSelectedReceipt(null);
      resetReceiptForm();
      toast.success('Receipt updated successfully!\nOutstanding Report will reflect the updated payment.');
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast.error('Error updating receipt. Please try again.');
    }
  };

  const handleDeleteReceipt = (receiptId: string) => {
    setReceiptToDelete(receiptId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      setReceipts(prev => prev.filter(r => r.id !== receiptToDelete));
      setShowDeleteConfirm(false);
      setReceiptToDelete(null);
      alert('Receipt deleted successfully!');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error deleting receipt. Please try again.');
    }
  };

  const handlePrintReceipt = (receipt: ReceiptData) => {
    // In a real implementation, this would generate and print a PDF receipt
    alert(`Printing receipt ${receipt.receiptNumber}...`);
  };

  const handleEmailReceipt = (receipt: ReceiptData) => {
    // In a real implementation, this would send the receipt via email
    alert(`Emailing receipt ${receipt.receiptNumber} to customer...`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText },
      issued: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
      paid: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      cash: DollarSign,
      bank_transfer: Building2,
      credit_card: Receipt,
      cheque: FileText,
      online: Receipt
    };
    return icons[method as keyof typeof icons] || DollarSign;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Receipt Management</h1>
                <p className="text-gray-500 mt-1">Create, manage, and track customer receipts</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddReceipt(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Create Receipt</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Receipts</p>
                  <p className="text-2xl font-bold text-gray-900">{totalReceipts}</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">AED {totalAmount.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Applied Amount</p>
                  <p className="text-2xl font-bold text-orange-600">AED {totalAppliedAmount.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Available Amount</p>
                  <p className="text-2xl font-bold text-green-600">AED {totalAvailableAmount.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Utilization Status</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-600">● Available</span>
                    <span className="font-semibold">{availableReceipts}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-orange-600">● Partial</span>
                    <span className="font-semibold">{partiallyUsedReceipts}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-600">● Utilized</span>
                    <span className="font-semibold">{fullyUtilizedReceipts}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search receipts by number, customer, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>

            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Start Date"
            />

            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="End Date"
            />
          </div>
        </div>

        {(searchTerm || filterStatus !== 'all' || filterPaymentMethod !== 'all' || dateRange.startDate || dateRange.endDate) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredReceipts.length} of {receipts.length} receipts
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterPaymentMethod('all');
                setDateRange({ startDate: '', endDate: '' });
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Receipts</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading receipts...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all' || filterPaymentMethod !== 'all' || dateRange.startDate || dateRange.endDate
                ? 'No receipts match your current filters.'
                : 'Get started by creating your first receipt.'}
            </p>
            <button
              onClick={() => setShowAddReceipt(true)}
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Receipt</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => {
                  const PaymentIcon = getPaymentMethodIcon(receipt.paymentMethod);
                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{receipt.receiptNumber}</div>
                          <div className="text-sm text-gray-500">{receipt.description}</div>
                          <div className="text-xs text-gray-400">{new Date(receipt.date).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            receipt.customerType === 'company' ? 'bg-blue-500' : 'bg-green-500'
                          }`}>
                            {receipt.customerType === 'company' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{receipt.customerName}</div>
                            <div className="text-sm text-gray-500 capitalize">{receipt.customerType}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">AED {receipt.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {receipt.status === 'cancelled' ? (
                          <span className="text-xs text-gray-400">N/A</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              {receipt.isFullyUtilized ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                  Fully Utilized
                                </span>
                              ) : receipt.totalApplied && receipt.totalApplied > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                  Partially Used
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                  Available
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              Applied: AED {(receipt.totalApplied || 0).toLocaleString()}
                            </div>
                            <div className="text-xs font-medium text-green-600">
                              Available: AED {(receipt.availableBalance || receipt.amount).toLocaleString()}
                            </div>
                            {receipt.applicationsCount && receipt.applicationsCount > 0 && (
                              <div className="text-xs text-gray-500">
                                {receipt.applicationsCount} application{receipt.applicationsCount > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <PaymentIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 capitalize">{receipt.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(receipt.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewReceipt(receipt)}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditReceipt(receipt)}
                            className="text-yellow-600 hover:text-yellow-700 p-1 rounded"
                            title="Edit Receipt"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintReceipt(receipt)}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEmailReceipt(receipt)}
                            className="text-purple-600 hover:text-purple-700 p-1 rounded"
                            title="Email Receipt"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(receipt.id)}
                            className="text-red-600 hover:text-red-700 p-1 rounded"
                            title="Delete Receipt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Receipt Modal */}
      {showAddReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
              <h2 className="text-xl font-semibold text-white">Create New Receipt</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type *</label>
                  <select
                    value={receiptForm.customerType}
                    onChange={(e) => handleCustomerTypeChange(e.target.value as 'company' | 'individual')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="company">Company</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select {receiptForm.customerType === 'company' ? 'Company' : 'Individual'} *
                  </label>
                  <select
                    value={receiptForm.customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    disabled={loadingCustomers}
                  >
                    <option value="">
                      {loadingCustomers
                        ? 'Loading...'
                        : `Select ${receiptForm.customerType === 'company' ? 'Company' : 'Individual'}`
                      }
                    </option>
                    {receiptForm.customerType === 'company'
                      ? companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.company_name}
                          </option>
                        ))
                      : individuals.map(individual => (
                          <option key={individual.id} value={individual.id}>
                            {individual.individual_name}
                          </option>
                        ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={receiptForm.paymentMethod}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              {/* Payment Method Selector - Shows saved payment methods */}
              {receiptForm.customerId && (
                <PaymentMethodSelector
                  customerId={receiptForm.customerId}
                  customerType={receiptForm.customerType}
                  selectedPaymentType={receiptForm.paymentMethod}
                  onPaymentDetailsChange={(details) => {
                    console.log('Payment details selected:', details);
                    // You can store these details in notes or a separate field if needed
                  }}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={receiptForm.description}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter service description (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={receiptForm.status}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={receiptForm.transactionId}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Optional transaction reference"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Additional notes (optional)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowAddReceipt(false);
                  resetReceiptForm();
                }}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReceipt}
                disabled={!receiptForm.customerId || !receiptForm.amount}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Details Modal */}
      {showReceiptDetails && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
              <h2 className="text-xl font-semibold text-white">Receipt Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Receipt Number</label>
                      <p className="text-sm text-gray-900">{selectedReceipt.receiptNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date</label>
                      <p className="text-sm text-gray-900">{new Date(selectedReceipt.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount</label>
                      <p className="text-lg font-semibold text-gray-900">AED {selectedReceipt.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedReceipt.status)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer Name</label>
                      <p className="text-sm text-gray-900">{selectedReceipt.customerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer Type</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedReceipt.customerType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Method</label>
                      <p className="text-sm text-gray-900 capitalize">{selectedReceipt.paymentMethod.replace('_', ' ')}</p>
                    </div>
                    {selectedReceipt.transactionId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                        <p className="text-sm text-gray-900">{selectedReceipt.transactionId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-sm text-gray-900 mt-1">{selectedReceipt.description}</p>
              </div>

              {selectedReceipt.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedReceipt.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Created: {new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                  <span>Created by: {selectedReceipt.createdBy}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleEmailReceipt(selectedReceipt)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setShowReceiptDetails(false);
                  setSelectedReceipt(null);
                }}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Receipt Modal */}
      {showEditReceipt && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-600 to-yellow-700">
              <h2 className="text-xl font-semibold text-white">Edit Receipt</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={receiptForm.receiptNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type *</label>
                  <select
                    value={receiptForm.customerType}
                    onChange={(e) => handleCustomerTypeChange(e.target.value as 'company' | 'individual')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="company">Company</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {receiptForm.customerType === 'company' ? 'Company' : 'Individual'} *
                </label>
                <select
                  value={receiptForm.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  disabled={loadingCustomers}
                >
                  <option value="">
                    {loadingCustomers
                      ? 'Loading...'
                      : `Select ${receiptForm.customerType === 'company' ? 'Company' : 'Individual'}`
                    }
                  </option>
                  {receiptForm.customerType === 'company'
                    ? companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.company_name}
                        </option>
                      ))
                    : individuals.map(individual => (
                        <option key={individual.id} value={individual.id}>
                          {individual.individual_name}
                        </option>
                      ))
                  }
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={receiptForm.paymentMethod}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>

              {/* Payment Method Selector - Shows saved payment methods */}
              {receiptForm.customerId && (
                <PaymentMethodSelector
                  customerId={receiptForm.customerId}
                  customerType={receiptForm.customerType}
                  selectedPaymentType={receiptForm.paymentMethod}
                  onPaymentDetailsChange={(details) => {
                    console.log('Payment details selected:', details);
                  }}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={receiptForm.description}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter service description (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={receiptForm.status}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={receiptForm.transactionId}
                    onChange={(e) => setReceiptForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Optional transaction reference"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Additional notes (optional)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowEditReceipt(false);
                  setSelectedReceipt(null);
                  resetReceiptForm();
                }}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReceipt}
                disabled={!receiptForm.customerId || !receiptForm.amount}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Delete Receipt</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Are you sure?</h3>
                  <p className="text-gray-500">This action cannot be undone. The receipt will be permanently deleted.</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setReceiptToDelete(null);
                }}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteReceipt}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptManagement;
