import { Company, Employee, Vendor, Service, Invoice, Reminder, EmployeeDocument, Dependent } from '../types';

export const mockCompanies: Company[] = [
  {
    id: '1',
    companyName: 'Al Manara Trading LLC',
    vatTrnNo: 'TRN100234567890123',
    phone1: '+971-4-123-4567',
    phone2: '+971-50-123-4567',
    email1: 'admin@almanara.ae',
    email2: 'finance@almanara.ae',
    address: 'Office 1204, Al Manara Tower, Business Bay, Dubai, UAE',
    companyType: 'Limited Liability Company',
    licenseNo: 'DED-123456',
    mohreNo: 'MOH-789123',
    moiNo: 'MOI-456789',
    quota: '15',
    companyGrade: 'Grade A',
    creditLimit: 50000,
    creditLimitDays: 30,
    proName: 'Ahmed Al-Rashid',
    proPhone: '+971-55-987-6543',
    proEmail: 'ahmed@proservices.ae',
    dateOfRegistration: '2024-01-15',
    createdBy: 'Sarah Khan',
    status: 'active',
    employeeCount: 12,
    lastActivity: '2024-01-20'
  },
  {
    id: '2',
    companyName: 'Emirates Tech Solutions',
    vatTrnNo: 'TRN100987654321098',
    phone1: '+971-4-987-6543',
    email1: 'contact@emiratestech.ae',
    address: 'Suite 505, Emirates Tower, Sheikh Zayed Road, Dubai, UAE',
    companyType: 'Free Zone Company',
    licenseNo: 'DMCC-98765',
    companyGrade: 'Grade A+',
    creditLimit: 75000,
    creditLimitDays: 45,
    proName: 'Fatima Al-Zahra',
    proPhone: '+971-56-123-7890',
    proEmail: 'fatima@proservices.ae',
    dateOfRegistration: '2024-01-10',
    createdBy: 'Omar Hassan',
    status: 'active',
    employeeCount: 8,
    lastActivity: '2024-01-19'
  },
  {
    id: '3',
    companyName: 'Gulf Construction Co.',
    phone1: '+971-2-345-6789',
    email1: 'info@gulfconstruction.ae',
    address: 'Plot 15, Industrial Area, Abu Dhabi, UAE',
    companyType: 'Construction Company',
    licenseNo: 'ADM-54321',
    companyGrade: 'Grade B+',
    creditLimit: 100000,
    creditLimitDays: 60,
    dateOfRegistration: '2024-01-05',
    createdBy: 'Layla Ahmed',
    status: 'pending',
    employeeCount: 25,
    lastActivity: '2024-01-18'
  }
];

export const mockEmployees: Employee[] = [
  {
    id: '1',
    companyId: '1',
    employeeId: 'EMP-001',
    name: 'Mohammed Ali',
    position: 'General Manager',
    email: 'mohammed@almanara.ae',
    phone: '+971-50-234-5678',
    nationality: 'Egyptian',
    passportNumber: 'A12345678',
    passportExpiry: '2027-05-15',
    visaStatus: 'active',
    visaType: 'employment',
    visaNumber: 'V123456789',
    visaIssueDate: '2023-06-01',
    visaExpiryDate: '2025-06-01',
    emiratesId: '784-1990-1234567-8',
    emiratesIdExpiry: '2025-05-30',
    laborCardNumber: 'LC123456',
    laborCardExpiry: '2025-06-01',
    joinDate: '2023-06-15',
    salary: 15000,
    department: 'Management',
    manager: 'CEO',
    status: 'active',
    documents: [
      {
        id: 'doc1',
        employeeId: '1',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'mohammed_passport.pdf',
        uploadDate: '2023-06-01',
        expiryDate: '2027-05-15',
        status: 'valid'
      },
      {
        id: 'doc2',
        employeeId: '1',
        type: 'visa',
        name: 'Employment Visa',
        fileName: 'mohammed_visa.pdf',
        uploadDate: '2023-06-01',
        expiryDate: '2025-06-01',
        status: 'valid'
      }
    ],
    dependents: [
      {
        id: 'dep1',
        employeeId: '1',
        name: 'Fatima Ali',
        relationship: 'spouse',
        nationality: 'Egyptian',
        passportNumber: 'B87654321',
        passportExpiry: '2026-08-20',
        visaStatus: 'active',
        visaNumber: 'V987654321',
        visaIssueDate: '2023-07-01',
        visaExpiryDate: '2025-07-01',
        emiratesId: '784-1992-9876543-2',
        emiratesIdExpiry: '2025-06-30',
        dateOfBirth: '1992-03-10',
        documents: []
      }
    ]
  },
  {
    id: '2',
    companyId: '1',
    employeeId: 'EMP-002',
    name: 'Priya Sharma',
    position: 'Accountant',
    email: 'priya@almanara.ae',
    phone: '+971-55-345-6789',
    nationality: 'Indian',
    passportNumber: 'P98765432',
    passportExpiry: '2028-12-10',
    visaStatus: 'active',
    visaType: 'employment',
    visaNumber: 'V234567890',
    visaIssueDate: '2023-08-01',
    visaExpiryDate: '2025-08-01',
    emiratesId: '784-1995-2345678-9',
    emiratesIdExpiry: '2025-07-30',
    laborCardNumber: 'LC234567',
    laborCardExpiry: '2025-08-01',
    joinDate: '2023-08-20',
    salary: 8000,
    department: 'Finance',
    manager: 'Mohammed Ali',
    status: 'active',
    documents: [
      {
        id: 'doc3',
        employeeId: '2',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'priya_passport.pdf',
        uploadDate: '2023-08-01',
        expiryDate: '2028-12-10',
        status: 'valid'
      }
    ],
    dependents: []
  },
  {
    id: '3',
    companyId: '2',
    employeeId: 'EMP-003',
    name: 'John Smith',
    position: 'IT Director',
    email: 'john@emiratestech.ae',
    phone: '+971-50-456-7890',
    nationality: 'British',
    passportNumber: 'GB123456789',
    passportExpiry: '2029-03-15',
    visaStatus: 'pending',
    visaType: 'employment',
    joinDate: '2024-01-01',
    salary: 18000,
    department: 'Technology',
    status: 'active',
    documents: [
      {
        id: 'doc4',
        employeeId: '3',
        type: 'passport',
        name: 'Passport Copy',
        fileName: 'john_passport.pdf',
        uploadDate: '2024-01-01',
        expiryDate: '2029-03-15',
        status: 'valid'
      }
    ],
    dependents: [
      {
        id: 'dep2',
        employeeId: '3',
        name: 'Sarah Smith',
        relationship: 'spouse',
        nationality: 'British',
        passportNumber: 'GB987654321',
        passportExpiry: '2027-11-20',
        visaStatus: 'pending',
        dateOfBirth: '1988-07-22',
        documents: []
      },
      {
        id: 'dep3',
        employeeId: '3',
        name: 'Emma Smith',
        relationship: 'child',
        nationality: 'British',
        passportNumber: 'GB456789123',
        passportExpiry: '2029-01-10',
        visaStatus: 'pending',
        dateOfBirth: '2015-09-05',
        documents: []
      }
    ]
  }
];

