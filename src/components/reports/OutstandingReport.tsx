import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, Search, DollarSign, TrendingUp, TrendingDown, Users, Building2, AlertCircle, FileText, CreditCard, Receipt, Printer } from 'lucide-react';
import { supabase, dbHelpers } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { generateOutstandingStatement, OutstandingReceiptData } from '../../utils/receiptGenerator';
import PaymentMethodSelector from '../PaymentMethodSelector';

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

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<OutstandingCustomer | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online',
    paymentReference: '',
    notes: ''
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

      // Load service billings data (the actual dues/invoices)
      // For Outstanding Report, we need ALL service billings regardless of date
      // because outstanding amounts are cumulative across all time periods
      const { data: serviceBillings, error: billingsError } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name)
        `)
        .neq('status', 'cancelled'); // Exclude cancelled billings only

      if (billingsError) {
        console.error('Error loading service billings:', billingsError);
        throw billingsError;
      }

      // Load advance payments data from account_transactions
      // For Outstanding Report, we need ALL advance payments regardless of date
      // because they affect outstanding balances across all time periods
      const { data: advancePayments, error: advanceError } = await supabase
        .from('account_transactions')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .eq('transaction_type', 'advance_payment')
        .eq('status', 'completed'); // Only include completed payments

      if (advanceError) {
        console.error('Error loading advance payments:', advanceError);
        throw advanceError;
      }

      console.log('📊 Data loaded:', {
        companies: companies?.length,
        individuals: individuals?.length,
        serviceBillings: serviceBillings?.length,
        advancePayments: advancePayments?.length
      });

      console.log('💰 Sample advance payments:', advancePayments?.slice(0, 3).map(p => ({
        amount: p.amount,
        company_id: p.company_id,
        notes: p.notes?.substring(0, 30)
      })));

      // Use the same calculation method as Service Billing component
      const billingsWithPayments = await dbHelpers.calculateOutstandingAmounts(serviceBillings || []);

      console.log('💰 Billings with payment calculations:', billingsWithPayments.length);
      console.log('💰 Sample billing with payments:', billingsWithPayments[0]);

      // Process companies
      const companyCustomers: OutstandingCustomer[] = (companies || []).map(company => {
        // Get all service billings for this company
        const companyBillings = billingsWithPayments.filter(billing => billing.company_id === company.id);

        // Calculate total dues (sum of all invoice amounts)
        const totalDues = companyBillings.reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);

        // Calculate total advance payments for this company from ALL advance payment transactions
        const companyAdvancePayments = (advancePayments || []).filter(payment => payment.company_id === company.id);
        const totalAdvancePayments = companyAdvancePayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

        // Calculate net outstanding (Total Dues - Total Advance Payments)
        const netOutstanding = Math.max(0, totalDues - totalAdvancePayments);

        if (company.company_name === '24234324234') {
          console.log(`🏢 Company ${company.company_name}:`, {
            billings: companyBillings.length,
            totalDues,
            advancePaymentsCount: companyAdvancePayments.length,
            advancePayments: companyAdvancePayments.map(p => ({ amount: p.amount, notes: p.notes?.substring(0, 30) })),
            totalAdvancePayments,
            netOutstanding,
            sampleBilling: companyBillings[0]
          });
        }

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
        // Get all service billings for this individual
        const individualBillings = billingsWithPayments.filter(billing => billing.individual_id === individual.id);

        // Calculate total dues (sum of all invoice amounts)
        const totalDues = individualBillings.reduce((sum, billing) => sum + (billing.totalAmount || 0), 0);

        // Calculate total advance payments for this individual from ALL advance payment transactions
        const individualAdvancePayments = (advancePayments || []).filter(payment => payment.individual_id === individual.id);
        const totalAdvancePayments = individualAdvancePayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

        // Calculate net outstanding (Total Dues - Total Advance Payments)
        const netOutstanding = Math.max(0, totalDues - totalAdvancePayments);

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

  // Generate outstanding statement receipt for a customer
  const handleGenerateReceipt = (customer: OutstandingCustomer) => {
    const receiptData: OutstandingReceiptData = {
      customerName: customer.name,
      customerType: customer.type,
      customerId: customer.id,
      totalDues: customer.totalDues,
      totalAdvancePayments: customer.totalAdvancePayments,
      netOutstanding: customer.netOutstanding,
      creditLimit: customer.creditLimit,
      phone: customer.phone,
      email: customer.email
    };

    generateOutstandingStatement(receiptData);
  };

  // Handle payment recording
  const handleRecordPayment = (customer: OutstandingCustomer) => {
    console.log('🎯 Recording payment for customer:', customer);
    console.log('🎯 Customer netOutstanding:', customer.netOutstanding, 'Type:', typeof customer.netOutstanding);

    const amountString = customer.netOutstanding > 0 ? customer.netOutstanding.toString() : '';
    console.log('🎯 Amount string for form:', amountString);

    setSelectedCustomerForPayment(customer);
    setPaymentForm({
      amount: amountString,
      paymentMethod: 'cash',
      paymentReference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!selectedCustomerForPayment) return;

    console.log('Payment form data:', paymentForm);
    const amount = parseFloat(paymentForm.amount);
    console.log('Parsed amount:', amount, 'Original amount string:', paymentForm.amount);

    if (!paymentForm.amount || paymentForm.amount.trim() === '') {
      console.error('Empty amount field');
      toast.error('Please enter a payment amount');
      return;
    }

    if (isNaN(amount)) {
      console.error('Invalid amount - not a number:', paymentForm.amount);
      toast.error('Please enter a valid numeric amount');
      return;
    }

    if (amount <= 0) {
      console.error('Invalid amount - must be positive:', amount);
      toast.error('Payment amount must be greater than 0');
      return;
    }

    console.log('✅ Amount validation passed:', amount);

    try {
      // Generate receipt number first
      const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      console.log('💳 Generated receipt number:', receiptNumber);

      // Create account transaction for the payment with receipt number in reference_number field
      const transactionData = {
        transaction_type: 'advance_payment',
        category: 'Advance Payment',
        description: `Payment from Outstanding Report - Customer: ${selectedCustomerForPayment.name}`,
        amount: amount,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: paymentForm.paymentMethod,
        reference_number: receiptNumber, // Store receipt number here for Receipt Management integration
        status: 'completed',
        notes: `${paymentForm.notes || 'Payment recorded from Outstanding Report'}${paymentForm.paymentReference ? ` | Payment Ref: ${paymentForm.paymentReference}` : ''}`,
        company_id: selectedCustomerForPayment.type === 'company' ? selectedCustomerForPayment.id : null,
        individual_id: selectedCustomerForPayment.type === 'individual' ? selectedCustomerForPayment.id : null,
        created_by: 'system' // In a real app, this would be the current user ID
      };

      console.log('Transaction data to be created:', transactionData);
      const createdTransaction = await dbHelpers.createAccountTransaction(transactionData);
      console.log('Transaction created successfully:', createdTransaction);

      // Generate payment receipt
      const receiptData = {
        receiptNumber: receiptNumber,
        date: new Date().toLocaleDateString(),
        customerName: selectedCustomerForPayment.name,
        customerType: selectedCustomerForPayment.type,
        customerId: selectedCustomerForPayment.id,
        amount: amount,
        description: 'Payment from Outstanding Report',
        paymentMethod: paymentForm.paymentMethod,
        status: 'paid' as const,
        transactionId: paymentForm.paymentReference,
        notes: paymentForm.notes
      };

      console.log('Receipt data:', receiptData);

      // Import and use the payment receipt generator
      const { generatePaymentReceipt } = await import('../../utils/receiptGenerator');
      generatePaymentReceipt(receiptData);

      console.log('Reloading outstanding data...');
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      // Reload data to reflect the payment
      await loadOutstandingData();

      setShowPaymentModal(false);
      setSelectedCustomerForPayment(null);
      toast.success(`Payment recorded successfully!\nReceipt ${receiptNumber} created and available in Receipt Management.`);
      console.log('Payment process completed successfully with receipt:', receiptNumber);

    } catch (error) {
      console.error('Error recording payment:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        paymentForm,
        selectedCustomer: selectedCustomerForPayment,
        parsedAmount: amount
      });
      toast.error(`Failed to record payment: ${error.message || 'Unknown error'}`);
    }
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleGenerateReceipt(customer)}
                          className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          title="Generate Outstanding Statement"
                        >
                          <Receipt className="w-3 h-3 mr-1" />
                          Statement
                        </button>
                        {customer.netOutstanding > 0 && (
                          <button
                            onClick={() => handleRecordPayment(customer)}
                            className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Print functionality - could open a print dialog with formatted statement
                            const printContent = `
