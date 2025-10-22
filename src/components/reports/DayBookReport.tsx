import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Download, 
  Filter, 
  Search, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileText,
  CreditCard,
  Banknote,
  Building2,
  User,
  Clock
} from 'lucide-react';
import { dbHelpers, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  paymentMethod: string;
  description: string;
  clientName?: string;
  clientType?: 'company' | 'individual';
  serviceName?: string;
  invoiceNumber?: string;
  category: string;
  status: string;
}

interface DayBookData {
  transactions: Transaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
  };
  paymentMethodBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

const DayBookReport: React.FC = () => {
  const [data, setData] = useState<DayBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');

  useEffect(() => {
    loadDayBookData();
  }, [dateFrom, dateTo]);

  const loadDayBookData = async () => {
    try {
      setLoading(true);
      
      // Load service billings (income)
      const { data: billings, error: billingsError } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name)
        `)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo)
        .order('service_date', { ascending: false });

      if (billingsError) throw billingsError;

      // Load account transactions (expenses)
      const { data: transactions, error: transactionsError } = await supabase
        .from('account_transactions')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo)
        .eq('transaction_type', 'expense')
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Process and combine data
      const processedData = processDayBookData(billings || [], transactions || []);
      setData(processedData);
    } catch (error) {
      console.error('Error loading day book data:', error);
      toast.error('Failed to load day book data');
    } finally {
      setLoading(false);
    }
  };

  const processDayBookData = (billings: any[], transactions: any[]): DayBookData => {
    const allTransactions: Transaction[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;
    const paymentMethodBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};

    // Process income (service billings)
    billings.forEach(billing => {
      const transaction: Transaction = {
        id: billing.id,
        date: billing.service_date,
        type: 'income',
        amount: parseFloat(billing.total_amount || 0),
        paymentMethod: billing.cash_type || 'unknown',
        description: `${billing.service_type?.name || 'Service'} - ${billing.invoice_number || 'N/A'}`,
        clientName: billing.company?.company_name || billing.individual?.individual_name || 'Unknown',
        clientType: billing.company_id ? 'company' : 'individual',
        serviceName: billing.service_type?.name || 'Unknown Service',
        invoiceNumber: billing.invoice_number || 'N/A',
        category: 'Service Revenue',
        status: billing.status || 'completed'
      };
      
      allTransactions.push(transaction);
      totalIncome += transaction.amount;
      
      // Update breakdowns
      paymentMethodBreakdown[transaction.paymentMethod] = 
        (paymentMethodBreakdown[transaction.paymentMethod] || 0) + transaction.amount;
      categoryBreakdown[transaction.category] = 
        (categoryBreakdown[transaction.category] || 0) + transaction.amount;
    });

    // Process expenses (account transactions)
    transactions.forEach(transaction => {
      const transactionItem: Transaction = {
        id: transaction.id,
        date: transaction.transaction_date,
        type: 'expense',
        amount: parseFloat(transaction.amount || 0),
        paymentMethod: transaction.payment_method || 'unknown',
        description: transaction.description || 'Expense',
        category: transaction.category || 'General Expense',
        status: transaction.status || 'completed'
      };
      
      allTransactions.push(transactionItem);
      totalExpenses += transactionItem.amount;
      
      // Update breakdowns
      paymentMethodBreakdown[transactionItem.paymentMethod] = 
        (paymentMethodBreakdown[transactionItem.paymentMethod] || 0) + transactionItem.amount;
      categoryBreakdown[transactionItem.category] = 
        (categoryBreakdown[transactionItem.category] || 0) + transactionItem.amount;
    });

    // Sort all transactions by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      transactions: allTransactions,
      summary: {
        totalIncome,
        totalExpenses,
        netAmount: totalIncome - totalExpenses,
        transactionCount: allTransactions.length,
        incomeCount: billings.length,
        expenseCount: transactions.length
      },
      paymentMethodBreakdown,
      categoryBreakdown
    };
  };

  const filteredTransactions = data?.transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.clientName && transaction.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (transaction.invoiceNumber && transaction.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesPayment = filterPayment === 'all' || transaction.paymentMethod === filterPayment;
    
    return matchesSearch && matchesType && matchesPayment;
  }) || [];

  const exportReport = () => {
    if (!data) return;

    const reportContent = `
DAY BOOK REPORT
===============
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Income: AED ${data.summary.totalIncome.toLocaleString()}
Total Expenses: AED ${data.summary.totalExpenses.toLocaleString()}
Net Amount: AED ${data.summary.netAmount.toLocaleString()}
Total Transactions: ${data.summary.transactionCount}

TRANSACTIONS
------------
${filteredTransactions.map(t => 
  `${t.date} | ${t.type.toUpperCase()} | AED ${t.amount.toLocaleString()} | ${t.paymentMethod} | ${t.description}`
).join('\n')}

PAYMENT METHOD BREAKDOWN
------------------------
${Object.entries(data.paymentMethodBreakdown).map(([method, amount]) => 
  `${method}: AED ${amount.toLocaleString()}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daybook-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Day book report exported successfully');
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'card':
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank':
      case 'bank_transfer':
        return <Building2 className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getTypeIcon = (type: string) => {
    return type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Day Book Report</h1>
          <p className="text-gray-600">All transactions for the selected date range</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Credit Card</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">AED {data.summary.totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{data.summary.incomeCount} transactions</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">AED {data.summary.totalExpenses.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{data.summary.expenseCount} transactions</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Amount</p>
                <p className={`text-2xl font-bold ${data.summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  AED {data.summary.netAmount.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${data.summary.netAmount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={`w-6 h-6 ${data.summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.summary.netAmount >= 0 ? 'Profit' : 'Loss'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.transactionCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">All types</p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
            <span className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {data?.summary.transactionCount || 0} transactions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                      {getTypeIcon(transaction.type)}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      {transaction.invoiceNumber && transaction.invoiceNumber !== 'N/A' && (
                        <div className="text-xs text-gray-500">Invoice: {transaction.invoiceNumber}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.clientName ? (
                      <div className="flex items-center space-x-2">
                        {transaction.clientType === 'company' ? (
                          <Building2 className="w-4 h-4 text-blue-500" />
                        ) : (
                          <User className="w-4 h-4 text-green-500" />
                        )}
                        <span>{transaction.clientName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      {getPaymentMethodIcon(transaction.paymentMethod)}
                      <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}AED {transaction.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">Try adjusting your filters or date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Breakdown */}
      {data && Object.keys(data.paymentMethodBreakdown).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.paymentMethodBreakdown).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon(method)}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {method.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    AED {amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.categoryBreakdown).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    AED {amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayBookReport;
