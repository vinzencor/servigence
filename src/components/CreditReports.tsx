import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Building2, 
  Calendar,
  Download,
  Filter,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CreditClient {
  id: string;
  name: string;
  type: 'company' | 'individual';
  creditLimit: number;
  creditUtilized: number;
  availableCredit: number;
  utilizationRate: number;
  totalBilled: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
  overdueInvoices: number;
  totalInvoices: number;
  lastActivity: string;
  contact: {
    address?: string;
    phone?: string;
    email?: string;
  };
}

interface CreditReportsData {
  companies: CreditClient[];
  individuals: CreditClient[];
  summary: {
    totalClients: number;
    totalCreditLimit: number;
    totalUtilized: number;
    totalAvailable: number;
    utilizationRate: number;
    overdueClients: number;
    overdueAmount: number;
  };
}

const CreditReports: React.FC = () => {
  const [reportsData, setReportsData] = useState<CreditReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientType, setClientType] = useState<'all' | 'companies' | 'individuals'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'individuals' | 'risk'>('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
    end: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    loadReports();
  }, [clientType, dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await dbHelpers.getCreditReports(clientType, dateRange);
      setReportsData(data);
    } catch (error) {
      console.error('Error loading credit reports:', error);
      toast.error('Failed to load credit reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportsData) return;

    const allClients = [...reportsData.companies, ...reportsData.individuals];
    const reportContent = `
CREDIT REPORTS
==============
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange.start} to ${dateRange.end}

=== SUMMARY ===
Total Clients: ${reportsData.summary.totalClients}
Total Credit Limit: AED ${reportsData.summary.totalCreditLimit.toLocaleString()}
Total Utilized: AED ${reportsData.summary.totalUtilized.toLocaleString()}
Total Available: AED ${reportsData.summary.totalAvailable.toLocaleString()}
Average Utilization Rate: ${reportsData.summary.utilizationRate.toFixed(1)}%
Overdue Clients: ${reportsData.summary.overdueClients}
Overdue Amount: AED ${reportsData.summary.overdueAmount.toLocaleString()}

=== CLIENT DETAILS ===
${allClients.map(client => `
Client: ${client.name} (${client.type})
Credit Limit: AED ${client.creditLimit.toLocaleString()}
Credit Utilized: AED ${client.creditUtilized.toLocaleString()}
Available Credit: AED ${client.availableCredit.toLocaleString()}
Utilization Rate: ${client.utilizationRate.toFixed(1)}%
Outstanding Amount: AED ${client.outstandingAmount.toLocaleString()}
Overdue Amount: AED ${client.overdueAmount.toLocaleString()}
Total Invoices: ${client.totalInvoices}
Overdue Invoices: ${client.overdueInvoices}
Last Activity: ${new Date(client.lastActivity).toLocaleDateString()}
Contact: ${client.contact.phone || 'N/A'} | ${client.contact.email || 'N/A'}
`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credit-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Credit report downloaded');
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskLevel = (client: CreditClient) => {
    if (client.overdueAmount > 0 && client.utilizationRate > 80) return 'High Risk';
    if (client.overdueAmount > 0 || client.utilizationRate > 70) return 'Medium Risk';
    return 'Low Risk';
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High Risk': return 'text-red-600 bg-red-100';
      case 'Medium Risk': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportsData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Unable to load credit reports data.</p>
      </div>
    );
  }

  const allClients = [...reportsData.companies, ...reportsData.individuals];
  const filteredClients = allClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highRiskClients = allClients.filter(client => getRiskLevel(client) === 'High Risk');
  const mediumRiskClients = allClients.filter(client => getRiskLevel(client) === 'Medium Risk');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Credit Reports</h2>
          <p className="text-gray-600">Monitor client credit limits, utilization, and payment patterns</p>
        </div>
        <button
          onClick={downloadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Type</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Clients</option>
              <option value="companies">Companies Only</option>
              <option value="individuals">Individuals Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Credit Limit</p>
              <p className="text-2xl font-bold text-gray-900">AED {reportsData.summary.totalCreditLimit.toLocaleString()}</p>
            </div>
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Credit Utilized</p>
              <p className="text-2xl font-bold text-red-600">AED {reportsData.summary.totalUtilized.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Credit</p>
              <p className="text-2xl font-bold text-green-600">AED {reportsData.summary.totalAvailable.toLocaleString()}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Amount</p>
              <p className="text-2xl font-bold text-red-600">AED {reportsData.summary.overdueAmount.toLocaleString()}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'companies', label: 'Companies', icon: Building2 },
            { id: 'individuals', label: 'Individuals', icon: User },
            { id: 'risk', label: 'Risk Analysis', icon: AlertTriangle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Credit Overview</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Utilization Chart */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Credit Utilization Distribution</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Low (0-50%)', count: allClients.filter(c => c.utilizationRate <= 50).length, color: 'bg-green-500' },
                      { label: 'Medium (51-80%)', count: allClients.filter(c => c.utilizationRate > 50 && c.utilizationRate <= 80).length, color: 'bg-yellow-500' },
                      { label: 'High (81-100%)', count: allClients.filter(c => c.utilizationRate > 80).length, color: 'bg-red-500' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded ${item.color}`}></div>
                          <span className="text-sm text-gray-600">{item.label}</span>
                        </div>
                        <span className="font-medium">{item.count} clients</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Summary */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Risk Assessment</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">High Risk Clients</span>
                      <span className="font-medium text-red-600">{highRiskClients.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-yellow-600">Medium Risk Clients</span>
                      <span className="font-medium text-yellow-600">{mediumRiskClients.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">Low Risk Clients</span>
                      <span className="font-medium text-green-600">{allClients.length - highRiskClients.length - mediumRiskClients.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Clients by Credit Limit */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Top Clients by Credit Limit</h4>
                <div className="space-y-3">
                  {allClients
                    .sort((a, b) => b.creditLimit - a.creditLimit)
                    .slice(0, 5)
                    .map((client, index) => (
                      <div key={client.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-600">{client.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">AED {client.creditLimit.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{client.utilizationRate.toFixed(1)}% utilized</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'companies' || activeTab === 'individuals') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'companies' ? 'Company' : 'Individual'} Credit Reports
              </h3>

              {(activeTab === 'companies' ? reportsData.companies : reportsData.individuals)
                .filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((client) => (
                  <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                          {activeTab === 'companies' ? <Building2 className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{client.name}</h4>
                          <p className="text-sm text-gray-600">
                            {client.totalInvoices} invoices • Last activity: {new Date(client.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getUtilizationColor(client.utilizationRate)}`}>
                          {client.utilizationRate.toFixed(1)}% utilized
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Credit Limit</p>
                        <p className="font-semibold text-gray-900">AED {client.creditLimit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Credit Utilized</p>
                        <p className="font-semibold text-red-600">AED {client.creditUtilized.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Available Credit</p>
                        <p className="font-semibold text-green-600">AED {client.availableCredit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Outstanding</p>
                        <p className="font-semibold text-gray-900">AED {client.outstandingAmount.toLocaleString()}</p>
                      </div>
                    </div>

                    {client.overdueAmount > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            Overdue Amount: AED {client.overdueAmount.toLocaleString()} ({client.overdueInvoices} invoices)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Risk Analysis</h3>

              {/* High Risk Clients */}
              {highRiskClients.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-4">High Risk Clients ({highRiskClients.length})</h4>
                  <div className="space-y-3">
                    {highRiskClients.map((client) => (
                      <div key={client.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-semibold text-gray-900">{client.name}</h5>
                            <p className="text-sm text-gray-600">
                              {client.utilizationRate.toFixed(1)}% utilization • AED {client.overdueAmount.toLocaleString()} overdue
                            </p>
                          </div>
                          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRiskColor(getRiskLevel(client))}`}>
                            {getRiskLevel(client)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medium Risk Clients */}
              {mediumRiskClients.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600 mb-4">Medium Risk Clients ({mediumRiskClients.length})</h4>
                  <div className="space-y-3">
                    {mediumRiskClients.map((client) => (
                      <div key={client.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-semibold text-gray-900">{client.name}</h5>
                            <p className="text-sm text-gray-600">
                              {client.utilizationRate.toFixed(1)}% utilization • AED {client.overdueAmount.toLocaleString()} overdue
                            </p>
                          </div>
                          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getRiskColor(getRiskLevel(client))}`}>
                            {getRiskLevel(client)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Recommendations */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Risk Management Recommendations</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Monitor high-risk clients closely and consider credit limit adjustments</li>
                  <li>• Follow up on overdue payments immediately</li>
                  <li>• Consider requiring deposits for clients with high utilization rates</li>
                  <li>• Review credit terms for clients with frequent overdue payments</li>
                  <li>• Implement automated payment reminders for medium and high-risk clients</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditReports;
