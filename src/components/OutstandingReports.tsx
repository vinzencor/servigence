import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  FileText, 
  Calendar,
  Download,
  Filter,
  Search,
  TrendingDown,
  Users,
  CreditCard,
  CheckCircle,
  X
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface OutstandingItem {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientType: 'company' | 'individual';
  serviceName: string;
  serviceDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  daysPastDue: number;
  category: 'current' | 'over_30' | 'over_60' | 'over_90';
  isOverdue: boolean;
  status: string;
  assignedEmployee?: string;
  creditLimit: number;
}

interface OutstandingReportsData {
  items: OutstandingItem[];
  summary: {
    totalOutstanding: number;
    overdueAmount: number;
    currentAmount: number;
    totalInvoices: number;
    overdueInvoices: number;
  };
  agingReport: {
    current: OutstandingItem[];
    over_30: OutstandingItem[];
    over_60: OutstandingItem[];
    over_90: OutstandingItem[];
  };
  clientSummary: any[];
}

const OutstandingReports: React.FC = () => {
  const [reportsData, setReportsData] = useState<OutstandingReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'aging' | 'clients'>('overview');

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<OutstandingItem | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [filterType]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await dbHelpers.getOutstandingReports(filterType);
      setReportsData(data);
    } catch (error) {
      console.error('Error loading outstanding reports:', error);
      toast.error('Failed to load outstanding reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = reportsData?.items.filter(item =>
    item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const generateReport = () => {
    if (!reportsData) return;

    const reportContent = `
OUTSTANDING AMOUNTS REPORT
Generated: ${new Date().toLocaleString()}
Filter: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)}

=== SUMMARY ===
Total Outstanding: AED ${reportsData.summary.totalOutstanding.toLocaleString()}
Overdue Amount: AED ${reportsData.summary.overdueAmount.toLocaleString()}
Current Amount: AED ${reportsData.summary.currentAmount.toLocaleString()}
Total Invoices: ${reportsData.summary.totalInvoices}
Overdue Invoices: ${reportsData.summary.overdueInvoices}

=== AGING ANALYSIS ===
Current (0-30 days): AED ${reportsData.agingReport.current.reduce((sum, item) => sum + item.outstandingAmount, 0).toLocaleString()}
Over 30 days: AED ${reportsData.agingReport.over_30.reduce((sum, item) => sum + item.outstandingAmount, 0).toLocaleString()}
Over 60 days: AED ${reportsData.agingReport.over_60.reduce((sum, item) => sum + item.outstandingAmount, 0).toLocaleString()}
Over 90 days: AED ${reportsData.agingReport.over_90.reduce((sum, item) => sum + item.outstandingAmount, 0).toLocaleString()}

=== DETAILED BREAKDOWN ===
${reportsData.items.map(item => `
Invoice: ${item.invoiceNumber}
Client: ${item.clientName} (${item.clientType})
Service: ${item.serviceName}
Date: ${item.serviceDate}
Total: AED ${item.totalAmount.toLocaleString()}
Paid: AED ${item.paidAmount.toLocaleString()}
Outstanding: AED ${item.outstandingAmount.toLocaleString()}
Days Past Due: ${item.daysPastDue}
Status: ${item.status}
`).join('\n')}

Report End
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outstanding-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Outstanding report downloaded');
  };

  const handlePayNow = (item: OutstandingItem) => {
    setSelectedItemForPayment(item);
    setPaymentForm({
      amount: item.outstandingAmount.toString(),
      paymentMethod: 'cash',
      paymentReference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!selectedItemForPayment) return;

    try {
      const paymentAmount = parseFloat(paymentForm.amount);
      if (paymentAmount <= 0) {
        toast.error('Payment amount must be greater than zero');
        return;
      }
      if (paymentAmount > selectedItemForPayment.outstandingAmount) {
        toast.error(`Payment amount cannot exceed outstanding balance of AED ${selectedItemForPayment.outstandingAmount.toLocaleString()}`);
        return;
      }

      // Record the payment
      const result = await dbHelpers.recordAdvancePayment(
        selectedItemForPayment.id,
        paymentAmount,
        paymentForm.paymentMethod,
        paymentForm.notes
      );

      if (result) {
        // Calculate new outstanding amount
        const newOutstandingAmount = Math.max(0, selectedItemForPayment.outstandingAmount - paymentAmount);
        const isFullyPaid = newOutstandingAmount === 0;

        // Generate receipt
        const receiptData = {
          receiptNumber: `RCP-${Date.now()}`,
          amount: paymentAmount,
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: new Date().toLocaleDateString(),
          billing: {
            invoiceNumber: selectedItemForPayment.invoiceNumber,
            totalAmount: selectedItemForPayment.totalAmount,
            paidAmount: selectedItemForPayment.paidAmount + paymentAmount,
            outstandingAmount: newOutstandingAmount,
            clientName: selectedItemForPayment.clientName
          }
        };

        setReceiptData(receiptData);
        setShowPaymentModal(false);
        setShowReceiptModal(true);

        // Show success message with payment details
        if (isFullyPaid) {
          toast.success(`Payment recorded! Invoice ${selectedItemForPayment.invoiceNumber} is now fully paid.`);
        } else {
          toast.success(`Payment of AED ${paymentAmount.toLocaleString()} recorded! Remaining balance: AED ${newOutstandingAmount.toLocaleString()}`);
        }

        // Show info about temporary tracking
        toast('Payment tracked temporarily until database migration is complete.', {
          duration: 4000,
          icon: 'ℹ️'
        });

        // Refresh the reports to show updated amounts
        await loadReports();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const generateReceipt = () => {
    if (!receiptData) return;

    const receiptContent = `
PAYMENT RECEIPT
===============

Receipt #: ${receiptData.receiptNumber}
Date: ${receiptData.paymentDate}

Invoice: ${receiptData.billing.invoiceNumber}
Client: ${receiptData.billing.clientName}

Payment Details:
Amount Paid: AED ${receiptData.amount.toLocaleString()}
Payment Method: ${receiptData.paymentMethod}

Invoice Summary:
Total Amount: AED ${receiptData.billing.totalAmount.toLocaleString()}
Total Paid: AED ${receiptData.billing.paidAmount.toLocaleString()}
Outstanding: AED ${(receiptData.billing.totalAmount - receiptData.billing.paidAmount).toLocaleString()}

Thank you for your payment!
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptData.receiptNumber}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Receipt downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Outstanding',
      value: `AED ${(reportsData?.summary.totalOutstanding || 0).toLocaleString()}`,
      change: `${reportsData?.summary.totalInvoices || 0} invoices`,
      icon: DollarSign,
      color: 'red'
    },
    {
      title: 'Overdue Amount',
      value: `AED ${(reportsData?.summary.overdueAmount || 0).toLocaleString()}`,
      change: `${reportsData?.summary.overdueInvoices || 0} overdue`,
      icon: AlertTriangle,
      color: 'orange'
    },
    {
      title: 'Current Amount',
      value: `AED ${(reportsData?.summary.currentAmount || 0).toLocaleString()}`,
      change: `${(reportsData?.summary.totalInvoices || 0) - (reportsData?.summary.overdueInvoices || 0)} current`,
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Collection Rate',
      value: `${reportsData?.summary.totalOutstanding ? (100 - (reportsData.summary.overdueAmount / reportsData.summary.totalOutstanding * 100)).toFixed(1) : 0}%`,
      change: 'Current period',
      icon: TrendingDown,
      color: 'green'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outstanding Reports</h1>
          <p className="text-gray-600">Track unpaid invoices and overdue amounts</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Outstanding</option>
              <option value="overdue">Overdue Only</option>
              <option value="pending">Current Only</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by client, invoice, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Outstanding Items', icon: FileText },
              { id: 'aging', label: 'Aging Analysis', icon: Calendar },
              { id: 'clients', label: 'Client Summary', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item.id} className={`border rounded-lg p-4 ${item.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${item.isOverdue ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600">{item.clientName} • {item.serviceName}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <p className="text-lg font-bold text-red-600">AED {item.outstandingAmount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Outstanding</p>
                        {item.isOverdue && (
                          <p className="text-sm text-red-600">{item.daysPastDue} days overdue</p>
                        )}
                      </div>
                      <button
                        onClick={() => handlePayNow(item)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Now</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Service Date</p>
                      <p className="font-medium">{new Date(item.serviceDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-medium">AED {item.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Paid Amount</p>
                      <p className="font-medium text-green-600">AED {item.paidAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Outstanding Balance</p>
                      <p className="font-bold text-red-600">AED {item.outstandingAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'aging' && (
            <div className="space-y-6">
              {Object.entries(reportsData?.agingReport || {}).map(([category, items]) => {
                const categoryLabels = {
                  current: 'Current (0-30 days)',
                  over_30: 'Over 30 days',
                  over_60: 'Over 60 days',
                  over_90: 'Over 90 days'
                };
                
                const totalAmount = items.reduce((sum: number, item: OutstandingItem) => sum + item.outstandingAmount, 0);
                
                return (
                  <div key={category} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h3>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">AED {totalAmount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{items.length} invoices</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {items.slice(0, 5).map((item: OutstandingItem) => (
                        <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{item.invoiceNumber}</p>
                                <p className="text-sm text-gray-600">{item.clientName} • {item.serviceName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-600">AED {item.outstandingAmount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">
                                  Total: AED {item.totalAmount.toLocaleString()} | Paid: AED {item.paidAmount.toLocaleString()}
                                </p>
                                {item.isOverdue && (
                                  <p className="text-xs text-red-600">{item.daysPastDue} days overdue</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {items.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          +{items.length - 5} more items
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-4">
              {reportsData?.clientSummary.map((client: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.clientName}</h3>
                      <p className="text-gray-600 capitalize">{client.clientType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">AED {client.totalOutstanding.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{client.invoiceCount} outstanding invoices</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Credit Limit</p>
                      <p className="text-lg font-semibold text-gray-900">AED {client.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Credit Utilization</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {client.creditLimit > 0 ? ((client.totalOutstanding / client.creditLimit) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Oldest Invoice</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(client.oldestInvoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedItemForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Invoice: {selectedItemForPayment.invoiceNumber}</p>
              <p className="text-sm text-gray-600">Client: {selectedItemForPayment.clientName}</p>
              <p className="text-sm text-gray-600">Service: {selectedItemForPayment.serviceName}</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Total</p>
                    <p className="font-semibold">AED {selectedItemForPayment.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Paid</p>
                    <p className="font-semibold text-green-600">AED {selectedItemForPayment.paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Due</p>
                    <p className="font-bold text-red-600">AED {selectedItemForPayment.outstandingAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                  <span className="text-sm text-gray-500 ml-2">
                    (Max: AED {selectedItemForPayment.outstandingAmount.toLocaleString()})
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedItemForPayment.outstandingAmount}
                  value={paymentForm.amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    if (value <= selectedItemForPayment.outstandingAmount) {
                      setPaymentForm(prev => ({ ...prev, amount: e.target.value }));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter payment amount"
                />
                {parseFloat(paymentForm.amount) > selectedItemForPayment.outstandingAmount && (
                  <p className="text-red-500 text-sm mt-1">Payment amount cannot exceed outstanding balance</p>
                )}
                {parseFloat(paymentForm.amount) > 0 && parseFloat(paymentForm.amount) <= selectedItemForPayment.outstandingAmount && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      After payment: AED {(selectedItemForPayment.outstandingAmount - parseFloat(paymentForm.amount)).toLocaleString()} remaining
                      {(selectedItemForPayment.outstandingAmount - parseFloat(paymentForm.amount)) === 0 && (
                        <span className="text-green-600 font-medium"> (Fully Paid)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                <input
                  type="text"
                  value={paymentForm.paymentReference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Reference number (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Additional notes (optional)"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <h4 className="text-lg font-semibold text-green-900">Payment Recorded Successfully!</h4>
                <p className="text-green-700">Receipt #{receiptData.receiptNumber}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold">AED {receiptData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold capitalize">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{receiptData.paymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-semibold">{receiptData.billing.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className="font-semibold">AED {(receiptData.billing.totalAmount - receiptData.billing.paidAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={generateReceipt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingReports;
