import React, { useState, useEffect } from 'react';
import { Bell, Calendar, AlertTriangle, CheckCircle, X, Plus, Search, Filter, Clock, User, Building2, Mail } from 'lucide-react';
import { dbHelpers, supabase } from '../lib/supabase';
import { emailService } from '../lib/emailService';
import toast from 'react-hot-toast';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_type: string;
  document_type?: string;
  priority: string;
  status: string;
  employee?: { name: string; employee_id: string };
  company?: { company_name: string };
  individual?: { individual_name: string };
  days_before_reminder: number;
}

const RemindersManagement: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddReminder, setShowAddReminder] = useState(false);

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_type: 'custom',
    priority: 'medium',
    days_before_reminder: 30
  });

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await dbHelpers.getReminders();
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = (reminderDate: string) => {
    const today = new Date();
    const reminder = new Date(reminderDate);
    const diffTime = reminder.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document_expiry': return <Calendar className="w-4 h-4" />;
      case 'license_renewal': return <Building2 className="w-4 h-4" />;
      case 'custom': return <Bell className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleCreateReminder = async () => {
    try {
      await dbHelpers.createReminder(newReminder);
      await loadReminders();
      setShowAddReminder(false);
      setNewReminder({
        title: '',
        description: '',
        reminder_date: '',
        reminder_type: 'custom',
        priority: 'medium',
        days_before_reminder: 30
      });
      alert('Reminder created successfully!');
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error creating reminder. Please try again.');
    }
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      await dbHelpers.updateReminder(id, { status: 'completed' });
      await loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleDismissReminder = async (id: string) => {
    try {
      await dbHelpers.updateReminder(id, { status: 'dismissed' });
      await loadReminders();
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const handleSendReminder = async (reminder: Reminder) => {
    try {
      console.log('🔄 Sending reminder email for:', reminder.title);

      // Calculate days until due
      const today = new Date();
      const dueDate = new Date(reminder.reminder_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Get recipient information based on reminder type
      let recipientEmail = '';
      let recipientName = '';
      let companyName = '';

      // Check if reminder has related entity data
      if (reminder.company) {
        recipientName = reminder.company.company_name;
        companyName = reminder.company.company_name;

        // Get company email from database
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('email1, email2')
          .eq('company_name', reminder.company.company_name)
          .single();

        if (!companyError && company) {
          recipientEmail = company.email1 || company.email2 || '';
        }
      } else if (reminder.employee) {
        recipientName = reminder.employee.name;

        // Get employee email from database
        const { data: employee, error: employeeError } = await supabase
          .from('service_employees')
          .select('email')
          .eq('employee_id', reminder.employee.employee_id)
          .single();

        if (!employeeError && employee) {
          recipientEmail = employee.email;
        }
      } else if (reminder.individual) {
        recipientName = reminder.individual.individual_name;

        // Get individual email from database
        const { data: individual, error: individualError } = await supabase
          .from('individuals')
          .select('email1')
          .eq('individual_name', reminder.individual.individual_name)
          .single();

        if (!individualError && individual) {
          recipientEmail = individual.email1;
        }
      }

      if (!recipientEmail) {
        toast.error('No email address found for this reminder');
        return;
      }

      // Send the reminder email
      const emailSent = await emailService.sendGeneralReminderEmail({
        recipientEmail,
        recipientName,
        reminderTitle: reminder.title,
        reminderDescription: reminder.description,
        reminderType: reminder.reminder_type,
        dueDate: reminder.reminder_date,
        priority: reminder.priority,
        companyName: companyName || undefined,
        daysUntilDue
      });

      if (emailSent) {
        toast.success(`Reminder email sent successfully to ${recipientEmail}`);
        console.log('✅ Reminder email sent successfully');
      } else {
        toast.error('Failed to send reminder email');
        console.log('❌ Failed to send reminder email');
      }
    } catch (error) {
      console.error('❌ Error sending reminder email:', error);
      toast.error('Error sending reminder email');
    }
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reminder.company?.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || reminder.reminder_type === filterType;
    const matchesPriority = filterPriority === 'all' || reminder.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const upcomingReminders = filteredReminders.filter(r => calculateDaysLeft(r.reminder_date) >= 0);
  const overdueReminders = filteredReminders.filter(r => calculateDaysLeft(r.reminder_date) < 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Reminders Management</h1>
              <p className="text-purple-100 mt-1">Track document expiry dates and important deadlines</p>
            </div>
            <button
              onClick={() => setShowAddReminder(true)}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reminders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="document_expiry">Document Expiry</option>
                <option value="license_renewal">License Renewal</option>
                <option value="custom">Custom</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-700">{overdueReminders.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Due Soon</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {upcomingReminders.filter(r => calculateDaysLeft(r.reminder_date) <= 30).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Active</p>
                  <p className="text-2xl font-bold text-blue-700">{reminders.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-600">Upcoming</p>
                  <p className="text-2xl font-bold text-green-700">{upcomingReminders.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Reminders</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading reminders...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'all' || filterPriority !== 'all' 
                  ? 'No reminders match your search criteria.' 
                  : 'Start by adding your first reminder.'}
              </p>
              <button
                onClick={() => setShowAddReminder(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Add Reminder
              </button>
            </div>
          ) : (
            filteredReminders.map((reminder) => {
              const daysLeft = calculateDaysLeft(reminder.reminder_date);
              const isOverdue = daysLeft < 0;
              
              return (
                <div key={reminder.id} className={`p-6 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTypeIcon(reminder.reminder_type)}
                        <h3 className="text-lg font-semibold text-gray-900">{reminder.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      {reminder.description && (
                        <p className="text-gray-600 mb-2">{reminder.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Due: {new Date(reminder.reminder_date).toLocaleDateString()}</span>
                        {reminder.employee && (
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {reminder.employee.name}
                          </span>
                        )}
                        {reminder.company && (
                          <span className="flex items-center">
                            <Building2 className="w-4 h-4 mr-1" />
                            {reminder.company.company_name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          isOverdue ? 'text-red-600' : 
                          daysLeft <= 7 ? 'text-red-600' : 
                          daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {reminder.reminder_type.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSendReminder(reminder)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Send Reminder Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as Complete"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDismissReminder(reminder.id)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Reminder</h2>
                <button
                  onClick={() => setShowAddReminder(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Reminder title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newReminder.reminder_date}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, reminder_date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={newReminder.priority}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days Before Reminder</label>
                  <input
                    type="number"
                    value={newReminder.days_before_reminder}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, days_before_reminder: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddReminder(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!newReminder.title || !newReminder.reminder_date}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersManagement;
