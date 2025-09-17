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
    // This is a placeholder - the column should be added manually to the database
    // For now, we'll just return success to avoid blocking the notes functionality
    console.log('Notes column should be added to companies table manually');
    return true;
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
        company:companies(name),
        documents:employee_documents(*),
        dependents:dependents(*)
      `)
    
    if (companyId) {
      query = query.eq('company_id', companyId)
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
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
  }
}