export const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'Emirates Insurance Brokers',
    type: 'insurance',
    email: 'contact@emiratesinsurance.ae',
    phone: '+971-4-555-1234',
    address: 'Insurance House, DIFC, Dubai, UAE',
    services: ['Health Insurance', 'Life Insurance', 'General Insurance'],
    rating: 4.8
  },
  {
    id: '2',
    name: 'Gulf Tax Consultants',
    type: 'tax_consultant',
    email: 'info@gulftax.ae',
    phone: '+971-4-555-5678',
    address: 'Tax Plaza, Business Bay, Dubai, UAE',
    services: ['VAT Registration', 'Tax Filing', 'Tax Advisory'],
    rating: 4.9
  },
  {
    id: '3',
    name: 'Dubai Translation Services',
    type: 'other',
    email: 'services@dubaitranslation.ae',
    phone: '+971-4-555-9999',
    services: ['Document Translation', 'Legal Translation', 'Certified Translation'],
    rating: 4.7
  }
];

export const mockServices: Service[] = [
  {
    id: '1',
    name: 'Company Formation - Al Manara Trading LLC',
    type: 'company_formation',
    companyId: '1',
    status: 'completed',
    assignedTo: 'Ahmed Al-Rashid',
    startDate: '2024-01-10',
    dueDate: '2024-01-20',
    amount: 8500,
    governmentFees: 2500
  },
  {
    id: '2',
    name: 'Employee Visa Processing',
    type: 'visa',
    companyId: '2',
    status: 'in_progress',
    assignedTo: 'Fatima Al-Zahra',
    startDate: '2024-01-15',
    dueDate: '2024-01-25',
    amount: 3200,
    governmentFees: 1200
  },
  {
    id: '3',
    name: 'Document Attestation',
    type: 'attestation',
    companyId: '3',
    status: 'pending',
    startDate: '2024-01-20',
    dueDate: '2024-01-30',
    amount: 1500,
    governmentFees: 500
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    companyId: '1',
    companyName: 'Al Manara Trading LLC',
    invoiceNumber: 'INV-2024-001',
    date: '2024-01-20',
    dueDate: '2024-02-19',
    services: [mockServices[0]],
    subtotal: 8500,
    tax: 425,
    total: 8925,
    status: 'paid'
  },
  {
    id: '2',
    companyId: '2',
    companyName: 'Emirates Tech Solutions',
    invoiceNumber: 'INV-2024-002',
    date: '2024-01-18',
    dueDate: '2024-02-17',
    services: [mockServices[1]],
    subtotal: 3200,
    tax: 160,
    total: 3360,
    status: 'sent'
  }
];

export const mockReminders: Reminder[] = [
  {
    id: '1',
    title: 'License Renewal - Al Manara Trading LLC',
    description: 'Annual trade license renewal due',
    type: 'license_renewal',
    companyId: '1',
    date: '2024-02-15',
    priority: 'high',
    status: 'pending'
  },
  {
    id: '2',
    title: 'Visa Renewal - John Smith',
    description: 'Employment visa renewal required',
    type: 'visa_renewal',
    companyId: '2',
    date: '2024-01-30',
    priority: 'urgent',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Follow-up Call - Gulf Construction Co.',
    description: 'Schedule follow-up call for pending services',
    type: 'follow_up',
    companyId: '3',
    date: '2024-01-25',
    priority: 'medium',
    status: 'pending'
  }
];