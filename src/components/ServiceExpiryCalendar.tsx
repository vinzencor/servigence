import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, AlertCircle, Building2, User, FileText, DollarSign, File, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ServiceBilling {
  id: string;
  service_date: string;
  expiry_date: string;
  invoice_number: string;
  total_amount_with_vat: number;
  company_id?: string;
  individual_id?: string;
  // Supabase returns plural field names
  service_types?: {
    name: string;
  };
  companies?: {
    company_name: string;
    email1: string;
  };
  individuals?: {
    individual_name: string;
    email1: string;
  };
  // Also support singular for compatibility
  service_type?: {
    name: string;
  };
  company?: {
    company_name: string;
    email1: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
  };
}

interface DocumentExpiry {
  id: string;
  title: string;
  document_type?: string;
  document_number?: string;
  expiry_date: string;
  company_id?: string;
  individual_id?: string;
  employee_id?: string;
  type: 'company_document' | 'individual_document' | 'employee_document';
  // Supabase returns plural field names
  companies?: {
    company_name: string;
    email1: string;
  };
  individuals?: {
    individual_name: string;
    email1: string;
  };
  employees?: {
    name: string;
    email: string;
    phone?: string;
    company_id?: string;
    companies?: {
      company_name: string;
      email1: string;
    };
  };
  // Also support singular for compatibility
  company?: {
    company_name: string;
    email1: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
  };
  employee?: {
    name: string;
    email: string;
    phone?: string;
    company_id?: string;
    company?: {
      company_name: string;
      email1: string;
    };
  };
  service_types?: {
    name: string;
  };
  service_type?: {
    name: string;
  };
}

const ServiceExpiryCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [serviceBillings, setServiceBillings] = useState<ServiceBilling[]>([]);
  const [documentExpiries, setDocumentExpiries] = useState<DocumentExpiry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Load data when component mounts or when month changes
  useEffect(() => {
    console.log('📅 ServiceExpiryCalendar: Loading data (mount or month change)');
    loadExpiryData();
  }, [currentDate]); // Runs on mount AND when currentDate changes

  const loadExpiryData = async () => {
    try {
      setLoading(true);
      console.log('📅 Loading expiry data for calendar...');

      // Get first and last day of current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      console.log(`📅 Date range: ${firstDay.toISOString().split('T')[0]} to ${lastDay.toISOString().split('T')[0]}`);

      // Load service billings - Load ALL with expiry dates (not just current month)
      // We'll filter by month in the UI, but load all data to ensure nothing is missed
      const { data: servicesData, error: servicesError } = await supabase
        .from('service_billings')
        .select(`
          id,
          service_date,
          expiry_date,
          invoice_number,
          total_amount_with_vat,
          company_id,
          individual_id,
          service_types!service_type_id (
            name
          ),
          companies!company_id (
            company_name,
            email1
          ),
          individuals!individual_id (
            individual_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', firstDay.toISOString().split('T')[0])
        .lte('expiry_date', lastDay.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (servicesError) {
        console.error('❌ Error loading service billings:', servicesError);
        throw servicesError;
      }

      console.log(`✅ Loaded ${servicesData?.length || 0} service billings with expiry dates`);

      // Log detailed service billing data for debugging
      if (servicesData && servicesData.length > 0) {
        console.log('📋 Service Billings Details:');
        servicesData.forEach((billing: any, index: number) => {
          console.log(`  ${index + 1}. Invoice: ${billing.invoice_number}, Expiry: ${billing.expiry_date}, Client: ${billing.companies?.company_name || billing.individuals?.individual_name || 'N/A'}`);
        });
      } else {
        console.log('⚠️ No service billings found for this month');
      }

      // Normalize service billing data
      const normalizedServices = (servicesData || []).map(billing => ({
        ...billing,
        service_type: billing.service_types || billing.service_type,
        company: billing.companies || billing.company,
        individual: billing.individuals || billing.individual
      }));

      setServiceBillings(normalizedServices);

      // Load company documents
      const { data: companyDocsData, error: companyDocsError } = await supabase
        .from('company_documents')
        .select(`
          id,
          title,
          document_type,
          document_number,
          expiry_date,
          company_id,
          service_id,
          companies!company_id (
            company_name,
            email1
          ),
          service_types!service_id (
            name
          )
        `)
        .not('expiry_date', 'is', null)
        .eq('status', 'active')
        .gte('expiry_date', firstDay.toISOString().split('T')[0])
        .lte('expiry_date', lastDay.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (companyDocsError) {
        console.error('❌ Error loading company documents:', companyDocsError);
        throw companyDocsError;
      }

      console.log(`✅ Loaded ${companyDocsData?.length || 0} company documents with expiry dates`);

      // Log detailed company document data for debugging
      if (companyDocsData && companyDocsData.length > 0) {
        console.log('📄 Company Documents Details:');
        companyDocsData.forEach((doc: any, index: number) => {
          console.log(`  ${index + 1}. Title: ${doc.title}, Expiry: ${doc.expiry_date}, Company: ${doc.companies?.company_name || 'N/A'}`);
        });
      } else {
        console.log('⚠️ No company documents found for this month');
      }

      // Load individual documents
      const { data: individualDocsData, error: individualDocsError } = await supabase
        .from('individual_documents')
        .select(`
          id,
          title,
          document_type,
          document_number,
          expiry_date,
          individual_id,
          individuals!individual_id (
            individual_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .eq('status', 'active')
        .gte('expiry_date', firstDay.toISOString().split('T')[0])
        .lte('expiry_date', lastDay.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (individualDocsError) {
        console.error('❌ Error loading individual documents:', individualDocsError);
        throw individualDocsError;
      }

      console.log(`✅ Loaded ${individualDocsData?.length || 0} individual documents with expiry dates`);

      // Log detailed individual document data for debugging
      if (individualDocsData && individualDocsData.length > 0) {
        console.log('👤 Individual Documents Details:');
        individualDocsData.forEach((doc: any, index: number) => {
          console.log(`  ${index + 1}. Title: ${doc.title}, Expiry: ${doc.expiry_date}, Individual: ${doc.individuals?.individual_name || 'N/A'}`);
        });
      } else {
        console.log('⚠️ No individual documents found for this month');
      }

      // Load employee documents
      const { data: employeeDocsData, error: employeeDocsError } = await supabase
        .from('employee_documents')
        .select(`
          id,
          name,
          type,
          file_name,
          expiry_date,
          employee_id,
          service_id,
          employees!employee_id (
            name,
            email,
            phone,
            company_id,
            companies!company_id (
              company_name,
              email1
            )
          ),
          service_types!service_id (
            name
          )
        `)
        .not('expiry_date', 'is', null)
        .eq('status', 'valid')
        .gte('expiry_date', firstDay.toISOString().split('T')[0])
        .lte('expiry_date', lastDay.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (employeeDocsError) {
        console.error('❌ Error loading employee documents:', employeeDocsError);
        throw employeeDocsError;
      }

      console.log(`✅ Loaded ${employeeDocsData?.length || 0} employee documents with expiry dates`);

      // Log detailed employee document data for debugging
      if (employeeDocsData && employeeDocsData.length > 0) {
        console.log('👨‍💼 Employee Documents Details:');
        employeeDocsData.forEach((doc: any, index: number) => {
          const employee = doc.employees || doc.employee;
          const employeeName = Array.isArray(employee) ? employee[0]?.name : employee?.name;
          console.log(`  ${index + 1}. Title: ${doc.name}, Expiry: ${doc.expiry_date}, Employee: ${employeeName || 'N/A'}`);
        });
      } else {
        console.log('⚠️ No employee documents found for this month');
      }

      // Normalize and combine document data
      const normalizedCompanyDocs = (companyDocsData || []).map(doc => ({
        ...doc,
        type: 'company_document' as const,
        company: doc.companies || doc.company,
        service_type: doc.service_types || doc.service_type
      }));

      const normalizedIndividualDocs = (individualDocsData || []).map(doc => ({
        ...doc,
        type: 'individual_document' as const,
        individual: doc.individuals || doc.individual
      }));

      const normalizedEmployeeDocs = (employeeDocsData || []).map(doc => {
        let employee = doc.employees || doc.employee;
        if (Array.isArray(employee)) {
          employee = employee[0];
        }

        let company = employee?.companies || employee?.company;
        if (Array.isArray(company)) {
          company = company[0];
        }

        return {
          ...doc,
          id: doc.id,
          title: doc.name || 'Employee Document',
          document_type: doc.type,
          document_number: doc.file_name,
          expiry_date: doc.expiry_date,
          employee_id: doc.employee_id,
          type: 'employee_document' as const,
          employee: employee ? {
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            company_id: employee.company_id,
            company: company
          } : undefined,
          service_type: doc.service_types || doc.service_type
        };
      });

      setDocumentExpiries([...normalizedCompanyDocs, ...normalizedIndividualDocs, ...normalizedEmployeeDocs]);

      console.log('✅ Calendar data loaded successfully');
      console.log(`📊 Total: ${normalizedServices.length} services, ${normalizedCompanyDocs.length + normalizedIndividualDocs.length + normalizedEmployeeDocs.length} documents`);
      console.log(`   - Company Documents: ${normalizedCompanyDocs.length}`);
      console.log(`   - Individual Documents: ${normalizedIndividualDocs.length}`);
      console.log(`   - Employee Documents: ${normalizedEmployeeDocs.length}`);

      // Store debug data
      setDebugData({
        dateRange: {
          start: firstDay.toISOString().split('T')[0],
          end: lastDay.toISOString().split('T')[0]
        },
        services: servicesData || [],
        companyDocs: companyDocsData || [],
        individualDocs: individualDocsData || [],
        employeeDocs: employeeDocsData || [],
        totalServices: normalizedServices.length,
        totalDocuments: normalizedCompanyDocs.length + normalizedIndividualDocs.length + normalizedEmployeeDocs.length
      });
    } catch (error: any) {
      console.error('❌ Error loading expiry data:', error);
      toast.error('Failed to load expiry data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getServicesForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];

    return serviceBillings.filter(billing => billing.expiry_date === dateStr);
  };

  const getDocumentsForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];

    return documentExpiries.filter(doc => doc.expiry_date === dateStr);
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const services = getServicesForDate(day);
    const documents = getDocumentsForDate(day);

    if (services.length > 0 || documents.length > 0) {
      setSelectedDate(date);
      setShowModal(true);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToSpecificMonth = (year: number, month: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const runDatabaseCheck = async () => {
    try {
      console.log('🔍 Running comprehensive database check...');
      toast.loading('Running database check...', { id: 'db-check' });

      // Query ALL service billings with expiry dates (no date filter)
      const { data: allServices, error: servicesError } = await supabase
        .from('service_billings')
        .select(`
          id,
          service_date,
          expiry_date,
          invoice_number,
          total_amount_with_vat,
          company_id,
          individual_id,
          service_types!service_type_id (
            name
          ),
          companies!company_id (
            company_name,
            email1
          ),
          individuals!individual_id (
            individual_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      if (servicesError) {
        console.error('❌ Database check error (services):', servicesError);
        throw servicesError;
      }

      // Query ALL company documents with expiry dates (no date filter)
      const { data: allCompanyDocs, error: companyDocsError } = await supabase
        .from('company_documents')
        .select(`
          id,
          title,
          document_type,
          document_number,
          expiry_date,
          company_id,
          status,
          companies!company_id (
            company_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      if (companyDocsError) {
        console.error('❌ Database check error (company docs):', companyDocsError);
        throw companyDocsError;
      }

      // Query ALL individual documents with expiry dates (no date filter)
      const { data: allIndividualDocs, error: individualDocsError } = await supabase
        .from('individual_documents')
        .select(`
          id,
          title,
          document_type,
          document_number,
          expiry_date,
          individual_id,
          status,
          individuals!individual_id (
            individual_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      if (individualDocsError) {
        console.error('❌ Database check error (individual docs):', individualDocsError);
        throw individualDocsError;
      }

      // Query ALL employee documents with expiry dates (no date filter)
      const { data: allEmployeeDocs, error: employeeDocsError } = await supabase
        .from('employee_documents')
        .select(`
          id,
          name,
          type,
          file_name,
          expiry_date,
          employee_id,
          status,
          employees!employee_id (
            name,
            email,
            company_id,
            companies!company_id (
              company_name,
              email1
            )
          )
        `)
        .not('expiry_date', 'is', null)
        .order('expiry_date', { ascending: true });

      if (employeeDocsError) {
        console.error('❌ Database check error (employee docs):', employeeDocsError);
        throw employeeDocsError;
      }

      // Log comprehensive results
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔍 DATABASE CHECK RESULTS (ALL ITEMS WITH EXPIRY DATES)');
      console.log('═══════════════════════════════════════════════════════');

      console.log(`\n📋 SERVICE BILLINGS: ${allServices?.length || 0} total`);
      if (allServices && allServices.length > 0) {
        allServices.forEach((billing: any, index: number) => {
          console.log(`  ${index + 1}. Invoice: ${billing.invoice_number}`);
          console.log(`     Expiry Date: ${billing.expiry_date}`);
          console.log(`     Client: ${billing.companies?.company_name || billing.individuals?.individual_name || 'N/A'}`);
          console.log(`     Service: ${billing.service_types?.name || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('  ⚠️ No service billings found with expiry dates');
      }

      console.log(`\n📄 COMPANY DOCUMENTS: ${allCompanyDocs?.length || 0} total`);
      if (allCompanyDocs && allCompanyDocs.length > 0) {
        allCompanyDocs.forEach((doc: any, index: number) => {
          console.log(`  ${index + 1}. Title: ${doc.title}`);
          console.log(`     Expiry Date: ${doc.expiry_date}`);
          console.log(`     Company: ${doc.companies?.company_name || 'N/A'}`);
          console.log(`     Status: ${doc.status}`);
          console.log('');
        });
      } else {
        console.log('  ⚠️ No company documents found with expiry dates');
      }

      console.log(`\n👤 INDIVIDUAL DOCUMENTS: ${allIndividualDocs?.length || 0} total`);
      if (allIndividualDocs && allIndividualDocs.length > 0) {
        allIndividualDocs.forEach((doc: any, index: number) => {
          console.log(`  ${index + 1}. Title: ${doc.title}`);
          console.log(`     Expiry Date: ${doc.expiry_date}`);
          console.log(`     Individual: ${doc.individuals?.individual_name || 'N/A'}`);
          console.log(`     Status: ${doc.status}`);
          console.log('');
        });
      } else {
        console.log('  ⚠️ No individual documents found with expiry dates');
      }

      console.log(`\n👨‍💼 EMPLOYEE DOCUMENTS: ${allEmployeeDocs?.length || 0} total`);
      if (allEmployeeDocs && allEmployeeDocs.length > 0) {
        allEmployeeDocs.forEach((doc: any, index: number) => {
          const employee = doc.employees || doc.employee;
          const employeeName = Array.isArray(employee) ? employee[0]?.name : employee?.name;
          const company = Array.isArray(employee) ? employee[0]?.companies || employee[0]?.company : employee?.companies || employee?.company;
          const companyName = Array.isArray(company) ? company[0]?.company_name : company?.company_name;

          console.log(`  ${index + 1}. Title: ${doc.name}`);
          console.log(`     Expiry Date: ${doc.expiry_date}`);
          console.log(`     Employee: ${employeeName || 'N/A'}`);
          console.log(`     Company: ${companyName || 'N/A'}`);
          console.log(`     Status: ${doc.status}`);
          console.log('');
        });
      } else {
        console.log('  ⚠️ No employee documents found with expiry dates');
      }

      console.log('═══════════════════════════════════════════════════════');
      console.log(`📊 TOTAL ITEMS IN DATABASE: ${(allServices?.length || 0) + (allCompanyDocs?.length || 0) + (allIndividualDocs?.length || 0) + (allEmployeeDocs?.length || 0)}`);
      console.log('═══════════════════════════════════════════════════════\n');

      const totalItems = (allServices?.length || 0) + (allCompanyDocs?.length || 0) + (allIndividualDocs?.length || 0) + (allEmployeeDocs?.length || 0);

      toast.success(
        `Database Check Complete!\n` +
        `Found ${allServices?.length || 0} services, ${allCompanyDocs?.length || 0} company docs, ${allIndividualDocs?.length || 0} individual docs, ${allEmployeeDocs?.length || 0} employee docs\n` +
        `Total: ${totalItems} items with expiry dates\n` +
        `Check console for detailed results.`,
        { id: 'db-check', duration: 8000 }
      );

      setShowDebugPanel(true);
    } catch (error: any) {
      console.error('❌ Database check failed:', error);
      toast.error('Database check failed. Check console for details.', { id: 'db-check' });
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const services = getServicesForDate(day);
      const documents = getDocumentsForDate(day);
      const totalItems = services.length + documents.length;
      const hasItems = totalItems > 0;
      const isToday =
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`h-24 border border-gray-200 p-2 ${
            hasItems ? 'cursor-pointer hover:bg-blue-50' : ''
          } ${isToday ? 'bg-blue-100' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
            </span>
            {hasItems && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          {hasItems && (
            <div className="mt-1 space-y-1">
              {services.length > 0 && (
                <div className="text-xs text-red-600 font-medium truncate flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {services[0].service_type?.name || 'Service'}
                </div>
              )}
              {documents.length > 0 && (
                <div className={`text-xs font-medium truncate flex items-center gap-1 ${
                  documents[0].type === 'employee_document'
                    ? 'text-purple-600'
                    : 'text-orange-600'
                }`}>
                  {documents[0].type === 'employee_document' ? (
                    <User className="w-3 h-3" />
                  ) : (
                    <File className="w-3 h-3" />
                  )}
                  {documents[0].title}
                  {documents[0].type === 'employee_document' && (
                    <span className="text-xs text-purple-500 ml-1">(Employee)</span>
                  )}
                </div>
              )}
              {totalItems > 2 && (
                <div className="text-xs text-gray-500">
                  +{totalItems - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedServices = selectedDate ? getServicesForDate(selectedDate.getDate()) : [];
  const selectedDocuments = selectedDate ? getDocumentsForDate(selectedDate.getDate()) : [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Service & Document Expiry Calendar</h1>
              <p className="text-purple-100 text-sm mt-1">View all services and documents expiring by date</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={runDatabaseCheck}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              title="Check all items in database (for debugging)"
            >
              <Search className="w-5 h-5" />
              <span>Database Check</span>
            </button>
            <button
              onClick={loadExpiryData}
              disabled={loading}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Important Notice - Year Mismatch */}
      {!loading && debugData && debugData.dateRange.start.startsWith('2025') && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-yellow-900 mb-2">⚠️ You're viewing 2025, but your services expire in 2026!</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Most of your service billings expire in <strong>December 2026</strong>, but you're currently viewing <strong>December 2025</strong>.
                That's why they're not appearing in the calendar!
              </p>
              <button
                onClick={() => goToSpecificMonth(2026, 11)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🚀 Jump to December 2025 (Click Here!)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info Panel */}
      {!loading && debugData && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 Calendar Query Info</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Date Range:</p>
                  <p className="text-blue-900">{debugData.dateRange.start} to {debugData.dateRange.end}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Services Found:</p>
                  <p className="text-blue-900 font-bold">{debugData.totalServices}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Documents Found:</p>
                  <p className="text-blue-900 font-bold">{debugData.totalDocuments}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Last Refreshed:</p>
                  <p className="text-blue-900">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-4"
            >
              {showDebugPanel ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showDebugPanel && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-blue-700 mb-2">
                💡 <strong>Tip:</strong> If you don't see a recently added item, make sure:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4">
                <li>• The item's expiry date falls within the date range shown above</li>
                <li>• You're viewing the correct month AND year (use arrow buttons or quick jump buttons)</li>
                <li>• For documents, the status is set to "active" (not deleted/archived)</li>
                <li>• Click "Database Check" button to see ALL items in the database</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Services This Month</p>
                <p className="text-2xl font-bold text-red-600">{serviceBillings.length}</p>
              </div>
              <FileText className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents This Month</p>
                <p className="text-2xl font-bold text-orange-600">{documentExpiries.length}</p>
              </div>
              <File className="w-10 h-10 text-orange-600 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expiries</p>
                <p className="text-2xl font-bold text-purple-600">{serviceBillings.length + documentExpiries.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToToday}
                className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                title="Go to current month"
              >
                Today
              </button>
              <button
                onClick={() => goToSpecificMonth(2025, 11)} // December 2025 (month is 0-indexed)
                className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                title="Jump to December 2025 where your services are"
              >
                Dec 2025
              </button>
            </div>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200">
              {renderCalendar()}
            </div>

            {/* Legend and Info */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span className="text-gray-600">Today</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-red-600" />
                  <span className="text-gray-600">Services</span>
                </div>
                <div className="flex items-center space-x-2">
                  <File className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-600">Documents</span>
                </div>
              </div>

              {/* No items message */}
              {serviceBillings.length === 0 && documentExpiries.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-800">
                    <strong>No expiries found for this month.</strong> Use the navigation arrows to view other months, or click "Refresh" to reload data.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal for Selected Date */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Expiring on {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} • {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-purple-800 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedServices.length === 0 && selectedDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No items expiring on this date</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Services Section */}
                  {selectedServices.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-600" />
                        Services ({selectedServices.length})
                      </h3>
                      <div className="space-y-4">
                        {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border-2 border-red-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {service.company_id ? (
                            <Building2 className="w-6 h-6 text-blue-600" />
                          ) : (
                            <User className="w-6 h-6 text-green-600" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {service.company?.company_name || service.individual?.individual_name || 'N/A'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {service.company?.email1 || service.individual?.email1 || 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                          Expiring
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Service</p>
                            <p className="text-sm font-medium text-gray-800">
                              {service.service_type?.name || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Invoice Number</p>
                            <p className="text-sm font-medium text-gray-800">
                              {service.invoice_number || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Service Date</p>
                            <p className="text-sm font-medium text-gray-800">
                              {new Date(service.service_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="text-sm font-medium text-gray-800">
                              AED {service.total_amount_with_vat?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents Section */}
                  {selectedDocuments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <File className="w-5 h-5 text-orange-600" />
                        Documents ({selectedDocuments.length})
                      </h3>
                      <div className="space-y-4">
                        {selectedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="bg-white border-2 border-orange-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                {doc.type === 'employee_document' ? (
                                  <User className="w-6 h-6 text-purple-600" />
                                ) : doc.company_id ? (
                                  <Building2 className="w-6 h-6 text-blue-600" />
                                ) : (
                                  <User className="w-6 h-6 text-green-600" />
                                )}
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {doc.type === 'employee_document'
                                      ? doc.employee?.name
                                      : doc.company?.company_name || doc.individual?.individual_name || 'N/A'}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {doc.type === 'employee_document'
                                      ? doc.employee?.email || doc.employee?.company?.email1 || 'No email'
                                      : doc.company?.email1 || doc.individual?.email1 || 'No email'}
                                  </p>
                                  {doc.type === 'employee_document' && doc.employee?.company?.company_name && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Company: {doc.employee.company.company_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                doc.type === 'employee_document'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {doc.type === 'employee_document' ? 'Employee Doc' : 'Expiring'}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center space-x-2">
                                <File className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-xs text-gray-500">Document Title</p>
                                  <p className="text-sm font-medium text-gray-800">
                                    {doc.title || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {doc.document_type && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Document Type</p>
                                    <p className="text-sm font-medium text-gray-800">
                                      {doc.document_type}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {doc.document_number && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Document Number</p>
                                    <p className="text-sm font-medium text-gray-800">
                                      {doc.document_number}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {doc.service_type?.name && (
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <p className="text-xs text-gray-500">Related Service</p>
                                    <p className="text-sm font-medium text-gray-800">
                                      {doc.service_type.name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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

export default ServiceExpiryCalendar;

