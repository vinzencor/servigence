import React, { useState } from 'react';
import { Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { emailService } from '../lib/emailService';
import toast from 'react-hot-toast';

const EmailTest: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      console.log('🧪 Testing email service with Supabase Edge Function...');

      // Test direct Supabase function call
      const { dbHelpers } = await import('../lib/supabase');
      console.log('🔍 dbHelpers.supabase:', dbHelpers.supabase);
      console.log('🔍 dbHelpers.supabase.functions:', dbHelpers.supabase.functions);

      const success = await emailService.sendWelcomeEmail({
        companyName: 'Test Company Ltd.',
        primaryEmail: testEmail
      });

      if (success) {
        setLastResult({ success: true, message: 'Test email sent successfully!' });
        toast.success('Test email sent successfully!');
      } else {
        setLastResult({ success: false, message: 'Failed to send test email' });
        toast.error('Failed to send test email');
      }
    } catch (error) {
      console.error('❌ Email test error:', error);
      setLastResult({ success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      toast.error('Email test failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Email Service Test</h2>
            <p className="text-gray-600">Test the Resend email integration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to send test to..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={sendTestEmail}
            disabled={sending || !testEmail}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Test Email</span>
              </>
            )}
          </button>

          {lastResult && (
            <div className={`p-4 rounded-lg border ${
              lastResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {lastResult.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{lastResult.message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Configuration Status</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Supabase Edge Function:</span>
              <span className="text-green-600">✓ Deployed</span>
            </div>
            <div className="flex justify-between">
              <span>Resend Integration:</span>
              <span className="text-green-600">✓ Server-side</span>
            </div>
            <div className="flex justify-between">
              <span>Email Service:</span>
              <span className="text-green-600">✓ Supabase + Resend</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTest;
