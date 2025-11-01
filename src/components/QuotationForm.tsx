import React, { useState, useEffect } from 'react';
import { X, Building2, Users, Search, Calculator } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  company_name: string;
  phone1?: string;
  email1?: string;
  address?: string;
}

interface ServiceType {
  id: string;
  name: string;
  category: string;
  typing_charges: number;
  government_charges: number;
  description?: string;
}

interface QuotationFormProps {
  quotation?: any;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const QuotationForm: React.FC<QuotationFormProps> = ({ quotation, onSubmit, onClose }) => {
  const [quotationType, setQuotationType] = useState<'existing_company' | 'new_company'>(
    quotation?.quotation_type || 'existing_company'
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  const [formData, setFormData] = useState({
    company_id: quotation?.company_id || '',
    company_name: quotation?.company_name || '',
    contact_person: quotation?.contact_person || '',
    phone: quotation?.phone || '',
    email: quotation?.email || '',
    address: quotation?.address || '',
    service_id: quotation?.service_id || '',
    service_name: quotation?.service_name || '',
    total_amount: quotation?.total_amount || '',
    quotation_date: quotation?.quotation_date || new Date().toISOString().split('T')[0],
    validity_period: quotation?.validity_period || 30,
    notes: quotation?.notes || '',
    terms_conditions: quotation?.terms_conditions || '',
    status: quotation?.status || 'pending',
    lead_status: quotation?.lead_status || 'pending'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load companies for existing company quotations
      const companiesData = await dbHelpers.getCompanies();
      setCompanies(companiesData || []);

      // Load services
      const servicesData = await dbHelpers.getServiceTypes();
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company: Company) => {
    setFormData(prev => ({
      ...prev,
      company_id: company.id,
      company_name: company.company_name,
      phone: company.phone1 || '',
      email: company.email1 || '',
      address: company.address || ''
    }));
    setSearchCompany(company.company_name);
    setShowCompanyDropdown(false);
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const totalAmount = service.typing_charges + service.government_charges;
      setFormData(prev => ({
        ...prev,
        service_id: serviceId,
        service_name: service.name,
        total_amount: totalAmount.toString()
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.service_name.trim()) {
      newErrors.service_name = 'Service is required';
    }

    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Valid amount is required';
    }

    if (!formData.quotation_date) {
      newErrors.quotation_date = 'Quotation date is required';
    }

    if (quotationType === 'new_company') {
      if (!formData.contact_person.trim()) {
        newErrors.contact_person = 'Contact person is required for new companies';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required for new companies';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required for new companies';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      quotation_type: quotationType,
      total_amount: parseFloat(formData.total_amount),
      validity_period: parseInt(formData.validity_period.toString())
    };

    // Remove company_id for new company quotations
    if (quotationType === 'new_company') {
      delete submitData.company_id;
    }

    onSubmit(submitData);
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchCompany.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          <p className="text-center mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {quotation ? 'Edit Quotation' : 'Create New Quotation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quotation Type Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Quotation Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setQuotationType('existing_company')}
                className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  quotationType === 'existing_company'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">Existing Company</div>
                  <div className="text-sm text-gray-500">For registered companies</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setQuotationType('new_company')}
                className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  quotationType === 'new_company'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">New Company</div>
                  <div className="text-sm text-gray-500">For leads/prospects</div>
                </div>
              </button>
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
            
            {quotationType === 'existing_company' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Company *
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchCompany}
                        onChange={(e) => {
                          setSearchCompany(e.target.value);
                          setShowCompanyDropdown(true);
                        }}
                        onFocus={() => setShowCompanyDropdown(true)}
                        placeholder="Search and select company..."
                        className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                          errors.company_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    
                    {showCompanyDropdown && filteredCompanies.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleCompanySelect(company)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="font-medium">{company.company_name}</div>
                            {company.phone1 && (
                              <div className="text-sm text-gray-500">{company.phone1}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.company_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter company name"
                  />
                  {errors.company_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.contact_person ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter contact person name"
                  />
                  {errors.contact_person && (
                    <p className="text-red-500 text-sm mt-1">{errors.contact_person}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter company address"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Service Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service *
                </label>
                <select
                  value={formData.service_id}
                  onChange={(e) => handleServiceSelect(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.service_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - AED {(service.typing_charges + service.government_charges).toLocaleString()}
                    </option>
                  ))}
                </select>
                {errors.service_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.service_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (AED) *
                </label>
                <div className="relative">
                  <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.total_amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.total_amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.total_amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quotation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Quotation Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quotation Date *
                </label>
                <input
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    errors.quotation_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.quotation_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.quotation_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validity Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.validity_period}
                  onChange={(e) => setFormData(prev => ({ ...prev, validity_period: parseInt(e.target.value) || 30 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
            </div>

            {quotationType === 'new_company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Status
                </label>
                <select
                  value={formData.lead_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Add any additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter terms and conditions..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              {quotation ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuotationForm;
