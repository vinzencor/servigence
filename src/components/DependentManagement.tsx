import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, Calendar, Phone, Mail, User, AlertCircle, X, Users } from 'lucide-react';
import { Individual, Dependent } from '../types';
import { dbHelpers } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface DependentManagementProps {
  individual: Individual;
  onBack: () => void;
}

const DependentManagement: React.FC<DependentManagementProps> = ({ individual, onBack }) => {
  const { user } = useAuth();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showAddDependent, setShowAddDependent] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [showEditDependent, setShowEditDependent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dependentToDelete, setDependentToDelete] = useState<Dependent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [dependentForm, setDependentForm] = useState({
    name: '',
    relationship: 'child' as 'spouse' | 'child' | 'parent',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: '',
    visaNumber: '',
    visaIssueDate: '',
    visaExpiryDate: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDependents();
  }, [individual.id]);

  const loadDependents = async () => {
    setLoading(true);
    try {
      console.log('Loading dependents for individual:', individual.id);
      const dependentData = await dbHelpers.getDependents(undefined, individual.id);
      console.log('Loaded dependents:', dependentData);
      setDependents(dependentData || []);
    } catch (error) {
      console.error('Error loading dependents:', error);
      setDependents([]);
      toast.error('Failed to load dependents');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDependentForm({
      name: '',
      relationship: 'child',
      dateOfBirth: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      visaNumber: '',
      visaIssueDate: '',
      visaExpiryDate: '',
      emiratesId: '',
      emiratesIdExpiry: '',
      phone: '',
      email: '',
      status: 'active'
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!dependentForm.name.trim()) newErrors.name = 'Name is required';
    if (!dependentForm.relationship) newErrors.relationship = 'Relationship is required';
    if (!dependentForm.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!dependentForm.nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (!dependentForm.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
    if (!dependentForm.passportExpiry) newErrors.passportExpiry = 'Passport expiry is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const newDependent = {
        individual_id: individual.id,
        name: dependentForm.name,
        relationship: dependentForm.relationship,
        date_of_birth: dependentForm.dateOfBirth,
        nationality: dependentForm.nationality,
        passport_number: dependentForm.passportNumber,
        passport_expiry: dependentForm.passportExpiry,
        visa_number: dependentForm.visaNumber || null,
        visa_issue_date: dependentForm.visaIssueDate || null,
        visa_expiry_date: dependentForm.visaExpiryDate || null,
        emirates_id: dependentForm.emiratesId || null,
        emirates_id_expiry: dependentForm.emiratesIdExpiry || null,
        phone: dependentForm.phone || null,
        email: dependentForm.email || null,
        status: dependentForm.status,
        created_by: user?.email || 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await dbHelpers.createDependent(newDependent);
      await loadDependents();
      resetForm();
      setShowAddDependent(false);
      toast.success('Dependent added successfully!');
    } catch (error) {
      console.error('Error adding dependent:', error);
      toast.error('Failed to add dependent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDependent = (dependent: Dependent) => {
    setSelectedDependent(dependent);
    setDependentForm({
      name: dependent.name,
      relationship: dependent.relationship,
      dateOfBirth: dependent.dateOfBirth,
      nationality: dependent.nationality,
      passportNumber: dependent.passportNumber,
      passportExpiry: dependent.passportExpiry,
      visaNumber: dependent.visaNumber || '',
      visaIssueDate: dependent.visaIssueDate || '',
      visaExpiryDate: dependent.visaExpiryDate || '',
      emiratesId: dependent.emiratesId || '',
      emiratesIdExpiry: dependent.emiratesIdExpiry || '',
      phone: dependent.phone || '',
      email: dependent.email || '',
      status: dependent.status || 'active'
    });
    setShowEditDependent(true);
  };

  const handleUpdateDependent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDependent || !validateForm()) return;

    try {
      setLoading(true);

      const updates = {
        name: dependentForm.name,
        relationship: dependentForm.relationship,
        date_of_birth: dependentForm.dateOfBirth,
        nationality: dependentForm.nationality,
        passport_number: dependentForm.passportNumber,
        passport_expiry: dependentForm.passportExpiry,
        visa_number: dependentForm.visaNumber || null,
        visa_issue_date: dependentForm.visaIssueDate || null,
        visa_expiry_date: dependentForm.visaExpiryDate || null,
        emirates_id: dependentForm.emiratesId || null,
        emirates_id_expiry: dependentForm.emiratesIdExpiry || null,
        phone: dependentForm.phone || null,
        email: dependentForm.email || null,
        status: dependentForm.status,
        updated_at: new Date().toISOString()
      };

      await dbHelpers.updateDependent(selectedDependent.id, updates);
      await loadDependents();
      resetForm();
      setShowEditDependent(false);
      setSelectedDependent(null);
      toast.success('Dependent updated successfully!');
    } catch (error) {
      console.error('Error updating dependent:', error);
      toast.error('Failed to update dependent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDependent = (dependent: Dependent) => {
    setDependentToDelete(dependent);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDependent = async () => {
    if (!dependentToDelete) return;

    try {
      setLoading(true);
      await dbHelpers.deleteDependent(dependentToDelete.id);
      await loadDependents();
      setShowDeleteConfirm(false);
      setDependentToDelete(null);
      toast.success('Dependent deleted successfully!');
    } catch (error) {
      console.error('Error deleting dependent:', error);
      toast.error('Failed to delete dependent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDependents = dependents.filter(dependent =>
    dependent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dependent.relationship.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dependent.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return 'bg-pink-100 text-pink-800';
      case 'child': return 'bg-blue-100 text-blue-800';
      case 'parent': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Dependent Management</h1>
                <p className="text-teal-100 mt-1">{individual.individualName}</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddDependent(true);
              }}
              className="bg-white text-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Dependent</span>
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
                placeholder="Search dependents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {dependents.length}</span>
              <span>Active: {dependents.filter(d => d.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dependent List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading dependents...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDependents.map((dependent) => (
            <div key={dependent.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dependent.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{dependent.relationship}</p>
                      <p className="text-xs text-gray-500">{dependent.nationality}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(dependent.relationship)}`}>
                    {dependent.relationship}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    DOB: {new Date(dependent.dateOfBirth).toLocaleDateString()}
                  </div>
                  {dependent.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {dependent.phone}
                    </div>
                  )}
                  {dependent.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {dependent.email}
                    </div>
                  )}
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Passport</div>
                  <div className="text-sm font-medium text-gray-900">{dependent.passportNumber}</div>
                  <div className="text-xs text-gray-500">Exp: {new Date(dependent.passportExpiry).toLocaleDateString()}</div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditDependent(dependent)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Dependent"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDependent(dependent)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Dependent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dependent.status || 'active')}`}>
                    {dependent.status || 'active'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredDependents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dependents found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No dependents match your search criteria.' : 'Start by adding your first dependent.'}
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowAddDependent(true);
            }}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Add Dependent
          </button>
        </div>
      )}

      {/* Add Dependent Modal */}
      {showAddDependent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Dependent</h2>
                <button
                  onClick={() => {
                    setShowAddDependent(false);
                    resetForm();
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddDependent} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.name}
                    onChange={(e) => setDependentForm({ ...dependentForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dependentForm.relationship}
                    onChange={(e) => setDependentForm({ ...dependentForm, relationship: e.target.value as 'spouse' | 'child' | 'parent' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.relationship ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                  </select>
                  {errors.relationship && <p className="mt-1 text-sm text-red-500">{errors.relationship}</p>}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dependentForm.dateOfBirth}
                    onChange={(e) => setDependentForm({ ...dependentForm, dateOfBirth: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>}
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.nationality}
                    onChange={(e) => setDependentForm({ ...dependentForm, nationality: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.nationality ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter nationality"
                  />
                  {errors.nationality && <p className="mt-1 text-sm text-red-500">{errors.nationality}</p>}
                </div>

                {/* Passport Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.passportNumber}
                    onChange={(e) => setDependentForm({ ...dependentForm, passportNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.passportNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter passport number"
                  />
                  {errors.passportNumber && <p className="mt-1 text-sm text-red-500">{errors.passportNumber}</p>}
                </div>

                {/* Passport Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dependentForm.passportExpiry}
                    onChange={(e) => setDependentForm({ ...dependentForm, passportExpiry: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.passportExpiry ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.passportExpiry && <p className="mt-1 text-sm text-red-500">{errors.passportExpiry}</p>}
                </div>

                {/* Emirates ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emirates ID
                  </label>
                  <input
                    type="text"
                    value={dependentForm.emiratesId}
                    onChange={(e) => setDependentForm({ ...dependentForm, emiratesId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="784-YYYY-XXXXXXX-X"
                  />
                </div>

                {/* Emirates ID Expiry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emirates ID Expiry
                  </label>
                  <input
                    type="date"
                    value={dependentForm.emiratesIdExpiry}
                    onChange={(e) => setDependentForm({ ...dependentForm, emiratesIdExpiry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Visa Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Number
                  </label>
                  <input
                    type="text"
                    value={dependentForm.visaNumber}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter visa number"
                  />
                </div>

                {/* Visa Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Issue Date
                  </label>
                  <input
                    type="date"
                    value={dependentForm.visaIssueDate}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaIssueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Visa Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Expiry Date
                  </label>
                  <input
                    type="date"
                    value={dependentForm.visaExpiryDate}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaExpiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={dependentForm.phone}
                    onChange={(e) => setDependentForm({ ...dependentForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="+971-XX-XXX-XXXX"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={dependentForm.email}
                    onChange={(e) => setDependentForm({ ...dependentForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={dependentForm.status}
                    onChange={(e) => setDependentForm({ ...dependentForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDependent(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Dependent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dependent Modal */}
      {showEditDependent && selectedDependent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Dependent</h2>
                <button
                  onClick={() => {
                    setShowEditDependent(false);
                    setSelectedDependent(null);
                    resetForm();
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateDependent} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Same form fields as Add Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.name}
                    onChange={(e) => setDependentForm({ ...dependentForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dependentForm.relationship}
                    onChange={(e) => setDependentForm({ ...dependentForm, relationship: e.target.value as 'spouse' | 'child' | 'parent' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.relationship ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                  </select>
                  {errors.relationship && <p className="mt-1 text-sm text-red-500">{errors.relationship}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dependentForm.dateOfBirth}
                    onChange={(e) => setDependentForm({ ...dependentForm, dateOfBirth: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfBirth && <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.nationality}
                    onChange={(e) => setDependentForm({ ...dependentForm, nationality: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.nationality ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.nationality && <p className="mt-1 text-sm text-red-500">{errors.nationality}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={dependentForm.passportNumber}
                    onChange={(e) => setDependentForm({ ...dependentForm, passportNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.passportNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.passportNumber && <p className="mt-1 text-sm text-red-500">{errors.passportNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dependentForm.passportExpiry}
                    onChange={(e) => setDependentForm({ ...dependentForm, passportExpiry: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.passportExpiry ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.passportExpiry && <p className="mt-1 text-sm text-red-500">{errors.passportExpiry}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emirates ID
                  </label>
                  <input
                    type="text"
                    value={dependentForm.emiratesId}
                    onChange={(e) => setDependentForm({ ...dependentForm, emiratesId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emirates ID Expiry
                  </label>
                  <input
                    type="date"
                    value={dependentForm.emiratesIdExpiry}
                    onChange={(e) => setDependentForm({ ...dependentForm, emiratesIdExpiry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Number
                  </label>
                  <input
                    type="text"
                    value={dependentForm.visaNumber}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Issue Date
                  </label>
                  <input
                    type="date"
                    value={dependentForm.visaIssueDate}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaIssueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visa Expiry Date
                  </label>
                  <input
                    type="date"
                    value={dependentForm.visaExpiryDate}
                    onChange={(e) => setDependentForm({ ...dependentForm, visaExpiryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={dependentForm.phone}
                    onChange={(e) => setDependentForm({ ...dependentForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={dependentForm.email}
                    onChange={(e) => setDependentForm({ ...dependentForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={dependentForm.status}
                    onChange={(e) => setDependentForm({ ...dependentForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDependent(false);
                    setSelectedDependent(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Dependent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && dependentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Dependent
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{dependentToDelete.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDependentToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDependent}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependentManagement;

