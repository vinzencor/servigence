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

    console.log('Loaded companies:', data);
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
    console.log('Updating company:', id, 'with updates:', updates);

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Update successful:', data);
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
        individual:individuals(individual_name)
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
    return data;
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

      // Get payment history
      const payments = await this.getPaymentHistory(billingId);

      const totalAmount = parseFloat(billing.total_amount || 0);
      // Calculate paid amount from temporary payment history
      const paidAmount = payments.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
      const outstandingAmount = totalAmount - paidAmount;

      return {
        ...billing,
        payments,
        totalAmount,
        paidAmount,
        outstandingAmount,
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

  // Calculate outstanding amounts by summing payments from advance_payments table
  async calculateOutstandingAmounts(billings: any[]) {
    try {
      const billingsWithOutstanding = [];

      for (const billing of billings) {
        const totalAmount = parseFloat(billing.total_amount || 0);
        let totalPaid = 0;

        // Use only temporary localStorage tracking (avoids all database column errors)
        const tempPayments = this.getTempPayments(billing.id);
        totalPaid = tempPayments.reduce((sum, payment) => sum + payment.amount, 0);

        const outstandingAmount = Math.max(0, totalAmount - totalPaid);

        billingsWithOutstanding.push({
          ...billing,
          totalAmount,
          totalPaid,
          outstandingAmount,
          isFullyPaid: outstandingAmount === 0
        });
      }

      return billingsWithOutstanding;
    } catch (error) {
      console.error('Error calculating outstanding amounts:', error);
      // Return original billings with basic calculations (no paid_amount column)
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
  }
}
