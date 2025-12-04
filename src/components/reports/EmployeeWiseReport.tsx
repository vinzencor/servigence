import React, { useState, useEffect } from 'react';
import { Users, Download, TrendingUp, Target, Award, Search, FileText, Printer } from 'lucide-react';
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

interface EmployeeServiceData {
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  rateFee: number;
  total: number;
  billingId: string;
  invoiceNumber: string;
  billingData: any; // Full billing record for invoice generation
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
  const [employeeServiceData, setEmployeeServiceData] = useState<EmployeeServiceData[]>([]);
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

      // Load service billings with employee assignments, company info, and service types
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          assigned_employee:service_employees(id, name),
          company_employee:employees(id, name, company_id),
          company:companies(id, company_name),
          service_type:service_types(id, name)
        `)
        .gte('service_date', dateFrom)
        .lte('service_date', dateTo);

      if (error) throw error;

      // Process employee data (aggregated)
      const employeeMap = new Map<string, EmployeeData>();

      // Process employee-service breakdown data (individual billing records)
      const employeeServiceList: EmployeeServiceData[] = [];

      (billings || []).forEach(billing => {
        const employee = billing.assigned_employee || billing.company_employee;
        if (!employee) return;

        const employeeId = employee.id;
        const employeeName = employee.name;
        const amount = parseFloat(billing.total_amount_with_vat || billing.total_amount || 0);
        const companyId = billing.company?.id || billing.company_employee?.company_id;
        const companyName = billing.company?.company_name || '';
        const serviceId = billing.service_type?.id || 'unknown';
        const serviceName = billing.service_type?.name || 'Unknown Service';
        const quantity = parseInt(billing.quantity || '1');

        // Aggregate employee data
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

        // Store individual billing records for detailed breakdown
        employeeServiceList.push({
          employeeId: employeeId,
          employeeName: employeeName,
          serviceId: serviceId,
          serviceName: serviceName,
          quantity: quantity,
          rateFee: amount / quantity,
          total: amount,
          billingId: billing.id,
          invoiceNumber: billing.invoice_number || 'N/A',
          billingData: billing // Store full billing record for invoice generation
        });
      });

      // Calculate averages
      employeeMap.forEach(emp => {
        emp.averageTransactionValue = emp.totalTransactions > 0
          ? emp.totalRevenue / emp.totalTransactions
          : 0;
      });

      setEmployees(Array.from(employeeMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue));
      setEmployeeServiceData(employeeServiceList.sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName) || a.serviceName.localeCompare(b.serviceName)
      ));
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

DETAILED SERVICE BREAKDOWN BY EMPLOYEE
---------------------------------------
${employeeServiceData.map(item => `
Invoice: ${item.invoiceNumber}
Employee: ${item.employeeName}
Service: ${item.serviceName}
Quantity: ${item.quantity}
Rate/Fee: AED ${item.rateFee.toFixed(2)}
Total: AED ${item.total.toFixed(2)}
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
    // Export the detailed service breakdown instead of employee performance
    exportDetailedBreakdownPDF();
  };

  const exportDetailedBreakdownPDF = () => {
    const filteredData = employeeServiceData.filter(item =>
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pdfData = filteredData.map(item => ({
      invoiceNumber: item.invoiceNumber,
      employeeName: item.employeeName,
      serviceName: item.serviceName,
      quantity: item.quantity,
      rateFee: item.rateFee.toFixed(2),
      total: item.total.toFixed(2)
    }));

    const totalQuantity = filteredData.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = filteredData.reduce((sum, item) => sum + item.total, 0);

    const summaryData = [
      { label: 'Total Services', value: filteredData.length },
      { label: 'Total Quantity', value: totalQuantity },
      { label: 'Total Amount', value: `AED ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
    ];

    exportToPDF({
      title: 'Employee-Wise Detailed Service Breakdown',
      subtitle: 'Service-level breakdown by employee',
      dateRange: `Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`,
      columns: [
        { header: 'Invoice #', dataKey: 'invoiceNumber' },
        { header: 'Employee Name', dataKey: 'employeeName' },
        { header: 'Service', dataKey: 'serviceName' },
        { header: 'Quantity', dataKey: 'quantity' },
        { header: 'Rate/Fee (AED)', dataKey: 'rateFee' },
        { header: 'Total (AED)', dataKey: 'total' }
      ],
      data: pdfData,
      summaryData,
      fileName: `Employee_Service_Breakdown_${dateFrom}_to_${dateTo}.pdf`,
      orientation: 'landscape'
    });

    toast.success('Detailed breakdown PDF exported successfully!');
  };

  const generateInvoicePDF = (billingData: any) => {
    try {
      // Generate invoice HTML content
      const invoiceHTML = generateInvoiceHTML(billingData);

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }

      toast.success('Invoice opened for printing');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const generateInvoiceHTML = (billing: any) => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const serviceDate = billing.service_date ? new Date(billing.service_date).toLocaleDateString('en-US') : 'N/A';

    const invoiceNumber = billing.invoice_number || 'N/A';
    const clientName = billing.company?.company_name || billing.individual?.individual_name || 'N/A';
    const clientType = billing.company ? 'Company' : 'Individual';
    const serviceName = billing.service_type?.name || 'Service';
    const quantity = billing.quantity || '1';
    const serviceCharge = parseFloat(billing.service_charge || 0);
    const governmentCharge = parseFloat(billing.government_charge || 0);
    const totalAmount = parseFloat(billing.total_amount || 0);
    const vatAmount = parseFloat(billing.vat_amount || 0);
    const totalWithVat = parseFloat(billing.total_amount_with_vat || totalAmount);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice ${invoiceNumber}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
          }
          body {
            padding: 20px;
            background-color: #f5f5f5;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 25px;
            border-radius: 5px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #ddd;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .logo-section {
            flex: 1;
          }
          .logo-text {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 11px;
            color: #666;
            line-height: 1.6;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 10px;
          }
          .invoice-number {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }
          .client-section {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 5px;
          }
          .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .client-name {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #1e3a8a;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .text-right {
            text-align: right;
          }
          .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 300px;
          }
          .totals-table td {
            padding: 8px;
            border: none;
          }
          .total-row {
            font-weight: bold;
            font-size: 16px;
            background-color: #f3f4f6;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .invoice-container {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="logo-section">
              <div class="logo-text">SERVIGENS</div>
              <div class="company-info">
                Business Group<br>
                Office 123, Business Tower<br>
                Dubai, UAE<br>
                TRN: 123456789012345
              </div>
            </div>
            <div class="invoice-info">
              <div class="invoice-title">TAX INVOICE</div>
              <div class="invoice-number">Invoice #: ${invoiceNumber}</div>
              <div class="invoice-number">Date: ${formattedDate}</div>
              <div class="invoice-number">Service Date: ${serviceDate}</div>
            </div>
          </div>

          <div class="client-section">
            <div class="section-title">Bill To</div>
            <div class="client-name">${clientName}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">${clientType}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Service Charge</th>
                <th class="text-right">Govt. Charge</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${serviceName}</td>
                <td class="text-right">${quantity}</td>
                <td class="text-right">AED ${serviceCharge.toFixed(2)}</td>
                <td class="text-right">AED ${governmentCharge.toFixed(2)}</td>
                <td class="text-right">AED ${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td class="text-right">AED ${totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>VAT (5%):</td>
                <td class="text-right">AED ${vatAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount:</td>
                <td class="text-right">AED ${totalWithVat.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p><strong>Thank you for choosing SERVIGENS!</strong></p>
            <p>This is a computer-generated invoice. Generated on ${formattedDate} at ${formattedTime}</p>
          </div>
        </div>
      </body>
      </html>
    `;
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
            <span>Summary PDF</span>
          </button>
          <button
            onClick={exportDetailedBreakdownPDF}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Download className="w-4 h-4" />
            <span>Detailed PDF</span>
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



      {/* Detailed Employee-Service Breakdown Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detailed Service Breakdown by Employee</h2>
          <p className="text-sm text-gray-600 mt-1">Individual services performed by each employee</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/Fee (AED)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (AED)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employeeServiceData
                .filter(item =>
                  item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item) => (
                  <tr key={`${item.billingId}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="font-medium">{item.employeeName}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {item.rateFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      {item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      <button
                        onClick={() => generateInvoicePDF(item.billingData)}
                        className="inline-flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {employeeServiceData.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No service data found</h3>
              <p className="text-gray-600">Try adjusting your date range or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeWiseReport;
