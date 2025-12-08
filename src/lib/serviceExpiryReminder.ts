// Service & Document Expiry Reminder Background Job
// This module handles checking for expiring services and documents, and sending reminder emails

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
    phone1?: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
    email2?: string;
    phone1?: string;
  };
}

interface DocumentWithDetails {
  id: string;
  title: string;
  document_type?: string;
  expiry_date: string;
  document_number?: string;
  company_id?: string;
  individual_id?: string;
  employee_id?: string;
  service_id?: string;
  company?: {
    company_name: string;
    email1: string;
    email2?: string;
    phone1?: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
    email2?: string;
    phone1?: string;
  };
  employee?: {
    name: string;
    email: string;
    phone?: string;
    company_id?: string;
    company?: {
      company_name: string;
      email1: string;
      email2?: string;
      phone1?: string;
    };
  };
  service_type?: {
    name: string;
  };
}

export class ServiceExpiryReminderService {
  /**
   * Load service reminder settings from database
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
      console.error('Error loading service reminder settings:', error);
      return {
        enabled: true,
        reminderIntervals: [30, 15, 7, 3, 1]
      };
    }
  }

  /**
   * Load document reminder settings from database
   */
  private async loadDocumentSettings(): Promise<ReminderSettings> {
    try {
      const { data, error } = await supabase
        .from('email_reminder_settings')
        .select('enabled, reminder_intervals')
        .eq('reminder_type', 'document_expiry')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        enabled: data?.enabled ?? true,
        reminderIntervals: data?.reminder_intervals ?? [30, 15, 7, 3, 1]
      };
    } catch (error) {
      console.error('Error loading document reminder settings:', error);
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
   * Check if a reminder has already been sent for this document and interval
   */
  private async hasDocumentReminderBeenSent(
    documentId: string,
    daysBeforeExpiry: number,
    documentType: 'company' | 'individual' | 'employee'
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const columnName = documentType === 'company'
        ? 'company_document_id'
        : documentType === 'individual'
        ? 'individual_document_id'
        : 'employee_document_id';

      const { data, error } = await supabase
        .from('email_reminder_logs')
        .select('id')
        .eq(columnName, documentId)
        .eq('days_before_expiry', daysBeforeExpiry)
        .gte('email_sent_at', `${today}T00:00:00`)
        .lte('email_sent_at', `${today}T23:59:59`)
        .limit(1);

      if (error) throw error;

      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error('Error checking document reminder log:', error);
      return false; // If error, assume not sent to avoid missing reminders
    }
  }

