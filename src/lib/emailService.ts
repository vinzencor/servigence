// Email service using Supabase Edge Function with Resend
import { dbHelpers } from './supabase';

interface EmailTemplate {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
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
  serviceName?: string;
  serviceCategory?: string;
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

interface GeneralReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  reminderTitle: string;
  reminderDescription?: string;
  reminderType: string;
  dueDate: string;
  priority: string;
  companyName?: string;
  serviceName?: string;
  serviceCategory?: string;
  daysUntilDue: number;
}

class EmailService {
  private async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      console.log('🔄 Sending email via Supabase Edge Function:', {
        to: template.to,
        subject: template.subject
      });

      // Get environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Call the Supabase Edge Function directly with fetch
      const response = await fetch(`${supabaseUrl}/functions/v1/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: template.to,
          subject: template.subject,
          html: template.html,
          from: template.from || 'Servigence CRM <info@servigens.com>'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        return false;
      }

      const data = await response.json();

      if (!data?.success) {
        console.error('❌ Email sending failed:', data?.error);
        return false;
      }

      console.log('✅ Email sent successfully via Supabase Edge Function:', data);
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
      subject: `Welcome to Servigens Business Group - ${data.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Welcome to <span style="font-weight: 900;">Servigens Business Group</span></h1>
          </div>

          <div style="background: white; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">Dear ${data.companyName} Team,</h2>

            <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 20px 0;">
              We're thrilled to have you onboard! At Servigens, we don't just provide services — we create solutions that empower your business, amplify your brand, and elevate your lifestyle.
            </p>

            <p style="color: #2563eb; line-height: 1.8; font-size: 18px; font-weight: bold; margin: 25px 0; text-align: center;">
              🌟 Breaking Barriers to Global Opportunities
            </p>

            <h3 style="color: #333; font-size: 18px; margin: 25px 0 15px 0;">Our Expertise:</h3>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                🏢 <strong>Servigens Business Setup & Corporate Services</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Seamless company formation, PRO support, and government documentation.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971544887748" style="color: #2563eb; text-decoration: none;">+971 54 4887748</a> |
                ✉ <a href="mailto:info@servigens.com" style="color: #2563eb; text-decoration: none;">info@servigens.com</a>
              </p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                💡 <strong>Servigens Advertising & Digital Marketing</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Creative campaigns, social media strategies, and data-driven marketing to make your brand stand out.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971564881001" style="color: #2563eb; text-decoration: none;">+971 56 4881001</a> |
                ✉ <a href="mailto:digital@servigens.com" style="color: #2563eb; text-decoration: none;">digital@servigens.com</a>
              </p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                🌍 <strong>Servigens International Holidays</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Curated travel experiences, adventure tours, and luxury escapes for unforgettable journeys.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971504886065" style="color: #2563eb; text-decoration: none;">+971 50 4886065</a> |
                ✉ <a href="mailto:bookings@servigens.com" style="color: #2563eb; text-decoration: none;">bookings@servigens.com</a>
              </p>
            </div>

            <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 25px 0; font-style: italic; text-align: center;">
              At Servigens, we make success simple, growth effortless, and experiences unforgettable.
            </p>

            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #eff6ff; border-radius: 8px;">
              <p style="color: #555; margin: 0 0 10px 0; font-size: 15px;">
                🌐 Visit us: <a href="https://www.servigens.com" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: bold;">www.servigens.com</a>
              </p>
            </div>

            <p style="color: #2563eb; line-height: 1.8; font-size: 17px; font-weight: bold; margin: 25px 0; text-align: center;">
              Welcome aboard! Your journey to limitless opportunities starts here with Servigens.
            </p>

            <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              <strong>The Servigens Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from Servigens CRM System.</p>
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
      subject: `Welcome to Servigens Business Group - ${data.individualName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Welcome to <span style="font-weight: 900;">Servigens Business Group</span></h1>
          </div>

          <div style="background: white; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">Dear ${data.individualName},</h2>

            <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 20px 0;">
              We're thrilled to have you onboard! At Servigens, we don't just provide services — we create solutions that empower your business, amplify your brand, and elevate your lifestyle.
            </p>

            <p style="color: #2563eb; line-height: 1.8; font-size: 18px; font-weight: bold; margin: 25px 0; text-align: center;">
              🌟 Breaking Barriers to Global Opportunities
            </p>

            <h3 style="color: #333; font-size: 18px; margin: 25px 0 15px 0;">Our Expertise:</h3>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                🏢 <strong>Servigens Business Setup & Corporate Services</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Seamless company formation, PRO support, and government documentation.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971544887748" style="color: #2563eb; text-decoration: none;">+971 54 4887748</a> |
                ✉ <a href="mailto:info@servigens.com" style="color: #2563eb; text-decoration: none;">info@servigens.com</a>
              </p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                💡 <strong>Servigens Advertising & Digital Marketing</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Creative campaigns, social media strategies, and data-driven marketing to make your brand stand out.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971564881001" style="color: #2563eb; text-decoration: none;">+971 56 4881001</a> |
                ✉ <a href="mailto:digital@servigens.com" style="color: #2563eb; text-decoration: none;">digital@servigens.com</a>
              </p>
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
              <p style="color: #333; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">
                🌍 <strong>Servigens International Holidays</strong>
              </p>
              <p style="color: #555; line-height: 1.6; font-size: 15px; margin: 0 0 10px 0;">
                Curated travel experiences, adventure tours, and luxury escapes for unforgettable journeys.
              </p>
              <p style="color: #2563eb; font-size: 14px; margin: 0;">
                📞 <a href="tel:+971504886065" style="color: #2563eb; text-decoration: none;">+971 50 4886065</a> |
                ✉ <a href="mailto:bookings@servigens.com" style="color: #2563eb; text-decoration: none;">bookings@servigens.com</a>
              </p>
            </div>

            <p style="color: #555; line-height: 1.8; font-size: 16px; margin: 25px 0; font-style: italic; text-align: center;">
              At Servigens, we make success simple, growth effortless, and experiences unforgettable.
            </p>

            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #eff6ff; border-radius: 8px;">
              <p style="color: #555; margin: 0 0 10px 0; font-size: 15px;">
                🌐 Visit us: <a href="https://www.servigens.com" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: bold;">www.servigens.com</a>
              </p>
            </div>

            <p style="color: #2563eb; line-height: 1.8; font-size: 17px; font-weight: bold; margin: 25px 0; text-align: center;">
              Welcome aboard! Your journey to limitless opportunities starts here with Servigens.
            </p>

            <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              <strong>The Servigens Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from Servigens CRM System.</p>
          </div>
        </div>
      `,
    };

    return await this.sendEmail(template);
  }

