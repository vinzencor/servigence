import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  Settings,
  TrendingUp,
  Receipt,
  CreditCard,
  MoreVertical,
  Printer,
  Mail
} from 'lucide-react';

interface Invoice {
  id: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  services: {
    id: string;
    name: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: '1',
      companyId: 'comp1',
      companyName: 'ABC Trading LLC',
      invoiceNumber: 'INV-2024-001',
      date: '2024-01-15',
      dueDate: '2024-02-15',
      subtotal: 5000,
      tax: 250,
      total: 5250,
      status: 'sent',
      services: [
        {
          id: '1',
          name: 'Employment Visa Processing',
          description: 'Processing employment visa for 2 employees',
          quantity: 2,
          rate: 2500,
          amount: 5000
        }
      ]
    },
    {
      id: '2',
      companyId: 'comp2',
      companyName: 'XYZ Corporation',
      invoiceNumber: 'INV-2024-002',
      date: '2024-01-20',
      dueDate: '2024-02-20',
      subtotal: 8000,
      tax: 400,
      total: 8400,
      status: 'paid',
      services: [
        {
          id: '1',
          name: 'Trade License Renewal',
          description: 'Annual trade license renewal',
          quantity: 1,
          rate: 8000,
          amount: 8000
        }
      ]
    },
    {
      id: '3',
      companyId: 'comp3',
      companyName: 'DEF Enterprises',
      invoiceNumber: 'INV-2024-003',
      date: '2024-01-25',
      dueDate: '2024-01-30',
      subtotal: 3500,
      tax: 175,
      total: 3675,
      status: 'overdue',
      services: [
        {
          id: '1',
          name: 'Company Formation',
          description: 'New company formation services',
          quantity: 1,
          rate: 3500,
          amount: 3500
        }
      ]
    }
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showEditInvoice, setShowEditInvoice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({
    companyName: '',
    dueDate: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue'
  });

  // Create Invoice Form State
  const [createInvoiceForm, setCreateInvoiceForm] = useState({
    companyName: '',
    companyEmail: '',
    companyAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    services: [] as Array<{
      id: string;
      name: string;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>,
    subtotal: 0,
    taxRate: 5,
    tax: 0,
    total: 0,
    notes: '',
    terms: 'Payment is due within 30 days of invoice date.'
  });



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'sent': return Send;
      case 'overdue': return AlertTriangle;
      case 'draft': return FileText;
      default: return FileText;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const totalOutstanding = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);

  const stats = [
    {
      title: 'Total Invoiced',
      value: `AED ${totalInvoiced.toLocaleString()}`,
      change: '+15% from last month',
      icon: Receipt,
      color: 'blue'
    },
    {
      title: 'Total Paid',
      value: `AED ${totalPaid.toLocaleString()}`,
      change: '2 invoices this week',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Outstanding',
      value: `AED ${totalOutstanding.toLocaleString()}`,
      change: '3 pending payments',
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Overdue',
      value: `AED ${totalOverdue.toLocaleString()}`,
      change: 'Requires attention',
      icon: AlertTriangle,
      color: 'red'
    }
  ];

