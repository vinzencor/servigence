import React, { useState } from 'react';
import { emailService } from '../lib/emailService';
import toast from 'react-hot-toast';

const ServiceEmailTest: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const testDocumentExpiryEmailWithService = async () => {
    setLoading(true);
    try {
      const emailData = {
        recipientEmail: 'test@example.com', // Replace with your email for testing
        recipientName: 'John Doe',
        documentType: 'Trade License',
        expiryDate: '2024-01-15',
        companyName: 'ABC Trading LLC',
        serviceName: 'Company Formation LLC',
        serviceCategory: 'Labor Card',
        daysUntilExpiry: 3
      };

      console.log('📧 Sending test document expiry email with service:', emailData);
      const result = await emailService.sendReminderEmail(emailData);
      
      if (result) {
        toast.success('✅ Document expiry email with service sent successfully!');
      } else {
        toast.error('❌ Failed to send document expiry email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('❌ Error sending test email');
    } finally {
      setLoading(false);
    }
  };

  const testDocumentExpiryEmailWithoutService = async () => {
    setLoading(true);
    try {
      const emailData = {
        recipientEmail: 'test@example.com', // Replace with your email for testing
        recipientName: 'John Doe',
        documentType: 'Trade License',
        expiryDate: '2024-01-15',
        companyName: 'ABC Trading LLC',
        daysUntilExpiry: 3
      };

      console.log('📧 Sending test document expiry email without service:', emailData);
      const result = await emailService.sendReminderEmail(emailData);
      
      if (result) {
        toast.success('✅ Document expiry email without service sent successfully!');
      } else {
        toast.error('❌ Failed to send document expiry email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('❌ Error sending test email');
    } finally {
      setLoading(false);
    }
  };

  const testGeneralReminderEmailWithService = async () => {
    setLoading(true);
    try {
      const emailData = {
        recipientEmail: 'test@example.com', // Replace with your email for testing
        recipientName: 'Jane Smith',
        reminderTitle: 'Trade License Renewal',
        reminderDescription: 'Please renew the trade license before expiry to avoid penalties',
        reminderType: 'document_expiry',
        dueDate: '2024-01-15',
        priority: 'high',
        companyName: 'XYZ Corporation',
        serviceName: 'Document Attestation',
        serviceCategory: 'Document Attestation',
        daysUntilDue: 2
      };

      console.log('📧 Sending test general reminder email with service:', emailData);
      const result = await emailService.sendGeneralReminderEmail(emailData);
      
      if (result) {
        toast.success('✅ General reminder email with service sent successfully!');
      } else {
        toast.error('❌ Failed to send general reminder email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('❌ Error sending test email');
    } finally {
      setLoading(false);
    }
  };

  const testGeneralReminderEmailWithoutService = async () => {
    setLoading(true);
    try {
      const emailData = {
        recipientEmail: 'test@example.com', // Replace with your email for testing
        recipientName: 'Jane Smith',
        reminderTitle: 'Trade License Renewal',
        reminderDescription: 'Please renew the trade license before expiry to avoid penalties',
        reminderType: 'document_expiry',
        dueDate: '2024-01-15',
        priority: 'high',
        companyName: 'XYZ Corporation',
        daysUntilDue: 2
      };

      console.log('📧 Sending test general reminder email without service:', emailData);
      const result = await emailService.sendGeneralReminderEmail(emailData);
      
      if (result) {
        toast.success('✅ General reminder email without service sent successfully!');
      } else {
        toast.error('❌ Failed to send general reminder email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('❌ Error sending test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">📧 Service Email Integration Test</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Document Expiry Email Tests</h3>
          <div className="space-y-2">
            <button
              onClick={testDocumentExpiryEmailWithService}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '⏳ Sending...' : '📧 Test Document Expiry Email WITH Service'}
            </button>
            <button
              onClick={testDocumentExpiryEmailWithoutService}
              disabled={loading}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? '⏳ Sending...' : '📧 Test Document Expiry Email WITHOUT Service'}
            </button>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800">General Reminder Email Tests</h3>
          <div className="space-y-2">
            <button
              onClick={testGeneralReminderEmailWithService}
              disabled={loading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '⏳ Sending...' : '📧 Test General Reminder Email WITH Service'}
            </button>
            <button
              onClick={testGeneralReminderEmailWithoutService}
              disabled={loading}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? '⏳ Sending...' : '📧 Test General Reminder Email WITHOUT Service'}
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">📋 Expected Email Content Examples</h3>
          
          <div className="space-y-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <h4 className="font-semibold text-blue-700">Document Expiry Email WITH Service:</h4>
              <div className="mt-2 font-mono text-xs bg-gray-100 p-2 rounded">
                <strong>Document:</strong> Trade License<br/>
                <strong>Expiry Date:</strong> 2024-01-15<br/>
                <strong>Days Until Expiry:</strong> 3 days<br/>
                <strong>Company:</strong> ABC Trading LLC<br/>
                <strong>Related Service:</strong> Company Formation LLC (Labor Card)
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <h4 className="font-semibold text-green-700">General Reminder Email WITH Service:</h4>
              <div className="mt-2 font-mono text-xs bg-gray-100 p-2 rounded">
                <strong>Title:</strong> Trade License Renewal<br/>
                <strong>Description:</strong> Please renew the trade license before expiry<br/>
                <strong>Type:</strong> DOCUMENT_EXPIRY<br/>
                <strong>Due Date:</strong> 1/15/2024<br/>
                <strong>Priority:</strong> HIGH<br/>
                <strong>Company:</strong> XYZ Corporation<br/>
                <strong>Related Service:</strong> Document Attestation (Document Attestation)<br/>
                <strong>Days Until Due:</strong> 2 days
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-red-700 text-sm">
            <strong>⚠️ Important:</strong> Before testing, replace 'test@example.com' with your actual email address in the code above.
            The emails will be sent to the specified address so you can see the actual rendered output.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceEmailTest;
