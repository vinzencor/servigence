import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
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
  User,
  Target,
  Award
} from 'lucide-react';
import { dbHelpers, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface Income {
  id: string;
  date: string;
  amount: number;
  serviceType: string;
  clientName: string;
  clientType: 'company' | 'individual';
  paymentMethod: string;
  status: string;
  invoiceNumber?: string;
  employeeName?: string;
  profit?: number;
  vatAmount?: number;
  discount?: number;
}

interface IncomeData {
  incomes: Income[];
  summary: {
    totalIncome: number;
    totalProfit: number;
    totalVAT: number;
    totalDiscount: number;
    incomeCount: number;
    averageIncome: number;
    largestIncome: number;
  };
  serviceTypeBreakdown: Record<string, { amount: number; count: number; profit: number }>;
  clientTypeBreakdown: Record<string, { amount: number; count: number }>;
  paymentMethodBreakdown: Record<string, { amount: number; count: number }>;
  employeeBreakdown: Record<string, { amount: number; count: number; profit: number }>;
  monthlyTrend: Record<string, number>;
}

const IncomeReport: React.FC = () => {
  const [data, setData] = useState<IncomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterServiceType, setFilterServiceType] = useState<string>('all');
  const [filterClientType, setFilterClientType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'service' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadIncomeData();
  }, [dateFrom, dateTo]);

  const loadIncomeData = async () => {
    try {
      setLoading(true);
      
      // Load service billings (income)
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name),
          assigned_employee:employees(name),
          company_employee:employees(name)
        `)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo)
        .order('service_date', { ascending: false });

      if (error) throw error;

      const processedData = processIncomeData(billings || []);
      setData(processedData);
    } catch (error) {
      console.error('Error loading income data:', error);
      toast.error('Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  const processIncomeData = (billings: any[]): IncomeData => {
    const incomes: Income[] = billings.map(billing => {
      // Calculate profit properly: Net Service Charges - Vendor Cost
      const typingCharges = parseFloat(billing.typing_charges || 0);
      const vendorCost = parseFloat(billing.vendor_cost || 0);
      const vatPercentage = parseFloat(billing.vat_percentage || 0);

      // Calculate net service charges (typing charges after VAT deduction if VAT-inclusive)
      let netTypingCharges = typingCharges;
      if (vatPercentage > 0 && billing.vat_calculation_method === 'inclusive') {
        netTypingCharges = typingCharges / (1 + (vatPercentage / 100));
      }

      // Profit = Net Service Charges - Vendor Cost
      const profit = netTypingCharges - vendorCost;

      return {
        id: billing.id,
        date: billing.service_date,
        amount: parseFloat(billing.total_amount_with_vat || billing.total_amount || 0),
        serviceType: billing.service_type?.name || 'Unknown Service',
        clientName: billing.company?.company_name || billing.individual?.individual_name || 'Unknown Client',
        clientType: billing.company_id ? 'company' : 'individual',
        paymentMethod: billing.cash_type || 'unknown',
        status: billing.status || 'completed',
        invoiceNumber: billing.invoice_number,
        employeeName: billing.assigned_employee?.name || billing.company_employee?.name,
        profit: profit,
        vatAmount: parseFloat(billing.vat_amount || 0),
        discount: parseFloat(billing.discount || 0)
      };
    });

    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalProfit = incomes.reduce((sum, income) => sum + (income.profit || 0), 0);
    const totalVAT = incomes.reduce((sum, income) => sum + (income.vatAmount || 0), 0);
    const totalDiscount = incomes.reduce((sum, income) => sum + (income.discount || 0), 0);
    const incomeCount = incomes.length;
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;
    const largestIncome = incomes.length > 0 ? Math.max(...incomes.map(i => i.amount)) : 0;

    // Service type breakdown
    const serviceTypeBreakdown: Record<string, { amount: number; count: number; profit: number }> = {};
    incomes.forEach(income => {
      if (!serviceTypeBreakdown[income.serviceType]) {
        serviceTypeBreakdown[income.serviceType] = { amount: 0, count: 0, profit: 0 };
      }
      serviceTypeBreakdown[income.serviceType].amount += income.amount;
      serviceTypeBreakdown[income.serviceType].count += 1;
      serviceTypeBreakdown[income.serviceType].profit += (income.profit || 0);
    });

    // Client type breakdown
    const clientTypeBreakdown: Record<string, { amount: number; count: number }> = {};
    incomes.forEach(income => {
      if (!clientTypeBreakdown[income.clientType]) {
        clientTypeBreakdown[income.clientType] = { amount: 0, count: 0 };
      }
      clientTypeBreakdown[income.clientType].amount += income.amount;
      clientTypeBreakdown[income.clientType].count += 1;
    });

    // Payment method breakdown
    const paymentMethodBreakdown: Record<string, { amount: number; count: number }> = {};
    incomes.forEach(income => {
      if (!paymentMethodBreakdown[income.paymentMethod]) {
        paymentMethodBreakdown[income.paymentMethod] = { amount: 0, count: 0 };
      }
      paymentMethodBreakdown[income.paymentMethod].amount += income.amount;
      paymentMethodBreakdown[income.paymentMethod].count += 1;
    });

    // Employee breakdown
    const employeeBreakdown: Record<string, { amount: number; count: number; profit: number }> = {};
    incomes.forEach(income => {
      const employee = income.employeeName || 'Unassigned';
      if (!employeeBreakdown[employee]) {
        employeeBreakdown[employee] = { amount: 0, count: 0, profit: 0 };
      }
      employeeBreakdown[employee].amount += income.amount;
      employeeBreakdown[employee].count += 1;
      employeeBreakdown[employee].profit += (income.profit || 0);
    });

    // Monthly trend
    const monthlyTrend: Record<string, number> = {};
    incomes.forEach(income => {
      const month = new Date(income.date).toISOString().slice(0, 7); // YYYY-MM
      monthlyTrend[month] = (monthlyTrend[month] || 0) + income.amount;
    });

    return {
      incomes,
      summary: {
        totalIncome,
        totalProfit,
        totalVAT,
        totalDiscount,
        incomeCount,
        averageIncome,
        largestIncome
      },
      serviceTypeBreakdown,
      clientTypeBreakdown,
      paymentMethodBreakdown,
      employeeBreakdown,
      monthlyTrend
    };
  };

  const filteredIncomes = data?.incomes.filter(income => {
    const matchesSearch = income.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (income.invoiceNumber && income.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (income.employeeName && income.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesServiceType = filterServiceType === 'all' || income.serviceType === filterServiceType;
    const matchesClientType = filterClientType === 'all' || income.clientType === filterClientType;
    const matchesPayment = filterPayment === 'all' || income.paymentMethod === filterPayment;
    
    return matchesSearch && matchesServiceType && matchesClientType && matchesPayment;
  }) || [];

  // Sort filtered incomes
  const sortedIncomes = [...filteredIncomes].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'service':
        comparison = a.serviceType.localeCompare(b.serviceType);
        break;
      case 'client':
        comparison = a.clientName.localeCompare(b.clientName);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const exportReport = () => {
    if (!data) return;

    const reportContent = `
INCOME REPORT
=============
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Income: AED ${data.summary.totalIncome.toLocaleString()}
Total Profit: AED ${data.summary.totalProfit.toLocaleString()}
Total VAT: AED ${data.summary.totalVAT.toLocaleString()}
Total Discount: AED ${data.summary.totalDiscount.toLocaleString()}
Number of Transactions: ${data.summary.incomeCount}
Average Income: AED ${data.summary.averageIncome.toLocaleString()}
Largest Transaction: AED ${data.summary.largestIncome.toLocaleString()}

SERVICE TYPE BREAKDOWN
----------------------
${Object.entries(data.serviceTypeBreakdown).map(([service, data]) => 
  `${service}: AED ${data.amount.toLocaleString()} (${data.count} transactions, AED ${data.profit.toLocaleString()} profit)`
).join('\n')}

CLIENT TYPE BREAKDOWN
---------------------
${Object.entries(data.clientTypeBreakdown).map(([type, data]) => 
  `${type}: AED ${data.amount.toLocaleString()} (${data.count} transactions)`
).join('\n')}

DETAILED INCOME
---------------
${sortedIncomes.map(income => 
  `${income.date} | ${income.serviceType} | ${income.clientName} | AED ${income.amount.toLocaleString()} | ${income.paymentMethod} | ${income.invoiceNumber || 'N/A'}`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Income report exported successfully');
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

  const getServiceTypeColor = (serviceType: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    const index = serviceType.length % colors.length;
    return colors[index];
  };

  const exportReportPDF = () => {
    if (!data) return;

    const pdfData = sortedIncomes.map(income => ({
      date: income.date,
      serviceType: income.serviceType,
      clientName: income.clientName,
      clientType: income.clientType === 'company' ? 'Company' : 'Individual',
      amount: income.amount,
      profit: income.profit || 0,
      vatAmount: income.vatAmount || 0,
      discount: income.discount || 0,
      paymentMethod: income.paymentMethod.replace('_', ' ').toUpperCase(),
      invoiceNumber: income.invoiceNumber || '-',
      status: income.status.toUpperCase()
    }));

    const summaryData = [
      { label: 'Total Income', value: `AED ${data.summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total Profit', value: `AED ${data.summary.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total VAT', value: `AED ${data.summary.totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total Discount', value: `AED ${data.summary.totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Number of Transactions', value: data.summary.incomeCount },
      { label: 'Average Income', value: `AED ${data.summary.averageIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Largest Transaction', value: `AED ${data.summary.largestIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
    ];

    exportToPDF({
      title: 'Income Report',
      subtitle: 'Revenue Breakdown by Service Types and Sources',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      columns: [
        { header: 'Date', dataKey: 'date' },
        { header: 'Service Type', dataKey: 'serviceType' },
        { header: 'Client', dataKey: 'clientName' },
        { header: 'Type', dataKey: 'clientType' },
        { header: 'Amount (AED)', dataKey: 'amount' },
        { header: 'Profit (AED)', dataKey: 'profit' },
        { header: 'VAT (AED)', dataKey: 'vatAmount' },
        { header: 'Discount (AED)', dataKey: 'discount' },
        { header: 'Payment Method', dataKey: 'paymentMethod' },
        { header: 'Invoice #', dataKey: 'invoiceNumber' },
        { header: 'Status', dataKey: 'status' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Income_Report_${dateFrom}_to_${dateTo}.pdf`,
      orientation: 'landscape'
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
          <h1 className="text-2xl font-bold text-gray-900">Income Report</h1>
          <p className="text-gray-600">Revenue breakdown by service types and sources</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Services</option>
              {data && Object.keys(data.serviceTypeBreakdown).map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Type</label>
            <select
              value={filterClientType}
              onChange={(e) => setFilterClientType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              <option value="company">Companies</option>
              <option value="individual">Individuals</option>
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
              <option value="service-asc">Service (A-Z)</option>
              <option value="client-asc">Client (A-Z)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search income..."
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
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-blue-600">AED {data.summary.totalProfit.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.summary.totalIncome > 0 ?
                `${((data.summary.totalProfit / data.summary.totalIncome) * 100).toFixed(1)}% margin` :
                'No margin data'
              }
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Income</p>
                <p className="text-2xl font-bold text-purple-600">AED {data.summary.averageIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Per transaction</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Types</p>
                <p className="text-2xl font-bold text-orange-600">{Object.keys(data.serviceTypeBreakdown).length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Revenue sources</p>
          </div>
        </div>
      )}

      {/* Additional Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total VAT</p>
                <p className="text-2xl font-bold text-indigo-600">AED {data.summary.totalVAT.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Tax collected</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Discount</p>
                <p className="text-2xl font-bold text-red-600">AED {data.summary.totalDiscount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Discounts given</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Largest Transaction</p>
                <p className="text-2xl font-bold text-emerald-600">AED {data.summary.largestIncome.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Single transaction</p>
          </div>
        </div>
      )}

      {/* Income Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Income Details</h2>
            <span className="text-sm text-gray-500">
              Showing {sortedIncomes.length} of {data?.summary.incomeCount || 0} transactions
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedIncomes.map((income) => (
                <tr key={income.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(income.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getServiceTypeColor(income.serviceType)}`}>
                      {income.serviceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      {income.clientType === 'company' ? (
                        <Building2 className="w-4 h-4 text-blue-500" />
                      ) : (
                        <User className="w-4 h-4 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium">{income.clientName}</div>
                        {income.invoiceNumber && (
                          <div className="text-xs text-gray-500">Invoice: {income.invoiceNumber}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {income.employeeName ? (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{income.employeeName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      {getPaymentMethodIcon(income.paymentMethod)}
                      <span className="capitalize">{income.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    AED {income.amount.toLocaleString()}
                    {income.vatAmount > 0 && (
                      <div className="text-xs text-gray-500">+{income.vatAmount.toLocaleString()} VAT</div>
                    )}
                    {income.discount > 0 && (
                      <div className="text-xs text-red-500">-{income.discount.toLocaleString()} discount</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-blue-600">
                    {income.profit ? `AED ${income.profit.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      income.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : income.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {income.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedIncomes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No income found</h3>
              <p className="text-gray-600">Try adjusting your filters or date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Type Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.serviceTypeBreakdown)
                .sort(([,a], [,b]) => b.amount - a.amount)
                .map(([service, data]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getServiceTypeColor(service)}`}>
                      {service}
                    </span>
                    <span className="text-sm text-gray-500">({data.count} transactions)</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      AED {data.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-purple-600">
                      AED {data.profit.toLocaleString()} profit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Type Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(data.clientTypeBreakdown)
                .sort(([,a], [,b]) => b.amount - a.amount)
                .map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {type === 'company' ? (
                      <Building2 className="w-4 h-4 text-blue-500" />
                    ) : (
                      <User className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type === 'company' ? 'Companies' : 'Individuals'}
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

      {/* Employee Performance */}
      {data && Object.keys(data.employeeBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.employeeBreakdown)
              .sort(([,a], [,b]) => b.amount - a.amount)
              .map(([employee, data]) => (
              <div key={employee} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{employee}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium text-green-600">AED {data.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Profit:</span>
                    <span className="font-medium text-purple-600">AED {data.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transactions:</span>
                    <span className="font-medium text-blue-600">{data.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeReport;
