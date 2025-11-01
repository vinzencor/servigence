import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Eye,
  Receipt,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import { Company } from '../types';
import { dbHelpers } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface CompanyFinancialModalProps {
  company: Company;
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceBilling {
  id: string;
  invoice_number: string;
  service_date: string;
  service_type: { name: string };
  typing_charges: number;
  government_charges: number;
  vat_amount: number;
  total_amount_with_vat: number;
  status: string;
  cash_type: string;
  created_at: string;
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
}

const CompanyFinancialModal: React.FC<CompanyFinancialModalProps> = ({
  company,
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
    creditLimit: company.creditLimit || 0,
    availableCredit: 0,
    overdueAmount: 0
  });

  useEffect(() => {
    if (isOpen && company.id) {
      loadFinancialData();
    }
  }, [isOpen, company.id, dateRange]);

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
      const data = await dbHelpers.getCompanyServiceBillings(
        company.id,
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

  const loadAdvancePayments = async () => {
    try {
      // Get advance payments from localStorage (temporary storage)
      const storedPayments = localStorage.getItem('advancePayments');
      const allPayments = storedPayments ? JSON.parse(storedPayments) : [];
      
      // Filter payments for this company
      const companyPayments = allPayments.filter((payment: any) => 
        payment.companyId === company.id &&
        payment.payment_date >= dateRange.startDate &&
        payment.payment_date <= dateRange.endDate
      );
      
      setAdvancePayments(companyPayments);
    } catch (error) {
      console.error('Error loading advance payments:', error);
      setAdvancePayments([]);
    }
  };

  const loadAccountTransactions = async () => {
    try {
      const data = await dbHelpers.getCompanyAccountTransactions(
        company.id,
        dateRange.startDate,
        dateRange.endDate
      );
      setAccountTransactions(data || []);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      setAccountTransactions([]);
      // Don't show error toast for account transactions as they might not exist yet
    }
  };

  const loadFinancialSummary = async () => {
    try {
      // Calculate summary from loaded data
      const totalBilled = serviceBillings.reduce((sum, billing) => 
        sum + (parseFloat(billing.total_amount_with_vat?.toString() || '0')), 0);
      
      const totalPaid = advancePayments.reduce((sum, payment) => 
        sum + (parseFloat(payment.amount?.toString() || '0')), 0);
      
      const totalCredits = accountTransactions
        .filter(t => t.transaction_type === 'credit' || t.amount > 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount?.toString() || '0')), 0);
      
      const totalDebits = accountTransactions
        .filter(t => t.transaction_type === 'debit' || t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount?.toString() || '0')), 0);

      const totalOutstanding = totalBilled - totalPaid;
      const availableCredit = Math.max(0, (company.creditLimit || 0) - totalOutstanding);
      
      // Calculate overdue amount (bills older than credit limit days)
      const creditLimitDays = company.creditLimitDays || 30;
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - creditLimitDays);
      
      const overdueAmount = serviceBillings
        .filter(billing => 
          new Date(billing.service_date) < overdueDate && 
          billing.status !== 'paid'
        )
        .reduce((sum, billing) => 
          sum + (parseFloat(billing.total_amount_with_vat?.toString() || '0')), 0);

      setFinancialSummary({
        totalBilled,
        totalPaid,
        totalOutstanding,
        totalCredits,
        totalDebits,
        creditLimit: company.creditLimit || 0,
        availableCredit,
        overdueAmount
      });
    } catch (error) {
      console.error('Error calculating financial summary:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'overdue':
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'confirmed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'overdue':
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Download functions
  const downloadBillingReport = () => {
    const csvContent = generateBillingCSV();
    downloadCSV(csvContent, `${company.companyName}_Billing_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
  };

  const downloadCreditsReport = () => {
    const csvContent = generateCreditsCSV();
    downloadCSV(csvContent, `${company.companyName}_Credits_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
  };

  const downloadDebitsReport = () => {
    const csvContent = generateDebitsCSV();
    downloadCSV(csvContent, `${company.companyName}_Debits_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
  };

  const downloadComprehensiveReport = () => {
    const csvContent = generateComprehensiveCSV();
    downloadCSV(csvContent, `${company.companyName}_Complete_Financial_Statement_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
  };

  const downloadPDFStatement = () => {
    generatePDFStatement();
  };

  const generateBillingCSV = () => {
    const headers = [
      'Invoice Number',
      'Service Type',
      'Service Date',
      'Service Charges (AED)',
      'Government Charges (AED)',
      'VAT Amount (AED)',
      'Total Amount (AED)',
      'Status',
      'Payment Method',
      'Created Date'
    ];

    const rows = serviceBillings.map(billing => [
      billing.invoice_number || 'N/A',
      billing.service_type?.name || 'N/A',
      new Date(billing.service_date).toLocaleDateString(),
      parseFloat(billing.typing_charges?.toString() || '0').toFixed(2),
      parseFloat(billing.government_charges?.toString() || '0').toFixed(2),
      parseFloat(billing.vat_amount?.toString() || '0').toFixed(2),
      parseFloat(billing.total_amount_with_vat?.toString() || '0').toFixed(2),
      billing.status,
      billing.cash_type,
      new Date(billing.created_at).toLocaleDateString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateCreditsCSV = () => {
    const headers = [
      'Payment Date',
      'Amount (AED)',
      'Payment Method',
      'Reference Number',
      'Receipt Number',
      'Status',
      'Notes'
    ];

    const rows = advancePayments.map(payment => [
      new Date(payment.payment_date).toLocaleDateString(),
      parseFloat(payment.amount?.toString() || '0').toFixed(2),
      payment.payment_method,
      payment.payment_reference || 'N/A',
      payment.receipt_number || 'N/A',
      payment.status,
      payment.notes || 'N/A'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateDebitsCSV = () => {
    const debitTransactions = accountTransactions.filter(t =>
      t.transaction_type === 'debit' || parseFloat(t.amount?.toString() || '0') < 0
    );

    const headers = [
      'Transaction Date',
      'Description',
      'Category',
      'Amount (AED)',
      'Payment Method',
      'Reference Number',
      'Status'
    ];

    const rows = debitTransactions.map(transaction => [
      new Date(transaction.transaction_date).toLocaleDateString(),
      transaction.description,
      transaction.category,
      Math.abs(parseFloat(transaction.amount?.toString() || '0')).toFixed(2),
      transaction.payment_method,
      transaction.reference_number || 'N/A',
      transaction.status
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateComprehensiveCSV = () => {
    let csvContent = `Company Financial Statement\n`;
    csvContent += `Company: ${company.companyName}\n`;
    csvContent += `Period: ${new Date(dateRange.startDate).toLocaleDateString()} to ${new Date(dateRange.endDate).toLocaleDateString()}\n`;
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    // Financial Summary
    csvContent += `FINANCIAL SUMMARY\n`;
    csvContent += `Total Billed,AED ${financialSummary.totalBilled.toFixed(2)}\n`;
    csvContent += `Total Paid,AED ${financialSummary.totalPaid.toFixed(2)}\n`;
    csvContent += `Total Outstanding,AED ${financialSummary.totalOutstanding.toFixed(2)}\n`;
    csvContent += `Overdue Amount,AED ${financialSummary.overdueAmount.toFixed(2)}\n`;
    csvContent += `Credit Limit,AED ${financialSummary.creditLimit.toFixed(2)}\n`;
    csvContent += `Available Credit,AED ${financialSummary.availableCredit.toFixed(2)}\n\n`;

    // Service Billings
    csvContent += `SERVICE BILLINGS\n`;
    csvContent += generateBillingCSV() + '\n\n';

    // Credit Transactions
    csvContent += `CREDIT TRANSACTIONS\n`;
    csvContent += generateCreditsCSV() + '\n\n';

    // Debit Transactions
    csvContent += `DEBIT TRANSACTIONS\n`;
    csvContent += generateDebitsCSV() + '\n';

    return csvContent;
  };

  const generatePDFStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Statement - ${company.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
          .statement-title { font-size: 18px; margin-top: 10px; }
          .period { font-size: 14px; color: #666; margin-top: 5px; }
          .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .summary-title { font-weight: bold; color: #374151; margin-bottom: 5px; }
          .summary-amount { font-size: 18px; font-weight: bold; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          .neutral { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .section-title { font-size: 16px; font-weight: bold; margin: 30px 0 15px 0; color: #374151; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${company.companyName}</div>
          <div class="statement-title">Financial Statement & Account Details</div>
          <div class="period">Period: ${new Date(dateRange.startDate).toLocaleDateString()} to ${new Date(dateRange.endDate).toLocaleDateString()}</div>
          <div class="period">Generated: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-title">Total Billed</div>
            <div class="summary-amount neutral">AED ${financialSummary.totalBilled.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Total Paid</div>
            <div class="summary-amount positive">AED ${financialSummary.totalPaid.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Outstanding Balance</div>
            <div class="summary-amount ${financialSummary.totalOutstanding > 0 ? 'negative' : 'positive'}">AED ${financialSummary.totalOutstanding.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Available Credit</div>
            <div class="summary-amount positive">AED ${financialSummary.availableCredit.toLocaleString()}</div>
          </div>
        </div>

        <div class="section-title">Service Billings</div>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Service</th>
              <th>Date</th>
              <th>Service Charges</th>
              <th>Govt Charges</th>
              <th>VAT</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${serviceBillings.map(billing => `
              <tr>
                <td>${billing.invoice_number || 'N/A'}</td>
                <td>${billing.service_type?.name || 'N/A'}</td>
                <td>${new Date(billing.service_date).toLocaleDateString()}</td>
                <td>AED ${parseFloat(billing.typing_charges?.toString() || '0').toFixed(2)}</td>
                <td>AED ${parseFloat(billing.government_charges?.toString() || '0').toFixed(2)}</td>
                <td>AED ${parseFloat(billing.vat_amount?.toString() || '0').toFixed(2)}</td>
                <td>AED ${parseFloat(billing.total_amount_with_vat?.toString() || '0').toFixed(2)}</td>
                <td>${billing.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Credit Transactions (Payments Received)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${advancePayments.map(payment => `
              <tr>
                <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                <td class="positive">AED ${parseFloat(payment.amount?.toString() || '0').toFixed(2)}</td>
                <td>${payment.payment_method}</td>
                <td>${payment.payment_reference || 'N/A'}</td>
                <td>${payment.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>This statement was generated automatically by Servigence Management System</p>
          <p>For any queries, please contact our accounts department</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    // Auto-print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded successfully!');
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
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{company.companyName}</h2>
                <p className="text-blue-100">Financial Statement & Account Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full max-h-[calc(90vh-120px)]">
          {/* Date Range Filter */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'summary', label: 'Financial Summary', icon: TrendingUp },
                { key: 'billing', label: 'Service Billings', icon: FileText },
                { key: 'credits', label: 'Credit Transactions', icon: TrendingUp },
                { key: 'debits', label: 'Debit Transactions', icon: TrendingDown }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Total Billed</p>
                            <p className="text-2xl font-bold text-blue-900">
                              AED {financialSummary.totalBilled.toLocaleString()}
                            </p>
                          </div>
                          <FileText className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Total Paid</p>
                            <p className="text-2xl font-bold text-green-900">
                              AED {financialSummary.totalPaid.toLocaleString()}
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-600">Outstanding</p>
                            <p className="text-2xl font-bold text-yellow-900">
                              AED {financialSummary.totalOutstanding.toLocaleString()}
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-600">Overdue</p>
                            <p className="text-2xl font-bold text-red-900">
                              AED {financialSummary.overdueAmount.toLocaleString()}
                            </p>
                          </div>
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                      </div>
                    </div>

                    {/* Credit Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm text-gray-600">Credit Limit</p>
                          <p className="text-xl font-bold text-gray-900">
                            AED {financialSummary.creditLimit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Available Credit</p>
                          <p className="text-xl font-bold text-green-600">
                            AED {financialSummary.availableCredit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Credit Terms</p>
                          <p className="text-xl font-bold text-gray-900">
                            {company.creditLimitDays || 30} days
                          </p>
                        </div>
                      </div>
                      
                      {/* Credit Usage Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Credit Usage</span>
                          <span>
                            {((financialSummary.totalOutstanding / financialSummary.creditLimit) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (financialSummary.totalOutstanding / financialSummary.creditLimit) > 0.8
                                ? 'bg-red-500'
                                : (financialSummary.totalOutstanding / financialSummary.creditLimit) > 0.6
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (financialSummary.totalOutstanding / financialSummary.creditLimit) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Service Billings</h3>
                      <button
                        onClick={() => downloadBillingReport()}
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
                                Invoice
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service Charges
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Govt Charges
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                VAT
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {serviceBillings
                              .filter(billing =>
                                statusFilter === 'all' || billing.status === statusFilter
                              )
                              .filter(billing =>
                                searchTerm === '' ||
                                billing.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                billing.service_type?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((billing) => (
                              <tr key={billing.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Receipt className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {billing.invoice_number || 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {billing.service_type?.name || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {new Date(billing.service_date).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-medium text-gray-900">
                                    AED {parseFloat(billing.typing_charges?.toString() || '0').toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    AED {parseFloat(billing.government_charges?.toString() || '0').toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    AED {parseFloat(billing.vat_amount?.toString() || '0').toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-bold text-gray-900">
                                    AED {parseFloat(billing.total_amount_with_vat?.toString() || '0').toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {getStatusIcon(billing.status)}
                                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(billing.status)}`}>
                                      {billing.status}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900 capitalize">
                                      {billing.cash_type}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {serviceBillings.length === 0 && (
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No service billings found for the selected period</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'credits' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Credit Transactions</h3>
                      <button
                        onClick={() => downloadCreditsReport()}
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
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Method
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reference
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Receipt
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {advancePayments
                              .filter(payment =>
                                statusFilter === 'all' || payment.status === statusFilter
                              )
                              .filter(payment =>
                                searchTerm === '' ||
                                payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                payment.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-bold text-green-600">
                                    +AED {parseFloat(payment.amount?.toString() || '0').toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900 capitalize">
                                      {payment.payment_method}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {payment.payment_reference || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {payment.receipt_number || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {getStatusIcon(payment.status)}
                                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                                      {payment.status}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-900">
                                    {payment.notes || 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {advancePayments.length === 0 && (
                        <div className="text-center py-12">
                          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No credit transactions found for the selected period</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'debits' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Debit Transactions</h3>
                      <button
                        onClick={() => downloadDebitsReport()}
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
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
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
                            {accountTransactions
                              .filter(transaction =>
                                transaction.transaction_type === 'debit' ||
                                parseFloat(transaction.amount?.toString() || '0') < 0
                              )
                              .filter(transaction =>
                                statusFilter === 'all' || transaction.status === statusFilter
                              )
                              .filter(transaction =>
                                searchTerm === '' ||
                                transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {new Date(transaction.transaction_date).toLocaleDateString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-900">
                                    {transaction.description}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {transaction.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-bold text-red-600">
                                    -AED {Math.abs(parseFloat(transaction.amount?.toString() || '0')).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900 capitalize">
                                      {transaction.payment_method}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900">
                                    {transaction.reference_number || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {getStatusIcon(transaction.status)}
                                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                                      {transaction.status}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {accountTransactions.filter(t => t.transaction_type === 'debit' || parseFloat(t.amount?.toString() || '0') < 0).length === 0 && (
                        <div className="text-center py-12">
                          <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No debit transactions found for the selected period</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with Download Options */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing data from {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => downloadComprehensiveReport()}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Complete Statement</span>
                </button>
                <button
                  onClick={() => downloadPDFStatement()}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>PDF Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyFinancialModal;
