import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Building2, FileText, DollarSign, AlertCircle, Clock, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { mockCompanies, mockServices, mockInvoices, mockReminders } from '../data/mockData';
import { dbHelpers } from '../lib/supabase';

interface DashboardProps {
  onNavigate?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [realReminders, setRealReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const totalCompanies = mockCompanies.length;
  const activeServices = mockServices.filter(s => s.status === 'in_progress').length;
  const pendingInvoices = mockInvoices.filter(i => i.status === 'sent').length;
  const urgentReminders = realReminders.filter(r => r.priority === 'urgent').length;

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await dbHelpers.getUpcomingReminders(90);
      setRealReminders(data || []);
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

  const stats = [
    {
      title: 'Total Companies',
      value: totalCompanies.toString(),
      change: '+12%',
      trend: 'up',
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'Active Services',
      value: activeServices.toString(),
      change: '+8%',
      trend: 'up',
      icon: FileText,
      color: 'green'
    },
    {
      title: 'Pending Invoices',
      value: pendingInvoices.toString(),
      change: '-5%',
      trend: 'down',
      icon: DollarSign,
      color: 'amber'
    },
    {
      title: 'Urgent Reminders',
      value: urgentReminders.toString(),
      change: '+3%',
      trend: 'up',
      icon: AlertCircle,
      color: 'red'
    }
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'company_registered',
      title: 'New Company Registered',
      description: 'Al Manara Trading LLC has been successfully registered',
      time: '2 hours ago',
      icon: Building2,
      color: 'blue'
    },
    {
      id: '2',
      type: 'service_completed',
      title: 'Service Completed',
      description: 'Document attestation completed for Gulf Construction Co.',
      time: '4 hours ago',
      icon: CheckCircle,
      color: 'green'
    },
    {
      id: '3',
      type: 'invoice_sent',
      title: 'Invoice Sent',
      description: 'Invoice INV-2024-002 sent to Emirates Tech Solutions',
      time: '6 hours ago',
      icon: FileText,
      color: 'amber'
    },
    {
      id: '4',
      type: 'reminder_added',
      title: 'Reminder Set',
      description: 'Visa renewal reminder set for John Smith',
      time: '1 day ago',
      icon: Clock,
      color: 'purple'
    }
  ];

  const upcomingReminders = [
    {
      id: '1',
      title: 'Passport Expiry - John Doe',
      expiryDate: '2025-03-15',
      priority: 'high',
      type: 'passport',
      company: 'Al Manara Trading LLC',
      daysLeft: 45
    },
    {
      id: '2',
      title: 'Visa Expiry - Ahmed Al-Rashid',
      expiryDate: '2025-02-20',
      priority: 'urgent',
      type: 'visa',
      company: 'Global Tech Solutions',
      daysLeft: 22
    },
    {
      id: '3',
      title: 'Emirates ID Expiry - Sarah Johnson',
      expiryDate: '2025-04-10',
      priority: 'medium',
      type: 'emirates_id',
      company: 'Tech Innovations LLC',
      daysLeft: 71
    },
    {
      id: '4',
      title: 'Labor Card Expiry - Mohammed Hassan',
      expiryDate: '2025-05-05',
      priority: 'medium',
      type: 'labor_card',
      company: 'Construction Co.',
      daysLeft: 96
    }
  ];

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border') => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-600',
        border: 'border-blue-200'
      },
      green: {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-600',
        border: 'border-green-200'
      },
      amber: {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-600',
        border: 'border-amber-200'
      },
      red: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-600',
        border: 'border-red-200'
      },
      purple: {
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-600',
        border: 'border-purple-200'
      }
    };
    
    return colorMap[color as keyof typeof colorMap]?.[variant] || colorMap.blue[variant];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Sarah!</h1>
            <p className="text-blue-100 text-lg">Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
              <p className="text-blue-100">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(stat.color, 'bg')}`}>
                  <Icon className={`w-6 h-6 ${getColorClasses(stat.color, 'text')}`} />
                </div>
                <div className={`flex items-center space-x-1 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="font-medium">{stat.change}</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-500 font-medium">{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Activities</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(activity.color, 'bg')}`}>
                      <Icon className={`w-5 h-5 ${getColorClasses(activity.color, 'text')}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">{activity.title}</h4>
                      <p className="text-sm text-gray-500 mb-1">{activity.description}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Reminders</h2>
              <span className="text-sm text-gray-500">Document Expiry Alerts</span>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading reminders...</p>
              </div>
            ) : realReminders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming reminders</h3>
                <p className="text-gray-600">Add employees with document expiry dates to see reminders here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {realReminders.slice(0, 5).map((reminder) => {
                  const daysLeft = calculateDaysLeft(reminder.reminder_date);
                  return (
                    <div key={reminder.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-all">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                        <p className="text-sm text-gray-500 mb-1">
                          Company: {reminder.company?.company_name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(reminder.reminder_date).toLocaleDateString()}
                          ({daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`})
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority.toUpperCase()}
                        </span>
                        <div className="text-right">
                          <div className={`text-xs font-medium ${
                            daysLeft <= 0 ? 'text-red-600' :
                            daysLeft <= 30 ? 'text-red-600' :
                            daysLeft <= 60 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {daysLeft > 0 ? `${daysLeft} days` : 'Overdue'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {realReminders.length > 5 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => onNavigate?.('reminders')}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      View all {realReminders.length} reminders →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Register Company', icon: Building2, color: 'blue', view: 'companies' },
            { title: 'Add Employee', icon: Users, color: 'green', view: 'employees' },
            { title: 'Create Invoice', icon: FileText, color: 'amber', view: 'invoices' },
            { title: 'Reminders', icon: Clock, color: 'purple', view: 'reminders' },
            { title: 'Vendors', icon: Building2, color: 'red', view: 'vendors' },
            { title: 'Generate Report', icon: TrendingUp, color: 'blue', view: 'accounts' }
          ].map((action, index) => {
            const Icon = action.icon;

            return (
              <button
                key={index}
                onClick={() => onNavigate?.(action.view)}
                className={`p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group`}
              >
                <div className="text-center">
                  <Icon className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2 transition-colors" />
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;