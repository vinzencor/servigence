import React, { useState, useEffect } from 'react';
import { Settings, Mail, Calendar, Save, AlertCircle, CheckCircle, Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ReminderSettings {
  id: string;
  enabled: boolean;
  reminderType: string;
  reminderIntervals: number[];
  emailSubject: string;
  emailTemplate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

const ExpiryReminderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [reminderIntervals, setReminderIntervals] = useState<number[]>([30, 15, 7, 3, 1]);
  const [emailSubject, setEmailSubject] = useState('Service Expiry Reminder - {{service_name}}');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [newInterval, setNewInterval] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_reminder_settings')
        .select('*')
        .eq('reminder_type', 'service_expiry')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
        setEnabled(data.enabled);
        setReminderIntervals(data.reminder_intervals || [30, 15, 7, 3, 1]);
        setEmailSubject(data.email_subject || 'Service Expiry Reminder - {{service_name}}');
        setEmailTemplate(data.email_template || '');
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const settingsData = {
        enabled,
        reminder_type: 'service_expiry',
        reminder_intervals: reminderIntervals.sort((a, b) => b - a), // Sort descending
        email_subject: emailSubject,
        email_template: emailTemplate,
        updated_at: new Date().toISOString(),
        updated_by: 'Admin'
      };

      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('email_reminder_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('email_reminder_settings')
          .insert([{ ...settingsData, created_by: 'Admin' }]);

        if (error) throw error;
      }

      toast.success('Reminder settings saved successfully!');
      await loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save reminder settings');
    } finally {
      setSaving(false);
    }
  };

  const addInterval = () => {
    const interval = parseInt(newInterval);
    if (interval > 0 && !reminderIntervals.includes(interval)) {
      setReminderIntervals([...reminderIntervals, interval].sort((a, b) => b - a));
      setNewInterval('');
    } else {
      toast.error('Invalid interval or interval already exists');
    }
  };

  const removeInterval = (interval: number) => {
    setReminderIntervals(reminderIntervals.filter(i => i !== interval));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Service Expiry Reminder Settings</h1>
              <p className="text-blue-100 text-sm mt-1">Configure automated email reminders for service expiry dates</p>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Automated Email Reminders</h2>
              <p className="text-gray-600 text-sm mt-1">Enable or disable automated email reminders for service expiry</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>
      </div>

      {/* Reminder Intervals */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Reminder Intervals</h2>
            <p className="text-gray-600 text-sm mt-1">Set how many days before expiry to send reminder emails</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Intervals */}
          <div className="flex flex-wrap gap-2">
            {reminderIntervals.map((interval) => (
              <div
                key={interval}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{interval} days before</span>
                <button
                  onClick={() => removeInterval(interval)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add New Interval */}
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
              placeholder="Enter days (e.g., 30)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
            <button
              onClick={addInterval}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Interval
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How it works:</p>
                <p className="mt-1">
                  Reminder emails will be sent automatically when a service's expiry date matches any of the intervals above.
                  For example, if you set intervals of 30, 15, and 7 days, emails will be sent 30 days before expiry, 15 days before, and 7 days before.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Template Customization */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Email Template</h2>
            <p className="text-gray-600 text-sm mt-1">Customize the email subject and body (placeholders will be replaced automatically)</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Service Expiry Reminder - {{service_name}}"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body Template
            </label>
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Enter email template..."
            />
          </div>

          {/* Available Placeholders */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="font-medium text-gray-800 mb-2">Available Placeholders:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{client_name}}'}</code> - Client name</div>
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{service_name}}'}</code> - Service name</div>
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{invoice_number}}'}</code> - Invoice number</div>
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{expiry_date}}'}</code> - Expiry date</div>
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{days_until_expiry}}'}</code> - Days until expiry</div>
              <div><code className="bg-gray-200 px-2 py-1 rounded">{'{{total_amount}}'}</code> - Total amount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
        <div className="text-sm text-green-800">
          <p className="font-medium">Note:</p>
          <p className="mt-1">
            The actual email template uses a professional HTML design with company branding, partner logos, and responsive layout.
            The template above is for reference only. The system will automatically format the email with proper styling.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpiryReminderSettings;

