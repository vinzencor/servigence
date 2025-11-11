import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Database helper functions
export const dbHelpers = {
  supabase, // Add supabase client to dbHelpers
  // Companies
  async getCompanies(userId?: string, userRole?: string) {
    console.log('Loading companies for user:', userId, 'role:', userRole);

    let query = supabase
      .from('companies')
      .select(`
        *,
        assigned_employee:service_employees(id, name, email)
      `)
      .order('created_at', { ascending: false });

    // Filter by assigned user if not super admin and userId is a valid UUID
    if (userId && userRole === 'staff' && isValidUUID(userId)) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading companies:', error);
      throw error;
    }

    console.log('✅ [supabase.ts] Loaded companies from database - Total:', data?.length);
    // Log opening balance for ALL companies to debug
    if (data && data.length > 0) {
      console.log('✅ [supabase.ts] ALL companies opening balances:',
        data.map(c => ({
          name: c.company_name,
          opening_balance: c.opening_balance,
          type: typeof c.opening_balance,
          is_null: c.opening_balance === null,
          is_undefined: c.opening_balance === undefined
        }))
      );
    }
    return data;
  },

  async createCompany(company: any) {
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateCompany(id: string, updates: any) {
    console.log('💾 [supabase.ts] updateCompany called:', {
      id: id,
      opening_balance: updates.opening_balance,
      opening_balance_type: typeof updates.opening_balance,
      opening_balance_updated_at: updates.opening_balance_updated_at,
      opening_balance_updated_by: updates.opening_balance_updated_by
    });

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ [supabase.ts] Supabase update error:', error);
      throw error;
    }

    console.log('✅ [supabase.ts] Update successful:', {
      id: data.id,
      company_name: data.company_name,
      opening_balance: data.opening_balance,
      opening_balance_type: typeof data.opening_balance
    });
    return data
  },

  async addNotesColumnToCompanies() {
    // This function is just a placeholder since the notes column already exists
    // We'll just return success to avoid errors
    return { success: true };
  },

  // Reminders
  async getReminders() {
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        employee:employees(name, employee_id),
        company:companies(company_name),
        individual:individuals(individual_name),
        service:service_types(name, category)
      `)
      .eq('status', 'active')
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return data
  },

  async getUpcomingReminders(daysAhead = 90) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        employee:employees(name, employee_id),
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('status', 'active')
      .lte('reminder_date', futureDate.toISOString().split('T')[0])
      .order('reminder_date', { ascending: true })

    if (error) throw error
    return data
  },

  async createReminder(reminder: any) {
    console.log('Creating reminder in database:', reminder);

    const { data, error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single()

    if (error) {
      console.error('Database error creating reminder:', error);
      throw error;
    }

    console.log('Reminder created in database:', data);
    return data
  },

  async updateReminder(id: string, updates: any) {
    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteReminder(id: string) {
    const { data, error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Auto-create reminders for document expiry
  async createDocumentExpiryReminder(employeeId: string, companyId: string, documentType: string, expiryDate: string, employeeName: string) {
    const reminder = {
      title: `${documentType.replace('_', ' ').toUpperCase()} Expiry - ${employeeName}`,
      description: `${documentType.replace('_', ' ')} will expire on ${expiryDate}`,
      reminder_date: expiryDate,
      reminder_type: 'document_expiry',
      document_type: documentType,
      employee_id: employeeId,
      company_id: companyId,
      priority: 'high',
      days_before_reminder: 30
    };

    return this.createReminder(reminder);
  },

  async deleteCompany(id: string) {
    try {
      // Start a transaction-like approach by deleting related data first

      // 1. Delete employee documents for all employees of this company
      const employees = await this.getEmployees(id);
      for (const employee of employees || []) {
        // Delete employee documents
        await supabase
          .from('employee_documents')
          .delete()
          .eq('employee_id', employee.id);
      }

      // 2. Delete all employees of this company
      await supabase
        .from('employees')
        .delete()
        .eq('company_id', id);

      // 3. Delete all reminders for this company
      await supabase
        .from('reminders')
        .delete()
        .eq('company_id', id);

      // 4. Handle service billings for this company
      // Delete service billings that don't have invoices generated
      await supabase
        .from('service_billings')
        .delete()
        .eq('company_id', id)
        .eq('invoice_generated', false);

      // Update service billings with invoices to remove company reference but preserve invoice data
      await supabase
        .from('service_billings')
        .update({
          company_id: null,
          notes: 'Company deleted - ' + new Date().toISOString()
        })
        .eq('company_id', id)
        .eq('invoice_generated', true);

      // 5. Delete account transactions (except those with invoices)
      await supabase
        .from('account_transactions')
        .delete()
        .eq('company_id', id)
        .is('service_billing_id', null);

      // 6. Update account transactions with service billings to remove company reference
      await supabase
        .from('account_transactions')
        .update({ company_id: null })
        .eq('company_id', id)
        .not('service_billing_id', 'is', null);

      // 7. Finally delete the company
      const { data, error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in cascade delete:', error);
      throw error;
    }
  },

  // Individuals
  async getIndividuals(userId?: string, userRole?: string) {
    let query = supabase
      .from('individuals')
      .select(`
        *,
        assigned_employee:service_employees(id, name, email)
      `)
      .order('created_at', { ascending: false });

    // Filter by assigned user if not super admin and userId is a valid UUID
    if (userId && userRole !== 'super_admin' && isValidUUID(userId)) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createIndividual(individual: any) {
    const { data, error } = await supabase
      .from('individuals')
      .insert([individual])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Employees
  async getEmployees(companyId?: string) {
    let query = supabase
      .from('employees')
      .select(`
        *,
        company:companies(company_name),
        documents:employee_documents(*),
        dependents:dependents(*)
      `)

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }

    console.log('Fetched employees from database:', data);
    return data
  },

  async createEmployee(employee: any) {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateEmployee(employee: any) {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', employee.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (error) throw error
    return data
  },

  // Employee Documents
  async createEmployeeDocument(document: any) {
    const { data, error } = await supabase
      .from('employee_documents')
      .insert([document])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getEmployeeDocuments(employeeId: string) {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateEmployeeDocument(documentId: string, updates: any) {
    const { data, error } = await supabase
      .from('employee_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteEmployeeDocument(documentId: string) {
    const { data, error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error
    return data
  },

  // Individual management
  async deleteIndividual(individualId: string) {
    const { data, error } = await supabase
      .from('individuals')
      .delete()
      .eq('id', individualId)

    if (error) throw error
    return data
  },

  async updateIndividualNotes(individualId: string, notes: string) {
    const { data, error } = await supabase
      .from('individuals')
      .update({ notes })
      .eq('id', individualId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Services
  async getServices() {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return data?.map((service: any) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      typingCharges: service.typing_charges,
      governmentCharges: service.government_charges,
      description: service.description,
      isActive: service.is_active,
      createdAt: service.created_at,
      updatedAt: service.updated_at
    }))
  },

  async createService(service: any) {
    const { data, error } = await supabase
      .from('service_types')
      .insert([service])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateService(id: string, service: any) {
    const { data, error } = await supabase
      .from('service_types')
      .update(service)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteService(serviceId: string) {
    const { data, error } = await supabase
      .from('service_types')
      .delete()
      .eq('id', serviceId)

    if (error) throw error
    return data
  },

  // Service Employees
  async getServiceEmployees() {
    const { data, error } = await supabase
      .from('service_employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createServiceEmployee(employee: any) {
    console.log('Creating service employee with data:', employee);
    console.log('Employee data type:', typeof employee);
    console.log('Employee data keys:', Object.keys(employee));

    const { data, error } = await supabase
      .from('service_employees')
      .insert([employee])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    return data
  },

  async updateServiceEmployee(id: string, employee: any) {
    const { data, error } = await supabase
      .from('service_employees')
      .update(employee)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteServiceEmployee(id: string) {
    const { error } = await supabase
      .from('service_employees')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Service Billings
  async getServiceBillings(userId?: string, userRole?: string) {
    console.log('Loading service billings for user:', userId, 'role:', userRole);

    let query = supabase
      .from('service_billings')
      .select(`
        *,
        company:companies(company_name, assigned_to),
        individual:individuals(individual_name, assigned_to),
        service_type:service_types(name, typing_charges, government_charges),
        assigned_employee:service_employees(name),
        company_employee:employees(name, employee_id, position)
      `)
      .order('created_at', { ascending: false });

    // Simplified filtering - only filter if user is staff role and userId is valid UUID
    if (userId && userRole === 'staff' && isValidUUID(userId)) {
      // For staff users, show billings where they are assigned or where their assigned companies/individuals have billings
      query = query.eq('assigned_employee_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading service billings:', error);
      throw error;
    }

    console.log('Loaded service billings:', data);

    // Calculate payment amounts and outstanding balances for each billing
    const billingsWithPayments = await this.calculateOutstandingAmounts(data || []);

    // Add paid_amount field for compatibility with UI
    const billingsWithPaidAmount = billingsWithPayments.map(billing => ({
      ...billing,
      paid_amount: billing.totalPaid || 0,
      // Update status based on payment status (using service_billings constraint values)
      // Constraint allows: 'pending', 'in_progress', 'completed', 'cancelled'
      status: billing.isFullyPaid ? 'completed' : (billing.totalPaid > 0 ? 'in_progress' : billing.status || 'pending')
    }));

    console.log('Service billings with payment calculations:', billingsWithPaidAmount);
    return billingsWithPaidAmount;
  },

  async createServiceBilling(billing: any) {
    console.log('🔍 Creating service billing with data:', billing);
    console.log('🔍 Cash type value:', billing.cash_type, 'Type:', typeof billing.cash_type);

    const { data, error } = await supabase
      .from('service_billings')
      .insert([billing])
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    return data
  },

  async updateServiceBilling(id: string, updates: any) {
    const { data, error } = await supabase
      .from('service_billings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Accounts
  async getAccountTransactions() {
    console.log('Loading account transactions...');

    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        service_billing:service_billings(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading account transactions:', error);
      throw error;
    }

    console.log('Loaded account transactions:', data);
    return data
  },

  async createAccountTransaction(transaction: any) {
    console.log('Creating account transaction:', transaction);

    const { data, error } = await supabase
      .from('account_transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) {
      console.error('Error creating account transaction:', error);
      throw error;
    }

    console.log('Account transaction created:', data);
    return data
  },

  // Vendors
  async getVendors() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data
  },

  async createVendor(vendor: any) {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendor])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async createContract(contract: any) {
    console.log('Creating contract:', contract);

    const { data, error } = await supabase
      .from('contracts')
      .insert([contract])
      .select()
      .single()

    if (error) {
      console.error('Error creating contract:', error);
      throw error;
    }

    console.log('Contract created:', data);
    return data
  },

  // Dues Management
  async getDues(userId?: string, userRole?: string) {
    console.log('Loading dues for user:', userId, 'role:', userRole);

    let query = supabase
      .from('dues')
      .select(`
        *,
        company:companies(company_name, credit_limit),
        employee:employees(name, employee_id, position),
        service_billing:service_billings(invoice_number, service_date, total_amount)
      `)
      .order('created_at', { ascending: false });

    // Filter based on user role if needed
    if (userId && userRole === 'staff' && isValidUUID(userId)) {
      // For staff users, show dues for companies they are assigned to
      const { data: companyIds } = await supabase
        .from('companies')
        .select('id')
        .eq('assigned_to', userId);

      if (companyIds && companyIds.length > 0) {
        query = query.in('company_id', companyIds.map(c => c.id));
      } else {
        // If no companies assigned, return empty result
        return [];
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading dues:', error);
      throw error;
    }

    console.log('Loaded dues:', data);
    return data;
  },

  async createDue(due: any) {
    console.log('Creating due record:', due);

    const { data, error } = await supabase
      .from('dues')
      .insert([due])
      .select()
      .single();

    if (error) {
      console.error('Error creating due:', error);
      throw error;
    }

    console.log('Due created:', data);
    return data;
  },

  async updateDue(id: string, updates: any) {
    console.log('Updating due:', id, updates);

    const { data, error } = await supabase
      .from('dues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating due:', error);
      throw error;
    }

    console.log('Due updated:', data);
    return data;
  },

  async markDueAsPaid(id: string, paymentAmount: number, paymentMethod: string, paymentReference?: string) {
    console.log('Marking due as paid:', id, paymentAmount);

    // First get the current due record
    const { data: currentDue, error: fetchError } = await supabase
      .from('dues')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching due:', fetchError);
      throw fetchError;
    }

    const newPaidAmount = currentDue.paid_amount + paymentAmount;
    const newDueAmount = currentDue.original_amount - newPaidAmount;

    let status = 'pending';
    if (newDueAmount <= 0) {
      status = 'paid';
    } else if (newPaidAmount > 0) {
      status = 'partial';
    }

    const updates = {
      paid_amount: newPaidAmount,
      due_amount: Math.max(0, newDueAmount),
      status: status,
      last_payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      updated_by: 'System',
      updated_at: new Date().toISOString()
    };

    return this.updateDue(id, updates);
  },

  async getDuesByCompany(companyId: string) {
    console.log('Loading dues for company:', companyId);

    const { data, error } = await supabase
      .from('dues')
      .select(`
        *,
        employee:employees(name, employee_id, position),
        service_billing:service_billings(invoice_number, service_date, total_amount)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading company dues:', error);
      throw error;
    }

    return data;
  },

  async getCompanyCreditUsage(companyId: string) {
    console.log('Calculating credit usage for company:', companyId);

    // Get total outstanding dues
    const { data: dues, error: duesError } = await supabase
      .from('dues')
      .select('due_amount')
      .eq('company_id', companyId)
      .in('status', ['pending', 'partial', 'overdue']);

    if (duesError) {
      console.error('Error loading company dues for credit calculation:', duesError);
      throw duesError;
    }

    const totalOutstanding = dues?.reduce((sum, due) => sum + due.due_amount, 0) || 0;

    // Get company credit limit
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('credit_limit')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error loading company for credit calculation:', companyError);
      throw companyError;
    }

    const creditLimit = company?.credit_limit || 0;
    const availableCredit = Math.max(0, creditLimit - totalOutstanding);

    return {
      creditLimit,
      totalOutstanding,
      availableCredit,
      creditUsagePercentage: creditLimit > 0 ? (totalOutstanding / creditLimit) * 100 : 0
    };
  },

  async getIndividualCreditUsage(individualId: string) {
    console.log('Calculating credit usage for individual:', individualId);

    // Get total outstanding dues
    const { data: dues, error: duesError } = await supabase
      .from('dues')
      .select('due_amount')
      .eq('individual_id', individualId)
      .in('status', ['pending', 'partial', 'overdue']);

    if (duesError) {
      console.error('Error loading individual dues for credit calculation:', duesError);
      throw duesError;
    }

    const totalOutstanding = dues?.reduce((sum, due) => sum + due.due_amount, 0) || 0;

    // Get individual credit limit
    const { data: individual, error: individualError } = await supabase
      .from('individuals')
      .select('credit_limit')
      .eq('id', individualId)
      .single();

    if (individualError) {
      console.error('Error loading individual for credit calculation:', individualError);
      throw individualError;
    }

    const creditLimit = individual?.credit_limit || 0;
    const availableCredit = Math.max(0, creditLimit - totalOutstanding);

    return {
      creditLimit,
      totalOutstanding,
      availableCredit,
      creditUsagePercentage: creditLimit > 0 ? (totalOutstanding / creditLimit) * 100 : 0
    };
  },

  // Chat Functions
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select(`
        *,
        participant_1:service_employees!participant_1_id(id, name, email, department),
        participant_2:service_employees!participant_2_id(id, name, email, department),
        last_message:chat_messages(
          id, content, message_type, created_at, sender_id,
          sender:service_employees(name)
        )
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    // Get unread counts for each conversation
    if (data) {
      const conversationsWithUnreadCounts = await Promise.all(
        data.map(async (conversation) => {
          const unreadCount = await this.getUnreadCount(conversation.id, userId);
          return {
            ...conversation,
            unread_count: unreadCount
          };
        })
      );
      return conversationsWithUnreadCounts;
    }

    return data
  },

  async getOrCreateConversation(participant1Id: string, participant2Id: string) {
    // First try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('chat_conversations')
      .select('*')
      .or(`and(participant_1_id.eq.${participant1Id},participant_2_id.eq.${participant2Id}),and(participant_1_id.eq.${participant2Id},participant_2_id.eq.${participant1Id})`)
      .single()

    if (existing) {
      return existing
    }

    // Create new conversation if not found
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert([{
        participant_1_id: participant1Id,
        participant_2_id: participant2Id
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getMessages(conversationId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:service_employees(id, name, email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  },

  async sendMessage(message: any) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([message])
      .select(`
        *,
        sender:service_employees(id, name, email)
      `)
      .single()

    if (error) throw error

    // Update conversation last_message_at
    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', message.conversation_id)

    return data
  },

  async markMessagesAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error
  },

  async getUnreadCount(conversationId: string, userId: string) {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  },

  async getTotalUnreadCount(userId: string) {
    // Get all conversations for the user
    const { data: conversations, error: convError } = await supabase
      .from('chat_conversations')
      .select('id')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)

    if (convError) throw convError

    if (!conversations || conversations.length === 0) {
      return 0;
    }

    // Get total unread count across all conversations
    const conversationIds = conversations.map(conv => conv.id);
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  },

  // Documents
  async uploadDocument(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (error) throw error
    return data
  },

  async getDocumentUrl(path: string) {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(path)

    return data.publicUrl
  },

  async createCompanyDocument(documentData: any) {
    console.log('Creating company document via helper:', documentData);

    const { data, error } = await supabase
      .from('company_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      console.error('Database helper error creating company document:', error);
      throw error;
    }

    console.log('Company document created successfully:', data);
    return data;
  },

  async updateCompanyDocument(id: string, updateData: any) {
    console.log('Updating company document via helper:', id, updateData);

    const { data, error } = await supabase
      .from('company_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database helper error updating company document:', error);
      throw error;
    }

    console.log('Company document updated successfully:', data);
    return data;
  },

  // Payment Cards
  async getPaymentCards() {
    const { data, error } = await supabase
      .from('payment_cards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform data to match PaymentCard interface
    return data?.map((card: any) => ({
      id: card.id,
      cardName: card.card_name,
      cardDescription: card.card_description,
      creditLimit: parseFloat(card.credit_limit),
      cardType: card.card_type,
      bankName: card.bank_name,
      isActive: card.is_active,
      isDefault: card.is_default,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      createdBy: card.created_by,
      updatedBy: card.updated_by
    })) || []
  },

  async createPaymentCard(card: any) {
    const { data, error } = await supabase
      .from('payment_cards')
      .insert([card])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePaymentCard(id: string, updates: any) {
    const { data, error } = await supabase
      .from('payment_cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deletePaymentCard(id: string) {
    const { error } = await supabase
      .from('payment_cards')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getDefaultPaymentCard() {
    const { data, error } = await supabase
      .from('payment_cards')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"

    if (!data) return null

    // Transform data to match PaymentCard interface
    return {
      id: data.id,
      cardName: data.card_name,
      cardDescription: data.card_description,
      creditLimit: parseFloat(data.credit_limit),
      cardType: data.card_type,
      bankName: data.bank_name,
      isActive: data.is_active,
      isDefault: data.is_default,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    }
  },

  async setDefaultPaymentCard(cardId: string) {
    try {
      // First, remove default status from all cards
      await supabase
        .from('payment_cards')
        .update({ is_default: false })
        .neq('id', cardId);

      // Then set the specified card as default
      const { data, error } = await supabase
        .from('payment_cards')
        .update({ is_default: true })
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting default payment card:', error);
      throw error;
    }
  },

  // Card Transactions
  async getCardTransactions(cardId: string) {
    const { data, error } = await supabase
      .from('card_transactions')
      .select(`
        *,
        companies:company_id(company_name),
        individuals:individual_id(individual_name),
        invoices:invoice_id(invoice_number)
      `)
      .eq('card_id', cardId)
      .order('transaction_date', { ascending: false })

    if (error) throw error

    return data?.map((transaction: any) => ({
      id: transaction.id,
      cardId: transaction.card_id,
      transactionDate: transaction.transaction_date,
      description: transaction.description,
      amount: parseFloat(transaction.amount),
      transactionType: transaction.transaction_type,
      referenceNumber: transaction.reference_number,
      companyId: transaction.company_id,
      companyName: transaction.companies?.company_name,
      individualId: transaction.individual_id,
      individualName: transaction.individuals?.individual_name,
      invoiceId: transaction.invoice_id,
      status: transaction.status,
      createdAt: transaction.created_at
    })) || []
  },

  // Enhanced Card Transactions - Gets transactions from service_billings
  async getEnhancedCardTransactions(cardId: string) {
    const { data, error } = await supabase
      .from('service_billings')
      .select(`
        id,
        service_date,
        total_amount,
        discount,
        cash_type,
        invoice_number,
        notes,
        status,
        created_at,
        card_id,
        company:companies(id, company_name),
        individual:individuals(id, individual_name),
        service_type:service_types(id, name),
        payment_card:payment_cards(id, card_name)
      `)
      .eq('card_id', cardId)
      .eq('cash_type', 'card')
      .order('service_date', { ascending: false })

    if (error) throw error

    return data?.map((billing: any) => ({
      id: billing.id,
      cardId: billing.card_id,
      cardName: billing.payment_card?.card_name || 'Unknown Card',
      transactionDate: billing.service_date,
      description: `Service: ${billing.service_type?.name || 'Unknown Service'}${billing.notes ? ` - ${billing.notes}` : ''}`,
      amount: parseFloat(billing.total_amount) - (parseFloat(billing.discount) || 0),
      transactionType: 'payment' as const,
      referenceNumber: billing.invoice_number,
      companyId: billing.company?.id,
      companyName: billing.company?.company_name,
      individualId: billing.individual?.id,
      individualName: billing.individual?.individual_name,
      invoiceNumber: billing.invoice_number,
      serviceType: billing.service_type?.name,
      status: billing.status === 'completed' ? 'completed' as const :
              billing.status === 'pending' ? 'pending' as const : 'completed' as const,
      createdAt: billing.created_at
    })) || []
  },

  // Get all card transactions with date range filtering
  async getAllCardTransactionsWithFilters(filters: {
    cardId?: string;
    startDate?: string;
    endDate?: string;
    transactionType?: string;
    status?: string;
    searchTerm?: string;
  } = {}) {
    let query = supabase
      .from('service_billings')
      .select(`
        id,
        service_date,
        total_amount,
        discount,
        cash_type,
        invoice_number,
        notes,
        status,
        created_at,
        card_id,
        company:companies(id, company_name),
        individual:individuals(id, individual_name),
        service_type:service_types(id, name),
        payment_card:payment_cards(id, card_name)
      `)
      .eq('cash_type', 'card')
      .not('card_id', 'is', null)

    if (filters.cardId) {
      query = query.eq('card_id', filters.cardId)
    }

    if (filters.startDate) {
      query = query.gte('service_date', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('service_date', filters.endDate)
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    query = query.order('service_date', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    let transactions = data?.map((billing: any) => ({
      id: billing.id,
      cardId: billing.card_id,
      cardName: billing.payment_card?.card_name || 'Unknown Card',
      transactionDate: billing.service_date,
      description: `Service: ${billing.service_type?.name || 'Unknown Service'}${billing.notes ? ` - ${billing.notes}` : ''}`,
      amount: parseFloat(billing.total_amount) - (parseFloat(billing.discount) || 0),
      transactionType: 'payment' as const,
      referenceNumber: billing.invoice_number,
      companyId: billing.company?.id,
      companyName: billing.company?.company_name,
      individualId: billing.individual?.id,
      individualName: billing.individual?.individual_name,
      invoiceNumber: billing.invoice_number,
      serviceType: billing.service_type?.name,
      status: billing.status === 'completed' ? 'completed' as const :
              billing.status === 'pending' ? 'pending' as const : 'completed' as const,
      createdAt: billing.created_at
    })) || []

    // Apply search filter if provided
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase()
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.companyName?.toLowerCase().includes(searchLower) ||
        t.individualName?.toLowerCase().includes(searchLower) ||
        t.invoiceNumber?.toLowerCase().includes(searchLower) ||
        t.cardName.toLowerCase().includes(searchLower)
      )
    }

    return transactions
  },

  // Card Balance and Usage Functions
  async getCardBalances() {
    try {
      // Get all active payment cards
      const cards = await this.getPaymentCards();
      const activeCards = cards.filter(card => card.isActive);

      // Calculate balances for each card
      const cardBalances = await Promise.all(
        activeCards.map(async (card) => {
          const usage = await this.getCardUsage(card.id);
          const availableCredit = card.creditLimit - usage.totalUsed;
          const utilizationPercentage = card.creditLimit > 0 ? (usage.totalUsed / card.creditLimit) * 100 : 0;

          return {
            id: card.id,
            cardName: card.cardName,
            cardType: card.cardType,
            bankName: card.bankName,
            creditLimit: card.creditLimit,
            totalUsed: usage.totalUsed,
            availableCredit: Math.max(0, availableCredit),
            utilizationPercentage: Math.min(100, utilizationPercentage),
            isDefault: card.isDefault,
            todayUsage: usage.todayUsage,
            transactionCount: usage.transactionCount,
            lastTransactionDate: usage.lastTransactionDate
          };
        })
      );

      return cardBalances;
    } catch (error) {
      console.error('Error calculating card balances:', error);
      throw error;
    }
  },

  async getCardUsage(cardId: string) {
    try {
      // Get all service billings that used this card
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select('total_amount, service_date, created_at')
        .eq('card_id', cardId)
        .eq('cash_type', 'card');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];

      const totalUsed = billings?.reduce((sum, billing) => sum + parseFloat(billing.total_amount || 0), 0) || 0;
      const todayUsage = billings?.filter(billing => billing.service_date === today)
        .reduce((sum, billing) => sum + parseFloat(billing.total_amount || 0), 0) || 0;

      const transactionCount = billings?.length || 0;
      const lastTransactionDate = billings?.length > 0
        ? billings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].service_date
        : null;

      return {
        totalUsed,
        todayUsage,
        transactionCount,
        lastTransactionDate
      };
    } catch (error) {
      console.error('Error calculating card usage:', error);
      throw error;
    }
  },

  async getTodayCardTransactions() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // First get the service billings with card payments
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name)
        `)
        .eq('cash_type', 'card')
        .eq('service_date', today)
        .not('card_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get payment cards separately and map them
      const { data: cards, error: cardsError } = await supabase
        .from('payment_cards')
        .select('id, card_name, card_type, bank_name');

      if (cardsError) throw cardsError;

      const cardsMap = cards?.reduce((acc: any, card: any) => {
        acc[card.id] = card;
        return acc;
      }, {}) || {};

      return billings?.map((billing: any) => {
        const card = cardsMap[billing.card_id];
        return {
          id: billing.id,
          cardId: billing.card_id,
          cardName: card?.card_name || 'Unknown Card',
          cardType: card?.card_type || 'unknown',
          bankName: card?.bank_name,
          amount: parseFloat(billing.total_amount || 0),
          serviceName: billing.service_type?.name || 'Unknown Service',
          clientName: billing.company?.company_name || billing.individual?.individual_name || 'Unknown Client',
          clientType: billing.company_id ? 'company' : 'individual',
          invoiceNumber: billing.invoice_number,
          serviceDate: billing.service_date,
          createdAt: billing.created_at,
          status: billing.status
        };
      }) || [];
    } catch (error) {
      console.error('Error loading today\'s card transactions:', error);
      throw error;
    }
  },

  async getDailyCardSummary(date?: string) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Get all card transactions for the specified date
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select('card_id, total_amount')
        .eq('cash_type', 'card')
        .eq('service_date', targetDate)
        .not('card_id', 'is', null);

      if (error) throw error;

      // Get payment cards separately
      const { data: cards, error: cardsError } = await supabase
        .from('payment_cards')
        .select('id, card_name, credit_limit');

      if (cardsError) throw cardsError;

      const cardsMap = cards?.reduce((acc: any, card: any) => {
        acc[card.id] = card;
        return acc;
      }, {}) || {};

      // Group by card and calculate totals
      const cardSummary = billings?.reduce((acc: any, billing: any) => {
        const cardId = billing.card_id;
        const amount = parseFloat(billing.total_amount || 0);
        const card = cardsMap[cardId];

        if (!acc[cardId] && card) {
          acc[cardId] = {
            cardId,
            cardName: card.card_name || 'Unknown Card',
            creditLimit: parseFloat(card.credit_limit || 0),
            dailyUsage: 0,
            transactionCount: 0
          };
        }

        if (acc[cardId]) {
          acc[cardId].dailyUsage += amount;
          acc[cardId].transactionCount += 1;
        }

        return acc;
      }, {}) || {};

      // Convert to array and add remaining balance
      const summaryArray = Object.values(cardSummary).map((card: any) => {
        // Get total usage for this card (all time)
        return this.getCardUsage(card.cardId).then(usage => ({
          ...card,
          totalUsed: usage.totalUsed,
          remainingBalance: Math.max(0, card.creditLimit - usage.totalUsed),
          utilizationPercentage: card.creditLimit > 0 ? (usage.totalUsed / card.creditLimit) * 100 : 0
        }));
      });

      const results = await Promise.all(summaryArray);

      // Calculate totals
      const totalDailyUsage = results.reduce((sum, card) => sum + card.dailyUsage, 0);
      const totalTransactions = results.reduce((sum, card) => sum + card.transactionCount, 0);
      const totalAvailableCredit = results.reduce((sum, card) => sum + card.remainingBalance, 0);

      return {
        date: targetDate,
        cards: results,
        totals: {
          dailyUsage: totalDailyUsage,
          transactionCount: totalTransactions,
          availableCredit: totalAvailableCredit,
          cardsUsed: results.length
        }
      };
    } catch (error) {
      console.error('Error generating daily card summary:', error);
      throw error;
    }
  },

  async createCardTransaction(transaction: any) {
    const { data, error } = await supabase
      .from('card_transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Vendor Reports
  async getVendorReports(vendorId?: string, dateFrom?: string, dateTo?: string) {
    try {
      let query = supabase
        .from('service_billings')
        .select(`
          *,
          vendor:vendors(name, email, phone, service_category),
          service_type:service_types(name),
          company:companies(company_name),
          individual:individuals(individual_name)
        `)
        .not('assigned_vendor_id', 'is', null);

      if (vendorId) {
        query = query.eq('assigned_vendor_id', vendorId);
      }

      if (dateFrom) {
        query = query.gte('service_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('service_date', dateTo);
      }

      const { data: billings, error } = await query.order('service_date', { ascending: false });

      if (error) throw error;

      // Get all vendors for summary
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true);

      if (vendorsError) throw vendorsError;

      // Calculate vendor performance metrics
      const vendorMetrics = vendors?.map(vendor => {
        const vendorBillings = billings?.filter(b => b.assigned_vendor_id === vendor.id) || [];
        const totalJobs = vendorBillings.length;
        const totalCost = vendorBillings.reduce((sum, b) => sum + parseFloat(b.vendor_cost || 0), 0);
        const totalRevenue = vendorBillings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);
        const completedJobs = vendorBillings.filter(b => b.status === 'completed').length;
        const pendingJobs = vendorBillings.filter(b => b.status === 'pending').length;

        return {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          serviceCategory: vendor.service_category,
          totalJobs,
          completedJobs,
          pendingJobs,
          totalCost,
          totalRevenue,
          profit: totalRevenue - totalCost,
          completionRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
          averageCostPerJob: totalJobs > 0 ? totalCost / totalJobs : 0,
          recentJobs: vendorBillings.slice(0, 5).map(b => ({
            id: b.id,
            serviceName: b.service_type?.name || 'Unknown Service',
            clientName: b.company?.company_name || b.individual?.individual_name || 'Unknown Client',
            amount: parseFloat(b.total_amount || 0),
            vendorCost: parseFloat(b.vendor_cost || 0),
            serviceDate: b.service_date,
            status: b.status,
            invoiceNumber: b.invoice_number
          }))
        };
      }) || [];

      return {
        vendors: vendorMetrics,
        totalVendors: vendors?.length || 0,
        totalJobs: billings?.length || 0,
        totalCost: billings?.reduce((sum, b) => sum + parseFloat(b.vendor_cost || 0), 0) || 0,
        totalRevenue: billings?.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0) || 0,
        billings: billings || []
      };
    } catch (error) {
      console.error('Error generating vendor reports:', error);
      throw error;
    }
  },

  async generateDayCloseReport(date?: string) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Get all cards and their opening balances (total usage before target date)
      const cards = await this.getPaymentCards();
      const activeCards = cards.filter(card => card.isActive);

      // Get all transactions for the target date
      const dailyTransactions = await this.getTodayCardTransactions();
      const targetDateTransactions = dailyTransactions.filter(t => t.serviceDate === targetDate);

      // Calculate opening and closing balances for each card
      const cardReports = await Promise.all(
        activeCards.map(async (card) => {
          // Get all transactions before target date
          const { data: beforeTransactions, error: beforeError } = await supabase
            .from('service_billings')
            .select('total_amount, service_date')
            .eq('card_id', card.id)
            .eq('cash_type', 'card')
            .lt('service_date', targetDate);

          if (beforeError) throw beforeError;

          // Get transactions for target date
          const { data: dayTransactions, error: dayError } = await supabase
            .from('service_billings')
            .select('total_amount, service_date, invoice_number')
            .eq('card_id', card.id)
            .eq('cash_type', 'card')
            .eq('service_date', targetDate);

          if (dayError) throw dayError;

          const openingUsage = beforeTransactions?.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) || 0;
          const dailyUsage = dayTransactions?.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) || 0;
          const closingUsage = openingUsage + dailyUsage;

          return {
            cardId: card.id,
            cardName: card.cardName,
            cardType: card.cardType,
            bankName: card.bankName,
            creditLimit: card.creditLimit,
            openingBalance: Math.max(0, card.creditLimit - openingUsage),
            openingUsage,
            dailyUsage,
            closingUsage,
            closingBalance: Math.max(0, card.creditLimit - closingUsage),
            transactionCount: dayTransactions?.length || 0,
            transactions: dayTransactions || []
          };
        })
      );

      // Calculate totals
      const totals = {
        totalCreditLimit: cardReports.reduce((sum, card) => sum + card.creditLimit, 0),
        totalOpeningBalance: cardReports.reduce((sum, card) => sum + card.openingBalance, 0),
        totalDailyUsage: cardReports.reduce((sum, card) => sum + card.dailyUsage, 0),
        totalClosingBalance: cardReports.reduce((sum, card) => sum + card.closingBalance, 0),
        totalTransactions: cardReports.reduce((sum, card) => sum + card.transactionCount, 0),
        cardsUsed: cardReports.filter(card => card.dailyUsage > 0).length
      };

      return {
        date: targetDate,
        generatedAt: new Date().toISOString(),
        cards: cardReports,
        totals,
        transactions: targetDateTransactions
      };
    } catch (error) {
      console.error('Error generating day close report:', error);
      throw error;
    }
  },

  // Outstanding Reports
  async getOutstandingReports(type?: 'all' | 'overdue' | 'pending') {
    try {
      // Get service billings that are not fully paid
      const { data: billings, error } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name, assigned_to, credit_limit),
          individual:individuals(individual_name, assigned_to, credit_limit),
          service_type:service_types(name),
          assigned_employee:service_employees(name)
        `)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('service_date', { ascending: true });

      if (error) throw error;

      // Calculate outstanding amounts using the new function
      const billingsWithOutstanding = await this.calculateOutstandingAmounts(billings || []);

      // Categorize and format the data
      const outstandingItems = billingsWithOutstanding.map(billing => {
        const serviceDate = new Date(billing.service_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

        let category = 'current';
        if (daysDiff > 90) category = 'over_90';
        else if (daysDiff > 60) category = 'over_60';
        else if (daysDiff > 30) category = 'over_30';

        const isOverdue = daysDiff > 30;

        return {
          id: billing.id,
          invoiceNumber: billing.invoice_number,
          clientName: billing.company?.company_name || billing.individual?.individual_name || 'Unknown Client',
          clientType: billing.company_id ? 'company' : 'individual',
          serviceName: billing.service_type?.name || 'Unknown Service',
          serviceDate: billing.service_date,
          totalAmount: billing.totalAmount,
          paidAmount: billing.totalPaid,
          outstandingAmount: billing.outstandingAmount,
          daysPastDue: Math.max(0, daysDiff - 30),
          category,
          isOverdue,
          status: billing.status,
          assignedEmployee: billing.assigned_employee?.name,
          creditLimit: billing.company?.credit_limit || billing.individual?.credit_limit || 0,
          isFullyPaid: billing.isFullyPaid
        };
      }).filter(item => item.outstandingAmount > 0);

      // Filter by type if specified
      let filteredItems = outstandingItems;
      if (type === 'overdue') {
        filteredItems = outstandingItems.filter(item => item.isOverdue);
      } else if (type === 'pending') {
        filteredItems = outstandingItems.filter(item => !item.isOverdue);
      }

      // Calculate summary statistics
      const totalOutstanding = filteredItems.reduce((sum, item) => sum + item.outstandingAmount, 0);
      const overdueAmount = outstandingItems.filter(item => item.isOverdue).reduce((sum, item) => sum + item.outstandingAmount, 0);
      const currentAmount = outstandingItems.filter(item => !item.isOverdue).reduce((sum, item) => sum + item.outstandingAmount, 0);

      // Group by aging categories
      const agingReport = {
        current: outstandingItems.filter(item => item.category === 'current'),
        over_30: outstandingItems.filter(item => item.category === 'over_30'),
        over_60: outstandingItems.filter(item => item.category === 'over_60'),
        over_90: outstandingItems.filter(item => item.category === 'over_90')
      };

      // Group by client
      const clientSummary = filteredItems.reduce((acc: any, item) => {
        const clientKey = `${item.clientType}_${item.clientName}`;
        if (!acc[clientKey]) {
          acc[clientKey] = {
            clientName: item.clientName,
            clientType: item.clientType,
            totalOutstanding: 0,
            invoiceCount: 0,
            oldestInvoiceDate: item.serviceDate,
            creditLimit: item.creditLimit
          };
        }
        acc[clientKey].totalOutstanding += item.outstandingAmount;
        acc[clientKey].invoiceCount += 1;
        if (new Date(item.serviceDate) < new Date(acc[clientKey].oldestInvoiceDate)) {
          acc[clientKey].oldestInvoiceDate = item.serviceDate;
        }
        return acc;
      }, {});

      return {
        items: filteredItems,
        summary: {
          totalOutstanding,
          overdueAmount,
          currentAmount,
          totalInvoices: filteredItems.length,
          overdueInvoices: outstandingItems.filter(item => item.isOverdue).length
        },
        agingReport,
        clientSummary: Object.values(clientSummary)
      };
    } catch (error) {
      console.error('Error generating outstanding reports:', error);
      throw error;
    }
  },

  // Advance Payments
  async recordAdvancePayment(billingId: string, amount: number, paymentMethod: string, notes?: string) {
    try {
      // First, get the current billing record
      const { data: billing, error: billingError } = await supabase
        .from('service_billings')
        .select('total_amount')
        .eq('id', billingId)
        .single();

      if (billingError) {
        throw billingError;
      }

      const totalAmount = parseFloat(billing.total_amount || 0);

      // Validate payment amount against total (since we can't track paid_amount yet)
      if (amount > totalAmount) {
        throw new Error('Payment amount exceeds total invoice amount');
      }

      // Determine new status based on payment amount
      let newStatus = 'pending';
      if (amount >= totalAmount) {
        newStatus = 'paid';
      } else if (amount > 0) {
        newStatus = 'partial';
      }

      // Skip updating service billing record to avoid column errors
      // Payment status will be tracked through temporary payments until migration
      let updatedBilling = billing;

      // Record payment in temporary localStorage tracking (avoids 404 errors)
      // This will be migrated to database when advance_payments table is created
      let payment = this.addTempPayment(billingId, amount, paymentMethod, notes);

      if (!payment) {
        // Fallback to mock payment record
        payment = {
          id: `temp-${Date.now()}`,
          billing_id: billingId,
          amount: amount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().split('T')[0],
          notes: notes || null
        };
      }

      return {
        billing: updatedBilling,
        payment: payment,
        newStatus,
        remainingAmount: Math.max(0, totalAmount - amount)
      };
    } catch (error) {
      console.error('Error recording advance payment:', error);
      throw error;
    }
  },

  async getAdvancePayments(billingId?: string) {
    try {
      let query = supabase
        .from('advance_payments')
        .select(`
          *,
          billing:service_billings(
            invoice_number,
            total_amount,
            company:companies(company_name),
            individual:individuals(individual_name),
            service_type:service_types(name)
          )
        `)
        .order('payment_date', { ascending: false });

      if (billingId) {
        query = query.eq('billing_id', billingId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('advance_payments table may not exist yet:', error);
        return []; // Return empty array if table doesn't exist
      }

      return data?.map((payment: any) => ({
        id: payment.id,
        billingId: payment.billing_id,
        amount: parseFloat(payment.amount || 0),
        paymentMethod: payment.payment_method,
        paymentDate: payment.payment_date,
        notes: payment.notes,
        createdAt: payment.created_at,
        billing: {
          invoiceNumber: payment.billing?.invoice_number,
          totalAmount: parseFloat(payment.billing?.total_amount || 0),
          clientName: payment.billing?.company?.company_name || payment.billing?.individual?.individual_name || 'Unknown Client',
          serviceName: payment.billing?.service_type?.name || 'Unknown Service'
        }
      })) || [];
    } catch (error) {
      console.warn('Error loading advance payments, table may not exist:', error);
      return []; // Return empty array instead of throwing error
    }
  },

  async generateReceipt(paymentId: string) {
    try {
      const { data: payment, error } = await supabase
        .from('advance_payments')
        .select(`
          *,
          billing:service_billings(
            invoice_number,
            total_amount,
            service_date,
            company:companies(company_name, address, phone1, phone2, email1, email2),
            individual:individuals(individual_name, address, phone1, phone2, email1, email2),
            service_type:service_types(name)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) {
        console.warn('advance_payments table may not exist yet:', error);
        throw new Error('Payment record not found - database may need migration');
      }

      const receiptData = {
        receiptNumber: `RCP-${Date.now()}`,
        paymentId: payment.id,
        paymentDate: payment.payment_date,
        amount: parseFloat(payment.amount || 0),
        paymentMethod: payment.payment_method,
        notes: payment.notes,
        billing: {
          invoiceNumber: payment.billing?.invoice_number,
          totalAmount: parseFloat(payment.billing?.total_amount || 0),
          serviceDate: payment.billing?.service_date,
          serviceName: payment.billing?.service_type?.name,
          clientName: payment.billing?.company?.company_name || payment.billing?.individual?.individual_name,
          clientAddress: payment.billing?.company?.address || payment.billing?.individual?.address,
          clientPhone: payment.billing?.company?.phone1 || payment.billing?.company?.phone2 || payment.billing?.individual?.phone1 || payment.billing?.individual?.phone2
        }
      };

      return receiptData;
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  },

  async getPaymentHistory(billingId: string) {
    try {
      // Use only temporary payments from localStorage (avoids 404 errors)
      // This will be enhanced to include database payments after migration
      const tempPayments = this.getTempPayments(billingId);
      return tempPayments.map((payment: any) => ({
        id: payment.id,
        amount: parseFloat(payment.amount || 0),
        paymentMethod: payment.payment_method,
        paymentDate: payment.payment_date,
        paymentReference: payment.payment_reference,
        notes: payment.notes,
        receiptNumber: payment.receipt_number,
        status: 'completed',
        createdAt: payment.created_at
      })).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.warn('Error loading payment history:', error);
      return [];
    }
  },

  async getBillingWithPayments(billingId: string) {
    try {
      // Get billing details
      const { data: billing, error: billingError } = await supabase
        .from('service_billings')
        .select(`
          *,
          company:companies(company_name),
          individual:individuals(individual_name),
          service_type:service_types(name)
        `)
        .eq('id', billingId)
        .single();

      if (billingError) throw billingError;

      // Use calculateOutstandingAmounts to get accurate payment calculations
      // This includes temp payments, DB payments, and applied advance payments
      const billingsWithPayments = await this.calculateOutstandingAmounts([billing]);
      const billingWithPayments = billingsWithPayments[0];

      // Get payment history (temp payments only for now)
      const payments = await this.getPaymentHistory(billingId);

      return {
        ...billingWithPayments,
        payments,
        paidAmount: billingWithPayments.totalPaid,
        clientName: billing.company?.company_name || billing.individual?.individual_name || 'Unknown Client',
        serviceName: billing.service_type?.name || 'Unknown Service'
      };
    } catch (error) {
      console.error('Error loading billing with payments:', error);
      throw error;
    }
  },

  // Temporary payment tracking in localStorage (until database migration)
  getTempPayments(billingId: string) {
    try {
      const payments = localStorage.getItem('temp_payments');
      if (payments) {
        const allPayments = JSON.parse(payments);
        return allPayments.filter((p: any) => p.billing_id === billingId) || [];
      }
      return [];
    } catch (error) {
      console.warn('Error reading temp payments:', error);
      return [];
    }
  },

  addTempPayment(billingId: string, amount: number, paymentMethod: string, notes?: string) {
    try {
      const payments = localStorage.getItem('temp_payments');
      const allPayments = payments ? JSON.parse(payments) : [];

      const newPayment = {
        id: `temp-${Date.now()}`,
        billing_id: billingId,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        notes: notes || null,
        created_at: new Date().toISOString()
      };

      allPayments.push(newPayment);
      localStorage.setItem('temp_payments', JSON.stringify(allPayments));

      return newPayment;
    } catch (error) {
      console.warn('Error saving temp payment:', error);
      return null;
    }
  },

  // Migration helper: Transfer temporary payments to database (call after creating advance_payments table)
  async migrateTempPaymentsToDatabase() {
    try {
      const tempPayments = localStorage.getItem('temp_payments');
      if (!tempPayments) {
        console.log('No temporary payments to migrate');
        return { success: true, migrated: 0 };
      }

      const payments = JSON.parse(tempPayments);
      if (payments.length === 0) {
        console.log('No temporary payments to migrate');
        return { success: true, migrated: 0 };
      }

      console.log(`Migrating ${payments.length} temporary payments to database...`);

      // Insert all temporary payments into the database
      const { data, error } = await supabase
        .from('advance_payments')
        .insert(payments.map((payment: any) => ({
          billing_id: payment.billing_id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
          notes: payment.notes,
          created_at: payment.created_at
        })));

      if (error) {
        console.error('Error migrating temporary payments:', error);
        return { success: false, error: error.message };
      }

      // Clear temporary payments after successful migration
      localStorage.removeItem('temp_payments');
      console.log(`Successfully migrated ${payments.length} payments to database`);

      return { success: true, migrated: payments.length };
    } catch (error) {
      console.error('Error during payment migration:', error);
      return { success: false, error: error.message };
    }
  },

  // Calculate outstanding amounts by summing payments from both localStorage and database
  async calculateOutstandingAmounts(billings: any[]) {
    try {
      const billingsWithOutstanding = [];

      // Get all billing IDs to fetch applications in bulk
      const billingIds = billings.map(b => b.id);

      // Get all advance payment applications for these billings
      let allApplications: any[] = [];
      if (billingIds.length > 0) {
        const { data: applications } = await supabase
          .from('advance_payment_applications')
          .select('billing_id, applied_amount')
          .in('billing_id', billingIds);

        allApplications = applications || [];
      }

      console.log('🔍 Advance payment applications found:', allApplications?.length || 0);

      for (const billing of billings) {
        const totalAmount = parseFloat(billing.total_amount || 0);
        let totalPaid = 0;

        // 1. Get temporary payments from localStorage
        const tempPayments = this.getTempPayments(billing.id);
        const tempPaid = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // 2. Get applied advance payments for this billing from advance_payment_applications table
        // This is the ONLY source of truth for which payments have been applied to which billings
        const appliedPayments = allApplications.filter(app => app.billing_id === billing.id);
        const appliedAmount = appliedPayments.reduce((sum, app) => sum + parseFloat(app.applied_amount || 0), 0);

        // Total paid = temp payments + applied advance payments
        totalPaid = tempPaid + appliedAmount;
        const outstandingAmount = Math.max(0, totalAmount - totalPaid);

        console.log(`💰 Billing ${billing.invoice_number}: Total=${totalAmount}, TempPaid=${tempPaid}, AppliedAdvance=${appliedAmount}, TotalPaid=${totalPaid}, Outstanding=${outstandingAmount}`);

        billingsWithOutstanding.push({
          ...billing,
          totalAmount,
          totalPaid,
          appliedAdvanceAmount: appliedAmount,
          outstandingAmount,
          isFullyPaid: outstandingAmount === 0,
          payments: appliedPayments
        });
      }

      return billingsWithOutstanding;
    } catch (error) {
      console.error('Error calculating outstanding amounts:', error);
      // Return original billings with basic calculations
      return billings.map(billing => ({
        ...billing,
        totalAmount: parseFloat(billing.total_amount || 0),
        totalPaid: 0, // No payments tracked in fallback
        outstandingAmount: parseFloat(billing.total_amount || 0),
        isFullyPaid: false
      }));
    }
  },

  async getCreditReports(clientType?: 'all' | 'companies' | 'individuals', dateRange?: { start: string; end: string }) {
    try {
      const reports = {
        companies: [],
        individuals: [],
        summary: {
          totalClients: 0,
          totalCreditLimit: 0,
          totalUtilized: 0,
          totalAvailable: 0,
          utilizationRate: 0,
          overdueClients: 0,
          overdueAmount: 0
        }
      };

      // Get companies credit data
      if (clientType === 'all' || clientType === 'companies') {
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            company_name,
            credit_limit,
            address,
            phone1,
            phone2,
            email1,
            email2,
            created_at
          `);

        if (companiesError) throw companiesError;

        // Get service billings for each company
        for (const company of companies || []) {
          let billingQuery = supabase
            .from('service_billings')
            .select('id, total_amount, service_date, created_at')
            .eq('company_id', company.id);

          if (dateRange) {
            billingQuery = billingQuery
              .gte('service_date', dateRange.start)
              .lte('service_date', dateRange.end);
          }

          const { data: billings } = await billingQuery;

          const totalBilled = billings?.reduce((sum, billing) => sum + parseFloat(billing.total_amount || 0), 0) || 0;

          // Calculate total paid from temporary payments
          let totalPaid = 0;
          for (const billing of billings || []) {
            const tempPayments = this.getTempPayments(billing.id);
            totalPaid += tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
          }

          const outstandingAmount = totalBilled - totalPaid;
          const creditLimit = parseFloat(company.credit_limit || 0);
          const creditUtilized = Math.min(outstandingAmount, creditLimit);
          const availableCredit = Math.max(0, creditLimit - creditUtilized);
          const utilizationRate = creditLimit > 0 ? (creditUtilized / creditLimit) * 100 : 0;

          // Check for overdue invoices (over 30 days)
          const overdueInvoices = billings?.filter(billing => {
            const serviceDate = new Date(billing.service_date);
            const daysSince = Math.floor((Date.now() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

            // Check if invoice is not fully paid using temporary payments
            const tempPayments = this.getTempPayments(billing.id);
            const paidAmount = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const isFullyPaid = paidAmount >= parseFloat(billing.total_amount || 0);

            return !isFullyPaid && daysSince > 30;
          }) || [];

          const overdueAmount = overdueInvoices.reduce((sum, billing) => {
            const tempPayments = this.getTempPayments(billing.id);
            const paidAmount = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
            return sum + (parseFloat(billing.total_amount || 0) - paidAmount);
          }, 0);

          reports.companies.push({
            id: company.id,
            name: company.company_name,
            type: 'company',
            creditLimit,
            creditUtilized,
            availableCredit,
            utilizationRate,
            totalBilled,
            totalPaid,
            outstandingAmount,
            overdueAmount,
            overdueInvoices: overdueInvoices.length,
            totalInvoices: billings?.length || 0,
            lastActivity: billings?.length > 0 ? billings[0].created_at : company.created_at,
            contact: {
              address: company.address,
              phone: company.phone1 || company.phone2,
              email: company.email1 || company.email2
            }
          });
        }
      }

      // Get individuals credit data
      if (clientType === 'all' || clientType === 'individuals') {
        const { data: individuals, error: individualsError } = await supabase
          .from('individuals')
          .select(`
            id,
            individual_name,
            credit_limit,
            address,
            phone1,
            phone2,
            email1,
            email2,
            created_at
          `);

        if (individualsError) throw individualsError;

        // Get service billings for each individual
        for (const individual of individuals || []) {
          let billingQuery = supabase
            .from('service_billings')
            .select('id, total_amount, service_date, created_at')
            .eq('individual_id', individual.id);

          if (dateRange) {
            billingQuery = billingQuery
              .gte('service_date', dateRange.start)
              .lte('service_date', dateRange.end);
          }

          const { data: billings } = await billingQuery;

          const totalBilled = billings?.reduce((sum, billing) => sum + parseFloat(billing.total_amount || 0), 0) || 0;

          // Calculate total paid from temporary payments
          let totalPaid = 0;
          for (const billing of billings || []) {
            const tempPayments = this.getTempPayments(billing.id);
            totalPaid += tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
          }

          const outstandingAmount = totalBilled - totalPaid;
          const creditLimit = parseFloat(individual.credit_limit || 0);
          const creditUtilized = Math.min(outstandingAmount, creditLimit);
          const availableCredit = Math.max(0, creditLimit - creditUtilized);
          const utilizationRate = creditLimit > 0 ? (creditUtilized / creditLimit) * 100 : 0;

          // Check for overdue invoices (over 30 days)
          const overdueInvoices = billings?.filter(billing => {
            const serviceDate = new Date(billing.service_date);
            const daysSince = Math.floor((Date.now() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));

            // Check if invoice is not fully paid using temporary payments
            const tempPayments = this.getTempPayments(billing.id);
            const paidAmount = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const isFullyPaid = paidAmount >= parseFloat(billing.total_amount || 0);

            return !isFullyPaid && daysSince > 30;
          }) || [];

          const overdueAmount = overdueInvoices.reduce((sum, billing) => {
            const tempPayments = this.getTempPayments(billing.id);
            const paidAmount = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);
            return sum + (parseFloat(billing.total_amount || 0) - paidAmount);
          }, 0);

          reports.individuals.push({
            id: individual.id,
            name: individual.individual_name,
            type: 'individual',
            creditLimit,
            creditUtilized,
            availableCredit,
            utilizationRate,
            totalBilled,
            totalPaid,
            outstandingAmount,
            overdueAmount,
            overdueInvoices: overdueInvoices.length,
            totalInvoices: billings?.length || 0,
            lastActivity: billings?.length > 0 ? billings[0].created_at : individual.created_at,
            contact: {
              address: individual.address,
              phone: individual.phone1 || individual.phone2,
              email: individual.email1 || individual.email2
            }
          });
        }
      }

      // Calculate summary
      const allClients = [...reports.companies, ...reports.individuals];
      reports.summary = {
        totalClients: allClients.length,
        totalCreditLimit: allClients.reduce((sum, client) => sum + client.creditLimit, 0),
        totalUtilized: allClients.reduce((sum, client) => sum + client.creditUtilized, 0),
        totalAvailable: allClients.reduce((sum, client) => sum + client.availableCredit, 0),
        utilizationRate: allClients.length > 0 ?
          (allClients.reduce((sum, client) => sum + client.utilizationRate, 0) / allClients.length) : 0,
        overdueClients: allClients.filter(client => client.overdueAmount > 0).length,
        overdueAmount: allClients.reduce((sum, client) => sum + client.overdueAmount, 0)
      };

      return reports;
    } catch (error) {
      console.error('Error loading credit reports:', error);
      throw error;
    }
  },

  // Individual Documents Management
  async getIndividualDocuments(individualId: string) {
    const { data, error } = await supabase
      .from('individual_documents')
      .select('*')
      .eq('individual_id', individualId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createIndividualDocument(documentData: any) {
    const { data, error } = await supabase
      .from('individual_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateIndividualDocument(documentId: string, updateData: any) {
    const { data, error } = await supabase
      .from('individual_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteIndividualDocument(documentId: string) {
    const { error } = await supabase
      .from('individual_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
  },

  // Create reminder for individual document expiry
  async createIndividualDocumentReminder(individualId: string, documentTitle: string, expiryDate: string, documentType: string, individualName: string) {
    if (!expiryDate) return;

    const reminderDate = new Date(expiryDate);
    reminderDate.setDate(reminderDate.getDate() - 10); // 10 days before expiry

    const reminderData = {
      title: `${documentTitle} Expiry Reminder`,
      description: `${documentTitle} for ${individualName} will expire on ${new Date(expiryDate).toLocaleDateString()}. Please renew this document before the expiry date.`,
      reminder_date: reminderDate.toISOString().split('T')[0],
      reminder_type: 'document_expiry',
      document_type: documentType,
      individual_id: individualId,
      priority: 'high',
      status: 'active',
      days_before_reminder: 10,
      enabled: true,
      created_by: 'System',
      assigned_to: 'System'
    };

    const { data, error } = await supabase
      .from('reminders')
      .insert([reminderData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Customer Advance Payments Management
  async createCustomerAdvancePayment(paymentData: any) {
    // Generate unique receipt number
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Ensure payment_method is one of the allowed values
    let paymentMethod = paymentData.payment_method || 'cash';
    // Normalize payment method to match database constraints
    if (paymentMethod === 'card') {
      paymentMethod = 'credit_card';
    }

    // Create transaction in account_transactions table (NEW SYSTEM)
    // This ensures advance payments are visible across all components
    const transactionData = {
      transaction_type: 'advance_payment',
      category: 'Advance Payment',
      description: paymentData.description || `Advance payment from ${paymentData.company_id ? 'company' : 'individual'} registration`,
      amount: parseFloat(paymentData.amount),
      transaction_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      reference_number: receiptNumber, // Store receipt number in reference_number field
      status: 'completed', // Always completed for advance payments
      created_by: paymentData.created_by || 'System',
      notes: paymentData.notes || '',
      company_id: paymentData.company_id || null,
      individual_id: paymentData.individual_id || null
    };

    console.log('💾 Creating advance payment in account_transactions:', transactionData);

    const { data, error } = await supabase
      .from('account_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating advance payment:', error);
      console.error('❌ Transaction data that failed:', transactionData);
      throw error;
    }

    console.log('✅ Advance payment created in account_transactions:', data);

    // Return data in format expected by calling components
    return {
      ...data,
      receipt_number: receiptNumber,
      payment_reference: paymentData.payment_reference || null
    };
  },

  async getCustomerAdvancePayments(customerId: string, customerType: 'company' | 'individual') {
    const column = customerType === 'company' ? 'company_id' : 'individual_id';

    // Query from account_transactions table (NEW SYSTEM)
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(id, company_name),
        individual:individuals(id, individual_name)
      `)
      .eq(column, customerId)
      .eq('transaction_type', 'advance_payment')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    // Transform data to match expected format
    return data?.map(transaction => ({
      id: transaction.id,
      company_id: transaction.company_id,
      individual_id: transaction.individual_id,
      amount: transaction.amount,
      payment_method: transaction.payment_method,
      payment_date: transaction.transaction_date,
      payment_reference: transaction.notes?.includes('Payment Ref:')
        ? transaction.notes.split('Payment Ref:')[1]?.trim()
        : null,
      receipt_number: transaction.reference_number,
      notes: transaction.notes,
      description: transaction.description,
      status: transaction.status,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      created_by: transaction.created_by,
      company: transaction.company,
      individual: transaction.individual
    })) || [];
  },

  async updateAdvancePayment(paymentId: string, updateData: any) {
    try {
      // Normalize payment method
      let paymentMethod = updateData.payment_method || 'cash';
      if (paymentMethod === 'card') {
        paymentMethod = 'credit_card';
      }

      const newAmount = parseFloat(updateData.amount);

      console.log('💾 Updating advance payment:', paymentId, 'New amount:', newAmount);

      // Step 1: Get the current advance payment amount
      const { data: currentPayment, error: fetchError } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('id', paymentId)
        .eq('transaction_type', 'advance_payment')
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current payment:', fetchError);
        throw fetchError;
      }

      const oldAmount = parseFloat(currentPayment.amount);
      console.log('📊 Old amount:', oldAmount, 'New amount:', newAmount);

      // Step 2: Get all applications of this advance payment
      const { data: applications, error: applicationsError } = await supabase
        .from('advance_payment_applications')
        .select('id, applied_amount, billing_id')
        .eq('receipt_transaction_id', paymentId);

      if (applicationsError) {
        console.error('❌ Error fetching applications:', applicationsError);
        throw applicationsError;
      }

      const totalApplied = applications?.reduce((sum, app) => sum + parseFloat(app.applied_amount), 0) || 0;
      console.log('📊 Total applied amount:', totalApplied, 'Applications count:', applications?.length || 0);

      // Step 3: Validate that new amount is sufficient for existing applications
      if (newAmount < totalApplied) {
        // Check if there's a data inconsistency (applied > original amount)
        const hasDataInconsistency = totalApplied > oldAmount;

        if (hasDataInconsistency) {
          console.warn('⚠️ Data inconsistency detected: Applied amount exceeds original receipt amount');
          console.warn(`  Original receipt: AED ${oldAmount}`);
          console.warn(`  Total applied: AED ${totalApplied}`);
          console.warn(`  This indicates the receipt was over-applied (applied multiple times)`);

          throw new Error(
            `⚠️ Data Inconsistency Detected!\n\n` +
            `This advance payment has a data integrity issue:\n` +
            `• Original amount: AED ${oldAmount.toLocaleString()}\n` +
            `• Total applied: AED ${totalApplied.toLocaleString()}\n` +
            `• You're trying to set: AED ${newAmount.toLocaleString()}\n\n` +
            `The receipt was over-applied (likely applied multiple times to different billings).\n\n` +
            `To fix this:\n` +
            `1. Set the amount to at least AED ${totalApplied.toLocaleString()} to match what's been applied, OR\n` +
            `2. Go to the service billings and manually unapply some of these payments first\n\n` +
            `Affected billings: ${applications?.length || 0} billing(s)`
          );
        }

        throw new Error(
          `Cannot reduce advance payment to AED ${newAmount.toLocaleString()}. ` +
          `AED ${totalApplied.toLocaleString()} has already been applied to service billings. ` +
          `Please unapply some payments first or increase the amount to at least AED ${totalApplied.toLocaleString()}.`
        );
      }

      // Step 4: Update the advance payment amount in account_transactions
      const transactionData = {
        amount: newAmount,
        transaction_date: updateData.payment_date,
        payment_method: paymentMethod,
        notes: updateData.notes || '',
        description: updateData.description || '',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('account_transactions')
        .update(transactionData)
        .eq('id', paymentId)
        .eq('transaction_type', 'advance_payment')
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating advance payment:', error);
        throw error;
      }

      // Step 5: If amount changed and there are applications, proportionally update them
      if (oldAmount !== newAmount && applications && applications.length > 0) {
        console.log('🔄 Proportionally updating applied amounts...');

        const ratio = newAmount / oldAmount;
        console.log('📊 Update ratio:', ratio);

        // Check if this is fixing a data inconsistency
        const wasOverApplied = totalApplied > oldAmount;
        if (wasOverApplied) {
          console.warn('⚠️ This update is fixing a data inconsistency where the receipt was over-applied');
        }

        for (const app of applications) {
          const oldAppliedAmount = parseFloat(app.applied_amount);
          const newAppliedAmount = oldAppliedAmount * ratio;

          console.log(`  📝 Updating application ${app.id}: ${oldAppliedAmount} → ${newAppliedAmount}`);

          const { error: updateAppError } = await supabase
            .from('advance_payment_applications')
            .update({
              applied_amount: newAppliedAmount,
              notes: wasOverApplied
                ? `Fixed data inconsistency: Updated from AED ${oldAppliedAmount.toFixed(2)} (receipt was over-applied)`
                : `Updated proportionally from AED ${oldAppliedAmount.toFixed(2)} due to advance payment amount change`
            })
            .eq('id', app.id);

          if (updateAppError) {
            console.error('❌ Error updating application:', updateAppError);
            // Continue with other applications even if one fails
          }
        }

        console.log('✅ All applications updated proportionally');

        if (wasOverApplied) {
          console.log('✅ Data inconsistency has been corrected');
        }
      }

      console.log('✅ Advance payment updated successfully:', data);

      // Return additional info about data inconsistency if it was fixed
      return {
        ...data,
        _wasOverApplied: totalApplied > oldAmount,
        _oldAmount: oldAmount,
        _totalApplied: totalApplied
      };
    } catch (error) {
      console.error('❌ Error in updateAdvancePayment:', error);
      throw error;
    }
  },

  async getAdvancePaymentByReceiptNumber(receiptNumber: string) {
    const { data, error } = await supabase
      .from('customer_advance_payments')
      .select(`
        *,
        company:companies(id, company_name, address, phone1, email1),
        individual:individuals(id, individual_name, address, phone1, email1)
      `)
      .eq('receipt_number', receiptNumber)
      .single();

    if (error) throw error;
    return data;
  },

  async updateCustomerAdvancePayment(paymentId: string, updateData: any) {
    const { data, error } = await supabase
      .from('customer_advance_payments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCustomerAdvancePayment(paymentId: string) {
    const { error } = await supabase
      .from('customer_advance_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
  },

  // Service Types Management
  async getServiceTypes() {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  },

  // Quotations Management
  async createQuotation(quotationData: any) {
    // Generate unique quotation number
    const quotationNumber = `QUO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Extract service_items from quotationData
    const { service_items, ...quotationFields } = quotationData;

    const dataWithNumber = {
      ...quotationFields,
      quotation_number: quotationNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create the quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert([dataWithNumber])
      .select('*')
      .single();

    if (quotationError) throw quotationError;

    // Create quotation items if provided
    if (service_items && service_items.length > 0) {
      const itemsToInsert = service_items.map((item: any, index: number) => ({
        quotation_id: quotation.id,
        service_id: item.service_id,
        service_name: item.service_name,
        service_category: item.service_category || '',
        quantity: item.quantity,
        service_charge: item.service_charge,
        government_charge: item.government_charge,
        line_total: item.line_total,
        display_order: index,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);

      if (itemsError) {
        // Rollback: delete the quotation if items insertion fails
        await supabase.from('quotations').delete().eq('id', quotation.id);
        throw itemsError;
      }
    }

    return quotation;
  },

  async getQuotations(filters?: {
    quotationType?: 'existing_company' | 'new_company' | 'all';
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    let query = supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.quotationType && filters.quotationType !== 'all') {
      query = query.eq('quotation_type', filters.quotationType);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('quotation_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('quotation_date', filters.dateTo);
    }

    const { data: quotations, error } = await query;
    if (error) throw error;

    // Load quotation items for each quotation
    if (quotations && quotations.length > 0) {
      const quotationsWithItems = await Promise.all(
        quotations.map(async (quotation) => {
          const { data: items } = await supabase
            .from('quotation_items')
            .select('*')
            .eq('quotation_id', quotation.id)
            .order('display_order', { ascending: true });

          return {
            ...quotation,
            items: items || []
          };
        })
      );
      return quotationsWithItems;
    }

    return quotations;
  },

  async updateQuotation(id: string, updates: any) {
    // Extract service_items from updates
    const { service_items, ...quotationFields } = updates;

    // Update the quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .update({
        ...quotationFields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (quotationError) throw quotationError;

    // Update quotation items if provided
    if (service_items) {
      // Delete existing items
      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id);

      // Insert new items
      if (service_items.length > 0) {
        const itemsToInsert = service_items.map((item: any, index: number) => ({
          quotation_id: id,
          service_id: item.service_id,
          service_name: item.service_name,
          service_category: item.service_category || '',
          quantity: item.quantity,
          service_charge: item.service_charge,
          government_charge: item.government_charge,
          line_total: item.line_total,
          display_order: index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }
    }

    return quotation;
  },

  async deleteQuotation(id: string) {
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async convertQuotationToCompany(quotationId: string, companyData: any) {
    // First create the company
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert([{
        ...companyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError) throw companyError;

    // Then update the quotation to mark it as converted
    const { data: updatedQuotation, error: quotationError } = await supabase
      .from('quotations')
      .update({
        status: 'converted',
        lead_status: 'converted',
        converted_to_company_id: newCompany.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single();

    if (quotationError) throw quotationError;

    return { company: newCompany, quotation: updatedQuotation };
  },

  async getQuotationById(id: string) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Company Financial Data Functions
  async getCompanyServiceBillings(companyId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('service_billings')
      .select(`
        id,
        invoice_number,
        service_date,
        typing_charges,
        government_charges,
        vat_amount,
        total_amount_with_vat,
        status,
        cash_type,
        created_at,
        service_type:service_types(name)
      `)
      .eq('company_id', companyId)
      .order('service_date', { ascending: false });

    if (startDate) {
      query = query.gte('service_date', startDate);
    }
    if (endDate) {
      query = query.lte('service_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCompanyAccountTransactions(companyId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('account_transactions')
      .select('*')
      .eq('company_id', companyId)
      .order('transaction_date', { ascending: false });

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getCompanyFinancialSummary(companyId: string, startDate?: string, endDate?: string) {
    try {
      // For outstanding calculations, we need ALL billings and payments (not filtered by date)
      // This matches the Outstanding Report logic

      // Get ALL service billings for this company (excluding cancelled)
      const { data: allBillings, error: allBillingsError } = await supabase
        .from('service_billings')
        .select('id, total_amount, service_date, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelled');

      if (allBillingsError) {
        console.error('Error loading all billings:', allBillingsError);
        throw allBillingsError;
      }

      // Get ALL advance payments for this company
      const { data: allPayments, error: allPaymentsError } = await supabase
        .from('account_transactions')
        .select('id, amount, transaction_date')
        .eq('company_id', companyId)
        .eq('transaction_type', 'advance_payment')
        .eq('status', 'completed');

      if (allPaymentsError) {
        console.error('Error loading all payments:', allPaymentsError);
        throw allPaymentsError;
      }

      // Get ALL account transactions for credits/debits (not filtered by date)
      const { data: allTransactions, error: allTransactionsError } = await supabase
        .from('account_transactions')
        .select('id, amount, transaction_type')
        .eq('company_id', companyId)
        .in('transaction_type', ['credit', 'debit']);

      if (allTransactionsError) {
        console.error('Error loading all transactions:', allTransactionsError);
        throw allTransactionsError;
      }

      // Calculate totals from ALL billings and payments (not filtered by date)
      const totalBilled = (allBillings || []).reduce((sum, billing) =>
        sum + (parseFloat(billing.total_amount?.toString() || '0')), 0);

      const totalPaid = (allPayments || []).reduce((sum, payment) =>
        sum + (parseFloat(payment.amount?.toString() || '0')), 0);

      const totalCredits = (allTransactions || [])
        .filter(t => t.transaction_type === 'credit' || parseFloat(t.amount?.toString() || '0') > 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount?.toString() || '0')), 0);

      const totalDebits = (allTransactions || [])
        .filter(t => t.transaction_type === 'debit' || parseFloat(t.amount?.toString() || '0') < 0)
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount?.toString() || '0')), 0);

      // Outstanding amount should never be negative (matches Outstanding Report)
      const totalOutstanding = Math.max(0, totalBilled - totalPaid);

      return {
        totalBilled,
        totalPaid,
        totalOutstanding,
        totalCredits,
        totalDebits,
        billingCount: (allBillings || []).length,
        paymentCount: (allPayments || []).length,
        transactionCount: (allTransactions || []).length
      };
    } catch (error) {
      console.error('Error calculating financial summary:', error);
      throw error;
    }
  },

  // Expense Management Functions
  async getExpenses() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('transaction_type', 'expense')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    // Transform data to match Expense interface
    return data?.map(transaction => ({
      id: transaction.id,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount || 0),
      transactionDate: transaction.transaction_date,
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      createdBy: transaction.created_by,
      notes: transaction.notes,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    })) || [];
  },

  async createExpense(expenseData: any) {
    const { data, error } = await supabase
      .from('account_transactions')
      .insert([expenseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateExpense(expenseId: string, expenseData: any) {
    const { data, error } = await supabase
      .from('account_transactions')
      .update(expenseData)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteExpense(expenseId: string) {
    const { error } = await supabase
      .from('account_transactions')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
    return true;
  },

  async getExpensesByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('transaction_type', 'expense')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount || 0),
      transactionDate: transaction.transaction_date,
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      createdBy: transaction.created_by,
      notes: transaction.notes,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    })) || [];
  },

  async getExpensesByCategory(category: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('transaction_type', 'expense')
      .eq('category', category)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      category: transaction.category,
      description: transaction.description,
      amount: parseFloat(transaction.amount || 0),
      transactionDate: transaction.transaction_date,
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      createdBy: transaction.created_by,
      notes: transaction.notes,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at
    })) || [];
  },

  async getExpenseSummaryByCategory(startDate?: string, endDate?: string) {
    let query = supabase
      .from('account_transactions')
      .select('category, amount')
      .eq('transaction_type', 'expense');

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by category and sum amounts
    const summary = data?.reduce((acc, transaction) => {
      const category = transaction.category || 'Uncategorized';
      const amount = parseFloat(transaction.amount || 0);

      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += amount;

      return acc;
    }, {} as Record<string, number>) || {};

    return Object.entries(summary).map(([category, total]) => ({
      category,
      total,
      count: data?.filter(t => (t.category || 'Uncategorized') === category).length || 0
    }));
  },

  // Credit Report Functions
  async getCreditTransactions() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'credit')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      description: transaction.description,
      companyName: transaction.company?.company_name || transaction.individual?.individual_name || 'N/A',
      amount: parseFloat(transaction.amount || 0),
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      category: transaction.category,
      notes: transaction.notes,
      createdAt: transaction.created_at
    })) || [];
  },

  async getCreditTransactionsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'credit')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Debit Report Functions
  async getDebitTransactions() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'debit')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      description: transaction.description,
      companyName: transaction.company?.company_name || transaction.individual?.individual_name || 'N/A',
      amount: parseFloat(transaction.amount || 0),
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      category: transaction.category,
      notes: transaction.notes,
      createdAt: transaction.created_at
    })) || [];
  },

  async getDebitTransactionsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Advance Payment Report Functions
  async getAdvancePaymentTransactions() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'advance_payment')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      description: transaction.description,
      companyName: transaction.company?.company_name || transaction.individual?.individual_name || 'N/A',
      amount: parseFloat(transaction.amount || 0),
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      category: transaction.category,
      notes: transaction.notes,
      createdAt: transaction.created_at
    })) || [];
  },

  async getAdvancePaymentTransactionsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'advance_payment')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Income Management Functions
  async getIncomeTransactions() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'income')
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    return data?.map(transaction => ({
      id: transaction.id,
      date: transaction.transaction_date,
      description: transaction.description,
      companyName: transaction.company?.company_name || transaction.individual?.individual_name || 'N/A',
      amount: parseFloat(transaction.amount || 0),
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      status: transaction.status,
      category: transaction.category,
      notes: transaction.notes,
      createdAt: transaction.created_at
    })) || [];
  },

  async getIncomeTransactionsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name)
      `)
      .eq('transaction_type', 'income')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createIncomeTransaction(incomeData: any) {
    const { data, error } = await supabase
      .from('account_transactions')
      .insert([{
        transaction_type: 'income',
        category: incomeData.category,
        description: incomeData.description,
        amount: incomeData.amount,
        transaction_date: incomeData.transaction_date,
        payment_method: incomeData.payment_method,
        reference_number: incomeData.reference_number,
        status: incomeData.status || 'completed',
        created_by: incomeData.created_by || 'System',
        notes: incomeData.notes,
        company_id: incomeData.company_id,
        individual_id: incomeData.individual_id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateIncomeTransaction(id: string, incomeData: any) {
    const { data, error } = await supabase
      .from('account_transactions')
      .update({
        category: incomeData.category,
        description: incomeData.description,
        amount: incomeData.amount,
        transaction_date: incomeData.transaction_date,
        payment_method: incomeData.payment_method,
        reference_number: incomeData.reference_number,
        status: incomeData.status,
        notes: incomeData.notes,
        company_id: incomeData.company_id,
        individual_id: incomeData.individual_id
      })
      .eq('id', id)
      .eq('transaction_type', 'income')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteIncomeTransaction(id: string) {
    const { data, error } = await supabase
      .from('account_transactions')
      .delete()
      .eq('id', id)
      .eq('transaction_type', 'income')
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Customer Payment Methods
  async getCustomerPaymentMethods(customerId: string, customerType: 'company' | 'individual') {
    const filterColumn = customerType === 'company' ? 'company_id' : 'individual_id';

    const { data, error } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq(filterColumn, customerId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createCustomerPaymentMethod(paymentMethod: {
    customerId: string;
    customerType: 'company' | 'individual';
    paymentType: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
    methodName: string;
    cardNumberLastFour?: string;
    cardHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
    chequeDetails?: string;
    onlinePaymentId?: string;
    isDefault?: boolean;
    notes?: string;
  }) {
    const { customerId, customerType, ...rest } = paymentMethod;

    const data = {
      ...rest,
      company_id: customerType === 'company' ? customerId : null,
      individual_id: customerType === 'individual' ? customerId : null,
      method_name: rest.methodName,
      payment_type: rest.paymentType,
      card_number_last_four: rest.cardNumberLastFour,
      card_holder_name: rest.cardHolderName,
      bank_name: rest.bankName,
      account_number: rest.accountNumber,
      swift_code: rest.swiftCode,
      cheque_details: rest.chequeDetails,
      online_payment_id: rest.onlinePaymentId,
      is_default: rest.isDefault || false,
      is_active: true,
      created_by: 'system'
    };

    // If this is set as default, remove default from other methods
    if (data.is_default) {
      const filterColumn = customerType === 'company' ? 'company_id' : 'individual_id';
      await supabase
        .from('customer_payment_methods')
        .update({ is_default: false })
        .eq(filterColumn, customerId);
    }

    const { data: created, error } = await supabase
      .from('customer_payment_methods')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateCustomerPaymentMethod(id: string, updates: {
    methodName?: string;
    cardNumberLastFour?: string;
    cardHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    iban?: string;
    swiftCode?: string;
    chequeDetails?: string;
    onlinePaymentId?: string;
    isDefault?: boolean;
    isActive?: boolean;
    notes?: string;
  }) {
    const data: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.methodName !== undefined) data.method_name = updates.methodName;
    if (updates.cardNumberLastFour !== undefined) data.card_number_last_four = updates.cardNumberLastFour;
    if (updates.cardHolderName !== undefined) data.card_holder_name = updates.cardHolderName;
    if (updates.bankName !== undefined) data.bank_name = updates.bankName;
    if (updates.accountNumber !== undefined) data.account_number = updates.accountNumber;
    if (updates.iban !== undefined) data.iban = updates.iban;
    if (updates.swiftCode !== undefined) data.swift_code = updates.swiftCode;
    if (updates.chequeDetails !== undefined) data.cheque_details = updates.chequeDetails;
    if (updates.onlinePaymentId !== undefined) data.online_payment_id = updates.onlinePaymentId;
    if (updates.isDefault !== undefined) data.is_default = updates.isDefault;
    if (updates.isActive !== undefined) data.is_active = updates.isActive;
    if (updates.notes !== undefined) data.notes = updates.notes;

    const { data: updated, error } = await supabase
      .from('customer_payment_methods')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async deleteCustomerPaymentMethod(id: string) {
    const { error } = await supabase
      .from('customer_payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setDefaultCustomerPaymentMethod(id: string, customerId: string, customerType: 'company' | 'individual') {
    const filterColumn = customerType === 'company' ? 'company_id' : 'individual_id';

    // First, remove default status from all methods for this customer
    await supabase
      .from('customer_payment_methods')
      .update({ is_default: false })
      .eq(filterColumn, customerId);

    // Then set the specified method as default
    const { data, error } = await supabase
      .from('customer_payment_methods')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ============================================================================
  // ADVANCE PAYMENT APPLICATION FUNCTIONS
  // ============================================================================
  // These functions manage the application of advance payments (receipts) to service billings

  /**
   * Get available advance payment balance for a customer
   * Calculates: Total Advance Payments - Total Applied Amounts
   */
  async getAvailableAdvanceBalance(customerId: string, customerType: 'company' | 'individual') {
    try {
      // Get all advance payment receipts for this customer
      const { data: receipts, error: receiptsError } = await supabase
        .from('account_transactions')
        .select('id, amount')
        .eq(customerType === 'company' ? 'company_id' : 'individual_id', customerId)
        .eq('transaction_type', 'advance_payment')
        .eq('status', 'completed');

      if (receiptsError) throw receiptsError;

      const totalAdvancePayments = receipts?.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0) || 0;

      // Get all applications of these receipts
      const receiptIds = receipts?.map(r => r.id) || [];

      let totalApplied = 0;
      if (receiptIds.length > 0) {
        const { data: applications, error: applicationsError } = await supabase
          .from('advance_payment_applications')
          .select('applied_amount')
          .in('receipt_transaction_id', receiptIds);

        if (applicationsError) throw applicationsError;

        totalApplied = applications?.reduce((sum, a) => sum + parseFloat(a.applied_amount || 0), 0) || 0;
      }

      const availableBalance = totalAdvancePayments - totalApplied;

      return {
        totalAdvancePayments,
        totalApplied,
        availableBalance,
        receipts: receipts || []
      };
    } catch (error) {
      console.error('Error getting available advance balance:', error);
      throw error;
    }
  },

  /**
   * Get available balance for a specific receipt
   */
  async getReceiptAvailableBalance(receiptTransactionId: string) {
    try {
      // Get the receipt amount
      const { data: receipt, error: receiptError } = await supabase
        .from('account_transactions')
        .select('amount')
        .eq('id', receiptTransactionId)
        .single();

      if (receiptError) throw receiptError;

      const receiptAmount = parseFloat(receipt.amount || 0);

      // Get total applied from this receipt
      const { data: applications, error: applicationsError } = await supabase
        .from('advance_payment_applications')
        .select('applied_amount')
        .eq('receipt_transaction_id', receiptTransactionId);

      if (applicationsError) throw applicationsError;

      const totalApplied = applications?.reduce((sum, a) => sum + parseFloat(a.applied_amount || 0), 0) || 0;
      const availableBalance = receiptAmount - totalApplied;

      return {
        receiptAmount,
        totalApplied,
        availableBalance,
        isFullyUtilized: availableBalance <= 0
      };
    } catch (error) {
      console.error('Error getting receipt available balance:', error);
      throw error;
    }
  },

  /**
   * Apply an advance payment (receipt) to a service billing
   */
  async applyAdvancePaymentToBilling(
    receiptTransactionId: string,
    billingId: string,
    appliedAmount: number,
    userId?: string
  ) {
    try {
      // Validate that receipt has enough available balance
      const receiptBalance = await this.getReceiptAvailableBalance(receiptTransactionId);

      if (appliedAmount > receiptBalance.availableBalance) {
        throw new Error(`Cannot apply AED ${appliedAmount}. Only AED ${receiptBalance.availableBalance} available in this receipt.`);
      }

      // Get billing outstanding amount
      const { data: billing, error: billingError } = await supabase
        .from('service_billings')
        .select('total_amount, id')
        .eq('id', billingId)
        .single();

      if (billingError) throw billingError;

      // Calculate current outstanding for this billing
      const billingWithPayments = await this.calculateOutstandingAmounts([billing]);
      const outstandingAmount = billingWithPayments[0]?.outstandingAmount || 0;

      if (appliedAmount > outstandingAmount) {
        throw new Error(`Cannot apply AED ${appliedAmount}. Only AED ${outstandingAmount} outstanding on this billing.`);
      }

      // Create the application record
      const { data: application, error: applicationError } = await supabase
        .from('advance_payment_applications')
        .insert([{
          receipt_transaction_id: receiptTransactionId,
          billing_id: billingId,
          applied_amount: appliedAmount,
          application_date: new Date().toISOString().split('T')[0],
          created_by: userId || 'system',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (applicationError) throw applicationError;

      console.log('✅ Advance payment applied successfully:', application);

      return application;
    } catch (error) {
      console.error('Error applying advance payment:', error);
      throw error;
    }
  },

  /**
   * Get all applications for a specific billing
   */
  async getBillingPaymentApplications(billingId: string) {
    try {
      const { data, error } = await supabase
        .from('advance_payment_applications')
        .select(`
          *,
          receipt:account_transactions!receipt_transaction_id(
            id,
            amount,
            reference_number,
            transaction_date,
            payment_method
          )
        `)
        .eq('billing_id', billingId)
        .order('application_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting billing payment applications:', error);
      throw error;
    }
  },

  /**
   * Get all applications for a specific receipt
   */
  async getReceiptApplications(receiptTransactionId: string) {
    try {
      const { data, error } = await supabase
        .from('advance_payment_applications')
        .select(`
          *,
          billing:service_billings(
            id,
            invoice_number,
            total_amount,
            service_date,
            company:companies(company_name),
            individual:individuals(individual_name)
          )
        `)
        .eq('receipt_transaction_id', receiptTransactionId)
        .order('application_date', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting receipt applications:', error);
      throw error;
    }
  },

  /**
   * Remove/unapply an advance payment application
   */
  async removeAdvancePaymentApplication(applicationId: string) {
    try {
      const { error } = await supabase
        .from('advance_payment_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      console.log('✅ Advance payment application removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing advance payment application:', error);
      throw error;
    }
  },

  /**
   * Get customer's advance payment receipts with utilization status
   */
  async getCustomerAdvanceReceipts(customerId: string, customerType: 'company' | 'individual') {
    try {
      // Get all advance payment receipts
      const { data: receipts, error: receiptsError } = await supabase
        .from('account_transactions')
        .select('*')
        .eq(customerType === 'company' ? 'company_id' : 'individual_id', customerId)
        .eq('transaction_type', 'advance_payment')
        .eq('status', 'completed')
        .order('transaction_date', { ascending: false });

      if (receiptsError) throw receiptsError;

      // For each receipt, calculate utilization
      const receiptsWithUtilization = await Promise.all(
        (receipts || []).map(async (receipt) => {
          const balance = await this.getReceiptAvailableBalance(receipt.id);
          const applications = await this.getReceiptApplications(receipt.id);

          return {
            ...receipt,
            receiptAmount: balance.receiptAmount,
            totalApplied: balance.totalApplied,
            availableBalance: balance.availableBalance,
            isFullyUtilized: balance.isFullyUtilized,
            utilizationPercentage: (balance.totalApplied / balance.receiptAmount) * 100,
            applications: applications
          };
        })
      );

      return receiptsWithUtilization;
    } catch (error) {
      console.error('Error getting customer advance receipts:', error);
      throw error;
    }
  },

  /**
   * Automatically apply advance payment to customer's unpaid billings
   * Applies to oldest billings first until the advance payment is fully utilized
   */
  async autoApplyAdvancePayment(
    receiptTransactionId: string,
    customerId: string,
    customerType: 'company' | 'individual',
    userId?: string
  ) {
    try {
      console.log('🤖 Auto-applying advance payment:', { receiptTransactionId, customerId, customerType });

      // Get the receipt balance
      const receiptBalance = await this.getReceiptAvailableBalance(receiptTransactionId);
      let remainingAmount = receiptBalance.availableBalance;

      if (remainingAmount <= 0) {
        console.log('⚠️ No available balance to apply');
        return { applied: false, message: 'No available balance to apply', applications: [] };
      }

      // Get all unpaid billings for this customer (oldest first)
      const { data: billings, error: billingsError } = await supabase
        .from('service_billings')
        .select('*')
        .eq(customerType === 'company' ? 'company_id' : 'individual_id', customerId)
        .order('service_date', { ascending: true }); // Oldest first

      if (billingsError) throw billingsError;

      if (!billings || billings.length === 0) {
        console.log('ℹ️ No billings found for this customer');
        return { applied: false, message: 'No billings to apply to', applications: [] };
      }

      // Calculate outstanding amounts for all billings
      const billingsWithOutstanding = await this.calculateOutstandingAmounts(billings);

      // Filter to only unpaid billings
      const unpaidBillings = billingsWithOutstanding.filter(b => b.outstandingAmount > 0);

      if (unpaidBillings.length === 0) {
        console.log('ℹ️ No unpaid billings found for this customer');
        return { applied: false, message: 'No unpaid billings to apply to', applications: [] };
      }

      console.log(`📋 Found ${unpaidBillings.length} unpaid billings`);

      // Apply to each billing until advance payment is exhausted
      const applications = [];
      for (const billing of unpaidBillings) {
        if (remainingAmount <= 0) break;

        const amountToApply = Math.min(remainingAmount, billing.outstandingAmount);

        console.log(`💰 Applying AED ${amountToApply} to billing ${billing.invoice_number}`);

        // Create application
        const application = await this.applyAdvancePaymentToBilling(
          receiptTransactionId,
          billing.id,
          amountToApply,
          userId
        );

        applications.push({
          ...application,
          billingInvoiceNumber: billing.invoice_number,
          appliedAmount: amountToApply
        });

        remainingAmount -= amountToApply;
      }

      console.log(`✅ Auto-applied advance payment to ${applications.length} billings`);

      return {
        applied: true,
        message: `Applied to ${applications.length} billing${applications.length > 1 ? 's' : ''}`,
        applications,
        totalApplied: receiptBalance.availableBalance - remainingAmount,
        remainingBalance: remainingAmount
      };
    } catch (error) {
      console.error('Error auto-applying advance payment:', error);
      throw error;
    }
  }
}
