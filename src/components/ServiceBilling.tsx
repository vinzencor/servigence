import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, Calendar, Filter, Download, Eye, Edit, Plus, Search, Building2, User, AlertCircle, Save } from 'lucide-react';
import { mockServices, mockInvoices } from '../data/mockData';
import { Company, Individual, ServiceType, ServiceEmployee, ServiceBilling as ServiceBillingType } from '../types';
import { dbHelpers } from '../lib/supabase';

const ServiceBilling: React.FC = () => {
  const [activeTab, setActiveTab] = useState('billing');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [showCreateBilling, setShowCreateBilling] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEditBilling, setShowEditBilling] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [serviceEmployees, setServiceEmployees] = useState<ServiceEmployee[]>([]);

  const [serviceBillings, setServiceBillings] = useState<ServiceBillingType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [selectedCompanyForReport, setSelectedCompanyForReport] = useState('');

  const [billingForm, setBillingForm] = useState({
    clientType: 'company' as 'company' | 'individual',
    companyId: '',
    individualId: '',
    serviceTypeId: '',
    assignedEmployeeId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    cashType: 'cash' as 'cash' | 'house' | 'car' | 'service_agency' | 'service_building',
    quantity: '1',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit billing form state
  const [editBillingForm, setEditBillingForm] = useState({
    clientType: 'company' as 'company' | 'individual',
    companyId: '',
    individualId: '',
    serviceTypeId: '',
    assignedEmployeeId: '',
    serviceDate: '',
    cashType: 'cash' as 'cash' | 'house' | 'car' | 'service_agency' | 'service_building',
    quantity: '1',
    notes: ''
  });

  const tabs = [
    { id: 'billing', label: 'Service Billing', icon: DollarSign },
    { id: 'list', label: 'Billing List', icon: FileText },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  const cashTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'house', label: 'House' },
    { value: 'car', label: 'Car' },
    { value: 'service_agency', label: 'Service Agency' },
    { value: 'service_building', label: 'Service Building' }
  ];

  useEffect(() => {
    loadData();
    loadServiceBillings();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesData, individualsData, servicesData] = await Promise.all([
        dbHelpers.getCompanies(),
        dbHelpers.getIndividuals(),
        dbHelpers.getServices()
      ]);

      // Transform company data
      const transformedCompanies = companiesData.map((company: any) => ({
        id: company.id,
        companyName: company.company_name,
        phone1: company.phone1,
        email1: company.email1,
        status: company.status
      }));

      // Transform individual data
      const transformedIndividuals = individualsData?.map((individual: any) => ({
        id: individual.id,
        individualName: individual.individual_name,
        nationality: individual.nationality,
        phone1: individual.phone1,
        phone2: individual.phone2,
        email1: individual.email1,
        email2: individual.email2,
        address: individual.address,
        idNumber: individual.id_number,
        passportNumber: individual.passport_number,
        passportExpiry: individual.passport_expiry,
        emiratesId: individual.emirates_id,
        emiratesIdExpiry: individual.emirates_id_expiry,
        visaNumber: individual.visa_number,
        visaExpiry: individual.visa_expiry,
        licenseNumber: individual.license_number,
        creditLimit: individual.credit_limit,
        creditLimitDays: individual.credit_limit_days,
        dateOfRegistration: individual.date_of_registration,
        createdBy: individual.created_by,
        status: individual.status,
        lastActivity: individual.last_activity
      })) || [];

      setCompanies(transformedCompanies);
      setIndividuals(transformedIndividuals);
      setServices(servicesData || []);



      // Load service employees from database
      const serviceEmployeesData = await dbHelpers.getServiceEmployees();
      setServiceEmployees(serviceEmployeesData || []);



    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceBillings = async () => {
    try {
      const billingsData = await dbHelpers.getServiceBillings();
      setServiceBillings(billingsData || []);
    } catch (error) {
      console.error('Error loading service billings:', error);
    }
  };

  const testCreateBilling = async () => {
    try {
      console.log('Testing billing creation...');

      // Use the first available company and service
      const testCompany = companies[0];
      const testService = services[0];

      if (!testCompany || !testService) {
        alert('No companies or services available for testing');
        return;
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const billingData = {
        company_id: testCompany.id,
        individual_id: null,
        service_type_id: testService.id,
        assigned_employee_id: null,
        service_date: new Date().toISOString().split('T')[0],
        cash_type: 'cash',
        typing_charges: testService.typingCharges,
        government_charges: testService.governmentCharges,
        total_amount: testService.typingCharges + testService.governmentCharges,
        quantity: 1,
        status: 'pending',
        notes: 'Test billing',
        invoice_generated: true,
        invoice_number: invoiceNumber
      };

      console.log('Creating test billing:', billingData);
      const createdBilling = await dbHelpers.createServiceBilling(billingData);
      console.log('Test billing created:', createdBilling);

      alert(`✅ Test billing created successfully!\nInvoice: ${invoiceNumber}\nAmount: AED ${billingData.total_amount}`);

      await loadServiceBillings();
    } catch (error) {
      console.error('Error creating test billing:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const viewInvoice = (billing: any) => {
    setSelectedBilling(billing);
    setShowInvoiceModal(true);
  };

  const editBilling = (billing: any) => {
    setSelectedBilling(billing);
    // Populate edit form with existing billing data
    setEditBillingForm({
      clientType: billing.company_id ? 'company' : 'individual',
      companyId: billing.company_id || '',
      individualId: billing.individual_id || '',
      serviceTypeId: billing.service_type_id || '',
      assignedEmployeeId: billing.assigned_employee_id || '',
      serviceDate: billing.service_date || '',
      cashType: billing.cash_type || 'cash',
      quantity: billing.quantity?.toString() || '1',
      notes: billing.notes || ''
    });
    setShowEditBilling(true);
  };

  const handleEditBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBilling) return;

    try {
      const selectedService = services.find(s => s.id === editBillingForm.serviceTypeId);
      if (!selectedService) {
        alert('Please select a valid service');
        return;
      }

      const quantity = parseInt(editBillingForm.quantity);
      const typingCharges = selectedService.typingCharges * quantity;
      const governmentCharges = selectedService.governmentCharges * quantity;
      const totalAmount = typingCharges + governmentCharges;

      const updatedBillingData = {
        company_id: editBillingForm.clientType === 'company' && editBillingForm.companyId ? editBillingForm.companyId : null,
        individual_id: editBillingForm.clientType === 'individual' && editBillingForm.individualId ? editBillingForm.individualId : null,
        service_type_id: editBillingForm.serviceTypeId || null,
        assigned_employee_id: editBillingForm.assignedEmployeeId && editBillingForm.assignedEmployeeId !== '' ? editBillingForm.assignedEmployeeId : null,
        service_date: editBillingForm.serviceDate,
        cash_type: editBillingForm.cashType,
        typing_charges: typingCharges,
        government_charges: governmentCharges,
        total_amount: totalAmount,
        quantity: quantity,
        notes: editBillingForm.notes || null
      };

      // Update billing in database
      await dbHelpers.updateServiceBilling(selectedBilling.id, updatedBillingData);

      alert('✅ Service billing updated successfully!');

      setShowEditBilling(false);
      setSelectedBilling(null);

      // Reload data to show the updated billing
      await loadServiceBillings();
    } catch (error) {
      console.error('Error updating service billing:', error);
      alert(`❌ Error updating service billing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadInvoice = (billing: any) => {
    try {
      // Generate and download invoice as PDF
      generateInvoicePDF(billing);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    }
  };

  const generateMonthlyRevenueReport = async () => {
    try {
      setLoading(true);

      // Get all service billings
      const billings = await dbHelpers.getServiceBillings();

      // Filter by company if selected
      const filteredBillings = selectedCompanyForReport
        ? billings.filter(b => b.company_id === selectedCompanyForReport || b.individual_id === selectedCompanyForReport)
        : billings;

      // Group by month and calculate totals
      const monthlyData = filteredBillings.reduce((acc: any, billing: any) => {
        const date = new Date(billing.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: monthKey,
            serviceRevenue: 0,
            governmentCharges: 0,
            totalRevenue: 0,
            billingsCount: 0
          };
        }

        acc[monthKey].serviceRevenue += billing.typing_charges || 0;
        acc[monthKey].governmentCharges += billing.government_charges || 0;
        acc[monthKey].totalRevenue += billing.total_amount || 0;
        acc[monthKey].billingsCount += 1;

        return acc;
      }, {});

      setReportData(Object.values(monthlyData));
      setReportType('monthly-revenue');
      setShowReportModal(true);
    } catch (error) {
      console.error('Error generating monthly revenue report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentAnalysisReport = async () => {
    try {
      setLoading(true);

      const billings = await dbHelpers.getServiceBillings();
      const filteredBillings = selectedCompanyForReport
        ? billings.filter(b => b.company_id === selectedCompanyForReport || b.individual_id === selectedCompanyForReport)
        : billings;

      // Analyze payment patterns
      const paymentData = {
        totalBillings: filteredBillings.length,
        totalRevenue: filteredBillings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        serviceRevenue: filteredBillings.reduce((sum, b) => sum + (b.typing_charges || 0), 0),
        governmentCharges: filteredBillings.reduce((sum, b) => sum + (b.government_charges || 0), 0),
        averageBillingAmount: filteredBillings.length > 0
          ? filteredBillings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / filteredBillings.length
          : 0,
        paymentMethods: filteredBillings.reduce((acc: any, billing: any) => {
          const method = billing.cash_type || 'Unknown';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {})
      };

      setReportData(paymentData);
      setReportType('payment-analysis');
      setShowReportModal(true);
    } catch (error) {
      console.error('Error generating payment analysis report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateServicePerformanceReport = async () => {
    try {
      setLoading(true);

      const billings = await dbHelpers.getServiceBillings();
      const filteredBillings = selectedCompanyForReport
        ? billings.filter(b => b.company_id === selectedCompanyForReport || b.individual_id === selectedCompanyForReport)
        : billings;

      // Group by service type
      const serviceData = filteredBillings.reduce((acc: any, billing: any) => {
        const serviceName = billing.service_type?.name || 'Unknown Service';

        if (!acc[serviceName]) {
          acc[serviceName] = {
            name: serviceName,
            count: 0,
            revenue: 0,
            averageAmount: 0
          };
        }

        acc[serviceName].count += 1;
        acc[serviceName].revenue += billing.total_amount || 0;

        return acc;
      }, {});

      // Calculate averages
      Object.values(serviceData).forEach((service: any) => {
        service.averageAmount = service.count > 0 ? service.revenue / service.count : 0;
      });

      setReportData(Object.values(serviceData));
      setReportType('service-performance');
      setShowReportModal(true);
    } catch (error) {
      console.error('Error generating service performance report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoicePDF = (billing: any) => {
    // Create invoice HTML content
    const invoiceHTML = generateInvoiceHTML(billing);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const generateInvoiceHTML = (billing: any) => {
    const currentDate = new Date().toLocaleDateString();
    const serviceDate = billing.service_date ? new Date(billing.service_date).toLocaleDateString() : 'N/A';

    // Safely get client information
    const clientName = billing.company?.company_name || billing.individual?.individual_name || 'N/A';
    const serviceName = billing.service_type?.name || 'Service';
    const invoiceNumber = billing.invoice_number || 'N/A';
    const quantity = billing.quantity || 1;
    const typingCharges = parseFloat(billing.typing_charges || 0);
    const governmentCharges = parseFloat(billing.government_charges || 0);
    const totalAmount = parseFloat(billing.total_amount || 0);
    const cashType = billing.cash_type || 'N/A';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${billing.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .invoice-header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #666; margin-bottom: 20px; }
          .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .invoice-info, .client-info { width: 48%; }
          .info-title { font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }
          .info-row { margin-bottom: 5px; }
          .services-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .services-table th, .services-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .services-table th { background-color: #f8f9fa; font-weight: bold; }
          .total-section { text-align: right; margin-bottom: 30px; }
          .total-row { margin-bottom: 5px; }
          .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #2563eb; padding-top: 10px; }
          .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-name">SERVIGENCE</div>
          <div class="company-tagline">Professional Business Services</div>
          <div class="invoice-title">INVOICE</div>
        </div>

        <div class="invoice-details">
          <div class="invoice-info">
            <div class="info-title">Invoice Details</div>
            <div class="info-row"><strong>Invoice Number:</strong> ${invoiceNumber}</div>
            <div class="info-row"><strong>Invoice Date:</strong> ${currentDate}</div>
            <div class="info-row"><strong>Service Date:</strong> ${serviceDate}</div>
            <div class="info-row"><strong>Payment Method:</strong> ${cashType.toUpperCase()}</div>
          </div>

          <div class="client-info">
            <div class="info-title">Bill To</div>
            <div class="info-row"><strong>Client:</strong> ${clientName}</div>
            ${billing.company ? `
              <div class="info-row"><strong>Company:</strong> ${billing.company.company_name}</div>
              <div class="info-row"><strong>Trade License:</strong> ${billing.company.trade_license_number || 'N/A'}</div>
            ` : ''}
          </div>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th>Service Description</th>
              <th>Quantity</th>
              <th>Service Charge</th>
              <th>Government Charge</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${serviceName}</td>
              <td>${quantity}</td>
              <td>AED ${typingCharges.toFixed(2)}</td>
              <td>AED ${governmentCharges.toFixed(2)}</td>
              <td>AED ${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">Service Charges: AED ${typingCharges.toFixed(2)}</div>
          <div class="total-row">Government Charges: AED ${governmentCharges.toFixed(2)}</div>
          <div class="total-final">Total Amount: AED ${totalAmount.toFixed(2)}</div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Servigence for your business needs.</p>
          <p>For any queries, please contact us at info@servigence.com</p>
        </div>
      </body>
      </html>
    `;
  };

  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = mockInvoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
  const completedServices = mockServices.filter(s => s.status === 'completed').length;

  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Simplified validation for testing
    if (billingForm.clientType === 'company' && !billingForm.companyId) {
      newErrors.companyId = 'Please select a company';
    }

    if (billingForm.clientType === 'individual' && !billingForm.individualId) {
      newErrors.individualId = 'Please select an individual';
    }

    if (!billingForm.serviceTypeId) {
      newErrors.serviceTypeId = 'Please select a service';
    }

    if (!billingForm.serviceDate) newErrors.serviceDate = 'Service date is required';
    if (!billingForm.quantity || parseInt(billingForm.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const selectedService = services.find(s => s.id === billingForm.serviceTypeId);
      if (!selectedService) return;

      const quantity = parseInt(billingForm.quantity);
      const typingCharges = selectedService.typingCharges * quantity;
      const governmentCharges = selectedService.governmentCharges * quantity;
      const totalAmount = typingCharges + governmentCharges;

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const billingData = {
        company_id: billingForm.clientType === 'company' && billingForm.companyId ? billingForm.companyId : null,
        individual_id: billingForm.clientType === 'individual' && billingForm.individualId ? billingForm.individualId : null,
        service_type_id: billingForm.serviceTypeId || null,
        assigned_employee_id: billingForm.assignedEmployeeId && billingForm.assignedEmployeeId !== '' ? billingForm.assignedEmployeeId : null,
        service_date: billingForm.serviceDate,
        cash_type: billingForm.cashType,
        typing_charges: typingCharges,
        government_charges: governmentCharges,
        total_amount: totalAmount,
        quantity: quantity,
        status: 'pending',
        notes: billingForm.notes || null,
        invoice_generated: true,
        invoice_number: invoiceNumber
      };

      const createdBilling = await dbHelpers.createServiceBilling(billingData);

      // Create account transactions linked to the billing
      if (typingCharges > 0) {
        await dbHelpers.createAccountTransaction({
          service_billing_id: createdBilling.id,
          company_id: billingForm.clientType === 'company' && billingForm.companyId ? billingForm.companyId : null,
          individual_id: billingForm.clientType === 'individual' && billingForm.individualId ? billingForm.individualId : null,
          transaction_type: 'service_charge',
          category: 'Service Revenue',
          description: `Service charges for ${selectedService.name} (${invoiceNumber})`,
          amount: typingCharges,
          transaction_date: billingForm.serviceDate,
          payment_method: billingForm.cashType === 'cash' ? 'cash' : 'bank_transfer',
          reference_number: invoiceNumber,
          status: 'completed',
          created_by: 'System'
        });
      }

      if (governmentCharges > 0) {
        await dbHelpers.createAccountTransaction({
          service_billing_id: createdBilling.id,
          company_id: billingForm.clientType === 'company' && billingForm.companyId ? billingForm.companyId : null,
          individual_id: billingForm.clientType === 'individual' && billingForm.individualId ? billingForm.individualId : null,
          transaction_type: 'government_fee',
          category: 'Government Charges',
          description: `Government charges for ${selectedService.name} (${invoiceNumber})`,
          amount: governmentCharges,
          transaction_date: billingForm.serviceDate,
          payment_method: billingForm.cashType === 'cash' ? 'cash' : 'bank_transfer',
          reference_number: invoiceNumber,
          status: 'completed',
          created_by: 'System'
        });
      }

      // Success feedback
      alert(`✅ Service billing created successfully!\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: AED ${totalAmount.toFixed(2)}\n\nBilling and invoice have been generated.`);

      resetForm();
      setShowCreateBilling(false);

      // Reload data to show the new billing
      await loadServiceBillings();
    } catch (error) {
      console.error('Error creating service billing:', error);
      // Show user-friendly error message
      alert(`❌ Error creating service billing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setBillingForm({
      clientType: 'company',
      companyId: '',
      individualId: '',
      serviceTypeId: '',
      assignedEmployeeId: '',
      serviceDate: new Date().toISOString().split('T')[0],
      cashType: 'cash',
      quantity: '1',
      notes: ''
    });
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBillingForm(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const getSelectedService = () => {
    return services.find(s => s.id === billingForm.serviceTypeId);
  };

  const calculateTotal = () => {
    const selectedService = getSelectedService();
    if (!selectedService) return { typing: 0, government: 0, total: 0 };

    const quantity = parseInt(billingForm.quantity) || 1;
    const typing = selectedService.typingCharges * quantity;
    const government = selectedService.governmentCharges * quantity;

    return {
      typing,
      government,
      total: typing + government
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Billing</h1>
              <p className="text-gray-500 mt-1">Create and manage service billings with invoice generation</p>
            </div>
            <button
              onClick={() => setShowCreateBilling(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Billing</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">AED {totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                  <p className="text-2xl font-bold text-gray-900">AED {pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed Services</p>
                  <p className="text-2xl font-bold text-gray-900">{completedServices}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Services</p>
                  <p className="text-2xl font-bold text-gray-900">{mockServices.filter(s => s.status === 'in_progress').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeTab === 'billing' && (
          <div className="p-6">
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Service Billing Dashboard</h3>
              <p className="text-gray-500 mb-6">Overview of your service billing activities and revenue.</p>
              <button
                onClick={() => setShowCreateBilling(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Billing</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Service Billings</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search billings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_quarter">This Quarter</option>
                    <option value="this_year">This Year</option>
                  </select>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Services</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {serviceBillings.length > 0 ? serviceBillings.map((billing: any) => (
                    <tr key={billing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {billing.invoice_number || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(billing.service_date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {billing.company?.company_name || billing.individual?.individual_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {billing.service_type?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Qty: {billing.quantity || 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          AED {parseFloat(billing.total_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Service: AED {parseFloat(billing.typing_charges || 0).toFixed(2)} |
                          Govt: AED {parseFloat(billing.government_charges || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(billing.status)}`}>
                          {billing.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </span>
                        {billing.invoice_generated && (
                          <div className="text-xs text-green-600 mt-1">✓ Invoice Generated</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewInvoice(billing)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => editBilling(billing)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Billing"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadInvoice(billing)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No service billings found</h3>
                          <p className="text-gray-600 mb-4">Start by creating your first service billing.</p>
                          <button
                            onClick={() => setShowCreateBilling(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            Create Billing
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-6">
            {/* Company Selection */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Company/Individual (Optional)
              </label>
              <select
                value={selectedCompanyForReport}
                onChange={(e) => setSelectedCompanyForReport(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Companies & Individuals</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.companyName} (Company)
                  </option>
                ))}
                {individuals.map((individual) => (
                  <option key={individual.id} value={individual.id}>
                    {individual.individualName} (Individual)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <FileText className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Revenue Report</h3>
                <p className="text-gray-500 mb-4">Comprehensive monthly revenue breakdown by service type</p>
                <button
                  onClick={generateMonthlyRevenueReport}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <DollarSign className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Analysis</h3>
                <p className="text-gray-500 mb-4">Analysis of payment patterns and outstanding amounts</p>
                <button
                  onClick={generatePaymentAnalysisReport}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <TrendingUp className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Performance</h3>
                <p className="text-gray-500 mb-4">Performance metrics for different service categories</p>
                <button
                  onClick={generateServicePerformanceReport}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'completion' && (
          <div>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Service Completion Tracking</h2>
              <p className="text-gray-500 mt-1">Monitor and track completion status of all services</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        <div className="text-sm text-gray-500">{service.type.replace('_', ' ').toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{mockInvoices.find(inv => inv.companyId === service.companyId)?.companyName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{service.assignedTo || 'Unassigned'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${
                            service.status === 'completed' ? 'bg-green-500 w-full' :
                            service.status === 'in_progress' ? 'bg-blue-500 w-3/4' :
                            'bg-yellow-500 w-1/4'
                          }`}></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{new Date(service.dueDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                          {service.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Billing Modal */}
      {showCreateBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create Service Billing</h2>
                <button
                  onClick={() => {
                    setShowCreateBilling(false);
                    resetForm();
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientType"
                        value="company"
                        checked={billingForm.clientType === 'company'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <Building2 className="w-4 h-4 mr-1" />
                      Company
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientType"
                        value="individual"
                        checked={billingForm.clientType === 'individual'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <User className="w-4 h-4 mr-1" />
                      Individual
                    </label>
                  </div>
                </div>

                {/* Company/Individual Selection */}
                {billingForm.clientType === 'company' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Company <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="companyId"
                      value={billingForm.companyId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.companyId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                    {errors.companyId && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.companyId}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Individual <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="individualId"
                      value={billingForm.individualId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.individualId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select an individual</option>
                      {individuals.map((individual) => (
                        <option key={individual.id} value={individual.id}>
                          {individual.individualName}
                        </option>
                      ))}
                    </select>
                    {errors.individualId && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.individualId}
                      </p>
                    )}
                  </div>
                )}

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="serviceTypeId"
                    value={billingForm.serviceTypeId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.serviceTypeId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - AED {service.typingCharges + service.governmentCharges}
                      </option>
                    ))}
                  </select>
                  {errors.serviceTypeId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.serviceTypeId}
                    </p>
                  )}
                </div>

                {/* Employee Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Employee</label>
                  <select
                    name="assignedEmployeeId"
                    value={billingForm.assignedEmployeeId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee (optional)</option>
                    {serviceEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - {employee.department}
                      </option>
                    ))}
                  </select>
                </div>



                {/* Service Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="serviceDate"
                    value={billingForm.serviceDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.serviceDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.serviceDate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.serviceDate}
                    </p>
                  )}
                </div>

                {/* Cash Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cash Type</label>
                  <select
                    name="cashType"
                    value={billingForm.cashType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {cashTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={billingForm.quantity}
                    onChange={handleInputChange}
                    min="1"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.quantity}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={billingForm.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes or comments"
                  />
                </div>

                {/* Cost Breakdown */}
                {getSelectedService() && (
                  <div className="lg:col-span-2 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Cost Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Typing Charges (Profit):</span>
                        <span className="font-medium text-green-600">AED {calculateTotal().typing.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Government Charges:</span>
                        <span className="font-medium text-blue-600">AED {calculateTotal().government.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-gray-300 pt-2">
                        <span className="font-medium">Total Amount:</span>
                        <span className="font-bold text-lg text-gray-900">AED {calculateTotal().total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBilling(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>Create Billing & Generate Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Invoice Preview</h2>
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setSelectedBilling(null);
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Invoice Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-blue-600 mb-2">SERVIGENCE</h1>
                <p className="text-gray-600 mb-4">Professional Business Services</p>
                <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b-2 border-blue-600 pb-2">Invoice Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Invoice Number:</span> {selectedBilling.invoice_number}</p>
                    <p><span className="font-medium">Invoice Date:</span> {new Date().toLocaleDateString()}</p>
                    <p><span className="font-medium">Service Date:</span> {new Date(selectedBilling.service_date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Payment Method:</span> {selectedBilling.cash_type?.toUpperCase()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b-2 border-blue-600 pb-2">Bill To</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Client:</span> {selectedBilling.company?.company_name || selectedBilling.individual?.individual_name || 'N/A'}</p>
                    {selectedBilling.company && (
                      <>
                        <p><span className="font-medium">Company:</span> {selectedBilling.company.company_name}</p>
                        <p><span className="font-medium">Trade License:</span> {selectedBilling.company.trade_license_number || 'N/A'}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="mb-8">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Service Description</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Quantity</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Service Charge</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Government Charge</th>
                      <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3">{selectedBilling.service_type?.name || 'Service'}</td>
                      <td className="border border-gray-300 px-4 py-3">{selectedBilling.quantity || 1}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">AED {parseFloat(selectedBilling.typing_charges || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">AED {parseFloat(selectedBilling.government_charges || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-semibold">AED {parseFloat(selectedBilling.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Section */}
              <div className="text-right mb-8">
                <div className="inline-block">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center w-64">
                      <span>Service Charges:</span>
                      <span>AED {parseFloat(selectedBilling.typing_charges || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-64">
                      <span>Government Charges:</span>
                      <span>AED {parseFloat(selectedBilling.government_charges || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-64 text-lg font-bold border-t-2 border-blue-600 pt-2">
                      <span>Total Amount:</span>
                      <span>AED {parseFloat(selectedBilling.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-gray-600 border-t pt-6">
                <p className="mb-2">Thank you for choosing Servigence for your business needs.</p>
                <p>For any queries, please contact us at info@servigence.com</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowInvoiceModal(false);
                    setSelectedBilling(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadInvoice(selectedBilling)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Billing Modal */}
      {showEditBilling && selectedBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Service Billing</h2>
                <button
                  onClick={() => {
                    setShowEditBilling(false);
                    setSelectedBilling(null);
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditBillingSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Selection */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientType"
                        value="company"
                        checked={editBillingForm.clientType === 'company'}
                        onChange={(e) => setEditBillingForm(prev => ({ ...prev, clientType: e.target.value as 'company' | 'individual' }))}
                        className="mr-2"
                      />
                      <Building2 className="w-4 h-4 mr-1" />
                      Company
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="clientType"
                        value="individual"
                        checked={editBillingForm.clientType === 'individual'}
                        onChange={(e) => setEditBillingForm(prev => ({ ...prev, clientType: e.target.value as 'company' | 'individual' }))}
                        className="mr-2"
                      />
                      <User className="w-4 h-4 mr-1" />
                      Individual
                    </label>
                  </div>
                </div>

                {/* Company/Individual Selection */}
                {editBillingForm.clientType === 'company' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Company <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="companyId"
                      value={editBillingForm.companyId}
                      onChange={(e) => setEditBillingForm(prev => ({ ...prev, companyId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select a company</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Individual <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="individualId"
                      value={editBillingForm.individualId}
                      onChange={(e) => setEditBillingForm(prev => ({ ...prev, individualId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Select an individual</option>
                      {individuals.map((individual) => (
                        <option key={individual.id} value={individual.id}>
                          {individual.individualName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="serviceTypeId"
                    value={editBillingForm.serviceTypeId}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, serviceTypeId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - AED {service.typingCharges + service.governmentCharges}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Employee</label>
                  <select
                    name="assignedEmployeeId"
                    value={editBillingForm.assignedEmployeeId}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, assignedEmployeeId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select an employee (optional)</option>
                    {serviceEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="serviceDate"
                    value={editBillingForm.serviceDate}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                {/* Cash Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cash Type</label>
                  <select
                    name="cashType"
                    value={editBillingForm.cashType}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, cashType: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {cashTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={editBillingForm.quantity}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                    required
                  />
                </div>

                {/* Notes */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={editBillingForm.notes}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Additional notes or comments"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBilling(false);
                    setSelectedBilling(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  Update Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {reportType === 'monthly-revenue' && 'Monthly Revenue Report'}
                  {reportType === 'payment-analysis' && 'Payment Analysis Report'}
                  {reportType === 'service-performance' && 'Service Performance Report'}
                </h2>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportData(null);
                    setReportType('');
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {reportType === 'monthly-revenue' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Revenue Breakdown</h3>
                    <p className="text-gray-600">Revenue analysis by month</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Month</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Service Revenue</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Government Charges</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Total Revenue</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Billings Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{row.month}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {row.serviceRevenue.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {row.governmentCharges.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold">AED {row.totalRevenue.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{row.billingsCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportType === 'payment-analysis' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Analysis</h3>
                    <p className="text-gray-600">Analysis of payment patterns and revenue breakdown</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900">Total Billings</h4>
                      <p className="text-2xl font-bold text-blue-600">{reportData.totalBillings}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900">Total Revenue</h4>
                      <p className="text-2xl font-bold text-green-600">AED {reportData.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900">Service Revenue</h4>
                      <p className="text-2xl font-bold text-purple-600">AED {reportData.serviceRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-900">Government Charges</h4>
                      <p className="text-2xl font-bold text-orange-600">AED {reportData.governmentCharges.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Average Billing Amount</h4>
                    <p className="text-xl font-bold text-gray-700">AED {reportData.averageBillingAmount.toFixed(2)}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Payment Methods Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(reportData.paymentMethods).map(([method, count]: [string, any]) => (
                        <div key={method} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="capitalize">{method.replace('_', ' ')}</span>
                          <span className="font-semibold">{count} transactions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {reportType === 'service-performance' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Performance Report</h3>
                    <p className="text-gray-600">Performance metrics for different service categories</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Service Name</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Count</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Total Revenue</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Average Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((service: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{service.name}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{service.count}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {service.revenue.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {service.averageAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => {
                    // Export report as CSV
                    const csvData = reportType === 'monthly-revenue'
                      ? reportData.map((row: any) => [row.month, row.serviceRevenue, row.governmentCharges, row.totalRevenue, row.billingsCount])
                      : reportType === 'service-performance'
                      ? reportData.map((service: any) => [service.name, service.count, service.revenue, service.averageAmount])
                      : [];

                    if (csvData.length > 0) {
                      const headers = reportType === 'monthly-revenue'
                        ? ['Month', 'Service Revenue', 'Government Charges', 'Total Revenue', 'Billings Count']
                        : ['Service Name', 'Count', 'Total Revenue', 'Average Amount'];

                      const csvContent = [
                        headers.join(','),
                        ...csvData.map((row: any[]) => row.join(','))
                      ].join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportData(null);
                    setReportType('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBilling;