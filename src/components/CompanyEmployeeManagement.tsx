import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Upload, Eye, Edit, Trash2, FileText, Calendar, Phone, Mail, User, AlertCircle } from 'lucide-react';
import { Company, Employee } from '../types';
import { dbHelpers } from '../lib/supabase';

interface CompanyEmployeeManagementProps {
  company: Company;
  onBack: () => void;
}

const CompanyEmployeeManagement: React.FC<CompanyEmployeeManagementProps> = ({ company, onBack }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    name: '',
    position: '',
    email: '',
    phone: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: '',
    visaType: 'employment' as const,
    visaNumber: '',
    visaIssueDate: '',
    visaExpiryDate: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    laborCardNumber: '',
    laborCardExpiry: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: '',
    department: '',
    manager: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEmployees();
  }, [company.id]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const employeeData = await dbHelpers.getEmployees(company.id);
      setEmployees(employeeData || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeForm.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!employeeForm.name.trim()) newErrors.name = 'Name is required';
    if (!employeeForm.position.trim()) newErrors.position = 'Position is required';
    if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    if (!employeeForm.phone.trim()) newErrors.phone = 'Phone is required';
    if (!employeeForm.nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (!employeeForm.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
    if (!employeeForm.passportExpiry) newErrors.passportExpiry = 'Passport expiry is required';
    if (!employeeForm.joinDate) newErrors.joinDate = 'Join date is required';
    if (!employeeForm.department.trim()) newErrors.department = 'Department is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeForm.email && !emailRegex.test(employeeForm.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const newEmployee = {
        company_id: company.id,
        employee_id: employeeForm.employeeId,
        name: employeeForm.name,
        position: employeeForm.position,
        email: employeeForm.email,
        phone: employeeForm.phone,
        nationality: employeeForm.nationality,
        passport_number: employeeForm.passportNumber,
        passport_expiry: employeeForm.passportExpiry,
        visa_type: employeeForm.visaType,
        visa_number: employeeForm.visaNumber || null,
        visa_issue_date: employeeForm.visaIssueDate || null,
        visa_expiry_date: employeeForm.visaExpiryDate || null,
        emirates_id: employeeForm.emiratesId || null,
        emirates_id_expiry: employeeForm.emiratesIdExpiry || null,
        labor_card_number: employeeForm.laborCardNumber || null,
        labor_card_expiry: employeeForm.laborCardExpiry || null,
        join_date: employeeForm.joinDate,
        salary: employeeForm.salary ? parseFloat(employeeForm.salary) : null,
        department: employeeForm.department,
        manager: employeeForm.manager || null,
        status: 'active'
      };

      await dbHelpers.createEmployee(newEmployee);
      await loadEmployees();
      setShowAddEmployee(false);
      resetForm();
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const resetForm = () => {
    setEmployeeForm({
      employeeId: '',
      name: '',
      position: '',
      email: '',
      phone: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      visaType: 'employment',
      visaNumber: '',
      visaIssueDate: '',
      visaExpiryDate: '',
      emiratesId: '',
      emiratesIdExpiry: '',
      laborCardNumber: '',
      laborCardExpiry: '',
      joinDate: new Date().toISOString().split('T')[0],
      salary: '',
      department: '',
      manager: ''
    });
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Employee Management</h1>
                <p className="text-blue-100 mt-1">{company.companyName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {employees.length}</span>
              <span>Active: {employees.filter(e => e.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading employees...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisaStatusColor(employee.visaStatus)}`}>
                    {employee.visaStatus}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {employee.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {employee.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined: {new Date(employee.joinDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Documents"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{employee.nationality}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEmployees.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No employees match your search criteria.' : 'Start by adding your first employee.'}
          </p>
          <button
            onClick={() => setShowAddEmployee(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Employee
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Employee</h2>
                <button
                  onClick={() => {
                    setShowAddEmployee(false);
                    resetForm();
                  }}
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
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={employeeForm.employeeId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.employeeId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="EMP-001"
                  />
                  {errors.employeeId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.employeeId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={employeeForm.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={employeeForm.position}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Job position"
                  />
                  {errors.position && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.position}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="employee@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={employeeForm.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="+971-50-000-0000"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={employeeForm.nationality}
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

                {/* Document Information */}
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="passportNumber"
                    value={employeeForm.passportNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.passportNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Passport number"
                  />
                  {errors.passportNumber && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.passportNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="passportExpiry"
                    value={employeeForm.passportExpiry}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.passportExpiry ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.passportExpiry && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.passportExpiry}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
                  <input
                    type="text"
                    name="emiratesId"
                    value={employeeForm.emiratesId}
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
                    value={employeeForm.emiratesIdExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
                  <input
                    type="text"
                    name="visaNumber"
                    value={employeeForm.visaNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Visa number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
                  <input
                    type="date"
                    name="visaExpiryDate"
                    value={employeeForm.visaExpiryDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Card Number</label>
                  <input
                    type="text"
                    name="laborCardNumber"
                    value={employeeForm.laborCardNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Labor card number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Labor Card Expiry</label>
                  <input
                    type="date"
                    name="laborCardExpiry"
                    value={employeeForm.laborCardExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Employment Information */}
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Join Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="joinDate"
                    value={employeeForm.joinDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.joinDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.joinDate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.joinDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={employeeForm.department}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Department name"
                  />
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.department}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary (AED)</label>
                  <input
                    type="number"
                    name="salary"
                    value={employeeForm.salary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Monthly salary"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <input
                    type="text"
                    name="manager"
                    value={employeeForm.manager}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Manager name"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployee(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyEmployeeManagement;
