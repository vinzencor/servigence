import React, { useState, useEffect } from 'react';
import { Users, Download, Calendar, TrendingUp, Target, Award, Search, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { exportToPDF } from '../../utils/pdfExport';

interface EmployeeData {
  id: string;
  name: string;
  companyId?: string;
  companyName?: string;
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  lastActivity: string;
}

interface Company {
  id: string;
  company_name: string;
}

const EmployeeWiseReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadEmployeeData();
  }, [dateFrom, dateTo]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Failed to load companies');
    }
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);

      // Load service billings with employee assignments and company info
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          assigned_employee:service_employees(id, name),
          company_employee:employees(id, name, company_id),
          company:companies(id, company_name)
        `)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (error) throw error;

      // Process employee data
      const employeeMap = new Map<string, EmployeeData>();

      (billings || []).forEach(billing => {
        const employee = billing.assigned_employee || billing.company_employee;
        if (!employee) return;

        const employeeId = employee.id;
        const amount = parseFloat(billing.total_amount_with_vat || billing.total_amount || 0);
        const companyId = billing.company?.id || billing.company_employee?.company_id;
        const companyName = billing.company?.company_name || '';

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            id: employeeId,
            name: employee.name,
            companyId: companyId,
            companyName: companyName,
            totalRevenue: 0,
            totalTransactions: 0,
            averageTransactionValue: 0,
            lastActivity: billing.service_date
          });
        }

        const emp = employeeMap.get(employeeId)!;
        emp.totalRevenue += amount;
        emp.totalTransactions += 1;

        if (billing.service_date > emp.lastActivity) {
          emp.lastActivity = billing.service_date;
        }
      });

      // Calculate averages
      employeeMap.forEach(emp => {
        emp.averageTransactionValue = emp.totalTransactions > 0
          ? emp.totalRevenue / emp.totalTransactions
          : 0;
      });

      setEmployees(Array.from(employeeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue));
    } catch (error) {
      console.error('Error loading employee data:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportContent = `
EMPLOYEE-WISE REPORT
====================
Date Range: ${dateFrom} to ${dateTo}
Generated: ${new Date().toLocaleString()}

EMPLOYEE PERFORMANCE
--------------------
${employees.map(emp => `
${emp.name}
  Revenue: AED ${emp.totalRevenue.toLocaleString()}
  Transactions: ${emp.totalTransactions}
  Average: AED ${emp.averageTransactionValue.toLocaleString()}
  Last Activity: ${emp.lastActivity}
`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-wise-report-${dateFrom}-to-${dateTo}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Employee report exported successfully');
  };

  const exportReportPDF = () => {
    const filteredEmployees = employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pdfData = filteredEmployees.map(emp => ({
      name: emp.name,
      totalRevenue: emp.totalRevenue,
      totalTransactions: emp.totalTransactions,
      averageTransactionValue: emp.averageTransactionValue,
      lastActivity: emp.lastActivity || '-'
    }));

    const totalRevenue = filteredEmployees.reduce((sum, emp) => sum + emp.totalRevenue, 0);
    const totalTransactions = filteredEmployees.reduce((sum, emp) => sum + emp.totalTransactions, 0);
    const avgRevenue = filteredEmployees.length > 0 ? totalRevenue / filteredEmployees.length : 0;

    const summaryData = [
      { label: 'Total Employees', value: filteredEmployees.length },
      { label: 'Total Revenue', value: `AED ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      { label: 'Total Transactions', value: totalTransactions },
      { label: 'Average Revenue/Employee', value: `AED ${avgRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
    ];

    exportToPDF({
      title: 'Employee-Wise Report',
      subtitle: 'Performance Summary by Employee',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      columns: [
        { header: 'Employee Name', dataKey: 'name' },
        { header: 'Total Revenue (AED)', dataKey: 'totalRevenue' },
        { header: 'Transactions', dataKey: 'totalTransactions' },
        { header: 'Avg Transaction (AED)', dataKey: 'averageTransactionValue' },
        { header: 'Last Activity', dataKey: 'lastActivity' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Employee_Wise_Report_${dateFrom}_to_${dateTo}.pdf`,
      orientation: 'landscape'
    });

    toast.success('PDF exported successfully!');
  };

  const generateEmployeeInvoice = async (employee: EmployeeData) => {
    try {
      // Load detailed billing data for this employee
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name),
          assigned_employee:service_employees(id, name),
          company_employee:employees(id, name)
        `)
        .or(`assigned_employee_id.eq.${employee.id},company_employee_id.eq.${employee.id}`)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo)
        .order('service_date', { ascending: false });

      if (error) throw error;

      // Process service breakdown
      const serviceBreakdown = new Map<string, { count: number; revenue: number }>();
      let totalRevenue = 0;
      let totalTransactions = 0;

      (billings || []).forEach(billing => {
        const serviceName = billing.service_type?.name || 'Unknown Service';
        const amount = parseFloat(billing.total_amount_with_vat || billing.total_amount || 0);

        if (!serviceBreakdown.has(serviceName)) {
          serviceBreakdown.set(serviceName, { count: 0, revenue: 0 });
        }

        const service = serviceBreakdown.get(serviceName)!;
        service.count += 1;
        service.revenue += amount;

        totalRevenue += amount;
        totalTransactions += 1;
      });

      // Prepare summary data for PDF
      const summaryData = [
        { label: 'Employee Name', value: employee.name },
        { label: 'Company', value: employee.companyName || 'N/A' },
        { label: 'Total Revenue Generated', value: `AED ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'Total Transactions', value: totalTransactions.toString() },
        { label: 'Average Transaction Value', value: `AED ${totalTransactions > 0 ? (totalRevenue / totalTransactions).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}` }
      ];

      // Prepare service breakdown data for PDF
      const serviceBreakdownData = Array.from(serviceBreakdown.entries()).map(([service, data]) => ({
        service,
        transactions: data.count,
        revenue: data.revenue,
        average: data.revenue / data.count
      }));

      // Prepare detailed transactions data for PDF
      const transactionsData = (billings || []).map(billing => ({
        date: new Date(billing.service_date).toLocaleDateString(),
        client: billing.company?.company_name || billing.individual?.individual_name || 'Unknown',
        service: billing.service_type?.name || 'Unknown Service',
        amount: parseFloat(billing.total_amount_with_vat || billing.total_amount || 0),
        payment: billing.cash_type || 'Unknown'
      }));

      // Generate PDF with service breakdown and detailed transactions
      exportToPDF({
        title: 'Employee Invoice/Collection Report',
        subtitle: `Employee: ${employee.name}${employee.companyName ? ` | Company: ${employee.companyName}` : ''}`,
        dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
        columns: [
          { header: 'Service Type', dataKey: 'service' },
          { header: 'Transactions', dataKey: 'transactions' },
          { header: 'Revenue (AED)', dataKey: 'revenue' },
          { header: 'Average (AED)', dataKey: 'average' }
        ],
        data: serviceBreakdownData,
        summaryData,
        fileName: `Employee_Invoice_${employee.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.pdf`,
        orientation: 'portrait'
      });

      // Generate a second PDF with detailed transactions if there are any
      if (transactionsData.length > 0) {
        setTimeout(() => {
          exportToPDF({
            title: 'Detailed Transactions',
            subtitle: `Employee: ${employee.name}${employee.companyName ? ` | Company: ${employee.companyName}` : ''}`,
            dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
            columns: [
              { header: 'Date', dataKey: 'date' },
              { header: 'Client', dataKey: 'client' },
              { header: 'Service', dataKey: 'service' },
              { header: 'Amount (AED)', dataKey: 'amount' },
              { header: 'Payment Method', dataKey: 'payment' }
            ],
            data: transactionsData,
            fileName: `Employee_Transactions_${employee.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.pdf`,
            orientation: 'landscape'
          });
        }, 500);
      }

      toast.success(`Invoice PDF generated for ${employee.name}`);
    } catch (error) {
      console.error('Error generating employee invoice:', error);
      toast.error('Failed to generate employee invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter employees based on company, employee, and search term
  const filteredEmployees = employees.filter(employee => {
    // Filter by company
    if (selectedCompanyId !== 'all' && employee.companyId !== selectedCompanyId) {
      return false;
    }

    // Filter by specific employee
    if (selectedEmployeeId !== 'all' && employee.id !== selectedEmployeeId) {
      return false;
    }

    // Filter by search term
    if (searchTerm && !employee.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Get employees for the selected company (for employee dropdown)
  const employeesInSelectedCompany = selectedCompanyId === 'all'
    ? employees
    : employees.filter(emp => emp.companyId === selectedCompanyId);

  const totalRevenue = filteredEmployees.reduce((sum, emp) => sum + emp.totalRevenue, 0);
  const totalTransactions = filteredEmployees.reduce((sum, emp) => sum + emp.totalTransactions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee-wise Report</h1>
          <p className="text-gray-600">Performance and activity by employee</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setSelectedEmployeeId('all'); // Reset employee filter when company changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={selectedCompanyId === 'all' && employeesInSelectedCompany.length === 0}
            >
              <option value="all">All Employees</option>
              {employeesInSelectedCompany.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Employees</p>
              <p className="text-2xl font-bold text-blue-600">{filteredEmployees.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{totalTransactions}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Employee Performance</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-gray-50">
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
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    AED {employee.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {employee.totalTransactions}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    AED {employee.averageTransactionValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(employee.lastActivity).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    <button
                      onClick={() => generateEmployeeInvoice(employee)}
                      className="inline-flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors"
                      title="Generate Invoice"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEmployees.length === 0 && employees.length > 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees match your search</h3>
              <p className="text-gray-600">Try adjusting your search term.</p>
            </div>
          )}

          {employees.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employee data found</h3>
              <p className="text-gray-600">Try adjusting your date range.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeWiseReport;
