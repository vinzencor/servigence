import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, Download, RefreshCw, Calendar, DollarSign, 
  FileText, User, Building, SortAsc, SortDesc, ArrowLeft, X 
} from 'lucide-react';
import { PaymentCard } from '../types';
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

interface CardTransactionHistoryProps {
  cardId?: string;
  showAllCards?: boolean;
  onBack?: () => void;
  title?: string;
}

const CardTransactionHistory: React.FC<CardTransactionHistoryProps> = ({
  cardId,
  showAllCards = false,
  onBack,
  title = 'Card Transaction History'
}) => {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [transactions, setTransactions] = useState<EnhancedCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState(cardId || '');
  
  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'customer' | 'reference'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (selectedCardId) {
      loadTransactions();
    } else if (showAllCards) {
      loadAllTransactions();
    }
  }, [selectedCardId, showAllCards]);

  const loadCards = async () => {
    try {
      const cardsData = await dbHelpers.getPaymentCards();
      setCards(cardsData);
      if (!selectedCardId && cardsData.length > 0 && !showAllCards) {
        setSelectedCardId(cardsData[0].id);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      toast.error('Failed to load cards');
    }
  };

  const loadTransactions = async () => {
    if (!selectedCardId) return;
    
    try {
      setLoading(true);
      const transactionsData = await dbHelpers.getEnhancedCardTransactions(selectedCardId);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadAllTransactions = async () => {
    try {
      setLoading(true);
      const filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        searchTerm: searchTerm.trim() || undefined
      };
      const transactionsData = await dbHelpers.getAllCardTransactionsWithFilters(filters);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading all transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort transactions
  const getFilteredAndSortedTransactions = () => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.companyName?.toLowerCase().includes(searchLower) ||
        t.individualName?.toLowerCase().includes(searchLower) ||
        t.invoiceNumber?.toLowerCase().includes(searchLower) ||
        t.cardName.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
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
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
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
          aValue = a.invoiceNumber || '';
          bValue = b.invoiceNumber || '';
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
      ['Date', 'Description', 'Amount', 'Customer', 'Invoice', 'Status', 'Card', 'Service'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.transactionDate).toLocaleDateString(),
        `"${t.description}"`,
        t.amount.toFixed(2),
        `"${t.companyName || t.individualName || 'N/A'}"`,
        t.invoiceNumber || 'N/A',
        t.status,
        `"${t.cardName}"`,
        `"${t.serviceType || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cardName = showAllCards ? 'all-cards' : (cards.find(c => c.id === selectedCardId)?.cardName || 'card');
    a.download = `${cardName}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('all');
    setStatusFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setSortField('date');
    setSortDirection('desc');
  };

  const filteredTransactions = getFilteredAndSortedTransactions();
  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <p className="text-sm text-gray-500">
              {showAllCards ? 'All Cards' : selectedCard?.cardName} - 
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
            onClick={showAllCards ? loadAllTransactions : loadTransactions}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Selection */}
      {!showAllCards && cards.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Card</label>
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.cardName} - {card.bankName}
              </option>
            ))}
          </select>
        </div>
      )}

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {transactions.length === 0 ? 'No transactions found' : 'No transactions match your filters'}
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
                      Invoice
                      {sortField === 'reference' && (
                        sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  {showAllCards && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card</th>
                  )}
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
                      </div>
                    </td>
                    {showAllCards && (
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                          <span>{transaction.cardName}</span>
                        </div>
                      </td>
                    )}
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
};

export default CardTransactionHistory;
