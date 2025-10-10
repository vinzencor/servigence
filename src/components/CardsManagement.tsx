import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Filter, Edit, Trash2, Star, Download, X, ArrowLeft, Calendar, DollarSign, FileText, User, Building, SortAsc, SortDesc, RefreshCw } from 'lucide-react';
import { PaymentCard, CardTransaction } from '../types';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface EnhancedCardTransaction {
  id: string;
  cardId: string;
  cardName: string;
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: 'payment' | 'refund' | 'charge';
  referenceNumber?: string;
  companyId?: string;
  companyName?: string;
  individualId?: string;
  individualName?: string;
  invoiceNumber?: string;
  serviceType?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

const CardsManagement: React.FC = () => {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [transactions, setTransactions] = useState<EnhancedCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [editingCard, setEditingCard] = useState<PaymentCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Transaction filtering and sorting state
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [transactionDateFilter, setTransactionDateFilter] = useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'customer' | 'reference'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [formData, setFormData] = useState({
    cardName: '',
    cardDescription: '',
    creditLimit: '',
    cardType: 'credit' as 'credit' | 'debit' | 'prepaid' | 'corporate',
    bankName: '',
    isActive: true
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const cardsData = await dbHelpers.getPaymentCards();
      setCards(cardsData);
    } catch (error) {
      console.error('Error loading cards:', error);
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (cardId: string) => {
    try {
      setTransactionsLoading(true);
      const transactionsData = await dbHelpers.getEnhancedCardTransactions(cardId);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const cardData = {
        card_name: formData.cardName,
        card_description: formData.cardDescription || null,
        credit_limit: parseFloat(formData.creditLimit),
        card_type: formData.cardType,
        bank_name: formData.bankName || null,
        is_active: formData.isActive,
        is_default: false
      };

      if (editingCard) {
        await dbHelpers.updatePaymentCard(editingCard.id, cardData);
        toast.success('Card updated successfully');
      } else {
        await dbHelpers.createPaymentCard(cardData);
        toast.success('Card created successfully');
      }

      setShowModal(false);
      setEditingCard(null);
      resetForm();
      await loadCards();
    } catch (error) {
      console.error('Error saving card:', error);
      toast.error('Failed to save card');
    }
  };

  const handleEdit = (card: PaymentCard) => {
    setEditingCard(card);
    setFormData({
      cardName: card.cardName,
      cardDescription: card.cardDescription || '',
      creditLimit: card.creditLimit.toString(),
      cardType: card.cardType,
      bankName: card.bankName || '',
      isActive: card.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (cardId: string) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await dbHelpers.deletePaymentCard(cardId);
        toast.success('Card deleted successfully');
        await loadCards();
      } catch (error) {
        console.error('Error deleting card:', error);
        toast.error('Failed to delete card');
      }
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      await dbHelpers.setDefaultPaymentCard(cardId);
      toast.success('Default card updated');
      await loadCards();
    } catch (error) {
      console.error('Error setting default card:', error);
      toast.error('Failed to set default card');
    }
  };

  const handleCardClick = async (card: PaymentCard) => {
    setSelectedCard(card);
    setShowTransactions(true);
    await loadTransactions(card.id);
  };

  // Filter and sort transactions
  const getFilteredAndSortedTransactions = () => {
    let filtered = [...transactions];

    // Apply search filter
    if (transactionSearchTerm.trim()) {
      const searchLower = transactionSearchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.companyName?.toLowerCase().includes(searchLower) ||
        t.individualName?.toLowerCase().includes(searchLower) ||
        t.invoiceNumber?.toLowerCase().includes(searchLower) ||
        t.referenceNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (transactionDateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date();

      switch (transactionDateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(t => new Date(t.transactionDate) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(t => new Date(t.transactionDate) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(t => new Date(t.transactionDate) >= filterDate);
          break;
        case 'quarter':
          filterDate.setMonth(today.getMonth() - 3);
          filtered = filtered.filter(t => new Date(t.transactionDate) >= filterDate);
          break;
      }
    }

    // Apply date range filter
    if (dateRange.startDate) {
      filtered = filtered.filter(t => new Date(t.transactionDate) >= new Date(dateRange.startDate));
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(t => new Date(t.transactionDate) <= new Date(dateRange.endDate));
    }

    // Apply status filter
    if (transactionStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === transactionStatusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'customer':
          aValue = a.companyName || a.individualName || '';
          bValue = b.companyName || b.individualName || '';
          break;
        case 'reference':
          aValue = a.referenceNumber || '';
          bValue = b.referenceNumber || '';
          break;
        default:
          aValue = a.transactionDate;
          bValue = b.transactionDate;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const handleSort = (field: 'date' | 'amount' | 'customer' | 'reference') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportTransactions = () => {
    const filteredTransactions = getFilteredAndSortedTransactions();
    const csvContent = [
      ['Date', 'Description', 'Amount', 'Customer', 'Invoice', 'Status', 'Card'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.transactionDate).toLocaleDateString(),
        `"${t.description}"`,
        t.amount.toFixed(2),
        `"${t.companyName || t.individualName || 'N/A'}"`,
        t.invoiceNumber || 'N/A',
        t.status,
        `"${t.cardName}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-transactions-${selectedCard?.cardName || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };

  const clearFilters = () => {
    setTransactionSearchTerm('');
    setTransactionDateFilter('all');
    setTransactionStatusFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setSortField('date');
    setSortDirection('desc');
  };

  const downloadTransactions = () => {
    const filteredTransactions = getFilteredAndSortedTransactions();
    if (!selectedCard || filteredTransactions.length === 0) {
      toast.error('No transactions to download');
      return;
    }

    const csvContent = [
      ['Date', 'Description', 'Amount', 'Type', 'Customer', 'Status', 'Invoice', 'Service', 'Card'],
      ...filteredTransactions.map(t => [
        new Date(t.transactionDate).toLocaleDateString(),
        `"${t.description}"`,
        t.amount.toFixed(2),
        t.transactionType,
        `"${t.companyName || t.individualName || 'N/A'}"`,
        t.status,
        t.invoiceNumber || 'N/A',
        `"${t.serviceType || 'N/A'}"`,
        `"${t.cardName}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedCard?.cardName}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filteredTransactions.length} transactions downloaded successfully`);
  };

  const resetForm = () => {
    setFormData({
      cardName: '',
      cardDescription: '',
      creditLimit: '',
      cardType: 'credit',
      bankName: '',
      isActive: true
    });
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.cardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (card.bankName && card.bankName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || card.cardType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (showTransactions && selectedCard) {
    const filteredTransactions = getFilteredAndSortedTransactions();

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTransactions(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Cards
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {selectedCard.cardName} - Transaction History
              </h1>
              <p className="text-sm text-gray-500">
                {filteredTransactions.length} of {transactions.length} transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportTransactions}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => loadTransactions(selectedCard.id)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={transactionsLoading}
            >
              <RefreshCw className={`w-5 h-5 ${transactionsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={transactionSearchTerm}
                  onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
              <select
                value={transactionDateFilter}
                onChange={(e) => setTransactionDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 3 Months</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={transactionStatusFilter}
                onChange={(e) => setTransactionStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Transaction Summary */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Amount</p>
                  <p className="text-2xl font-bold text-green-900">
                    AED {filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Average Transaction</p>
                  <p className="text-2xl font-bold text-purple-900">
                    AED {(filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length).toFixed(2)}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200">
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {transactions.length === 0 ? 'No transactions found for this card' : 'No transactions match your filters'}
              </p>
              {transactions.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear filters to see all transactions
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortField === 'date' && (
                          sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        {sortField === 'amount' && (
                          sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center gap-1">
                        Customer
                        {sortField === 'customer' && (
                          sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('reference')}
                    >
                      <div className="flex items-center gap-1">
                        Reference
                        {sortField === 'reference' && (
                          sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{new Date(transaction.transactionDate).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(transaction.transactionDate).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-semibold text-green-600">
                          AED {transaction.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.transactionType === 'payment' ? 'bg-green-100 text-green-800' :
                          transaction.transactionType === 'refund' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transactionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {transaction.companyName ? (
                            <>
                              <Building className="w-4 h-4 text-blue-500" />
                              <span>{transaction.companyName}</span>
                            </>
                          ) : transaction.individualName ? (
                            <>
                              <User className="w-4 h-4 text-green-500" />
                              <span>{transaction.individualName}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium">{transaction.invoiceNumber || 'N/A'}</div>
                          {transaction.referenceNumber && transaction.referenceNumber !== transaction.invoiceNumber && (
                            <div className="text-xs text-gray-400">{transaction.referenceNumber}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={transaction.serviceType}>
                          {transaction.serviceType || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payment Cards Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add New Card
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search cards by name or bank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="prepaid">Prepaid</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No cards found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleCardClick(card)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <CreditCard className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{card.cardName}</h3>
                        {card.isDefault && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)} Card
                        {card.bankName && ` • ${card.bankName}`}
                      </p>
                      {card.cardDescription && (
                        <p className="text-sm text-gray-600 mt-1">{card.cardDescription}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        AED {card.creditLimit.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Credit Limit</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(card);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!card.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(card.id);
                          }}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(card.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      card.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {card.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Click to view transaction history
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCard ? 'Edit Card' : 'Add New Card'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCard(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cardName}
                  onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter card name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.cardDescription}
                  onChange={(e) => setFormData({ ...formData, cardDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter card description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit (AED) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter credit limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Type *
                </label>
                <select
                  required
                  value={formData.cardType}
                  onChange={(e) => setFormData({ ...formData, cardType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="prepaid">Prepaid</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bank name"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCard(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCard ? 'Update Card' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardsManagement;