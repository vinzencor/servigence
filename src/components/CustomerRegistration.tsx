import React, { useState, useEffect } from 'react';
import { Save, Send, X, CheckCircle, AlertCircle, Phone, Mail, Users, User, Upload, FileText, Trash2, Eye, CreditCard, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { Company, Individual, ServiceEmployee, PaymentCard, ServiceType } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../lib/emailService';

interface CustomerRegistrationProps {
  onSave: (company: Company) => void;
  onSaveIndividual?: (individual: Individual) => void;
  onNavigate?: (view: string) => void;
}

const CustomerRegistration: React.FC<CustomerRegistrationProps> = ({ onSave, onSaveIndividual, onNavigate }) => {
  const { user, isSuperAdmin } = useAuth();
  const [registrationType, setRegistrationType] = useState<'company' | 'individual'>('company');
  const [serviceEmployees, setServiceEmployees] = useState<ServiceEmployee[]>([]);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [formData, setFormData] = useState({
    // Common fields
    phone1: '',
    phone2: '',
    email1: '',
    email2: '',
    address: '',
    creditLimit: '',
    dateOfRegistration: new Date().toISOString().split('T')[0],
    createdBy: user?.name || 'System',
    assignedTo: (user?.service_employee_id && user.service_employee_id.length === 36) ? user.service_employee_id : '',

    // Company specific fields
    companyName: '',
    vatTrnNo: '',
    companyType: '',
    licenseNo: '',
    mohreNo: '',
    moiNo: '',
    quota: '',
    companyGrade: '',
    proName: '',
    proPhone: '',
    proEmail: '',

    // Individual specific fields
    individualName: '',
    nationality: '',
    idNumber: '',
    passportNumber: '',
    passportExpiry: '',
    emiratesId: '',
    emiratesIdExpiry: '',
    visaNumber: '',
    visaExpiry: '',
    licenseNumber: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document upload state
  const [documents, setDocuments] = useState<Array<{
    id: string;
    expiryDate: string;
    serviceId?: string;
    file: File | null;
    fileUrl?: string;
    preview?: string;
  }>>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);

  // Advance payment state
  const [showAdvancePayment, setShowAdvancePayment] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });
  const [advancePaymentReceipt, setAdvancePaymentReceipt] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Image preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');
  const [modalImageTitle, setModalImageTitle] = useState('');

  useEffect(() => {
    loadServiceEmployees();
    loadPaymentCards();
    loadServices();
  }, []);

  const loadPaymentCards = async () => {
    try {
      const cards = await dbHelpers.getPaymentCards();
      setPaymentCards(cards);

      // Set default card if available
      const defaultCard = cards.find(card => card.isDefault && card.isActive);
      if (defaultCard) {
        setSelectedCard(defaultCard);
        setFormData(prev => ({
          ...prev,
          creditLimit: defaultCard.creditLimit.toString()
        }));
      }
    } catch (error) {
      console.error('Error loading payment cards:', error);
      toast.error('Failed to load payment cards');
    }
  };

  const loadServiceEmployees = async () => {
    try {
      const employees = await dbHelpers.getServiceEmployees();
      setServiceEmployees(employees || []);
    } catch (error) {
      console.error('Error loading service employees:', error);
    }
  };

  const loadServices = async () => {
    try {
      const serviceData = await dbHelpers.getServices();
      setServices(serviceData || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const companyTypes = [
    'Limited Liability Company (LLC)',
    'Free Zone Company',
    'Branch Office',
    'Representative Office',
    'Public Joint Stock Company',
    'Private Joint Stock Company',
    'Partnership Company',
    'Sole Proprietorship'
  ];

  const companyGrades = ['Grade A+', 'Grade A', 'Grade B+', 'Grade B', 'Grade C+', 'Grade C'];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.phone1.trim()) newErrors.phone1 = 'Primary phone is required';
    if (!formData.email1.trim()) newErrors.email1 = 'Primary email is required';

    // Payment card validation
    if (!selectedCard) {
      newErrors.creditLimit = 'Please select a payment card';
    }
    if (!formData.dateOfRegistration) newErrors.dateOfRegistration = 'Registration date is required';

    // Assignment validation for super admin
    if (isSuperAdmin && !formData.assignedTo) {
      newErrors.assignedTo = 'Please assign to a staff member';
    }

    // Type-specific validations
    if (registrationType === 'company') {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.companyType) newErrors.companyType = 'Company type is required';
      // if (!formData.companyGrade) newErrors.companyGrade = 'Company grade is required';
    } else {
      if (!formData.individualName.trim()) newErrors.individualName = 'Individual name is required';
      if (!formData.nationality?.trim()) newErrors.nationality = 'Nationality is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email1 && !emailRegex.test(formData.email1)) {
      newErrors.email1 = 'Invalid email format';
    }
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      newErrors.email2 = 'Invalid email format';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[0-9\-\s\(\)]{10,}$/;
    if (formData.phone1 && !phoneRegex.test(formData.phone1)) {
      newErrors.phone1 = 'Invalid phone format';
    }
    if (formData.phone2 && !phoneRegex.test(formData.phone2)) {
      newErrors.phone2 = 'Invalid phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Document handling functions
  const addDocument = () => {
    const newDoc = {
      id: Date.now().toString(),
      expiryDate: '',
      file: null,
      preview: undefined
    };
    setDocuments([...documents, newDoc]);
    setShowAddDocument(true);
  };

  const updateDocument = (id: string, field: string, value: any) => {
    console.log('🔄 Updating document:', { id, field, value: typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value });
    setDocuments(prevDocuments => {
      const updated = prevDocuments.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      );
      console.log('📋 Documents updated:', updated.map(d => ({ id: d.id, hasFile: !!d.file, hasPreview: !!d.preview })));
      return updated;
    });
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const createIndividualDocumentReminders = async (individualId: string, individual: any) => {
    try {
      console.log('🔔 Creating reminders for individual documents:', individual);

      const documentReminders = [];

      // Passport expiry reminder
      if (individual.passportExpiry) {
        const expiryDate = new Date(individual.passportExpiry);
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 10); // 10 days before expiry

        documentReminders.push({
          title: 'Passport Expiry Reminder',
          description: `Passport for ${individual.individualName} will expire on ${expiryDate.toLocaleDateString()}. Please renew this document before the expiry date.`,
          reminder_date: reminderDate.toISOString().split('T')[0],
          reminder_type: 'document_expiry',
          document_type: 'passport',
          individual_id: individualId,
          priority: 'high',
          status: 'active',
          days_before_reminder: 10,
          enabled: true,
          created_by: user?.name || 'System',
          assigned_to: user?.name || 'System'
        });
      }

      // Emirates ID expiry reminder
      if (individual.emiratesIdExpiry) {
        const expiryDate = new Date(individual.emiratesIdExpiry);
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 10);

        documentReminders.push({
          title: 'Emirates ID Expiry Reminder',
          description: `Emirates ID for ${individual.individualName} will expire on ${expiryDate.toLocaleDateString()}. Please renew this document before the expiry date.`,
          reminder_date: reminderDate.toISOString().split('T')[0],
          reminder_type: 'document_expiry',
          document_type: 'emirates_id',
          individual_id: individualId,
          priority: 'high',
          status: 'active',
          days_before_reminder: 10,
          enabled: true,
          created_by: user?.name || 'System',
          assigned_to: user?.name || 'System'
        });
      }

      // Visa expiry reminder
      if (individual.visaExpiry) {
        const expiryDate = new Date(individual.visaExpiry);
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 10);

        documentReminders.push({
          title: 'Visa Expiry Reminder',
          description: `Visa for ${individual.individualName} will expire on ${expiryDate.toLocaleDateString()}. Please renew this document before the expiry date.`,
          reminder_date: reminderDate.toISOString().split('T')[0],
          reminder_type: 'document_expiry',
          document_type: 'visa',
          individual_id: individualId,
          priority: 'high',
          status: 'active',
          days_before_reminder: 10,
          enabled: true,
          created_by: user?.name || 'System',
          assigned_to: user?.name || 'System'
        });
      }

      // Insert all reminders
      if (documentReminders.length > 0) {
        console.log('💾 Inserting individual document reminders:', documentReminders);

        const { data: reminderResults, error: reminderError } = await supabase
          .from('reminders')
          .insert(documentReminders)
          .select();

        if (reminderError) {
          console.error('❌ Error creating individual reminders:', reminderError);
          throw reminderError;
        }

        console.log('✅ Individual reminders created successfully:', reminderResults);
        toast.success(`${documentReminders.length} document reminder(s) created for ${individual.individualName}`);
      }
    } catch (error) {
      console.error('❌ Error creating individual document reminders:', error);
      toast.error('Failed to create some reminders');
    }
  };

  const handleFileUpload = (id: string, file: File) => {
    console.log('🔄 Starting file upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentId: id,
      isImage: file.type.startsWith('image/')
    });

    // Update the file immediately
    updateDocument(id, 'file', file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      console.log('📸 Processing image file...');
      const reader = new FileReader();

      reader.onload = (e) => {
        const preview = e.target?.result as string;
        console.log('✅ Preview generated successfully:', {
          fileName: file.name,
          previewLength: preview?.length,
          previewStart: preview?.substring(0, 50) + '...'
        });
        updateDocument(id, 'preview', preview);

        // Force a state check after setting preview
        setTimeout(() => {
          const updatedDoc = documents.find(d => d.id === id);
          console.log('🔍 Document state after preview update:', {
            docId: id,
            hasPreview: !!updatedDoc?.preview,
            previewType: typeof updatedDoc?.preview,
            previewValue: updatedDoc?.preview?.substring(0, 50) + '...'
          });
        }, 50);
      };

      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        updateDocument(id, 'preview', 'error');
      };

      reader.readAsDataURL(file);
    } else {
      console.log('📄 Non-image file, setting placeholder preview');
      updateDocument(id, 'preview', 'non-image');
    }
  };

  const uploadDocumentToSupabase = async (file: File, entityId: string, docTitle: string) => {
    const fileExt = file.name.split('.').pop();
    const entityType = registrationType === 'company' ? 'companies' : 'individuals';
    const fileName = `${entityType}/${entityId}/${docTitle.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const createReminder = async (companyId: string, docTitle: string, expiryDate: string, documentType: string, serviceId?: string) => {
    if (!expiryDate) {
      console.log('⚠️ No expiry date provided, skipping reminder creation');
      return;
    }

    console.log('📅 Creating reminder for document:', {
      companyId,
      docTitle,
      expiryDate,
      documentType
    });

    const reminderDate = new Date(expiryDate);
    reminderDate.setDate(reminderDate.getDate() - 10); // 10 days before expiry

    const reminderData = {
      title: `${docTitle} Expiry Reminder`,
      description: `${docTitle} for company will expire on ${new Date(expiryDate).toLocaleDateString()}. Please renew this document before the expiry date.`,
      reminder_date: reminderDate.toISOString().split('T')[0],
      reminder_type: 'document_expiry',
      document_type: documentType,
      company_id: companyId,
      service_id: serviceId || null,
      priority: 'high',
      status: 'active', // Set to 'active' so it shows in dashboard
      days_before_reminder: 10,
      enabled: true, // Enable by default so it shows in reminders
      created_by: user?.name || 'System',
      assigned_to: user?.name || 'System'
    };

    console.log('💾 Inserting reminder data:', reminderData);

    const { data, error } = await supabase
      .from('reminders')
      .insert([reminderData])
      .select();

    if (error) {
      console.error('❌ Error creating reminder:', error);
      toast.error(`Failed to create reminder for ${docTitle}`);
    } else {
      console.log('✅ Reminder created successfully:', data);
      toast.success(`📅 Reminder created: ${docTitle} expires ${new Date(expiryDate).toLocaleDateString()}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Validate user authentication
    if (!user) {
      toast.error('Please log in to create registrations');
      return;
    }

    setIsSubmitting(true);

    // Declare variables at function scope for advance payment processing
    let createdCompany: any = null;
    let createdIndividual: any = null;
    let newCompany: any = null;
    let newIndividual: any = null;

    try {
      if (registrationType === 'company') {
        newCompany = {
          id: Date.now().toString(),
          companyName: formData.companyName,
          vatTrnNo: formData.vatTrnNo || undefined,
          phone1: formData.phone1,
          phone2: formData.phone2 || undefined,
          email1: formData.email1,
          email2: formData.email2 || undefined,
          address: formData.address || undefined,
          companyType: formData.companyType,
          licenseNo: formData.licenseNo || undefined,
          mohreNo: formData.mohreNo || undefined,
          moiNo: formData.moiNo || undefined,
          quota: formData.quota || undefined,
          companyGrade: formData.companyGrade,
          creditLimit: parseFloat(formData.creditLimit),
          proName: formData.proName || undefined,
          proPhone: formData.proPhone || undefined,
          proEmail: formData.proEmail || undefined,
          dateOfRegistration: formData.dateOfRegistration,
          createdBy: formData.createdBy,
          status: 'active',
          employeeCount: 0
        };

        // Save to Supabase and get the created company ID
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([{
            company_name: newCompany.companyName,
            vat_trn_no: newCompany.vatTrnNo,
            phone1: newCompany.phone1,
            phone2: newCompany.phone2,
            email1: newCompany.email1,
            email2: newCompany.email2,
            address: newCompany.address,
            company_type: newCompany.companyType,
            license_no: newCompany.licenseNo,
            mohre_no: newCompany.mohreNo,
            moi_no: newCompany.moiNo,
            quota: newCompany.quota,
            company_grade: newCompany.companyGrade,
            credit_limit: newCompany.creditLimit,
            pro_name: newCompany.proName,
            pro_phone: newCompany.proPhone,
            pro_email: newCompany.proEmail,
            date_of_registration: newCompany.dateOfRegistration,
            created_by: newCompany.createdBy,
            status: newCompany.status,
            employee_count: newCompany.employeeCount,
            assigned_to: formData.assignedTo && formData.assignedTo.trim() !== '' ? formData.assignedTo : null
          }])
          .select()
          .single();

        if (companyError) throw companyError;

        createdCompany = companyData;
        const companyId = createdCompany.id;

        // Handle document uploads and create reminders
        console.log('📄 Processing documents:', documents.length);

        for (const doc of documents) {
          console.log('🔄 Processing document:', {
            hasFile: !!doc.file,
            hasExpiryDate: !!doc.expiryDate,
            hasServiceId: !!doc.serviceId
          });

          // Process documents that have at least a service and expiry date
          if (doc.serviceId && doc.expiryDate) {
            try {
              let fileUrl = null;

              // Upload file to Supabase Storage if file exists
              if (doc.file) {
                console.log('📤 Uploading file for document');
                fileUrl = await uploadDocumentToSupabase(doc.file, companyId, `document_${Date.now()}`);
                console.log('✅ File uploaded successfully:', fileUrl);
              }

              // Get service name for document title
              const service = services.find(s => s.id === doc.serviceId);
              const documentTitle = service ? `${service.name} Document` : 'Service Document';

              // Save document metadata to database
              const documentData = {
                company_id: companyId,
                title: documentTitle,
                document_number: null,
                expiry_date: doc.expiryDate,
                service_id: doc.serviceId,
                file_attachments: fileUrl ? [{
                  name: doc.file?.name,
                  url: fileUrl,
                  type: doc.file?.type,
                  size: doc.file?.size
                }] : null,
                created_by: user?.name || 'System',
                status: 'active'
              };

              console.log('💾 Saving document to database:', documentData);

              const { error: docError } = await supabase
                .from('company_documents')
                .insert([documentData]);

              if (docError) {
                console.error('❌ Error saving document:', docError);
                toast.error(`Failed to save document: ${documentTitle}`);
              } else {
                console.log('✅ Document saved successfully:', documentTitle);

                // Create reminder for expiry date (required field)
                console.log('📅 Creating reminder for document with expiry date:', doc.expiryDate);
                await createReminder(companyId, documentTitle, doc.expiryDate, 'company_document', doc.serviceId);

                // Dispatch event to notify other components about reminder creation
                window.dispatchEvent(new CustomEvent('reminderCreated', {
                  detail: { companyId, documentTitle: documentTitle, expiryDate: doc.expiryDate }
                }));
              }
            } catch (error) {
              console.error('❌ Error processing document:', error);
              const service = services.find(s => s.id === doc.serviceId);
              const documentTitle = service ? `${service.name} Document` : 'Service Document';
              toast.error(`Failed to process document: ${documentTitle}`);
            }
          } else {
            console.log('⚠️ Skipping document without service or expiry date');
          }
        }

        // Send welcome email
        try {
          console.log('🔄 Attempting to send welcome email for company:', newCompany.companyName);

          const emailSent = await emailService.sendWelcomeEmail({
            companyName: newCompany.companyName,
            primaryEmail: newCompany.email1,
            secondaryEmail: newCompany.email2
          });

          if (emailSent) {
            toast.success(`✅ Company registered successfully! Welcome email sent to ${newCompany.email1}${newCompany.email2 ? ` and ${newCompany.email2}` : ''}.`);
          } else {
            toast.success('⚠️ Company registered successfully! (Email sending failed - please check email server)');
          }
        } catch (emailError) {
          console.error('❌ Email sending failed:', emailError);
          toast.success('⚠️ Company registered successfully! (Email sending failed - please check email server)');
        }

        onSave(newCompany);

        // Dispatch event to notify other components about new company and documents
        window.dispatchEvent(new CustomEvent('documentUpdated', {
          detail: { companyId: newCompany.id, documentsProcessed: documents.length, isNewCompany: true }
        }));

        // Only navigate automatically if no advance payment modal will be shown
        if (!showAdvancePayment || !advancePaymentForm.amount || parseFloat(advancePaymentForm.amount) <= 0) {
          // Navigate back to companies list
          setTimeout(() => {
            onNavigate?.('companies');
          }, 1500); // Give time for toast to show
        }
      } else {
        newIndividual = {
          id: Date.now().toString(),
          individualName: formData.individualName,
          nationality: formData.nationality,
          phone1: formData.phone1,
          phone2: formData.phone2 || undefined,
          email1: formData.email1,
          email2: formData.email2 || undefined,
          address: formData.address || undefined,
          idNumber: formData.idNumber || undefined,
          passportNumber: formData.passportNumber || undefined,
          passportExpiry: formData.passportExpiry || undefined,
          emiratesId: formData.emiratesId || undefined,
          emiratesIdExpiry: formData.emiratesIdExpiry || undefined,
          visaNumber: formData.visaNumber || undefined,
          visaExpiry: formData.visaExpiry || undefined,
          licenseNumber: formData.licenseNumber || undefined,
          creditLimit: parseFloat(formData.creditLimit),
          dateOfRegistration: formData.dateOfRegistration,
          createdBy: formData.createdBy,
          status: 'active'
        };

        // Save to Supabase
        createdIndividual = await dbHelpers.createIndividual({
          individual_name: newIndividual.individualName,
          nationality: newIndividual.nationality,
          phone1: newIndividual.phone1,
          phone2: newIndividual.phone2,
          email1: newIndividual.email1,
          email2: newIndividual.email2,
          address: newIndividual.address,
          id_number: newIndividual.idNumber,
          passport_number: newIndividual.passportNumber,
          passport_expiry: newIndividual.passportExpiry,
          emirates_id: newIndividual.emiratesId,
          emirates_id_expiry: newIndividual.emiratesIdExpiry,
          visa_number: newIndividual.visaNumber,
          visa_expiry: newIndividual.visaExpiry,
          license_number: newIndividual.licenseNumber,
          credit_limit: newIndividual.creditLimit,
          date_of_registration: newIndividual.dateOfRegistration,
          created_by: newIndividual.createdBy,
          status: newIndividual.status,
          assigned_to: formData.assignedTo && formData.assignedTo.trim() !== '' ? formData.assignedTo : null
        });

        if (onSaveIndividual) {
          onSaveIndividual(newIndividual);
        }

        // Handle document uploads for individuals
        console.log('📄 Processing individual documents:', documents.length);

        for (const doc of documents) {
          console.log('🔄 Processing individual document:', {
            hasFile: !!doc.file,
            hasExpiryDate: !!doc.expiryDate,
            hasServiceId: !!doc.serviceId
          });

          // Process documents that have at least a service and expiry date
          if (doc.serviceId && doc.expiryDate) {
            try {
              let fileUrl = null;

              // Upload file to Supabase Storage if file exists
              if (doc.file) {
                console.log('📤 Uploading file for individual document');
                fileUrl = await uploadDocumentToSupabase(doc.file, createdIndividual.id, `document_${Date.now()}`);
                console.log('✅ Individual file uploaded successfully:', fileUrl);
              }

              // Get service name for document title
              const service = services.find(s => s.id === doc.serviceId);
              const documentTitle = service ? `${service.name} Document` : 'Service Document';

              // Prepare document data for individual_documents table
              const documentData = {
                individual_id: createdIndividual.id,
                title: documentTitle,
                document_number: null,
                issue_date: null,
                expiry_date: doc.expiryDate,
                document_type: 'individual_document',
                file_attachments: fileUrl ? [{ name: doc.file?.name, url: fileUrl }] : [],
                created_by: user?.name || 'System',
                status: 'active'
              };

              console.log('💾 Saving individual document to database:', documentData);

              const { error: docError } = await supabase
                .from('individual_documents')
                .insert([documentData]);

              if (docError) {
                console.error('❌ Error saving individual document:', docError);
                toast.error(`Failed to save document: ${documentTitle}`);
              } else {
                console.log('✅ Individual document saved successfully:', documentTitle);

                // Create reminder for expiry date (required field)
                console.log('📅 Creating reminder for individual document with expiry date:', doc.expiryDate);
                await dbHelpers.createIndividualDocumentReminder(
                  createdIndividual.id,
                  documentTitle,
                  doc.expiryDate,
                  'individual_document',
                  newIndividual.individualName
                );
              }
            } catch (error) {
              console.error('❌ Error processing individual document:', error);
              const service = services.find(s => s.id === doc.serviceId);
              const documentTitle = service ? `${service.name} Document` : 'Service Document';
              toast.error(`Failed to process document: ${documentTitle}`);
            }
          } else {
            console.log('⚠️ Skipping individual document without service or expiry date');
          }
        }

        // Create reminders for built-in document expiry dates (passport, emirates ID, visa)
        if (createdIndividual?.id) {
          await createIndividualDocumentReminders(createdIndividual.id, newIndividual);
        }

        // Send welcome email for individual registration
        try {
          console.log('🔄 Attempting to send welcome email for individual:', newIndividual.individualName);

          const emailSent = await emailService.sendIndividualWelcomeEmail({
            individualName: newIndividual.individualName,
            primaryEmail: newIndividual.email1,
            secondaryEmail: newIndividual.email2
          });

          if (emailSent) {
            toast.success(`✅ Individual registered successfully! Welcome email sent to ${newIndividual.email1}${newIndividual.email2 ? ` and ${newIndividual.email2}` : ''}.`);
          } else {
            toast.success('⚠️ Individual registered successfully! (Email sending failed - please check email server)');
          }
        } catch (emailError) {
          console.error('❌ Email sending failed:', emailError);
          toast.success('⚠️ Individual registered successfully! (Email sending failed - please check email server)');
        }
      }

      // Process advance payment if provided
      if (showAdvancePayment && advancePaymentForm.amount && parseFloat(advancePaymentForm.amount) > 0) {
        try {
          console.log('💰 Processing advance payment:', advancePaymentForm);

          let customerId, customerName;

          if (registrationType === 'company') {
            customerId = createdCompany?.id;
            customerName = newCompany.companyName;
          } else {
            customerId = createdIndividual?.id;
            customerName = newIndividual.individualName;
          }

          if (!customerId) {
            throw new Error('Customer ID not available for advance payment');
          }

          const paymentData = {
            [registrationType === 'company' ? 'company_id' : 'individual_id']: customerId,
            amount: parseFloat(advancePaymentForm.amount),
            payment_method: advancePaymentForm.paymentMethod,
            payment_date: advancePaymentForm.paymentDate,
            payment_reference: advancePaymentForm.paymentReference || null,
            notes: advancePaymentForm.notes || null,
            description: `Advance payment for ${registrationType} registration: ${customerName}`,
            created_by: user?.name || 'System',
            status: 'completed' // Changed from 'confirmed' to 'completed' to match database constraint
          };

          console.log('💾 Saving advance payment:', paymentData);

          const createdPayment = await dbHelpers.createCustomerAdvancePayment(paymentData);

          console.log('✅ Advance payment created:', createdPayment);

          // Set receipt data for modal
          setAdvancePaymentReceipt({
            ...createdPayment,
            customerName,
            customerType: registrationType
          });

          // Show receipt modal
          setShowReceiptModal(true);

          toast.success(`💰 Advance payment of AED ${parseFloat(advancePaymentForm.amount).toLocaleString()} recorded successfully!`);
        } catch (error) {
          console.error('❌ Error processing advance payment:', error);
          toast.error('Failed to process advance payment. Registration completed successfully.');
        }
      }

      setShowSuccess(true);

      // Trigger refresh for other components
      localStorage.setItem('company_updated', Date.now().toString());
      window.dispatchEvent(new StorageEvent('storage', { key: 'company_updated' }));

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Error saving registration:', error);
      // Handle error - you might want to show an error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phone1: '',
      phone2: '',
      email1: '',
      email2: '',
      address: '',
      creditLimit: '',
      dateOfRegistration: new Date().toISOString().split('T')[0],
      createdBy: user?.name || 'System',
      assignedTo: (user?.service_employee_id && user.service_employee_id.length === 36) ? user.service_employee_id : '',
      companyName: '',
      vatTrnNo: '',
      companyType: '',
      licenseNo: '',
      mohreNo: '',
      moiNo: '',
      quota: '',
      companyGrade: '',
      proName: '',
      proPhone: '',
      proEmail: '',
      individualName: '',
      nationality: '',
      idNumber: '',
      passportNumber: '',
      passportExpiry: '',
      emiratesId: '',
      emiratesIdExpiry: '',
      visaNumber: '',
      visaExpiry: '',
      licenseNumber: ''
    });
    setDocuments([]);
    setShowAdvancePayment(false);
    setAdvancePaymentForm({
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      paymentReference: '',
      notes: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAdvancePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAdvancePaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCardSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cardId = e.target.value;
    if (cardId) {
      const card = paymentCards.find(c => c.id === cardId);
      if (card) {
        setSelectedCard(card);
        setFormData(prev => ({
          ...prev,
          creditLimit: card.creditLimit.toString()
        }));
      }
    } else {
      setSelectedCard(null);
      setFormData(prev => ({
        ...prev,
        creditLimit: ''
      }));
    }
  };

  const generateAdvancePaymentInvoice = () => {
    if (!advancePaymentReceipt) return;

    const invoiceHTML = generateAdvancePaymentInvoiceHTML();

    // Create a new window for printing/downloading
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const generateAdvancePaymentInvoiceHTML = () => {
    if (!advancePaymentReceipt) return '';

    const currentDate = new Date().toLocaleDateString();
    const paymentDate = new Date(advancePaymentReceipt.payment_date).toLocaleDateString();
    const dueDate = new Date(advancePaymentReceipt.payment_date).toLocaleDateString(); // Same as payment date for advance payments

    // Get customer contact information from form data
    const customerAddress = formData.address || 'N/A';
    const customerPhone = formData.phone1 || 'N/A';
    const customerEmail = formData.email1 || 'N/A';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Advance Payment Invoice - ${advancePaymentReceipt.invoice_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-info {
            flex: 1;
          }
          .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .company-tagline {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 14px;
            color: #4b5563;
            line-height: 1.4;
          }
          .invoice-info {
            text-align: right;
            flex: 1;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .invoice-number {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .invoice-date {
            font-size: 14px;
            color: #6b7280;
          }
          .billing-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
          }
          .billing-info {
            flex: 1;
            margin-right: 20px;
          }
          .billing-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
          }
          .billing-details {
            font-size: 14px;
            color: #4b5563;
            line-height: 1.6;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .items-table th {
            background-color: #f8fafc;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          .items-table td {
            padding: 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .items-table .amount {
            text-align: right;
            font-weight: 600;
          }
          .totals-section {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-table {
            width: 300px;
          }
          .totals-table td {
            padding: 8px 15px;
            border: none;
          }
          .totals-table .label {
            text-align: right;
            font-weight: 600;
            color: #4b5563;
          }
          .totals-table .amount {
            text-align: right;
            font-weight: 600;
            color: #1f2937;
          }
          .total-row {
            border-top: 2px solid #2563eb;
            background-color: #f8fafc;
          }
          .total-row .label {
            color: #2563eb;
            font-size: 18px;
          }
          .total-row .amount {
            color: #2563eb;
            font-size: 18px;
          }
          .payment-info {
            background-color: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            border-left: 4px solid #2563eb;
          }
          .payment-info h4 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 16px;
          }
          .payment-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 14px;
          }
          .payment-detail {
            display: flex;
            justify-content: space-between;
          }
          .payment-detail .label {
            font-weight: 600;
            color: #374151;
          }
          .payment-detail .value {
            color: #1f2937;
          }
          .terms {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
          .terms h4 {
            color: #374151;
            margin-bottom: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            background-color: #10b981;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">SERVIGENCE</div>
            <div class="company-tagline">Professional Business Services</div>
            <div class="company-details">
              Dubai, United Arab Emirates<br>
              Phone: +971 XX XXX XXXX<br>
              Email: info@servigence.com<br>
              Website: www.servigence.com
            </div>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">Invoice #: ${advancePaymentReceipt.invoice_number}</div>
            <div class="invoice-date">Date: ${currentDate}</div>
            <div class="invoice-date">Due Date: ${dueDate}</div>
            <div style="margin-top: 10px;">
              <span class="status-badge">PAID</span>
            </div>
          </div>
        </div>

        <div class="billing-section">
          <div class="billing-info">
            <div class="billing-title">Bill To:</div>
            <div class="billing-details">
              <strong>${advancePaymentReceipt.customerName}</strong><br>
              ${customerAddress}<br>
              Phone: ${customerPhone}<br>
              Email: ${customerEmail}
            </div>
          </div>
          <div class="billing-info">
            <div class="billing-title">Payment Information:</div>
            <div class="billing-details">
              <strong>Payment Date:</strong> ${paymentDate}<br>
              <strong>Payment Method:</strong> ${advancePaymentReceipt.payment_method.toUpperCase()}<br>
              ${advancePaymentReceipt.payment_reference ? `<strong>Reference:</strong> ${advancePaymentReceipt.payment_reference}<br>` : ''}
              <strong>Receipt #:</strong> ${advancePaymentReceipt.receipt_number}
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 60%;">Description</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 25%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Advance Payment</strong><br>
                <span style="color: #6b7280; font-size: 14px;">
                  Advance payment for ${registrationType} registration: ${advancePaymentReceipt.customerName}
                </span>
                ${advancePaymentReceipt.notes ? `<br><span style="color: #6b7280; font-size: 12px; font-style: italic;">Note: ${advancePaymentReceipt.notes}</span>` : ''}
              </td>
              <td style="text-align: center;">1</td>
              <td class="amount">AED ${parseFloat(advancePaymentReceipt.amount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="label">Subtotal:</td>
              <td class="amount">AED ${parseFloat(advancePaymentReceipt.amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">VAT (0%):</td>
              <td class="amount">AED 0.00</td>
            </tr>
            <tr class="total-row">
              <td class="label">Total Amount:</td>
              <td class="amount">AED ${parseFloat(advancePaymentReceipt.amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">Amount Paid:</td>
              <td class="amount" style="color: #10b981;">AED ${parseFloat(advancePaymentReceipt.amount).toLocaleString()}</td>
            </tr>
            <tr>
              <td class="label">Balance Due:</td>
              <td class="amount" style="color: #10b981; font-weight: bold;">AED 0.00</td>
            </tr>
          </table>
        </div>

        <div class="payment-info">
          <h4>Payment Confirmation</h4>
          <div class="payment-details">
            <div class="payment-detail">
              <span class="label">Payment Status:</span>
              <span class="value" style="color: #10b981; font-weight: bold;">CONFIRMED</span>
            </div>
            <div class="payment-detail">
              <span class="label">Transaction Date:</span>
              <span class="value">${paymentDate}</span>
            </div>
            <div class="payment-detail">
              <span class="label">Payment Method:</span>
              <span class="value">${advancePaymentReceipt.payment_method.toUpperCase()}</span>
            </div>
            <div class="payment-detail">
              <span class="label">Processed By:</span>
              <span class="value">${advancePaymentReceipt.created_by || 'System'}</span>
            </div>
          </div>
        </div>

        <div class="terms">
          <h4>Terms & Conditions:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>This advance payment will be applied to future services as requested.</li>
            <li>Advance payments are non-refundable unless otherwise agreed in writing.</li>
            <li>This invoice serves as confirmation of payment received.</li>
            <li>For any queries regarding this payment, please contact us with the invoice number.</li>
          </ul>
        </div>

        <div class="footer">
          <p><strong>Thank you for choosing SERVIGENCE!</strong></p>
          <p>This is a computer-generated invoice. Generated on ${currentDate} at ${new Date().toLocaleTimeString()}</p>
          <p>For support, contact us at info@servigence.com or +971 XX XXX XXXX</p>
        </div>
      </body>
      </html>
    `;
  };

  const generateAdvancePaymentReceipt = () => {
    if (!advancePaymentReceipt) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Advance Payment Receipt - ${advancePaymentReceipt.receipt_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .receipt-title {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            margin: 20px 0;
          }
          .receipt-number {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 10px;
          }
          .details-section {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #059669;
          }
          .label {
            font-weight: 600;
            color: #374151;
          }
          .value {
            color: #111827;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .notes {
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
          }
          @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">SERVIGENCE</div>
          <div style="color: #6b7280;">Professional Services</div>
        </div>

        <div class="receipt-title">ADVANCE PAYMENT RECEIPT</div>
        <div class="receipt-number">Receipt #: ${advancePaymentReceipt.receipt_number}</div>

        <div class="details-section">
          <div class="detail-row">
            <span class="label">Customer Name:</span>
            <span class="value">${advancePaymentReceipt.customerName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Customer Type:</span>
            <span class="value">${advancePaymentReceipt.customerType === 'company' ? 'Company' : 'Individual'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Date:</span>
            <span class="value">${new Date(advancePaymentReceipt.payment_date).toLocaleDateString()}</span>
          </div>
          <div class="detail-row">
            <span class="label">Payment Method:</span>
            <span class="value">${advancePaymentReceipt.payment_method.toUpperCase()}</span>
          </div>
          ${advancePaymentReceipt.payment_reference ? `
          <div class="detail-row">
            <span class="label">Payment Reference:</span>
            <span class="value">${advancePaymentReceipt.payment_reference}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="label">Amount Paid:</span>
            <span class="value">AED ${parseFloat(advancePaymentReceipt.amount).toLocaleString()}</span>
          </div>
        </div>

        ${advancePaymentReceipt.notes ? `
        <div class="notes">
          <strong>Notes:</strong><br>
          ${advancePaymentReceipt.notes}
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>This is a computer-generated receipt.</p>
        </div>
      </body>
      </html>
    `;

    // Create a new window for printing/downloading
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-20 right-6 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 flex items-center space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Company Registered Successfully!</p>
            <p className="text-sm text-green-600">Notifications sent via WhatsApp and email</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-green-600 hover:text-green-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <h1 className="text-2xl font-bold text-white">Customer Registration</h1>
          <p className="text-blue-100 mt-1">Register a new company or individual with complete details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Registration Type Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRegistrationType('company')}
                className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-3 transition-all ${
                  registrationType === 'company'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="font-medium">Company Registration</span>
              </button>
              <button
                type="button"
                onClick={() => setRegistrationType('individual')}
                className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-3 transition-all ${
                  registrationType === 'individual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="font-medium">Individual Registration</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="col-span-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                {registrationType === 'company' ? 'Company Information' : 'Individual Information'}
              </h2>
            </div>

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter company name"
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyName}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Individual Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="individualName"
                  value={formData.individualName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.individualName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter individual name"
                />
                {errors.individualName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.individualName}
                  </p>
                )}
              </div>
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">VAT/TRN Number</label>
                <input
                  type="text"
                  name="vatTrnNo"
                  value={formData.vatTrnNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="TRN100000000000000"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nationality ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select company type</option>
                  {companyTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.companyType && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyType}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter ID number"
                />
              </div>
            )}

            {registrationType === 'company' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  name="licenseNo"
                  value={formData.licenseNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DED-000000"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number</label>
                <input
                  type="text"
                  name="passportNumber"
                  value={formData.passportNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter passport number"
                />
              </div>
            )}

            {registrationType === 'company' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MOHRE Number</label>
                  <input
                    type="text"
                    name="mohreNo"
                    value={formData.mohreNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MOH-000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MOI Number</label>
                  <input
                    type="text"
                    name="moiNo"
                    value={formData.moiNo}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="MOI-000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quota</label>
                  <input
                    type="text"
                    name="quota"
                    value={formData.quota}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15"
                  />
                </div>

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="companyGrade"
                    value={formData.companyGrade}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.companyGrade ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select grade</option>
                    {companyGrades.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  {errors.companyGrade && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.companyGrade}
                    </p>
                  )}
                </div> */}
              </>
            )}

            {registrationType === 'individual' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passport Expiry</label>
                  <input
                    type="date"
                    name="passportExpiry"
                    value={formData.passportExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID</label>
                  <input
                    type="text"
                    name="emiratesId"
                    value={formData.emiratesId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="784-YYYY-XXXXXXX-X"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emirates ID Expiry</label>
                  <input
                    type="date"
                    name="emiratesIdExpiry"
                    value={formData.emiratesIdExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Number</label>
                  <input
                    type="text"
                    name="visaNumber"
                    value={formData.visaNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter visa number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visa Expiry</label>
                  <input
                    type="date"
                    name="visaExpiry"
                    value={formData.visaExpiry}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter license number"
                  />
                </div>
              </>
            )}

            {/* Contact Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold text-sm">2</span>
                </div>
                Contact Information
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone1"
                  value={formData.phone1}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+971-4-000-0000"
                />
              </div>
              {errors.phone1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone2"
                  value={formData.phone2}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="+971-50-000-0000"
                />
              </div>
              {errors.phone2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone2}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email1"
                  value={formData.email1}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="admin@company.ae"
                />
              </div>
              {errors.email1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email2"
                  value={formData.email2}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="finance@company.ae"
                />
              </div>
              {errors.email2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email2}
                </p>
              )}
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full business address including emirate"
              />
            </div>

            {/* Financial Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-amber-600 font-bold text-sm">3</span>
                </div>
                Financial Information
              </h2>
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Card <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedCard?.id || ''}
                  onChange={handleCardSelection}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.creditLimit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a payment card</option>
                  {paymentCards
                    .filter(card => card.isActive)
                    .map(card => (
                      <option key={card.id} value={card.id}>
                        {card.cardName} - AED {card.creditLimit.toLocaleString()}
                        {card.isDefault ? ' (Default)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              {errors.creditLimit && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Please select a payment card
                </p>
              )}
              {selectedCard && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">{selectedCard.cardName}</span>
                  </div>
                  <div className="mt-1 text-sm text-blue-600">
                    Credit Limit: AED {selectedCard.creditLimit.toLocaleString()}
                    {selectedCard.bankName && ` • Bank: ${selectedCard.bankName}`}
                  </div>
                  {selectedCard.cardDescription && (
                    <div className="mt-1 text-xs text-blue-600">
                      {selectedCard.cardDescription}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRO Information - Only for Companies */}
            {registrationType === 'company' && (
              <>
                <div className="col-span-full mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-bold text-sm">4</span>
                    </div>
                    PRO Information
                  </h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Name</label>
                  <input
                    type="text"
                    name="proName"
                    value={formData.proName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PRO representative name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Phone</label>
                  <input
                    type="tel"
                    name="proPhone"
                    value={formData.proPhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+971-55-000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PRO Email</label>
                  <input
                    type="email"
                    name="proEmail"
                    value={formData.proEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="pro@services.ae"
                  />
                </div>
              </>
            )}

            {/* Registration Information */}
            <div className="col-span-full mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-red-600 font-bold text-sm">5</span>
                </div>
                Registration Information
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Registration <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfRegistration"
                value={formData.dateOfRegistration}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dateOfRegistration ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.dateOfRegistration && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.dateOfRegistration}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
              <input
                type="text"
                name="createdBy"
                value={formData.createdBy}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
            </div>

            {isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Staff Member <span className="text-red-500">*</span>
                </label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.assignedTo ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select staff member</option>
                  {serviceEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.email}
                    </option>
                  ))}
                </select>
                {errors.assignedTo && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.assignedTo}
                  </p>
                )}
              </div>
            )}

            {/* Document Upload Section - For Both Companies and Individuals */}
            <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Documents & Certificates</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload {registrationType === 'company' ? 'company' : 'personal'} documents and certificates (optional). Documents with expiry dates will automatically create reminders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>Add Document</span>
                </button>
              </div>

                {documents.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded">
                      Debug: {documents.length} documents in state
                    </div>
                    {documents.map((doc, index) => (
                      <div key={`${doc.id}-${doc.file?.name || 'no-file'}-${doc.preview ? 'has-preview' : 'no-preview'}`} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Document {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
                                  console.log('🎯 File selected in onChange:', {
                                    name: file.name,
                                    type: file.type,
                                    size: file.size,
                                    docId: doc.id
                                  });

                                  // Force a re-render to see current state
                                  console.log('📊 Current document state before upload:', {
                                    docId: doc.id,
                                    hasFile: !!doc.file,
                                    hasPreview: !!doc.preview,
                                    serviceId: doc.serviceId
                                  });

                                  handleFileUpload(doc.id, file);

                                  // Check state after a short delay
                                  setTimeout(() => {
                                    const updatedDoc = documents.find(d => d.id === doc.id);
                                    console.log('📊 Document state after upload:', {
                                      docId: doc.id,
                                      hasFile: !!updatedDoc?.file,
                                      hasPreview: !!updatedDoc?.preview,
                                      previewLength: updatedDoc?.preview?.length
                                    });
                                  }, 100);
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                            </p>
                            {doc.file && (
                              <div className="flex items-center space-x-2 mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                                <Eye className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700 font-medium">
                                  ✓ {doc.file.name} uploaded successfully
                                </span>
                              </div>
                            )}
                          </div>

                          {doc.file && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-2">
                                File Preview
                              </div>
                              {doc.file.type.startsWith('image/') ? (
                                doc.preview && doc.preview !== 'non-image' && doc.preview !== 'error' ? (
                                  <div className="relative group">
                                    <img
                                      src={doc.preview}
                                      alt="Document preview"
                                      className="w-48 h-36 object-cover rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                      onLoad={() => console.log('Image loaded successfully:', doc.file?.name)}
                                      onError={(e) => {
                                        console.error('Image failed to load:', doc.file?.name, e);
                                        console.log('Preview data length:', doc.preview?.length);
                                      }}
                                      onClick={() => {
                                        setModalImageSrc(doc.preview);
                                        setModalImageTitle(doc.file?.name || 'Document Preview');
                                        setShowImageModal(true);
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                      Image
                                    </div>
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                                        Click to view full size
                                      </span>
                                    </div>
                                  </div>
                                ) : doc.preview === 'error' ? (
                                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-700">
                                      ❌ Failed to generate preview for {doc.file.name}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-700">
                                      🖼️ Generating image preview... ({doc.file.name})
                                    </p>
                                  </div>
                                )
                              ) : doc.file.type === 'application/pdf' ? (
                                <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                  <FileText className="w-8 h-8 text-red-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      PDF Document • {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                    PDF
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                                  <FileText className="w-8 h-8 text-gray-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {doc.file.type || 'Unknown type'} • {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                    Document
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
            </div>

            {/* Advance Payment Section */}
            <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Advance Payment (Optional)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Record an advance payment for this {registrationType === 'company' ? 'company' : 'individual'}. A receipt will be generated automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvancePayment(!showAdvancePayment)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shrink-0"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{showAdvancePayment ? 'Hide' : 'Add'} Advance Payment</span>
                </button>
              </div>

              {showAdvancePayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount (AED) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={advancePaymentForm.amount}
                      onChange={handleAdvancePaymentChange}
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="paymentDate"
                      value={advancePaymentForm.paymentDate}
                      onChange={handleAdvancePaymentChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paymentMethod"
                      value={advancePaymentForm.paymentMethod}
                      onChange={handleAdvancePaymentChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Credit Card</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      name="paymentReference"
                      value={advancePaymentForm.paymentReference}
                      onChange={handleAdvancePaymentChange}
                      placeholder="Transaction ID, Cheque Number, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Notes/Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes/Description (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={advancePaymentForm.notes}
                      onChange={handleAdvancePaymentChange}
                      rows={3}
                      placeholder="Additional notes about this advance payment..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </div>
            
            <div className="flex space-x-4">
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? 'Registering...'
                    : `Register ${registrationType === 'company' ? 'Company' : 'Individual'}`
                  }
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Advance Payment Receipt Modal */}
      {showReceiptModal && advancePaymentReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Payment Documents Generated</h3>
              <p className="text-gray-600 mt-2">
                Advance payment has been recorded successfully. Download your professional invoice or payment receipt below.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-semibold">{advancePaymentReceipt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receipt Number:</span>
                  <span className="font-semibold">{advancePaymentReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold">{advancePaymentReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-600">AED {parseFloat(advancePaymentReceipt.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold">{advancePaymentReceipt.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date(advancePaymentReceipt.payment_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Professional Invoice Download */}
              <button
                onClick={generateAdvancePaymentInvoice}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 font-medium"
              >
                <FileText className="w-5 h-5" />
                <span>Download Professional Invoice</span>
              </button>

              {/* Receipt Download */}
              <button
                onClick={generateAdvancePaymentReceipt}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 font-medium"
              >
                <Receipt className="w-5 h-5" />
                <span>Download Payment Receipt</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  // Navigate back to the appropriate list after closing modal
                  setTimeout(() => {
                    if (registrationType === 'company') {
                      onNavigate?.('companies');
                    } else {
                      onNavigate?.('individuals');
                    }
                  }, 300); // Small delay to allow modal to close smoothly
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close & Return to List
              </button>
            </div>
          </div>
        </div>
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

export default CustomerRegistration;