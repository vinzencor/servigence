import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportSummaryToPDF } from '../../utils/pdfExport';

const ProfitLossReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  });

  useEffect(() => {
    loadProfitLossData();
  }, [dateFrom, dateTo]);

  const loadProfitLossData = async () => {
    try {
      setLoading(true);

      // Load income from service billings (including vendor costs and government charges)
      const { data: billings, error: billingsError } = await supabase
        .from('service_billings')
        .select('total_amount_with_vat, total_amount, vendor_cost, government_charges')
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (billingsError) throw billingsError;

      // Load expenses from account transactions
      const { data: expenses, error: expensesError } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('transaction_type', 'expense')
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo);

      if (expensesError) throw expensesError;

      const totalIncome = (billings || []).reduce((sum, billing) =>
        sum + parseFloat(billing.total_amount_with_vat || billing.total_amount || 0), 0);

      // Calculate total expenses including vendor costs and government charges from billings
      const accountExpenses = (expenses || []).reduce((sum, expense) =>
        sum + parseFloat(expense.amount || 0), 0);

      const vendorCosts = (billings || []).reduce((sum, billing) =>
        sum + parseFloat(billing.vendor_cost || 0), 0);

      const governmentCharges = (billings || []).reduce((sum, billing) =>
        sum + parseFloat(billing.government_charges || 0), 0);

      const totalExpenses = accountExpenses + vendorCosts + governmentCharges;

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      console.log('[ProfitLossReport] Summary:', {
        totalIncome: totalIncome.toFixed(2),
        accountExpenses: accountExpenses.toFixed(2),
        vendorCosts: vendorCosts.toFixed(2),
        governmentCharges: governmentCharges.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netProfit: netProfit.toFixed(2),
        profitMargin: profitMargin.toFixed(2) + '%'
      });

      setData({
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin
      });
    } catch (error) {
      console.error('Error loading P&L data:', error);
      toast.error('Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportContent = `
PROFIT & LOSS ACCOUNT
=====================
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

INCOME
------
Total Revenue: AED ${data.totalIncome.toLocaleString()}

EXPENSES
--------
Total Expenses: AED ${data.totalExpenses.toLocaleString()}

NET RESULT
----------
Net Profit/Loss: AED ${data.netProfit.toLocaleString()}
Profit Margin: ${data.profitMargin.toFixed(2)}%
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-loss-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('P&L report exported successfully');
  };

  const exportReportPDF = () => {
    const summaryItems = [
      { label: 'Total Revenue', value: `AED ${data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'green' },
      { label: 'Total Expenses', value: `AED ${data.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'red' },
      { label: 'Net Profit/Loss', value: `AED ${data.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: data.netProfit >= 0 ? 'green' : 'red' },
      { label: 'Profit Margin', value: `${data.profitMargin.toFixed(2)}%`, color: data.profitMargin >= 0 ? 'green' : 'red' }
    ];

    exportSummaryToPDF({
      title: 'Profit & Loss Account',
      subtitle: 'P&L Statement with Income vs Expenses',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      summaryItems,
      fileName: `Profit_Loss_Report_${dateFrom}_to_${dateTo}.pdf`
    });

    toast.success('PDF exported successfully!');
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
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Account</h1>
          <p className="text-gray-600">P&L statement with income vs expenses</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export TXT</span>
          </button>
          <button
            onClick={exportReportPDF}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
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
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">AED {data.totalIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">AED {data.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Profit/Loss</p>
              <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                AED {data.netProfit.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${data.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-6 h-6 ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className={`text-2xl font-bold ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className={`p-3 rounded-lg ${data.profitMargin >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <BarChart3 className={`w-6 h-6 ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Profit & Loss Statement</h2>
        
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">INCOME</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Service Revenue</span>
              <span className="font-semibold text-green-600">AED {data.totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
              <span className="font-medium text-gray-900">Total Income</span>
              <span className="font-bold text-green-600">AED {data.totalIncome.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">EXPENSES</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Operating Expenses</span>
              <span className="font-semibold text-red-600">AED {data.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
              <span className="font-medium text-gray-900">Total Expenses</span>
              <span className="font-bold text-red-600">AED {data.totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">NET PROFIT/LOSS</span>
              <span className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                AED {data.netProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className={`text-sm font-medium ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.profitMargin.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReport;
