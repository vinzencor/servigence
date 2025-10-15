import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import CustomerRegistration from './components/CustomerRegistration';
import CompaniesSection from './components/CompaniesSection';
import CompanyEmployeeManagement from './components/CompanyEmployeeManagement';
import CompanyEditModal from './components/CompanyEditModal';
import ServiceManagement from './components/ServiceManagement';
import ServiceEmployeeManagement from './components/ServiceEmployeeManagement';
import ServiceBilling from './components/ServiceBilling';
import VendorManagement from './components/VendorManagement';
import CardsManagement from './components/CardsManagement';
import RemindersServices from './components/RemindersServices';
import AccountManagement from './components/AccountManagement';
import InvoiceManagement from './components/InvoiceManagement';
import RemindersManagement from './components/RemindersManagement';
import EmployeeLogin from './components/EmployeeLogin';
import EmployeeDashboard from './components/EmployeeDashboard';
import Chat from './components/Chat';
import EmailTest from './components/EmailTest';
import { dbHelpers } from './lib/supabase';
import { Company, Individual } from './types';

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  
  console.log('AppContent rendering - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading, 'user:', user);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [loggedInEmployee, setLoggedInEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Load companies from database when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadCompanies();
    }
  }, [isAuthenticated, user]);

  const loadCompanies = async () => {
    if (!user) {
      console.log('No user authenticated, skipping companies load in App.tsx');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading companies from database...');
      const companiesData = await dbHelpers.getCompanies(user?.service_employee_id, user?.role);
      console.log('Loaded companies:', companiesData);

      // Transform the data to match our Company interface
      const transformedCompanies = companiesData.map((company: any) => ({
        id: company.id,
        companyName: company.company_name,
        vatTrnNo: company.vat_trn_no,
        phone1: company.phone1,
        phone2: company.phone2,
        email1: company.email1,
        email2: company.email2,
        address: company.address,
        companyType: company.company_type,
        licenseNo: company.license_no,
        mohreNo: company.mohre_no,
        moiNo: company.moi_no,
        quota: company.quota,
        companyGrade: company.company_grade,
        creditLimit: company.credit_limit ? parseFloat(company.credit_limit) : 0,
        creditLimitDays: company.credit_limit_days,
        proName: company.pro_name,
        proPhone: company.pro_phone,
        proEmail: company.pro_email,
        dateOfRegistration: company.date_of_registration,
        createdBy: company.created_by,
        status: company.status,
        employeeCount: company.employee_count || 0,
        lastActivity: company.last_activity,
        notes: company.notes
      }));

      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (company: Company) => {
    try {
      // The company is already saved to database in CustomerRegistration component
      // Just reload companies from database to get the latest data
      await loadCompanies();
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSaveIndividual = (individual: Individual) => {
    setIndividuals(prev => [...prev, individual]);
  };

  const handleManageEmployees = (company: Company) => {
    setSelectedCompany(company);
    setCurrentView('company-employees');
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowEditCompany(true);
  };

  const handleSaveCompanyEdit = async (updatedCompany: Company) => {
    try {
      // Update local state
      setCompanies(prev =>
        prev.map(company =>
          company.id === updatedCompany.id ? updatedCompany : company
        )
      );
      setShowEditCompany(false);
      setSelectedCompany(null);
      // Reload companies to ensure consistency
      await loadCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
    }
  };

  const handleManageDocuments = (company: Company) => {
    setSelectedCompany(company);
    setCurrentView('company-documents');
  };

  const handleEmployeeLogin = (employee: any) => {
    setLoggedInEmployee(employee);
    setIsEmployeeMode(true);
  };

  const handleEmployeeLogout = () => {
    setLoggedInEmployee(null);
    setIsEmployeeMode(false);
  };

  const handleBackToMain = () => {
    setIsEmployeeMode(false);
    setLoggedInEmployee(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'customer-registration':
        return <CustomerRegistration onSave={handleSaveCompany} onSaveIndividual={handleSaveIndividual} onNavigate={setCurrentView} />;
      case 'companies':
        return (
          <CompaniesSection
            companies={companies}
            onManageEmployees={handleManageEmployees}
            onEditCompany={handleEditCompany}
            onManageDocuments={handleManageDocuments}
            onNavigate={setCurrentView}
          />
        );
      case 'company-employees':
        return selectedCompany ? (
          <CompanyEmployeeManagement
            company={selectedCompany}
            onBack={() => setCurrentView('companies')}
          />
        ) : (
          <CompaniesSection companies={companies} />
        );
      case 'service-management':
        return <ServiceManagement />;
      case 'services':
        return <ServiceBilling />;
      case 'employees':
        return <ServiceEmployeeManagement />;
      case 'vendors':
        return <VendorManagement />;
      case 'cards':
        return <CardsManagement />;
      case 'chat':
        return <Chat />;
      case 'reminders':
        return <RemindersServices />;
      case 'accounts':
        return <AccountManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'reminders-management':
        return <RemindersManagement />;
      case 'email-test':
        return <EmailTest />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('Showing loading spinner');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    console.log('Showing login screen');
    return <Login />;
  }

  // Handle employee mode
  if (isEmployeeMode && loggedInEmployee) {
    return <EmployeeDashboard employee={loggedInEmployee} onLogout={handleEmployeeLogout} />;
  }

  // Handle employee login
  if (currentView === 'employee-login') {
    return <EmployeeLogin onLogin={handleEmployeeLogin} onBackToMain={handleBackToMain} />;
  }

  console.log('Rendering main layout with currentView:', currentView);
  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderCurrentView()}

      {/* Company Edit Modal */}
      {showEditCompany && selectedCompany && (
        <CompanyEditModal
          company={selectedCompany}
          onClose={() => {
            setShowEditCompany(false);
            setSelectedCompany(null);
          }}
          onSave={handleSaveCompanyEdit}
        />
      )}
    </Layout>
  );
}

function App() {
  console.log('App component rendering');
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
