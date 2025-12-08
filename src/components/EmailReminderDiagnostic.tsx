import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Mail, Database, Server, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { emailService } from '../lib/emailService';
import { serviceExpiryReminderService } from '../lib/serviceExpiryReminder';

const EmailReminderDiagnostic: React.FC = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const runDiagnostics = async () => {
    setTesting(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    };

    try {
      // Check 1: Environment Variables
      console.log('🔍 Check 1: Environment Variables');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      results.checks.push({
        name: 'Environment Variables',
        status: supabaseUrl && supabaseAnonKey ? 'pass' : 'fail',
        message: supabaseUrl && supabaseAnonKey 
          ? `Supabase URL: ${supabaseUrl}` 
          : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY',
        details: { supabaseUrl, hasAnonKey: !!supabaseAnonKey }
      });

      // Check 2: Email Reminder Settings
      console.log('🔍 Check 2: Email Reminder Settings');
      const { data: settings, error: settingsError } = await supabase
        .from('email_reminder_settings')
        .select('*');

      results.checks.push({
        name: 'Email Reminder Settings',
        status: !settingsError && settings && settings.length > 0 ? 'pass' : 'fail',
        message: !settingsError && settings && settings.length > 0
          ? `Found ${settings.length} reminder setting(s)`
          : settingsError?.message || 'No reminder settings found',
        details: settings
      });

      // Check 3: Services with Expiry Dates
      console.log('🔍 Check 3: Services with Expiry Dates');
      const { data: services, error: servicesError } = await supabase
        .from('service_billings')
        .select('id, invoice_number, expiry_date')
        .not('expiry_date', 'is', null)
        .limit(10);

      results.checks.push({
        name: 'Services with Expiry Dates',
        status: !servicesError && services && services.length > 0 ? 'pass' : 'warn',
        message: !servicesError && services
          ? `Found ${services.length} service(s) with expiry dates`
          : servicesError?.message || 'No services with expiry dates',
        details: services
      });

      // Check 4: Documents with Expiry Dates
      console.log('🔍 Check 4: Documents with Expiry Dates');
      const { data: docs, error: docsError } = await supabase
        .from('company_documents')
        .select('id, title, expiry_date')
        .not('expiry_date', 'is', null)
        .eq('status', 'active')
        .limit(10);

      results.checks.push({
        name: 'Documents with Expiry Dates',
        status: !docsError && docs && docs.length > 0 ? 'pass' : 'warn',
        message: !docsError && docs
          ? `Found ${docs.length} document(s) with expiry dates`
          : docsError?.message || 'No documents with expiry dates',
        details: docs
      });

      // Check 5: Email Reminder Logs
      console.log('🔍 Check 5: Email Reminder Logs');
      const { data: logs, error: logsError } = await supabase
        .from('email_reminder_logs')
        .select('*')
        .order('email_sent_at', { ascending: false })
        .limit(5);

      results.checks.push({
        name: 'Email Reminder Logs',
        status: !logsError ? 'pass' : 'fail',
        message: !logsError
          ? `Found ${logs?.length || 0} recent log(s)`
          : logsError?.message || 'Error fetching logs',
        details: logs
      });

      // Check 6: Supabase Edge Function
      console.log('🔍 Check 6: Supabase Edge Function');
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/resend`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: 'test@example.com',
            subject: 'Test',
            html: '<p>Test</p>'
          })
        });

        const responseText = await response.text();
        
        results.checks.push({
          name: 'Supabase Edge Function',
          status: response.ok ? 'pass' : 'fail',
          message: response.ok 
            ? 'Edge function is accessible' 
            : `HTTP ${response.status}: ${responseText}`,
          details: { status: response.status, response: responseText }
        });
      } catch (error: any) {
        results.checks.push({
          name: 'Supabase Edge Function',
          status: 'fail',
          message: `Error: ${error.message}`,
          details: error
        });
      }

      setDiagnosticResults(results);
      console.log('✅ Diagnostics complete:', results);
      toast.success('Diagnostics complete! Check results below.');
    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      toast.error(`Diagnostic error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setTesting(true);
    try {
      const sent = await emailService.sendServiceExpiryReminderEmail({
        recipientEmail: testEmail,
        recipientName: 'Test User',
        serviceName: 'Test Service',
        invoiceNumber: 'TEST-001',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 7,
        totalAmount: 1000,
        serviceDate: new Date().toISOString()
      });

      if (sent) {
        toast.success(`Test email sent successfully to ${testEmail}!`);
      } else {
        toast.error('Failed to send test email. Check console for details.');
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const runManualReminderCheck = async () => {
    setTesting(true);
    try {
      console.log('🔔 Running manual reminder check...');
      const result = await serviceExpiryReminderService.checkAndSendReminders();
      console.log('✅ Manual reminder check result:', result);
      toast.success(result.message);
    } catch (error: any) {
      console.error('❌ Manual reminder check error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertCircle className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Email Reminder System Diagnostics</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={runDiagnostics}
            disabled={testing}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Database className="w-5 h-5" />
            <span>{testing ? 'Running...' : 'Run Diagnostics'}</span>
          </button>

          <button
            onClick={runManualReminderCheck}
            disabled={testing}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Mail className="w-5 h-5" />
            <span>{testing ? 'Checking...' : 'Run Manual Check'}</span>
          </button>

          <div className="flex space-x-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendTestEmail}
              disabled={testing || !testEmail}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Mail className="w-5 h-5" />
            </button>
          </div>
        </div>

        {diagnosticResults && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Diagnostic Run:</strong> {new Date(diagnosticResults.timestamp).toLocaleString()}
              </p>
            </div>

            {diagnosticResults.checks.map((check: any, index: number) => (
              <div
                key={index}
                className={`border-l-4 p-4 rounded-lg ${
                  check.status === 'pass'
                    ? 'border-green-500 bg-green-50'
                    : check.status === 'warn'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {check.status === 'pass' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : check.status === 'warn' ? (
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{check.name}</h3>
                    <p className="text-sm text-gray-700 mt-1">{check.message}</p>
                    {check.details && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-white rounded text-xs overflow-auto max-h-64">
                          {JSON.stringify(check.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailReminderDiagnostic;