  async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    const urgencyColor = data.daysUntilExpiry <= 5 ? '#dc3545' : data.daysUntilExpiry <= 10 ? '#ffc107' : '#28a745';
    const urgencyText = data.daysUntilExpiry <= 5 ? 'URGENT' : data.daysUntilExpiry <= 10 ? 'IMPORTANT' : 'REMINDER';

    // Use service name as the primary identifier, fallback to document type if service name not available
    const serviceDisplayName = data.serviceName || data.documentType || 'Service Document';

    const template: EmailTemplate = {
      to: data.recipientEmail,
      subject: `${urgencyText}: ${serviceDisplayName} Document Expiring in ${data.daysUntilExpiry} days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${urgencyColor}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${urgencyText}: Service Document Expiry Notice</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Service Document Expiry Reminder</h2>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0;">
                <strong>Service:</strong> ${serviceDisplayName}${data.serviceCategory ? ` (${data.serviceCategory})` : ''}<br>
                <strong>Expiry Date:</strong> ${data.expiryDate}<br>
                <strong>Days Until Expiry:</strong> ${data.daysUntilExpiry} days
                ${data.companyName ? `<br><strong>Company:</strong> ${data.companyName}` : ''}
              </p>
            </div>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              This is an automated reminder that your ${serviceDisplayName} document will expire in ${data.daysUntilExpiry} days.
              Please take the necessary action to renew this document before the expiry date.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Need Assistance?</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 info@servigens.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971544887748</p>
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
              <p style="color: #667eea; margin: 5px 0;">📞 +971544887748</p>
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

  // Send general reminder email
  async sendGeneralReminderEmail(data: GeneralReminderEmailData): Promise<boolean> {
    const priorityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };

    const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || '#6b7280';

    const template: EmailTemplate = {
      to: data.recipientEmail,
      subject: `⚠️ Reminder: ${data.reminderTitle} - Due ${data.daysUntilDue === 0 ? 'Today' : `in ${data.daysUntilDue} day${data.daysUntilDue === 1 ? '' : 's'}`}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${priorityColor}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📅 Reminder Alert</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Dear ${data.recipientName},</h2>

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              This is a reminder about an important deadline that requires your attention.
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColor};">
              <h3 style="color: #333; margin-top: 0;">Reminder Details:</h3>
              <p style="color: #666; line-height: 1.6; font-size: 16px; margin: 0;">
                <strong>Title:</strong> ${data.reminderTitle}<br>
                ${data.reminderDescription ? `<strong>Description:</strong> ${data.reminderDescription}<br>` : ''}
                <strong>Type:</strong> ${data.reminderType.replace('_', ' ').toUpperCase()}<br>
                <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}<br>
                <strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${data.priority.toUpperCase()}</span><br>
                ${data.companyName ? `<strong>Company:</strong> ${data.companyName}<br>` : ''}
                ${data.serviceName ? `<strong>Related Service:</strong> ${data.serviceName}${data.serviceCategory ? ` (${data.serviceCategory})` : ''}<br>` : ''}
                <strong>Days Until Due:</strong> ${data.daysUntilDue === 0 ? 'DUE TODAY' : `${data.daysUntilDue} day${data.daysUntilDue === 1 ? '' : 's'}`}
              </p>
            </div>

            ${data.daysUntilDue <= 1 ? `
              <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #dc2626; font-weight: bold; margin: 0;">
                  ⚠️ URGENT: This reminder is due ${data.daysUntilDue === 0 ? 'today' : 'tomorrow'}. Please take immediate action.
                </p>
              </div>
            ` : ''}

            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Please ensure you complete the necessary actions before the due date to avoid any complications.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666; margin: 5px 0;"><strong>Need Assistance?</strong></p>
              <p style="color: #667eea; margin: 5px 0;">📧 info@servigens.com</p>
              <p style="color: #667eea; margin: 5px 0;">📞 +971544887748</p>
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
