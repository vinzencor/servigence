import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';
import { Company } from '../types';
import { dbHelpers } from '../lib/supabase';

interface CompanyEditModalProps {
  company: Company;
  onClose: () => void;
  onSave: (updatedCompany: Company) => void;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ company, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    companyName: company.companyName || '',
    vatTrnNo: company.vatTrnNo || '',
    phone1: company.phone1 || '',
    phone2: company.phone2 || '',
    email1: company.email1 || '',
    email2: company.email2 || '',
    address: company.address || '',
    companyType: company.companyType || '',
    licenseNo: company.licenseNo || '',
    mohreNo: company.mohreNo || '',
    moiNo: company.moiNo || '',
    quota: company.quota || '',
    companyGrade: company.companyGrade || '',
    creditLimit: company.creditLimit?.toString() || '',
    creditLimitDays: company.creditLimitDays?.toString() || '',
    proName: company.proName || '',
    proPhone: company.proPhone || '',
    proEmail: company.proEmail || '',
    status: company.status || 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.phone1.trim()) newErrors.phone1 = 'Primary phone is required';
    if (!formData.email1.trim()) newErrors.email1 = 'Primary email is required';
    if (!formData.companyType.trim()) newErrors.companyType = 'Company type is required';
    // if (!formData.companyGrade.trim()) newErrors.companyGrade = 'Company grade is required';
    if (!formData.creditLimit.trim()) newErrors.creditLimit = 'Credit limit is required';
    if (!formData.creditLimitDays.trim()) newErrors.creditLimitDays = 'Credit limit days is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email1 && !emailRegex.test(formData.email1)) {
      newErrors.email1 = 'Invalid email format';
    }
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      newErrors.email2 = 'Invalid email format';
    }
    if (formData.proEmail && !emailRegex.test(formData.proEmail)) {
      newErrors.proEmail = 'Invalid email format';
    }

    // Numeric validation
    if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
      newErrors.creditLimit = 'Credit limit must be a number';
    }
    if (formData.creditLimitDays && isNaN(parseInt(formData.creditLimitDays))) {
      newErrors.creditLimitDays = 'Credit limit days must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare update data for Supabase
      const updateData = {
        company_name: formData.companyName,
        vat_trn_no: formData.vatTrnNo || null,
        phone1: formData.phone1,
        phone2: formData.phone2 || null,
        email1: formData.email1,
        email2: formData.email2 || null,
        address: formData.address || null,
        company_type: formData.companyType,
        license_no: formData.licenseNo || null,
        mohre_no: formData.mohreNo || null,
        moi_no: formData.moiNo || null,
        quota: formData.quota || null,
        company_grade: formData.companyGrade,
        credit_limit: parseFloat(formData.creditLimit),
        credit_limit_days: parseInt(formData.creditLimitDays),
        pro_name: formData.proName || null,
        pro_phone: formData.proPhone || null,
        pro_email: formData.proEmail || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      // Update in database
      await dbHelpers.updateCompany(company.id, updateData);

      // Create updated company object for local state
      const updatedCompany: Company = {
        ...company,
        companyName: formData.companyName,
        vatTrnNo: formData.vatTrnNo || undefined,
        phone1: formData.phone1,
        phone2: formData.phone2 || undefined,
        email1: formData.email1,
        email2: formData.email2 || undefined,
        address: formData.address || undefined,
        companyType: formData.companyType,
        licenseNo: formData.licenseNo || undefined,
        mohreNo: formData.mohreNo || undefined,
        moiNo: formData.moiNo || undefined,
        quota: formData.quota || undefined,
        companyGrade: formData.companyGrade,
        creditLimit: parseFloat(formData.creditLimit),
        creditLimitDays: parseInt(formData.creditLimitDays),
        proName: formData.proName || undefined,
        proPhone: formData.proPhone || undefined,
        proEmail: formData.proEmail || undefined,
        status: formData.status as 'active' | 'inactive' | 'pending'
      };

      onSave(updatedCompany);
      alert('Company updated successfully!');
    } catch (error) {
      console.error('Error updating company:', error);
      alert(`Error updating company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit Company</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="col-span-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.companyName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VAT/TRN Number</label>
              <input
                type="text"
                name="vatTrnNo"
                value={formData.vatTrnNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="TRN100234567890123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Type <span className="text-red-500">*</span>
              </label>
              <select
                name="companyType"
                value={formData.companyType}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.companyType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select company type</option>
                <option value="Limited Liability Company">Limited Liability Company</option>
                <option value="Free Zone Company">Free Zone Company</option>
                <option value="Branch Office">Branch Office</option>
                <option value="Representative Office">Representative Office</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
              </select>
              {errors.companyType && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyType}
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone1"
                value={formData.phone1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.phone1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="+971-4-123-4567"
              />
              {errors.phone1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone</label>
              <input
                type="tel"
                name="phone2"
                value={formData.phone2}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+971-50-123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email1"
                value={formData.email1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="admin@company.ae"
              />
              {errors.email1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Email</label>
              <input
                type="email"
                name="email2"
                value={formData.email2}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="finance@company.ae"
              />
              {errors.email2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email2}
                </p>
              )}
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter company address"
              />
            </div>

            {/* License Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
              <input
                type="text"
                name="licenseNo"
                value={formData.licenseNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="DED-123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MOHRE Number</label>
              <input
                type="text"
                name="mohreNo"
                value={formData.mohreNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="MOH-789123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MOI Number</label>
              <input
                type="text"
                name="moiNo"
                value={formData.moiNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="MOI-456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quota</label>
              <input
                type="text"
                name="quota"
                value={formData.quota}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="15"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Grade <span className="text-red-500">*</span>
              </label>
              <select
                name="companyGrade"
                value={formData.companyGrade}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.companyGrade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select grade</option>
                <option value="Grade A">Grade A</option>
                <option value="Grade B">Grade B</option>
                <option value="Grade C">Grade C</option>
                <option value="Grade D">Grade D</option>
              </select>
              {errors.companyGrade && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyGrade}
                </p>
              )}
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Financial Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Limit (AED) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.creditLimit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="50000"
              />
              {errors.creditLimit && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.creditLimit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credit Limit Days <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="creditLimitDays"
                value={formData.creditLimitDays}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.creditLimitDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="30"
              />
              {errors.creditLimitDays && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.creditLimitDays}
                </p>
              )}
            </div>

            {/* PRO Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">PRO Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Name</label>
              <input
                type="text"
                name="proName"
                value={formData.proName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ahmed Al-Rashid"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Phone</label>
              <input
                type="tel"
                name="proPhone"
                value={formData.proPhone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+971-55-987-6543"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Email</label>
              <input
                type="email"
                name="proEmail"
                value={formData.proEmail}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.proEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="ahmed@proservices.ae"
              />
              {errors.proEmail && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.proEmail}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyEditModal;
