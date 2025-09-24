import React, { useState, useEffect } from 'react';
import { User, Calendar, FileText, Clock, LogOut, Bell, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';

interface EmployeeDashboardProps {
  employee: any;
  onLogout: () => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee, onLogout }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployeeReminders();
  }, [employee.id]);

  const loadEmployeeReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbHelpers.supabase
        .from('reminders')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('status', 'active')
        .order('reminder_date', { ascending: true });

      if (error) throw error;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Employee Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back, {employee.name}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Employee Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employee ID</p>
                      <p className="text-gray-900">{employee.employee_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{employee.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-900">{employee.phone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nationality</p>
                      <p className="text-gray-900">{employee.nationality}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Position</p>
                      <p className="text-gray-900">{employee.position}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Join Date</p>
                      <p className="text-gray-900">{formatDate(employee.join_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p className="text-gray-900">{employee.department}</p>
                    </div>
                  </div>
                  
                  {employee.manager && (
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Manager</p>
                        <p className="text-gray-900">{employee.manager}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Passport Number</p>
                    <p className="text-gray-900">{employee.passport_number}</p>
                    <p className="text-xs text-gray-500">Expires: {formatDate(employee.passport_expiry)}</p>
                  </div>
                  
                  {employee.emirates_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Emirates ID</p>
                      <p className="text-gray-900">{employee.emirates_id}</p>
                      {employee.emirates_id_expiry && (
                        <p className="text-xs text-gray-500">Expires: {formatDate(employee.emirates_id_expiry)}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {employee.visa_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Visa Number</p>
                      <p className="text-gray-900">{employee.visa_number}</p>
                      {employee.visa_expiry_date && (
                        <p className="text-xs text-gray-500">Expires: {formatDate(employee.visa_expiry_date)}</p>
                      )}
                    </div>
                  )}
                  
                  {employee.labor_card_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Labor Card</p>
                      <p className="text-gray-900">{employee.labor_card_number}</p>
                      {employee.labor_card_expiry && (
                        <p className="text-xs text-gray-500">Expires: {formatDate(employee.labor_card_expiry)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Document Reminders */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Document Reminders</h2>
                <Bell className="w-5 h-5 text-gray-400" />
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading reminders...</p>
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders</h3>
                  <p className="text-gray-600">All your documents are up to date!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reminders.map((reminder) => {
                    const daysLeft = calculateDaysLeft(reminder.reminder_date);
                    const isOverdue = daysLeft < 0;
                    
                    return (
                      <div key={reminder.id} className={`p-4 border rounded-lg ${isOverdue ? 'bg-red-50 border-red-200' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                            <p className="text-xs text-gray-500 mb-2">
                              Due: {formatDate(reminder.reminder_date)}
                            </p>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                              {reminder.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-medium ${
                              isOverdue ? 'text-red-600' : 
                              daysLeft <= 7 ? 'text-red-600' : 
                              daysLeft <= 30 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
