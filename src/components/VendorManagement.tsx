import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building,
  CreditCard,
  Settings,
  MoreVertical
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { mockVendors } from '../data/mockData';
import { Vendor } from '../types';

const VendorManagement: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const vendorsData = await dbHelpers.getVendors();
      setVendors(vendorsData || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      // If vendors table doesn't exist, fall back to mock data
      if (error instanceof Error && (error.message.includes('relation "vendors" does not exist') || error.message.includes('table "vendors" does not exist'))) {
        console.log('Vendors table does not exist, using mock data');
        setVendors(mockVendors || []);
      } else {
        setError('Failed to load vendors. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'contracts' | 'performance'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [assignedWork, setAssignedWork] = useState<any[]>([]);
  const [showNewContract, setShowNewContract] = useState(false);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [showEditContract, setShowEditContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [editContractForm, setEditContractForm] = useState({
    title: '',
    type: '',
    value: 0,
    startDate: '',
    endDate: '',
    terms: '',
    renewalDate: ''
  });

  // Vendor Form State
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    serviceCategory: '',
    paymentTerms: 'Net 30'
  });
  const [vendorFormErrors, setVendorFormErrors] = useState<Record<string, string>>({});

  // Contract Form State
  const [contractForm, setContractForm] = useState({
    vendorId: '',
    title: '',
    contractType: '',
    value: '',
    startDate: '',
    endDate: '',
    terms: ''
  });
  const [contractFormErrors, setContractFormErrors] = useState<Record<string, string>>({});

  const getVendorTypeColor = (type: string) => {
    switch (type) {
      case 'insurance': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tax_consultant': return 'bg-green-100 text-green-800 border-green-200';
      case 'legal_services': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'translation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'attestation': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Vendor form validation
  const validateVendorForm = () => {
    const errors: Record<string, string> = {};

    if (!vendorForm.name.trim()) {
      errors.name = 'Vendor name is required';
    }
    if (!vendorForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorForm.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!vendorForm.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!vendorForm.contactPerson.trim()) {
      errors.contactPerson = 'Contact person is required';
    }
    if (!vendorForm.serviceCategory.trim()) {
      errors.serviceCategory = 'Service category is required';
    }

    setVendorFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle vendor form submission
  const handleCreateVendor = async () => {
    try {
      if (!validateVendorForm()) {
        return;
      }

      const vendorData = {
        name: vendorForm.name.trim(),
        email: vendorForm.email.trim(),
        phone: vendorForm.phone.trim(),
        address: vendorForm.address.trim() || null,
        contact_person: vendorForm.contactPerson.trim(),
        service_category: vendorForm.serviceCategory.trim(),
        payment_terms: vendorForm.paymentTerms,
        is_active: true
      };

      console.log('Creating vendor with data:', vendorData);
      const result = await dbHelpers.createVendor(vendorData);
      console.log('Vendor created successfully:', result);

      // Reset form and close modal
      setVendorForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        serviceCategory: '',
        paymentTerms: 'Net 30'
      });
      setVendorFormErrors({});
      setShowAddVendor(false);
      alert('✅ Vendor registered successfully!');

      // Reload vendors to show the new vendor
      await loadVendors();

    } catch (error) {
      console.error('Error creating vendor:', error);
      let errorMessage = 'Error creating vendor. ';
      if (error instanceof Error) {
        if (error.message.includes('relation "vendors" does not exist') || error.message.includes('table "vendors" does not exist')) {
          errorMessage = 'Vendors table does not exist in the database. Please contact your administrator to set up the database tables.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }
      alert(`❌ ${errorMessage}`);
    }
  };

  // Contract form validation
  const validateContractForm = () => {
    const errors: Record<string, string> = {};

    if (!contractForm.vendorId) {
      errors.vendorId = 'Please select a vendor';
    }
    if (!contractForm.title.trim()) {
      errors.title = 'Contract title is required';
    }
    if (!contractForm.contractType) {
      errors.contractType = 'Contract type is required';
    }
    if (!contractForm.value || parseFloat(contractForm.value) <= 0) {
      errors.value = 'Please enter a valid contract value';
    }
    if (!contractForm.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!contractForm.endDate) {
      errors.endDate = 'End date is required';
    }
    if (contractForm.startDate && contractForm.endDate && new Date(contractForm.startDate) >= new Date(contractForm.endDate)) {
      errors.endDate = 'End date must be after start date';
    }

    setContractFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle contract form submission
  const handleCreateContract = async () => {
    try {
      if (!validateContractForm()) {
        return;
      }

      const contractData = {
        vendor_id: contractForm.vendorId,
        title: contractForm.title.trim(),
        contract_type: contractForm.contractType,
        value: parseFloat(contractForm.value),
        start_date: contractForm.startDate,
        end_date: contractForm.endDate,
        terms: contractForm.terms.trim() || null,
        status: 'active'
      };

      console.log('Creating contract with data:', contractData);
      const result = await dbHelpers.createContract(contractData);
      console.log('Contract created successfully:', result);

      // Reset form and close modal
      setContractForm({
        vendorId: '',
        title: '',
        contractType: '',
        value: '',
        startDate: '',
        endDate: '',
        terms: ''
      });
      setContractFormErrors({});
      setShowNewContract(false);
      alert('✅ Contract created successfully!');

    } catch (error) {
      console.error('Error creating contract:', error);
      let errorMessage = 'Error creating contract. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      alert(`❌ ${errorMessage}`);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.service_category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || vendor.service_category === filterType;

    return matchesSearch && matchesFilter;
  });

  // Mock assigned work data - in real app, this would come from service billings
  const [mockAssignedWork, setMockAssignedWork] = useState([
    {
      id: '1',
      vendorId: '1',
      serviceName: 'Health Insurance Setup',
      clientName: 'ABC Trading LLC',
      assignedDate: '2024-01-15',
      dueDate: '2024-01-30',
      status: 'pending',
      amount: 2500,
      description: 'Setup comprehensive health insurance for 15 employees'
    },
    {
      id: '2',
      vendorId: '1',
      serviceName: 'Life Insurance Policy',
      clientName: 'XYZ Corporation',
      assignedDate: '2024-01-10',
      dueDate: '2024-01-25',
      status: 'completed',
      amount: 1800,
      description: 'Life insurance policy for key personnel'
    },
    {
      id: '3',
      vendorId: '2',
      serviceName: 'VAT Registration',
      clientName: 'Tech Solutions LLC',
      assignedDate: '2024-01-20',
      dueDate: '2024-02-05',
      status: 'pending',
      amount: 1200,
      description: 'VAT registration and compliance setup'
    },
    {
      id: '4',
      vendorId: '2',
      serviceName: 'Tax Filing',
      clientName: 'Global Enterprises',
      assignedDate: '2024-01-05',
      dueDate: '2024-01-20',
      status: 'completed',
      amount: 800,
      description: 'Quarterly tax filing and documentation'
    }
  ]);

  // Mock contracts data
  const [contracts, setContracts] = useState([
    {
      id: '1',
      vendor: 'Emirates Insurance Brokers',
      vendorId: '1',
      title: 'Annual Insurance Services',
      type: 'annual_contract',
      value: 50000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      terms: 'Comprehensive insurance coverage including health, life, and property insurance for all company operations.',
      renewalDate: '2024-11-01'
    },
    {
      id: '2',
      vendor: 'Gulf Tax Consultancy',
      vendorId: '2',
      title: 'Monthly Tax Compliance',
      type: 'retainer',
      value: 24000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      terms: 'Monthly tax compliance services including VAT filing, corporate tax preparation, and regulatory compliance.',
      renewalDate: '2024-11-15'
    }
  ]);

  const handleViewVendorDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    const vendorWork = mockAssignedWork.filter(work => work.vendorId === vendor.id);
    setAssignedWork(vendorWork);
    setShowVendorDetails(true);
  };

  const handleMarkWorkComplete = (workId: string) => {
    // Update the main work array
    setMockAssignedWork(prev => prev.map(work =>
      work.id === workId ? { ...work, status: 'completed' } : work
    ));

    // Update the assigned work for the current vendor
    setAssignedWork(prev => prev.map(work =>
      work.id === workId ? { ...work, status: 'completed' } : work
    ));
  };

  // Contract handlers
  const handleViewContract = (contract: any) => {
    setSelectedContract(contract);
    setShowContractDetails(true);
  };

  const handleEditContract = (contract: any) => {
    setSelectedContract(contract);
    setEditContractForm({
      title: contract.title,
      type: contract.type,
      value: contract.value,
      startDate: contract.startDate,
      endDate: contract.endDate,
      terms: contract.terms,
      renewalDate: contract.renewalDate
    });
    setShowEditContract(true);
  };

  const handleUpdateContract = () => {
    if (selectedContract) {
      setContracts(prev => prev.map(contract =>
        contract.id === selectedContract.id
          ? { ...contract, ...editContractForm }
          : contract
      ));
      setShowEditContract(false);
      setSelectedContract(null);
      setEditContractForm({
        title: '',
        type: '',
        value: 0,
        startDate: '',
        endDate: '',
        terms: '',
        renewalDate: ''
      });
    }
  };

  const handleDeleteContract = (contractId: string) => {
    setContractToDelete(contractId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteContract = () => {
    if (contractToDelete) {
      setContracts(prev => prev.filter(contract => contract.id !== contractToDelete));
      setContractToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Calculate vendor workload statistics
  const totalPendingWork = mockAssignedWork.filter(w => w.status === 'pending').length;
  const totalCompletedWork = mockAssignedWork.filter(w => w.status === 'completed').length;
  const vendorWorkload = mockAssignedWork.reduce((acc: any, work) => {
    if (!acc[work.vendorId]) {
      acc[work.vendorId] = { pending: 0, completed: 0, total: 0 };
    }
    if (work.status === 'pending') acc[work.vendorId].pending++;
    if (work.status === 'completed') acc[work.vendorId].completed++;
    acc[work.vendorId].total++;
    return acc;
  }, {});

  const mostAssignedVendor = Object.entries(vendorWorkload).reduce((max: any, [vendorId, workload]: [string, any]) => {
    return workload.total > (max.workload?.total || 0) ? { vendorId, workload } : max;
  }, {});

  const mostAssignedVendorName = mostAssignedVendor.vendorId
    ? vendors.find(v => v.id === mostAssignedVendor.vendorId)?.name || 'Unknown'
    : 'None';

  const stats = [
    {
      title: 'Total Vendors',
      value: vendors.length.toString(),
      change: `${vendors.filter(v => v.status === 'active').length} active`,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Pending Tasks',
      value: totalPendingWork.toString(),
      change: `${totalCompletedWork} completed`,
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Most Assigned',
      value: mostAssignedVendorName.split(' ')[0] || 'None',
      change: `${mostAssignedVendor.workload?.total || 0} total tasks`,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Average Rating',
      value: '4.7',
      change: '+0.2 from last month',
      icon: Star,
      color: 'green'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm mt-2 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    'text-blue-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'yellow' ? 'bg-yellow-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vendor Workload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Workload</h3>
        <div className="space-y-4">
          {Object.entries(vendorWorkload).map(([vendorId, workload]: [string, any]) => {
            const vendor = vendors.find(v => v.id === vendorId);
            if (!vendor) return null;

            return (
              <div key={vendorId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {vendor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{vendor.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-600">{workload.pending}</p>
                    <p className="text-xs text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{workload.completed}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{workload.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                  <button
                    onClick={() => handleViewVendorDetails(vendor)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
          {Object.keys(vendorWorkload).length === 0 && (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Work</h3>
              <p className="text-gray-600">No vendors have been assigned work yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performing Vendors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h3>
        <div className="space-y-4">
          {vendors.sort((a, b) => b.rating - a.rating).slice(0, 5).map((vendor, index) => (
            <div key={vendor.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full text-white font-semibold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{vendor.name}</p>
                <p className="text-sm text-gray-600 capitalize">{vendor.type.replace('_', ' ')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-900">{vendor.rating}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{vendor.performanceMetrics.completedJobs} jobs</p>
                <p className="text-xs text-gray-600">{vendor.performanceMetrics.onTimeDelivery}% on-time</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Award }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadVendors}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600 mt-1">Manage relationships with service providers and track performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowAddVendor(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'vendors' && renderVendorsList()}
      {activeTab === 'contracts' && renderContracts()}
      {activeTab === 'performance' && renderPerformance()}

      {/* Vendor Details Modal */}
      {showVendorDetails && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {selectedVendor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
                    <p className="text-gray-600">{selectedVendor.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVendorDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Vendor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedVendor.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedVendor.phone}</span>
                    </div>
                    {selectedVendor.website && (
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">{selectedVendor.website}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedVendor.performanceMetrics.completedJobs}</p>
                      <p className="text-blue-600 text-sm">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedVendor.performanceMetrics.onTimeDelivery}%</p>
                      <p className="text-green-600 text-sm">On-Time</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Work */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Work</h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Pending: {assignedWork.filter(w => w.status === 'pending').length}
                    </span>
                    <span className="text-sm text-gray-600">
                      Completed: {assignedWork.filter(w => w.status === 'completed').length}
                    </span>
                  </div>
                </div>

                {assignedWork.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Work</h3>
                    <p className="text-gray-600">This vendor has no assigned work yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedWork.map((work) => (
                      <div key={work.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{work.serviceName}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                work.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {work.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-2">{work.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Client: {work.clientName}</span>
                              <span>Due: {new Date(work.dueDate).toLocaleDateString()}</span>
                              <span>Amount: AED {work.amount.toLocaleString()}</span>
                            </div>
                          </div>
                          {work.status === 'pending' && (
                            <button
                              onClick={() => handleMarkWorkComplete(work.id)}
                              className="ml-4 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Vendor</h2>
                <button
                  onClick={() => setShowAddVendor(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateVendor(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vendor Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        vendorFormErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter vendor name"
                    />
                    {vendorFormErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{vendorFormErrors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        vendorFormErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {vendorFormErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{vendorFormErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        vendorFormErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {vendorFormErrors.phone && (
                      <p className="text-red-500 text-sm mt-1">{vendorFormErrors.phone}</p>
                    )}
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        vendorFormErrors.contactPerson ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contact person name"
                    />
                    {vendorFormErrors.contactPerson && (
                      <p className="text-red-500 text-sm mt-1">{vendorFormErrors.contactPerson}</p>
                    )}
                  </div>

                  {/* Service Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Category *
                    </label>
                    <select
                      value={vendorForm.serviceCategory}
                      onChange={(e) => setVendorForm({ ...vendorForm, serviceCategory: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        vendorFormErrors.serviceCategory ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select service category</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Tax Consultancy">Tax Consultancy</option>
                      <option value="Legal Services">Legal Services</option>
                      <option value="Translation">Translation</option>
                      <option value="Attestation">Attestation</option>
                      <option value="Business Setup">Business Setup</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Other">Other</option>
                    </select>
                    {vendorFormErrors.serviceCategory && (
                      <p className="text-red-500 text-sm mt-1">{vendorFormErrors.serviceCategory}</p>
                    )}
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <select
                      value={vendorForm.paymentTerms}
                      onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter vendor address"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVendor(false);
                      setVendorForm({
                        name: '',
                        email: '',
                        phone: '',
                        address: '',
                        contactPerson: '',
                        serviceCategory: '',
                        paymentTerms: 'Net 30'
                      });
                      setVendorFormErrors({});
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Register Vendor
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Contract Modal */}
      {showNewContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Create New Contract</h2>
                <button
                  onClick={() => setShowNewContract(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateContract(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vendor Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Vendor *
                    </label>
                    <select
                      value={contractForm.vendorId}
                      onChange={(e) => setContractForm({ ...contractForm, vendorId: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.vendorId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                    {contractFormErrors.vendorId && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.vendorId}</p>
                    )}
                  </div>

                  {/* Contract Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Title *
                    </label>
                    <input
                      type="text"
                      value={contractForm.title}
                      onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contract title"
                    />
                    {contractFormErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.title}</p>
                    )}
                  </div>

                  {/* Contract Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Type *
                    </label>
                    <select
                      value={contractForm.contractType}
                      onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.contractType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select contract type</option>
                      <option value="Service Agreement">Service Agreement</option>
                      <option value="Maintenance Contract">Maintenance Contract</option>
                      <option value="Consulting Agreement">Consulting Agreement</option>
                      <option value="Supply Contract">Supply Contract</option>
                      <option value="Partnership Agreement">Partnership Agreement</option>
                      <option value="Other">Other</option>
                    </select>
                    {contractFormErrors.contractType && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.contractType}</p>
                    )}
                  </div>

                  {/* Contract Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Value (AED) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={contractForm.value}
                      onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.value ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contract value"
                    />
                    {contractFormErrors.value && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.value}</p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={contractForm.startDate}
                      onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.startDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {contractFormErrors.startDate && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.startDate}</p>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={contractForm.endDate}
                      onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        contractFormErrors.endDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {contractFormErrors.endDate && (
                      <p className="text-red-500 text-sm mt-1">{contractFormErrors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms and Conditions
                  </label>
                  <textarea
                    value={contractForm.terms}
                    onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contract terms and conditions"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewContract(false);
                      setContractForm({
                        vendorId: '',
                        title: '',
                        contractType: '',
                        value: '',
                        startDate: '',
                        endDate: '',
                        terms: ''
                      });
                      setContractFormErrors({});
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Contract
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contract Details Modal */}
      {showContractDetails && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Contract Details</h2>
                <button
                  onClick={() => setShowContractDetails(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedContract.title}</h3>
                  <p className="text-gray-600">{selectedContract.vendor}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Contract Value</span>
                    <p className="font-medium text-gray-900">AED {selectedContract.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Type</span>
                    <p className="font-medium text-gray-900 capitalize">{selectedContract.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Start Date</span>
                    <p className="font-medium text-gray-900">{selectedContract.startDate}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">End Date</span>
                    <p className="font-medium text-gray-900">{selectedContract.endDate}</p>
                  </div>
                </div>

                {selectedContract.terms && (
                  <div>
                    <span className="text-sm text-gray-600">Terms & Conditions</span>
                    <p className="mt-1 text-gray-900">{selectedContract.terms}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {showEditContract && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Contract</h2>
                <button
                  onClick={() => setShowEditContract(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Title
                    </label>
                    <input
                      type="text"
                      value={editContractForm.title}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Enter contract title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Type
                    </label>
                    <select
                      value={editContractForm.type}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Select type</option>
                      <option value="annual_contract">Annual Contract</option>
                      <option value="retainer">Retainer</option>
                      <option value="project_based">Project Based</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Value (AED)
                    </label>
                    <input
                      type="number"
                      value={editContractForm.value}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      value={editContractForm.renewalDate}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, renewalDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editContractForm.startDate}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={editContractForm.endDate}
                      onChange={(e) => setEditContractForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={editContractForm.terms}
                    onChange={(e) => setEditContractForm(prev => ({ ...prev, terms: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter contract terms and conditions"
                  />
                </div>
              </form>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditContract(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateContract}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800"
              >
                Update Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Contract</h3>
                  <p className="text-gray-600">Are you sure you want to delete this contract?</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteContract}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderVendorsList() {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="insurance">Insurance</option>
                  <option value="tax_consultant">Tax Consultant</option>
                  <option value="legal_services">Legal Services</option>
                  <option value="translation">Translation</option>
                  <option value="attestation">Attestation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {vendor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                    <p className="text-sm text-gray-600">{vendor.contactPerson}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewVendorDetails(vendor)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details & Assigned Work"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{vendor.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{vendor.phone}</span>
                </div>
                {vendor.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{vendor.website}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getVendorTypeColor(vendor.type)}`}>
                    {vendor.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-900">{vendor.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(vendor.status)}`}>
                    {vendor.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {vendor.performanceMetrics.completedJobs} jobs completed
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderContracts() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Contracts</h3>
            <button
              onClick={() => setShowNewContract(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>New Contract</span>
            </button>
          </div>

          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{contract.title}</h4>
                    <p className="text-sm text-gray-600">{contract.vendor}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
                    {contract.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Contract Value</p>
                    <p className="font-medium text-gray-900">AED {contract.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Start Date</p>
                    <p className="font-medium text-gray-900">{contract.startDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">End Date</p>
                    <p className="font-medium text-gray-900">{contract.endDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="font-medium text-gray-900 capitalize">{contract.type.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-3">
                  <button
                    onClick={() => handleViewContract(contract)}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">View</span>
                  </button>
                  <button
                    onClick={() => handleEditContract(contract)}
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteContract(contract.id)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPerformance() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Analytics</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {vendor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{vendor.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">{vendor.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-gray-900">{vendor.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{vendor.performanceMetrics.totalJobs}</p>
                    <p className="text-blue-600">Total Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{vendor.performanceMetrics.completedJobs}</p>
                    <p className="text-green-600">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{vendor.performanceMetrics.averageRating}</p>
                    <p className="text-yellow-600">Avg Rating</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{vendor.performanceMetrics.onTimeDelivery}%</p>
                    <p className="text-purple-600">On-Time</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
};

export default VendorManagement;
