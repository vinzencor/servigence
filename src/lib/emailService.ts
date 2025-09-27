// Email service using Resend
interface EmailTemplate {
  to: string | string[];
  subject: string;
  html: string;
}

interface WelcomeEmailData {
  companyName: string;
  primaryEmail: string;
  secondaryEmail?: string;
}

interface IndividualWelcomeEmailData {
  individualName: string;
  primaryEmail: string;
  secondaryEmail?: string;
}

interface ReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  documentType: string;
  expiryDate: string;
  companyName?: string;
  daysUntilExpiry: number;
}

interface DueReminderEmailData {
  recipientEmail: string;
  companyName: string;
  dueAmount: number;
  originalAmount: number;
  serviceName: string;
  dueDate: string;
  daysUntilDue: number;
}

class EmailService {
  private backendUrl = 'http://localhost:3001';

  private async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      console.log('🔄 Sending email via backend:', {
        to: template.to,
        subject: template.subject,
        backendUrl: this.backendUrl
      });

      // Check if backend is available
      try {
        const healthCheck = await fetch(`${this.backendUrl}/api/health`);
        if (!healthCheck.ok) {
          console.error('❌ Email server is not responding');
          return false;
        }
      } catch (healthError) {
        console.error('❌ Email server is not available:', healthError);
        return false;
      }

      const response = await fetch(`${this.backendUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: template.to,
          subject: template.subject,
          html: template.html,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Email sending failed:', error);
        return false;
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const recipients = [data.primaryEmail];
    if (data.secondaryEmail && data.secondaryEmail !== data.primaryEmail) {
      recipients.push(data.secondaryEmail);
    }

    const template: EmailTemplate = {
      to: recipients,
      subject: `Welcome to Servigence - ${data.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Servigence!</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Dear ${data.companyName} Team,</h2>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for registering with Servigence! We're excited to have you as part of our growing community.
            </p>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Your company has been successfully registered in our system. Our team will be in touch with you shortly to discuss your requirements and how we can best serve you.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Our team will review your registration</li>
                <li>You'll receive a follow-up call within 24 hours</li>
                <li>We'll schedule a consultation to understand your needs</li>
                <li>Get started with our comprehensive services</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              If you have any immediate questions or concerns, please don't hesitate to contact our support team.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Support Contact:</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 support@servigence.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971-4-XXX-XXXX</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Best regards,<br>
              <strong>The Servigence Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message from Servigence CRM System.</p>
          </div>
        </div>
      `,
    };

    return await this.sendEmail(template);
  }

  async sendIndividualWelcomeEmail(data: IndividualWelcomeEmailData): Promise<boolean> {
    const recipients = [data.primaryEmail];
    if (data.secondaryEmail && data.secondaryEmail !== data.primaryEmail) {
      recipients.push(data.secondaryEmail);
    }

    const template: EmailTemplate = {
      to: recipients,
      subject: `Welcome to Servigence - ${data.individualName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Servigence!</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Dear ${data.individualName},</h2>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Thank you for registering with Servigence! We're excited to have you as part of our growing community.
            </p>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Your profile has been successfully registered in our system. Our team will be in touch with you shortly to discuss your requirements and how we can best serve you.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Our team will review your registration</li>
                <li>You'll receive a follow-up call within 24 hours</li>
                <li>We'll schedule a consultation to understand your needs</li>
                <li>Get started with our comprehensive services</li>
              </ul>
            </div>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              If you have any immediate questions or concerns, please don't hesitate to contact our support team.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Support Contact:</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 support@servigence.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971-4-XXX-XXXX</p>
            </div>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Best regards,<br>
              <strong>The Servigence Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message from Servigence CRM System.</p>
          </div>
        </div>
      `,
    };

    return await this.sendEmail(template);
  }

  async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    const urgencyColor = data.daysUntilExpiry <= 5 ? '#dc3545' : data.daysUntilExpiry <= 10 ? '#ffc107' : '#28a745';
    const urgencyText = data.daysUntilExpiry <= 5 ? 'URGENT' : data.daysUntilExpiry <= 10 ? 'IMPORTANT' : 'REMINDER';

    const template: EmailTemplate = {
      to: data.recipientEmail,
      subject: `${urgencyText}: ${data.documentType} Expiring in ${data.daysUntilExpiry} days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${urgencyColor}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${urgencyText}: Document Expiry Notice</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Document Expiry Reminder</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0;">
                <strong>Document:</strong> ${data.documentType}<br>
                <strong>Expiry Date:</strong> ${data.expiryDate}<br>
                <strong>Days Until Expiry:</strong> ${data.daysUntilExpiry} days
                ${data.companyName ? `<br><strong>Company:</strong> ${data.companyName}` : ''}
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              This is an automated reminder that your ${data.documentType} will expire in ${data.daysUntilExpiry} days. 
              Please take the necessary action to renew this document before the expiry date.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Need Assistance?</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 support@servigence.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971-4-XXX-XXXX</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Best regards,<br>
              <strong>The Servigence Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated reminder from Servigence CRM System.</p>
          </div>
        </div>
      `,
    };

    return await this.sendEmail(template);
  }

  async sendDueReminderEmail(data: DueReminderEmailData): Promise<boolean> {
    const urgencyColor = data.daysUntilDue <= 3 ? '#dc3545' : data.daysUntilDue <= 7 ? '#ffc107' : '#28a745';
    const urgencyText = data.daysUntilDue <= 3 ? 'URGENT' : data.daysUntilDue <= 7 ? 'IMPORTANT' : 'REMINDER';

    const template: EmailTemplate = {
      to: data.recipientEmail,
      subject: `${urgencyText}: Payment Due in ${data.daysUntilDue} days - ${data.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${urgencyColor}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${urgencyText}: Payment Due Notice</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Payment Reminder - ${data.companyName}</h2>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0;">
                <strong>Service:</strong> ${data.serviceName}<br>
                <strong>Original Amount:</strong> AED ${data.originalAmount.toFixed(2)}<br>
                <strong>Due Amount:</strong> AED ${data.dueAmount.toFixed(2)}<br>
                <strong>Due Date:</strong> ${data.dueDate}<br>
                <strong>Days Until Due:</strong> ${data.daysUntilDue} days
              </p>
            </div>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              This is an automated reminder that your payment of <strong>AED ${data.dueAmount.toFixed(2)}</strong> for ${data.serviceName} is due in ${data.daysUntilDue} days.
              Please arrange for payment before the due date to avoid any inconvenience.
            </p>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #1976d2; margin: 0; font-weight: bold;">
                💡 This amount represents the portion we covered when your service billing exceeded your credit limit.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Payment Assistance:</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 accounts@servigence.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971-4-XXX-XXXX</p>
            </div>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Best regards,<br>
              <strong>The Servigence Accounts Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated payment reminder from Servigence CRM System.</p>
          </div>
        </div>
      `,
    };

    return await this.sendEmail(template);
  }
}

export const emailService = new EmailService();
