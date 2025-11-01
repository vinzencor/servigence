import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, Search, DollarSign, TrendingUp, TrendingDown, Users, Building2, AlertCircle, FileText, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface OutstandingCustomer {
  id: string;
  name: string;
  type: 'company' | 'individual';
  totalDues: number;
  totalAdvancePayments: number;
  netOutstanding: number;
  creditLimit: number;
  phone: string;
  email: string;
  lastActivity?: string;
}

interface OutstandingReportProps {
  onNavigate?: (view: string) => void;
}

const OutstandingReport: React.FC<OutstandingReportProps> = ({ onNavigate }) => {
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [customerType, setCustomerType] = useState<'all' | 'company' | 'individual'>('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'outstanding' | 'advance' | 'balanced'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<OutstandingCustomer[]>([]);

  // Summary statistics
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalOutstanding: 0,
    totalAdvancePayments: 0,
    totalDues: 0,
    netBalance: 0
  });

  useEffect(() => {
    loadOutstandingData();
  }, [dateFrom, dateTo, customerType]);

  const loadOutstandingData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading outstanding data...');

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

      // Load dues data
      const { data: dues, error: duesError } = await supabase
        .from('dues')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59');

      if (duesError) {
        console.error('Error loading dues:', duesError);
        // Continue without dues data for now
      }

      // Load advance payments data
      const { data: advancePayments, error: advanceError } = await supabase
        .from('customer_advance_payments')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo);

      if (advanceError) {
        console.error('Error loading advance payments:', advanceError);
        // Continue without advance payments data for now
      }

      console.log('📊 Data loaded:', { companies: companies?.length, individuals: individuals?.length, dues: dues?.length, advancePayments: advancePayments?.length });

      // Process companies
      const companyCustomers: OutstandingCustomer[] = (companies || []).map(company => {
        const companyDues = (dues || []).filter(due => due.company_id === company.id);
        const companyAdvances = (advancePayments || []).filter(payment => payment.company_id === company.id);

        const totalDues = companyDues.reduce((sum, due) => sum + (due.due_amount || 0), 0);
        const totalAdvancePayments = companyAdvances.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const netOutstanding = totalDues - totalAdvancePayments;

        return {
          id: company.id,
          name: company.company_name,
          type: 'company' as const,
          totalDues,
          totalAdvancePayments,
          netOutstanding,
          creditLimit: company.credit_limit || 0,
          phone: company.phone1 || '',
          email: company.email1 || '',
          lastActivity: company.created_at
        };
      });

      // Process individuals
      const individualCustomers: OutstandingCustomer[] = (individuals || []).map(individual => {
        const individualDues = (dues || []).filter(due => due.individual_id === individual.id);
        const individualAdvances = (advancePayments || []).filter(payment => payment.individual_id === individual.id);

        const totalDues = individualDues.reduce((sum, due) => sum + (due.due_amount || 0), 0);
        const totalAdvancePayments = individualAdvances.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const netOutstanding = totalDues - totalAdvancePayments;

        return {
          id: individual.id,
          name: individual.individual_name,
          type: 'individual' as const,
          totalDues,
          totalAdvancePayments,
          netOutstanding,
          creditLimit: individual.credit_limit || 0,
          phone: individual.phone1 || '',
          email: individual.email1 || '',
          lastActivity: individual.created_at
        };
      });

      // Combine all customers
      let allCustomers = [...companyCustomers, ...individualCustomers];

      // Filter by customer type
      if (customerType !== 'all') {
        allCustomers = allCustomers.filter(customer => customer.type === customerType);
      }

      // Sort by net outstanding (highest first)
      allCustomers.sort((a, b) => b.netOutstanding - a.netOutstanding);

      setCustomers(allCustomers);

      // Calculate summary
      const totalCustomers = allCustomers.length;
      const totalOutstanding = allCustomers.reduce((sum, customer) => sum + Math.max(0, customer.netOutstanding), 0);
      const totalAdvancePayments = allCustomers.reduce((sum, customer) => sum + customer.totalAdvancePayments, 0);
      const totalDues = allCustomers.reduce((sum, customer) => sum + customer.totalDues, 0);
      const netBalance = totalDues - totalAdvancePayments;

      setSummary({
        totalCustomers,
        totalOutstanding,
        totalAdvancePayments,
        totalDues,
        netBalance
      });

      console.log('✅ Outstanding data processed successfully');
    } catch (error) {
      console.error('❌ Error loading outstanding data:', error);
      toast.error('Failed to load outstanding data');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term and payment status
  const filteredCustomers = customers.filter(customer => {
    // Search filter
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Payment status filter
    let matchesStatus = true;
    if (paymentStatus === 'outstanding') {
      matchesStatus = customer.netOutstanding > 0;
    } else if (paymentStatus === 'advance') {
      matchesStatus = customer.netOutstanding < 0;
    } else if (paymentStatus === 'balanced') {
      matchesStatus = customer.netOutstanding === 0;
    }

    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Type', 'Total Dues', 'Advance Payments', 'Net Outstanding', 'Credit Limit', 'Phone', 'Email'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(customer => [
        `"${customer.name}"`,
        customer.type,
        customer.totalDues.toFixed(2),
        customer.totalAdvancePayments.toFixed(2),
        customer.netOutstanding.toFixed(2),
        customer.creditLimit.toFixed(2),
        `"${customer.phone}"`,
        `"${customer.email}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outstanding-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Outstanding report exported successfully!');
  };

  const getStatusColor = (netOutstanding: number) => {
    if (netOutstanding > 0) return 'text-red-600 bg-red-50';
    if (netOutstanding < 0) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusText = (netOutstanding: number) => {
    if (netOutstanding > 0) return 'Outstanding';
    if (netOutstanding < 0) return 'Advance';
    return 'Balanced';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Outstanding Report</h2>
          <p className="text-gray-600 mt-1">Track customer balances, advance payments, and outstanding amounts</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={loading || filteredCustomers.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dues</p>
              <p className="text-2xl font-bold text-red-600">AED {summary.totalDues.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Advance Payments</p>
              <p className="text-2xl font-bold text-green-600">AED {summary.totalAdvancePayments.toLocaleString()}</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Outstanding</p>
              <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                AED {Math.abs(summary.netBalance).toLocaleString()}
              </p>
            </div>
            {summary.netBalance >= 0 ? (
              <TrendingUp className="w-8 h-8 text-red-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding Customers</p>
              <p className="text-2xl font-bold text-orange-600">
                {customers.filter(c => c.netOutstanding > 0).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Customer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as 'all' | 'company' | 'individual')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Customers</option>
                <option value="company">Companies</option>
                <option value="individual">Individuals</option>
              </select>
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'all' | 'outstanding' | 'advance' | 'balanced')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="outstanding">Outstanding</option>
                <option value="advance">Advance Payments</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
          </div>

          {/* Search */}
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

      {/* Outstanding Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Customer Outstanding Details</h3>
            <div className="text-sm text-gray-600">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading outstanding data...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Outstanding Data</h3>
            <p className="text-gray-600">No customers found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Dues
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advance Payments
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Outstanding
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Limit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={`${customer.type}-${customer.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {customer.type === 'company' ? (
                          <Building2 className="w-5 h-5 text-blue-600 mr-3" />
                        ) : (
                          <Users className="w-5 h-5 text-green-600 mr-3" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">ID: {customer.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.type === 'company'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.type === 'company' ? 'Company' : 'Individual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      AED {customer.totalDues.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600">
                      AED {customer.totalAdvancePayments.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={customer.netOutstanding >= 0 ? 'text-red-600' : 'text-green-600'}>
                        AED {Math.abs(customer.netOutstanding).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      AED {customer.creditLimit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.netOutstanding)}`}>
                        {getStatusText(customer.netOutstanding)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{customer.phone}</div>
                        <div className="text-gray-500">{customer.email}</div>
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

export default OutstandingReport;
