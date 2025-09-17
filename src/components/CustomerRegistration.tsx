import React, { useState } from 'react';
import { Save, Send, X, CheckCircle, AlertCircle, Phone, Mail, Users, User } from 'lucide-react';
import { Company, Individual } from '../types';
import { dbHelpers } from '../lib/supabase';

interface CustomerRegistrationProps {
  onSave: (company: Company) => void;
  onSaveIndividual?: (individual: Individual) => void;
}

const CustomerRegistration: React.FC<CustomerRegistrationProps> = ({ onSave, onSaveIndividual }) => {
  const [registrationType, setRegistrationType] = useState<'company' | 'individual'>('company');
  const [formData, setFormData] = useState({
    // Common fields
    phone1: '',
    phone2: '',
    email1: '',
    email2: '',
    address: '',
    creditLimit: '',
    creditLimitDays: '',
    dateOfRegistration: new Date().toISOString().split('T')[0],
    createdBy: 'Sarah Khan',

    // Company specific fields
    companyName: '',
    vatTrnNo: '',
    companyType: '',
    licenseNo: '',
    mohreNo: '',
    moiNo: '',
    quota: '',
    companyGrade: '',
    proName: '',
    proPhone: '',
    proEmail: '',

    // Individual specific fields
    individualName: '',
    nationality: '',
    idNumber: '',
    passportNumber: '',
    passportExpiry: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    visaNumber: '',
    visaExpiry: '',
    licenseNumber: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyTypes = [
    'Limited Liability Company (LLC)',
    'Free Zone Company',
    'Branch Office',
    'Representative Office',
    'Public Joint Stock Company',
    'Private Joint Stock Company',
    'Partnership Company',
    'Sole Proprietorship'
  ];

  const companyGrades = ['Grade A+', 'Grade A', 'Grade B+', 'Grade B', 'Grade C+', 'Grade C'];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.phone1.trim()) newErrors.phone1 = 'Primary phone is required';
    if (!formData.email1.trim()) newErrors.email1 = 'Primary email is required';
    if (!formData.creditLimit || parseFloat(formData.creditLimit) <= 0) {
      newErrors.creditLimit = 'Valid credit limit is required';
    }
    if (!formData.creditLimitDays || parseInt(formData.creditLimitDays) <= 0) {
      newErrors.creditLimitDays = 'Valid credit limit days is required';
    }
    if (!formData.dateOfRegistration) newErrors.dateOfRegistration = 'Registration date is required';

    // Type-specific validations
    if (registrationType === 'company') {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.companyType) newErrors.companyType = 'Company type is required';
      if (!formData.companyGrade) newErrors.companyGrade = 'Company grade is required';
    } else {
      if (!formData.individualName.trim()) newErrors.individualName = 'Individual name is required';
      if (!formData.nationality?.trim()) newErrors.nationality = 'Nationality is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email1 && !emailRegex.test(formData.email1)) {
      newErrors.email1 = 'Invalid email format';
    }
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      newErrors.email2 = 'Invalid email format';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[0-9\-\s\(\)]{10,}$/;
    if (formData.phone1 && !phoneRegex.test(formData.phone1)) {
      newErrors.phone1 = 'Invalid phone format';
    }
    if (formData.phone2 && !phoneRegex.test(formData.phone2)) {
      newErrors.phone2 = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (registrationType === 'company') {
        const newCompany: Company = {
          id: Date.now().toString(),
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
          dateOfRegistration: formData.dateOfRegistration,
          createdBy: formData.createdBy,
          status: 'active',
          employeeCount: 0
        };

        // Save to Supabase
        await dbHelpers.createCompany({
          company_name: newCompany.companyName,
          vat_trn_no: newCompany.vatTrnNo,
          phone1: newCompany.phone1,
          phone2: newCompany.phone2,
          email1: newCompany.email1,
          email2: newCompany.email2,
          address: newCompany.address,
          company_type: newCompany.companyType,
          license_no: newCompany.licenseNo,
          mohre_no: newCompany.mohreNo,
          moi_no: newCompany.moiNo,
          quota: newCompany.quota,
          company_grade: newCompany.companyGrade,
          credit_limit: newCompany.creditLimit,
          credit_limit_days: newCompany.creditLimitDays,
          pro_name: newCompany.proName,
          pro_phone: newCompany.proPhone,
          pro_email: newCompany.proEmail,
          date_of_registration: newCompany.dateOfRegistration,
          created_by: newCompany.createdBy,
          status: newCompany.status,
          employee_count: newCompany.employeeCount
        });

        onSave(newCompany);
      } else {
        const newIndividual: Individual = {
          id: Date.now().toString(),
          individualName: formData.individualName,
          nationality: formData.nationality,
          phone1: formData.phone1,
          phone2: formData.phone2 || undefined,
          email1: formData.email1,
          email2: formData.email2 || undefined,
          address: formData.address || undefined,
          idNumber: formData.idNumber || undefined,
          passportNumber: formData.passportNumber || undefined,
          passportExpiry: formData.passportExpiry || undefined,
          emiratesId: formData.emiratesId || undefined,
          emiratesIdExpiry: formData.emiratesIdExpiry || undefined,
          visaNumber: formData.visaNumber || undefined,
          visaExpiry: formData.visaExpiry || undefined,
          licenseNumber: formData.licenseNumber || undefined,
          creditLimit: parseFloat(formData.creditLimit),
          creditLimitDays: parseInt(formData.creditLimitDays),
          dateOfRegistration: formData.dateOfRegistration,
          createdBy: formData.createdBy,
          status: 'active'
        };

        // Save to Supabase
        await dbHelpers.createIndividual({
          individual_name: newIndividual.individualName,
          nationality: newIndividual.nationality,
          phone1: newIndividual.phone1,
          phone2: newIndividual.phone2,
          email1: newIndividual.email1,
          email2: newIndividual.email2,
          address: newIndividual.address,
          id_number: newIndividual.idNumber,
          passport_number: newIndividual.passportNumber,
          passport_expiry: newIndividual.passportExpiry,
          emirates_id: newIndividual.emiratesId,
          emirates_id_expiry: newIndividual.emiratesIdExpiry,
          visa_number: newIndividual.visaNumber,
          visa_expiry: newIndividual.visaExpiry,
          license_number: newIndividual.licenseNumber,
          credit_limit: newIndividual.creditLimit,
          credit_limit_days: newIndividual.creditLimitDays,
          date_of_registration: newIndividual.dateOfRegistration,
          created_by: newIndividual.createdBy,
          status: newIndividual.status
        });

        if (onSaveIndividual) {
          onSaveIndividual(newIndividual);
        }
      }

      setShowSuccess(true);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving registration:', error);
      // Handle error - you might want to show an error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phone1: '',
      phone2: '',
      email1: '',
      email2: '',
      address: '',
      creditLimit: '',
      creditLimitDays: '',
      dateOfRegistration: new Date().toISOString().split('T')[0],
      createdBy: 'Sarah Khan',
      companyName: '',
      vatTrnNo: '',
      companyType: '',
      licenseNo: '',
      mohreNo: '',
      moiNo: '',
      quota: '',
      companyGrade: '',
      proName: '',
      proPhone: '',
      proEmail: '',
      individualName: '',
      nationality: '',
      idNumber: '',
      passportNumber: '',
      passportExpiry: '',
      emiratesId: '',
      emiratesIdExpiry: '',
      visaNumber: '',
      visaExpiry: '',
      licenseNumber: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-20 right-6 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Company Registered Successfully!</p>
            <p className="text-sm text-green-600">Notifications sent via WhatsApp and email</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-green-600 hover:text-green-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <h1 className="text-2xl font-bold text-white">Customer Registration</h1>
          <p className="text-blue-100 mt-1">Register a new company or individual with complete details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Registration Type Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRegistrationType('company')}
                className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-3 transition-all ${
                  registrationType === 'company'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="font-medium">Company Registration</span>
              </button>
              <button
                type="button"
                onClick={() => setRegistrationType('individual')}
                className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-3 transition-all ${
                  registrationType === 'individual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="font-medium">Individual Registration</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="col-span-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                {registrationType === 'company' ? 'Company Information' : 'Individual Information'}
              </h2>
            </div>

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Individual Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="individualName"
                  value={formData.individualName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.individualName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter individual name"
                />
                {errors.individualName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.individualName}
                  </p>
                )}
              </div>
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAT/TRN Number</label>
                <input
                  type="text"
                  name="vatTrnNo"
                  value={formData.vatTrnNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TRN100000000000000"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nationality ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter nationality"
                />
                {errors.nationality && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.nationality}
                  </p>
                )}
              </div>
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select company type</option>
                  {companyTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.companyType && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyType}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter ID number"
                />
              </div>
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  name="licenseNo"
                  value={formData.licenseNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DED-000000"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                <input
                  type="text"
                  name="passportNumber"
                  value={formData.passportNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter passport number"
                />
              </div>
            )}

            {registrationType === 'company' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MOHRE Number</label>
                  <input
                    type="text"
                    name="mohreNo"
                    value={formData.mohreNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MOH-000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MOI Number</label>
                  <input
                    type="text"
                    name="moiNo"
                    value={formData.moiNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MOI-000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quota</label>
                  <input
                    type="text"
                    name="quota"
                    value={formData.quota}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyGrade"
                    value={formData.companyGrade}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.companyGrade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select grade</option>
                    {companyGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  {errors.companyGrade && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.companyGrade}
                    </p>
                  )}
                </div>
              </>
            )}

            {registrationType === 'individual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passport Expiry</label>
                  <input
                    type="date"
                    name="passportExpiry"
                    value={formData.passportExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
                  <input
                    type="text"
                    name="emiratesId"
                    value={formData.emiratesId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="784-YYYY-XXXXXXX-X"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID Expiry</label>
                  <input
                    type="date"
                    name="emiratesIdExpiry"
                    value={formData.emiratesIdExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
                  <input
                    type="text"
                    name="visaNumber"
                    value={formData.visaNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter visa number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
                  <input
                    type="date"
                    name="visaExpiry"
                    value={formData.visaExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter license number"
                  />
                </div>
              </>
            )}

            {/* Contact Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold text-sm">2</span>
                </div>
                Contact Information
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone1"
                  value={formData.phone1}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+971-4-000-0000"
                />
              </div>
              {errors.phone1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone2"
                  value={formData.phone2}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+971-50-000-0000"
                />
              </div>
              {errors.phone2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone2}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email1"
                  value={formData.email1}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="admin@company.ae"
                />
              </div>
              {errors.email1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email2"
                  value={formData.email2}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="finance@company.ae"
                />
              </div>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full business address including emirate"
              />
            </div>

            {/* Financial Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-amber-600 font-bold text-sm">3</span>
                </div>
                Financial Information
              </h2>
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.creditLimit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="50000"
                min="0"
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
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.creditLimitDays ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="30"
                min="0"
              />
              {errors.creditLimitDays && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.creditLimitDays}
                </p>
              )}
            </div>

            {/* PRO Information - Only for Companies */}
            {registrationType === 'company' && (
              <>
                <div className="col-span-full mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-bold text-sm">4</span>
                    </div>
                    PRO Information
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Name</label>
                  <input
                    type="text"
                    name="proName"
                    value={formData.proName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PRO representative name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Phone</label>
                  <input
                    type="tel"
                    name="proPhone"
                    value={formData.proPhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+971-55-000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Email</label>
                  <input
                    type="email"
                    name="proEmail"
                    value={formData.proEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pro@services.ae"
                  />
                </div>
              </>
            )}

            {/* Registration Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-red-600 font-bold text-sm">5</span>
                </div>
                Registration Information
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Registration <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfRegistration"
                value={formData.dateOfRegistration}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dateOfRegistration ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.dateOfRegistration && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.dateOfRegistration}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
              <input
                type="text"
                name="createdBy"
                value={formData.createdBy}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? 'Registering...'
                    : `Register ${registrationType === 'company' ? 'Company' : 'Individual'}`
                  }
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerRegistration;