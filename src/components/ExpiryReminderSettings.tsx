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
  const [serviceSettings, setServiceSettings] = useState<ReminderSettings | null>(null);
  const [documentSettings, setDocumentSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Service settings
  const [serviceEnabled, setServiceEnabled] = useState(true);
  const [serviceIntervals, setServiceIntervals] = useState<number[]>([30, 15, 7, 3, 1]);
  const [serviceEmailSubject, setServiceEmailSubject] = useState('Service Expiry Reminder - {{service_name}}');
  const [serviceEmailTemplate, setServiceEmailTemplate] = useState('');
  const [newServiceInterval, setNewServiceInterval] = useState('');

  // Document settings
  const [documentEnabled, setDocumentEnabled] = useState(true);
  const [documentIntervals, setDocumentIntervals] = useState<number[]>([30, 15, 7, 3, 1]);
  const [documentEmailSubject, setDocumentEmailSubject] = useState('Document Expiry Reminder - {{document_title}}');
  const [documentEmailTemplate, setDocumentEmailTemplate] = useState('');
  const [newDocumentInterval, setNewDocumentInterval] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load service settings
      const { data: serviceData, error: serviceError } = await supabase
        .from('email_reminder_settings')
        .select('*')
        .eq('reminder_type', 'service_expiry')
        .single();

      if (serviceError && serviceError.code !== 'PGRST116') {
        throw serviceError;
      }

      if (serviceData) {
        setServiceSettings(serviceData);
        setServiceEnabled(serviceData.enabled);
        setServiceIntervals(serviceData.reminder_intervals || [30, 15, 7, 3, 1]);
        setServiceEmailSubject(serviceData.email_subject || 'Service Expiry Reminder - {{service_name}}');
        setServiceEmailTemplate(serviceData.email_template || '');
      }

      // Load document settings
      const { data: documentData, error: documentError } = await supabase
        .from('email_reminder_settings')
        .select('*')
        .eq('reminder_type', 'document_expiry')
        .single();

      if (documentError && documentError.code !== 'PGRST116') {
        throw documentError;
      }

      if (documentData) {
        setDocumentSettings(documentData);
        setDocumentEnabled(documentData.enabled);
        setDocumentIntervals(documentData.reminder_intervals || [30, 15, 7, 3, 1]);
        setDocumentEmailSubject(documentData.email_subject || 'Document Expiry Reminder - {{document_title}}');
        setDocumentEmailTemplate(documentData.email_template || '');
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

      // Save service settings
      const serviceData = {
        enabled: serviceEnabled,
        reminder_type: 'service_expiry',
        reminder_intervals: serviceIntervals.sort((a, b) => b - a), // Sort descending
        email_subject: serviceEmailSubject,
        email_template: serviceEmailTemplate,
        updated_at: new Date().toISOString(),
        updated_by: 'Admin'
      };

      if (serviceSettings?.id) {
        const { error } = await supabase
          .from('email_reminder_settings')
          .update(serviceData)
          .eq('id', serviceSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_reminder_settings')
          .insert([{ ...serviceData, created_by: 'Admin' }]);
        if (error) throw error;
      }

      // Save document settings
      const documentData = {
        enabled: documentEnabled,
        reminder_type: 'document_expiry',
        reminder_intervals: documentIntervals.sort((a, b) => b - a), // Sort descending
        email_subject: documentEmailSubject,
        email_template: documentEmailTemplate,
        updated_at: new Date().toISOString(),
        updated_by: 'Admin'
      };

      if (documentSettings?.id) {
        const { error } = await supabase
          .from('email_reminder_settings')
          .update(documentData)
          .eq('id', documentSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_reminder_settings')
          .insert([{ ...documentData, created_by: 'Admin' }]);
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

  const addServiceInterval = () => {
    const interval = parseInt(newServiceInterval);
    if (interval > 0 && !serviceIntervals.includes(interval)) {
      setServiceIntervals([...serviceIntervals, interval].sort((a, b) => b - a));
      setNewServiceInterval('');
    } else {
      toast.error('Invalid interval or interval already exists');
    }
  };

  const removeServiceInterval = (interval: number) => {
    setServiceIntervals(serviceIntervals.filter(i => i !== interval));
  };

  const addDocumentInterval = () => {
    const interval = parseInt(newDocumentInterval);
    if (interval > 0 && !documentIntervals.includes(interval)) {
      setDocumentIntervals([...documentIntervals, interval].sort((a, b) => b - a));
      setNewDocumentInterval('');
    } else {
      toast.error('Invalid interval or interval already exists');
    }
  };

  const removeDocumentInterval = (interval: number) => {
    setDocumentIntervals(documentIntervals.filter(i => i !== interval));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Expiry Reminder Settings</h1>
              <p className="text-blue-100 text-sm mt-1">Configure automated email reminders for service and document expiry dates</p>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SERVICE EXPIRY SETTINGS */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white">Service Expiry Reminders</h2>
            <p className="text-red-100 text-sm mt-1">Configure reminders for service billing expiry dates</p>
          </div>

          {/* Service Enable/Disable Toggle */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Service Reminders</h3>
                  <p className="text-gray-600 text-sm mt-1">Enable or disable service expiry reminders</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceEnabled}
                  onChange={(e) => setServiceEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {serviceEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* Service Reminder Intervals */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Service Intervals</h3>
                <p className="text-gray-600 text-sm mt-1">Days before expiry to send reminders</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Intervals */}
              <div className="flex flex-wrap gap-2">
                {serviceIntervals.map((interval) => (
                  <div
                    key={interval}
                    className="bg-red-100 text-red-800 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">{interval} days</span>
                    <button
                      onClick={() => removeServiceInterval(interval)}
                      className="ml-2 text-red-600 hover:text-red-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Service Interval */}
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={newServiceInterval}
                  onChange={(e) => setNewServiceInterval(e.target.value)}
                  placeholder="Enter days (e.g., 30)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="1"
                />
                <button
                  onClick={addServiceInterval}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DOCUMENT EXPIRY SETTINGS */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white">Document Expiry Reminders</h2>
            <p className="text-orange-100 text-sm mt-1">Configure reminders for document & certificate expiry dates</p>
          </div>

          {/* Document Enable/Disable Toggle */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Document Reminders</h3>
                  <p className="text-gray-600 text-sm mt-1">Enable or disable document expiry reminders</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentEnabled}
                  onChange={(e) => setDocumentEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {documentEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* Document Reminder Intervals */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Document Intervals</h3>
                <p className="text-gray-600 text-sm mt-1">Days before expiry to send reminders</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Current Intervals */}
              <div className="flex flex-wrap gap-2">
                {documentIntervals.map((interval) => (
                  <div
                    key={interval}
                    className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">{interval} days</span>
                    <button
                      onClick={() => removeDocumentInterval(interval)}
                      className="ml-2 text-orange-600 hover:text-orange-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Document Interval */}
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={newDocumentInterval}
                  onChange={(e) => setNewDocumentInterval(e.target.value)}
                  placeholder="Enter days (e.g., 30)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
                <button
                  onClick={addDocumentInterval}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium text-lg mb-2">How Automated Reminders Work:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Reminder emails are sent automatically when expiry dates match the configured intervals</li>
              <li>For example, with intervals of 30, 15, and 7 days, emails will be sent at each of these milestones</li>
              <li>The system prevents duplicate emails - only one reminder per interval per day</li>
              <li>Both service and document reminders work independently with their own settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Email Template Customization - Removed for now as templates are hardcoded in emailService */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Email Templates</h2>
            <p className="text-gray-600 text-sm mt-1">Professional email templates are automatically used for both service and document expiry reminders</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="font-medium text-gray-800 mb-2">Email Template Features:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Professional HTML design with company branding and logo</li>
            <li>Responsive layout optimized for all devices</li>
            <li>Color-coded urgency indicators (red for urgent, orange for important, blue for normal)</li>
            <li>Detailed service/document information display</li>
            <li>Partner logos footer (Daman, ADJD, TAMM, Tasheel, Emirates, ICP)</li>
            <li>Automatic placeholder replacement with actual data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExpiryReminderSettings;

