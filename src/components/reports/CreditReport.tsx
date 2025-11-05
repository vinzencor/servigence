import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Download, 
  Filter, 
  Search, 
  DollarSign, 
  Calendar,
  PieChart,
  BarChart3,
  FileText,
  CreditCard,
  Banknote,
  Building2,
  AlertTriangle,
  Plus,
  ArrowUpCircle
} from 'lucide-react';
import { dbHelpers } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CreditTransaction {
  id: string;
  date: string;
  description: string;
  companyName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  category?: string;
  notes?: string;
  createdAt: string;
}

interface CreditData {
  transactions: CreditTransaction[];
  summary: {
    totalCredits: number;
    transactionCount: number;
    averageCredit: number;
    largestCredit: number;
  };
  paymentMethodBreakdown: Record<string, { amount: number; count: number }>;
  statusBreakdown: Record<string, { amount: number; count: number }>;
  monthlyTrend: Record<string, number>;
}

const CreditReport: React.FC = () => {
  const [data, setData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  const paymentMethods = ['all', 'cash', 'bank_transfer', 'credit_card', 'cheque', 'online'];
  const statuses = ['all', 'completed', 'pending', 'cancelled', 'refunded'];

  useEffect(() => {
    loadCreditData();
  }, [dateFrom, dateTo]);

  const loadCreditData = async () => {
    try {
      setLoading(true);
      const transactions = await dbHelpers.getCreditTransactionsByDateRange(dateFrom, dateTo);
      
      if (!transactions) {
        setData({
          transactions: [],
          summary: { totalCredits: 0, transactionCount: 0, averageCredit: 0, largestCredit: 0 },
          paymentMethodBreakdown: {},
          statusBreakdown: {},
          monthlyTrend: {}
        });
        return;
      }

      // Transform data
      const creditTransactions: CreditTransaction[] = transactions.map(t => ({
        id: t.id,
        date: t.transaction_date,
        description: t.description,
        companyName: t.company?.company_name || t.individual?.individual_name || 'N/A',
        amount: parseFloat(t.amount || 0),
        paymentMethod: t.payment_method,
        referenceNumber: t.reference_number,
        status: t.status,
        category: t.category,
        notes: t.notes,
        createdAt: t.created_at
      }));

      // Calculate summary
      const totalCredits = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
      const transactionCount = creditTransactions.length;
      const averageCredit = transactionCount > 0 ? totalCredits / transactionCount : 0;
      const largestCredit = Math.max(...creditTransactions.map(t => t.amount), 0);

      // Payment method breakdown
      const paymentMethodBreakdown = creditTransactions.reduce((acc, t) => {
        const method = t.paymentMethod || 'unknown';
        if (!acc[method]) acc[method] = { amount: 0, count: 0 };
        acc[method].amount += t.amount;
        acc[method].count += 1;
        return acc;
      }, {} as Record<string, { amount: number; count: number }>);

      // Status breakdown
      const statusBreakdown = creditTransactions.reduce((acc, t) => {
        const status = t.status || 'unknown';
        if (!acc[status]) acc[status] = { amount: 0, count: 0 };
        acc[status].amount += t.amount;
        acc[status].count += 1;
        return acc;
      }, {} as Record<string, { amount: number; count: number }>);

      // Monthly trend
      const monthlyTrend = creditTransactions.reduce((acc, t) => {
        const month = new Date(t.date).toISOString().slice(0, 7);
        if (!acc[month]) acc[month] = 0;
        acc[month] += t.amount;
        return acc;
      }, {} as Record<string, number>);

      setData({
        transactions: creditTransactions,
        summary: { totalCredits, transactionCount, averageCredit, largestCredit },
        paymentMethodBreakdown,
        statusBreakdown,
        monthlyTrend
      });
    } catch (error) {
      console.error('Error loading credit data:', error);
      toast.error('Failed to load credit report data');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = data?.transactions.filter(transaction => {
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.referenceNumber && transaction.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPaymentMethod = selectedPaymentMethod === 'all' || transaction.paymentMethod === selectedPaymentMethod;
    const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
    const matchesCompany = selectedCompany === 'all' || transaction.companyName === selectedCompany;
    
    return matchesSearch && matchesPaymentMethod && matchesStatus && matchesCompany;
  }) || [];

  const exportToCSV = () => {
    if (!filteredTransactions.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Description', 'Company/Customer', 'Amount (AED)', 'Payment Method', 'Reference', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.date,
        `"${t.description}"`,
        `"${t.companyName}"`,
        t.amount.toFixed(2),
        t.paymentMethod,
        t.referenceNumber || '',
        t.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Credit report exported to CSV');
  };

  const exportToPDF = () => {
    toast.info('PDF export functionality will be implemented soon');
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800 border-green-200',
      bank_transfer: 'bg-blue-100 text-blue-800 border-blue-200',
      credit_card: 'bg-purple-100 text-purple-800 border-purple-200',
      cheque: 'bg-orange-100 text-orange-800 border-orange-200',
      online: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[method] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Credit Report</h1>
                <p className="text-gray-500 mt-1">All credit transactions and receivables</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Date Range and Filters */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method === 'all' ? 'All Methods' : method.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
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
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Credits</p>
              <p className="text-2xl font-bold text-green-600">
                AED {data?.summary.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{data?.summary.transactionCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Credit</p>
              <p className="text-2xl font-bold text-purple-600">
                AED {data?.summary.averageCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Largest Credit</p>
              <p className="text-2xl font-bold text-orange-600">
                AED {data?.summary.largestCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Credit Transactions</h2>
            <span className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {data?.transactions.length || 0} transactions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company/Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      {transaction.category && (
                        <div className="text-xs text-gray-400 mt-1">{transaction.category}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{transaction.companyName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600">
                      +AED {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPaymentMethodColor(transaction.paymentMethod)}`}>
                      {transaction.paymentMethod.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.referenceNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                      {transaction.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No credit transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or date range to see more results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditReport;
