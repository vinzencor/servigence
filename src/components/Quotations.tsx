import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, FileText, Building2, Users, Calendar, DollarSign, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import QuotationForm from './QuotationForm';
import QuotationViewModal from './QuotationViewModal';

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_type: 'existing_company' | 'new_company';
  company_id?: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  service_id?: string;
  service_name?: string; // DEPRECATED: Now stored in items array
  items?: any[]; // Array of quotation_items
  total_amount: number;
  quotation_date: string;
  validity_period: number;
  valid_until: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  lead_status?: 'converted' | 'lost' | 'pending' | 'follow_up' | 'qualified' | 'unqualified';
  notes?: string;
  created_at: string;
  company?: {
    id: string;
    company_name: string;
    phone1?: string;
    email1?: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
    typing_charges: number;
    government_charges: number;
  };
}

const Quotations: React.FC = () => {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  // Multi-select state
  const [selectedQuotations, setSelectedQuotations] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'existing_company' | 'new_company'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadQuotations();
  }, [filterType, filterStatus, dateFrom, dateTo]);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const filters = {
        quotationType: filterType,
        status: filterStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };
      
      const data = await dbHelpers.getQuotations(filters);
      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = () => {
    setEditingQuotation(null);
    setShowForm(true);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowForm(true);
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const handleDeleteQuotation = async (quotation: Quotation) => {
    if (!confirm(`Are you sure you want to delete quotation ${quotation.quotation_number}?`)) {
      return;
    }

    try {
      await dbHelpers.deleteQuotation(quotation.id);
      toast.success('Quotation deleted successfully');
      loadQuotations();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error('Failed to delete quotation');
    }
  };

  const handleUpdateStatus = async (quotation: Quotation, newStatus: string) => {
    try {
      await dbHelpers.updateQuotation(quotation.id, { status: newStatus });
      toast.success(`Quotation status updated to ${newStatus}`);
      loadQuotations();
    } catch (error) {
      console.error('Error updating quotation status:', error);
      toast.error('Failed to update quotation status');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingQuotation) {
        await dbHelpers.updateQuotation(editingQuotation.id, formData);
        toast.success('Quotation updated successfully');
      } else {
        await dbHelpers.createQuotation({
          ...formData,
          created_by: user?.name || 'System'
        });
        toast.success('Quotation created successfully');
      }
      
      setShowForm(false);
      setEditingQuotation(null);
      loadQuotations();
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error('Failed to save quotation');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'sent': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'converted': return <CheckCircle className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    const searchLower = searchTerm.toLowerCase();
    const companyMatch = quotation.company_name.toLowerCase().includes(searchLower);
    const numberMatch = quotation.quotation_number.toLowerCase().includes(searchLower);

    // Search in service items
    const serviceMatch = quotation.items?.some((item: any) =>
      item.service_name?.toLowerCase().includes(searchLower)
    ) || false;

    return companyMatch || numberMatch || serviceMatch;
  });

  const exportToCSV = () => {
    const headers = ['Quotation Number', 'Type', 'Company Name', 'Services', 'Service Count', 'Amount', 'Date', 'Status', 'Valid Until'];
    const csvData = filteredQuotations.map(q => {
      const servicesList = q.items && q.items.length > 0
        ? q.items.map((item: any) => item.service_name).join('; ')
        : 'No services';
      const serviceCount = q.items ? q.items.length : 0;

      return [
        q.quotation_number,
        q.quotation_type === 'existing_company' ? 'Existing Company' : 'New Company',
        q.company_name,
        servicesList,
        serviceCount,
        q.total_amount,
        q.quotation_date,
        q.status,
        q.valid_until
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Multi-select handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedQuotations(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredQuotations.map(q => q.id));
      setSelectedQuotations(allIds);
      setSelectAll(true);
    }
  };

  const handleSelectQuotation = (quotationId: string) => {
    const newSelected = new Set(selectedQuotations);
    if (newSelected.has(quotationId)) {
      newSelected.delete(quotationId);
    } else {
      newSelected.add(quotationId);
    }
    setSelectedQuotations(newSelected);
    setSelectAll(newSelected.size === filteredQuotations.length && filteredQuotations.length > 0);
  };

  const handleBulkDelete = async () => {
    if (selectedQuotations.size === 0) {
      toast.error('Please select quotations to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedQuotations.size} quotation(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedQuotations).map(id =>
        dbHelpers.deleteQuotation(id)
      );
      await Promise.all(deletePromises);
      toast.success(`${selectedQuotations.size} quotation(s) deleted successfully`);
      setSelectedQuotations(new Set());
      setSelectAll(false);
      loadQuotations();
    } catch (error) {
      console.error('Error deleting quotations:', error);
      toast.error('Failed to delete quotations');
    }
  };

  const exportSelectedToCSV = () => {
    if (selectedQuotations.size === 0) {
      toast.error('Please select quotations to export');
      return;
    }

    const selectedData = filteredQuotations.filter(q => selectedQuotations.has(q.id));
    const headers = ['Quotation Number', 'Type', 'Company Name', 'Services', 'Service Count', 'Amount', 'Date', 'Status', 'Valid Until'];
    const csvData = selectedData.map(q => {
      const servicesList = q.items && q.items.length > 0
        ? q.items.map((item: any) => item.service_name).join('; ')
        : 'No services';
      const serviceCount = q.items ? q.items.length : 0;

      return [
        q.quotation_number,
        q.quotation_type === 'existing_company' ? 'Existing Company' : 'New Company',
        q.company_name,
        servicesList,
        serviceCount,
        q.total_amount,
        q.quotation_date,
        q.status,
        q.valid_until
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-quotations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`${selectedQuotations.size} quotation(s) exported successfully`);
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedQuotations(new Set());
    setSelectAll(false);
  }, [searchTerm, filterType, filterStatus, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations Management</h1>
          <p className="text-gray-600">Manage quotations for existing companies and new leads</p>
        </div>
        <button
          onClick={handleCreateQuotation}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{quotations.filter(q => q.status === 'pending').length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{quotations.filter(q => q.status === 'accepted').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-amber-600">AED {quotations.reduce((sum, q) => sum + q.total_amount, 0).toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="existing_company">Existing Company</option>
            <option value="new_company">New Company</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="From Date"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="To Date"
          />

          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedQuotations.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-amber-900">
                {selectedQuotations.size} quotation{selectedQuotations.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => {
                  setSelectedQuotations(new Set());
                  setSelectAll(false);
                }}
                className="text-sm text-amber-700 hover:text-amber-900 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportSelectedToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Selected</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                    title="Select all quotations"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-medium">No quotations found</p>
                    <p className="text-sm">Create your first quotation to get started</p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedQuotations.has(quotation.id)}
                        onChange={() => handleSelectQuotation(quotation.id)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quotation.quotation_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {quotation.quotation_type === 'existing_company' ? (
                          <Building2 className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Users className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-sm text-gray-900">
                          {quotation.quotation_type === 'existing_company' ? 'Existing' : 'New Lead'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{quotation.company_name}</div>
                      {quotation.contact_person && (
                        <div className="text-sm text-gray-500">{quotation.contact_person}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {quotation.items && quotation.items.length > 0 ? (
                        <div className="text-sm text-gray-900">
                          {quotation.items.length === 1 ? (
                            quotation.items[0].service_name
                          ) : (
                            <span className="font-medium">
                              {quotation.items.length} services
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No services</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">AED {quotation.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(quotation.quotation_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(quotation.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(quotation.valid_until).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewQuotation(quotation)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Quotation"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuotation(quotation)}
                          className="text-amber-600 hover:text-amber-900 transition-colors"
                          title="Edit Quotation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quotation)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {quotation.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(quotation, 'sent')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Mark as Sent"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <QuotationForm
          quotation={editingQuotation}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingQuotation(null);
          }}
        />
      )}

      {showViewModal && selectedQuotation && (
        <QuotationViewModal
          quotation={selectedQuotation}
          onClose={() => {
            setShowViewModal(false);
            setSelectedQuotation(null);
          }}
          onEdit={() => {
            setShowViewModal(false);
            handleEditQuotation(selectedQuotation);
          }}
          onStatusUpdate={(newStatus) => {
            handleUpdateStatus(selectedQuotation, newStatus);
            setShowViewModal(false);
            setSelectedQuotation(null);
          }}
        />
      )}
    </div>
  );
};

export default Quotations;
