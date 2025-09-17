export interface Company {
  id: string;
  companyName: string;
  vatTrnNo?: string;
  phone1: string;
  phone2?: string;
  email1: string;
  email2?: string;
  address?: string;
  companyType: string;
  licenseNo?: string;
  mohreNo?: string;
  moiNo?: string;
  quota?: string;
  companyGrade: string;
  creditLimit: number;
  creditLimitDays: number;
  proName?: string;
  proPhone?: string;
  proEmail?: string;
  dateOfRegistration: string;
  createdBy: string;
  status: 'active' | 'inactive' | 'pending';
  employeeCount?: number;
  lastActivity?: string;
  notes?: string;
}

export interface Individual {
  id: string;
  individualName: string;
  nationality?: string;
  phone1: string;
  phone2?: string;
  email1: string;
  email2?: string;
  address?: string;
  idNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  emiratesId?: string;
  emiratesIdExpiry?: string;
  visaNumber?: string;
  visaExpiry?: string;
  licenseNumber?: string;
  creditLimit: number;
  creditLimitDays: number;
  dateOfRegistration: string;
  createdBy: string;
  status: 'active' | 'inactive' | 'pending';
  lastActivity?: string;
}

export interface Employee {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  visaStatus: 'active' | 'pending' | 'expired' | 'cancelled';
  visaType: 'employment' | 'investor' | 'partner' | 'freelance';
  visaNumber?: string;
  visaIssueDate?: string;
  visaExpiryDate?: string;
  emiratesId?: string;
  emiratesIdExpiry?: string;
  laborCardNumber?: string;
  laborCardExpiry?: string;
  joinDate: string;
  salary?: number;
  department: string;
  manager?: string;
  status: 'active' | 'inactive' | 'terminated';
  profileImage?: string;
  documents: EmployeeDocument[];
  dependents: Dependent[];
}

export interface Dependent {
  id: string;
  employeeId: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent';
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  visaStatus: 'active' | 'pending' | 'expired' | 'cancelled';
  visaNumber?: string;
  visaIssueDate?: string;
  visaExpiryDate?: string;
  emiratesId?: string;
  emiratesIdExpiry?: string;
  dateOfBirth: string;
  documents: DependentDocument[];
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: 'passport' | 'visa' | 'emirates_id' | 'labor_card' | 'educational_certificate' | 'experience_certificate' | 'medical_certificate' | 'other';
  name: string;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  fileUrl?: string;
}

export interface DependentDocument {
  id: string;
  dependentId: string;
  type: 'passport' | 'visa' | 'emirates_id' | 'birth_certificate' | 'marriage_certificate' | 'other';
  name: string;
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  fileUrl?: string;
}

export interface Vendor {
  id: string;
  name: string;
  type: 'insurance' | 'tax_consultant' | 'tax_payer' | 'legal_services' | 'translation' | 'attestation' | 'other';
  email: string;
  phone: string;
  address?: string;
  services: string[];
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  contactPerson?: string;
  website?: string;
  licenseNumber?: string;
  vatNumber?: string;
  paymentTerms?: string;
  notes?: string;
  contracts: VendorContract[];
  performanceMetrics: {
    totalJobs: number;
    completedJobs: number;
    averageRating: number;
    onTimeDelivery: number;
  };
}

export interface VendorContract {
  id: string;
  vendorId: string;
  title: string;
  type: 'service_agreement' | 'retainer' | 'project_based' | 'annual_contract';
  startDate: string;
  endDate: string;
  value: number;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  terms?: string;
  renewalDate?: string;
}

export interface Service {
  id: string;
  name: string;
  type: 'company_formation' | 'visa' | 'attestation' | 'pro_services' | 'translation' | 'regulatory';
  companyId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  startDate: string;
  dueDate: string;
  amount: number;
  governmentFees?: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  services: Service[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'visa_renewal' | 'license_renewal' | 'document_expiry' | 'follow_up' | 'payment_due' | 'contract_renewal' | 'other';
  companyId?: string;
  employeeId?: string;
  vendorId?: string;
  date: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  assignedTo?: string;
  createdBy: string;
  createdDate: string;
  completedDate?: string;
  notes?: string;
  attachments?: string[];
}

export interface ServiceType {
  id: string;
  name: string;
  category: string;
  typingCharges: number;
  governmentCharges: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBilling {
  id: string;
  companyId?: string;
  individualId?: string;
  serviceTypeId: string;
  assignedEmployeeId?: string;
  serviceDate: string;
  cashType: 'cash' | 'house' | 'car' | 'service_agency' | 'service_building';
  typingCharges: number;
  governmentCharges: number;
  totalAmount: number;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  invoiceGenerated: boolean;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  company?: Company;
  individual?: Individual;
  serviceType?: ServiceType;
  assignedEmployee?: ServiceEmployee;
}

export interface CompanyDocument {
  id: string;
  companyId: string;
  title: string;
  content?: string;
  documentType: 'note' | 'file' | 'mixed';
  fileAttachments: FileAttachment[];
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileAttachment {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
}

export interface Account {
  id: string;
  serviceBillingId?: string;
  companyId?: string;
  individualId?: string;
  transactionType: 'service_charge' | 'government_fee' | 'expense' | 'refund';
  category: string;
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card';
  referenceNumber?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}