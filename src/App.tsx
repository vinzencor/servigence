import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CustomerRegistration from './components/CustomerRegistration';
import CompaniesSection from './components/CompaniesSection';
import CompanyEmployeeManagement from './components/CompanyEmployeeManagement';
import ServiceManagement from './components/ServiceManagement';
import ServiceEmployeeManagement from './components/ServiceEmployeeManagement';
import ServiceBilling from './components/ServiceBilling';

import VendorManagement from './components/VendorManagement';
import RemindersServices from './components/RemindersServices';
import AccountManagement from './components/AccountManagement';
import InvoiceManagement from './components/InvoiceManagement';
import { mockCompanies } from './data/mockData';
import { Company, Individual } from './types';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleSaveCompany = (company: Company) => {
    setCompanies(prev => [...prev, company]);
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
    // You can implement edit functionality here
    console.log('Edit company:', company);
  };

  const handleManageDocuments = (company: Company) => {
    setSelectedCompany(company);
    setCurrentView('company-documents');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customer-registration':
        return <CustomerRegistration onSave={handleSaveCompany} onSaveIndividual={handleSaveIndividual} />;
      case 'companies':
        return (
          <CompaniesSection
            companies={companies}
            onManageEmployees={handleManageEmployees}
            onEditCompany={handleEditCompany}
            onManageDocuments={handleManageDocuments}
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
      case 'reminders':
        return <RemindersServices />;
      case 'accounts':
        return <AccountManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderCurrentView()}
    </Layout>
  );
}

export default App;