  // Handler functions
  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditInvoiceForm({
      companyName: invoice.companyName,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      status: invoice.status
    });
    setShowEditInvoice(true);
  };

  const handleUpdateInvoice = () => {
    if (selectedInvoice) {
      const updatedInvoices = invoices.map(invoice =>
        invoice.id === selectedInvoice.id
          ? { ...invoice, ...editInvoiceForm }
          : invoice
      );
      setInvoices(updatedInvoices);
      setShowEditInvoice(false);
      setSelectedInvoice(null);
      setEditInvoiceForm({
        companyName: '',
        dueDate: '',
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'draft'
      });
      alert('Invoice updated successfully!');
    }
  };

  const handleSendInvoice = (invoice: Invoice) => {
    // Simulate sending invoice
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id ? { ...inv, status: 'sent' as const } : inv
    );
    setInvoices(updatedInvoices);
    alert(`Invoice ${invoice.invoiceNumber} sent successfully!`);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteInvoice = () => {
    if (invoiceToDelete) {
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceToDelete.id);
      setInvoices(updatedInvoices);
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
      alert(`Invoice ${invoiceToDelete.invoiceNumber} deleted successfully!`);
    }
  };



  // Create Invoice Form Handlers
  const addServiceLine = () => {
    const newService = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setCreateInvoiceForm(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const updateServiceLine = (id: string, field: string, value: any) => {
    setCreateInvoiceForm(prev => ({
      ...prev,
      services: prev.services.map(service => {
        if (service.id === id) {
          const updatedService = { ...service, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedService.amount = updatedService.quantity * updatedService.rate;
          }
          return updatedService;
        }
        return service;
      })
    }));
  };

  const removeServiceLine = (id: string) => {
    setCreateInvoiceForm(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== id)
    }));
  };

  const calculateInvoiceTotals = () => {
    const subtotal = createInvoiceForm.services.reduce((sum, service) => sum + service.amount, 0);
    const tax = subtotal * (createInvoiceForm.taxRate / 100);
    const total = subtotal + tax;

    setCreateInvoiceForm(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  };

  // Recalculate totals when services change
  React.useEffect(() => {
    calculateInvoiceTotals();
  }, [createInvoiceForm.services, createInvoiceForm.taxRate]);

  const handleCreateInvoice = () => {
    try {
      // Validate required fields
      if (!createInvoiceForm.companyName.trim()) {
        alert('Please enter company name');
        return;
      }
      if (!createInvoiceForm.dueDate) {
        alert('Please select due date');
        return;
      }
      if (createInvoiceForm.services.length === 0) {
        alert('Please add at least one service');
        return;
      }

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;

      // Create new invoice
      const newInvoice: Invoice = {
        id: Date.now().toString(),
        companyId: 'temp-' + Date.now(),
        companyName: createInvoiceForm.companyName,
        invoiceNumber,
        date: createInvoiceForm.invoiceDate,
        dueDate: createInvoiceForm.dueDate,
        subtotal: createInvoiceForm.subtotal,
        tax: createInvoiceForm.tax,
        total: createInvoiceForm.total,
        status: 'draft',
        services: createInvoiceForm.services
      };

      // Add to invoices list
      setInvoices(prev => [newInvoice, ...prev]);

      // Reset form
      setCreateInvoiceForm({
        companyName: '',
        companyEmail: '',
        companyAddress: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        services: [],
        subtotal: 0,
        taxRate: 5,
        tax: 0,
        total: 0,
        notes: '',
        terms: 'Payment is due within 30 days of invoice date.'
      });

      setShowCreateInvoice(false);
      alert(`Invoice ${invoiceNumber} created successfully!`);

    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    }
  };



  // Report handlers
  const handleExportReport = () => {
    // Generate CSV data
    const csvData = [
      ['Invoice Number', 'Company', 'Date', 'Due Date', 'Amount', 'Status'],
      ...invoices.map(inv => [
        inv.invoiceNumber,
        inv.companyName,
        inv.date,
        inv.dueDate,
        inv.total.toString(),
        inv.status
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm mt-2 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'yellow' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h3>
        <div className="space-y-4">
          {invoices.slice(0, 5).map((invoice) => {
            const StatusIcon = getStatusIcon(invoice.status);
            return (
              <div key={invoice.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                   onClick={() => setSelectedInvoice(invoice)}>
                <div className="p-2 bg-white rounded-lg border">
                  <StatusIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">{invoice.companyName} • {invoice.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">AED {invoice.total.toLocaleString()}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Status Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
          <div className="space-y-4">
            {[
              { status: 'paid', count: invoices.filter(i => i.status === 'paid').length, color: 'green' },
              { status: 'sent', count: invoices.filter(i => i.status === 'sent').length, color: 'blue' },
              { status: 'overdue', count: invoices.filter(i => i.status === 'overdue').length, color: 'red' },
              { status: 'draft', count: invoices.filter(i => i.status === 'draft').length, color: 'gray' }
            ].map((item) => {
              const percentage = (item.count / invoices.length) * 100;
              return (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-gray-600 capitalize">{item.status}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.color === 'green' ? 'bg-green-500' :
                          item.color === 'blue' ? 'bg-blue-500' :
                          item.color === 'red' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">January 2024</span>
              <span className="font-semibold text-gray-900">AED {totalInvoiced.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Target: AED 20,000</span>
              <span>85% achieved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'reports', label: 'Reports', icon: DollarSign }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
            <p className="text-gray-600 mt-1">Professional invoice generation and payment tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateInvoice(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'invoices' && renderInvoicesList()}
      {activeTab === 'reports' && renderReports()}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                  <p className="text-gray-600">{selectedInvoice.companyName}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Invoice Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900">{selectedInvoice.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="text-gray-900">{selectedInvoice.dueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Amount Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">AED {selectedInvoice.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (5%):</span>
                      <span className="text-gray-900">AED {selectedInvoice.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">AED {selectedInvoice.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Services</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Service</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Rate</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.services.map((service) => (
                        <tr key={service.id} className="border-t border-gray-200">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-600">{service.description}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-900">{service.quantity}</td>
                          <td className="px-4 py-3 text-gray-900">AED {service.rate.toLocaleString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">AED {service.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => alert('PDF download functionality will be implemented soon!')}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => handleSendInvoice(selectedInvoice)}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    handleEditInvoice(selectedInvoice);
                  }}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
                <button
                  onClick={() => setShowCreateInvoice(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(); }} className="space-y-6">
                {/* Client Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createInvoiceForm.companyName}
                        onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, companyName: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={createInvoiceForm.companyEmail}
                        onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, companyEmail: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      value={createInvoiceForm.companyAddress}
                      onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, companyAddress: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter company address"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        value={createInvoiceForm.invoiceDate}
                        onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, invoiceDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={createInvoiceForm.dueDate}
                        onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Services Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Services</h3>
                    <button
                      type="button"
                      onClick={addServiceLine}
                      className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Service</span>
                    </button>
                  </div>

                  {createInvoiceForm.services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No services added yet. Click "Add Service" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {createInvoiceForm.services.map((service, index) => (
                        <div key={service.id} className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Service Name
                              </label>
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => updateServiceLine(service.id, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Service name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={service.quantity}
                                onChange={(e) => updateServiceLine(service.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rate (AED)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={service.rate}
                                onChange={(e) => updateServiceLine(service.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Amount
                                </label>
                                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                                  AED {service.amount.toFixed(2)}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeServiceLine(service.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove service"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={service.description}
                              onChange={(e) => updateServiceLine(service.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Service description"
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoice Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">AED {createInvoiceForm.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tax ({createInvoiceForm.taxRate}%):</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={createInvoiceForm.taxRate}
                          onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span>%</span>
                        <span className="font-medium">AED {createInvoiceForm.tax.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-red-600">AED {createInvoiceForm.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes and Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={createInvoiceForm.notes}
                      onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={createInvoiceForm.terms}
                      onChange={(e) => setCreateInvoiceForm(prev => ({ ...prev, terms: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Terms and conditions"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateInvoice(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!createInvoiceForm.companyName.trim() || !createInvoiceForm.dueDate || createInvoiceForm.services.length === 0}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditInvoice && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Invoice</h2>
                <button
                  onClick={() => setShowEditInvoice(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editInvoiceForm.companyName}
                      onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={editInvoiceForm.dueDate}
                      onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subtotal (AED)
                    </label>
                    <input
                      type="number"
                      value={editInvoiceForm.subtotal}
                      onChange={(e) => {
                        const subtotal = Number(e.target.value);
                        const tax = subtotal * 0.05; // 5% tax
                        const total = subtotal + tax;
                        setEditInvoiceForm(prev => ({ ...prev, subtotal, tax, total }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax (AED)
                    </label>
                    <input
                      type="number"
                      value={editInvoiceForm.tax}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total (AED)
                    </label>
                    <input
                      type="number"
                      value={editInvoiceForm.total}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editInvoiceForm.status}
                      onChange={(e) => setEditInvoiceForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditInvoice(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800"
              >
                Update Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && invoiceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Invoice
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete invoice <strong>{invoiceToDelete.invoiceNumber}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setInvoiceToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteInvoice}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}






    </div>
  );

  function renderInvoicesList() {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => {
                  const StatusIcon = getStatusIcon(invoice.status);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <StatusIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-500">{invoice.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {invoice.companyName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <span className="text-sm text-gray-900">{invoice.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">AED {invoice.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Subtotal: AED {invoice.subtotal.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{invoice.dueDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditInvoice(invoice)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendInvoice(invoice)}
                            className="p-1 text-gray-400 hover:text-purple-600"
                            title="Send Invoice"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }



  function renderReports() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Reports</h3>
            <button
              onClick={handleExportReport}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Revenue Analysis</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">Total Invoiced</span>
                  <span className="font-semibold text-blue-600">AED {totalInvoiced.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Total Collected</span>
                  <span className="font-semibold text-green-600">AED {totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-yellow-700">Outstanding</span>
                  <span className="font-semibold text-yellow-600">AED {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Overdue</span>
                  <span className="font-semibold text-red-600">AED {totalOverdue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Collection Rate</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Collection Rate</span>
                  <span className="font-semibold text-gray-900">
                    {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-medium text-gray-900">{invoices.filter(i => i.status === 'paid').length}</p>
                    <p className="text-gray-600">Paid Invoices</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="font-medium text-gray-900">{invoices.filter(i => i.status !== 'paid').length}</p>
                    <p className="text-gray-600">Pending Invoices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default InvoiceManagement;