  /**
   * Log a sent service reminder email
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
   * Log a sent document reminder email
   */
  private async logDocumentReminderEmail(
    document: DocumentWithDetails,
    recipientEmail: string,
    daysBeforeExpiry: number,
    status: 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const clientName = document.company?.company_name
        || document.individual?.individual_name
        || document.employee?.name
        || 'Unknown';

      const recipientType = document.company_id
        ? 'company'
        : document.individual_id
        ? 'individual'
        : 'employee';

      await supabase.from('email_reminder_logs').insert([{
        company_document_id: document.company_id ? document.id : null,
        individual_document_id: document.individual_id ? document.id : null,
        employee_document_id: document.employee_id ? document.id : null,
        recipient_email: recipientEmail,
        recipient_name: clientName,
        recipient_type: recipientType,
        company_id: document.company_id || document.employee?.company_id,
        individual_id: document.individual_id,
        employee_id: document.employee_id,
        reminder_type: 'document_expiry',
        days_before_expiry: daysBeforeExpiry,
        expiry_date: document.expiry_date,
        email_subject: `Document Expiry Reminder - ${document.title}`,
        email_status: status,
        error_message: errorMessage,
        document_title: document.title,
        service_name: document.service_type?.name
      }]);
    } catch (error) {
      console.error('Error logging document reminder email:', error);
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
   * Send reminder email for a document expiry
   */
  private async sendDocumentReminderEmail(
    document: DocumentWithDetails,
    daysUntilExpiry: number
  ): Promise<boolean> {
    try {
      // Determine recipient email - for employee documents, try employee email first, then company email
      let recipientEmail = document.company?.email1 || document.individual?.email1;

      if (document.employee_id) {
        recipientEmail = document.employee?.email || document.employee?.company?.email1;
      }

      if (!recipientEmail) {
        console.error(`❌ No email found for document ${document.id}`);
        console.error(`  - Company ID: ${document.company_id}`);
        console.error(`  - Individual ID: ${document.individual_id}`);
        console.error(`  - Employee ID: ${document.employee_id}`);
        console.error(`  - Company data available: ${!!document.company}`);
        console.error(`  - Individual data available: ${!!document.individual}`);
        console.error(`  - Employee data available: ${!!document.employee}`);

        await this.logDocumentReminderEmail(
          document,
          'no-email@example.com',
          daysUntilExpiry,
          'failed',
          `No email address found. Company: ${document.company_id ? 'ID exists but no data' : 'null'}, Individual: ${document.individual_id ? 'ID exists but no data' : 'null'}, Employee: ${document.employee_id ? 'ID exists but no data' : 'null'}`
        );
        return false;
      }

      // Determine client name and document title
      const clientName = document.company?.company_name
        || document.individual?.individual_name
        || document.employee?.name
        || 'Valued Client';
      const documentTitle = document.title || 'Document';

      console.log(`\n📧 Preparing document expiry email:`);
      console.log(`  - To: ${recipientEmail}`);
      console.log(`  - Client: ${clientName}`);
      console.log(`  - Document: ${documentTitle}`);
      console.log(`  - Document Type: ${document.document_type || 'N/A'}`);
      console.log(`  - Days until expiry: ${daysUntilExpiry}`);

      // Send email using email service
      const emailSent = await emailService.sendDocumentExpiryReminderEmail({
        recipientEmail,
        recipientName: clientName,
        documentTitle: document.title,
        documentType: document.document_type,
        documentNumber: document.document_number,
        expiryDate: document.expiry_date,
        daysUntilExpiry,
        companyName: document.company?.company_name || document.employee?.company?.company_name,
        individualName: document.individual?.individual_name,
        employeeName: document.employee?.name,
        serviceName: document.service_type?.name
      });

      if (emailSent) {
        console.log(`✅ Document expiry email sent successfully to ${recipientEmail}`);
        console.log(`   Subject: Document Expiry Reminder - ${documentTitle} (${daysUntilExpiry} days)`);
      } else {
        console.error(`❌ Failed to send document expiry email to ${recipientEmail}`);
      }

      // Log the result
      await this.logDocumentReminderEmail(
        document,
        recipientEmail,
        daysUntilExpiry,
        emailSent ? 'sent' : 'failed',
        emailSent ? undefined : 'Email service returned false'
      );

      return emailSent;
    } catch (error: any) {
      console.error('Error sending document reminder email:', error);
      await this.logDocumentReminderEmail(
        document,
        document.company?.email1 || document.individual?.email1 || document.employee?.email || 'error@example.com',
        daysUntilExpiry,
        'failed',
        error.message
      );
      return false;
    }
  }

  /**
   * Main function to check for expiring services and documents, and send reminders
   */
  async checkAndSendReminders(): Promise<{
    success: boolean;
    totalChecked: number;
    remindersSent: number;
    errors: number;
    message: string;
  }> {
    try {
      console.log('🔔 Starting service & document expiry reminder check...');

      // Load settings for both services and documents
      const serviceSettings = await this.loadSettings();
      const documentSettings = await this.loadDocumentSettings();

      let totalChecked = 0;
      let remindersSent = 0;
      let errors = 0;

      // ========================================
      // PART 1: Check Service Expiries
      // ========================================
      if (serviceSettings.enabled) {
        console.log('\n📋 Checking SERVICE expiries...');
        console.log('Service reminder intervals:', serviceSettings.reminderIntervals);

        const serviceResults = await this.checkServiceExpiries(serviceSettings.reminderIntervals);
        totalChecked += serviceResults.checked;
        remindersSent += serviceResults.sent;
        errors += serviceResults.errors;
      } else {
        console.log('⏭️  Service expiry reminders are disabled');
      }

      // ========================================
      // PART 2: Check Document Expiries
      // ========================================
      if (documentSettings.enabled) {
        console.log('\n📄 Checking DOCUMENT expiries...');
        console.log('Document reminder intervals:', documentSettings.reminderIntervals);

        const documentResults = await this.checkDocumentExpiries(documentSettings.reminderIntervals);
        totalChecked += documentResults.checked;
        remindersSent += documentResults.sent;
        errors += documentResults.errors;
      } else {
        console.log('⏭️  Document expiry reminders are disabled');
      }

      const message = `Checked ${totalChecked} item(s), sent ${remindersSent} reminder(s), ${errors} error(s)`;
      console.log('\n✅ Expiry reminder check completed:', message);

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
   * Check for expiring services and send reminders
   * Now supports both global intervals and per-item custom intervals
   */
  private async checkServiceExpiries(globalIntervals: number[]): Promise<{
    checked: number;
    sent: number;
    errors: number;
  }> {
    let totalChecked = 0;
    let remindersSent = 0;
    let errors = 0;

    // Get all services with expiry dates (we'll filter by interval later)
    console.log(`  📋 Fetching all services with expiry dates...`);

    const { data: serviceBillings, error } = await supabase
      .from('service_billings')
      .select(`
        id,
        service_date,
        expiry_date,
        custom_reminder_intervals,
        custom_reminder_dates,
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
          email2,
          phone1
        ),
        individuals!individual_id (
          individual_name,
          email1,
          email2,
          phone1
        )
      `)
      .not('expiry_date', 'is', null);

    if (error) {
      console.error('  ❌ Error querying service billings:', error);
      return { checked: 0, sent: 0, errors: 1 };
    }

    if (!serviceBillings || serviceBillings.length === 0) {
      console.log(`  ℹ️  No services with expiry dates found`);
      return { checked: 0, sent: 0, errors: 0 };
    }

    console.log(`  ✅ Found ${serviceBillings.length} service(s) with expiry dates`);

    // Process each service
    for (const billing of serviceBillings) {
      const rawBilling = billing as any;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      let shouldSendReminder = false;
      let reminderReason = '';

      // Check 1: Custom Reminder Dates (specific calendar dates)
      if (rawBilling.custom_reminder_dates) {
        const customDates = rawBilling.custom_reminder_dates
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);

        if (customDates.includes(todayStr)) {
          shouldSendReminder = true;
          reminderReason = `custom date: ${todayStr}`;
          console.log(`  📅 Custom reminder date match for service ${rawBilling.id}: ${todayStr}`);
        }
      }

      // Check 2: Interval-based reminders (days before expiry)
      if (!shouldSendReminder && rawBilling.expiry_date) {
        // Determine which intervals to use for this service
        let intervalsToCheck: number[] = globalIntervals;

        if (rawBilling.custom_reminder_intervals) {
          // Parse custom intervals (comma-separated string)
          const customIntervals = rawBilling.custom_reminder_intervals
            .split(',')
            .map((s: string) => parseInt(s.trim()))
            .filter((n: number) => !isNaN(n) && n > 0);

          if (customIntervals.length > 0) {
            intervalsToCheck = customIntervals;
            console.log(`  🔧 Using custom intervals for service ${rawBilling.id}: [${customIntervals.join(', ')}]`);
          }
        }

        // Calculate days until expiry
        const expiryDate = new Date(rawBilling.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check if daysUntilExpiry matches any of the intervals
        if (intervalsToCheck.includes(daysUntilExpiry)) {
          shouldSendReminder = true;
          reminderReason = `${daysUntilExpiry} days before expiry`;
        }
      }

      // Skip if no reminder needed
      if (!shouldSendReminder) {
        continue;
      }

      totalChecked++;

      // Normalize the data structure
      let serviceType = rawBilling.service_type || rawBilling.service_types;
      if (Array.isArray(serviceType)) {
        serviceType = serviceType[0];
      }

      let company = rawBilling.company || rawBilling.companies;
      if (Array.isArray(company)) {
        company = company[0];
      }

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

      // Calculate days until expiry for logging (if expiry date exists)
      let daysUntilExpiry = 0;
      if (rawBilling.expiry_date) {
        const expiryDate = new Date(rawBilling.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Debug logging
      console.log(`\n  🔍 Processing service billing ${normalizedBilling.id}:`);
      console.log(`    - Client Type: ${normalizedBilling.company_id ? 'Company' : 'Individual'}`);
      console.log(`    - Client Name: ${clientName}`);
      console.log(`    - Service Type: ${serviceName}`);
      console.log(`    - Email: ${email}`);
      console.log(`    - Invoice: ${normalizedBilling.invoice_number}`);
      console.log(`    - Expiry Date: ${normalizedBilling.expiry_date || 'N/A'}`);
      console.log(`    - Days Until Expiry: ${daysUntilExpiry}`);
      console.log(`    - Reminder Reason: ${reminderReason}`);

      // Check if reminder already sent today for this reason
      // For date-based reminders, use 0 as interval; for interval-based, use actual days
      const intervalForLog = reminderReason.startsWith('custom date') ? 0 : daysUntilExpiry;
      const alreadySent = await this.hasReminderBeenSent(normalizedBilling.id, intervalForLog);

      if (alreadySent) {
        console.log(`    ✅ Reminder already sent today (${reminderReason})`);
        continue;
      }

      // Send reminder email
      console.log(`    📤 Sending reminder email (${reminderReason})...`);
      const sent = await this.sendReminderEmail(normalizedBilling, daysUntilExpiry);

      if (sent) {
        remindersSent++;
      } else {
        errors++;
      }

      // Small delay to avoid overwhelming email service
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { checked: totalChecked, sent: remindersSent, errors };
  }

  /**
   * Check for expiring documents and send reminders
   * Now supports both global intervals and per-document custom intervals
   */
  private async checkDocumentExpiries(globalIntervals: number[]): Promise<{
    checked: number;
    sent: number;
    errors: number;
  }> {
    let totalChecked = 0;
    let remindersSent = 0;
    let errors = 0;

    console.log(`  📋 Fetching all documents with expiry dates...`);

    // Query company documents with expiry dates
    const { data: companyDocs, error: companyError } = await supabase
      .from('company_documents')
      .select(`
        id,
        title,
        document_type,
        document_number,
        expiry_date,
        custom_reminder_intervals,
        custom_reminder_dates,
        company_id,
        service_id,
        companies!company_id (
          company_name,
          email1,
          email2,
          phone1
        ),
        service_types!service_id (
          name
        )
      `)
      .not('expiry_date', 'is', null)
      .eq('status', 'active');

    if (companyError) {
      console.error('  ❌ Error querying company documents:', companyError);
      errors++;
    } else if (companyDocs && companyDocs.length > 0) {
      console.log(`  ✅ Found ${companyDocs.length} company document(s) with expiry dates`);

      // Process each company document
      for (const doc of companyDocs) {
        const rawDoc = doc as any;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        let shouldSendReminder = false;
        let reminderReason = '';

        // Check 1: Custom Reminder Dates (specific calendar dates)
        if (rawDoc.custom_reminder_dates) {
          const customDates = rawDoc.custom_reminder_dates
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          if (customDates.includes(todayStr)) {
            shouldSendReminder = true;
            reminderReason = `custom date: ${todayStr}`;
            console.log(`  📅 Custom reminder date match for document ${rawDoc.id}: ${todayStr}`);
          }
        }

        // Check 2: Interval-based reminders (days before expiry)
        if (!shouldSendReminder && rawDoc.expiry_date) {
          // Determine which intervals to use for this document
          let intervalsToCheck: number[] = globalIntervals;

          if (rawDoc.custom_reminder_intervals) {
            const customIntervals = rawDoc.custom_reminder_intervals
              .split(',')
              .map((s: string) => parseInt(s.trim()))
              .filter((n: number) => !isNaN(n) && n > 0);

            if (customIntervals.length > 0) {
              intervalsToCheck = customIntervals;
              console.log(`  🔧 Using custom intervals for document ${rawDoc.id}: [${customIntervals.join(', ')}]`);
            }
          }

          // Calculate days until expiry
          const expiryDate = new Date(rawDoc.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if daysUntilExpiry matches any of the intervals
          if (intervalsToCheck.includes(daysUntilExpiry)) {
            shouldSendReminder = true;
            reminderReason = `${daysUntilExpiry} days before expiry`;
          }
        }

        // Skip if no reminder needed
        if (!shouldSendReminder) {
          continue;
        }

        totalChecked++;

        // Normalize data structure
        let company = rawDoc.company || rawDoc.companies;
        if (Array.isArray(company)) {
          company = company[0];
        }

        let serviceType = rawDoc.service_type || rawDoc.service_types;
        if (Array.isArray(serviceType)) {
          serviceType = serviceType[0];
        }

        const normalizedDoc: DocumentWithDetails = {
          ...doc,
          company: company,
          service_type: serviceType
        };

        const clientName = normalizedDoc.company?.company_name || 'N/A';
        const email = normalizedDoc.company?.email1 || 'NO EMAIL FOUND';

        // Calculate days until expiry for logging (if expiry date exists)
        let daysUntilExpiry = 0;
        if (rawDoc.expiry_date) {
          const expiryDate = new Date(rawDoc.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        console.log(`\n  🔍 Processing company document ${normalizedDoc.id}:`);
        console.log(`    - Company: ${clientName}`);
        console.log(`    - Document: ${normalizedDoc.title}`);
        console.log(`    - Type: ${normalizedDoc.document_type || 'N/A'}`);
        console.log(`    - Email: ${email}`);
        console.log(`    - Expiry Date: ${normalizedDoc.expiry_date || 'N/A'}`);
        console.log(`    - Days Until Expiry: ${daysUntilExpiry}`);
        console.log(`    - Reminder Reason: ${reminderReason}`);

        // Check if reminder already sent today for this reason
        const intervalForLog = reminderReason.startsWith('custom date') ? 0 : daysUntilExpiry;
        const alreadySent = await this.hasDocumentReminderBeenSent(normalizedDoc.id, intervalForLog, 'company');

        if (alreadySent) {
          console.log(`    ✅ Reminder already sent today (${reminderReason})`);
          continue;
        }

        // Send reminder email
        console.log(`    📤 Sending document reminder email (${reminderReason})...`);
        const sent = await this.sendDocumentReminderEmail(normalizedDoc, daysUntilExpiry);

        if (sent) {
          remindersSent++;
        } else {
          errors++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Query individual documents with expiry dates
    const { data: individualDocs, error: individualError } = await supabase
      .from('individual_documents')
      .select(`
        id,
        title,
        document_type,
        document_number,
        expiry_date,
        custom_reminder_intervals,
        custom_reminder_dates,
        individual_id,
        individuals!individual_id (
          individual_name,
          email1,
          email2,
          phone1
        )
      `)
      .not('expiry_date', 'is', null)
      .eq('status', 'active');

    if (individualError) {
      console.error('  ❌ Error querying individual documents:', individualError);
      errors++;
    } else if (individualDocs && individualDocs.length > 0) {
      console.log(`  ✅ Found ${individualDocs.length} individual document(s) with expiry dates`);

      // Process each individual document
      for (const doc of individualDocs) {
        const rawDoc = doc as any;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        let shouldSendReminder = false;
        let reminderReason = '';

        // Check 1: Custom Reminder Dates (specific calendar dates)
        if (rawDoc.custom_reminder_dates) {
          const customDates = rawDoc.custom_reminder_dates
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          if (customDates.includes(todayStr)) {
            shouldSendReminder = true;
            reminderReason = `custom date: ${todayStr}`;
            console.log(`  📅 Custom reminder date match for document ${rawDoc.id}: ${todayStr}`);
          }
        }

        // Check 2: Interval-based reminders (days before expiry)
        if (!shouldSendReminder && rawDoc.expiry_date) {
          // Determine which intervals to use for this document
          let intervalsToCheck: number[] = globalIntervals;

          if (rawDoc.custom_reminder_intervals) {
            const customIntervals = rawDoc.custom_reminder_intervals
              .split(',')
              .map((s: string) => parseInt(s.trim()))
              .filter((n: number) => !isNaN(n) && n > 0);

            if (customIntervals.length > 0) {
              intervalsToCheck = customIntervals;
              console.log(`  🔧 Using custom intervals for document ${rawDoc.id}: [${customIntervals.join(', ')}]`);
            }
          }

          // Calculate days until expiry
          const expiryDate = new Date(rawDoc.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if daysUntilExpiry matches any of the intervals
          if (intervalsToCheck.includes(daysUntilExpiry)) {
            shouldSendReminder = true;
            reminderReason = `${daysUntilExpiry} days before expiry`;
          }
        }

        // Skip if no reminder needed
        if (!shouldSendReminder) {
          continue;
        }

        totalChecked++;

        // Normalize data structure
        let individual = rawDoc.individual || rawDoc.individuals;
        if (Array.isArray(individual)) {
          individual = individual[0];
        }

        const normalizedDoc: DocumentWithDetails = {
          ...doc,
          individual: individual
        };

        const clientName = normalizedDoc.individual?.individual_name || 'N/A';
        const email = normalizedDoc.individual?.email1 || 'NO EMAIL FOUND';

        // Calculate days until expiry for logging (if expiry date exists)
        let daysUntilExpiry = 0;
        if (rawDoc.expiry_date) {
          const expiryDate = new Date(rawDoc.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        console.log(`\n  🔍 Processing individual document ${normalizedDoc.id}:`);
        console.log(`    - Individual: ${clientName}`);
        console.log(`    - Document: ${normalizedDoc.title}`);
        console.log(`    - Type: ${normalizedDoc.document_type || 'N/A'}`);
        console.log(`    - Email: ${email}`);
        console.log(`    - Expiry Date: ${normalizedDoc.expiry_date || 'N/A'}`);
        console.log(`    - Days Until Expiry: ${daysUntilExpiry}`);
        console.log(`    - Reminder Reason: ${reminderReason}`);

        // Check if reminder already sent today for this reason
        const intervalForLog = reminderReason.startsWith('custom date') ? 0 : daysUntilExpiry;
        const alreadySent = await this.hasDocumentReminderBeenSent(normalizedDoc.id, intervalForLog, 'individual');

        if (alreadySent) {
          console.log(`    ✅ Reminder already sent today (${reminderReason})`);
          continue;
        }

        // Send reminder email
        console.log(`    📤 Sending document reminder email (${reminderReason})...`);
        const sent = await this.sendDocumentReminderEmail(normalizedDoc, daysUntilExpiry);

        if (sent) {
          remindersSent++;
        } else {
          errors++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // ========================================
    // PART 3: Query employee documents with expiry dates
    // ========================================
    const { data: employeeDocs, error: employeeError } = await supabase
      .from('employee_documents')
      .select(`
        id,
        name,
        type,
        file_name,
        expiry_date,
        custom_reminder_intervals,
        custom_reminder_dates,
        employee_id,
        service_id,
        status,
        employees!employee_id (
          name,
          email,
          phone,
          company_id,
          companies!company_id (
            company_name,
            email1,
            email2,
            phone1
          )
        ),
        service_types!service_id (
          name
        )
      `)
      .not('expiry_date', 'is', null)
      .eq('status', 'valid');

    if (employeeError) {
      console.error('  ❌ Error querying employee documents:', employeeError);
      errors++;
    } else if (employeeDocs && employeeDocs.length > 0) {
      console.log(`  ✅ Found ${employeeDocs.length} employee document(s) with expiry dates`);

      // Process each employee document
      for (const doc of employeeDocs) {
        const rawDoc = doc as any;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        let shouldSendReminder = false;
        let reminderReason = '';

        // Check 1: Custom Reminder Dates (specific calendar dates)
        if (rawDoc.custom_reminder_dates) {
          const customDates = rawDoc.custom_reminder_dates
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);

          if (customDates.includes(todayStr)) {
            shouldSendReminder = true;
            reminderReason = `custom date: ${todayStr}`;
            console.log(`  📅 Custom reminder date match for employee document ${rawDoc.id}: ${todayStr}`);
          }
        }

        // Check 2: Interval-based reminders (days before expiry)
        if (!shouldSendReminder && rawDoc.expiry_date) {
          // Determine which intervals to use for this document
          let intervalsToCheck: number[] = globalIntervals;

          if (rawDoc.custom_reminder_intervals) {
            // Parse custom intervals (comma-separated string)
            const customIntervals = rawDoc.custom_reminder_intervals
              .split(',')
              .map((s: string) => parseInt(s.trim()))
              .filter((n: number) => !isNaN(n) && n > 0);

            if (customIntervals.length > 0) {
              intervalsToCheck = customIntervals;
              console.log(`  🔧 Using custom intervals for employee document ${rawDoc.id}: [${customIntervals.join(', ')}]`);
            }
          }

          // Calculate days until expiry
          const expiryDate = new Date(rawDoc.expiry_date);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Check if daysUntilExpiry matches any of the intervals
          if (intervalsToCheck.includes(daysUntilExpiry)) {
            shouldSendReminder = true;
            reminderReason = `${daysUntilExpiry} days before expiry`;
          }
        }

        // Skip if no reminder needed
        if (!shouldSendReminder) {
          continue;
        }

        totalChecked++;

        // Normalize data structure
        let employee = rawDoc.employee || rawDoc.employees;
        if (Array.isArray(employee)) {
          employee = employee[0];
        }

        let company = employee?.company || employee?.companies;
        if (Array.isArray(company)) {
          company = company[0];
        }

        let serviceType = rawDoc.service_type || rawDoc.service_types;
        if (Array.isArray(serviceType)) {
          serviceType = serviceType[0];
        }

        const normalizedDoc: DocumentWithDetails = {
          id: rawDoc.id,
          title: rawDoc.name || 'Employee Document',
          document_type: rawDoc.type,
          expiry_date: rawDoc.expiry_date,
          document_number: rawDoc.file_name,
          employee_id: rawDoc.employee_id,
          employee: employee ? {
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            company_id: employee.company_id,
            company: company
          } : undefined,
          service_type: serviceType
        };

        // Calculate days until expiry for email
        const expiryDate = new Date(rawDoc.expiry_date);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Determine recipient email and name
        const employeeName = employee?.name || 'Employee';
        const email = employee?.email || company?.email1;

        if (!email) {
          console.error(`  ❌ No email found for employee document ${rawDoc.id}`);
          errors++;
          continue;
        }

        console.log(`\n  🔍 Processing employee document ${normalizedDoc.id}:`);
        console.log(`    - Employee: ${employeeName}`);
        console.log(`    - Company: ${company?.company_name || 'N/A'}`);
        console.log(`    - Document: ${normalizedDoc.title}`);
        console.log(`    - Type: ${normalizedDoc.document_type || 'N/A'}`);
        console.log(`    - Email: ${email}`);
        console.log(`    - Expiry Date: ${normalizedDoc.expiry_date || 'N/A'}`);
        console.log(`    - Days Until Expiry: ${daysUntilExpiry}`);
        console.log(`    - Reminder Reason: ${reminderReason}`);

        // Check if reminder already sent today for this reason
        const intervalForLog = reminderReason.startsWith('custom date') ? 0 : daysUntilExpiry;
        const alreadySent = await this.hasDocumentReminderBeenSent(normalizedDoc.id, intervalForLog, 'employee');

        if (alreadySent) {
          console.log(`    ✅ Reminder already sent today (${reminderReason})`);
          continue;
        }

        // Send reminder email
        console.log(`    📤 Sending employee document reminder email (${reminderReason})...`);
        const sent = await this.sendDocumentReminderEmail(normalizedDoc, daysUntilExpiry);

        if (sent) {
          remindersSent++;
        } else {
          errors++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { checked: totalChecked, sent: remindersSent, errors };
  }

  /**
   * Get reminder logs for a specific date range (both services and documents)
   */
  async getReminderLogs(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('email_reminder_logs')
        .select('*')
        .in('reminder_type', ['service_expiry', 'document_expiry'])
        .order('email_sent_at', { ascending: false });

      if (startDate) {
        query = query.gte('email_sent_at', startDate);
      }

      if (endDate) {
        query = query.lte('email_sent_at', endDate);
      }

      const { data, error } = await query.limit(200);

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

