import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Download,
  Settings,
  Building,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  AlertTriangle,
  X
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Account {
  id: string;
  companyId: string;
  type: 'service_charge' | 'government_fee' | 'expense' | 'refund' | 'income';
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'credit_card' | 'online';
  reference?: string;
  invoiceId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  gstAmount?: number;
  gstRate?: number;
  profitMargin?: number;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
}

interface IncomeTransaction {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
  referenceNumber?: string;
  status: 'pending' | 'completed' | 'cancelled';
  companyName?: string;
  notes?: string;
  createdAt: string;
}

const AccountManagement: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(false);

  useEffect(() => {
    loadAccountTransactions();
    loadCompanies();
    loadIncomeTransactions();
  }, []);

  const loadCompanies = async () => {
    try {
      const companiesData = await dbHelpers.getCompanies(user?.service_employee_id, user?.role);
      console.log('Loaded companies for transactions:', companiesData);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadAccountTransactions = async () => {
    setLoading(true);
    try {
      const data = await dbHelpers.getAccountTransactions();
      console.log('Loaded account transactions:', data);

      // Transform the data to match our Account interface
      const transformedAccounts = (data || []).map((transaction: any) => ({
        id: transaction.id,
        companyId: transaction.company_id || '',
        type: transaction.transaction_type,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.transaction_date,
        paymentMethod: transaction.payment_method,
        reference: transaction.reference_number,
        status: transaction.status,
        createdBy: transaction.created_by,
        approvedBy: transaction.approved_by,
        notes: transaction.notes
      }));

      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      // Keep mock data as fallback
      setAccounts([
    {
      id: '1',
      companyId: 'comp1',
      type: 'service_charge',
      category: 'Visa Processing',
      description: 'Employment visa processing fee',
      amount: 2500,
      date: '2024-01-15',
      paymentMethod: 'bank_transfer',
      reference: 'TXN001',
      status: 'completed',
      gstAmount: 125,
      gstRate: 5,
      profitMargin: 800,
      createdBy: 'Admin',
      approvedBy: 'Manager'
    },
    {
      id: '2',
      companyId: 'comp2',
      type: 'government_fee',
      category: 'License Renewal',
      description: 'Trade license renewal government fee',
      amount: 5000,
      date: '2024-01-20',
      paymentMethod: 'cheque',
      reference: 'CHQ002',
      status: 'completed',
      gstAmount: 0,
      gstRate: 0,
      createdBy: 'Admin'
    },
    {
      id: '3',
      companyId: 'comp1',
      type: 'expense',
      category: 'Office Supplies',
      description: 'Monthly office supplies and stationery',
      amount: 450,
      date: '2024-01-25',
      paymentMethod: 'cash',
      status: 'pending',
      gstAmount: 22.5,
      gstRate: 5,
        createdBy: 'Staff'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const loadIncomeTransactions = async () => {
    setIncomeLoading(true);
    try {
      const data = await dbHelpers.getIncomeTransactions();
      console.log('Loaded income transactions:', data);
      setIncomeTransactions(data || []);
    } catch (error) {
      console.error('Error loading income transactions:', error);
      setIncomeTransactions([]);
    } finally {
      setIncomeLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'transactions' | 'government' | 'vendors' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Account | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Income-related modal states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showIncomeDetails, setShowIncomeDetails] = useState(false);
  const [showEditIncome, setShowEditIncome] = useState(false);
  const [showDeleteIncomeConfirm, setShowDeleteIncomeConfirm] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeTransaction | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // Transaction Form State
  const [transactionForm, setTransactionForm] = useState({
    type: 'service_charge' as 'service_charge' | 'government_fee' | 'expense' | 'refund',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'cheque' | 'card',
    reference: '',
    companyId: '',
    gstRate: '5',
    notes: ''
  });

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({
    category: 'Service Income',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online',
    reference: '',
    companyId: '',
    notes: ''
  });

  // Income filtering states
  const [incomeSearchTerm, setIncomeSearchTerm] = useState('');
  const [incomeFilterCategory, setIncomeFilterCategory] = useState<'all' | string>('all');
  const [incomeFilterStatus, setIncomeFilterStatus] = useState<'all' | string>('all');
  const [incomeFilterPaymentMethod, setIncomeFilterPaymentMethod] = useState<'all' | string>('all');
  const [incomeDateRange, setIncomeDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const handleCreateTransaction = async () => {
    try {
      // Validate required fields
      if (!transactionForm.description.trim()) {
        alert('Please enter a transaction description');
        return;
      }
      if (!transactionForm.amount || parseFloat(transactionForm.amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      if (!transactionForm.category.trim()) {
        alert('Please enter a category');
        return;
      }
      if (!transactionForm.date) {
        alert('Please select a transaction date');
        return;
      }

      const amount = parseFloat(transactionForm.amount);
      const gstRate = parseFloat(transactionForm.gstRate) || 5;
      const gstAmount = (amount * gstRate) / 100;

      // Prepare transaction data for database
      const transactionData = {
        transaction_type: transactionForm.type,
        category: transactionForm.category.trim(),
        description: transactionForm.description.trim(),
        amount: amount,
        transaction_date: transactionForm.date,
        payment_method: transactionForm.paymentMethod,
        reference_number: transactionForm.reference.trim() || null,
        company_id: transactionForm.companyId && transactionForm.companyId.trim() !== '' ? transactionForm.companyId : null,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        status: 'completed',
        created_by: 'System',
        notes: transactionForm.notes.trim() || null
      };

      console.log('Creating transaction with data:', transactionData);
      const result = await dbHelpers.createAccountTransaction(transactionData);
      console.log('Transaction created successfully:', result);

      // Reset form and close modal
      resetTransactionForm();
      setShowAddTransaction(false);
      alert('✅ Transaction created successfully!');

      // Reload transactions
      loadAccountTransactions();

    } catch (error) {
      console.error('Error creating transaction:', error);

      // Provide more specific error messages
      let errorMessage = 'Error creating transaction. ';
      if (error instanceof Error) {
        if (error.message.includes('foreign key')) {
          errorMessage += 'Invalid company selected.';
        } else if (error.message.includes('not null')) {
          errorMessage += 'Please fill in all required fields.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }

      alert(`❌ ${errorMessage}`);
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'service_charge',
      category: '',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      reference: '',
      companyId: '',
      gstRate: '5',
      notes: ''
    });
  };

  // Edit Transaction Form State
  const [editTransactionForm, setEditTransactionForm] = useState({
    type: 'service_charge' as 'service_charge' | 'government_fee' | 'expense' | 'refund' | 'vendor_payment',
    category: '',
    description: '',
    amount: 0,
    date: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'cheque' | 'card',
    reference: '',
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    gstAmount: 0,
    gstRate: 5,
    notes: ''
  });

  // Handler functions
  const handleExportData = () => {
    try {
      // Prepare CSV data
      const csvHeaders = [
        'Date',
        'Description',
        'Type',
        'Category',
        'Amount (AED)',
        'GST Amount (AED)',
        'Payment Method',
        'Status',
        'Reference',
        'Notes'
      ];

      const csvData = accounts.map(account => [
        account.date,
        account.description,
        account.type.replace('_', ' '),
        account.category,
        account.amount.toString(),
        (account.gstAmount || 0).toString(),
        account.paymentMethod.replace('_', ' '),
        account.status,
        account.reference || '',
        account.notes || ''
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `account_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Account data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const handleViewTransaction = (transaction: Account) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const handleEditTransaction = (transaction: Account) => {
    setSelectedTransaction(transaction);
    // Populate form with existing transaction data
    setEditTransactionForm({
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      paymentMethod: transaction.paymentMethod,
      reference: transaction.reference || '',
      status: transaction.status,
      gstAmount: transaction.gstAmount || 0,
      gstRate: transaction.gstRate || 5,
      notes: transaction.notes || ''
    });
    setShowEditTransaction(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      // Validate required fields
      if (!editTransactionForm.description.trim()) {
        alert('Please enter a transaction description');
        return;
      }
      if (editTransactionForm.amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      if (!editTransactionForm.date) {
        alert('Please select a transaction date');
        return;
      }

      // Update the transaction in the accounts array
      const updatedTransaction: Account = {
        ...selectedTransaction,
        type: editTransactionForm.type,
        category: editTransactionForm.category,
        description: editTransactionForm.description.trim(),
        amount: editTransactionForm.amount,
        date: editTransactionForm.date,
        paymentMethod: editTransactionForm.paymentMethod,
        reference: editTransactionForm.reference.trim() || undefined,
        status: editTransactionForm.status,
        gstAmount: editTransactionForm.gstAmount || undefined,
        gstRate: editTransactionForm.gstRate || undefined,
        notes: editTransactionForm.notes.trim() || undefined
      };

      // Update the accounts state
      setAccounts(prev => prev.map(account =>
        account.id === selectedTransaction.id ? updatedTransaction : account
      ));

      // Reset form and close modal
      setShowEditTransaction(false);
      setSelectedTransaction(null);
      alert('Transaction updated successfully!');

    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Error updating transaction. Please try again.');
    }
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTransaction = () => {
    if (transactionToDelete) {
      setAccounts(prev => prev.filter(account => account.id !== transactionToDelete));
      setTransactionToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Income Management Functions
  const handleCreateIncome = async () => {
    try {
      // Validate required fields
      if (!incomeForm.description.trim()) {
        alert('Please enter an income description');
        return;
      }
      if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      if (!incomeForm.category.trim()) {
        alert('Please select a category');
        return;
      }
      if (!incomeForm.date) {
        alert('Please select a transaction date');
        return;
      }

      const amount = parseFloat(incomeForm.amount);

      // Prepare income data for database
      const incomeData = {
        category: incomeForm.category.trim(),
        description: incomeForm.description.trim(),
        amount: amount,
        transaction_date: incomeForm.date,
        payment_method: incomeForm.paymentMethod,
        reference_number: incomeForm.reference.trim() || null,
        company_id: incomeForm.companyId && incomeForm.companyId.trim() !== '' ? incomeForm.companyId : null,
        status: 'completed',
        created_by: user?.email || 'System',
        notes: incomeForm.notes.trim() || null
      };

      console.log('Creating income with data:', incomeData);
      const result = await dbHelpers.createIncomeTransaction(incomeData);
      console.log('Income created successfully:', result);

      // Reset form and close modal
      resetIncomeForm();
      setShowAddIncome(false);
      alert('✅ Income recorded successfully!');

      // Reload income transactions
      loadIncomeTransactions();

    } catch (error) {
      console.error('Error creating income:', error);

      // Provide more specific error messages
      let errorMessage = 'Error recording income. ';
      if (error instanceof Error) {
        if (error.message.includes('foreign key')) {
          errorMessage += 'Invalid company selected.';
        } else if (error.message.includes('not null')) {
          errorMessage += 'Please fill in all required fields.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }

      alert(`❌ ${errorMessage}`);
    }
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      category: 'Service Income',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      reference: '',
      companyId: '',
      notes: ''
    });
  };

  const handleViewIncome = (income: IncomeTransaction) => {
    setSelectedIncome(income);
    setShowIncomeDetails(true);
  };

  const handleEditIncome = (income: IncomeTransaction) => {
    setSelectedIncome(income);
    // Populate form with existing income data
    setIncomeForm({
      category: income.category,
      description: income.description,
      amount: income.amount.toString(),
      date: income.date,
      paymentMethod: income.paymentMethod,
      reference: income.referenceNumber || '',
      companyId: '', // We'll need to get this from the income data
      notes: income.notes || ''
    });
    setShowEditIncome(true);
  };

  const handleUpdateIncome = async () => {
    if (!selectedIncome) return;

    try {
      // Validate required fields
      if (!incomeForm.description.trim()) {
        alert('Please enter an income description');
        return;
      }
      if (!incomeForm.amount || parseFloat(incomeForm.amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      if (!incomeForm.date) {
        alert('Please select a transaction date');
        return;
      }

      const amount = parseFloat(incomeForm.amount);

      // Prepare income data for database
      const incomeData = {
        category: incomeForm.category.trim(),
        description: incomeForm.description.trim(),
        amount: amount,
        transaction_date: incomeForm.date,
        payment_method: incomeForm.paymentMethod,
        reference_number: incomeForm.reference.trim() || null,
        company_id: incomeForm.companyId && incomeForm.companyId.trim() !== '' ? incomeForm.companyId : null,
        status: 'completed',
        notes: incomeForm.notes.trim() || null
      };

      console.log('Updating income with data:', incomeData);
      const result = await dbHelpers.updateIncomeTransaction(selectedIncome.id, incomeData);
      console.log('Income updated successfully:', result);

      // Reset form and close modal
      setShowEditIncome(false);
      setSelectedIncome(null);
      alert('✅ Income updated successfully!');

      // Reload income transactions
      loadIncomeTransactions();

    } catch (error) {
      console.error('Error updating income:', error);
      alert('❌ Error updating income. Please try again.');
    }
  };

  const handleDeleteIncome = (incomeId: string) => {
    setIncomeToDelete(incomeId);
    setShowDeleteIncomeConfirm(true);
  };

  const confirmDeleteIncome = async () => {
    if (incomeToDelete) {
      try {
        await dbHelpers.deleteIncomeTransaction(incomeToDelete);
        setIncomeTransactions(prev => prev.filter(income => income.id !== incomeToDelete));
        setIncomeToDelete(null);
        setShowDeleteIncomeConfirm(false);
        alert('✅ Income deleted successfully!');
      } catch (error) {
        console.error('Error deleting income:', error);
        alert('❌ Error deleting income. Please try again.');
      }
    }
  };

  const handleExportReport = () => {
    try {
      // Calculate financial summary
      const totalServiceCharges = accounts
        .filter(a => a.type === 'service_charge' && a.status === 'completed')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalGovernmentFees = accounts
        .filter(a => a.type === 'government_fee' && a.status === 'completed')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalExpenses = accounts
        .filter(a => a.type === 'expense' && a.status === 'completed')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalRefunds = accounts
        .filter(a => a.type === 'refund' && a.status === 'completed')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalGST = accounts
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.gstAmount || 0), 0);

      const netRevenue = totalServiceCharges - totalExpenses - totalRefunds;

      // Create report content
      const reportContent = [
        'FINANCIAL REPORT',
        `Generated on: ${new Date().toLocaleDateString()}`,
        '',
        'SUMMARY',
        '========',
        `Total Service Charges: AED ${totalServiceCharges.toLocaleString()}`,
        `Total Government Fees: AED ${totalGovernmentFees.toLocaleString()}`,
        `Total Expenses: AED ${totalExpenses.toLocaleString()}`,
        `Total Refunds: AED ${totalRefunds.toLocaleString()}`,
        `Total GST Collected: AED ${totalGST.toLocaleString()}`,
        `Net Revenue: AED ${netRevenue.toLocaleString()}`,
        '',
        'TRANSACTION DETAILS',
        '==================',
        'Date,Description,Type,Amount,Status',
        ...accounts.map(account =>
          `${account.date},"${account.description}",${account.type.replace('_', ' ')},${account.amount},${account.status}`
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Financial report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'service_charge': return 'bg-green-100 text-green-800 border-green-200';
      case 'government_fee': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expense': return 'bg-red-100 text-red-800 border-red-200';
      case 'refund': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'vendor_payment': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return DollarSign;
      case 'bank_transfer': return Building;
      case 'cheque': return FileText;
      case 'card': return CreditCard;
      default: return DollarSign;
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (account.reference && account.reference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || account.type === filterType;
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;
    const matchesPaymentMethod = filterPaymentMethod === 'all' || account.paymentMethod === filterPaymentMethod;

    // Date range filtering
    let matchesDateRange = true;
    if (dateRange.startDate || dateRange.endDate) {
      const transactionDate = new Date(account.date);

      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        matchesDateRange = matchesDateRange && transactionDate >= startDate;
      }

      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        // Set end date to end of day for inclusive filtering
        endDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && transactionDate <= endDate;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesPaymentMethod && matchesDateRange;
  });

  // Calculate totals
  const serviceCharges = accounts.filter(a => a.type === 'service_charge' && a.status === 'completed')
                                .reduce((sum, a) => sum + a.amount, 0);
  const governmentFees = accounts.filter(a => a.type === 'government_fee' && a.status === 'completed')
                                .reduce((sum, a) => sum + a.amount, 0);
  const totalIncome = incomeTransactions.filter(i => i.status === 'completed')
                                       .reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = serviceCharges + governmentFees + totalIncome;
  const totalExpenses = accounts.filter(a => a.type === 'expense' && a.status === 'completed')
                               .reduce((sum, a) => sum + a.amount, 0);
  const vendorPayments = accounts.filter(a => a.type === 'vendor_payment' && a.status === 'completed')
                                .reduce((sum, a) => sum + a.amount, 0);
  const totalGST = accounts.filter(a => a.status === 'completed')
                          .reduce((sum, a) => sum + (a.gstAmount || 0), 0);
  const totalProfit = serviceCharges + totalIncome; // Service charges and income are profit, government fees are pass-through
  const netProfit = totalProfit - totalExpenses - vendorPayments; // Profit minus all expenses

  console.log('Account calculations:', {
    accounts: accounts.length,
    serviceCharges,
    governmentFees,
    totalRevenue,
    totalExpenses,
    totalGST,
    totalProfit
  });

  const stats = [
    {
      title: 'Total Revenue',
      value: `AED ${totalRevenue.toLocaleString()}`,
      change: `${accounts.filter(a => (a.type === 'service_charge' || a.type === 'government_fee') && a.status === 'completed').length} transactions`,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Service Charges',
      value: `AED ${serviceCharges.toLocaleString()}`,
      change: `${accounts.filter(a => a.type === 'service_charge' && a.status === 'completed').length} services`,
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Total Income',
      value: `AED ${totalIncome.toLocaleString()}`,
      change: `${incomeTransactions.filter(i => i.status === 'completed').length} income entries`,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Government Fees',
      value: `AED ${governmentFees.toLocaleString()}`,
      change: `${accounts.filter(a => a.type === 'government_fee' && a.status === 'completed').length} payments`,
      icon: Receipt,
      color: 'purple'
    },
    {
      title: 'Vendor Expenses',
      value: `AED ${vendorPayments.toLocaleString()}`,
      change: `${accounts.filter(a => a.type === 'vendor_payment' && a.status === 'completed').length} payments`,
      icon: Building,
      color: 'orange'
    },
    {
      title: 'Net Profit',
      value: `AED ${netProfit.toLocaleString()}`,
      change: `${netProfit > 0 ? ((netProfit / totalRevenue * 100).toFixed(1)) : '0'}% margin`,
      icon: PieChart,
      color: 'green'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm mt-2 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    'text-purple-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  stat.color === 'blue' ? 'bg-blue-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">Create your first service billing to see transactions here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.slice(0, 5).map((account) => {
            const PaymentIcon = getPaymentMethodIcon(account.paymentMethod);
            return (
              <div key={account.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded-lg border">
                  <PaymentIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{account.description}</p>
                  <p className="text-sm text-gray-600">{account.category} • {account.date}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    account.type === 'service_charge' ? 'text-green-600' :
                    account.type === 'expense' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {account.type === 'expense' ? '-' : '+'}AED {account.amount.toLocaleString()}
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.status)}`}>
                    {account.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Financial Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">AED {totalRevenue.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Expenses</span>
              <span className="font-semibold text-red-600">AED {totalExpenses.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-red-500 h-3 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {['bank_transfer', 'cash', 'cheque', 'card'].map((method) => {
              const count = accounts.filter(a => a.paymentMethod === method).length;
              const percentage = (count / accounts.length) * 100;
              return (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'income', label: 'Income Management', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'government', label: 'Government Access', icon: FileText },
    { id: 'vendors', label: 'Vendor Expenses', icon: Building },
    { id: 'reports', label: 'Reports', icon: PieChart }
  ];

  const renderIncomeManagement = () => {
    // Filter and search income transactions
    const filteredIncomeTransactions = incomeTransactions.filter(income => {
      const matchesSearch = income.description.toLowerCase().includes(incomeSearchTerm.toLowerCase()) ||
                           income.category.toLowerCase().includes(incomeSearchTerm.toLowerCase()) ||
                           (income.referenceNumber && income.referenceNumber.toLowerCase().includes(incomeSearchTerm.toLowerCase()));

      const matchesCategory = incomeFilterCategory === 'all' || income.category === incomeFilterCategory;
      const matchesStatus = incomeFilterStatus === 'all' || income.status === incomeFilterStatus;
      const matchesPaymentMethod = incomeFilterPaymentMethod === 'all' || income.paymentMethod === incomeFilterPaymentMethod;

      // Date range filtering
      let matchesDateRange = true;
      if (incomeDateRange.startDate || incomeDateRange.endDate) {
        const transactionDate = new Date(income.date);

        if (incomeDateRange.startDate) {
          const startDate = new Date(incomeDateRange.startDate);
          matchesDateRange = matchesDateRange && transactionDate >= startDate;
        }

        if (incomeDateRange.endDate) {
          const endDate = new Date(incomeDateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          matchesDateRange = matchesDateRange && transactionDate <= endDate;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesPaymentMethod && matchesDateRange;
    });

    // Calculate income summary
    const totalIncomeAmount = incomeTransactions.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.amount, 0);
    const incomeTransactionCount = incomeTransactions.length;
    const averageIncome = incomeTransactionCount > 0 ? totalIncomeAmount / incomeTransactionCount : 0;
    const largestIncome = Math.max(...incomeTransactions.map(i => i.amount), 0);

    // Group by category
    const incomeByCategory = incomeTransactions.reduce((acc, income) => {
      if (!acc[income.category]) {
        acc[income.category] = { count: 0, total: 0 };
      }
      acc[income.category].count++;
      acc[income.category].total += income.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return (
      <div className="space-y-6">
        {/* Income Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-2">AED {totalIncomeAmount.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">All completed transactions</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transaction Count</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{incomeTransactionCount}</p>
                <p className="text-sm text-blue-600 mt-1">Income entries</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Income</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">AED {averageIncome.toLocaleString()}</p>
                <p className="text-sm text-purple-600 mt-1">Per transaction</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Largest Income</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">AED {largestIncome.toLocaleString()}</p>
                <p className="text-sm text-orange-600 mt-1">Single transaction</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Income by Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(incomeByCategory).map(([category, data]) => (
              <div key={category} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{category}</p>
                    <p className="text-sm text-gray-600">{data.count} transactions</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">AED {data.total.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search income transactions..."
                  value={incomeSearchTerm}
                  onChange={(e) => setIncomeSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={incomeFilterCategory}
                onChange={(e) => setIncomeFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="Service Income">Service Income</option>
                <option value="Interest Income">Interest Income</option>
                <option value="Other Income">Other Income</option>
                <option value="Commission Income">Commission Income</option>
                <option value="Rental Income">Rental Income</option>
              </select>

              <select
                value={incomeFilterStatus}
                onChange={(e) => setIncomeFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={incomeFilterPaymentMethod}
                onChange={(e) => setIncomeFilterPaymentMethod(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </select>

              {/* Date Range Filters */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From:</label>
                <input
                  type="date"
                  value={incomeDateRange.startDate}
                  onChange={(e) => setIncomeDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To:</label>
                <input
                  type="date"
                  value={incomeDateRange.endDate}
                  onChange={(e) => setIncomeDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Clear Filters Button */}
              {(incomeDateRange.startDate || incomeDateRange.endDate || incomeSearchTerm || incomeFilterCategory !== 'all' || incomeFilterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setIncomeDateRange({ startDate: '', endDate: '' });
                    setIncomeSearchTerm('');
                    setIncomeFilterCategory('all');
                    setIncomeFilterStatus('all');
                    setIncomeFilterPaymentMethod('all');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Income Count Display */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredIncomeTransactions.length} of {incomeTransactions.length} income transactions
            {(incomeDateRange.startDate || incomeDateRange.endDate) && (
              <span className="ml-2 text-green-600">
                (filtered by date: {incomeDateRange.startDate || 'start'} to {incomeDateRange.endDate || 'end'})
              </span>
            )}
          </div>
        </div>

        {/* Income Transactions List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incomeLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-2 text-gray-600">Loading income transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredIncomeTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No income transactions found</h3>
                      <p className="text-gray-600">Start by adding your first income entry.</p>
                    </td>
                  </tr>
                ) : (
                  filteredIncomeTransactions.map((income) => {
                    const PaymentIcon = getPaymentMethodIcon(income.paymentMethod);
                    return (
                      <tr key={income.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{income.description}</p>
                            <p className="text-sm text-gray-500">{income.companyName} • {income.date}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            {income.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-green-600">+AED {income.amount.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <PaymentIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 capitalize">{income.paymentMethod.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(income.status)}`}>
                            {income.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewIncome(income)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditIncome(income)}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Edit Income"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(income.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Delete Income"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-600 mt-1">Comprehensive financial tracking with dual collection system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportData}
              className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowAddIncome(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Income</span>
            </button>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-2 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'income' && renderIncomeManagement()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'government' && renderGovernmentAccess()}
      {activeTab === 'vendors' && renderVendors()}
      {activeTab === 'reports' && renderReports()}

      {/* Add Income Modal */}
      {showAddIncome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Add Income</h2>
                    <p className="text-green-100">Record a new income transaction</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddIncome(false);
                    resetIncomeForm();
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Income Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="Service Income">Service Income</option>
                    <option value="Interest Income">Interest Income</option>
                    <option value="Commission Income">Commission Income</option>
                    <option value="Rental Income">Rental Income</option>
                    <option value="Other Income">Other Income</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter income description"
                    required
                  />
                </div>

                {/* Transaction Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={incomeForm.reference}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional reference number"
                  />
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <select
                    value={incomeForm.companyId}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Company (Optional)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Optional notes about this income"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddIncome(false);
                    resetIncomeForm();
                  }}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIncome}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg"
                >
                  Create Income
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Transaction</h2>
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateTransaction(); }} className="space-y-6">
                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="service_charge">Service Charge</option>
                    <option value="government_fee">Government Fee</option>
                    <option value="expense">Expense</option>
                    <option value="refund">Refund</option>
                    <option value="vendor_payment">Vendor Payment</option>
                  </select>
                </div>

                {/* Category and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transactionForm.category}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., Visa Processing, Office Rent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (AED) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter transaction description"
                    rows={3}
                    required
                  />
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <select
                    value={transactionForm.companyId}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select a company (optional)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={transactionForm.paymentMethod}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                {/* Reference Number and GST Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={transactionForm.reference}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Optional reference number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Rate (%)
                    </label>
                    <select
                      value={transactionForm.gstRate}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, gstRate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="0">0% (No GST)</option>
                      <option value="5">5% (Standard)</option>
                      <option value="15">15% (Luxury)</option>
                    </select>
                  </div>
                </div>

                {/* GST Amount Display */}
                {transactionForm.amount && parseFloat(transactionForm.amount) > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">AED {parseFloat(transactionForm.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">GST ({transactionForm.gstRate}%):</span>
                      <span className="font-medium">AED {((parseFloat(transactionForm.amount) * parseFloat(transactionForm.gstRate)) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold border-t border-gray-200 pt-2 mt-2">
                      <span>Total Amount:</span>
                      <span>AED {(parseFloat(transactionForm.amount) + (parseFloat(transactionForm.amount) * parseFloat(transactionForm.gstRate)) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Additional notes or comments"
                    rows={2}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      resetTransactionForm();
                      setShowAddTransaction(false);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!transactionForm.description.trim() || !transactionForm.amount || !transactionForm.category.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Transaction Details</h2>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedTransaction.description}</h3>
                  <p className="text-2xl font-bold text-amber-600">AED {selectedTransaction.amount.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900 capitalize">{selectedTransaction.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <p className="text-gray-900">{selectedTransaction.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-gray-900">{selectedTransaction.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <p className="text-gray-900 capitalize">{selectedTransaction.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <p className="text-gray-900 capitalize">{selectedTransaction.status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                    <p className="text-gray-900">{selectedTransaction.createdBy}</p>
                  </div>
                </div>
                {selectedTransaction.reference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <p className="text-gray-900">{selectedTransaction.reference}</p>
                  </div>
                )}
                {selectedTransaction.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-900">{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTransaction && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Transaction</h2>
                <button
                  onClick={() => setShowEditTransaction(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateTransaction(); }} className="space-y-6">
                {/* Transaction Type and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editTransactionForm.type}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="service_charge">Service Charge</option>
                      <option value="government_fee">Government Fee</option>
                      <option value="expense">Expense</option>
                      <option value="refund">Refund</option>
                      <option value="vendor_payment">Vendor Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={editTransactionForm.category}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Transaction category"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTransactionForm.description}
                    onChange={(e) => setEditTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Transaction description"
                    required
                  />
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (AED) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editTransactionForm.amount}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editTransactionForm.date}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Payment Method and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={editTransactionForm.paymentMethod}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editTransactionForm.status}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Reference and GST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference
                    </label>
                    <input
                      type="text"
                      value={editTransactionForm.reference}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, reference: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Reference number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Amount (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editTransactionForm.gstAmount}
                      onChange={(e) => setEditTransactionForm(prev => ({ ...prev, gstAmount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editTransactionForm.notes}
                    onChange={(e) => setEditTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEditTransaction(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editTransactionForm.description.trim() || editTransactionForm.amount <= 0 || !editTransactionForm.date}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Transaction</h3>
                  <p className="text-gray-600">Are you sure you want to delete this transaction?</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTransaction}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income Details Modal */}
      {showIncomeDetails && selectedIncome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Income Details</h2>
                    <p className="text-green-100">View income transaction information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIncomeDetails(false)}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedIncome.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <p className="text-lg font-semibold text-green-600">+AED {selectedIncome.amount.toLocaleString()}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{selectedIncome.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
                  <p className="text-gray-900">{selectedIncome.date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <p className="text-gray-900 capitalize">{selectedIncome.paymentMethod.replace('_', ' ')}</p>
                </div>
                {selectedIncome.referenceNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                    <p className="text-gray-900">{selectedIncome.referenceNumber}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedIncome.status)}`}>
                    {selectedIncome.status}
                  </span>
                </div>
                {selectedIncome.companyName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <p className="text-gray-900">{selectedIncome.companyName}</p>
                  </div>
                )}
                {selectedIncome.notes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-900">{selectedIncome.notes}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                  <p className="text-gray-900">{new Date(selectedIncome.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowIncomeDetails(false)}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowIncomeDetails(false);
                    handleEditIncome(selectedIncome);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg"
                >
                  Edit Income
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {showEditIncome && selectedIncome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Edit Income</h2>
                    <p className="text-green-100">Update income transaction details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditIncome(false);
                    setSelectedIncome(null);
                  }}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Income Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeForm.category}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="Service Income">Service Income</option>
                    <option value="Interest Income">Interest Income</option>
                    <option value="Commission Income">Commission Income</option>
                    <option value="Rental Income">Rental Income</option>
                    <option value="Other Income">Other Income</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter income description"
                    required
                  />
                </div>

                {/* Transaction Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={incomeForm.reference}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional reference number"
                  />
                </div>

                {/* Company Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <select
                    value={incomeForm.companyId}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Company (Optional)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={incomeForm.notes}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Optional notes about this income"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEditIncome(false);
                    setSelectedIncome(null);
                  }}
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateIncome}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg"
                >
                  Update Income
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Income Confirmation Modal */}
      {showDeleteIncomeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Income</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this income transaction? This will permanently remove the record from your system.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteIncomeConfirm(false);
                    setIncomeToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteIncome}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderTransactions() {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="government_fee">Government Fee</option>
                  <option value="expense">Expense</option>
                  <option value="refund">Refund</option>
                  <option value="vendor_payment">Vendor Payment</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="online">Online</option>
                </select>

                {/* Date Range Filters */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From:</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To:</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Clear Filters Button */}
                {(dateRange.startDate || dateRange.endDate || searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setDateRange({ startDate: '', endDate: '' });
                      setSearchTerm('');
                      setFilterType('all');
                      setFilterStatus('all');
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Transaction Count Display */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredAccounts.length} of {accounts.length} transactions
              {(dateRange.startDate || dateRange.endDate) && (
                <span className="ml-2 text-amber-600">
                  (filtered by date: {dateRange.startDate || 'start'} to {dateRange.endDate || 'end'})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => {
                  const PaymentIcon = getPaymentMethodIcon(account.paymentMethod);
                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.description}</p>
                          <p className="text-sm text-gray-500">{account.category} • {account.date}</p>
                          {account.reference && (
                            <p className="text-xs text-gray-400">Ref: {account.reference}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(account.type)}`}>
                          {account.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className={`text-sm font-semibold ${
                            account.type === 'service_charge' ? 'text-green-600' :
                            account.type === 'expense' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {account.type === 'expense' ? '-' : '+'}AED {account.amount.toLocaleString()}
                          </p>
                          {account.gstAmount && (
                            <p className="text-xs text-gray-500">GST: AED {account.gstAmount}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <PaymentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 capitalize">{account.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewTransaction(account)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View Transaction"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditTransaction(account)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Edit Transaction"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(account.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Transaction"
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
        </div>
      </div>
    );
  }

  function renderGovernmentAccess() {
    // Filter government fee transactions
    const governmentTransactions = accounts.filter(a => a.category === 'Government Charges' || a.type === 'government_fee');
    const totalGovernmentFees = governmentTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by service type
    const serviceGroups = governmentTransactions.reduce((groups: any, transaction) => {
      const service = transaction.description.split(' ')[0] || 'Other';
      if (!groups[service]) {
        groups[service] = { count: 0, total: 0, transactions: [] };
      }
      groups[service].count += 1;
      groups[service].total += transaction.amount;
      groups[service].transactions.push(transaction);
      return groups;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Government Access & Fees</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Total Government Fees</h4>
              <p className="text-2xl font-bold text-blue-600">AED {totalGovernmentFees.toLocaleString()}</p>
              <p className="text-sm text-blue-600">All time</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Services Used</h4>
              <p className="text-2xl font-bold text-green-600">{Object.keys(serviceGroups).length}</p>
              <p className="text-sm text-green-600">Different services</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Total Transactions</h4>
              <p className="text-2xl font-bold text-purple-600">{governmentTransactions.length}</p>
              <p className="text-sm text-purple-600">Government payments</p>
            </div>
          </div>

          {/* Service Breakdown */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium text-gray-900">Government Services Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(serviceGroups).map(([service, data]: [string, any]) => (
                <div key={service} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{service}</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transactions:</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Fees:</span>
                      <span className="font-medium text-blue-600">AED {data.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Government Transactions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Recent Government Transactions</h4>
            {governmentTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {transaction.category} • {new Date((transaction as any).transaction_date).toLocaleDateString()}
                    </p>
                    {(transaction as any).reference_number && (
                      <p className="text-xs text-gray-500">Ref: {(transaction as any).reference_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">AED {transaction.amount.toLocaleString()}</p>
                    <p className="text-sm text-blue-600">{(transaction as any).payment_method}</p>
                  </div>
                </div>
              </div>
            ))}

            {governmentTransactions.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Government Transactions</h3>
                <p className="text-gray-600">Government fees will appear here when services are billed.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderVendors() {
    // Filter vendor payment transactions
    const vendorTransactions = accounts.filter(a => a.type === 'vendor_payment' || a.category === 'Vendor Expenses');
    const totalVendorPayments = vendorTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by vendor
    const vendorGroups = vendorTransactions.reduce((groups: any, transaction) => {
      const vendor = transaction.description.split(' to ')[1]?.split(' for ')[0] || 'Unknown Vendor';
      if (!groups[vendor]) {
        groups[vendor] = { count: 0, total: 0, transactions: [] };
      }
      groups[vendor].count += 1;
      groups[vendor].total += transaction.amount;
      groups[vendor].transactions.push(transaction);
      return groups;
    }, {});

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendor Expenses</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2">Total Vendor Payments</h4>
              <p className="text-2xl font-bold text-orange-600">AED {totalVendorPayments.toLocaleString()}</p>
              <p className="text-sm text-orange-600">All time</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Active Vendors</h4>
              <p className="text-2xl font-bold text-blue-600">{Object.keys(vendorGroups).length}</p>
              <p className="text-sm text-blue-600">Different vendors</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Total Transactions</h4>
              <p className="text-2xl font-bold text-purple-600">{vendorTransactions.length}</p>
              <p className="text-sm text-purple-600">Vendor payments</p>
            </div>
          </div>

          {/* Vendor Breakdown */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium text-gray-900">Vendor Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(vendorGroups).map(([vendor, data]: [string, any]) => (
                <div key={vendor} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{vendor}</h5>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Total Paid:</span> AED {data.total.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Transactions:</span> {data.count}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Average:</span> AED {(data.total / data.count).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Vendor Transactions */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Recent Vendor Transactions</h4>
            {vendorTransactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.date).toLocaleDateString()} • {transaction.paymentMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">AED {transaction.amount.toLocaleString()}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                      {transaction.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {vendorTransactions.length === 0 && (
              <div className="text-center py-8">
                <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Vendor Transactions</h3>
                <p className="text-gray-600">Vendor payments will appear here when services are assigned to vendors.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Profit & Loss Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Total Revenue</span>
                  <span className="font-semibold text-green-600">AED {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Total Expenses</span>
                  <span className="font-semibold text-red-600">AED {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">GST Collected</span>
                  <span className="font-semibold text-blue-600">AED {totalGST.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <span className="text-purple-700 font-medium">Net Profit</span>
                  <span className="font-bold text-purple-600">AED {(totalRevenue - totalExpenses).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Category Breakdown</h4>
              <div className="space-y-3">
                {['Visa Processing', 'License Renewal', 'Company Formation', 'Other Services'].map((category) => {
                  const categoryTotal = accounts.filter(a => a.category === category && a.status === 'completed')
                                               .reduce((sum, a) => sum + a.amount, 0);
                  const percentage = totalRevenue > 0 ? (categoryTotal / totalRevenue) * 100 : 0;

                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-700">{category}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-20 text-right">
                          AED {categoryTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AccountManagement;
