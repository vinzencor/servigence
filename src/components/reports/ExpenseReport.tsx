import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
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
  AlertTriangle
} from 'lucide-react';
import { dbHelpers, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  status: string;
  companyName?: string;
  individualName?: string;
  referenceNumber?: string;
}

interface ExpenseData {
  expenses: Expense[];
  summary: {
    totalExpenses: number;
    expenseCount: number;
    averageExpense: number;
    largestExpense: number;
  };
  categoryBreakdown: Record<string, { amount: number; count: number }>;
  paymentMethodBreakdown: Record<string, { amount: number; count: number }>;
  monthlyTrend: Record<string, number>;
}

const ExpenseReport: React.FC = () => {
  const [data, setData] = useState<ExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadExpenseData();
  }, [dateFrom, dateTo]);

  const loadExpenseData = async () => {
    try {
      setLoading(true);
      
      // Load account transactions (expenses)
      const { data: transactions, error } = await supabase
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

      if (error) throw error;

      const processedData = processExpenseData(transactions || []);
      setData(processedData);
    } catch (error) {
      console.error('Error loading expense data:', error);
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  const processExpenseData = (transactions: any[]): ExpenseData => {
    const expenses: Expense[] = transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      amount: parseFloat(transaction.amount || 0),
      category: transaction.category || 'Uncategorized',
      description: transaction.description || 'No description',
      paymentMethod: transaction.payment_method || 'unknown',
      status: transaction.status || 'completed',
      companyName: transaction.company?.company_name,
      individualName: transaction.individual?.individual_name,
      referenceNumber: transaction.reference_number
    }));

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;
    const largestExpense = expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)) : 0;

    // Category breakdown
    const categoryBreakdown: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(expense => {
      if (!categoryBreakdown[expense.category]) {
        categoryBreakdown[expense.category] = { amount: 0, count: 0 };
      }
      categoryBreakdown[expense.category].amount += expense.amount;
      categoryBreakdown[expense.category].count += 1;
    });

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(expense => {
      if (!paymentMethodBreakdown[expense.paymentMethod]) {
        paymentMethodBreakdown[expense.paymentMethod] = { amount: 0, count: 0 };
      }
      paymentMethodBreakdown[expense.paymentMethod].amount += expense.amount;
      paymentMethodBreakdown[expense.paymentMethod].count += 1;
    });

    // Monthly trend
    const monthlyTrend: Record<string, number> = {};
    expenses.forEach(expense => {
      const month = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM
      monthlyTrend[month] = (monthlyTrend[month] || 0) + expense.amount;
    });

    return {
      expenses,
      summary: {
        totalExpenses,
        expenseCount,
        averageExpense,
        largestExpense
      },
      categoryBreakdown,
      paymentMethodBreakdown,
      monthlyTrend
    };
  };

  const filteredExpenses = data?.expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.companyName && expense.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (expense.individualName && expense.individualName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
    const matchesPayment = filterPayment === 'all' || expense.paymentMethod === filterPayment;
    
    return matchesSearch && matchesCategory && matchesPayment;
  }) || [];

  // Sort filtered expenses
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const exportReport = () => {
    if (!data) return;

    const reportContent = `
EXPENSE REPORT
==============
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Expenses: AED ${data.summary.totalExpenses.toLocaleString()}
Number of Expenses: ${data.summary.expenseCount}
Average Expense: AED ${data.summary.averageExpense.toLocaleString()}
Largest Expense: AED ${data.summary.largestExpense.toLocaleString()}

CATEGORY BREAKDOWN
------------------
${Object.entries(data.categoryBreakdown).map(([category, data]) =>
  `${category}: AED ${data.amount.toLocaleString()} (${data.count} transactions)`
).join('\n')}

PAYMENT METHOD BREAKDOWN
------------------------
${Object.entries(data.paymentMethodBreakdown).map(([method, data]) =>
  `${method}: AED ${data.amount.toLocaleString()} (${data.count} transactions)`
).join('\n')}

DETAILED EXPENSES
-----------------
${sortedExpenses.map(expense =>
  `${expense.date} | ${expense.category} | AED ${expense.amount.toLocaleString()} | ${expense.paymentMethod} | ${expense.description}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Expense report exported successfully');
  };

  const exportCSV = () => {
    if (!data) return;

    const headers = [
      'Date',
      'Category',
      'Description',
      'Amount (AED)',
      'Payment Method',
      'Reference Number',
      'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...sortedExpenses.map(expense => [
        expense.date,
        expense.category,
        `"${expense.description}"`,
        expense.amount,
        expense.paymentMethod,
        expense.referenceNumber || 'N/A',
        expense.status
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('CSV report exported successfully');
  };

  const exportReportPDF = () => {
    if (!data) return;

    const pdfData = sortedExpenses.map(expense => ({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod.replace('_', ' ').toUpperCase(),
      referenceNumber: expense.referenceNumber || '-',
      status: expense.status.toUpperCase(),
      vendor: expense.companyName || expense.individualName || '-'
    }));

    const summaryData = [
      { label: 'Total Expenses', value: `AED ${data.summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Number of Transactions', value: data.summary.expenseCount },
      { label: 'Average Expense', value: `AED ${data.summary.averageExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Largest Expense', value: `AED ${data.summary.largestExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
    ];

    exportToPDF({
      title: 'Expense Report',
      subtitle: 'Expenses Breakdown by Categories and Payment Methods',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      columns: [
        { header: 'Date', dataKey: 'date' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Vendor', dataKey: 'vendor' },
        { header: 'Amount (AED)', dataKey: 'amount' },
        { header: 'Payment Method', dataKey: 'paymentMethod' },
        { header: 'Reference #', dataKey: 'referenceNumber' },
        { header: 'Status', dataKey: 'status' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Expense_Report_${dateFrom}_to_${dateTo}.pdf`,
      orientation: 'landscape'
    });

    toast.success('PDF exported successfully!');
  };

  const exportPDF_OLD = () => {
    if (!data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expense Report - ${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #2563eb; }
          .period { font-size: 14px; color: #666; margin-top: 5px; }
          .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .summary-title { font-weight: bold; color: #374151; margin-bottom: 5px; }
          .summary-amount { font-size: 18px; font-weight: bold; color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Expense Report</div>
          <div class="period">Period: ${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}</div>
          <div class="period">Generated: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-title">Total Expenses</div>
            <div class="summary-amount">AED ${data.summary.totalExpenses.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Records</div>
            <div class="summary-amount">${data.summary.totalTransactions}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Average Expense</div>
            <div class="summary-amount">AED ${data.summary.averageExpense.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Largest Expense</div>
            <div class="summary-amount">AED ${data.summary.largestExpense.toLocaleString()}</div>
          </div>
        </div>

        <h3>Category Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Amount (AED)</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(data.categoryBreakdown).map(([category, categoryData]) => `
              <tr>
                <td>${category}</td>
                <td>AED ${categoryData.amount.toLocaleString()}</td>
                <td>${categoryData.count}</td>
                <td>${((categoryData.amount / data.summary.totalExpenses) * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>Detailed Expense Records</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount (AED)</th>
              <th>Payment Method</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            ${sortedExpenses.map(expense => `
              <tr>
                <td>${new Date(expense.date).toLocaleDateString()}</td>
                <td>${expense.category}</td>
                <td>${expense.description}</td>
                <td>AED ${expense.amount.toLocaleString()}</td>
                <td>${expense.paymentMethod.replace('_', ' ')}</td>
                <td>${expense.referenceNumber || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>This report was generated automatically by Servigen Management System</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast.success('PDF report generated successfully');
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

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    const index = category.length % colors.length;
    return colors[index];
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
          <h1 className="text-2xl font-bold text-gray-900">Expense Report</h1>
          <p className="text-gray-600">Detailed breakdown of all expenses</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportReportPDF}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Export TXT</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {data && Object.keys(data.categoryBreakdown).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
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
              {data && Object.keys(data.paymentMethodBreakdown).map(method => (
                <option key={method} value={method}>{method.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Date (Newest)</option>
              <option value="date-asc">Date (Oldest)</option>
              <option value="amount-desc">Amount (Highest)</option>
              <option value="amount-asc">Amount (Lowest)</option>
              <option value="category-asc">Category (A-Z)</option>
              <option value="category-desc">Category (Z-A)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search expenses..."
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
                <p className="text-sm font-medium text-gray-600">Average Expense</p>
                <p className="text-2xl font-bold text-blue-600">AED {data.summary.averageExpense.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Per transaction</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Largest Expense</p>
                <p className="text-2xl font-bold text-orange-600">AED {data.summary.largestExpense.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Single transaction</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-purple-600">{Object.keys(data.categoryBreakdown).length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Expense types</p>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Expense Details</h2>
            <span className="text-sm text-gray-500">
              Showing {sortedExpenses.length} of {data?.summary.expenseCount || 0} expenses
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(expense.category)}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      {expense.referenceNumber && (
                        <div className="text-xs text-gray-500">Ref: {expense.referenceNumber}</div>
                      )}
                      {(expense.companyName || expense.individualName) && (
                        <div className="text-xs text-gray-500">
                          Related to: {expense.companyName || expense.individualName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      {getPaymentMethodIcon(expense.paymentMethod)}
                      <span className="capitalize">{expense.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                    AED {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      expense.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : expense.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedExpenses.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
              <p className="text-gray-600">Try adjusting your filters or date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.categoryBreakdown)
                .sort(([,a], [,b]) => b.amount - a.amount)
                .map(([category, data]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category)}`}>
                      {category}
                    </span>
                    <span className="text-sm text-gray-500">({data.count} transactions)</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    AED {data.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.paymentMethodBreakdown)
                .sort(([,a], [,b]) => b.amount - a.amount)
                .map(([method, data]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon(method)}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {method.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">({data.count} transactions)</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    AED {data.amount.toLocaleString()}
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

export default ExpenseReport;
