import React, { useState, useEffect } from 'react';
import { Target, Download, Calendar, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface ServiceData {
  id: string;
  name: string;
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  averageTransactionValue: number;
  profitMargin: number;
  lastTransactionDate: string;
}

const ServiceWiseReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [services, setServices] = useState<ServiceData[]>([]);

  useEffect(() => {
    loadServiceData();
  }, [dateFrom, dateTo]);

  const loadServiceData = async () => {
    try {
      setLoading(true);
      
      // Load service billings with service types
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          service_type:service_types(id, name)
        `)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (error) throw error;

      // Process service data
      const serviceMap = new Map<string, ServiceData>();

      (billings || []).forEach(billing => {
        const serviceType = billing.service_type;
        if (!serviceType) return;

        const serviceId = serviceType.id;
        const amount = parseFloat(billing.total_amount_with_vat || billing.total_amount || 0);
        const profit = parseFloat(billing.profit || 0);

        if (!serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            id: serviceId,
            name: serviceType.name,
            totalRevenue: 0,
            totalProfit: 0,
            totalTransactions: 0,
            averageTransactionValue: 0,
            profitMargin: 0,
            lastTransactionDate: billing.service_date
          });
        }

        const service = serviceMap.get(serviceId)!;
        service.totalRevenue += amount;
        service.totalProfit += profit;
        service.totalTransactions += 1;
        
        if (billing.service_date > service.lastTransactionDate) {
          service.lastTransactionDate = billing.service_date;
        }
      });

      // Calculate derived values
      serviceMap.forEach(service => {
        service.averageTransactionValue = service.totalTransactions > 0 
          ? service.totalRevenue / service.totalTransactions 
          : 0;
        service.profitMargin = service.totalRevenue > 0 
          ? (service.totalProfit / service.totalRevenue) * 100 
          : 0;
      });

      setServices(Array.from(serviceMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue));
    } catch (error) {
      console.error('Error loading service data:', error);
      toast.error('Failed to load service data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const totalRevenue = services.reduce((sum, service) => sum + service.totalRevenue, 0);
    const totalProfit = services.reduce((sum, service) => sum + service.totalProfit, 0);
    const totalTransactions = services.reduce((sum, service) => sum + service.totalTransactions, 0);

    const reportContent = `
SERVICE-WISE REPORT
===================
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Services: ${services.length}
Total Revenue: AED ${totalRevenue.toLocaleString()}
Total Profit: AED ${totalProfit.toLocaleString()}
Total Transactions: ${totalTransactions}

SERVICE BREAKDOWN
-----------------
${services.map(service => `
${service.name}
  Revenue: AED ${service.totalRevenue.toLocaleString()}
  Profit: AED ${service.totalProfit.toLocaleString()} (${service.profitMargin.toFixed(1)}%)
  Transactions: ${service.totalTransactions}
  Average: AED ${service.averageTransactionValue.toLocaleString()}
  Last Transaction: ${service.lastTransactionDate}
`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-wise-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Service-wise report exported successfully');
  };

  const exportReportPDF = () => {
    const pdfData = services.map(service => ({
      name: service.name,
      totalRevenue: service.totalRevenue,
      totalProfit: service.totalProfit,
      profitMargin: service.profitMargin,
      totalTransactions: service.totalTransactions,
      averageTransactionValue: service.averageTransactionValue,
      lastTransactionDate: service.lastTransactionDate || '-'
    }));

    const totalRevenue = services.reduce((sum, service) => sum + service.totalRevenue, 0);
    const totalProfit = services.reduce((sum, service) => sum + service.totalProfit, 0);
    const totalTransactions = services.reduce((sum, service) => sum + service.totalTransactions, 0);

    const summaryData = [
      { label: 'Total Services', value: services.length },
      { label: 'Total Revenue', value: `AED ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total Profit', value: `AED ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total Transactions', value: totalTransactions }
    ];

    exportToPDF({
      title: 'Service-Wise Report',
      subtitle: 'Revenue Breakdown by Service Type',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      columns: [
        { header: 'Service Name', dataKey: 'name' },
        { header: 'Revenue (AED)', dataKey: 'totalRevenue' },
        { header: 'Profit (AED)', dataKey: 'totalProfit' },
        { header: 'Profit %', dataKey: 'profitMargin' },
        { header: 'Transactions', dataKey: 'totalTransactions' },
        { header: 'Avg Transaction (AED)', dataKey: 'averageTransactionValue' },
        { header: 'Last Transaction', dataKey: 'lastTransactionDate' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Service_Wise_Report_${dateFrom}_to_${dateTo}.pdf`,
      orientation: 'landscape'
    });

    toast.success('PDF exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalRevenue = services.reduce((sum, service) => sum + service.totalRevenue, 0);
  const totalProfit = services.reduce((sum, service) => sum + service.totalProfit, 0);
  const totalTransactions = services.reduce((sum, service) => sum + service.totalTransactions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service-wise Report</h1>
          <p className="text-gray-600">Revenue and activity breakdown by service type</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export TXT</span>
          </button>
          <button
            onClick={exportReportPDF}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Services</p>
              <p className="text-2xl font-bold text-blue-600">{services.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">AED {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-purple-600">AED {totalProfit.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-orange-600">{totalTransactions}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Service Performance</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Transaction</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service, index) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    AED {service.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-purple-600">
                    AED {service.totalProfit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {service.totalTransactions}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    AED {service.averageTransactionValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      service.profitMargin >= 20 ? 'bg-green-100 text-green-800' :
                      service.profitMargin >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {service.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(service.lastTransactionDate).toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {services.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No service data found</h3>
              <p className="text-gray-600">Try adjusting your date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      {services.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Generators</h3>
            <div className="space-y-3">
              {services.slice(0, 5).map((service, index) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{service.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    AED {service.totalRevenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Highest Profit Margins</h3>
            <div className="space-y-3">
              {services
                .sort((a, b) => b.profitMargin - a.profitMargin)
                .slice(0, 5)
                .map((service, index) => (
                <div key={service.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Award className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700">{service.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-600">
                    {service.profitMargin.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceWiseReport;
