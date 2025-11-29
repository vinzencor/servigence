import React, { useState, useEffect } from 'react';
import { Bell, Play, RefreshCw, Calendar, Mail, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { serviceExpiryReminderService } from '../lib/serviceExpiryReminder';
import ExpiryReminderSettings from './ExpiryReminderSettings';
import ServiceExpiryCalendar from './ServiceExpiryCalendar';

const ServiceExpiryReminderManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'logs'>('calendar');
  const [running, setRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const logsData = await serviceExpiryReminderService.getReminderLogs();
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load reminder logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const runReminderCheck = async () => {
    try {
      setRunning(true);
      toast.loading('Checking for expiring services and sending reminders...', { id: 'reminder-check' });

      const result = await serviceExpiryReminderService.checkAndSendReminders();
      setLastRunResult(result);

      if (result.success) {
        toast.success(result.message, { id: 'reminder-check' });
      } else {
        toast.error(result.message, { id: 'reminder-check' });
      }

      // Reload logs if on logs tab
      if (activeTab === 'logs') {
        await loadLogs();
      }
    } catch (error: any) {
      console.error('Error running reminder check:', error);
      toast.error('Failed to run reminder check', { id: 'reminder-check' });
    } finally {
      setRunning(false);
    }
  };

  const tabs = [
    { id: 'calendar' as const, label: 'Expiry Calendar', icon: Calendar },
    { id: 'settings' as const, label: 'Reminder Settings', icon: Bell },
    { id: 'logs' as const, label: 'Reminder Logs', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Service Expiry Reminder Manager</h1>
                <p className="text-indigo-100 text-sm mt-1">Manage automated email reminders for service expiry dates</p>
              </div>
            </div>
            <button
              onClick={runReminderCheck}
              disabled={running}
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Run Reminder Check Now</span>
                </>
              )}
            </button>
          </div>

          {/* Last Run Result */}
          {lastRunResult && (
            <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Checked: {lastRunResult.totalChecked}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5" />
                    <span className="text-sm">Sent: {lastRunResult.remindersSent}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm">Errors: {lastRunResult.errors}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Last run: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'calendar' && <ServiceExpiryCalendar />}
        {activeTab === 'settings' && <ExpiryReminderSettings />}
        {activeTab === 'logs' && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Eye className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Reminder Email Logs</h2>
                </div>
                <button
                  onClick={loadLogs}
                  disabled={loadingLogs}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingLogs ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reminder emails sent yet</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Run Reminder Check Now" to send reminders</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days Before
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.email_sent_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{log.recipient_name}</div>
                            <div className="text-sm text-gray-500">{log.recipient_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{log.service_name}</div>
                            <div className="text-sm text-gray-500">{log.invoice_number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.expiry_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.days_before_expiry} days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.email_status === 'sent' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Sent
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                <XCircle className="w-4 h-4 mr-1" />
                                Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceExpiryReminderManager;

