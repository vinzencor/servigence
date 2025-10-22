import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Download, 
  Filter, 
  Search, 
  DollarSign, 
  Calendar,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Users,
  Target,
  AlertCircle
} from 'lucide-react';
import { dbHelpers, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CompanyData {
  id: string;
  name: string;
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  totalDue: number;
  totalPaid: number;
  lastTransactionDate: string;
  services: string[];
  averageTransactionValue: number;
  profitMargin: number;
  paymentMethods: Record<string, number>;
  monthlyRevenue: Record<string, number>;
}

interface CompanyWiseData {
  companies: CompanyData[];
  summary: {
    totalCompanies: number;
    totalRevenue: number;
    totalProfit: number;
    totalDue: number;
    averageRevenuePerCompany: number;
    topCompanyRevenue: number;
  };
}

const CompanyWiseReport: React.FC = () => {
  const [data, setData] = useState<CompanyWiseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'profit' | 'transactions' | 'due'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyWithDues, setShowOnlyWithDues] = useState(false);

  useEffect(() => {
    loadCompanyWiseData();
  }, [dateFrom, dateTo]);

  const loadCompanyWiseData = async () => {
    try {
      setLoading(true);
      
      // Load companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name');

      if (companiesError) throw companiesError;

      // Load service billings for companies
      const { data: billings, error: billingsError } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          service_type:service_types(name)
        `)
        .not('company_id', 'is', null)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (billingsError) throw billingsError;

      // Load dues for companies
      const { data: dues, error: duesError } = await supabase
        .from('dues')
        .select(`
          *,
          company:companies(company_name)
        `)
        .not('company_id', 'is', null);

      if (duesError) throw duesError;

      const processedData = processCompanyWiseData(companies || [], billings || [], dues || []);
      setData(processedData);
    } catch (error) {
      console.error('Error loading company-wise data:', error);
      toast.error('Failed to load company-wise data');
    } finally {
      setLoading(false);
    }
  };

  const processCompanyWiseData = (companies: any[], billings: any[], dues: any[]): CompanyWiseData => {
    const companyMap = new Map<string, CompanyData>();

    // Initialize companies
    companies.forEach(company => {
      companyMap.set(company.id, {
        id: company.id,
        name: company.company_name,
        totalRevenue: 0,
        totalProfit: 0,
        totalTransactions: 0,
        totalDue: 0,
        totalPaid: 0,
        lastTransactionDate: '',
        services: [],
        averageTransactionValue: 0,
        profitMargin: 0,
        paymentMethods: {},
        monthlyRevenue: {}
      });
    });

    // Process billings
    billings.forEach(billing => {
      const companyId = billing.company_id;
      if (!companyMap.has(companyId)) return;

      const company = companyMap.get(companyId)!;
      const amount = parseFloat(billing.total_amount_with_vat || billing.total_amount || 0);
      const profit = parseFloat(billing.profit || 0);
      const serviceName = billing.service_type?.name || 'Unknown Service';
      const paymentMethod = billing.cash_type || 'unknown';
      const month = new Date(billing.service_date).toISOString().slice(0, 7);

      company.totalRevenue += amount;
      company.totalProfit += profit;
      company.totalTransactions += 1;
      
      if (!company.lastTransactionDate || billing.service_date > company.lastTransactionDate) {
        company.lastTransactionDate = billing.service_date;
      }

      if (!company.services.includes(serviceName)) {
        company.services.push(serviceName);
      }

      company.paymentMethods[paymentMethod] = (company.paymentMethods[paymentMethod] || 0) + amount;
      company.monthlyRevenue[month] = (company.monthlyRevenue[month] || 0) + amount;
    });

    // Process dues
    dues.forEach(due => {
      const companyId = due.company_id;
      if (!companyMap.has(companyId)) return;

      const company = companyMap.get(companyId)!;
      company.totalDue += parseFloat(due.due_amount || 0);
      company.totalPaid += parseFloat(due.paid_amount || 0);
    });

    // Calculate derived values
    companyMap.forEach(company => {
      company.averageTransactionValue = company.totalTransactions > 0 
        ? company.totalRevenue / company.totalTransactions 
        : 0;
      company.profitMargin = company.totalRevenue > 0 
        ? (company.totalProfit / company.totalRevenue) * 100 
        : 0;
    });

    const companiesArray = Array.from(companyMap.values());
    const totalRevenue = companiesArray.reduce((sum, company) => sum + company.totalRevenue, 0);
    const totalProfit = companiesArray.reduce((sum, company) => sum + company.totalProfit, 0);
    const totalDue = companiesArray.reduce((sum, company) => sum + company.totalDue, 0);
    const companiesWithRevenue = companiesArray.filter(c => c.totalRevenue > 0);

    return {
      companies: companiesArray,
      summary: {
        totalCompanies: companiesWithRevenue.length,
        totalRevenue,
        totalProfit,
        totalDue,
        averageRevenuePerCompany: companiesWithRevenue.length > 0 
          ? totalRevenue / companiesWithRevenue.length 
          : 0,
        topCompanyRevenue: companiesArray.length > 0 
          ? Math.max(...companiesArray.map(c => c.totalRevenue)) 
          : 0
      }
    };
  };

  const filteredCompanies = data?.companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDueFilter = !showOnlyWithDues || company.totalDue > 0;
    const hasActivity = company.totalRevenue > 0 || company.totalDue > 0;
    
    return matchesSearch && matchesDueFilter && hasActivity;
  }) || [];

  // Sort filtered companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'revenue':
        comparison = a.totalRevenue - b.totalRevenue;
        break;
      case 'profit':
        comparison = a.totalProfit - b.totalProfit;
        break;
      case 'transactions':
        comparison = a.totalTransactions - b.totalTransactions;
        break;
      case 'due':
        comparison = a.totalDue - b.totalDue;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const exportReport = () => {
    if (!data) return;

    const reportContent = `
COMPANY-WISE REPORT
===================
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Companies: ${data.summary.totalCompanies}
Total Revenue: AED ${data.summary.totalRevenue.toLocaleString()}
Total Profit: AED ${data.summary.totalProfit.toLocaleString()}
Total Outstanding: AED ${data.summary.totalDue.toLocaleString()}
Average Revenue per Company: AED ${data.summary.averageRevenuePerCompany.toLocaleString()}

COMPANY DETAILS
---------------
${sortedCompanies.map(company => `
${company.name}
  Revenue: AED ${company.totalRevenue.toLocaleString()}
  Profit: AED ${company.totalProfit.toLocaleString()} (${company.profitMargin.toFixed(1)}%)
  Transactions: ${company.totalTransactions}
  Outstanding: AED ${company.totalDue.toLocaleString()}
  Services: ${company.services.join(', ')}
  Last Transaction: ${company.lastTransactionDate || 'N/A'}
`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-wise-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Company-wise report exported successfully');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company-wise Report</h1>
          <p className="text-gray-600">Financial summary for each company client</p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="revenue-desc">Revenue (Highest)</option>
              <option value="revenue-asc">Revenue (Lowest)</option>
              <option value="profit-desc">Profit (Highest)</option>
              <option value="profit-asc">Profit (Lowest)</option>
              <option value="transactions-desc">Transactions (Most)</option>
              <option value="transactions-asc">Transactions (Least)</option>
              <option value="due-desc">Outstanding (Highest)</option>
              <option value="due-asc">Outstanding (Lowest)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnlyWithDues"
                checked={showOnlyWithDues}
                onChange={(e) => setShowOnlyWithDues(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showOnlyWithDues" className="text-sm text-gray-700">
                Only with dues
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Companies</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.totalCompanies}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">With transactions</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">AED {data.summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">All companies</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-purple-600">AED {data.summary.totalProfit.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.summary.totalRevenue > 0 ?
                `${((data.summary.totalProfit / data.summary.totalRevenue) * 100).toFixed(1)}% margin` :
                'No margin data'
              }
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">AED {data.summary.totalDue.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total dues</p>
          </div>
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Company Details</h2>
            <span className="text-sm text-gray-500">
              Showing {sortedCompanies.length} companies
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          Avg: AED {company.averageTransactionValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    AED {company.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="text-purple-600 font-medium">
                      AED {company.totalProfit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.profitMargin.toFixed(1)}% margin
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {company.totalTransactions}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {company.totalDue > 0 ? (
                      <div className="text-red-600 font-medium">
                        AED {company.totalDue.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    {company.totalPaid > 0 && (
                      <div className="text-xs text-green-600">
                        Paid: AED {company.totalPaid.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      {company.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {company.services.slice(0, 2).map((service, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {service}
                            </span>
                          ))}
                          {company.services.length > 2 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              +{company.services.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No services</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.lastTransactionDate ? (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(company.lastTransactionDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No transactions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600">Try adjusting your filters or date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      {data && sortedCompanies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Generators</h3>
            <div className="space-y-3">
              {sortedCompanies
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 5)
                .map((company, index) => (
                <div key={company.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{company.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    AED {company.totalRevenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Highest Outstanding</h3>
            <div className="space-y-3">
              {sortedCompanies
                .filter(c => c.totalDue > 0)
                .sort((a, b) => b.totalDue - a.totalDue)
                .slice(0, 5)
                .map((company, index) => (
                <div key={company.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700">{company.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    AED {company.totalDue.toLocaleString()}
                  </span>
                </div>
              ))}
              {sortedCompanies.filter(c => c.totalDue > 0).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No outstanding dues</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyWiseReport;
