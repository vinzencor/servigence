import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  CreditCard,
  Receipt,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Download,
  Settings,
  Building,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical
} from 'lucide-react';

interface Account {
  id: string;
  companyId: string;
  type: 'service_charge' | 'government_fee' | 'expense' | 'refund';
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card';
  reference?: string;
  invoiceId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  gstAmount?: number;
  gstRate?: number;
  profitMargin?: number;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
}

const AccountManagement: React.FC = () => {
  const [accounts] = useState<Account[]>([
    {
      id: '1',
      companyId: 'comp1',
      type: 'service_charge',
      category: 'Visa Processing',
      description: 'Employment visa processing fee',
      amount: 2500,
      date: '2024-01-15',
      paymentMethod: 'bank_transfer',
      reference: 'TXN001',
      status: 'completed',
      gstAmount: 125,
      gstRate: 5,
      profitMargin: 800,
      createdBy: 'Admin',
      approvedBy: 'Manager'
    },
    {
      id: '2',
      companyId: 'comp2',
      type: 'government_fee',
      category: 'License Renewal',
      description: 'Trade license renewal government fee',
      amount: 5000,
      date: '2024-01-20',
      paymentMethod: 'cheque',
      reference: 'CHQ002',
      status: 'completed',
      gstAmount: 0,
      gstRate: 0,
      createdBy: 'Admin'
    },
    {
      id: '3',
      companyId: 'comp1',
      type: 'expense',
      category: 'Office Supplies',
      description: 'Monthly office supplies and stationery',
      amount: 450,
      date: '2024-01-25',
      paymentMethod: 'cash',
      status: 'pending',
      gstAmount: 22.5,
      gstRate: 5,
      createdBy: 'Staff'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'gst' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'service_charge': return 'bg-green-100 text-green-800 border-green-200';
      case 'government_fee': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expense': return 'bg-red-100 text-red-800 border-red-200';
      case 'refund': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return DollarSign;
      case 'bank_transfer': return Building;
      case 'cheque': return FileText;
      case 'card': return CreditCard;
      default: return DollarSign;
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (account.reference && account.reference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'all' || account.type === filterType;
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate totals
  const totalRevenue = accounts.filter(a => a.type === 'service_charge' && a.status === 'completed')
                              .reduce((sum, a) => sum + a.amount, 0);
  const totalExpenses = accounts.filter(a => a.type === 'expense' && a.status === 'completed')
                               .reduce((sum, a) => sum + a.amount, 0);
  const totalGST = accounts.filter(a => a.status === 'completed')
                          .reduce((sum, a) => sum + (a.gstAmount || 0), 0);
  const totalProfit = accounts.filter(a => a.type === 'service_charge' && a.status === 'completed')
                             .reduce((sum, a) => sum + (a.profitMargin || 0), 0);

  const stats = [
    {
      title: 'Total Revenue',
      value: `AED ${totalRevenue.toLocaleString()}`,
      change: '+12% from last month',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Total Expenses',
      value: `AED ${totalExpenses.toLocaleString()}`,
      change: '-5% from last month',
      icon: TrendingDown,
      color: 'red'
    },
    {
      title: 'GST Collected',
      value: `AED ${totalGST.toLocaleString()}`,
      change: 'Due: 28th Feb',
      icon: Receipt,
      color: 'blue'
    },
    {
      title: 'Net Profit',
      value: `AED ${totalProfit.toLocaleString()}`,
      change: '+18% from last month',
      icon: PieChart,
      color: 'purple'
    }
  ];

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
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    'text-purple-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  stat.color === 'blue' ? 'bg-blue-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        <div className="space-y-4">
          {accounts.slice(0, 5).map((account) => {
            const PaymentIcon = getPaymentMethodIcon(account.paymentMethod);
            return (
              <div key={account.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-white rounded-lg border">
                  <PaymentIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{account.description}</p>
                  <p className="text-sm text-gray-600">{account.category} • {account.date}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    account.type === 'service_charge' ? 'text-green-600' :
                    account.type === 'expense' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {account.type === 'expense' ? '-' : '+'}AED {account.amount.toLocaleString()}
                  </p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.status)}`}>
                    {account.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-green-600">AED {totalRevenue.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Expenses</span>
              <span className="font-semibold text-red-600">AED {totalExpenses.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-red-500 h-3 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {['bank_transfer', 'cash', 'cheque', 'card'].map((method) => {
              const count = accounts.filter(a => a.paymentMethod === method).length;
              const percentage = (count / accounts.length) * 100;
              return (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-gray-600 capitalize">{method.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'gst', label: 'GST Management', icon: FileText },
    { id: 'reports', label: 'Reports', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-gray-600 mt-1">Comprehensive financial tracking with dual collection system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-2 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg">
              <Plus className="w-5 h-5" />
              <span>Add Transaction</span>
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
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
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
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'gst' && renderGSTManagement()}
      {activeTab === 'reports' && renderReports()}
    </div>
  );

  function renderTransactions() {
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
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="government_fee">Government Fee</option>
                  <option value="expense">Expense</option>
                  <option value="refund">Refund</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => {
                  const PaymentIcon = getPaymentMethodIcon(account.paymentMethod);
                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.description}</p>
                          <p className="text-sm text-gray-500">{account.category} • {account.date}</p>
                          {account.reference && (
                            <p className="text-xs text-gray-400">Ref: {account.reference}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(account.type)}`}>
                          {account.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className={`text-sm font-semibold ${
                            account.type === 'service_charge' ? 'text-green-600' :
                            account.type === 'expense' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {account.type === 'expense' ? '-' : '+'}AED {account.amount.toLocaleString()}
                          </p>
                          {account.gstAmount && (
                            <p className="text-xs text-gray-500">GST: AED {account.gstAmount}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <PaymentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 capitalize">{account.paymentMethod.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600">
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

  function renderGSTManagement() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">GST Management</h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">GST Collected</h4>
              <p className="text-2xl font-bold text-blue-600">AED {totalGST.toLocaleString()}</p>
              <p className="text-sm text-blue-600">Current quarter</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">GST Paid</h4>
              <p className="text-2xl font-bold text-green-600">AED 0</p>
              <p className="text-sm text-green-600">Current quarter</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">GST Payable</h4>
              <p className="text-2xl font-bold text-amber-600">AED {totalGST.toLocaleString()}</p>
              <p className="text-sm text-amber-600">Due: 28th Feb</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">GST Transactions</h4>
            {accounts.filter(a => a.gstAmount && a.gstAmount > 0).map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{account.description}</p>
                    <p className="text-sm text-gray-600">{account.category} • {account.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">AED {account.amount.toLocaleString()}</p>
                    <p className="text-sm text-blue-600">GST ({account.gstRate}%): AED {account.gstAmount}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Profit & Loss Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Total Revenue</span>
                  <span className="font-semibold text-green-600">AED {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Total Expenses</span>
                  <span className="font-semibold text-red-600">AED {totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">GST Collected</span>
                  <span className="font-semibold text-blue-600">AED {totalGST.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <span className="text-purple-700 font-medium">Net Profit</span>
                  <span className="font-bold text-purple-600">AED {(totalRevenue - totalExpenses).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Category Breakdown</h4>
              <div className="space-y-3">
                {['Visa Processing', 'License Renewal', 'Company Formation', 'Other Services'].map((category) => {
                  const categoryTotal = accounts.filter(a => a.category === category && a.status === 'completed')
                                               .reduce((sum, a) => sum + a.amount, 0);
                  const percentage = totalRevenue > 0 ? (categoryTotal / totalRevenue) * 100 : 0;

                  return (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-700">{category}</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-20 text-right">
                          AED {categoryTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AccountManagement;
