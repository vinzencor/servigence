import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  FileCheck,
  UserPlus,
  Download,
  Upload,
  Settings,
  MoreVertical
} from 'lucide-react';
import { mockEmployees, mockCompanies } from '../data/mockData';
import { Employee, Company } from '../types';

const EmployeeManagement: React.FC = () => {
  const [employees] = useState<Employee[]>(mockEmployees);
  const [companies] = useState<Company[]>(mockCompanies);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'visas' | 'dependents' | 'documents'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'expired'>('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.companyName || 'Unknown Company';
  };

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'expiring_soon': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' || employee.visaStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = [
    {
      title: 'Total Employees',
      value: employees.length.toString(),
      change: '+5 this month',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Visas',
      value: employees.filter(e => e.visaStatus === 'active').length.toString(),
      change: '85% of total',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Pending Renewals',
      value: employees.filter(e => e.visaStatus === 'pending').length.toString(),
      change: 'Requires attention',
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Expired Documents',
      value: '3',
      change: 'Urgent action needed',
      icon: AlertTriangle,
      color: 'red'
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
                    stat.color === 'red' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'yellow' ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-4">
          {[
            { type: 'visa_renewal', employee: 'Mohammed Ali', action: 'Visa renewed successfully', time: '2 hours ago', status: 'success' },
            { type: 'document_upload', employee: 'Priya Sharma', action: 'Uploaded Emirates ID copy', time: '5 hours ago', status: 'info' },
            { type: 'dependent_added', employee: 'John Smith', action: 'Added dependent visa application', time: '1 day ago', status: 'pending' },
            { type: 'document_expiry', employee: 'Mohammed Ali', action: 'Labor card expiring in 30 days', time: '2 days ago', status: 'warning' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-green-500' :
                activity.status === 'warning' ? 'bg-yellow-500' :
                activity.status === 'pending' ? 'bg-blue-500' :
                'bg-gray-500'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.employee}</p>
                <p className="text-sm text-gray-600">{activity.action}</p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmployeesList = () => (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowAddEmployee(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
               onClick={() => setSelectedEmployee(employee)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                  <p className="text-sm text-gray-600">{employee.employeeId}</p>
                </div>
              </div>
              <div className="relative">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{employee.position}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{employee.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{getCompanyName(employee.companyId)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getVisaStatusColor(employee.visaStatus)}`}>
                  {employee.visaStatus.charAt(0).toUpperCase() + employee.visaStatus.slice(1)}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {employee.dependents.length} dependents
                  </span>
                  <span className="text-xs text-gray-500">
                    {employee.documents.length} docs
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVisaTracking = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Visa Status Overview</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visa Renewals Timeline */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Upcoming Renewals</h4>
            <div className="space-y-4">
              {employees.filter(e => e.visaExpiryDate).map((employee) => (
                <div key={employee.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-600">Visa expires: {employee.visaExpiryDate}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getVisaStatusColor(employee.visaStatus)}`}>
                    {employee.visaStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Expiry Alerts */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Document Alerts</h4>
            <div className="space-y-4">
              {employees.flatMap(employee =>
                employee.documents.map(doc => ({
                  ...doc,
                  employeeName: employee.name
                }))
              ).filter(doc => doc.expiryDate).map((doc, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <FileText className={`w-5 h-5 ${getDocumentStatusColor(doc.status)}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.employeeName}</p>
                    <p className="text-sm text-gray-600">{doc.name} expires: {doc.expiryDate}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDocumentStatusColor(doc.status)}`}>
                    {doc.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDependentsManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Dependents Management</h3>

        <div className="space-y-6">
          {employees.filter(e => e.dependents.length > 0).map((employee) => (
            <div key={employee.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{employee.name}</h4>
                    <p className="text-sm text-gray-600">{employee.dependents.length} dependents</p>
                  </div>
                </div>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm">Add Dependent</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.dependents.map((dependent) => (
                  <div key={dependent.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{dependent.name}</h5>
                        <p className="text-sm text-gray-600 capitalize">{dependent.relationship}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getVisaStatusColor(dependent.visaStatus)}`}>
                        {dependent.visaStatus}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Nationality:</span>
                        <span>{dependent.nationality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passport:</span>
                        <span>{dependent.passportNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passport Expiry:</span>
                        <span>{dependent.passportExpiry}</span>
                      </div>
                      {dependent.visaExpiryDate && (
                        <div className="flex justify-between">
                          <span>Visa Expiry:</span>
                          <span>{dependent.visaExpiryDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocumentManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Document</span>
            </button>
            <button className="flex items-center space-x-2 text-green-600 hover:text-green-700">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export All</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {employees.map((employee) => (
            <div key={employee.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{employee.name}</h4>
                    <p className="text-sm text-gray-600">{employee.documents.length} documents</p>
                  </div>
                </div>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add Document</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employee.documents.map((document) => (
                  <div key={document.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className={`w-5 h-5 ${getDocumentStatusColor(document.status)}`} />
                        <div>
                          <h5 className="font-medium text-gray-900 text-sm">{document.name}</h5>
                          <p className="text-xs text-gray-600 capitalize">{document.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>{document.uploadDate}</span>
                      </div>
                      {document.expiryDate && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span className={getDocumentStatusColor(document.status)}>
                            {document.expiryDate}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium ${getDocumentStatusColor(document.status)}`}>
                          {document.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex space-x-2">
                        <button className="flex-1 text-xs bg-blue-50 text-blue-600 py-1 px-2 rounded hover:bg-blue-100">
                          View
                        </button>
                        <button className="flex-1 text-xs bg-green-50 text-green-600 py-1 px-2 rounded hover:bg-green-100">
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'employees':
        return renderEmployeesList();
      case 'visas':
        return renderVisaTracking();
      case 'dependents':
        return renderDependentsManagement();
      case 'documents':
        return renderDocumentManagement();
      default:
        return renderOverview();
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'employees', label: 'Employees', icon: User },
    { id: 'visas', label: 'Visa Tracking', icon: CreditCard },
    { id: 'dependents', label: 'Dependents', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileCheck }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Comprehensive employee and visa management system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Employee</span>
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
      {renderCurrentTab()}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                    <p className="text-gray-600">{selectedEmployee.position} • {selectedEmployee.employeeId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{selectedEmployee.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{selectedEmployee.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{selectedEmployee.nationality}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">Joined: {selectedEmployee.joinDate}</span>
                    </div>
                  </div>
                </div>

                {/* Visa Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Visa Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getVisaStatusColor(selectedEmployee.visaStatus)}`}>
                        {selectedEmployee.visaStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="text-gray-900 capitalize">{selectedEmployee.visaType}</span>
                    </div>
                    {selectedEmployee.visaNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Visa Number:</span>
                        <span className="text-gray-900">{selectedEmployee.visaNumber}</span>
                      </div>
                    )}
                    {selectedEmployee.visaExpiryDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Expiry Date:</span>
                        <span className="text-gray-900">{selectedEmployee.visaExpiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents and Dependents */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                  <div className="space-y-2">
                    {selectedEmployee.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className={`w-4 h-4 ${getDocumentStatusColor(doc.status)}`} />
                          <span className="text-sm text-gray-900">{doc.name}</span>
                        </div>
                        <span className={`text-xs ${getDocumentStatusColor(doc.status)}`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Dependents</h3>
                  <div className="space-y-2">
                    {selectedEmployee.dependents.map((dependent) => (
                      <div key={dependent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{dependent.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{dependent.relationship}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getVisaStatusColor(dependent.visaStatus)}`}>
                          {dependent.visaStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;