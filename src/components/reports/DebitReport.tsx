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
  AlertTriangle,
  Plus,
  ArrowDownCircle
} from 'lucide-react';
import { dbHelpers, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface DebitCustomer {
  id: string;
  name: string;
  type: 'company' | 'individual';
  totalDues: number;
  totalAdvancePayments: number;
  debitBalance: number; // Positive value when customer owes money
  phone: string;
  email: string;
  lastActivity: string;
}

interface DebitData {
  customers: DebitCustomer[];
  summary: {
    totalDebitBalance: number;
    customerCount: number;
    averageDebit: number;
    largestDebit: number;
  };
}

const DebitReport: React.FC = () => {
  const [data, setData] = useState<DebitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'company' | 'individual'>('all');

  useEffect(() => {
    loadDebitData();
  }, [dateFrom, dateTo]);

  const loadDebitData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading debit data...');

      // Load companies data
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select(`
          id,
          company_name,
          phone1,
          email1,
          credit_limit,
          created_at
        `);

      if (companiesError) throw companiesError;

      // Load individuals data
      const { data: individuals, error: individualsError } = await supabase
        .from('individuals')
        .select(`
          id,
          individual_name,
          phone1,
          email1,
          credit_limit,
          created_at
        `);

      if (individualsError) throw individualsError;

      // Load ALL service billings (no date filter for accurate balance calculation)
      const { data: serviceBillings, error: billingsError } = await supabase
        .from('service_billings')
        .select('*');

      if (billingsError) throw billingsError;

      // Load ALL advance payment transactions (no date filter for accurate balance calculation)
      const { data: advancePayments, error: paymentsError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('transaction_type', 'advance_payment');

      if (paymentsError) throw paymentsError;

      console.log('📊 Loaded data:', {
        companies: companies?.length || 0,
        individuals: individuals?.length || 0,
        serviceBillings: serviceBillings?.length || 0,
        advancePayments: advancePayments?.length || 0
      });

      // Use the same calculation method as Outstanding Report and Credit Report
      const billingsWithPayments = await dbHelpers.calculateOutstandingAmounts(serviceBillings || []);

      console.log('💰 Billings with payment calculations:', billingsWithPayments.length);

      // Process companies - find those with DEBIT BALANCE (owe money)
      const companyCustomers: DebitCustomer[] = (companies || [])
        .map(company => {
          // Get all service billings for this company
          const companyBillings = billingsWithPayments.filter(billing => billing.company_id === company.id);

          // Calculate total dues (sum of all invoice amounts)
          const totalDues = companyBillings.reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);

          // Calculate total advance payments for this company from ALL advance payment transactions
          const companyAdvancePayments = (advancePayments || []).filter(payment => payment.company_id === company.id);
          const totalAdvancePayments = companyAdvancePayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

          // Calculate debit balance (when dues exceed payments, this is positive)
          const debitBalance = totalDues - totalAdvancePayments;

          return {
            id: company.id,
            name: company.company_name,
            type: 'company' as const,
            totalDues,
            totalAdvancePayments,
            debitBalance,
            phone: company.phone1 || '',
            email: company.email1 || '',
            lastActivity: company.created_at
          };
        })
        .filter(customer => customer.debitBalance > 0); // Only include customers with debit balance

      // Process individuals - find those with DEBIT BALANCE (owe money)
      const individualCustomers: DebitCustomer[] = (individuals || [])
        .map(individual => {
          // Get all service billings for this individual
          const individualBillings = billingsWithPayments.filter(billing => billing.individual_id === individual.id);

          // Calculate total dues (sum of all invoice amounts)
          const totalDues = individualBillings.reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);

          // Calculate total advance payments for this individual from ALL advance payment transactions
          const individualAdvancePayments = (advancePayments || []).filter(payment => payment.individual_id === individual.id);
          const totalAdvancePayments = individualAdvancePayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

          // Calculate debit balance (when dues exceed payments, this is positive)
          const debitBalance = totalDues - totalAdvancePayments;

          return {
            id: individual.id,
            name: individual.individual_name,
            type: 'individual' as const,
            totalDues,
            totalAdvancePayments,
            debitBalance,
            phone: individual.phone1 || '',
            email: individual.email1 || '',
            lastActivity: individual.created_at
          };
        })
        .filter(customer => customer.debitBalance > 0); // Only include customers with debit balance

      // Combine all customers with debit balances
      const allCustomers = [...companyCustomers, ...individualCustomers];

      console.log('💳 Debit customers found:', {
        companies: companyCustomers.length,
        individuals: individualCustomers.length,
        total: allCustomers.length
      });

      // Calculate summary
      const totalDebitBalance = allCustomers.reduce((sum, c) => sum + c.debitBalance, 0);
      const customerCount = allCustomers.length;
      const averageDebit = customerCount > 0 ? totalDebitBalance / customerCount : 0;
      const largestDebit = Math.max(...allCustomers.map(c => c.debitBalance), 0);

      setData({
        customers: allCustomers,
        summary: { totalDebitBalance, customerCount, averageDebit, largestDebit }
      });

      console.log('✅ Debit data loaded successfully');
    } catch (error) {
      console.error('Error loading debit data:', error);
      toast.error('Failed to load debit report data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = data?.customers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = customerType === 'all' || customer.type === customerType;

    return matchesSearch && matchesType;
  }) || [];

  const exportToCSV = () => {
    if (!filteredCustomers.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Customer Name', 'Type', 'Total Dues', 'Total Payments', 'Debit Balance', 'Phone', 'Email'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(c => [
        `"${c.name}"`,
        c.type === 'company' ? 'Company' : 'Individual',
        c.totalDues.toFixed(2),
        c.totalAdvancePayments.toFixed(2),
        c.debitBalance.toFixed(2),
        c.phone || '',
        c.email || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debit-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Debit report exported to CSV');
  };

  const exportReportPDF = () => {
    if (!data) return;

    const pdfData = (filteredCustomers || []).map(customer => ({
      name: customer.name,
      type: customer.type === 'company' ? 'Company' : 'Individual',
      totalDues: customer.totalDues.toFixed(2),
      totalPayments: customer.totalAdvancePayments.toFixed(2),
      debitBalance: customer.debitBalance.toFixed(2),
      phone: customer.phone || '-',
      email: customer.email || '-'
    }));

    const summaryData = [
      { label: 'Total Debit Balance', value: `AED ${data.summary.totalDebitBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Number of Customers', value: data.summary.customerCount },
      { label: 'Average Debit', value: `AED ${data.summary.averageDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Largest Debit', value: `AED ${data.summary.largestDebit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
    ];

    exportToPDF({
      title: 'Debit Report',
      subtitle: 'Customers with Debit Balances',
      dateRange: `As of: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: 'Customer Name', dataKey: 'name' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Total Dues', dataKey: 'totalDues' },
        { header: 'Total Payments', dataKey: 'totalPayments' },
        { header: 'Debit Balance', dataKey: 'debitBalance' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Email', dataKey: 'email' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Debit_Report_${new Date().toISOString().split('T')[0]}.pdf`,
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
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Debit Report</h1>
                <p className="text-gray-500 mt-1">Customers with debit balances (amounts owed)</p>
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
                onClick={exportReportPDF}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as 'all' | 'company' | 'individual')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="company">Companies</option>
                <option value="individual">Individuals</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search customers..."
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
              <p className="text-sm font-medium text-gray-500">Total Debit Balance</p>
              <p className="text-2xl font-bold text-red-600">
                AED {data?.summary.totalDebitBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Customers with Debits</p>
              <p className="text-2xl font-bold text-blue-600">{data?.summary.customerCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Debit</p>
              <p className="text-2xl font-bold text-purple-600">
                AED {data?.summary.averageDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
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
              <p className="text-sm font-medium text-gray-500">Largest Debit</p>
              <p className="text-2xl font-bold text-orange-600">
                AED {data?.summary.largestDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Customers with Debit Balances</h2>
            <span className="text-sm text-gray-500">
              Showing {filteredCustomers.length} of {data?.customers.length || 0} customers
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Dues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Payments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      customer.type === 'company'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-purple-100 text-purple-800 border-purple-200'
                    }`}>
                      {customer.type === 'company' ? 'Company' : 'Individual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    AED {customer.totalDues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    AED {customer.totalAdvancePayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-red-600">
                      AED {customer.debitBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                    <div className="text-xs text-gray-500">{customer.email || '-'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers with debit balances found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No customers have outstanding balances at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebitReport;
