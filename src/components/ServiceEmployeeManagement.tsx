import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, User, Mail, Phone, AlertCircle, Save } from 'lucide-react';
import { ServiceEmployee } from '../types';
import { dbHelpers } from '../lib/supabase';

const ServiceEmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<ServiceEmployee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ServiceEmployee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    specialization: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const departments = [
    'Immigration Services',
    'Insurance Services',
    'Document Processing',
    'Translation Services',
    'PRO Services',
    'Company Formation',
    'General Services'
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const employeeData = await dbHelpers.getServiceEmployees();
      setEmployees(employeeData || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      // If there's an error, show empty state
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeForm.name.trim()) newErrors.name = 'Name is required';
    // Email is now optional
    // if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    if (!employeeForm.phone.trim()) newErrors.phone = 'Phone is required';
    // Department is optional in the database, so we don't require it
    // if (!employeeForm.department.trim()) newErrors.department = 'Department is required';

    // Email validation (only if email is provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeForm.email && employeeForm.email.trim() && !emailRegex.test(employeeForm.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation for new employees
    if (!editingEmployee) {
      if (!employeeForm.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (employeeForm.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (employeeForm.password !== employeeForm.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Create a completely clean object with only the fields we need
      const cleanEmployeeData = {
        name: String(employeeForm.name).trim(),
        email: String(employeeForm.email).trim(),
        phone: String(employeeForm.phone).trim(),
        department: employeeForm.department && String(employeeForm.department).trim() !== '' ? String(employeeForm.department).trim() : null,
        specialization: employeeForm.specialization && String(employeeForm.specialization).trim() !== '' ? String(employeeForm.specialization).trim() : null,
        is_active: true,
        ...(employeeForm.password && !editingEmployee ? { password_hash: btoa(employeeForm.password) } : {})
      };

      console.log('Clean employee data:', cleanEmployeeData);
      console.log('Form state:', employeeForm);

      if (editingEmployee) {
        // Update existing employee
        await dbHelpers.updateServiceEmployee(editingEmployee.id, cleanEmployeeData);
      } else {
        // Create new employee
        await dbHelpers.createServiceEmployee(cleanEmployeeData);
      }

      await loadEmployees();
      resetForm();
      setShowAddEmployee(false);
      setEditingEmployee(null);

      if (editingEmployee) {
        alert('Employee updated successfully!');
      } else {
        alert(`Employee created successfully!\n\nLogin Credentials:\nEmail: ${employeeForm.email}\nPassword: ${employeeForm.password}\n\nThe employee can now login to the staff dashboard using these credentials.`);
      }
    } catch (error) {
      console.error('Error saving service employee:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      let errorMessage = 'Error saving employee. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setEmployeeForm({
      name: '',
      email: '',
      phone: '',
      department: '',
      specialization: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  const handleEdit = (employee: ServiceEmployee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department || '',
      specialization: employee.specialization || '',
      password: '',
      confirmPassword: ''
    });
    setShowAddEmployee(true);
  };

  const handleDelete = async (employee: ServiceEmployee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
      try {
        await dbHelpers.deleteServiceEmployee(employee.id);
        await loadEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error deleting employee. Please try again.');
      }
    }
  };

  const testCreateEmployee = async () => {
    try {
      const testData = {
        name: 'Test Employee',
        email: 'test@example.com',
        phone: '+971-50-123-4567',
        department: 'Immigration Services',
        specialization: 'Visa Processing',
        is_active: true
      };

      console.log('Testing with hardcoded data:', testData);
      await dbHelpers.createServiceEmployee(testData);
      await loadEmployees();
      alert('Test employee created successfully!');
    } catch (error) {
      console.error('Test creation error:', error);
      alert(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.department?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.specialization?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Service Employee Management</h1>
              <p className="text-green-100 mt-1">Manage employees who execute services</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={testCreateEmployee}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Test Create
              </button>
              <button
                onClick={() => setShowAddEmployee(true)}
                className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Employee</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {employees.length}</span>
              <span>Active: {employees.filter(e => e.isActive).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading employees...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.department}</p>
                      {employee.specialization && (
                        <p className="text-xs text-gray-500">{employee.specialization}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {employee.isActive ? 'Active' : 'Inactive'}
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
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(employee.createdAt).toLocaleDateString()}
                  </span>
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
            {searchTerm ? 'No employees match your search criteria.' : 'Start by adding your first service employee.'}
          </p>
          <button
            onClick={() => setShowAddEmployee(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Add Employee
          </button>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddEmployee(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={employeeForm.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="employee@servigence.ae"
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="+971-55-000-0000"
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
                    Department
                  </label>
                  <select
                    name="department"
                    value={employeeForm.department}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.department}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={employeeForm.specialization}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Visa Processing, Document Attestation"
                  />
                </div>

                {/* Password fields for new employees */}
                {!editingEmployee && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={employeeForm.password}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter password (min 6 characters)"
                      />
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={employeeForm.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Confirm password"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployee(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingEmployee ? 'Update Employee' : 'Add Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceEmployeeManagement;
