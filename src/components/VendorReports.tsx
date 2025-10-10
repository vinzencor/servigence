import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileText, 
  Calendar,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VendorMetric {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceCategory: string;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  completionRate: number;
  averageCostPerJob: number;
  recentJobs: any[];
}

interface VendorReportsData {
  vendors: VendorMetric[];
  totalVendors: number;
  totalJobs: number;
  totalCost: number;
  totalRevenue: number;
  billings: any[];
}

const VendorReports: React.FC = () => {
  const [reportsData, setReportsData] = useState<VendorReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'performance'>('overview');

  useEffect(() => {
    loadReports();
  }, [selectedVendor, dateFrom, dateTo]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await dbHelpers.getVendorReports(
        selectedVendor || undefined,
        dateFrom || undefined,
        dateTo || undefined
      );
      setReportsData(data);
    } catch (error) {
      console.error('Error loading vendor reports:', error);
      toast.error('Failed to load vendor reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = reportsData?.vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.serviceCategory.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const generateReport = () => {
    if (!reportsData) return;

    const reportContent = `
VENDOR PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
Period: ${dateFrom || 'All time'} to ${dateTo || 'Present'}

=== SUMMARY ===
Total Vendors: ${reportsData.totalVendors}
Total Jobs: ${reportsData.totalJobs}
Total Cost: AED ${reportsData.totalCost.toLocaleString()}
Total Revenue: AED ${reportsData.totalRevenue.toLocaleString()}
Total Profit: AED ${(reportsData.totalRevenue - reportsData.totalCost).toLocaleString()}

=== VENDOR BREAKDOWN ===
${reportsData.vendors.map(vendor => `
Vendor: ${vendor.name}
Category: ${vendor.serviceCategory}
Jobs: ${vendor.totalJobs} (${vendor.completedJobs} completed, ${vendor.pendingJobs} pending)
Cost: AED ${vendor.totalCost.toLocaleString()}
Revenue: AED ${vendor.totalRevenue.toLocaleString()}
Profit: AED ${vendor.profit.toLocaleString()}
Completion Rate: ${vendor.completionRate.toFixed(1)}%
Average Cost/Job: AED ${vendor.averageCostPerJob.toLocaleString()}
`).join('\n')}

Report End
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vendor-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Vendor report downloaded');
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
      title: 'Total Vendors',
      value: reportsData?.totalVendors || 0,
      change: `${filteredVendors.filter(v => v.totalJobs > 0).length} active`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Total Jobs',
      value: reportsData?.totalJobs || 0,
      change: `${reportsData?.vendors.reduce((sum, v) => sum + v.completedJobs, 0) || 0} completed`,
      icon: FileText,
      color: 'green'
    },
    {
      title: 'Total Cost',
      value: `AED ${(reportsData?.totalCost || 0).toLocaleString()}`,
      change: `${reportsData?.vendors.length || 0} vendors`,
      icon: DollarSign,
      color: 'red'
    },
    {
      title: 'Total Profit',
      value: `AED ${((reportsData?.totalRevenue || 0) - (reportsData?.totalCost || 0)).toLocaleString()}`,
      change: `${(((reportsData?.totalRevenue || 0) - (reportsData?.totalCost || 0)) / (reportsData?.totalRevenue || 1) * 100).toFixed(1)}% margin`,
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Reports</h1>
          <p className="text-gray-600">Track vendor performance and costs</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Vendors</option>
              {reportsData?.vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search vendors..."
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
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'vendors', label: 'Vendor Details', icon: Users },
              { id: 'performance', label: 'Performance', icon: Activity }
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
            <div className="space-y-6">
              {/* Top Performing Vendors */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
                <div className="space-y-3">
                  {filteredVendors
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .slice(0, 5)
                    .map((vendor) => (
                      <div key={vendor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {vendor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{vendor.name}</p>
                            <p className="text-sm text-gray-600">{vendor.serviceCategory}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{vendor.completionRate.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">{vendor.totalJobs} jobs</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                      <p className="text-gray-600">{vendor.serviceCategory}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">AED {vendor.profit.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Profit</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{vendor.totalJobs}</p>
                      <p className="text-sm text-gray-600">Total Jobs</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{vendor.completedJobs}</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{vendor.pendingJobs}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{vendor.completionRate.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Completion Rate</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-lg font-semibold text-gray-900">AED {vendor.totalCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-lg font-semibold text-gray-900">AED {vendor.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Cost/Job</p>
                      <p className="text-lg font-semibold text-gray-900">AED {vendor.averageCostPerJob.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Completion Rate Chart */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rates</h3>
                  <div className="space-y-3">
                    {filteredVendors.slice(0, 5).map((vendor) => (
                      <div key={vendor.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{vendor.name}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${vendor.completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{vendor.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost Efficiency */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Efficiency</h3>
                  <div className="space-y-3">
                    {filteredVendors
                      .sort((a, b) => a.averageCostPerJob - b.averageCostPerJob)
                      .slice(0, 5)
                      .map((vendor) => (
                        <div key={vendor.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{vendor.name}</span>
                          <span className="text-sm font-medium text-gray-900">AED {vendor.averageCostPerJob.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorReports;
