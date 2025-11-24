// Test email functionality
async function testEmail() {
  try {
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: ['servigence@gmail.com'],
        subject: 'Test Email from Servigens',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Test Email</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Email System Test</h2>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                This is a test email to verify that the Resend integration is working correctly.
              </p>
              
              <p style="color: #666; line-height: 1.6; font-size: 16px;">
                If you receive this email, the system is configured properly!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #667eea; margin: 5px 0;">📧 Sent via Resend API</p>
                <p style="color: #667eea; margin: 5px 0;">🚀 Servigens CRM System</p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>This is a test message from Servigens CRM System.</p>
            </div>
          </div>
        `,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent successfully:', result);
    } else {
      console.error('❌ Email sending failed:', result);
    }
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

// Run the test
testEmail();
