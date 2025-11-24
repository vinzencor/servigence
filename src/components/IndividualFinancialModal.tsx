import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  CreditCard,
  AlertCircle,
  Building2,
  User,
  Search,
  Filter,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Individual } from '../types';
import { exportToPDF } from '../utils/pdfExport';

interface IndividualFinancialModalProps {
  individual: Individual;
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceBilling {
  id: string;
  service_date: string;
  total_amount: number;
  total_amount_with_vat: number;
  status: string;
  invoice_number: string;
  service_type: {
    name: string;
  };
  payment_method?: string;
}

interface AdvancePayment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  payment_reference: string;
  receipt_number: string;
  status: string;
  notes: string;
}

interface AccountTransaction {
  id: string;
  transaction_type: string;
  category: string;
  description: string;
  amount: number;
  transaction_date: string;
  payment_method: string;
  reference_number: string;
  status: string;
}

interface FinancialSummary {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalCredits: number;
  totalDebits: number;
  creditLimit: number;
  availableCredit: number;
  overdueAmount: number;
  totalAdvancePayments: number;
  advancePaymentCount: number;
}

const IndividualFinancialModal: React.FC<IndividualFinancialModalProps> = ({
  individual,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'billing' | 'credits' | 'debits' | 'summary'>('summary');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Data states
  const [serviceBillings, setServiceBillings] = useState<ServiceBilling[]>([]);
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalCredits: 0,
    totalDebits: 0,
    creditLimit: individual.creditLimit || 0,
    availableCredit: 0,
    overdueAmount: 0,
    totalAdvancePayments: 0,
    advancePaymentCount: 0
  });

  useEffect(() => {
    if (isOpen && individual.id) {
      loadFinancialData();
    }
  }, [isOpen, individual.id, dateRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadServiceBillings(),
        loadAdvancePayments(),
        loadAccountTransactions(),
        loadFinancialSummary()
      ]);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const loadServiceBillings = async () => {
    try {
      const data = await dbHelpers.getIndividualServiceBillings(
        individual.id,
        dateRange.startDate,
        dateRange.endDate
      );
      setServiceBillings(data || []);
    } catch (error) {
      console.error('Error loading service billings:', error);
      setServiceBillings([]);
      toast.error('Failed to load service billings');
    }
  };

  // Download Functions
  const downloadBillingReport = () => {
    try {
      const csvContent = [
        ['Invoice Number', 'Service', 'Date', 'Payment Method', 'Amount', 'VAT', 'Total', 'Status'],
        ...serviceBillings.map(billing => [
          billing.invoice_number || 'N/A',
          billing.service_type?.name || 'N/A',
          new Date(billing.service_date).toLocaleDateString(),
          billing.cash_type,
          (billing.typing_charges + billing.government_charges).toFixed(2),
          (billing.vat_amount || 0).toFixed(2),
          (billing.total_amount_with_vat || billing.total_amount || 0).toFixed(2),
          billing.status
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${individual.individualName}_billing_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Billing report downloaded successfully');
    } catch (error) {
      console.error('Error downloading billing report:', error);
      toast.error('Failed to download billing report');
    }
  };

  const downloadCreditsReport = () => {
    try {
      const csvContent = [
        ['Date', 'Payment Method', 'Reference', 'Amount', 'Notes'],
        ...advancePayments.map(payment => [
          new Date(payment.payment_date).toLocaleDateString(),
          payment.payment_method,
          payment.payment_reference || 'N/A',
          payment.amount.toFixed(2),
          payment.notes || '-'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${individual.individualName}_credits_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Credits report downloaded successfully');
    } catch (error) {
      console.error('Error downloading credits report:', error);
      toast.error('Failed to download credits report');
    }
  };

  const downloadDebitsReport = () => {
    try {
      const debitTransactions = accountTransactions.filter(t => t.transaction_type === 'debit');
      const csvContent = [
        ['Date', 'Type', 'Reference', 'Amount', 'Notes'],
        ...debitTransactions.map(transaction => [
          new Date(transaction.transaction_date).toLocaleDateString(),
          transaction.transaction_type,
          transaction.reference_number || 'N/A',
          Math.abs(transaction.amount).toFixed(2),
          transaction.notes || '-'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${individual.individualName}_debits_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Debits report downloaded successfully');
    } catch (error) {
      console.error('Error downloading debits report:', error);
      toast.error('Failed to download debits report');
    }
  };

  const downloadComprehensiveReport = () => {
    try {
      let csvContent = `Individual Financial Report\n`;
      csvContent += `Individual: ${individual.individualName}\n`;
      csvContent += `Phone: ${individual.phone1}\n`;
      csvContent += `Email: ${individual.email1}\n`;
      csvContent += `Date Range: ${new Date(dateRange.startDate).toLocaleDateString()} to ${new Date(dateRange.endDate).toLocaleDateString()}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Financial Summary
      csvContent += `FINANCIAL SUMMARY\n`;
      csvContent += `Opening Balance,${(individual.openingBalance || 0).toFixed(2)}\n`;
      csvContent += `Total Billed,${financialSummary.totalBilled.toFixed(2)}\n`;
      csvContent += `Total Paid,${financialSummary.totalPaid.toFixed(2)}\n`;
      csvContent += `Outstanding Balance,${financialSummary.totalOutstanding.toFixed(2)}\n`;
      csvContent += `Credit Limit,${financialSummary.creditLimit.toFixed(2)}\n`;
      csvContent += `Available Credit,${financialSummary.availableCredit.toFixed(2)}\n`;
      csvContent += `Total Credits,${financialSummary.totalCredits.toFixed(2)}\n`;
      csvContent += `Total Debits,${financialSummary.totalDebits.toFixed(2)}\n\n`;

      // Service Billings
      csvContent += `SERVICE BILLINGS\n`;
      csvContent += `Invoice Number,Service,Date,Payment Method,Amount,VAT,Total,Status\n`;
      serviceBillings.forEach(billing => {
        csvContent += `${billing.invoice_number || 'N/A'},${billing.service_type?.name || 'N/A'},${new Date(billing.service_date).toLocaleDateString()},${billing.cash_type},${(billing.typing_charges + billing.government_charges).toFixed(2)},${(billing.vat_amount || 0).toFixed(2)},${(billing.total_amount_with_vat || billing.total_amount || 0).toFixed(2)},${billing.status}\n`;
      });

      csvContent += `\nADVANCE PAYMENTS\n`;
      csvContent += `Date,Payment Method,Reference,Amount,Notes\n`;
      advancePayments.forEach(payment => {
        csvContent += `${new Date(payment.payment_date).toLocaleDateString()},${payment.payment_method},${payment.payment_reference || 'N/A'},${payment.amount.toFixed(2)},${payment.notes || '-'}\n`;
      });

      csvContent += `\nDEBIT TRANSACTIONS\n`;
      csvContent += `Date,Type,Reference,Amount,Notes\n`;
      accountTransactions.filter(t => t.transaction_type === 'debit').forEach(transaction => {
        csvContent += `${new Date(transaction.transaction_date).toLocaleDateString()},${transaction.transaction_type},${transaction.reference_number || 'N/A'},${Math.abs(transaction.amount).toFixed(2)},${transaction.notes || '-'}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${individual.individualName}_comprehensive_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Comprehensive report downloaded successfully');
    } catch (error) {
      console.error('Error downloading comprehensive report:', error);
      toast.error('Failed to download comprehensive report');
    }
  };

  const downloadPDFStatement = () => {
    try {
      // Prepare billing data for PDF
      const billingData = serviceBillings.map(billing => ({
        invoice: billing.invoice_number || 'N/A',
        service: billing.service_type?.name || 'N/A',
        date: new Date(billing.service_date).toLocaleDateString(),
        method: billing.cash_type,
        amount: (billing.typing_charges + billing.government_charges).toFixed(2),
        vat: (billing.vat_amount || 0).toFixed(2),
        total: (billing.total_amount_with_vat || billing.total_amount || 0).toFixed(2),
        status: billing.status
      }));

      // Prepare payment data for PDF
      const paymentData = advancePayments.map(payment => ({
        date: new Date(payment.payment_date).toLocaleDateString(),
        method: payment.payment_method,
        reference: payment.payment_reference || 'N/A',
        amount: payment.amount.toFixed(2),
        notes: payment.notes || '-'
      }));

      // Prepare debit data for PDF
      const debitData = accountTransactions
        .filter(t => t.transaction_type === 'debit')
        .map(transaction => ({
          date: new Date(transaction.transaction_date).toLocaleDateString(),
          type: transaction.transaction_type,
          reference: transaction.reference_number || 'N/A',
          amount: Math.abs(transaction.amount).toFixed(2),
          notes: transaction.notes || '-'
        }));

      // Summary data
      const summaryData = [
        { label: 'Individual Name', value: individual.individualName },
        { label: 'Phone', value: individual.phone1 },
        { label: 'Email', value: individual.email1 },
        { label: 'Opening Balance', value: `AED ${(individual.openingBalance || 0).toFixed(2)}` },
        { label: 'Total Billed', value: `AED ${financialSummary.totalBilled.toFixed(2)}` },
        { label: 'Total Paid', value: `AED ${financialSummary.totalPaid.toFixed(2)}` },
        { label: 'Advance Payments', value: `AED ${financialSummary.totalAdvancePayments.toFixed(2)} (${financialSummary.advancePaymentCount} ${financialSummary.advancePaymentCount === 1 ? 'transaction' : 'transactions'})` },
        { label: 'Outstanding Balance', value: `AED ${financialSummary.totalOutstanding.toFixed(2)}` },
        { label: 'Credit Limit', value: `AED ${financialSummary.creditLimit.toFixed(2)}` },
        { label: 'Available Credit', value: `AED ${financialSummary.availableCredit.toFixed(2)}` }
      ];

      // Create comprehensive PDF with all sections
      const title = 'Individual Financial Statement';
      const subtitle = individual.individualName;
      const dateRangeStr = `${new Date(dateRange.startDate).toLocaleDateString()} to ${new Date(dateRange.endDate).toLocaleDateString()}`;
      const fileName = `${individual.individualName}_financial_statement_${new Date().toISOString().split('T')[0]}.pdf`;

      // For now, export billing data as main table
      // In a full implementation, you'd create a multi-section PDF
      const columns = [
        { header: 'Invoice', dataKey: 'invoice' },
        { header: 'Service', dataKey: 'service' },
        { header: 'Date', dataKey: 'date' },
        { header: 'Method', dataKey: 'method' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'VAT', dataKey: 'vat' },
        { header: 'Total', dataKey: 'total' },
        { header: 'Status', dataKey: 'status' }
      ];

      exportToPDF({
        title,
        subtitle,
        dateRange: dateRangeStr,
        summaryData,
        columns,
        data: billingData,
        fileName,
        orientation: 'landscape'
      });

      toast.success('PDF statement downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF statement:', error);
      toast.error('Failed to download PDF statement');
    }
  };

  const loadAdvancePayments = async () => {
    try {
      const data = await dbHelpers.getIndividualAdvancePayments(
        individual.id,
        dateRange.startDate,
        dateRange.endDate
      );
      setAdvancePayments(data || []);
    } catch (error) {
      console.error('Error loading advance payments:', error);
      setAdvancePayments([]);
    }
  };

  const loadAccountTransactions = async () => {
    try {
      const data = await dbHelpers.getIndividualAccountTransactions(
        individual.id,
        dateRange.startDate,
        dateRange.endDate
      );
      setAccountTransactions(data || []);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      setAccountTransactions([]);
    }
  };

  const loadFinancialSummary = async () => {
    try {
      const summary = await dbHelpers.getIndividualFinancialSummary(
        individual.id,
        dateRange.startDate,
        dateRange.endDate
      );

      const openingBalance = individual.openingBalance || 0;
      const totalOutstanding = Math.max(0, openingBalance + summary.totalBilled - summary.totalPaid);
      const availableCredit = Math.max(0, (individual.creditLimit || 0) - totalOutstanding);

      // Advance payment statistics
      const totalAdvancePayments = summary.totalPaid; // Same as totalPaid
      const advancePaymentCount = summary.paymentCount || 0;

      setFinancialSummary({
        totalBilled: summary.totalBilled,
        totalPaid: summary.totalPaid,
        totalOutstanding,
        totalCredits: summary.totalCredits,
        totalDebits: summary.totalDebits,
        creditLimit: individual.creditLimit || 0,
        availableCredit,
        overdueAmount: 0, // Calculate if needed
        totalAdvancePayments,
        advancePaymentCount
      });
    } catch (error) {
      console.error('Error loading financial summary:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Servigence</h2>
                <p className="text-blue-100">Financial Statement & Account Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-white hover:bg-opacity-30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Individual Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-blue-200 text-sm">Individual Name</p>
              <p className="text-white font-semibold">{individual.individualName}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Phone</p>
              <p className="text-white font-semibold">{individual.phone1}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Email</p>
              <p className="text-white font-semibold">{individual.email1}</p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-200" />
              <span className="text-sm text-blue-200">Date Range:</span>
            </div>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1 rounded-lg text-gray-900 text-sm"
            />
            <span className="text-blue-200">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1 rounded-lg text-gray-900 text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-4">
            {[
              { id: 'summary', label: 'Financial Summary', icon: TrendingUp },
              { id: 'billing', label: 'Service Billings', icon: FileText },
              { id: 'credits', label: 'Credit Transactions', icon: DollarSign },
              { id: 'debits', label: 'Debit Transactions', icon: AlertCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Opening Balance</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1">
                            AED {(individual.openingBalance || 0).toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Total Billed</p>
                          <p className="text-2xl font-bold text-green-900 mt-1">
                            AED {financialSummary.totalBilled.toFixed(2)}
                          </p>
                        </div>
                        <FileText className="w-8 h-8 text-green-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Total Paid</p>
                          <p className="text-2xl font-bold text-purple-900 mt-1">
                            AED {financialSummary.totalPaid.toFixed(2)}
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-purple-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-pink-600 font-medium">Advance Payments</p>
                          <p className="text-2xl font-bold text-pink-900 mt-1">
                            AED {financialSummary.totalAdvancePayments.toFixed(2)}
                          </p>
                          <p className="text-xs text-pink-600 mt-1">
                            {financialSummary.advancePaymentCount} {financialSummary.advancePaymentCount === 1 ? 'transaction' : 'transactions'}
                          </p>
                        </div>
                        <Wallet className="w-8 h-8 text-pink-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Outstanding Balance</p>
                          <p className="text-2xl font-bold text-orange-900 mt-1">
                            AED {financialSummary.totalOutstanding.toFixed(2)}
                          </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-orange-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-indigo-600 font-medium">Credit Limit</p>
                          <p className="text-2xl font-bold text-indigo-900 mt-1">
                            AED {financialSummary.creditLimit.toFixed(2)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-indigo-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-teal-600 font-medium">Available Credit</p>
                          <p className="text-2xl font-bold text-teal-900 mt-1">
                            AED {financialSummary.availableCredit.toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-teal-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg border border-cyan-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-cyan-600 font-medium">Total Credits</p>
                          <p className="text-2xl font-bold text-cyan-900 mt-1">
                            AED {financialSummary.totalCredits.toFixed(2)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-cyan-600 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-600 font-medium">Total Debits</p>
                          <p className="text-2xl font-bold text-red-900 mt-1">
                            AED {financialSummary.totalDebits.toFixed(2)}
                          </p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
                      </div>
                    </div>
                  </div>

                  {/* Account Summary Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Account Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount (AED)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Opening Balance
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {(individual.openingBalance || 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Total Billed
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                              + {financialSummary.totalBilled.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Service Billings</h3>
                    <button
                      onClick={downloadBillingReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Service
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Payment Method
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {serviceBillings.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No service billings found for the selected date range
                              </td>
                            </tr>
                          ) : (
                            serviceBillings.map((billing) => (
                              <tr key={billing.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {billing.invoice_number || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {billing.service_type?.name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(billing.service_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="capitalize">{billing.cash_type}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                  AED {(billing.total_amount_with_vat || billing.total_amount || 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    billing.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    billing.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    billing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {billing.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Billing Summary */}
                  {serviceBillings.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Total Billed Amount:</span>
                        <span className="text-lg font-bold text-blue-900">
                          AED {serviceBillings.reduce((sum, b) => sum + (b.total_amount_with_vat || b.total_amount || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Credits Tab */}
              {activeTab === 'credits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Credit Transactions (Advance Payments)</h3>
                    <button
                      onClick={downloadCreditsReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Payment Method
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {advancePayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                No advance payments found for the selected date range
                              </td>
                            </tr>
                          ) : (
                            advancePayments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className="capitalize">{payment.payment_method}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.payment_reference || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                                  AED {payment.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {payment.notes || '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Debits Tab */}
              {activeTab === 'debits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Debit Transactions</h3>
                    <button
                      onClick={downloadDebitsReport}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Report</span>
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {accountTransactions.filter(t => t.transaction_type === 'debit').length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                No debit transactions found for the selected date range
                              </td>
                            </tr>
                          ) : (
                            accountTransactions
                              .filter(t => t.transaction_type === 'debit')
                              .map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(transaction.transaction_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className="capitalize">{transaction.transaction_type}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {transaction.reference_number || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                                    AED {Math.abs(transaction.amount).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {transaction.notes || '-'}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Debits Summary */}
                  {accountTransactions.filter(t => t.transaction_type === 'debit').length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-red-900">Total Debits:</span>
                        <span className="text-lg font-bold text-red-900">
                          AED {accountTransactions
                            .filter(t => t.transaction_type === 'debit')
                            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Download Options */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing data from {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadComprehensiveReport}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Comprehensive CSV</span>
              </button>
              <button
                onClick={downloadPDFStatement}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Download PDF Statement</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualFinancialModal;

