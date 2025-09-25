// Email service using Brevo (formerly SendinBlue)
interface EmailTemplate {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface WelcomeEmailData {
  companyName: string;
  contactEmail: string;
}

interface ReminderEmailData {
  recipientName: string;
  documentType: string;
  expiryDate: string;
  companyName?: string;
  daysUntilExpiry: number;
}

class EmailService {
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;
  private baseUrl = 'https://api.brevo.com/v3';

  constructor() {
    this.apiKey = import.meta.env.VITE_BREVO_API_KEY || '';
    this.senderEmail = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'noreply@servigence.com';
    this.senderName = import.meta.env.VITE_BREVO_SENDER_NAME || 'Servigence CRM';
  }

  private async sendEmail(template: EmailTemplate): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('Brevo API key not configured. Email not sent.');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: template.to,
            },
          ],
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Email sending failed:', error);
        return false;
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const template: EmailTemplate = {
      to: data.contactEmail,
      subject: `Welcome to Servigence - ${data.companyName}`,
      htmlContent: `
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
      textContent: `
        Welcome to Servigence!
        
        Dear ${data.companyName} Team,
        
        Thank you for registering with Servigence! We're excited to have you as part of our growing community.
        
        Your company has been successfully registered in our system. Our team will be in touch with you shortly to discuss your requirements and how we can best serve you.
        
        What's Next?
        - Our team will review your registration
        - You'll receive a follow-up call within 24 hours
        - We'll schedule a consultation to understand your needs
        - Get started with our comprehensive services
        
        If you have any immediate questions or concerns, please contact our support team:
        Email: support@servigence.com
        Phone: +971-4-XXX-XXXX
        
        Best regards,
        The Servigence Team
      `,
    };

    return await this.sendEmail(template);
  }

  async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    const urgencyColor = data.daysUntilExpiry <= 5 ? '#dc3545' : data.daysUntilExpiry <= 10 ? '#ffc107' : '#28a745';
    const urgencyText = data.daysUntilExpiry <= 5 ? 'URGENT' : data.daysUntilExpiry <= 10 ? 'IMPORTANT' : 'REMINDER';

    const template: EmailTemplate = {
      to: data.recipientName,
      subject: `${urgencyText}: ${data.documentType} Expiring in ${data.daysUntilExpiry} days`,
      htmlContent: `
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
}

export const emailService = new EmailService();
