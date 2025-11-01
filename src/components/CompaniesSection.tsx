import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Trash2, Phone, Mail, FileText, Users, Eye, MoreVertical, Building2, Calendar, DollarSign, UserPlus, FileEdit, Download, ExternalLink, X, CreditCard } from 'lucide-react';
import { Company, Individual } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import IndividualEditModal from './IndividualEditModal';
import CompanyFinancialModal from './CompanyFinancialModal';

interface CompaniesSectionProps {
  companies: Company[];
  onManageEmployees?: (company: Company) => void;
  onEditCompany?: (company: Company) => void;
  onManageDocuments?: (company: Company) => void;
  onNavigate?: (view: string) => void;
}

const CompaniesSection: React.FC<CompaniesSectionProps> = ({
  companies = [],
  onManageEmployees,
  onEditCompany,
  onManageDocuments,
  onNavigate
}) => {
  const { user, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesCompany, setNotesCompany] = useState<Company | null>(null);
  const [notes, setNotes] = useState('');
  const [allCompanies, setAllCompanies] = useState<Company[]>(companies);
  const [loading, setLoading] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [financialCompany, setFinancialCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'individuals'>('companies');
  const [individuals, setIndividuals] = useState<any[]>([]);
  const [selectedIndividual, setSelectedIndividual] = useState<any>(null);
  const [showIndividualDetails, setShowIndividualDetails] = useState(false);
  const [showEditIndividual, setShowEditIndividual] = useState(false);
  const [showDeleteIndividual, setShowDeleteIndividual] = useState(false);
  const [individualToDelete, setIndividualToDelete] = useState<any>(null);
  const [showIndividualNotes, setShowIndividualNotes] = useState(false);
  const [individualNotes, setIndividualNotes] = useState('');
  const [companyDocuments, setCompanyDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Load companies and individuals from Supabase on component mount
  useEffect(() => {
    // Only load data if user is properly authenticated
    if (user && (user.role === 'super_admin' || (user.service_employee_id && user.service_employee_id.length === 36))) {
      loadCompanies();
      loadIndividuals();
    } else {
      console.log('User not properly authenticated, skipping data load:', user);
      setAllCompanies([]);
      setIndividuals([]);
      setLoading(false);
    }
  }, [user]);

  const loadCompanies = async () => {
    if (!user) {
      console.log('No user authenticated, skipping companies load');
      return;
    }

    setLoading(true);
    try {
      console.log('Loading companies with user:', user?.service_employee_id, 'role:', user?.role);
      const supabaseCompanies = await dbHelpers.getCompanies(user?.service_employee_id, user?.role);
      // Transform Supabase data to match our Company interface
      const transformedCompanies = supabaseCompanies.map((company: any) => ({
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
        creditLimit: company.credit_limit,
        creditLimitDays: company.credit_limit_days,
        proName: company.pro_name,
        proPhone: company.pro_phone,
        proEmail: company.pro_email,
        dateOfRegistration: company.date_of_registration,
        createdBy: company.created_by,
        status: company.status,
        employeeCount: company.employee_count,
        lastActivity: company.last_activity,
        notes: company.notes
      }));

      // Remove duplicates based on company ID
      const uniqueCompanies = transformedCompanies.filter((company, index, self) =>
        index === self.findIndex(c => c.id === company.id)
      );

      setAllCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error loading companies:', error);
      setAllCompanies(companies);
    } finally {
      setLoading(false);
    }
  };

  const loadIndividuals = async () => {
    if (!user) {
      console.log('No user authenticated, skipping individuals load');
      return;
    }

    try {
      console.log('Loading individuals with user:', user?.service_employee_id, 'role:', user?.role);
      const supabaseIndividuals = await dbHelpers.getIndividuals(user?.service_employee_id, user?.role);
      console.log('Loaded individuals:', supabaseIndividuals);
      setIndividuals(supabaseIndividuals || []);
    } catch (error) {
      console.error('Error loading individuals:', error);
      setIndividuals([]);
    }
  };

  const companyTypes = ['all', 'Limited Liability Company', 'Free Zone Company', 'Construction Company'];

  const filteredCompanies = allCompanies.filter(company => {
    const matchesSearch = company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.proName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.licenseNo?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || company.companyType === filterType;

    return matchesSearch && matchesType;
  });

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.companyName.localeCompare(b.companyName);
      case 'date':
        return new Date(b.dateOfRegistration).getTime() - new Date(a.dateOfRegistration).getTime();
      case 'creditLimit':
        return b.creditLimit - a.creditLimit;
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Grade A+': return 'bg-purple-100 text-purple-800';
      case 'Grade A': return 'bg-blue-100 text-blue-800';
      case 'Grade B+': return 'bg-green-100 text-green-800';
      case 'Grade B': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const loadCompanyDocuments = async (companyId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanyDocuments(data || []);
    } catch (error) {
      console.error('Error loading company documents:', error);
      setCompanyDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowDetails(true);
    loadCompanyDocuments(company.id);
  };

  const handleAddNotes = (company: Company) => {
    setNotesCompany(company);
    setNotes(company.notes || '');
    setShowNotesModal(true);
  };

  const handleViewFinancials = (company: Company) => {
    setFinancialCompany(company);
    setShowFinancialModal(true);
  };

  const handleSaveNotes = async () => {
    if (!notesCompany) return;

    try {
      console.log('Saving notes for company:', notesCompany.id);
      console.log('Notes content:', notes);

      // First, try to add the notes column if it doesn't exist
      try {
        await dbHelpers.addNotesColumnToCompanies();
      } catch (columnError) {
        console.log('Notes column might already exist or error adding it:', columnError);
      }

      // Update company notes in database
      const result = await dbHelpers.updateCompany(notesCompany.id, { notes });
      console.log('Update result:', result);

      // Update local state
      setAllCompanies(prev =>
        prev.map(company =>
          company.id === notesCompany.id
            ? { ...company, notes }
            : company
        )
      );

      setShowNotesModal(false);
      setNotesCompany(null);
      setNotes('');
      alert('Notes saved successfully!');
    } catch (error) {
      console.error('Detailed error saving notes:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'Error saving notes. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('column "notes" of relation "companies" does not exist')) {
          errorMessage = 'Database schema needs to be updated. Please contact support.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      alert(errorMessage);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    const confirmMessage = `⚠️ WARNING: Delete ${company.companyName}?

This will permanently delete:
• All employees and their documents
• All reminders and notes
• All service records
• All account transactions (except invoices)

Invoices will be preserved for record-keeping.

This action cannot be undone. Are you sure?`;

    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        await dbHelpers.deleteCompany(company.id);

        // Update local state
        setAllCompanies(prev => prev.filter(c => c.id !== company.id));

        alert('✅ Company and all related data deleted successfully!\n\nInvoices have been preserved for record-keeping.');
      } catch (error) {
        console.error('Error deleting company:', error);
        alert(`❌ Error deleting company: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Individual handlers
  const handleViewIndividual = (individual: any) => {
    setSelectedIndividual(individual);
    setShowIndividualDetails(true);
  };

  const handleEditIndividual = (individual: any) => {
    setSelectedIndividual(individual);
    setShowEditIndividual(true);
  };

  const handleDeleteIndividual = (individual: any) => {
    setIndividualToDelete(individual);
    setShowDeleteIndividual(true);
  };

  const handleIndividualNotes = (individual: any) => {
    setSelectedIndividual(individual);
    setIndividualNotes(individual.notes || '');
    setShowIndividualNotes(true);
  };

  const confirmDeleteIndividual = async () => {
    if (!individualToDelete) return;

    try {
      await dbHelpers.deleteIndividual(individualToDelete.id);
      await loadIndividuals();
      setShowDeleteIndividual(false);
      setIndividualToDelete(null);
      alert('Individual deleted successfully!');
    } catch (error) {
      console.error('Error deleting individual:', error);
      alert(`Error deleting individual: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveIndividualNotes = async () => {
    if (!selectedIndividual) return;

    try {
      await dbHelpers.updateIndividualNotes(selectedIndividual.id, individualNotes);
      await loadIndividuals();
      setShowIndividualNotes(false);
      setSelectedIndividual(null);
      setIndividualNotes('');
      alert('Notes saved successfully!');
    } catch (error) {
      console.error('Error saving individual notes:', error);
      alert(`Error saving notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Registered Clients</h1>
              <p className="text-gray-500 mt-1">Manage and view all registered companies and individuals</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Company Name</option>
                  <option value="date">Registration Date</option>
                  <option value="creditLimit">Credit Limit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('companies')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'companies'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Companies ({allCompanies.length})
            </button>
            <button
              onClick={() => setActiveTab('individuals')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'individuals'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Individuals ({individuals.length})
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by company name, PRO name, or license number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {companyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => onNavigate?.('customer-registration')}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Company</span>
              </button>
            </div>
          </div>
        </div>

        {/* Companies Tab Content */}
        {activeTab === 'companies' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Grade</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financial</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRO Details</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{company.companyName}</div>
                            <div className="text-sm text-gray-500">License: {company.licenseNo || 'N/A'}</div>
                            <div className="text-xs text-gray-400">
                              Registered: {new Date(company.dateOfRegistration).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            {company.phone1}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            {company.email1}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="text-sm text-gray-900">{company.companyType}</div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(company.companyGrade)}`}>
                            {company.companyGrade}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                            AED {company.creditLimit.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">{company.creditLimitDays} days</div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">{company.proName || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{company.proPhone || 'N/A'}</div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.status)}`}>
                          {company.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(company)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditCompany?.(company)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Company"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onManageEmployees?.(company)}
                            className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Manage Employees"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          {/* <button
                            onClick={() => onManageDocuments?.(company)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Manage Documents"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button> */}
                          <button
                            onClick={() => handleViewFinancials(company)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Financial Details"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAddNotes(company)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Add Notes"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Company"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {sortedCompanies.length} of {companies.length} companies
                </p>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                    1
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Individuals Tab Content */}
        {activeTab === 'individuals' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Individual</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {individuals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No individuals found</h3>
                        <p className="text-gray-600">No individual registrations yet.</p>
                      </td>
                    </tr>
                  ) : (
                    individuals.map((individual) => (
                      <tr key={individual.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-4">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{individual.individual_name}</div>
                              <div className="text-sm text-gray-500">ID: {individual.emirates_id || 'N/A'}</div>
                              <div className="text-xs text-gray-400">
                                Registered: {new Date(individual.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-gray-900">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {individual.phone1 || 'N/A'}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {individual.email1 || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{individual.nationality || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Gender: {individual.gender || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">Passport: {individual.passport_number || 'N/A'}</div>
                            <div className="text-sm text-gray-500">Visa: {individual.visa_number || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleViewIndividual(individual)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditIndividual(individual)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Edit Individual"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleIndividualNotes(individual)}
                              className="text-purple-600 hover:text-purple-900 transition-colors"
                              title="Add Notes"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteIndividual(individual)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete Individual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{individuals.length}</span> individuals
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Company Details Modal */}
      {showDetails && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Company Name</label>
                      <p className="text-sm text-gray-900">{selectedCompany.companyName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">VAT/TRN Number</label>
                      <p className="text-sm text-gray-900">{selectedCompany.vatTrnNo || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Company Type</label>
                      <p className="text-sm text-gray-900">{selectedCompany.companyType}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">License Number</label>
                      <p className="text-sm text-gray-900">{selectedCompany.licenseNo || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Primary Phone</label>
                      <p className="text-sm text-gray-900">{selectedCompany.phone1}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Primary Email</label>
                      <p className="text-sm text-gray-900">{selectedCompany.email1}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Address</label>
                      <p className="text-sm text-gray-900">{selectedCompany.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Credit Limit</label>
                      <p className="text-sm text-gray-900">AED {selectedCompany.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Credit Limit Days</label>
                      <p className="text-sm text-gray-900">{selectedCompany.creditLimitDays} days</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Company Grade</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeColor(selectedCompany.companyGrade)}`}>
                        {selectedCompany.companyGrade}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">PRO Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">PRO Name</label>
                      <p className="text-sm text-gray-900">{selectedCompany.proName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">PRO Phone</label>
                      <p className="text-sm text-gray-900">{selectedCompany.proPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">PRO Email</label>
                      <p className="text-sm text-gray-900">{selectedCompany.proEmail || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents & Certificates</h3>

                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading documents...</span>
                  </div>
                ) : companyDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyDocuments.map((doc) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{doc.title}</h4>
                            {doc.document_number && (
                              <p className="text-sm text-gray-600">#{doc.document_number}</p>
                            )}
                          </div>
                          {doc.file_attachments && doc.file_attachments[0] && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => window.open(doc.file_attachments[0].url, '_blank')}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="View Document"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_attachments[0].url;
                                  link.download = doc.file_attachments[0].name || doc.title;
                                  link.click();
                                }}
                                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                title="Download Document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          {doc.expiry_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Expiry Date:</span>
                              <span className={`font-medium ${
                                new Date(doc.expiry_date) < new Date()
                                  ? 'text-red-600'
                                  : new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}>
                                {new Date(doc.expiry_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Uploaded:</span>
                            <span className="text-gray-900">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {doc.file_attachments && doc.file_attachments[0] && (
                            <div className="mt-3">
                              {doc.file_attachments[0].type?.startsWith('image/') ? (
                                <img
                                  src={doc.file_attachments[0].url}
                                  alt={doc.title}
                                  className="w-full h-32 object-cover rounded border border-gray-200"
                                />
                              ) : (
                                <div className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200">
                                  <FileText className="w-6 h-6 text-gray-600" />
                                  <span className="text-sm text-gray-700 truncate">
                                    {doc.file_attachments[0].name || doc.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No documents uploaded for this company</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && notesCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Add Notes - {notesCompany.companyName}
                </h2>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesCompany(null);
                    setNotes('');
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    placeholder="Add notes about this company..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesCompany(null);
                    setNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Details Modal */}
      {showIndividualDetails && selectedIndividual && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Individual Details</h2>
                <button
                  onClick={() => setShowIndividualDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{selectedIndividual.individual_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedIndividual.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedIndividual.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                      <p className="text-gray-900">{selectedIndividual.nationality || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Document Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Document Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Emirates ID</label>
                      <p className="text-gray-900">{selectedIndividual.emirates_id || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                      <p className="text-gray-900">{selectedIndividual.passport_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Visa Number</label>
                      <p className="text-gray-900">{selectedIndividual.visa_number || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedIndividual.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedIndividual.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowIndividualDetails(false);
                  handleEditIndividual(selectedIndividual);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Edit Individual
              </button>
              <button
                onClick={() => setShowIndividualDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Notes Modal */}
      {showIndividualNotes && selectedIndividual && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Notes for {selectedIndividual.individual_name}
                </h2>
                <button
                  onClick={() => setShowIndividualNotes(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={individualNotes}
                  onChange={(e) => setIndividualNotes(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Add notes about this individual..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowIndividualNotes(false);
                  setSelectedIndividual(null);
                  setIndividualNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveIndividualNotes}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Individual Modal */}
      {showEditIndividual && selectedIndividual && (
        <IndividualEditModal
          individual={selectedIndividual}
          onClose={() => {
            setShowEditIndividual(false);
            setSelectedIndividual(null);
          }}
          onSave={(updatedIndividual) => {
            // Update the individual in the local state
            setAllIndividuals(prev =>
              prev.map(ind => ind.id === updatedIndividual.id ? updatedIndividual : ind)
            );
            setShowEditIndividual(false);
            setSelectedIndividual(null);
          }}
        />
      )}

      {/* Delete Individual Confirmation Modal */}
      {showDeleteIndividual && individualToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Individual
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{individualToDelete.individual_name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteIndividual(false);
                    setIndividualToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteIndividual}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Financial Modal */}
      {financialCompany && (
        <CompanyFinancialModal
          company={financialCompany}
          isOpen={showFinancialModal}
          onClose={() => {
            setShowFinancialModal(false);
            setFinancialCompany(null);
          }}
        />
      )}
    </div>
  );
};

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);



export default CompaniesSection;