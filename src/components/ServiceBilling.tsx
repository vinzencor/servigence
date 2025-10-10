import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, Calendar, Filter, Download, Eye, Edit, Plus, Search, Building2, User, AlertCircle, Save, CreditCard, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockServices, mockInvoices } from '../data/mockData';
import { Company, Individual, ServiceType, ServiceEmployee, ServiceBilling as ServiceBillingType } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DailyCardSummary from './DailyCardSummary';

const ServiceBilling: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
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
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [paymentCards, setPaymentCards] = useState<any[]>([]);
  const [cardBalances, setCardBalances] = useState<any[]>([]);

  const [serviceBillings, setServiceBillings] = useState<ServiceBillingType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [selectedCompanyForReport, setSelectedCompanyForReport] = useState('');

  // Advance Payment states
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedBillingForPayment, setSelectedBillingForPayment] = useState<any>(null);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });

  // Receipt states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Payment history states
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedBillingForHistory, setSelectedBillingForHistory] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [billingDetails, setBillingDetails] = useState<any>(null);

  const [billingForm, setBillingForm] = useState({
    clientType: 'company' as 'company' | 'individual',
    companyId: '',
    individualId: '',
    serviceTypeId: '',
    assignedEmployeeId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    cashType: 'cash' as 'cash' | 'bank' | 'card' | 'cheque' | 'online',
    quantity: '1',
    notes: '',
    assignedVendorId: '',
    vendorCost: '0',
    discount: '0',
    cardId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCompanyCredit, setSelectedCompanyCredit] = useState<{
    creditLimit: number;
    availableCredit: number;
    totalOutstanding: number;
    creditUsagePercentage: number;
  } | null>(null);

  // Edit billing form state
  const [editBillingForm, setEditBillingForm] = useState({
    clientType: 'company' as 'company' | 'individual',
    companyId: '',
    individualId: '',
    serviceTypeId: '',
    assignedEmployeeId: '',
    serviceDate: '',
    cashType: 'cash' as 'cash' | 'bank' | 'card' | 'cheque' | 'online',
    quantity: '1',
    notes: '',
    assignedVendorId: '',
    vendorCost: '0',
    vatPercentage: '0',
    discount: '0',
    cardId: ''
  });

  const tabs = [
    { id: 'billing', label: 'Service Billing', icon: DollarSign },
    { id: 'list', label: 'Billing List', icon: FileText },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  const cashTypes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'card', label: 'Credit Card' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'online', label: 'Online Payment' }
  ];

  useEffect(() => {
    console.log('ServiceBilling component mounted, user:', user);
    console.log('Environment variables:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
    });
    loadData();
    loadServiceBillings();
  }, []);

  // Add a refresh mechanism that can be triggered
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'company_updated') {
        loadData(); // Refresh companies when a company is updated
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadData = async () => {
    if (!user) {
      console.log('No user authenticated, skipping data load');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [companiesData, individualsData, servicesData, vendorsData, paymentCardsData] = await Promise.all([
        dbHelpers.getCompanies(user?.service_employee_id, user?.role),
        dbHelpers.getIndividuals(user?.service_employee_id, user?.role),
        dbHelpers.getServices(),
        dbHelpers.getVendors(),
        dbHelpers.getPaymentCards()
      ]);

      console.log('Raw companies data:', companiesData);
      console.log('Raw services data:', servicesData);

      // Transform company data
      const transformedCompanies = (companiesData || []).map((company: any) => ({
        id: company.id,
        companyName: company.company_name,
        phone1: company.phone1,
        email1: company.email1,
        status: company.status
      }));

      console.log('Loaded companies data:', transformedCompanies);
      console.log('Loaded services data:', servicesData);

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

      // Set vendors and payment cards
      setVendors(vendorsData || []);
      setPaymentCards(paymentCardsData || []);
      console.log('Loaded payment cards:', paymentCardsData);

      // Load card balances for enhanced display
      try {
        const balancesData = await dbHelpers.getCardBalances();
        setCardBalances(balancesData || []);
        console.log('Loaded card balances:', balancesData);
      } catch (error) {
        console.error('Error loading card balances:', error);
        setCardBalances([]);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServiceBillings = async () => {
    if (!user) {
      console.log('No user authenticated, skipping service billings load');
      return;
    }

    try {
      const billingsData = await dbHelpers.getServiceBillings(user?.service_employee_id, user?.role);
      setServiceBillings(billingsData || []);
    } catch (error) {
      console.error('Error loading service billings:', error);
    }
  };

  const loadCompanyEmployees = async (companyId: string) => {
    try {
      console.log('Loading employees for company:', companyId);
      const employeesData = await dbHelpers.getEmployees(companyId);
      console.log('Loaded company employees:', employeesData);
      setCompanyEmployees(employeesData || []);
    } catch (error) {
      console.error('Error loading company employees:', error);
      setCompanyEmployees([]);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');

      // Test basic connection
      const { data: testData, error } = await supabase
        .from('service_types')
        .select('id, name')
        .limit(1);

      if (error) {
        console.error('Supabase connection error:', error);
        alert('Supabase connection failed: ' + error.message);
        return;
      }

      console.log('Supabase connection successful:', testData);
      alert('Supabase connection successful! Found ' + (testData?.length || 0) + ' service types');
    } catch (error) {
      console.error('Connection test error:', error);
      alert('Connection test failed: ' + error);
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
      assignedEmployeeId: billing.company_employee_id || billing.assigned_employee_id || '',
      serviceDate: billing.service_date || '',
      cashType: billing.cash_type || 'cash',
      quantity: billing.quantity?.toString() || '1',
      notes: billing.notes || '',
      assignedVendorId: billing.assigned_vendor_id || '',
      vendorCost: billing.vendor_cost?.toString() || '0',
      vatPercentage: billing.vat_percentage?.toString() || '0',
      discount: billing.discount?.toString() || '0',
      cardId: billing.card_id || ''
    });

    // Load company employees if it's a company billing
    if (billing.company_id) {
      loadCompanyEmployees(billing.company_id);
    }

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
      const discount = parseFloat(editBillingForm.discount) || 0;
      const vendorCost = parseFloat(editBillingForm.vendorCost) || 0;
      const subtotal = typingCharges + governmentCharges;
      const totalAmount = Math.max(0, subtotal - discount);
      const profit = typingCharges - vendorCost;

      // Calculate VAT
      const vatPercentage = parseFloat(editBillingForm.vatPercentage) || 0;
      const vatAmount = (totalAmount * vatPercentage) / 100;
      const totalAmountWithVat = totalAmount + vatAmount;

      const updatedBillingData = {
        company_id: editBillingForm.clientType === 'company' && editBillingForm.companyId ? editBillingForm.companyId : null,
        individual_id: editBillingForm.clientType === 'individual' && editBillingForm.individualId ? editBillingForm.individualId : null,
        service_type_id: editBillingForm.serviceTypeId || null,
        // Use company_employee_id for company employees, assigned_employee_id for service employees
        assigned_employee_id: editBillingForm.clientType === 'individual' && editBillingForm.assignedEmployeeId && editBillingForm.assignedEmployeeId !== '' ? editBillingForm.assignedEmployeeId : null,
        company_employee_id: editBillingForm.clientType === 'company' && editBillingForm.assignedEmployeeId && editBillingForm.assignedEmployeeId !== '' ? editBillingForm.assignedEmployeeId : null,
        service_date: editBillingForm.serviceDate,
        cash_type: editBillingForm.cashType,
        typing_charges: typingCharges,
        government_charges: governmentCharges,
        discount: discount,
        total_amount: totalAmount,
        // profit: profit, // Temporarily removed until profit column is added to database
        // vat_percentage: vatPercentage, // Temporarily removed until column is added
        // vat_amount: vatAmount, // Temporarily removed until column is added
        // total_amount_with_vat: totalAmountWithVat, // Temporarily removed until column is added
        quantity: quantity,
        notes: editBillingForm.notes || null,
        // assigned_vendor_id: editBillingForm.assignedVendorId || null, // Temporarily removed until column is added
        // vendor_cost: vendorCost, // Temporarily removed until column is added
        card_id: editBillingForm.cashType === 'card' && editBillingForm.cardId ? editBillingForm.cardId : null
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
      const billings = await dbHelpers.getServiceBillings(user?.service_employee_id, user?.role);

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

      const billings = await dbHelpers.getServiceBillings(user?.service_employee_id, user?.role);
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

  const exportBillingList = () => {
    try {
      // Prepare CSV data
      const csvData = [
        ['Invoice Number', 'Date', 'Client', 'Service', 'Quantity', 'Service Charges', 'Government Charges', 'Discount', 'Total Amount', 'Profit', 'Status'],
        ...serviceBillings.map((billing: any) => [
          billing.invoice_number || 'N/A',
          new Date(billing.service_date).toLocaleDateString(),
          billing.company?.company_name || billing.individual?.individual_name || 'N/A',
          billing.service_type?.name || 'N/A',
          billing.quantity || 1,
          parseFloat(billing.typing_charges || 0).toFixed(2),
          parseFloat(billing.government_charges || 0).toFixed(2),
          parseFloat(billing.discount || 0).toFixed(2),
          parseFloat(billing.total_amount || 0).toFixed(2),
          parseFloat(billing.profit || 0).toFixed(2),
          billing.status?.replace('_', ' ').toUpperCase() || 'PENDING'
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-billings-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('✅ Billing list exported successfully!');
    } catch (error) {
      console.error('Error exporting billing list:', error);
      alert('❌ Error exporting billing list. Please try again.');
    }
  };

  const generateServicePerformanceReport = async () => {
    try {
      setLoading(true);

      const billings = await dbHelpers.getServiceBillings(user?.service_employee_id, user?.role);
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
            profit: 0,
            governmentCharges: 0,
            averageAmount: 0,
            averageProfit: 0
          };
        }

        acc[serviceName].count += 1;
        acc[serviceName].revenue += billing.total_amount || 0;
        acc[serviceName].profit += billing.typing_charges || 0;
        acc[serviceName].governmentCharges += billing.government_charges || 0;

        return acc;
      }, {});

      // Calculate averages
      Object.values(serviceData).forEach((service: any) => {
        service.averageAmount = service.count > 0 ? service.revenue / service.count : 0;
        service.averageProfit = service.count > 0 ? service.profit / service.count : 0;
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
    const discount = parseFloat(billing.discount || 0);
    const subtotal = typingCharges + governmentCharges;
    const totalAmount = parseFloat(billing.total_amount || 0);
    const vatPercentage = parseFloat(billing.vat_percentage || 0);
    const vatAmount = parseFloat(billing.vat_amount || 0);
    const totalAmountWithVat = parseFloat(billing.total_amount_with_vat || totalAmount);
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
              <div class="info-row"><strong>Credit Limit:</strong> AED ${(billing.company.credit_limit || 0).toFixed(2)}</div>
            ` : billing.individual ? `
              <div class="info-row"><strong>Individual:</strong> ${billing.individual.individual_name}</div>
              <div class="info-row"><strong>Credit Limit:</strong> AED ${(billing.individual.credit_limit || 0).toFixed(2)}</div>
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
          <div class="total-row">Subtotal: AED ${subtotal.toFixed(2)}</div>
          ${discount > 0 ? `<div class="total-row" style="color: #dc2626;">Discount: -AED ${discount.toFixed(2)}</div>` : ''}
          <div class="total-row">Net Amount: AED ${totalAmount.toFixed(2)}</div>
          ${vatPercentage > 0 ? `<div class="total-row">VAT (${vatPercentage}%): AED ${vatAmount.toFixed(2)}</div>` : ''}
          <div class="total-final">Total Amount: AED ${totalAmountWithVat.toFixed(2)}</div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Servigence for your business needs.</p>
          <p>For any queries, please contact us at info@servigence.com</p>
        </div>
      </body>
      </html>
    `;
  };

  // Calculate actual revenue and profit from service billings
  const totalRevenue = serviceBillings.reduce((sum, billing) => sum + (parseFloat(billing.total_amount) || 0), 0);
  const totalProfit = serviceBillings.reduce((sum, billing) => sum + (parseFloat(billing.typing_charges) || 0), 0);
  const totalGovernmentCharges = serviceBillings.reduce((sum, billing) => sum + (parseFloat(billing.government_charges) || 0), 0);
  const pendingAmount = serviceBillings.filter(billing => billing.status === 'pending').reduce((sum, billing) => sum + (parseFloat(billing.total_amount) || 0), 0);
  const completedServices = serviceBillings.filter(billing => billing.status === 'completed').length;

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

    // Validate card selection when cash type is 'card'
    if (billingForm.cashType === 'card' && !billingForm.cardId) {
      newErrors.cardId = 'Please select a payment card when cash type is credit card';
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
      const discount = parseFloat(billingForm.discount) || 0;
      const vendorCost = parseFloat(billingForm.vendorCost) || 0;
      const subtotal = typingCharges + governmentCharges;
      const totalAmount = Math.max(0, subtotal - discount);
      const profit = typingCharges - vendorCost;

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const billingData = {
        company_id: billingForm.clientType === 'company' && billingForm.companyId ? billingForm.companyId : null,
        individual_id: billingForm.clientType === 'individual' && billingForm.individualId ? billingForm.individualId : null,
        service_type_id: billingForm.serviceTypeId || null,
        // Use company_employee_id for company employees, assigned_employee_id for service employees
        assigned_employee_id: billingForm.clientType === 'individual' && billingForm.assignedEmployeeId && billingForm.assignedEmployeeId !== '' ? billingForm.assignedEmployeeId : null,
        company_employee_id: billingForm.clientType === 'company' && billingForm.assignedEmployeeId && billingForm.assignedEmployeeId !== '' ? billingForm.assignedEmployeeId : null,
        service_date: billingForm.serviceDate,
        cash_type: billingForm.cashType,
        typing_charges: typingCharges,
        government_charges: governmentCharges,
        discount: discount,
        total_amount: totalAmount,
        // profit: profit, // Temporarily removed until profit column is added to database
        quantity: quantity,
        status: 'pending',
        notes: billingForm.notes || null,
        invoice_generated: true,
        invoice_number: invoiceNumber,
        // assigned_vendor_id: billingForm.assignedVendorId || null, // Temporarily removed until column is added
        // vendor_cost: vendorCost, // Temporarily removed until column is added
        card_id: billingForm.cashType === 'card' && billingForm.cardId ? billingForm.cardId : null
      };

      console.log('🔍 Billing form data:', billingForm);
      console.log('🔍 Billing data to send:', billingData);
      console.log('🔍 Cash type from form:', billingForm.cashType, 'Type:', typeof billingForm.cashType);
      console.log('🔍 Cash type in data:', billingData.cash_type, 'Type:', typeof billingData.cash_type);

      const createdBilling = await dbHelpers.createServiceBilling(billingData);

      // Check credit limit and create due entry if needed (only for companies)
      if (billingForm.clientType === 'company' && billingForm.companyId) {
        try {
          const creditUsage = await dbHelpers.getCompanyCreditUsage(billingForm.companyId);
          console.log('🔍 Credit usage for company:', creditUsage);
          console.log('💰 Total amount:', totalAmount);
          console.log('💳 Available credit:', creditUsage.availableCredit);

          // If the total amount exceeds available credit, create a due entry
          if (totalAmount > creditUsage.availableCredit) {
            const paidAmount = Math.max(0, creditUsage.availableCredit);
            const dueAmount = totalAmount - paidAmount;

            console.log('⚠️ Credit limit exceeded!');
            console.log('💵 Company will pay:', paidAmount);
            console.log('📋 Due amount:', dueAmount);

            if (dueAmount > 0) {
              const dueData = {
                company_id: billingForm.companyId,
                employee_id: billingForm.assignedEmployeeId || null,
                service_billing_id: createdBilling.id,
                original_amount: totalAmount,
                paid_amount: paidAmount,
                due_amount: dueAmount,
                service_date: billingForm.serviceDate,
                due_date: new Date(Date.now() + (creditUsage.creditLimit > 0 ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days for credit customers, 7 days for others
                status: paidAmount > 0 ? 'partial' : 'pending',
                priority: dueAmount > 10000 ? 'high' : 'medium',
                service_name: selectedService.name,
                service_description: `${selectedService.name} - Quantity: ${quantity}`,
                invoice_number: invoiceNumber,
                notes: `Service billing exceeded credit limit. Company paid: AED ${paidAmount.toFixed(2)}, Due amount: AED ${dueAmount.toFixed(2)}`,
                created_by: 'System'
              };

              const createdDue = await dbHelpers.createDue(dueData);
              console.log('✅ Due entry created for exceeded credit limit:', createdDue);

              // Show different success message when due is created
              alert(`✅ Service billing created successfully!\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: AED ${totalAmount.toFixed(2)}\nCompany Credit Used: AED ${paidAmount.toFixed(2)}\nDue Amount: AED ${dueAmount.toFixed(2)}\n\n⚠️ Credit limit exceeded - Due entry created.`);
            }
          }
        } catch (creditError) {
          console.error('Error checking credit limit:', creditError);
          // Continue with normal flow even if credit check fails
        }
      }

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
          payment_method: billingForm.cashType === 'cash' ? 'cash' :
                         billingForm.cashType === 'card' ? 'credit_card' : 'bank_transfer',
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
          payment_method: billingForm.cashType === 'cash' ? 'cash' :
                         billingForm.cashType === 'card' ? 'credit_card' : 'bank_transfer',
          reference_number: invoiceNumber,
          status: 'completed',
          created_by: 'System'
        });
      }

      // Create vendor transaction if vendor is assigned - use 'expense' type instead of 'vendor_payment'
      if (billingForm.assignedVendorId && parseFloat(billingForm.vendorCost) > 0) {
        const selectedVendor = vendors.find(v => v.id === billingForm.assignedVendorId);
        await dbHelpers.createAccountTransaction({
          service_billing_id: createdBilling.id,
          company_id: billingForm.clientType === 'company' && billingForm.companyId ? billingForm.companyId : null,
          individual_id: billingForm.clientType === 'individual' && billingForm.individualId ? billingForm.individualId : null,
          transaction_type: 'expense',
          category: 'Vendor Expenses',
          description: `Vendor payment to ${selectedVendor?.name || 'Vendor'} for ${selectedService.name} (${invoiceNumber})`,
          amount: parseFloat(billingForm.vendorCost),
          transaction_date: billingForm.serviceDate,
          payment_method: 'bank_transfer',
          reference_number: invoiceNumber,
          status: 'pending',
          created_by: 'System'
        });
      }

      // Success feedback (only show if no due was created)
      if (billingForm.clientType !== 'company' || !billingForm.companyId) {
        alert(`✅ Service billing created successfully!\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: AED ${totalAmount.toFixed(2)}\n\nBilling and invoice have been generated.`);
      } else {
        // For companies, check if due was created and show appropriate message
        try {
          const creditUsage = await dbHelpers.getCompanyCreditUsage(billingForm.companyId);
          if (totalAmount <= creditUsage.availableCredit) {
            alert(`✅ Service billing created successfully!\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: AED ${totalAmount.toFixed(2)}\n\nBilling and invoice have been generated.`);
          }
          // If due was created, the message was already shown above
        } catch (error) {
          // Fallback message if credit check fails
          alert(`✅ Service billing created successfully!\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: AED ${totalAmount.toFixed(2)}\n\nBilling and invoice have been generated.`);
        }
      }

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
      notes: '',
      assignedVendorId: '',
      vendorCost: '0',
      discount: '0',
      cardId: ''
    });
    setErrors({});
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBillingForm(prev => ({ ...prev, [name]: value }));

    // Load company employees and credit info when company is selected
    if (name === 'companyId' && value) {
      loadCompanyEmployees(value);
      // Reset assigned employee when company changes
      setBillingForm(prev => ({ ...prev, assignedEmployeeId: '' }));

      // Load credit information
      try {
        const creditUsage = await dbHelpers.getCompanyCreditUsage(value);
        setSelectedCompanyCredit(creditUsage);
        console.log('Company credit info loaded:', creditUsage);
      } catch (error) {
        console.error('Error loading company credit info:', error);
        setSelectedCompanyCredit(null);
      }
    } else if (name === 'companyId' && !value) {
      setSelectedCompanyCredit(null);
    }

    // Clear company employees when switching to individual
    if (name === 'clientType' && value === 'individual') {
      setCompanyEmployees([]);
      setBillingForm(prev => ({ ...prev, assignedEmployeeId: '' }));
    }

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
    if (!selectedService) return { typing: 0, government: 0, total: 0, discount: 0, profit: 0, vendorCost: 0 };

    const quantity = parseInt(billingForm.quantity) || 1;
    const typing = selectedService.typingCharges * quantity;
    const government = selectedService.governmentCharges * quantity;
    const discount = parseFloat(billingForm.discount) || 0;
    const vendorCost = parseFloat(billingForm.vendorCost) || 0;
    const subtotal = typing + government;
    const total = Math.max(0, subtotal - discount); // Ensure total doesn't go negative
    const profit = typing - vendorCost; // Profit = Service Charges - Vendor Cost

    return {
      typing,
      government,
      discount,
      subtotal,
      total,
      profit,
      vendorCost
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

  // Advance Payment Functions
  const handleAdvancePayment = async (billing: any) => {
    try {
      // Load billing details with payment history
      const billingWithPayments = await dbHelpers.getBillingWithPayments(billing.id);
      setSelectedBillingForPayment(billingWithPayments);
      setPaymentHistory(billingWithPayments.payments || []);

      // Pre-fill with outstanding amount
      const outstandingAmount = billingWithPayments.outstandingAmount || 0;
      setAdvancePaymentForm({
        amount: outstandingAmount.toString(),
        paymentMethod: 'cash',
        paymentReference: '',
        notes: ''
      });
      setShowAdvancePaymentModal(true);
    } catch (error) {
      console.error('Error loading billing details:', error);
      toast.error('Failed to load billing details');
    }
  };

  const submitAdvancePayment = async () => {
    try {
      if (!selectedBillingForPayment || !advancePaymentForm.amount) {
        toast.error('Please enter payment amount');
        return;
      }

      const amount = parseFloat(advancePaymentForm.amount);
      const totalAmount = parseFloat(selectedBillingForPayment.total_amount || 0);
      const currentPaid = parseFloat(selectedBillingForPayment.paid_amount || 0);

      if (amount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (currentPaid + amount > totalAmount) {
        toast.error('Payment amount exceeds outstanding balance');
        return;
      }

      // Update the billing status locally
      const newPaidAmount = currentPaid + amount;
      let newStatus = 'pending';
      if (newPaidAmount >= totalAmount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      // Update the local state
      setServiceBillings(prev => prev.map(billing =>
        billing.id === selectedBillingForPayment.id
          ? { ...billing, paid_amount: newPaidAmount, status: newStatus }
          : billing
      ));

      toast.success('Advance payment recorded successfully');
      setShowAdvancePaymentModal(false);

      // Generate receipt
      const receipt = {
        receiptNumber: `RCP-${Date.now()}`,
        paymentDate: new Date().toLocaleDateString(),
        amount: amount,
        paymentMethod: advancePaymentForm.paymentMethod,
        notes: advancePaymentForm.notes,
        billing: {
          invoiceNumber: selectedBillingForPayment.invoice_number,
          totalAmount: totalAmount,
          paidAmount: newPaidAmount,
          clientName: selectedBillingForPayment.company?.company_name || selectedBillingForPayment.individual?.individual_name || 'Unknown Client',
          serviceName: selectedBillingForPayment.service_type?.name || 'Unknown Service'
        }
      };

      setReceiptData(receipt);
      setShowReceiptModal(true);

    } catch (error) {
      console.error('Error recording advance payment:', error);
      toast.error('Failed to record advance payment');
    }
  };

  const generateReceipt = () => {
    if (!receiptData) return;

    const receiptContent = `
PAYMENT RECEIPT
Receipt Number: ${receiptData.receiptNumber}
Date: ${receiptData.paymentDate}

=== PAYMENT DETAILS ===
Amount Paid: AED ${receiptData.amount.toLocaleString()}
Payment Method: ${receiptData.paymentMethod}
${receiptData.notes ? `Notes: ${receiptData.notes}` : ''}

=== INVOICE DETAILS ===
Invoice Number: ${receiptData.billing.invoiceNumber}
Client: ${receiptData.billing.clientName}
Service: ${receiptData.billing.serviceName}
Total Amount: AED ${receiptData.billing.totalAmount.toLocaleString()}
Amount Paid: AED ${receiptData.billing.paidAmount.toLocaleString()}
Outstanding: AED ${(receiptData.billing.totalAmount - receiptData.billing.paidAmount).toLocaleString()}

Thank you for your payment!
Servigence Business Services
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receiptData.receiptNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Receipt downloaded');
  };

  const viewPaymentHistory = async (billing: any) => {
    try {
      const billingWithPayments = await dbHelpers.getBillingWithPayments(billing.id);
      setSelectedBillingForHistory(billingWithPayments);
      setPaymentHistory(billingWithPayments.payments || []);
      setBillingDetails(billingWithPayments);
      setShowPaymentHistoryModal(true);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Failed to load payment history');
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

        {/* Stats cardds */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Profit (Service Charges)</p>
                  <p className="text-2xl font-bold text-purple-900">AED {totalProfit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Government Charges</p>
                  <p className="text-2xl font-bold text-orange-900">AED {totalGovernmentCharges.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Amount</p>
                  <p className="text-2xl font-bold text-gray-900">AED {pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed Services</p>
                  <p className="text-2xl font-bold text-gray-900">{completedServices}</p>
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
            {/* Daily Card Summary */}
            <div className="p-6 border-b border-gray-200">
              <DailyCardSummary compact={true} showTitle={true} />
            </div>

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
                  <button
                    onClick={exportBillingList}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={testSupabaseConnection}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Test DB</span>
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
                            onClick={() => handleAdvancePayment(billing)}
                            className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => viewPaymentHistory(billing)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Receipts"
                          >
                            <FileText className="w-4 h-4" />
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

                    {/* Credit Limit Display */}
                    {selectedCompanyCredit && (
                      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Credit Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-700">Credit Limit:</span>
                            <span className="font-semibold text-blue-900 ml-2">AED {selectedCompanyCredit.creditLimit.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-blue-700">Available Credit:</span>
                            <span className={`font-semibold ml-2 ${
                              selectedCompanyCredit.availableCredit > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              AED {selectedCompanyCredit.availableCredit.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">Outstanding:</span>
                            <span className="font-semibold text-orange-600 ml-2">AED {selectedCompanyCredit.totalOutstanding.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-blue-700">Usage:</span>
                            <span className={`font-semibold ml-2 ${
                              selectedCompanyCredit.creditUsagePercentage > 80 ? 'text-red-600' :
                              selectedCompanyCredit.creditUsagePercentage > 60 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {selectedCompanyCredit.creditUsagePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Credit Usage Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-blue-700 mb-1">
                            <span>Credit Usage</span>
                            <span>{selectedCompanyCredit.creditUsagePercentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                selectedCompanyCredit.creditUsagePercentage > 80 ? 'bg-red-500' :
                                selectedCompanyCredit.creditUsagePercentage > 60 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(selectedCompanyCredit.creditUsagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {billingForm.clientType === 'company' ? 'Assign to Company Employee' : 'Assigned Employee'}
                  </label>
                  <select
                    name="assignedEmployeeId"
                    value={billingForm.assignedEmployeeId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">
                      {billingForm.clientType === 'company'
                        ? (billingForm.companyId ? 'Select company employee (optional)' : 'Select a company first')
                        : 'Select employee (optional)'
                      }
                    </option>
                    {billingForm.clientType === 'company' && billingForm.companyId ? (
                      companyEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.position} ({employee.employee_id})
                        </option>
                      ))
                    ) : billingForm.clientType === 'individual' ? (
                      serviceEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.department}
                        </option>
                      ))
                    ) : null}
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

                {/* Card Selection - Show only when Cash Type is 'card' */}
                {billingForm.cashType === 'card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Payment Card <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="cardId"
                      value={billingForm.cardId}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.cardId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a payment card</option>
                      {paymentCards.map((card) => {
                        const balance = cardBalances.find(b => b.id === card.id);
                        const availableCredit = balance ? balance.availableCredit : parseFloat(card.credit_limit || 0);
                        const utilizationPercentage = balance ? balance.utilizationPercentage : 0;

                        return (
                          <option key={card.id} value={card.id}>
                            {card.card_name} - Available: AED {availableCredit.toLocaleString()} ({utilizationPercentage.toFixed(1)}% used)
                          </option>
                        );
                      })}
                    </select>
                    {errors.cardId && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.cardId}
                      </p>
                    )}
                  </div>
                )}

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

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (AED)
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={billingForm.discount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Real-time Billing Calculation */}
                {billingForm.serviceTypeId && billingForm.quantity && (
                  <div className="lg:col-span-2">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Calculation</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Service Charges:</span>
                          <span className="font-medium">AED {calculateTotal().typing.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Government Charges:</span>
                          <span className="font-medium">AED {calculateTotal().government.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-medium">AED {calculateTotal().subtotal.toFixed(2)}</span>
                        </div>
                        {parseFloat(billingForm.discount) > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span className="font-medium">- AED {calculateTotal().discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                          <span>Total Amount:</span>
                          <span className="text-blue-600">AED {calculateTotal().total.toFixed(2)}</span>
                        </div>
                        {parseFloat(billingForm.vendorCost) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Profit (Service - Vendor Cost):</span>
                            <span className="font-medium">AED {calculateTotal().profit.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Credit Limit Warning for Companies */}
                        {billingForm.clientType === 'company' && selectedCompanyCredit && (
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            {calculateTotal().total > selectedCompanyCredit.availableCredit ? (
                              <div className="space-y-2">
                                <div className="flex justify-between text-green-600">
                                  <span>Company will pay:</span>
                                  <span className="font-medium">AED {Math.max(0, selectedCompanyCredit.availableCredit).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                  <span>Due amount:</span>
                                  <span className="font-semibold">AED {(calculateTotal().total - Math.max(0, selectedCompanyCredit.availableCredit)).toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                  ⚠️ This billing exceeds available credit limit. A due entry will be created.
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between text-green-600">
                                <span>✅ Within credit limit</span>
                                <span className="font-medium">Remaining: AED {(selectedCompanyCredit.availableCredit - calculateTotal().total).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vendor Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Vendor (Optional)</label>
                  <select
                    name="assignedVendorId"
                    value={billingForm.assignedVendorId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No vendor assigned</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} - {vendor.service_category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Cost (AED)</label>
                  <input
                    type="number"
                    name="vendorCost"
                    value={billingForm.vendorCost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
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
                    <div className="flex justify-between items-center w-64">
                      <span>Subtotal:</span>
                      <span>AED {parseFloat(selectedBilling.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(selectedBilling.vat_percentage || 0) > 0 && (
                      <div className="flex justify-between items-center w-64">
                        <span>VAT ({parseFloat(selectedBilling.vat_percentage || 0)}%):</span>
                        <span>AED {parseFloat(selectedBilling.vat_amount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center w-64 text-lg font-bold border-t-2 border-blue-600 pt-2">
                      <span>Total Amount:</span>
                      <span>AED {parseFloat(selectedBilling.total_amount_with_vat || selectedBilling.total_amount || 0).toFixed(2)}</span>
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
                      onChange={(e) => {
                        const companyId = e.target.value;
                        setEditBillingForm(prev => ({ ...prev, companyId, assignedEmployeeId: '' }));
                        if (companyId) {
                          loadCompanyEmployees(companyId);
                        } else {
                          setCompanyEmployees([]);
                        }
                      }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editBillingForm.clientType === 'company' ? 'Assign to Company Employee' : 'Assigned Employee'}
                  </label>
                  <select
                    name="assignedEmployeeId"
                    value={editBillingForm.assignedEmployeeId}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, assignedEmployeeId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">
                      {editBillingForm.clientType === 'company'
                        ? (editBillingForm.companyId ? 'Select company employee (optional)' : 'Select a company first')
                        : 'Select employee (optional)'
                      }
                    </option>
                    {editBillingForm.clientType === 'company' && editBillingForm.companyId ? (
                      companyEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.position} ({employee.employee_id})
                        </option>
                      ))
                    ) : editBillingForm.clientType === 'individual' ? (
                      serviceEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.department}
                        </option>
                      ))
                    ) : null}
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

                {/* Card Selection - Show only when Cash Type is 'card' */}
                {editBillingForm.cashType === 'card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Payment Card <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="cardId"
                      value={editBillingForm.cardId}
                      onChange={(e) => setEditBillingForm(prev => ({ ...prev, cardId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select a payment card</option>
                      {paymentCards.map((card) => {
                        const balance = cardBalances.find(b => b.id === card.id);
                        const availableCredit = balance ? balance.availableCredit : parseFloat(card.credit_limit || 0);
                        const utilizationPercentage = balance ? balance.utilizationPercentage : 0;

                        return (
                          <option key={card.id} value={card.id}>
                            {card.card_name} - Available: AED {availableCredit.toLocaleString()} ({utilizationPercentage.toFixed(1)}% used)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

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

                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount (AED)
                  </label>
                  <input
                    type="number"
                    name="discount"
                    value={editBillingForm.discount}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, discount: e.target.value }))}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* VAT Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    VAT Percentage (Optional)
                  </label>
                  <input
                    type="number"
                    name="vatPercentage"
                    value={editBillingForm.vatPercentage}
                    onChange={(e) => setEditBillingForm(prev => ({ ...prev, vatPercentage: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                  />
                  <p className="text-sm text-gray-500 mt-1">Enter VAT percentage (e.g., 5 for 5%)</p>
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
                          <th className="border border-gray-300 px-4 py-2 text-right">Service Revenue (Profit)</th>
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
                      <h4 className="font-semibold text-purple-900">Service Revenue (Profit)</h4>
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
                          <th className="border border-gray-300 px-4 py-2 text-right">Profit</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Government Charges</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Avg. Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((service: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{service.name}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{service.count}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {service.revenue.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-medium text-green-600">AED {service.profit.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right text-blue-600">AED {service.governmentCharges.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">AED {service.averageProfit.toFixed(2)}</td>
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
                      ? reportData.map((service: any) => [service.name, service.count, service.revenue, service.profit, service.governmentCharges, service.averageProfit])
                      : [];

                    if (csvData.length > 0) {
                      const headers = reportType === 'monthly-revenue'
                        ? ['Month', 'Service Revenue (Profit)', 'Government Charges', 'Total Revenue', 'Billings Count']
                        : reportType === 'service-performance'
                        ? ['Service Name', 'Count', 'Total Revenue', 'Profit', 'Government Charges', 'Average Profit']
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

      {/* Advance Payment Modal */}
      {showAdvancePaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Advance Payment</h3>
              <button
                onClick={() => setShowAdvancePaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedBillingForPayment && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Invoice: {selectedBillingForPayment.invoice_number}</p>
                  <p className="text-sm text-gray-600">
                    Client: {selectedBillingForPayment.clientName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Service: {selectedBillingForPayment.serviceName}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Amount</p>
                      <p className="font-semibold text-gray-900">AED {selectedBillingForPayment.totalAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Paid Amount</p>
                      <p className="font-semibold text-green-600">AED {selectedBillingForPayment.paidAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Outstanding</p>
                      <p className="font-bold text-red-600 text-lg">AED {selectedBillingForPayment.outstandingAmount?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {paymentHistory.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">Recent Payments ({paymentHistory.length})</p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {paymentHistory.slice(0, 3).map((payment, index) => (
                        <div key={index} className="flex justify-between text-xs text-gray-600">
                          <span>{payment.paymentDate} - {payment.paymentMethod}</span>
                          <span className="font-medium">AED {payment.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    {paymentHistory.length > 3 && (
                      <p className="text-xs text-gray-500 mt-1">+{paymentHistory.length - 3} more payments</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount
                  {selectedBillingForPayment && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Max: AED {selectedBillingForPayment.outstandingAmount?.toLocaleString()})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedBillingForPayment?.outstandingAmount || 0}
                  value={advancePaymentForm.amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const maxAmount = selectedBillingForPayment?.outstandingAmount || 0;
                    if (value <= maxAmount) {
                      setAdvancePaymentForm(prev => ({ ...prev, amount: e.target.value }));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter payment amount"
                />
                {parseFloat(advancePaymentForm.amount) > (selectedBillingForPayment?.outstandingAmount || 0) && (
                  <p className="text-red-500 text-sm mt-1">Payment amount cannot exceed outstanding balance</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={advancePaymentForm.paymentMethod}
                  onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
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
                  value={advancePaymentForm.paymentReference}
                  onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Reference number (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={advancePaymentForm.notes}
                  onChange={(e) => setAdvancePaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Additional notes (optional)"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAdvancePaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdvancePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

      {/* Payment History Modal */}
      {showPaymentHistoryModal && billingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment History & Receipts</h3>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoice Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoice: {billingDetails.invoice_number}</p>
                  <p className="text-sm text-gray-600">Client: {billingDetails.clientName}</p>
                  <p className="text-sm text-gray-600">Service: {billingDetails.serviceName}</p>
                  <p className="text-sm text-gray-600">Date: {billingDetails.service_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total: AED {billingDetails.totalAmount?.toLocaleString()}</p>
                  <p className="text-sm text-green-600">Paid: AED {billingDetails.paidAmount?.toLocaleString()}</p>
                  <p className="text-lg font-bold text-red-600">Outstanding: AED {billingDetails.outstandingAmount?.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`font-medium ${
                      billingDetails.payment_status === 'paid' ? 'text-green-600' :
                      billingDetails.payment_status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {billingDetails.payment_status || 'pending'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Payment History ({paymentHistory.length} payments)</h4>

              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment, index) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                              Payment #{index + 1}
                            </span>
                            <span className="text-sm text-gray-600">{payment.paymentDate}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Amount: <span className="font-semibold text-green-600">AED {payment.amount.toLocaleString()}</span></p>
                              <p className="text-gray-600">Method: <span className="font-medium capitalize">{payment.paymentMethod}</span></p>
                            </div>
                            <div>
                              {payment.paymentReference && (
                                <p className="text-gray-600">Reference: <span className="font-medium">{payment.paymentReference}</span></p>
                              )}
                              {payment.receiptNumber && (
                                <p className="text-gray-600">Receipt: <span className="font-medium">{payment.receiptNumber}</span></p>
                              )}
                            </div>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2">Notes: {payment.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Generate and download receipt for this payment
                            const receiptContent = `
PAYMENT RECEIPT
===============

Receipt #: ${payment.receiptNumber || `RCP-${payment.id.slice(-8)}`}
Date: ${payment.paymentDate}

Invoice: ${billingDetails.invoice_number}
Client: ${billingDetails.clientName}
Service: ${billingDetails.serviceName}

Payment Details:
Amount Paid: AED ${payment.amount.toLocaleString()}
Payment Method: ${payment.paymentMethod}
${payment.paymentReference ? `Reference: ${payment.paymentReference}` : ''}

Invoice Summary:
Total Amount: AED ${billingDetails.totalAmount?.toLocaleString()}
Total Paid: AED ${billingDetails.paidAmount?.toLocaleString()}
Outstanding: AED ${billingDetails.outstandingAmount?.toLocaleString()}

${payment.notes ? `Notes: ${payment.notes}` : ''}

Thank you for your payment!
                            `.trim();

                            const blob = new Blob([receiptContent], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `receipt-${payment.receiptNumber || payment.id.slice(-8)}.txt`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBilling;