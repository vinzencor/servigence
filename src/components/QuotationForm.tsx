import React, { useState, useEffect } from 'react';
import { X, Building2, Users, Search, Calculator, Plus, Trash2 } from 'lucide-react';
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

interface QuotationItem {
  id: string;
  service_id: string;
  service_name: string;
  service_category: string;
  quantity: number;
  service_charge: number;
  government_charge: number;
  line_total: number;
  default_service_charge?: number;
  default_government_charge?: number;
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

  // Manual amount entry toggle
  const [manualAmountEntry, setManualAmountEntry] = useState(false);

  // Service items state
  const [serviceItems, setServiceItems] = useState<QuotationItem[]>([]);

  const [formData, setFormData] = useState({
    company_id: quotation?.company_id || '',
    company_name: quotation?.company_name || '',
    contact_person: quotation?.contact_person || '',
    phone: quotation?.phone || '',
    email: quotation?.email || '',
    address: quotation?.address || '',
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

  // Load existing quotation items when editing
  useEffect(() => {
    if (quotation?.items && quotation.items.length > 0) {
      setServiceItems(quotation.items.map((item: any) => ({
        id: item.id || Date.now().toString() + Math.random(),
        service_id: item.service_id || '',
        service_name: item.service_name || '',
        service_category: item.service_category || '',
        quantity: item.quantity || 1,
        service_charge: item.service_charge || 0,
        government_charge: item.government_charge || 0,
        line_total: item.line_total || 0
      })));
    }
  }, [quotation]);

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

  // Service items management
  const addServiceItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      service_id: '',
      service_name: '',
      service_category: '',
      quantity: 1,
      service_charge: 0,
      government_charge: 0,
      line_total: 0
    };
    setServiceItems(prev => [...prev, newItem]);
  };

  const updateServiceItem = (id: string, field: string, value: any) => {
    setServiceItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // If service is selected, populate charges with default values
        if (field === 'service_id') {
          const service = services.find(s => s.id === value);
          if (service) {
            updatedItem.service_name = service.name;
            updatedItem.service_category = service.category;
            // Only set default charges if not already customized
            // Store the default values for reference
            updatedItem.default_service_charge = service.typing_charges;
            updatedItem.default_government_charge = service.government_charges;
            // Set actual charges to defaults (user can override)
            updatedItem.service_charge = service.typing_charges;
            updatedItem.government_charge = service.government_charges;
          }
        }

        // Recalculate line total
        if (field === 'quantity' || field === 'service_charge' || field === 'government_charge' || field === 'service_id') {
          const serviceCharge = parseFloat(updatedItem.service_charge) || 0;
          const governmentCharge = parseFloat(updatedItem.government_charge) || 0;
          const quantity = parseInt(updatedItem.quantity) || 1;
          updatedItem.line_total = (serviceCharge + governmentCharge) * quantity;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const removeServiceItem = (id: string) => {
    setServiceItems(prev => prev.filter(item => item.id !== id));
  };

  const handleManualAmountToggle = () => {
    setManualAmountEntry(!manualAmountEntry);
  };

  // Calculate total from service items
  useEffect(() => {
    if (!manualAmountEntry && serviceItems.length > 0) {
      const total = serviceItems.reduce((sum, item) => sum + item.line_total, 0);
      setFormData(prev => ({
        ...prev,
        total_amount: total.toString()
      }));
    }
  }, [serviceItems, manualAmountEntry]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (serviceItems.length === 0) {
      newErrors.service_items = 'At least one service is required';
      toast.error('Please add at least one service');
    }

    // Validate each service item
    const hasInvalidItems = serviceItems.some(item =>
      !item.service_id || !item.service_name || item.quantity <= 0
    );

    if (hasInvalidItems) {
      newErrors.service_items = 'All service items must have a service selected and valid quantity';
      toast.error('Please complete all service items');
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
      validity_period: parseInt(formData.validity_period.toString()),
      service_items: serviceItems.map(item => ({
        service_id: item.service_id,
        service_name: item.service_name,
        service_category: item.service_category,
        quantity: item.quantity,
        service_charge: item.service_charge,
        government_charge: item.government_charge,
        line_total: item.line_total
      }))
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

          {/* Service Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Service Items</h3>
              <button
                type="button"
                onClick={addServiceItem}
                className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </button>
            </div>

            {errors.service_items && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.service_items}</p>
              </div>
            )}

            {serviceItems.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">No services added yet</p>
                <p className="text-gray-500 text-sm">Click "Add Service" to add services to this quotation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceItems.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service *
                        </label>
                        <select
                          value={item.service_id}
                          onChange={(e) => updateServiceItem(item.id, 'service_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        >
                          <option value="">Select service</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateServiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Charge
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.service_charge}
                          onChange={(e) => updateServiceItem(item.id, 'service_charge', parseFloat(e.target.value) || 0)}
                          placeholder={item.default_service_charge ? `Default: ${item.default_service_charge.toFixed(2)}` : '0.00'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {item.default_service_charge && (
                          <p className="text-xs text-gray-500 mt-1">Default: AED {item.default_service_charge.toFixed(2)}</p>
                        )}
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Govt. Charge
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.government_charge}
                          onChange={(e) => updateServiceItem(item.id, 'government_charge', parseFloat(e.target.value) || 0)}
                          placeholder={item.default_government_charge ? `Default: ${item.default_government_charge.toFixed(2)}` : '0.00'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        {item.default_government_charge && (
                          <p className="text-xs text-gray-500 mt-1">Default: AED {item.default_government_charge.toFixed(2)}</p>
                        )}
                      </div>

                      <div className="lg:col-span-2 flex items-end space-x-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Line Total
                          </label>
                          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                            AED {item.line_total.toFixed(2)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeServiceItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                          title="Remove service"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Quotation Total</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Total Amount (AED) *
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualAmountEntry}
                      onChange={handleManualAmountToggle}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-600">Manual entry</span>
                  </label>
                </div>
                <div className="relative">
                  <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    disabled={!manualAmountEntry && serviceItems.length === 0}
                    className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                      errors.total_amount ? 'border-red-300' : 'border-gray-300'
                    } ${!manualAmountEntry && serviceItems.length > 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    placeholder={manualAmountEntry ? "Enter amount manually" : "Add services to auto-calculate"}
                    readOnly={!manualAmountEntry && serviceItems.length > 0}
                  />
                </div>
                {!manualAmountEntry && serviceItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Amount auto-calculated from service items. Enable "Manual entry" to override.
                  </p>
                )}
                {manualAmountEntry && (
                  <p className="text-xs text-amber-600 mt-1">
                    Manual amount entry enabled. Amount will not auto-calculate from service.
                  </p>
                )}
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
