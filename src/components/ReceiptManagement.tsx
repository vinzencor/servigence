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
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { dbHelpers, supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import PaymentMethodSelector from './PaymentMethodSelector';
import { exportToPDF } from '../utils/pdfExport';

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

        console.log(`📊 Receipt ${txn.reference_number}: Amount=${receiptAmount}, Applied=${totalApplied}, Available=${availableBalance}, Apps=${applications.length}`);

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

      // Auto-apply the advance payment to customer's unpaid billings
      if (transactionResult && transactionResult[0] && receiptForm.status !== 'cancelled') {
        try {
          console.log('🤖 Auto-applying advance payment to unpaid billings...');
          const autoApplyResult = await dbHelpers.autoApplyAdvancePayment(
            transactionResult[0].id,
            receiptForm.customerId,
            receiptForm.customerType,
            'current-user'
          );

          if (autoApplyResult.applied) {
            console.log('✅ Auto-application successful:', autoApplyResult);
            toast.success(
              `💰 Receipt created and applied!\n` +
              `Receipt Number: ${receiptNumber}\n` +
              `Applied AED ${autoApplyResult.totalApplied.toLocaleString()} to ${autoApplyResult.applications.length} billing(s)`,
              { duration: 5000 }
            );
          } else {
            console.log('ℹ️ No unpaid billings to apply to:', autoApplyResult.message);
            toast.success(`Receipt created successfully!\nReceipt Number: ${receiptNumber}\nAdvance payment recorded for Outstanding Report.`);
          }
        } catch (autoApplyError) {
          console.error('Error auto-applying advance payment:', autoApplyError);
          // Don't fail the receipt creation if auto-apply fails
          toast.success(`Receipt created successfully!\nReceipt Number: ${receiptNumber}`);
          toast.error('Failed to auto-apply to billings. You can apply manually.');
        }
      } else {
        toast.success(`Receipt created successfully!\nReceipt Number: ${receiptNumber}\nAdvance payment recorded for Outstanding Report.`);
      }

      setShowAddReceipt(false);
      resetReceiptForm();

      // Reload receipts to show updated utilization (don't add newReceipt to state, just reload)
      await loadReceipts();
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
      const newAmount = parseFloat(receiptForm.amount);
      const oldAmount = selectedReceipt.amount;

      console.log('💰 Updating receipt:', selectedReceipt.receiptNumber);
      console.log('📊 Old amount:', oldAmount, 'New amount:', newAmount);

      // Update corresponding account transaction if it exists
      if (selectedReceipt.transactionId) {
        // Step 1: Delete all existing applications
        console.log('🗑️ Deleting all existing applications...');
        const { data: existingApplications, error: fetchAppsError } = await supabase
          .from('advance_payment_applications')
          .select('id, applied_amount')
          .eq('receipt_transaction_id', selectedReceipt.transactionId);

        if (fetchAppsError) {
          console.error('❌ Error fetching applications:', fetchAppsError);
          throw fetchAppsError;
        }

        const totalPreviouslyApplied = existingApplications?.reduce((sum, app) => sum + parseFloat(app.applied_amount), 0) || 0;
        const applicationsCount = existingApplications?.length || 0;

        if (applicationsCount > 0) {
          console.log(`📊 Found ${applicationsCount} existing applications totaling AED ${totalPreviouslyApplied}`);

          const { error: deleteAppsError } = await supabase
            .from('advance_payment_applications')
            .delete()
            .eq('receipt_transaction_id', selectedReceipt.transactionId);

          if (deleteAppsError) {
            console.error('❌ Error deleting applications:', deleteAppsError);
            throw deleteAppsError;
          }

          console.log('✅ All existing applications deleted');
        }

        // Step 2: Update the receipt amount in account_transactions
        console.log('💾 Updating account transaction...');
        const transactionUpdateData = {
          amount: newAmount,
          payment_method: receiptForm.paymentMethod,
          notes: receiptForm.notes || '',
          description: receiptForm.description || `Payment via Receipt ${selectedReceipt.receiptNumber}`,
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('account_transactions')
          .update(transactionUpdateData)
          .eq('id', selectedReceipt.transactionId);

        if (updateError) {
          console.error('❌ Error updating account transaction:', updateError);
          throw updateError;
        }

        console.log('✅ Account transaction updated successfully');

        // Step 3: Re-apply the advance payment with the new amount
        if (receiptForm.status !== 'cancelled') {
          console.log('🤖 Re-applying advance payment with new amount...');
          const autoApplyResult = await dbHelpers.autoApplyAdvancePayment(
            selectedReceipt.transactionId,
            receiptForm.customerId,
            receiptForm.customerType,
            'current-user'
          );

          console.log('✅ Auto-apply result:', autoApplyResult);

          if (autoApplyResult.applied && autoApplyResult.applications && autoApplyResult.applications.length > 0) {
            const newTotalApplied = autoApplyResult.applications.reduce((sum: number, app: any) => sum + app.appliedAmount, 0);
            toast.success(
              `✅ Receipt updated successfully!\n` +
              `Amount: AED ${oldAmount.toLocaleString()} → AED ${newAmount.toLocaleString()}\n` +
              `Applied: AED ${newTotalApplied.toLocaleString()} to ${autoApplyResult.applications.length} billing(s)`,
              { duration: 5000 }
            );
          } else {
            toast.success(
              `✅ Receipt updated successfully!\n` +
              `Amount: AED ${oldAmount.toLocaleString()} → AED ${newAmount.toLocaleString()}\n` +
              `No unpaid billings to apply to.`,
              { duration: 4000 }
            );
          }
        } else {
          toast.success('Receipt updated successfully!');
        }

        // Dispatch event to notify other components
        const eventDetail = {
          receiptId: selectedReceipt.transactionId,
          customerId: receiptForm.customerId,
          customerType: receiptForm.customerType,
          action: 'updated',
          oldAmount,
          newAmount
        };
        console.log('🔔 DISPATCHING CustomEvent "receiptUpdated" with detail:', eventDetail);
        window.dispatchEvent(new CustomEvent('receiptUpdated', { detail: eventDetail }));

        // Also trigger storage event for cross-tab communication
        localStorage.setItem('receipt_updated', Date.now().toString());
        localStorage.removeItem('receipt_updated');
      }

      setShowEditReceipt(false);
      setSelectedReceipt(null);
      resetReceiptForm();

      // Reload receipts to show updated utilization
      await loadReceipts();
    } catch (error) {
      console.error('Error updating receipt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      toast.error(`Error updating receipt: ${errorMessage}`);
    }
  };

  const handleDeleteReceipt = (receiptId: string) => {
    setReceiptToDelete(receiptId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReceipt = async () => {
    if (!receiptToDelete) return;

    try {
      // Find the receipt to get its details
      const receiptToDeleteData = receipts.find(r => r.id === receiptToDelete);
      if (!receiptToDeleteData) {
        toast.error('Receipt not found');
        return;
      }

      console.log('🗑️ Deleting receipt:', receiptToDeleteData.receiptNumber);

      // Step 1: Get all applications of this receipt to show user what will be unapplied
      const { data: applications, error: applicationsError } = await supabase
        .from('advance_payment_applications')
        .select('id, applied_amount, billing_id')
        .eq('receipt_transaction_id', receiptToDelete);

      if (applicationsError) {
        console.error('❌ Error fetching applications:', applicationsError);
        throw applicationsError;
      }

      const totalApplied = applications?.reduce((sum, app) => sum + parseFloat(app.applied_amount), 0) || 0;
      const applicationsCount = applications?.length || 0;

      console.log(`📊 Receipt has ${applicationsCount} applications totaling AED ${totalApplied}`);

      // Step 2: Delete all applications (this will restore outstanding amounts in billings)
      if (applicationsCount > 0) {
        console.log('🗑️ Deleting advance payment applications...');
        const { error: deleteAppsError } = await supabase
          .from('advance_payment_applications')
          .delete()
          .eq('receipt_transaction_id', receiptToDelete);

        if (deleteAppsError) {
          console.error('❌ Error deleting applications:', deleteAppsError);
          throw deleteAppsError;
        }

        console.log('✅ Applications deleted successfully');
      }

      // Step 3: Delete the account transaction (receipt)
      console.log('🗑️ Deleting account transaction...');
      const { error: deleteTransactionError } = await supabase
        .from('account_transactions')
        .delete()
        .eq('id', receiptToDelete);

      if (deleteTransactionError) {
        console.error('❌ Error deleting account transaction:', deleteTransactionError);
        throw deleteTransactionError;
      }

      console.log('✅ Account transaction deleted successfully');

      // Show success message with details
      if (applicationsCount > 0) {
        toast.success(
          `✅ Receipt deleted successfully!\n` +
          `Receipt: ${receiptToDeleteData.receiptNumber}\n` +
          `Unapplied AED ${totalApplied.toLocaleString()} from ${applicationsCount} billing(s).\n` +
          `Outstanding amounts have been restored.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`✅ Receipt ${receiptToDeleteData.receiptNumber} deleted successfully!`);
      }

      // Dispatch event to notify other components
      const eventDetail = {
        receiptId: receiptToDelete,
        receiptNumber: receiptToDeleteData.receiptNumber,
        customerId: receiptToDeleteData.customerId,
        customerType: receiptToDeleteData.customerType,
        action: 'deleted',
        amount: receiptToDeleteData.amount,
        applicationsCount
      };
      console.log('🔔 DISPATCHING CustomEvent "receiptDeleted" with detail:', eventDetail);
      window.dispatchEvent(new CustomEvent('receiptDeleted', { detail: eventDetail }));

      // Also trigger storage event for cross-tab communication
      localStorage.setItem('receipt_deleted', Date.now().toString());
      localStorage.removeItem('receipt_deleted');

      setShowDeleteConfirm(false);
      setReceiptToDelete(null);

      // Reload receipts to refresh the list
      await loadReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      toast.error(`Error deleting receipt: ${errorMessage}`);
    }
  };

  const handlePrintReceipt = async (receipt: ReceiptData) => {
    try {
      // Generate and download the receipt
      const { generatePaymentReceipt } = await import('../utils/receiptGenerator');

      const receiptData = {
        receiptNumber: receipt.receiptNumber,
        date: new Date(receipt.date).toLocaleDateString(),
        customerName: receipt.customerName,
        customerType: receipt.customerType,
        customerId: receipt.customerId,
        amount: receipt.amount,
        description: receipt.description,
        paymentMethod: receipt.paymentMethod,
        status: receipt.status,
        transactionId: receipt.transactionId,
        notes: receipt.notes
      };

      generatePaymentReceipt(receiptData);
      toast.success(`Receipt ${receipt.receiptNumber} downloaded successfully!`);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt. Please try again.');
    }
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

  const handleExportPDF = () => {
    try {
      let dateRangeText = '';
      if (dateRange.startDate && dateRange.endDate) {
        dateRangeText = `Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`;
      } else if (dateRange.startDate) {
        dateRangeText = `From: ${new Date(dateRange.startDate).toLocaleDateString()}`;
      } else if (dateRange.endDate) {
        dateRangeText = `Until: ${new Date(dateRange.endDate).toLocaleDateString()}`;
      }

      // Prepare data for PDF export
      const pdfData = filteredReceipts.map(receipt => ({
        receiptNumber: receipt.receiptNumber,
        date: new Date(receipt.date).toLocaleDateString(),
        customerName: receipt.customerName,
        customerType: receipt.customerType === 'company' ? 'Company' : 'Individual',
        amount: receipt.amount,
        totalApplied: receipt.totalApplied || 0,
        availableBalance: receipt.availableBalance || 0,
        paymentMethod: receipt.paymentMethod.replace('_', ' ').toUpperCase(),
        status: receipt.status.toUpperCase(),
        description: receipt.description || '-'
      }));

      // Calculate summary
      const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
      const totalApplied = filteredReceipts.reduce((sum, r) => sum + (r.totalApplied || 0), 0);
      const totalAvailable = filteredReceipts.reduce((sum, r) => sum + (r.availableBalance || 0), 0);

      const summaryData = [
        { label: 'Total Receipts', value: filteredReceipts.length },
        { label: 'Total Amount', value: `AED ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Total Applied', value: `AED ${totalApplied.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Total Available', value: `AED ${totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
      ];

      exportToPDF({
        title: 'Receipt Management Report',
        subtitle: 'Payment Receipts and Advance Payments',
        dateRange: dateRangeText,
        columns: [
          { header: 'Receipt #', dataKey: 'receiptNumber' },
          { header: 'Date', dataKey: 'date' },
          { header: 'Customer', dataKey: 'customerName' },
          { header: 'Type', dataKey: 'customerType' },
          { header: 'Amount (AED)', dataKey: 'amount' },
          { header: 'Applied (AED)', dataKey: 'totalApplied' },
          { header: 'Available (AED)', dataKey: 'availableBalance' },
          { header: 'Payment Method', dataKey: 'paymentMethod' },
          { header: 'Status', dataKey: 'status' }
        ],
        data: pdfData,
        summaryData,
        fileName: `Receipt_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'landscape'
      });

      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Receipts</h2>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to PDF
            </button>
          </div>
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
                              Available: AED {(receipt.availableBalance !== undefined ? receipt.availableBalance : receipt.amount).toLocaleString()}
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

              {/* Utilization Information */}
              {selectedReceipt.status !== 'cancelled' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Utilization Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Total Amount</label>
                      <p className="text-lg font-semibold text-gray-900">AED {selectedReceipt.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Applied</label>
                      <p className="text-lg font-semibold text-red-600">AED {(selectedReceipt.totalApplied || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Available</label>
                      <p className="text-lg font-semibold text-green-600">
                        AED {(selectedReceipt.availableBalance !== undefined ? selectedReceipt.availableBalance : selectedReceipt.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedReceipt.applicationsCount && selectedReceipt.applicationsCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-600">
                        Applied to {selectedReceipt.applicationsCount} billing{selectedReceipt.applicationsCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
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
              <button
                onClick={() => handlePrintReceipt(selectedReceipt)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
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
