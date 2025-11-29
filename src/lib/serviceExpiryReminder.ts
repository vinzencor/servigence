// Service Expiry Reminder Background Job
// This module handles checking for expiring services and sending reminder emails

import { supabase } from './supabase';
import { emailService } from './emailService';

interface ReminderSettings {
  enabled: boolean;
  reminderIntervals: number[];
}

interface ServiceBillingWithDetails {
  id: string;
  service_date: string;
  expiry_date: string;
  invoice_number: string;
  total_amount_with_vat: number;
  company_id?: string;
  individual_id?: string;
  service_type?: {
    name: string;
  };
  company?: {
    company_name: string;
    email1: string;
    email2?: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
    email2?: string;
  };
}

export class ServiceExpiryReminderService {
  /**
   * Load reminder settings from database
   */
  private async loadSettings(): Promise<ReminderSettings> {
    try {
      const { data, error } = await supabase
        .from('email_reminder_settings')
        .select('enabled, reminder_intervals')
        .eq('reminder_type', 'service_expiry')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        enabled: data?.enabled ?? true,
        reminderIntervals: data?.reminder_intervals ?? [30, 15, 7, 3, 1]
      };
    } catch (error) {
      console.error('Error loading reminder settings:', error);
      return {
        enabled: true,
        reminderIntervals: [30, 15, 7, 3, 1]
      };
    }
  }

  /**
   * Check if a reminder has already been sent for this service and interval
   */
  private async hasReminderBeenSent(
    serviceBillingId: string,
    daysBeforeExpiry: number
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('email_reminder_logs')
        .select('id')
        .eq('service_billing_id', serviceBillingId)
        .eq('days_before_expiry', daysBeforeExpiry)
        .gte('email_sent_at', `${today}T00:00:00`)
        .lte('email_sent_at', `${today}T23:59:59`)
        .limit(1);

      if (error) throw error;

      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error('Error checking reminder log:', error);
      return false; // If error, assume not sent to avoid missing reminders
    }
  }

  /**
   * Log a sent reminder email
   */
  private async logReminderEmail(
    serviceBilling: ServiceBillingWithDetails,
    recipientEmail: string,
    daysBeforeExpiry: number,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const clientName = serviceBilling.company?.company_name || serviceBilling.individual?.individual_name || 'Unknown';
      
      await supabase.from('email_reminder_logs').insert([{
        service_billing_id: serviceBilling.id,
        recipient_email: recipientEmail,
        recipient_name: clientName,
        recipient_type: serviceBilling.company_id ? 'company' : 'individual',
        company_id: serviceBilling.company_id,
        individual_id: serviceBilling.individual_id,
        reminder_type: 'service_expiry',
        days_before_expiry: daysBeforeExpiry,
        expiry_date: serviceBilling.expiry_date,
        email_subject: `Service Expiry Reminder - ${serviceBilling.service_type?.name}`,
        email_status: status,
        error_message: errorMessage,
        service_name: serviceBilling.service_type?.name,
        invoice_number: serviceBilling.invoice_number,
        total_amount: serviceBilling.total_amount_with_vat
      }]);
    } catch (error) {
      console.error('Error logging reminder email:', error);
    }
  }

  /**
   * Send reminder email for a service billing
   */
  private async sendReminderEmail(
    serviceBilling: ServiceBillingWithDetails,
    daysUntilExpiry: number
  ): Promise<boolean> {
    try {
      // Determine recipient email
      const recipientEmail = serviceBilling.company?.email1 || serviceBilling.individual?.email1;

      if (!recipientEmail) {
        console.error(`❌ No email found for service billing ${serviceBilling.id}`);
        console.error(`  - Company ID: ${serviceBilling.company_id}`);
        console.error(`  - Individual ID: ${serviceBilling.individual_id}`);
        console.error(`  - Company data available: ${!!serviceBilling.company}`);
        console.error(`  - Individual data available: ${!!serviceBilling.individual}`);

        await this.logReminderEmail(
          serviceBilling,
          'no-email@example.com',
          daysUntilExpiry,
          'failed',
          `No email address found. Company: ${serviceBilling.company_id ? 'ID exists but no data' : 'null'}, Individual: ${serviceBilling.individual_id ? 'ID exists but no data' : 'null'}`
        );
        return false;
      }

      // Determine client name and service name
      const clientName = serviceBilling.company?.company_name || serviceBilling.individual?.individual_name || 'Valued Client';
      const serviceName = serviceBilling.service_type?.name || 'Service';

      console.log(`\n📧 Preparing email:`);
      console.log(`  - To: ${recipientEmail}`);
      console.log(`  - Client: ${clientName}`);
      console.log(`  - Service: ${serviceName}`);
      console.log(`  - Days until expiry: ${daysUntilExpiry}`);

      // Send email using email service
      const emailSent = await emailService.sendServiceExpiryReminderEmail({
        recipientEmail,
        recipientName: clientName,
        serviceName: serviceBilling.service_type?.name || 'Service',
        invoiceNumber: serviceBilling.invoice_number || 'N/A',
        expiryDate: serviceBilling.expiry_date,
        daysUntilExpiry,
        totalAmount: serviceBilling.total_amount_with_vat || 0,
        serviceDate: serviceBilling.service_date,
        companyName: serviceBilling.company?.company_name,
        individualName: serviceBilling.individual?.individual_name
      });

      if (emailSent) {
        console.log(`✅ Email sent successfully to ${recipientEmail}`);
        console.log(`   Subject: Service Expiry Reminder - ${serviceName} (${daysUntilExpiry} days)`);
      } else {
        console.error(`❌ Failed to send email to ${recipientEmail}`);
      }

      // Log the result
      await this.logReminderEmail(
        serviceBilling,
        recipientEmail,
        daysUntilExpiry,
        emailSent ? 'sent' : 'failed',
        emailSent ? undefined : 'Email service returned false'
      );

      return emailSent;
    } catch (error: any) {
      console.error('Error sending reminder email:', error);
      await this.logReminderEmail(
        serviceBilling,
        serviceBilling.company?.email1 || serviceBilling.individual?.email1 || 'error@example.com',
        daysUntilExpiry,
        'failed',
        error.message
      );
      return false;
    }
  }

  /**
   * Main function to check for expiring services and send reminders
   */
  async checkAndSendReminders(): Promise<{
    success: boolean;
    totalChecked: number;
    remindersSent: number;
    errors: number;
    message: string;
  }> {
    try {
      console.log('Starting service expiry reminder check...');

      // Load settings
      const settings = await this.loadSettings();

      if (!settings.enabled) {
        console.log('Service expiry reminders are disabled');
        return {
          success: true,
          totalChecked: 0,
          remindersSent: 0,
          errors: 0,
          message: 'Service expiry reminders are disabled'
        };
      }

      console.log('Reminder intervals:', settings.reminderIntervals);

      let totalChecked = 0;
      let remindersSent = 0;
      let errors = 0;

      // For each reminder interval, check for services expiring
      for (const interval of settings.reminderIntervals) {
        // Calculate target expiry date (today + interval days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + interval);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        console.log(`Checking for services expiring on ${targetDateStr} (${interval} days from now)...`);

        // Query service billings expiring on target date
        const { data: serviceBillings, error } = await supabase
          .from('service_billings')
          .select(`
            id,
            service_date,
            expiry_date,
            invoice_number,
            total_amount_with_vat,
            company_id,
            individual_id,
            service_types!service_type_id (
              name
            ),
            companies!company_id (
              company_name,
              email1,
              email2
            ),
            individuals!individual_id (
              individual_name,
              email1,
              email2
            )
          `)
          .eq('expiry_date', targetDateStr)
          .not('expiry_date', 'is', null);

        if (error) {
          console.error('Error querying service billings:', error);
          errors++;
          continue;
        }

        if (!serviceBillings || serviceBillings.length === 0) {
          console.log(`No services expiring on ${targetDateStr}`);
          continue;
        }

        console.log(`Found ${serviceBillings.length} service(s) expiring on ${targetDateStr}`);

        // Debug: Log the raw data structure
        console.log('📊 Raw service billing data:', JSON.stringify(serviceBillings, null, 2));

        totalChecked += serviceBillings.length;

        // Send reminder for each service
        for (const billing of serviceBillings) {
          // Normalize the data structure - Supabase returns related data with plural names
          // and we need to handle both array and object formats
          const rawBilling = billing as any;

          // Extract service_type (could be service_types or service_type)
          let serviceType = rawBilling.service_type || rawBilling.service_types;
          if (Array.isArray(serviceType)) {
            serviceType = serviceType[0];
          }

          // Extract company (could be companies or company)
          let company = rawBilling.company || rawBilling.companies;
          if (Array.isArray(company)) {
            company = company[0];
          }

          // Extract individual (could be individuals or individual)
          let individual = rawBilling.individual || rawBilling.individuals;
          if (Array.isArray(individual)) {
            individual = individual[0];
          }

          const normalizedBilling: ServiceBillingWithDetails = {
            ...billing,
            service_type: serviceType,
            company: company,
            individual: individual
          };

          // Extract display values
          const companyName = normalizedBilling.company?.company_name || null;
          const individualName = normalizedBilling.individual?.individual_name || null;
          const clientName = companyName || individualName || 'N/A';
          const serviceName = normalizedBilling.service_type?.name || 'N/A';
          const email = normalizedBilling.company?.email1 || normalizedBilling.individual?.email1 || 'NO EMAIL FOUND';

          // Debug logging with actual values
          console.log(`\n🔍 Processing service billing ${normalizedBilling.id}:`);
          console.log(`  - Client Type: ${normalizedBilling.company_id ? 'Company' : 'Individual'}`);
          console.log(`  - Client Name: ${clientName}`);
          console.log(`  - Service Type: ${serviceName}`);
          console.log(`  - Email: ${email}`);
          console.log(`  - Invoice: ${normalizedBilling.invoice_number}`);
          console.log(`  - Expiry Date: ${normalizedBilling.expiry_date}`);

          // Check if reminder already sent today for this interval
          const alreadySent = await this.hasReminderBeenSent(normalizedBilling.id, interval);

          if (alreadySent) {
            console.log(`✅ Reminder already sent today for service ${normalizedBilling.id} (${interval} days before)`);
            continue;
          }

          // Send reminder email
          console.log(`📤 Sending reminder email to ${email}...`);
          const sent = await this.sendReminderEmail(normalizedBilling, interval);

          if (sent) {
            remindersSent++;
          } else {
            errors++;
          }

          // Small delay to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const message = `Checked ${totalChecked} service(s), sent ${remindersSent} reminder(s), ${errors} error(s)`;
      console.log('Service expiry reminder check completed:', message);

      return {
        success: true,
        totalChecked,
        remindersSent,
        errors,
        message
      };
    } catch (error: any) {
      console.error('Error in checkAndSendReminders:', error);
      return {
        success: false,
        totalChecked: 0,
        remindersSent: 0,
        errors: 1,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Get reminder logs for a specific date range
   */
  async getReminderLogs(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('email_reminder_logs')
        .select('*')
        .eq('reminder_type', 'service_expiry')
        .order('email_sent_at', { ascending: false });

      if (startDate) {
        query = query.gte('email_sent_at', startDate);
      }

      if (endDate) {
        query = query.lte('email_sent_at', endDate);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching reminder logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const serviceExpiryReminderService = new ServiceExpiryReminderService();

