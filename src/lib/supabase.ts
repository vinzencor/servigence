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
  async getCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single()

    if (error) throw error
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

      // 4. Delete all service billings for this company (but preserve invoices)
      // We'll keep service_billings as they contain invoice information
      // Just update them to mark company as deleted
      await supabase
        .from('service_billings')
        .update({ company_id: null, notes: 'Company deleted - ' + new Date().toISOString() })
        .eq('company_id', id);

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
  async getIndividuals() {
    const { data, error } = await supabase
      .from('individuals')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
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
  async getServiceBillings() {
    const { data, error } = await supabase
      .from('service_billings')
      .select(`
        *,
        company:companies(company_name),
        individual:individuals(individual_name),
        service_type:service_types(name, typing_charges, government_charges),
        assigned_employee:service_employees(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
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

  // Accounts
  async getAccountTransactions() {
    const { data, error } = await supabase
      .from('account_transactions')
      .select(`
        *,
        company:companies(name),
        service_billing:service_billings(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createAccountTransaction(transaction: any) {
    const { data, error } = await supabase
      .from('account_transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) throw error
    return data
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

  // Vendors
  async getVendors() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
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

  async updateVendor(id: string, updates: any) {
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteVendor(id: string) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }
}