Outstanding Statement - ${customer.name}
=====================================

Customer: ${customer.name}
Type: ${customer.type === 'company' ? 'Company' : 'Individual'}
Total Dues: AED ${customer.totalDues.toLocaleString()}
Advance Payments: AED ${customer.totalAdvancePayments.toLocaleString()}
Net Outstanding: AED ${Math.abs(customer.netOutstanding).toLocaleString()}
Status: ${getStatusText(customer.netOutstanding)}

Generated: ${new Date().toLocaleString()}
                            `.trim();

                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Outstanding Statement - ${customer.name}</title>
                                    <style>
                                      body { font-family: monospace; padding: 20px; }
                                      pre { white-space: pre-wrap; }
                                    </style>
                                  </head>
                                  <body>
                                    <pre>${printContent}</pre>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors"
                          title="Print Statement"
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomerForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-xl font-semibold text-white">Record Payment</h2>
              <p className="text-green-100 text-sm mt-1">
                Customer: {selectedCustomerForPayment.name}
              </p>
              <p className="text-green-100 text-xs mt-1">
                Outstanding Amount: AED {selectedCustomerForPayment.netOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => {
                    console.log('💰 Amount input changed:', e.target.value);
                    setPaymentForm(prev => ({ ...prev, amount: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              {/* Payment Method Selector - Shows saved payment methods */}
              {selectedCustomerForPayment && (
                <PaymentMethodSelector
                  customerId={selectedCustomerForPayment.id}
                  customerType={selectedCustomerForPayment.type}
                  selectedPaymentType={paymentForm.paymentMethod}
                  onPaymentDetailsChange={(details) => {
                    console.log('Payment details selected:', details);
                    // Auto-populate payment reference if available
                    if (details.cardNumberLastFour) {
                      setPaymentForm(prev => ({
                        ...prev,
                        paymentReference: `Card ending in ${details.cardNumberLastFour}`
                      }));
                    } else if (details.accountNumber) {
                      setPaymentForm(prev => ({
                        ...prev,
                        paymentReference: `Account ${details.accountNumber}`
                      }));
                    }
                  }}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentForm.paymentReference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Transaction ID, Cheque number, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedCustomerForPayment(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amount = parseFloat(paymentForm.amount);
                  if (confirm(`Record payment of AED ${amount.toLocaleString()} for ${selectedCustomerForPayment.name}?`)) {
                    submitPayment();
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingReport;
