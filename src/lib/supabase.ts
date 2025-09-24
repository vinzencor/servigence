import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    // Filter by assigned user if not super admin
    if (userId && userRole === 'staff') {
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

    // Filter by assigned user if not super admin
    if (userId && userRole !== 'super_admin') {
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
        assigned_employee:service_employees(name)
      `)
      .order('created_at', { ascending: false });

    // Simplified filtering - only filter if user is staff role
    if (userId && userRole === 'staff') {
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
    const { data, error } = await supabase
      .from('service_billings')
      .insert([billing])
      .select()
      .single()

    if (error) throw error
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
  }
}
