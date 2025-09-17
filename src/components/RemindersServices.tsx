import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
  FileText,
  Eye,
  Edit,
  Trash2,
  Settings,
  TrendingUp,
  Target,
  Zap,
  MoreVertical,
  CalendarDays,
  Users
} from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'visa_renewal' | 'license_renewal' | 'document_expiry' | 'follow_up' | 'payment_due' | 'contract_renewal' | 'other';
  companyId?: string;
  employeeId?: string;
  vendorId?: string;
  date: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  assignedTo?: string;
  createdBy: string;
  createdDate: string;
  completedDate?: string;
  notes?: string;
}

const RemindersServices: React.FC = () => {
  const [reminders] = useState<Reminder[]>([
    {
      id: '1',
      title: 'Visa Renewal - Mohammed Ali',
      description: 'Employment visa expires in 30 days',
      type: 'visa_renewal',
      companyId: 'comp1',
      employeeId: 'emp1',
      date: '2024-01-15',
      dueDate: '2024-02-15',
      priority: 'high',
      status: 'pending',
      assignedTo: 'Sarah Johnson',
      createdBy: 'Admin',
      createdDate: '2024-01-01'
    },
    {
      id: '2',
      title: 'Trade License Renewal - ABC Trading LLC',
      description: 'Trade license expires in 45 days',
      type: 'license_renewal',
      companyId: 'comp2',
      date: '2024-01-20',
      dueDate: '2024-03-01',
      priority: 'medium',
      status: 'pending',
      assignedTo: 'Ahmed Al Mansouri',
      createdBy: 'Admin',
      createdDate: '2024-01-05'
    },
    {
      id: '3',
      title: 'Insurance Payment Due',
      description: 'Monthly insurance premium payment',
      type: 'payment_due',
      companyId: 'comp1',
      date: '2024-01-25',
      dueDate: '2024-01-30',
      priority: 'urgent',
      status: 'pending',
      assignedTo: 'Finance Team',
      createdBy: 'System',
      createdDate: '2024-01-20'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'services' | 'calendar'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'snoozed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'visa_renewal': return User;
      case 'license_renewal': return Building;
      case 'document_expiry': return FileText;
      case 'payment_due': return AlertTriangle;
      case 'contract_renewal': return FileText;
      case 'follow_up': return Clock;
      default: return Bell;
    }
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = filterPriority === 'all' || reminder.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || reminder.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const stats = [
    {
      title: 'Active Reminders',
      value: reminders.filter(r => r.status === 'pending').length.toString(),
      change: '3 urgent',
      icon: Bell,
      color: 'blue'
    },
    {
      title: 'Due Today',
      value: reminders.filter(r => r.dueDate === new Date().toISOString().split('T')[0]).length.toString(),
      change: 'Requires attention',
      icon: Clock,
      color: 'red'
    },
    {
      title: 'Completed This Week',
      value: '12',
      change: '+4 from last week',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Service Milestones',
      value: '8',
      change: '2 approaching',
      icon: Target,
      color: 'purple'
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
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    'text-blue-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Reminders */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Reminders</h3>
        <div className="space-y-4">
          {reminders.filter(r => r.priority === 'urgent' && r.status === 'pending').map((reminder) => {
            const TypeIcon = getTypeIcon(reminder.type);
            return (
              <div key={reminder.id} className="flex items-center space-x-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TypeIcon className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-sm text-gray-600">{reminder.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Due: {reminder.dueDate}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                    {reminder.priority.toUpperCase()}
                  </span>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Milestones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Milestones</h3>
        <div className="space-y-4">
          {[
            { service: 'Company Formation - XYZ Corp', milestone: 'MOA Approval', progress: 75, dueDate: '2024-02-01' },
            { service: 'Visa Processing - John Doe', milestone: 'Medical Test', progress: 50, dueDate: '2024-01-28' },
            { service: 'License Renewal - ABC Trading', milestone: 'Document Submission', progress: 90, dueDate: '2024-01-25' }
          ].map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{item.service}</p>
                  <p className="text-sm text-gray-600">{item.milestone}</p>
                </div>
                <span className="text-sm text-gray-500">Due: {item.dueDate}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">{item.progress}% complete</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'services', label: 'Services', icon: Target },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reminders & Services</h1>
            <p className="text-gray-600 mt-1">Intelligent reminder system and service milestone tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg">
              <Plus className="w-5 h-5" />
              <span>Add Reminder</span>
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
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
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
      {activeTab === 'reminders' && renderRemindersList()}
      {activeTab === 'services' && renderServiceTracking()}
      {activeTab === 'calendar' && renderCalendarView()}
    </div>
  );

  function renderRemindersList() {
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
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="snoozed">Snoozed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const TypeIcon = getTypeIcon(reminder.type);
            return (
              <div key={reminder.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TypeIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{reminder.title}</h3>
                      <p className="text-gray-600 mb-3">{reminder.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {reminder.dueDate}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>Assigned to: {reminder.assignedTo}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created: {reminder.createdDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(reminder.status)}`}>
                      {reminder.status.toUpperCase()}
                    </span>
                    <div className="flex space-x-1">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderServiceTracking() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Service Milestone Tracking</h3>
            <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200">
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-6">
            {[
              {
                id: '1',
                name: 'Company Formation - XYZ Corp',
                client: 'XYZ Corporation',
                type: 'company_formation',
                status: 'in_progress',
                progress: 75,
                milestones: [
                  { name: 'Initial Consultation', status: 'completed', date: '2024-01-01' },
                  { name: 'Name Reservation', status: 'completed', date: '2024-01-05' },
                  { name: 'MOA Preparation', status: 'completed', date: '2024-01-10' },
                  { name: 'MOA Approval', status: 'in_progress', date: '2024-01-20' },
                  { name: 'License Issuance', status: 'pending', date: '2024-02-01' }
                ]
              },
              {
                id: '2',
                name: 'Visa Processing - John Doe',
                client: 'ABC Trading LLC',
                type: 'visa',
                status: 'in_progress',
                progress: 50,
                milestones: [
                  { name: 'Application Submission', status: 'completed', date: '2024-01-15' },
                  { name: 'Initial Approval', status: 'completed', date: '2024-01-18' },
                  { name: 'Medical Test', status: 'in_progress', date: '2024-01-25' },
                  { name: 'Emirates ID Application', status: 'pending', date: '2024-02-01' },
                  { name: 'Visa Stamping', status: 'pending', date: '2024-02-05' }
                ]
              }
            ].map((service) => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.client}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">{service.progress}% Complete</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${service.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {service.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        milestone.status === 'completed' ? 'bg-green-500 border-green-500' :
                        milestone.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                        'bg-gray-200 border-gray-300'
                      }`}>
                        {milestone.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          milestone.status === 'completed' ? 'text-green-700' :
                          milestone.status === 'in_progress' ? 'text-blue-700' :
                          'text-gray-600'
                        }`}>
                          {milestone.name}
                        </p>
                        <p className="text-xs text-gray-500">{milestone.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderCalendarView() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Calendar View</h3>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + i);
              const dayReminders = reminders.filter(r => r.dueDate === date.toISOString().split('T')[0]);

              return (
                <div key={i} className="min-h-[100px] p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayReminders.slice(0, 2).map((reminder) => (
                      <div key={reminder.id} className={`text-xs p-1 rounded ${getPriorityColor(reminder.priority)}`}>
                        {reminder.title.substring(0, 20)}...
                      </div>
                    ))}
                    {dayReminders.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayReminders.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
};

export default RemindersServices;
