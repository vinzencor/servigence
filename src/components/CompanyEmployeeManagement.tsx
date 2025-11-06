import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Upload, Eye, EyeOff, Edit, Trash2, FileText, Calendar, Phone, Mail, User, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Company, Employee } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DocumentEditModal from './DocumentEditModal';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

interface CompanyEmployeeManagementProps {
  company: Company;
  onBack: () => void;
}

const CompanyEmployeeManagement: React.FC<CompanyEmployeeManagementProps> = ({ company, onBack }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState('');
  const [employeeDocuments, setEmployeeDocuments] = useState<any[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<any[]>([]);
  const [customDocuments, setCustomDocuments] = useState<any[]>([]);
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);
  const [newCustomDoc, setNewCustomDoc] = useState({ name: '', hasNumber: true, hasExpiry: true });
  const [showPassportSection, setShowPassportSection] = useState(false);
  const [showEmiratesIdSection, setShowEmiratesIdSection] = useState(false);
  const [showVisaSection, setShowVisaSection] = useState(false);
  const [showLaborCardSection, setShowLaborCardSection] = useState(false);
  const [showDocumentEdit, setShowDocumentEdit] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Service-based document management state
  const [services, setServices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Array<{
    id: string;
    expiryDate: string;
    serviceId?: string;
    file: File | null;
    fileUrl?: string;
    preview?: string;
    uploading?: boolean;
  }>>([]);

  // Image preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');
  const [modalImageTitle, setModalImageTitle] = useState('');

  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    name: '',
    position: '',
    email: '',
    phone: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: '',
    visaType: 'employment' as const,
    visaNumber: '',
    visaIssueDate: '',
    visaExpiryDate: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    laborCardNumber: '',
    laborCardExpiry: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: '',
    department: '',
    manager: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadEmployees();
    loadServices();
  }, [company.id]);

  // Load employee documents when an employee is selected for editing
  useEffect(() => {
    if (selectedEmployee && showEditEmployee) {
      loadEmployeeServiceDocuments(selectedEmployee.id);
    }
  }, [selectedEmployee, showEditEmployee]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      console.log('Loading employees for company:', company.id);
      const employeeData = await dbHelpers.getEmployees(company.id);
      console.log('Loaded employees:', employeeData);
      setEmployees(employeeData || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Load services for document management
  const loadServices = async () => {
    try {
      const serviceData = await dbHelpers.getServices();
      setServices(serviceData || []);
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  // Load employee documents for service-based document management
  const loadEmployeeServiceDocuments = async (employeeId: string) => {
    try {
      console.log('🔄 Loading service-based documents for employee:', employeeId);
      const docs = await dbHelpers.getEmployeeDocuments(employeeId);
      console.log('📄 Raw employee documents from database:', docs);

      // Transform to match our document state structure
      const transformedDocs = (docs || []).map((doc: any) => ({
        id: doc.id,
        expiryDate: doc.expiry_date || '',
        serviceId: doc.service_id || undefined,
        file: null,
        fileUrl: doc.file_path || '',
        preview: 'existing-file'
      }));

      console.log('✅ Transformed service-based documents:', transformedDocs);
      setDocuments(transformedDocs);

      // Generate previews for existing files
      transformedDocs.forEach(doc => {
        if (doc.fileUrl) {
          generateExistingFilePreview(doc.fileUrl, doc.id);
        }
      });
    } catch (error) {
      console.error('❌ Error loading employee service documents:', error);
      setDocuments([]);
    }
  };

  // Document management functions
  const addDocument = () => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = {
      id: tempId,
      expiryDate: '',
      file: null,
      preview: undefined
    };
    setDocuments([...documents, newDoc]);
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setDocuments(docs => docs.map(doc =>
      doc.id === id ? { ...doc, [field]: value } : doc
    ));
  };

  const removeDocument = (id: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  };

  // Enhanced file upload handler with image preview
  const handleFileUpload = (id: string, file: File, inputElement?: HTMLInputElement) => {
    console.log('📁 Employee file upload initiated:', {
      docId: id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Set uploading state
    updateDocument(id, 'uploading', true);

    // Update the file immediately
    updateDocument(id, 'file', file);

    // Clear the input value to allow re-selecting the same file
    if (inputElement) {
      inputElement.value = '';
    }

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      console.log('📸 Processing employee image file...');
      const reader = new FileReader();

      reader.onload = (e) => {
        const preview = e.target?.result as string;
        console.log('✅ Employee preview generated successfully:', {
          fileName: file.name,
          previewLength: preview?.length,
          previewStart: preview?.substring(0, 50) + '...'
        });
        updateDocument(id, 'preview', preview);
        updateDocument(id, 'uploading', false);
      };

      reader.onerror = (error) => {
        console.error('❌ Error reading employee file:', error);
        updateDocument(id, 'preview', 'error');
        updateDocument(id, 'uploading', false);
      };

      reader.readAsDataURL(file);
    } else {
      console.log('📄 Non-image employee file, setting placeholder preview');
      updateDocument(id, 'preview', 'non-image');
      updateDocument(id, 'uploading', false);
    }
  };

  // Function to generate preview for existing employee files
  const generateExistingFilePreview = (fileUrl: string, docId: string) => {
    try {
      console.log('🔍 Generating preview for existing employee file:', { fileUrl, docId });

      // Extract file extension from URL
      const urlParts = fileUrl.split('?')[0]; // Remove query parameters
      const extension = urlParts.split('.').pop()?.toLowerCase();

      console.log('📄 Employee file extension detected:', extension);

      // Check if it's an image based on extension
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

      if (extension && imageExtensions.includes(extension)) {
        console.log('🖼️ Setting image preview for employee file:', fileUrl);
        // For images, set the URL directly as preview
        updateDocument(docId, 'preview', fileUrl);
      } else if (extension === 'pdf') {
        console.log('📋 Setting PDF preview for employee file:', fileUrl);
        // For PDFs, set a special preview type
        updateDocument(docId, 'preview', 'existing-pdf');
      } else {
        console.log('📁 Setting generic file preview for employee file:', fileUrl);
        // For other files, keep the existing-file preview
        updateDocument(docId, 'preview', 'existing-file');
      }
    } catch (error) {
      console.error('Error generating preview for existing employee file:', error);
      // Fallback to existing-file preview
      updateDocument(docId, 'preview', 'existing-file');
    }
  };

  // Create reminder for employee document expiry
  const createEmployeeDocumentReminder = async (employeeId: string, employeeName: string, documentTitle: string, expiryDate: string, serviceId?: string) => {
    try {
      console.log('📅 Creating reminder for employee document:', {
        employeeId,
        employeeName,
        documentTitle,
        expiryDate,
        serviceId
      });

      const reminderDate = new Date(expiryDate);
      reminderDate.setDate(reminderDate.getDate() - 10); // 10 days before expiry

      const reminderData = {
        title: `${documentTitle} Expiry Reminder`,
        description: `${documentTitle} for employee ${employeeName} will expire on ${new Date(expiryDate).toLocaleDateString()}. Please renew this document before the expiry date.`,
        reminder_date: reminderDate.toISOString().split('T')[0],
        reminder_type: 'document_expiry',
        document_type: 'employee_document',
        employee_id: employeeId,
        company_id: company.id,
        service_id: serviceId || null,
        priority: 'high',
        status: 'active',
        days_before_reminder: 10,
        enabled: true,
        created_by: user?.name || 'System',
        assigned_to: user?.name || 'System'
      };

      console.log('Creating employee document reminder with data:', reminderData);

      const { error } = await supabase
        .from('reminders')
        .insert([reminderData]);

      if (error) {
        console.error('❌ Error creating employee document reminder:', error);
        toast.error(`Failed to create reminder for ${documentTitle}`);
      } else {
        console.log('✅ Employee document reminder created successfully for:', documentTitle);

        // Dispatch event to notify other components about reminder creation
        window.dispatchEvent(new CustomEvent('reminderCreated', {
          detail: { employeeId, documentTitle, expiryDate, employeeName }
        }));
      }
    } catch (error) {
      console.error('Error in createEmployeeDocumentReminder:', error);
    }
  };

  // Validation for creating new employees
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeForm.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!employeeForm.name.trim()) newErrors.name = 'Name is required';
    // Position is now optional
    // if (!employeeForm.position.trim()) newErrors.position = 'Position is required';
    // Email is now optional
    // if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    if (!employeeForm.phone.trim()) newErrors.phone = 'Phone is required';
    // Nationality is now optional
    // if (!employeeForm.nationality.trim()) newErrors.nationality = 'Nationality is required';
    // Document fields are now optional - removed passport validation
    if (!employeeForm.joinDate) newErrors.joinDate = 'Join date is required';
    if (!employeeForm.department.trim()) newErrors.department = 'Department is required';
    // Password fields are now optional - removed password validation

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeForm.email && !emailRegex.test(employeeForm.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (employeeForm.password && employeeForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (employeeForm.password !== employeeForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validation for editing existing employees
  const validateEditForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeForm.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!employeeForm.name.trim()) newErrors.name = 'Name is required';
    // Position is now optional
    // if (!employeeForm.position.trim()) newErrors.position = 'Position is required';
    // Email is now optional
    // if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    if (!employeeForm.phone.trim()) newErrors.phone = 'Phone is required';
    // Nationality is now optional
    // if (!employeeForm.nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (!employeeForm.joinDate) newErrors.joinDate = 'Join date is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (employeeForm.email && !emailRegex.test(employeeForm.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation - only if user is trying to change password
    if (employeeForm.password.trim()) {
      if (employeeForm.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (!employeeForm.confirmPassword.trim()) {
        newErrors.confirmPassword = 'Please confirm your new password';
      }
      if (employeeForm.password !== employeeForm.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Simple password hashing (in production, use proper bcrypt)
      const passwordHash = employeeForm.password ? btoa(employeeForm.password) : null; // Base64 encoding for demo

      const newEmployee = {
        company_id: company.id,
        employee_id: employeeForm.employeeId,
        name: employeeForm.name,
        position: employeeForm.position,
        email: employeeForm.email,
        phone: employeeForm.phone,
        nationality: employeeForm.nationality,
        passport_number: employeeForm.passportNumber || null,
        passport_expiry: employeeForm.passportExpiry || null,
        visa_type: employeeForm.visaType,
        visa_number: employeeForm.visaNumber || null,
        visa_issue_date: employeeForm.visaIssueDate || null,
        visa_expiry_date: employeeForm.visaExpiryDate || null,
        emirates_id: employeeForm.emiratesId || null,
        emirates_id_expiry: employeeForm.emiratesIdExpiry || null,
        labor_card_number: employeeForm.laborCardNumber || null,
        labor_card_expiry: employeeForm.laborCardExpiry || null,
        join_date: employeeForm.joinDate || new Date().toISOString().split('T')[0],
        salary: employeeForm.salary ? parseFloat(employeeForm.salary) : null,
        department: employeeForm.department,
        manager: employeeForm.manager || null,
        password_hash: passwordHash,
        status: 'active'
      };

      console.log('Creating employee:', newEmployee);
      const result = await dbHelpers.createEmployee(newEmployee);
      console.log('Employee created:', result);

      // Save any pending documents
      if (pendingDocuments.length > 0) {
        try {
          const documentsToSave = pendingDocuments.map(doc => ({
            ...doc,
            employee_id: result.id,
            type: normalizeDocumentType(doc.type)
          }));

          for (const doc of documentsToSave) {
            await dbHelpers.createEmployeeDocument(doc);
          }

          console.log(`Saved ${documentsToSave.length} documents for new employee`);
          setPendingDocuments([]); // Clear pending documents
        } catch (docError) {
          console.error('Error saving employee documents:', docError);
        }
      }

      // Create reminders for document expiry dates
      const remindersToCreate = [];

      if (employeeForm.passportExpiry) {
        remindersToCreate.push(
          dbHelpers.createDocumentExpiryReminder(
            result.id,
            company.id,
            'passport',
            employeeForm.passportExpiry,
            employeeForm.name
          )
        );
      }

      if (employeeForm.visaExpiryDate) {
        remindersToCreate.push(
          dbHelpers.createDocumentExpiryReminder(
            result.id,
            company.id,
            'visa',
            employeeForm.visaExpiryDate,
            employeeForm.name
          )
        );
      }

      if (employeeForm.emiratesIdExpiry) {
        remindersToCreate.push(
          dbHelpers.createDocumentExpiryReminder(
            result.id,
            company.id,
            'emirates_id',
            employeeForm.emiratesIdExpiry,
            employeeForm.name
          )
        );
      }

      if (employeeForm.laborCardExpiry) {
        remindersToCreate.push(
          dbHelpers.createDocumentExpiryReminder(
            result.id,
            company.id,
            'labor_card',
            employeeForm.laborCardExpiry,
            employeeForm.name
          )
        );
      }

      // Create all reminders
      if (remindersToCreate.length > 0) {
        try {
          await Promise.all(remindersToCreate);
          console.log('Document expiry reminders created');
        } catch (reminderError) {
          console.error('Error creating reminders:', reminderError);
        }
      }

      console.log('Employee created successfully, reloading employees...');
      await loadEmployees();
      setShowAddEmployee(false);
      resetForm();
      alert('Employee added successfully with document expiry reminders!');
    } catch (error) {
      console.error('Error creating employee:', error);
      alert(`Error creating employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const resetForm = () => {
    setEmployeeForm({
      employeeId: '',
      name: '',
      position: '',
      email: '',
      phone: '',
      nationality: '',
      passportNumber: '',
      passportExpiry: '',
      visaType: 'employment',
      visaNumber: '',
      visaIssueDate: '',
      visaExpiryDate: '',
      emiratesId: '',
      emiratesIdExpiry: '',
      laborCardNumber: '',
      laborCardExpiry: '',
      joinDate: new Date().toISOString().split('T')[0],
      salary: '',
      department: '',
      manager: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setPendingDocuments([]);
  };

  // Load employee documents
  const loadEmployeeDocuments = async (employeeId: string) => {
    try {
      const documents = await dbHelpers.getEmployeeDocuments(employeeId);
      setEmployeeDocuments(documents || []);
    } catch (error) {
      console.error('Error loading employee documents:', error);
      setEmployeeDocuments([]);
    }
  };

  // Handler for viewing employee details
  const handleViewEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await loadEmployeeDocuments(employee.id);
    setShowEmployeeDetails(true);
  };

  // Handler for editing employee
  const handleEditEmployee = async (employee: Employee) => {
    setSelectedEmployee(employee);
    // Load employee documents for the new service-based document management
    await loadEmployeeServiceDocuments(employee.id);
    // Also load old-style documents for backward compatibility
    await loadEmployeeDocuments(employee.id);
    // Populate form with employee data
    setEmployeeForm({
      employeeId: employee.employeeId || '',
      name: employee.name || '',
      position: employee.position || '',
      email: employee.email || '',
      phone: employee.phone || '',
      nationality: employee.nationality || '',
      passportNumber: employee.passportNumber || '',
      passportExpiry: employee.passportExpiry || '',
      visaType: employee.visaType || 'employment',
      visaNumber: employee.visaNumber || '',
      visaIssueDate: employee.visaIssueDate || '',
      visaExpiryDate: employee.visaExpiryDate || '',
      emiratesId: employee.emiratesId || '',
      emiratesIdExpiry: employee.emiratesIdExpiry || '',
      laborCardNumber: employee.laborCardNumber || '',
      laborCardExpiry: employee.laborCardExpiry || '',
      joinDate: employee.joinDate || new Date().toISOString().split('T')[0],
      salary: employee.salary?.toString() || '',
      department: employee.department || '',
      manager: employee.manager || '',
      password: '',
      confirmPassword: ''
    });
    setShowEditEmployee(true);
  };

  // Handler for deleting employee
  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteConfirm(true);
  };

  // Confirm delete employee
  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await dbHelpers.deleteEmployee(employeeToDelete.id);
      await loadEmployees();
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      alert('Employee deleted successfully!');
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(`Error deleting employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to clean and validate data
  const cleanEmployeeData = (formData: any) => {
    const cleanData: any = {
      id: selectedEmployee?.id,
      company_id: company.id,
      employee_id: formData.employeeId?.trim(),
      name: formData.name?.trim(),
      position: formData.position?.trim(),
      email: formData.email?.trim(),
      phone: formData.phone?.trim(),
      nationality: formData.nationality?.trim() || null,
      passport_number: formData.passportNumber?.trim() || null,
      visa_type: formData.visaType || 'employment',
      visa_number: formData.visaNumber?.trim() || null,
      emirates_id: formData.emiratesId?.trim() || null,
      labor_card_number: formData.laborCardNumber?.trim() || null,
      salary: parseFloat(formData.salary) || 0,
      department: formData.department?.trim() || null,
      manager: formData.manager?.trim() || null,
    };

    // Handle date fields - convert empty strings to null
    const dateFields = [
      'passport_expiry', 'visa_issue_date', 'visa_expiry_date',
      'emirates_id_expiry', 'labor_card_expiry', 'join_date'
    ];

    const formDateFields = [
      'passportExpiry', 'visaIssueDate', 'visaExpiryDate',
      'emiratesIdExpiry', 'laborCardExpiry', 'joinDate'
    ];

    dateFields.forEach((dbField, index) => {
      const formField = formDateFields[index];
      const dateValue = formData[formField]?.trim();
      cleanData[dbField] = dateValue && dateValue !== '' ? dateValue : null;
    });

    // Only include password if provided
    if (formData.password?.trim()) {
      cleanData.password_hash = btoa(formData.password.trim());
    }

    return cleanData;
  };

  // Handler for updating employee
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || !validateEditForm()) return;

    try {
      const cleanedData = cleanEmployeeData(employeeForm);

      console.log('Updating employee with data:', cleanedData);

      // Update employee basic information
      await dbHelpers.updateEmployee(cleanedData);

      // Process service-based documents
      let documentsProcessed = 0;
      let documentsWithErrors = 0;
      const errorMessages: string[] = [];

      for (const doc of documents) {
        console.log('🔄 Processing document:', {
          hasFile: !!doc.file,
          hasExpiryDate: !!doc.expiryDate,
          hasServiceId: !!doc.serviceId
        });

        // Process documents that have at least a service and expiry date
        if (doc.serviceId && doc.expiryDate) {
          try {
            documentsProcessed++;
            let fileUrl = doc.fileUrl;

            // Get service name for document title
            const service = services.find(s => s.id === doc.serviceId);
            const documentTitle = service ? `${service.name} Document` : 'Service Document';

            // Upload new file if provided
            if (doc.file) {
              console.log('📤 Uploading new file for employee document');
              try {
                // Use a simple upload approach for employee documents
                const formData = new FormData();
                formData.append('file', doc.file);
                formData.append('employeeId', selectedEmployee.id);
                formData.append('documentTitle', documentTitle);

                // This would need to be implemented in your upload service
                // For now, we'll save without file upload
                fileUrl = undefined;
                console.log('⚠️ File upload not implemented for employee documents yet');
              } catch (uploadError) {
                console.error('❌ File upload failed:', uploadError);
                fileUrl = undefined;
              }
            }

            // Check if this is an existing document (has a real ID, not temp)
            const isExistingDocument = !doc.id.startsWith('temp-');

            if (isExistingDocument) {
              // Update existing document
              const updateData = {
                name: documentTitle, // Use 'name' field instead of 'title'
                expiry_date: doc.expiryDate,
                service_id: doc.serviceId,
                ...(fileUrl && { file_path: fileUrl }),
                ...(doc.file?.name && { file_name: doc.file.name }), // Update file_name if new file
                updated_at: new Date().toISOString()
              };

              await dbHelpers.updateEmployeeDocument(doc.id, updateData);
              console.log('✅ Employee document updated successfully:', documentTitle);
            } else {
              // Create new document
              const documentData = {
                employee_id: selectedEmployee.id,
                type: 'other', // Use 'other' as it's allowed by the constraint
                name: documentTitle,
                file_name: doc.file?.name || 'no-file-uploaded.txt', // Required field, provide default
                file_path: fileUrl || null,
                expiry_date: doc.expiryDate,
                service_id: doc.serviceId,
                upload_date: doc.expiryDate, // Use expiry_date format (DATE not TIMESTAMP)
                status: 'valid' // Use 'valid' as it's allowed by the constraint
              };

              await dbHelpers.createEmployeeDocument(documentData);
              console.log('✅ Employee document created successfully:', documentTitle);
            }

            // Create reminder for expiry date
            console.log('📅 Creating reminder for employee document with expiry date:', doc.expiryDate);
            await createEmployeeDocumentReminder(
              selectedEmployee.id,
              selectedEmployee.name,
              documentTitle,
              doc.expiryDate,
              doc.serviceId
            );

          } catch (docError) {
            documentsWithErrors++;
            const errorMsg = docError instanceof Error ? docError.message : 'Unknown error';
            const service = services.find(s => s.id === doc.serviceId);
            const documentTitle = service ? `${service.name} Document` : 'Service Document';
            errorMessages.push(`${documentTitle}: ${errorMsg}`);
            console.error('❌ Error processing employee document:', documentTitle, docError);
          }
        } else {
          console.log('⚠️ Skipping document without service or expiry date:', doc);
        }
      }

      // Show summary of document processing
      if (documentsProcessed > 0) {
        if (documentsWithErrors === 0) {
          console.log(`✅ All ${documentsProcessed} employee documents processed successfully!`);
        } else if (documentsWithErrors < documentsProcessed) {
          console.log(`⚠️ ${documentsProcessed - documentsWithErrors}/${documentsProcessed} employee documents processed successfully. ${documentsWithErrors} had errors.`);
        } else {
          console.log(`❌ All ${documentsProcessed} employee documents failed to process.`);
        }
      }

      // Reload employees list
      await loadEmployees();

      // Clear the documents state to ensure fresh loading next time
      setDocuments([]);

      setShowEditEmployee(false);
      setSelectedEmployee(null);
      resetForm();
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating employee: ${errorMessage}`);
    }
  };

  // Helper function to normalize document type for database
  const normalizeDocumentType = (documentType: string): string => {
    const typeMapping: { [key: string]: string } = {
      'passport': 'passport',
      'emirates-id': 'emirates_id',
      'visa': 'visa',
      'labor-card': 'labor_card',
      'educational-certificate': 'educational_certificate',
      'experience-certificate': 'experience_certificate',
      'medical-certificate': 'medical_certificate',
      'other': 'other'
    };

    // Handle custom document types
    if (documentType.startsWith('custom-')) {
      return 'other';
    }

    return typeMapping[documentType] || 'other';
  };

  // OCR Document Processing
  const processDocument = async (file: File, documentType: string) => {
    setUploadingDocument(documentType);

    try {
      console.log('Processing document:', file.name, 'Type:', file.type, 'Size:', file.size);

      let processedFile = file;

      // Handle PDF files by converting first page to image
      if (file.type === 'application/pdf') {
        try {
          console.log('Starting PDF conversion...');
          processedFile = await convertPdfToImage(file);
          console.log('PDF successfully converted to image for OCR processing');
        } catch (pdfError) {
          console.error('PDF conversion failed:', pdfError);
          // Instead of throwing an error, let's save the PDF without OCR processing
          console.log('Saving PDF without OCR processing...');
          await savePdfWithoutOCR(file, documentType);
          return; // Exit early since we've saved the document
        }
      }

      // Enhanced Tesseract.js configuration for better accuracy
      let text = '';
      let confidence = 0;

      try {
        console.log('Starting OCR processing...');
        const result = await Tesseract.recognize(processedFile, 'eng+ara', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        text = result.data.text;
        confidence = result.data.confidence;

        console.log('OCR Text extracted:', text);
        console.log('OCR Confidence:', confidence);
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
        // Continue without OCR data
        console.log('Continuing without OCR data...');
      }

      // If OCR failed or confidence is too low, save document without OCR data
      if (!text || confidence < 20) {
        console.warn('OCR failed or low confidence:', confidence);
        console.log('Saving document without OCR data...');

        // Save document without OCR processing
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;

          const documentData = {
            employee_id: selectedEmployee?.id || null,
            type: normalizeDocumentType(documentType),
            name: `${documentType.replace('-', ' ').toUpperCase()} Document`,
            file_name: file.name,
            file_path: base64Data,
            upload_date: new Date().toISOString().split('T')[0],
            expiry_date: null,
            status: 'valid'
          };

          if (selectedEmployee) {
            try {
              await dbHelpers.createEmployeeDocument(documentData);
              await loadEmployeeDocuments(selectedEmployee.id);
              alert('✅ Document uploaded successfully! (OCR processing was skipped)');
            } catch (docError) {
              console.error('Error saving document:', docError);
              alert('❌ Error saving document');
            }
          } else {
            setPendingDocuments(prev => [...prev, documentData]);
            alert('✅ Document uploaded successfully! (OCR processing was skipped)');
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // Extract relevant information based on document type
      const extractedData = extractDataFromOCR(text, documentType);

      // Update form with extracted data
      if (Object.keys(extractedData).length > 0) {
        setEmployeeForm(prev => ({
          ...prev,
          ...extractedData
        }));

        // Save document to database if we're editing an existing employee, or store for later if creating new
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;

          const documentData = {
            employee_id: selectedEmployee?.id || null,
            type: normalizeDocumentType(documentType),
            name: `${documentType.replace('-', ' ').toUpperCase()} Document`,
            file_name: file.name,
            file_path: base64Data, // Store base64 data in file_path for now
            upload_date: new Date().toISOString().split('T')[0],
            expiry_date: extractedData[`${documentType.replace('-', '')}Expiry`] || null,
            status: 'valid'
          };

          if (selectedEmployee) {
            // Save immediately for existing employee
            try {
              await dbHelpers.createEmployeeDocument(documentData);
              console.log('Document saved to database');
              // Reload documents to show the new one
              await loadEmployeeDocuments(selectedEmployee.id);
            } catch (docError) {
              console.error('Error saving document:', docError);
            }
          } else {
            // Store for later when creating new employee
            setPendingDocuments(prev => [...prev, documentData]);
            console.log('Document stored for new employee creation');
          }
        };
        reader.readAsDataURL(file);

        alert(`✅ Document processed successfully!\nExtracted: ${Object.keys(extractedData).join(', ')}\nConfidence: ${Math.round(confidence)}%`);
      } else {
        console.log('No relevant data extracted from OCR text');
        // Fallback to mock data if OCR doesn't extract useful information
        const mockData = getMockOCRResults(documentType);
        setEmployeeForm(prev => ({
          ...prev,
          ...mockData
        }));

        // Still save the document even if no data was extracted
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;

          const documentData = {
            employee_id: selectedEmployee?.id || null,
            type: normalizeDocumentType(documentType),
            name: `${documentType.replace('-', ' ').toUpperCase()} Document`,
            file_name: file.name,
            file_path: base64Data,
            upload_date: new Date().toISOString().split('T')[0],
            expiry_date: null,
            status: 'valid'
          };

          if (selectedEmployee) {
            // Save immediately for existing employee
            try {
              await dbHelpers.createEmployeeDocument(documentData);
              console.log('Document saved to database (no OCR data)');
              // Reload documents to show the new one
              await loadEmployeeDocuments(selectedEmployee.id);
            } catch (docError) {
              console.error('Error saving document:', docError);
            }
          } else {
            // Store for later when creating new employee
            setPendingDocuments(prev => [...prev, documentData]);
            console.log('Document stored for new employee creation (no OCR data)');
          }
        };
        reader.readAsDataURL(file);

        alert(`⚠️ Document uploaded but no relevant data found.\nUsing sample data for demonstration.\nTry uploading a clearer image.`);
      }
    } catch (error) {
      console.error('OCR processing failed:', error);

      // Fallback to mock data on error
      const mockData = getMockOCRResults(documentType);
      setEmployeeForm(prev => ({
        ...prev,
        ...mockData
      }));

      // Still save the document even if OCR processing failed
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const documentData = {
          employee_id: selectedEmployee?.id || null,
          type: normalizeDocumentType(documentType),
          name: `${documentType.replace('-', ' ').toUpperCase()} Document`,
          file_name: file.name,
          file_path: base64Data,
          upload_date: new Date().toISOString().split('T')[0],
          expiry_date: null,
          status: 'valid'
        };

        if (selectedEmployee) {
          // Save immediately for existing employee
          try {
            await dbHelpers.createEmployeeDocument(documentData);
            console.log('Document saved to database (OCR failed)');
            // Reload documents to show the new one
            await loadEmployeeDocuments(selectedEmployee.id);
          } catch (docError) {
            console.error('Error saving document:', docError);
          }
        } else {
          // Store for later when creating new employee
          setPendingDocuments(prev => [...prev, documentData]);
          console.log('Document stored for new employee creation (OCR failed)');
        }
      };
      reader.readAsDataURL(file);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Document processing failed: ${errorMessage}\nUsing sample data instead.`);
    } finally {
      setUploadingDocument('');
    }
  };

  // Initialize PDF.js worker once
  const initializePDFWorker = () => {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Try multiple CDN sources for better reliability
      const workerSources = [
        `https://unpkg.com/pdfjs-dist@5.4.149/build/pdf.worker.min.js`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.js`,
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.js`
      ];

      // Use the first available source
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSources[0];
    }
  };

  // Save PDF document without OCR processing
  const savePdfWithoutOCR = async (file: File, documentType: string) => {
    try {
      console.log('Saving PDF without OCR processing...');

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const documentData = {
          employee_id: selectedEmployee?.id || null,
          type: normalizeDocumentType(documentType),
          name: `${documentType.replace('-', ' ').toUpperCase()} Document`,
          file_name: file.name,
          file_path: base64Data,
          upload_date: new Date().toISOString().split('T')[0],
          expiry_date: null, // No OCR data available
          status: 'valid'
        };

        if (selectedEmployee) {
          // Save immediately for existing employee
          try {
            await dbHelpers.createEmployeeDocument(documentData);
            console.log('PDF document saved to database without OCR');
            // Reload documents to show the new one
            await loadEmployeeDocuments(selectedEmployee.id);
            alert('✅ PDF document uploaded successfully! (OCR processing was skipped due to conversion issues)');
          } catch (docError) {
            console.error('Error saving PDF document:', docError);
            alert('❌ Error saving PDF document to database');
          }
        } else {
          // Store for later when creating new employee
          setPendingDocuments(prev => [...prev, documentData]);
          console.log('PDF document stored for new employee creation');
          alert('✅ PDF document uploaded successfully! (OCR processing was skipped due to conversion issues)');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('❌ Error saving PDF document');
    }
  };

  // Convert PDF first page to image for OCR processing
  const convertPdfToImage = async (pdfFile: File): Promise<File> => {
    try {
      console.log('Converting PDF to image...');

      // Initialize PDF worker
      initializePDFWorker();

      // Read PDF file as array buffer
      const arrayBuffer = await pdfFile.arrayBuffer();

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF loaded, pages:', pdf.numPages);

      // Get first page
      const page = await pdf.getPage(1);

      // Set up canvas with appropriate scale for better OCR
      const scale = 2.0; // Higher scale for better text recognition
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      await page.render({
        canvasContext: ctx,
        viewport: viewport,
        canvas: canvas
      }).promise;

      console.log('PDF page rendered to canvas');

      // Convert canvas to blob and return as File
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png', 0.95);
      });

      const imageFile = new File([blob], `${pdfFile.name}_page1.png`, { type: 'image/png' });
      console.log('PDF converted to image file:', imageFile.name);
      return imageFile;

    } catch (error) {
      console.error('PDF conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`PDF conversion failed: ${errorMessage}. Please try uploading a JPG/PNG image instead.`);
    }
  };

  const getMockOCRResults = (documentType: string) => {
    // Mock OCR results - in real implementation, this would come from actual OCR
    switch (documentType) {
      case 'passport':
        return {
          passportNumber: 'A12345678',
          passportExpiry: '2030-12-31',
          name: 'John Doe',
          nationality: 'Indian'
        };
      case 'emirates-id':
        return {
          emiratesId: '784-1234-1234567-1',
          emiratesIdExpiry: '2029-06-15'
        };
      case 'visa':
        return {
          visaNumber: 'UAE123456789',
          visaExpiryDate: '2025-08-20',
          visaIssueDate: '2024-08-20'
        };
      case 'labor-card':
        return {
          laborCardNumber: 'LC123456789',
          laborCardExpiry: '2026-03-10'
        };
      default:
        // Handle custom document types
        if (documentType.startsWith('custom-')) {
          return {
            customNumber: 'DOC123456789',
            customExpiry: '2026-12-31'
          };
        }
        return {};
    }
  };

  const extractDataFromOCR = (text: string, documentType: string) => {
    const extractedData: any = {};
    const upperText = text.toUpperCase();
    const cleanText = text.replace(/\s+/g, ' ').trim();

    console.log('Extracting data from OCR text for document type:', documentType);
    console.log('OCR Text (first 500 chars):', text.substring(0, 500));

    switch (documentType) {
      case 'passport':
        // Enhanced passport number patterns (more comprehensive)
        const passportPatterns = [
          /[A-Z]\d{8}/g,           // A12345678
          /\d{8}[A-Z]/g,           // 12345678A
          /[A-Z]{2}\d{7}/g,        // AB1234567
          /[A-Z]\d{7}/g,           // A1234567
          /P\d{8}/g,               // P12345678
          /\b[A-Z]{1,2}\d{6,9}\b/g // General pattern
        ];

        for (const pattern of passportPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0) {
            extractedData.passportNumber = matches[0];
            console.log('Found passport number:', matches[0]);
            break;
          }
        }

        // Enhanced date extraction for passports
        const datePatterns = [
          /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g,
          /\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/g,
          /\d{2}\s\w{3}\s\d{4}/g,  // 15 JAN 2025
          /\w{3}\s\d{2},?\s\d{4}/g // JAN 15, 2025
        ];

        let allDates = [];
        for (const pattern of datePatterns) {
          const matches = text.match(pattern);
          if (matches) allDates.push(...matches);
        }

        if (allDates.length > 0) {
          // Usually expiry date is the last date or after "EXPIRY" keyword
          const expiryKeywords = ['EXPIRY', 'EXPIRES', 'VALID UNTIL', 'UNTIL'];
          let expiryDate = allDates[allDates.length - 1];

          for (const keyword of expiryKeywords) {
            const keywordIndex = upperText.indexOf(keyword);
            if (keywordIndex !== -1) {
              const afterKeyword = text.substring(keywordIndex);
              const dateMatch = afterKeyword.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/);
              if (dateMatch) {
                expiryDate = dateMatch[0];
                break;
              }
            }
          }

          extractedData.passportExpiry = formatDateForInput(expiryDate);
          console.log('Found passport expiry:', expiryDate);
        }

        // Enhanced name extraction
        const namePatterns = [
          /(?:NAME|GIVEN\s+NAME|SURNAME)[:\s]+([A-Z\s]+)/i,
          /(?:HOLDER|BEARER)[:\s]+([A-Z\s]+)/i,
          /^([A-Z]+\s+[A-Z]+)/m  // First line with two capitalized words
        ];

        for (const pattern of namePatterns) {
          const nameMatch = text.match(pattern);
          if (nameMatch && nameMatch[1]) {
            extractedData.name = nameMatch[1].trim();
            console.log('Found name:', nameMatch[1].trim());
            break;
          }
        }
        break;

      case 'emirates-id':
        // Enhanced Emirates ID patterns
        const emiratesPatterns = [
          /784[\s\-]?\d{4}[\s\-]?\d{7}[\s\-]?\d/g,
          /\b784\d{12}\b/g,
          /\b784\s\d{4}\s\d{7}\s\d\b/g
        ];

        for (const pattern of emiratesPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0) {
            let idNumber = matches[0].replace(/\s/g, '');
            // Format as 784-XXXX-XXXXXXX-X
            if (idNumber.length === 15) {
              idNumber = `${idNumber.substring(0, 3)}-${idNumber.substring(3, 7)}-${idNumber.substring(7, 14)}-${idNumber.substring(14)}`;
            }
            extractedData.emiratesId = idNumber;
            console.log('Found Emirates ID:', idNumber);
            break;
          }
        }

        // Extract expiry date
        const emiratesDateMatches = text.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/g);
        if (emiratesDateMatches && emiratesDateMatches.length > 0) {
          extractedData.emiratesIdExpiry = formatDateForInput(emiratesDateMatches[emiratesDateMatches.length - 1]);
          console.log('Found Emirates ID expiry:', emiratesDateMatches[emiratesDateMatches.length - 1]);
        }
        break;

      case 'visa':
        // Enhanced visa number patterns
        const visaPatterns = [
          /UAE\d{9,12}/g,
          /\b\d{10,15}\b/g,
          /VISA\s*NO[:\s]*(\d+)/gi,
          /REFERENCE\s*NO[:\s]*(\d+)/gi
        ];

        for (const pattern of visaPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0) {
            extractedData.visaNumber = matches[0];
            console.log('Found visa number:', matches[0]);
            break;
          }
        }

        // Extract visa dates with better logic
        const visaDateMatches = text.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/g);
        if (visaDateMatches && visaDateMatches.length >= 1) {
          if (visaDateMatches.length >= 2) {
            extractedData.visaIssueDate = formatDateForInput(visaDateMatches[0]);
            extractedData.visaExpiryDate = formatDateForInput(visaDateMatches[1]);
          } else {
            extractedData.visaExpiryDate = formatDateForInput(visaDateMatches[0]);
          }
          console.log('Found visa dates:', visaDateMatches);
        }
        break;

      case 'labor-card':
        // Enhanced labor card patterns
        const laborPatterns = [
          /LC\d{9,12}/g,
          /LABOR\s*CARD\s*NO[:\s]*(\d+)/gi,
          /WORK\s*PERMIT\s*NO[:\s]*(\d+)/gi,
          /\b\d{8,12}\b/g
        ];

        for (const pattern of laborPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0) {
            extractedData.laborCardNumber = matches[0];
            console.log('Found labor card number:', matches[0]);
            break;
          }
        }

        // Extract expiry date
        const laborDateMatches = text.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/g);
        if (laborDateMatches && laborDateMatches.length > 0) {
          extractedData.laborCardExpiry = formatDateForInput(laborDateMatches[laborDateMatches.length - 1]);
          console.log('Found labor card expiry:', laborDateMatches[laborDateMatches.length - 1]);
        }
        break;

      default:
        // Handle custom document types and other unknown types
        if (documentType.startsWith('custom-')) {
          console.log('Processing custom document type:', documentType);

          // For custom documents, try to extract any numbers and dates
          // Extract any number that could be a document number
          const numberMatches = text.match(/\b\d{6,15}\b/g);
          if (numberMatches && numberMatches.length > 0) {
            extractedData.customNumber = numberMatches[0];
            console.log('Found custom document number:', numberMatches[0]);
          }

          // Extract any date that could be an expiry date
          const dateMatches = text.match(/\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/g);
          if (dateMatches && dateMatches.length > 0) {
            extractedData.customExpiry = formatDateForInput(dateMatches[dateMatches.length - 1]);
            console.log('Found custom document expiry:', dateMatches[dateMatches.length - 1]);
          }
        }
        break;
    }

    console.log('Extracted data:', extractedData);
    return extractedData;
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';

    console.log('Formatting date:', dateString);

    // Handle different date formats
    const cleanDate = dateString.trim();

    // Handle formats like "15 JAN 2025" or "JAN 15, 2025"
    const monthNames = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
      'JANUARY': '01', 'FEBRUARY': '02', 'MARCH': '03', 'APRIL': '04', 'JUNE': '06',
      'JULY': '07', 'AUGUST': '08', 'SEPTEMBER': '09', 'OCTOBER': '10', 'NOVEMBER': '11', 'DECEMBER': '12'
    };

    // Check for month name formats
    const monthNameMatch = cleanDate.match(/(\d{1,2})\s+([A-Z]{3,9})\s+(\d{4})/i);
    if (monthNameMatch) {
      const day = monthNameMatch[1].padStart(2, '0');
      const monthName = monthNameMatch[2].toUpperCase();
      const year = monthNameMatch[3];
      const month = monthNames[monthName];
      if (month) {
        const formatted = `${year}-${month}-${day}`;
        console.log('Formatted month name date:', formatted);
        return formatted;
      }
    }

    // Check for reverse month name format "JAN 15, 2025"
    const reverseMonthMatch = cleanDate.match(/([A-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i);
    if (reverseMonthMatch) {
      const monthName = reverseMonthMatch[1].toUpperCase();
      const day = reverseMonthMatch[2].padStart(2, '0');
      const year = reverseMonthMatch[3];
      const month = monthNames[monthName];
      if (month) {
        const formatted = `${year}-${month}-${day}`;
        console.log('Formatted reverse month name date:', formatted);
        return formatted;
      }
    }

    // Handle numeric formats with various separators
    const numericDate = cleanDate.replace(/[^\d\/\-\.]/g, '');
    const parts = numericDate.split(/[\/\-\.]/);

    if (parts.length === 3) {
      let day, month, year;

      // Handle DD/MM/YYYY or MM/DD/YYYY or YYYY/MM/DD
      if (parts[0].length === 4) {
        // YYYY/MM/DD or YYYY-MM-DD
        year = parts[0];
        month = parts[1].padStart(2, '0');
        day = parts[2].padStart(2, '0');
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY for UAE documents
        year = parts[2];
        month = parts[1].padStart(2, '0');
        day = parts[0].padStart(2, '0');

        // Validate day/month to determine correct format
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);

        if (dayNum > 12 && monthNum <= 12) {
          // First part is definitely day (>12), so DD/MM/YYYY
          // Keep as is
        } else if (monthNum > 12 && dayNum <= 12) {
          // Second part is definitely day (>12), so MM/DD/YYYY
          day = parts[1].padStart(2, '0');
          month = parts[0].padStart(2, '0');
        }
        // If both are <=12, assume DD/MM/YYYY (UAE standard)
      }

      const formatted = `${year}-${month}-${day}`;
      console.log('Formatted numeric date:', formatted);
      return formatted;
    }

    console.log('Could not format date, returning original:', dateString);
    return dateString; // Return original if can't parse
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        alert('❌ Invalid file type. Please upload an image file (JPG, PNG, GIF, BMP, WebP) or PDF.');
        return;
      }

      if (file.size > maxSize) {
        alert('❌ File too large. Please upload a file smaller than 10MB.');
        return;
      }

      console.log('Valid file selected:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);
      processDocument(file, documentType);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Delete pending document (for Add Employee modal)
  const handleDeletePendingDocument = (index: number, documentType: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setPendingDocuments(prev =>
        prev.filter((doc, i) => !(i === index && doc.type === documentType))
      );
    }
  };

  // Delete existing document (for Edit Employee modal)
  const handleDeleteExistingDocument = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        await dbHelpers.deleteEmployeeDocument(documentId);
        // Refresh the documents list
        if (selectedEmployee) {
          const documents = await dbHelpers.getEmployeeDocuments(selectedEmployee.id);
          setEmployeeDocuments(documents);
        }
        alert('✅ Document deleted successfully!');
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('❌ Failed to delete document. Please try again.');
      }
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800'; // Legacy support
      case 'pending': return 'bg-yellow-100 text-yellow-800'; // Legacy support
      case 'cancelled': return 'bg-gray-100 text-gray-800'; // Legacy support
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Employee Management</h1>
                <p className="text-blue-100 mt-1">{company.companyName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {employees.length}</span>
              <span>Active: {employees.filter(e => e.status === 'active').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading employees...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      <p className="text-xs text-gray-500">ID: {employee.employeeId}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisaStatusColor(employee.visaStatus)}`}>
                    {employee.visaStatus}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {employee.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    {employee.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Joined: {new Date(employee.joinDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="View Documents"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{employee.nationality}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEmployees.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No employees match your search criteria.' : 'Start by adding your first employee.'}
          </p>
          <button
            onClick={() => setShowAddEmployee(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Add Employee
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Employee</h2>
                <button
                  onClick={() => {
                    setShowAddEmployee(false);
                    resetForm();
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div className="col-span-full">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={employeeForm.employeeId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.employeeId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="EMP-001"
                  />
                  {errors.employeeId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.employeeId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={employeeForm.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={employeeForm.position}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Job position"
                  />
                  {errors.position && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.position}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="employee@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={employeeForm.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="+971-50-000-0000"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={employeeForm.nationality}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nationality ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Enter nationality"
                  />
                  {errors.nationality && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.nationality}
                    </p>
                  )}
                </div>

                {/* Document Information */}
                <div className="col-span-full mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Document Information</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomDoc(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Document
                    </button>
                  </div>
                </div>

                {/* Passport Document Dropdown */}
                <div className="col-span-full">
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowPassportSection(!showPassportSection)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">Passport Information</span>
                      </div>
                      {showPassportSection ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showPassportSection && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passport Number
                          </label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              name="passportNumber"
                              value={employeeForm.passportNumber}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Passport number"
                            />

                            {/* Document Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">Upload Passport to auto-extract data</p>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'passport')}
                                  className="hidden"
                                  id="passport-upload"
                                  disabled={uploadingDocument === 'passport'}
                                />
                                <label
                                  htmlFor="passport-upload"
                                  className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingDocument === 'passport' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {uploadingDocument === 'passport' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Document Preview */}
                            {pendingDocuments.filter(doc => doc.type === 'passport').length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {pendingDocuments.filter(doc => doc.type === 'passport').map((doc, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                                      {/* Document Preview */}
                                      {doc.file_path && (
                                        <div className="mb-2">
                                          <div className="w-full h-24 bg-gray-50 rounded border overflow-hidden">
                                            <img
                                              src={doc.file_path}
                                              alt={doc.name}
                                              className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                            <html>
                                              <head><title>${doc.name}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name}" />
                                              </body>
                                            </html>
                                          `);
                                                }
                                              }}
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                            />
                                            <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                              <div className="text-center">
                                                <FileText className="w-8 h-8 mb-2 mx-auto" />
                                                <span className="text-sm">Preview not available</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Document Info */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                                          {doc.expiry_date && (
                                            <p className="text-xs text-gray-500">
                                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                            </p>
                                          )}
                                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 bg-green-100 text-green-800">
                                            Valid
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDeletePendingDocument(index, 'passport')}
                                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passport Expiry
                          </label>
                          <input
                            type="date"
                            name="passportExpiry"
                            value={employeeForm.passportExpiry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emirates ID Document Dropdown */}
                <div className="col-span-full">
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowEmiratesIdSection(!showEmiratesIdSection)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-gray-900">Emirates ID Information</span>
                      </div>
                      {showEmiratesIdSection ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showEmiratesIdSection && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              name="emiratesId"
                              value={employeeForm.emiratesId}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="784-YYYY-XXXXXXX-X"
                            />

                            {/* Emirates ID Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">Upload Emirates ID to auto-extract data</p>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'emirates-id')}
                                  className="hidden"
                                  id="emirates-id-upload"
                                  disabled={uploadingDocument === 'emirates-id'}
                                />
                                <label
                                  htmlFor="emirates-id-upload"
                                  className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingDocument === 'emirates-id' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {uploadingDocument === 'emirates-id' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Document Preview */}
                            {pendingDocuments.filter(doc => doc.type === 'emirates-id').length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {pendingDocuments.filter(doc => doc.type === 'emirates-id').map((doc, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                      {/* Document Preview */}
                                      {doc.file_path && (
                                        <div className="mb-3">
                                          <div className="w-full h-32 bg-gray-50 rounded border overflow-hidden">
                                            <img
                                              src={doc.file_path}
                                              alt={doc.name || 'Emirates ID Document'}
                                              className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                              onError={(e) => {
                                                console.error('Image failed to load:', doc.file_path);
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                            <html>
                                              <head><title>${doc.name || 'Emirates ID Document'}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name || 'Emirates ID Document'}" />
                                              </body>
                                            </html>
                                          `);
                                                }
                                              }}
                                            />
                                            <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                              <div className="text-center">
                                                <FileText className="w-8 h-8 mb-2 mx-auto" />
                                                <span className="text-sm">Preview not available</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Document Info */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                                          {doc.expiry_date && (
                                            <p className="text-xs text-gray-500">
                                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                            </p>
                                          )}
                                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 bg-green-100 text-green-800">
                                            Valid
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDeletePendingDocument(index, 'emirates-id')}
                                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID Expiry</label>
                          <input
                            type="date"
                            name="emiratesIdExpiry"
                            value={employeeForm.emiratesIdExpiry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visa Document Dropdown */}
                <div className="col-span-full">
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowVisaSection(!showVisaSection)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-gray-900">Visa Information</span>
                      </div>
                      {showVisaSection ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showVisaSection && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              name="visaNumber"
                              value={employeeForm.visaNumber}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Visa number"
                            />

                            {/* Visa Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">Upload Visa to auto-extract data</p>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'visa')}
                                  className="hidden"
                                  id="visa-upload"
                                  disabled={uploadingDocument === 'visa'}
                                />
                                <label
                                  htmlFor="visa-upload"
                                  className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingDocument === 'visa' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {uploadingDocument === 'visa' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Document Preview */}
                            {pendingDocuments.filter(doc => doc.type === 'visa').length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {pendingDocuments.filter(doc => doc.type === 'visa').map((doc, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                                      {/* Document Preview */}
                                      {doc.file_path && (
                                        <div className="mb-2">
                                          <div className="w-full h-24 bg-gray-50 rounded border overflow-hidden">
                                            <img
                                              src={doc.file_path}
                                              alt={doc.name}
                                              className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                            <html>
                                              <head><title>${doc.name}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name}" />
                                              </body>
                                            </html>
                                          `);
                                                }
                                              }}
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                            />
                                            <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                              <div className="text-center">
                                                <FileText className="w-8 h-8 mb-2 mx-auto" />
                                                <span className="text-sm">Preview not available</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Document Info */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                                          {doc.expiry_date && (
                                            <p className="text-xs text-gray-500">
                                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                            </p>
                                          )}
                                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 bg-green-100 text-green-800">
                                            Valid
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDeletePendingDocument(index, 'visa')}
                                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
                          <input
                            type="date"
                            name="visaExpiryDate"
                            value={employeeForm.visaExpiryDate}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Labor Card Document Dropdown */}
                <div className="col-span-full">
                  <div className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowLaborCardSection(!showLaborCardSection)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-orange-600" />
                        <span className="font-medium text-gray-900">Labor Card Information</span>
                      </div>
                      {showLaborCardSection ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {showLaborCardSection && (
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Labor Card Number</label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              name="laborCardNumber"
                              value={employeeForm.laborCardNumber}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Labor card number"
                            />

                            {/* Labor Card Upload */}
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">Upload Labor Card to auto-extract data</p>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => handleDocumentUpload(e, 'labor-card')}
                                  className="hidden"
                                  id="labor-card-upload"
                                  disabled={uploadingDocument === 'labor-card'}
                                />
                                <label
                                  htmlFor="labor-card-upload"
                                  className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploadingDocument === 'labor-card' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {uploadingDocument === 'labor-card' ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Document Preview */}
                            {pendingDocuments.filter(doc => doc.type === 'labor-card').length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {pendingDocuments.filter(doc => doc.type === 'labor-card').map((doc, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                                      {/* Document Preview */}
                                      {doc.file_path && (
                                        <div className="mb-3">
                                          <div className="w-full h-32 bg-gray-50 rounded border overflow-hidden">
                                            <img
                                              src={doc.file_path}
                                              alt={doc.name || 'Labor Card Document'}
                                              className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                            <html>
                                              <head><title>${doc.name}</title></head>
                                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name}" />
                                              </body>
                                            </html>
                                          `);
                                                }
                                              }}
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                            />
                                            <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                              <div className="text-center">
                                                <FileText className="w-8 h-8 mb-2 mx-auto" />
                                                <span className="text-sm">Preview not available</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Document Info */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                                          {doc.expiry_date && (
                                            <p className="text-xs text-gray-500">
                                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                            </p>
                                          )}
                                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 bg-green-100 text-green-800">
                                            Valid
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDeletePendingDocument(index, 'labor-card')}
                                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Labor Card Expiry</label>
                          <input
                            type="date"
                            name="laborCardExpiry"
                            value={employeeForm.laborCardExpiry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Documents */}
                {customDocuments.length > 0 && (
                  <>
                    <div className="col-span-full mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Documents</h3>
                    </div>

                    {customDocuments.map((customDoc) => (
                      <div key={customDoc.id} className="col-span-full">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <h4 className="text-md font-medium text-blue-900 mb-3">{customDoc.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customDoc.hasNumber && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {customDoc.name} Number
                                </label>
                                <input
                                  type="text"
                                  name={`custom_${customDoc.id}_number`}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder={`Enter ${customDoc.name} number`}
                                />
                              </div>
                            )}

                            {customDoc.hasExpiry && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {customDoc.name} Expiry
                                </label>
                                <input
                                  type="date"
                                  name={`custom_${customDoc.id}_expiry`}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>

                          {/* Custom Document Upload */}
                          <div className="mt-4">
                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-25">
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                <p className="text-sm text-blue-600 mb-2">Upload {customDoc.name} to auto-extract data</p>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => handleDocumentUpload(e, `custom-${customDoc.id}`)}
                                  className="hidden"
                                  id={`custom-${customDoc.id}-upload`}
                                  disabled={uploadingDocument === `custom-${customDoc.id}`}
                                />
                                <label
                                  htmlFor={`custom-${customDoc.id}-upload`}
                                  className={`inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer ${uploadingDocument === `custom-${customDoc.id}` ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {uploadingDocument === `custom-${customDoc.id}` ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Document Preview */}
                            {pendingDocuments.filter(doc => doc.type === `custom-${customDoc.id}`).length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {pendingDocuments.filter(doc => doc.type === `custom-${customDoc.id}`).map((doc, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                                      {/* Document Preview */}
                                      {doc.file_path && (
                                        <div className="mb-2">
                                          <div className="w-full h-24 bg-gray-50 rounded border overflow-hidden">
                                            <img
                                              src={doc.file_path}
                                              alt={doc.name}
                                              className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                              onClick={() => {
                                                const newWindow = window.open();
                                                if (newWindow) {
                                                  newWindow.document.write(`
                                                    <html>
                                                      <head><title>${doc.name}</title></head>
                                                      <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                        <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name}" />
                                                      </body>
                                                    </html>
                                                  `);
                                                }
                                              }}
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) {
                                                  fallback.style.display = 'flex';
                                                }
                                              }}
                                            />
                                            <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                              <div className="text-center">
                                                <FileText className="w-8 h-8 mb-2 mx-auto" />
                                                <span className="text-sm">Preview not available</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Document Info */}
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                                          <p className="text-xs text-gray-500">{doc.file_name}</p>
                                          {doc.expiry_date && (
                                            <p className="text-xs text-gray-500">
                                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                            </p>
                                          )}
                                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 bg-green-100 text-green-800">
                                            Valid
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDeletePendingDocument(index, `custom-${customDoc.id}`)}
                                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Employment Information */}
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Join Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="joinDate"
                    value={employeeForm.joinDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.joinDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                  />
                  {errors.joinDate && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.joinDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={employeeForm.department}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Department name"
                  />
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.department}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary (AED)</label>
                  <input
                    type="number"
                    name="salary"
                    value={employeeForm.salary}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Monthly salary"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                  <input
                    type="text"
                    name="manager"
                    value={employeeForm.manager}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Manager name"
                  />
                </div>

                {/* Login Credentials */}
                {/* <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Credentials</h3>
                </div> */}

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={employeeForm.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="Enter password for employee login"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div> */}

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={employeeForm.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div> */}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployee(false);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Document Modal */}
      {showAddCustomDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add Custom Document Type</h2>
                <button
                  onClick={() => {
                    setShowAddCustomDoc(false);
                    setNewCustomDoc({ name: '', hasNumber: true, hasExpiry: true });
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomDoc.name}
                    onChange={(e) => setNewCustomDoc(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Aadhaar Card, Driving License"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newCustomDoc.hasNumber}
                      onChange={(e) => setNewCustomDoc(prev => ({ ...prev, hasNumber: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Has Document Number</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newCustomDoc.hasExpiry}
                      onChange={(e) => setNewCustomDoc(prev => ({ ...prev, hasExpiry: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Has Expiry Date</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCustomDoc(false);
                    setNewCustomDoc({ name: '', hasNumber: true, hasExpiry: true });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newCustomDoc.name.trim()) {
                      setCustomDocuments(prev => [...prev, { ...newCustomDoc, id: Date.now() }]);
                      setShowAddCustomDoc(false);
                      setNewCustomDoc({ name: '', hasNumber: true, hasExpiry: true });
                      alert('Custom document type added successfully!');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Document Type
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Employee Details</h2>
                <button
                  onClick={() => {
                    setShowEmployeeDetails(false);
                    setSelectedEmployee(null);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                      <p className="text-gray-900">{selectedEmployee.employeeId}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{selectedEmployee.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <p className="text-gray-900">{selectedEmployee.position}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedEmployee.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedEmployee.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                      <p className="text-gray-900">{selectedEmployee.nationality}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Employment Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Join Date</label>
                      <p className="text-gray-900">{new Date(selectedEmployee.joinDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <p className="text-gray-900">{selectedEmployee.department || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Manager</label>
                      <p className="text-gray-900">{selectedEmployee.manager || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Salary</label>
                      <p className="text-gray-900">AED {selectedEmployee.salary?.toLocaleString() || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Visa Status</label>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisaStatusColor(selectedEmployee.visaStatus)}`}>
                        {selectedEmployee.visaStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Document Information */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Document Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                        <p className="text-gray-900">{selectedEmployee.passportNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Passport Expiry</label>
                        <p className="text-gray-900">{selectedEmployee.passportExpiry ? new Date(selectedEmployee.passportExpiry).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emirates ID</label>
                        <p className="text-gray-900">{selectedEmployee.emiratesId || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emirates ID Expiry</label>
                        <p className="text-gray-900">{selectedEmployee.emiratesIdExpiry ? new Date(selectedEmployee.emiratesIdExpiry).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visa Number</label>
                        <p className="text-gray-900">{selectedEmployee.visaNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Visa Expiry</label>
                        <p className="text-gray-900">{selectedEmployee.visaExpiryDate ? new Date(selectedEmployee.visaExpiryDate).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Labor Card Number</label>
                        <p className="text-gray-900">{selectedEmployee.laborCardNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Labor Card Expiry</label>
                        <p className="text-gray-900">{selectedEmployee.laborCardExpiry ? new Date(selectedEmployee.laborCardExpiry).toLocaleDateString() : 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents */}
                <div className="space-y-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Uploaded Documents</h3>
                    <div className="text-sm text-gray-600">
                      Total: {employeeDocuments.length} documents
                    </div>
                  </div>
                  {employeeDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {employeeDocuments.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                          {/* Document Preview */}
                          {doc.file_path && (
                            <div className="mb-3">
                              <div className="w-full h-32 bg-gray-100 rounded border overflow-hidden">
                                <img
                                  src={doc.file_path}
                                  alt={doc.name}
                                  className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    // Open document in new tab
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head><title>${doc.name}</title></head>
                                          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                            <img src="${doc.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${doc.name}" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="hidden items-center justify-center h-full text-gray-500" style={{ display: 'none' }}>
                                  <div className="text-center">
                                    <FileText className="w-8 h-8 mb-2 mx-auto" />
                                    <span className="text-sm">Preview not available</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{doc.name}</h4>
                              <p className="text-sm text-gray-600">{doc.file_name}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                              </p>
                              {doc.expiry_date && (
                                <p className="text-xs text-gray-500">
                                  Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                                </p>
                              )}
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${doc.status === 'valid' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                                    doc.status === 'expiring_soon' ? 'bg-yellow-100 text-yellow-800' :
                                      doc.status === 'active' ? 'bg-green-100 text-green-800' : // Legacy support
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {doc.status === 'valid' ? 'Valid' :
                                  doc.status === 'expiring_soon' ? 'Expiring Soon' :
                                    doc.status?.replace('_', ' ') || 'Valid'}
                              </span>
                            </div>
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowDocumentEdit(true);
                                }}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                                title="Edit Document"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteExistingDocument(doc.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                      <p className="text-sm text-gray-400">Documents will appear here once uploaded during employee creation or editing.</p>
                    </div>
                  )}

                  {/* Quick Document Upload */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Quick Document Upload</h4>
                    <p className="text-sm text-blue-700 mb-3">Upload additional documents for this employee</p>
                    <div className="flex space-x-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && selectedEmployee) {
                            processDocument(file, 'other');
                          }
                        }}
                        className="hidden"
                        id="quick-document-upload"
                      />
                      <label
                        htmlFor="quick-document-upload"
                        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </label>
                      <span className="text-xs text-blue-600 self-center">
                        Supports: JPG, PNG, PDF (max 10MB)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEmployeeDetails(false);
                    handleEditEmployee(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Edit Employee
                </button>
                <button
                  onClick={() => {
                    setShowEmployeeDetails(false);
                    setSelectedEmployee(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployee && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Employee</h2>
                <button
                  onClick={() => {
                    setShowEditEmployee(false);
                    setSelectedEmployee(null);
                    resetForm();
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6">
              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={employeeForm.employeeId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.employeeId ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter employee ID"
                    />
                    {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={employeeForm.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter full name"
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input
                      type="text"
                      name="position"
                      value={employeeForm.position}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.position ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter position"
                    />
                    {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={employeeForm.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={employeeForm.phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                    <input
                      type="text"
                      name="nationality"
                      value={employeeForm.nationality}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.nationality ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter nationality"
                    />
                    {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality}</p>}
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Join Date *</label>
                    <input
                      type="date"
                      name="joinDate"
                      value={employeeForm.joinDate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.joinDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.joinDate && <p className="text-red-500 text-sm mt-1">{errors.joinDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Salary (AED)</label>
                    <input
                      type="number"
                      name="salary"
                      value={employeeForm.salary}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter salary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      name="department"
                      value={employeeForm.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                    <input
                      type="text"
                      name="manager"
                      value={employeeForm.manager}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter manager name"
                    />
                  </div>
                </div>
              </div>

              {/* Password Update (Optional) */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Password Update (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={employeeForm.password}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Leave blank to keep current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={employeeForm.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              {/* Documents & Certificates Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Documents & Certificates
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({documents.length} docs loaded)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={addDocument}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Document</span>
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No documents found for this employee</p>
                    <p className="text-sm">Click "Add Document" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc, index) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Document {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                            title="Remove Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Related Service *
                            </label>
                            <select
                              value={doc.serviceId || ''}
                              onChange={(e) => updateDocument(doc.id, 'serviceId', e.target.value || undefined)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            >
                              <option value="">Select a service...</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name} ({service.category})
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              Link this document to a specific service
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Expiry Date *
                            </label>
                            <input
                              type="date"
                              value={doc.expiryDate}
                              onChange={(e) => updateDocument(doc.id, 'expiryDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Documents with expiry dates will create automatic reminders
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload File (Optional)
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  console.log('🎯 Employee file selected in onChange:', {
                                    name: file.name,
                                    type: file.type,
                                    size: file.size,
                                    docId: doc.id
                                  });

                                  // Force a re-render to see current state
                                  console.log('📊 Current employee document state before upload:', {
                                    docId: doc.id,
                                    hasFile: !!doc.file,
                                    hasPreview: !!doc.preview,
                                    serviceId: doc.serviceId
                                  });

                                  handleFileUpload(doc.id, file, e.target);
                                }
                              }}
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Supported formats: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                            </p>
                          </div>

                          {/* File Preview */}
                          {doc.preview && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <Eye className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700 font-medium">
                                  ✓ {doc.file ? doc.file.name : 'Existing file'} {doc.file ? 'ready for upload' : 'attached'}
                                </span>
                                {doc.fileUrl && !doc.file && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs underline ml-2"
                                  >
                                    View File
                                  </a>
                                )}
                              </div>

                              {/* Enhanced Image Preview */}
                              {doc.preview && doc.preview !== 'non-image' && doc.preview !== 'error' && doc.preview !== 'existing-file' && doc.preview !== 'existing-pdf' && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Preview:</span>
                                    <span className="text-xs text-gray-500">
                                      {doc.file ? `${(doc.file.size / 1024).toFixed(1)} KB` : 'Existing file'}
                                    </span>
                                  </div>
                                  <div className="flex justify-center">
                                    <div className="relative group">
                                      <img
                                        src={doc.preview}
                                        alt="Document Preview"
                                        className="max-w-full max-h-48 object-contain rounded border border-gray-300 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                        onError={(e) => {
                                          console.error('Employee preview image failed to load');
                                          e.currentTarget.style.display = 'none';
                                        }}
                                        onClick={() => {
                                          setModalImageSrc(doc.preview || '');
                                          setModalImageTitle('Employee Document Preview');
                                          setShowImageModal(true);
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                                          Click to view full size
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* PDF Preview Indicator */}
                              {doc.preview === 'existing-pdf' && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-3">
                                  <div className="flex items-center justify-center">
                                    <div className="text-center">
                                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-600">PDF Document</p>
                                      {doc.fileUrl && (
                                        <a
                                          href={doc.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-xs underline"
                                        >
                                          Open PDF
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Non-image file indicator */}
                              {doc.preview === 'non-image' && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-3">
                                  <div className="flex items-center justify-center">
                                    <div className="text-center">
                                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-600">
                                        {doc.file?.name || 'Document file'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {doc.file ? `${(doc.file.size / 1024).toFixed(1)} KB` : 'File attached'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditEmployee(false);
                    setSelectedEmployee(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{employeeToDelete.name}</strong>?
                This will permanently remove the employee and all associated data.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setEmployeeToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEmployee}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Edit Modal */}
      {showDocumentEdit && selectedDocument && (
        <DocumentEditModal
          document={selectedDocument}
          onClose={() => {
            setShowDocumentEdit(false);
            setSelectedDocument(null);
          }}
          onSave={async () => {
            setShowDocumentEdit(false);
            setSelectedDocument(null);
            if (selectedEmployee) {
              await loadEmployeeDocuments(selectedEmployee.id);
            }
          }}
        />
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={modalImageSrc}
              alt={modalImageTitle}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
              {modalImageTitle}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyEmployeeManagement;
