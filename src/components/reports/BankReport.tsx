import React, { useState, useEffect } from 'react';
import { Building2, Download, Calendar, CreditCard, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  clientName?: string;
  referenceNumber?: string;
}

const BankReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

  useEffect(() => {
    loadBankData();
  }, [dateFrom, dateTo]);

  const loadBankData = async () => {
    try {
      setLoading(true);
      
      // Load bank transactions from service billings
      const { data: billings, error: billingsError } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .in('cash_type', ['bank', 'bank_transfer'])
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (billingsError) throw billingsError;

      // Load bank transactions from account transactions
      const { data: expenses, error: expensesError } = await supabase
        .from('account_transactions')
        .select('*')
        .in('payment_method', ['bank', 'bank_transfer'])
        .eq('transaction_type', 'expense')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (expensesError) throw expensesError;

      const allTransactions: BankTransaction[] = [];

      // Process income transactions
      (billings || []).forEach(billing => {
        allTransactions.push({
          id: billing.id,
          date: billing.service_date,
          amount: parseFloat(billing.total_amount_with_vat || billing.total_amount || 0),
          description: `Service: ${billing.invoice_number || 'N/A'}`,
          type: 'income',
          clientName: billing.company?.company_name || billing.individual?.individual_name,
          referenceNumber: billing.invoice_number
        });
      });

      // Process expense transactions
      (expenses || []).forEach(expense => {
        allTransactions.push({
          id: expense.id,
          date: expense.transaction_date,
          amount: parseFloat(expense.amount || 0),
          description: expense.description || 'Bank Transfer',
          type: 'expense',
          referenceNumber: expense.reference_number
        });
      });

      setTransactions(allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error loading bank data:', error);
      toast.error('Failed to load bank data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const reportContent = `
BANK TRANSACTIONS REPORT
========================
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Bank Income: AED ${totalIncome.toLocaleString()}
Total Bank Expenses: AED ${totalExpenses.toLocaleString()}
Net Bank Flow: AED ${(totalIncome - totalExpenses).toLocaleString()}
Total Transactions: ${transactions.length}

TRANSACTIONS
------------
${transactions.map(t => 
  `${t.date} | ${t.type.toUpperCase()} | AED ${t.amount.toLocaleString()} | ${t.description} | ${t.clientName || 'N/A'}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Bank report exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Transactions Report</h1>
          <p className="text-gray-600">All bank transfer transactions</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Income</p>
              <p className="text-2xl font-bold text-green-600">AED {totalIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Expenses</p>
              <p className="text-2xl font-bold text-red-600">AED {totalExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Building2 className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Bank Flow</p>
              <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                AED {netFlow.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${netFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <CreditCard className={`w-6 h-6 ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{transactions.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bank Transactions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.clientName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.type === 'income' ? '+' : '-'}AED {transaction.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.referenceNumber || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bank transactions found</h3>
              <p className="text-gray-600">Try adjusting your date range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankReport;
