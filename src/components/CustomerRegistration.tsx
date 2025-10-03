import React, { useState, useEffect } from 'react';
import { Save, Send, X, CheckCircle, AlertCircle, Phone, Mail, Users, User, Upload, FileText, Trash2, Eye, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { Company, Individual, ServiceEmployee, PaymentCard } from '../types';
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
    title: string;
    documentNumber: string;
    expiryDate: string;
    file: File | null;
    fileUrl?: string;
    preview?: string;
  }>>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);

  useEffect(() => {
    loadServiceEmployees();
    loadPaymentCards();
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
      title: '',
      documentNumber: '',
      expiryDate: '',
      file: null,
      preview: undefined
    };
    setDocuments([...documents, newDoc]);
    setShowAddDocument(true);
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setDocuments(documents.map(doc =>
      doc.id === id ? { ...doc, [field]: value } : doc
    ));
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

  const uploadDocumentToSupabase = async (file: File, companyId: string, docTitle: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${docTitle.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const createReminder = async (companyId: string, docTitle: string, expiryDate: string, documentType: string) => {
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

    try {
      if (registrationType === 'company') {
        const newCompany: Company = {
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
        const { data: createdCompany, error: companyError } = await supabase
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

        const companyId = createdCompany.id;

        // Handle document uploads and create reminders
        console.log('📄 Processing documents:', documents.length);

        for (const doc of documents) {
          console.log('🔄 Processing document:', {
            hasFile: !!doc.file,
            hasTitle: !!doc.title,
            hasDocNumber: !!doc.documentNumber,
            hasExpiryDate: !!doc.expiryDate,
            title: doc.title
          });

          // Process documents that have at least a title (file and document number are optional)
          if (doc.title) {
            try {
              let fileUrl = null;

              // Upload file to Supabase Storage if file exists
              if (doc.file) {
                console.log('📤 Uploading file for document:', doc.title);
                fileUrl = await uploadDocumentToSupabase(doc.file, companyId, doc.title);
                console.log('✅ File uploaded successfully:', fileUrl);
              }

              // Save document metadata to database
              const documentData = {
                company_id: companyId,
                title: doc.title,
                document_number: doc.documentNumber || null,
                expiry_date: doc.expiryDate || null,
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
                toast.error(`Failed to save document: ${doc.title}`);
              } else {
                console.log('✅ Document saved successfully:', doc.title);

                // Create reminder if expiry date is provided
                if (doc.expiryDate) {
                  console.log('📅 Creating reminder for document with expiry date:', doc.expiryDate);
                  await createReminder(companyId, doc.title, doc.expiryDate, 'company_document');
                } else {
                  console.log('ℹ️ No expiry date for document:', doc.title);
                }
              }
            } catch (error) {
              console.error('❌ Error processing document:', error);
              toast.error(`Failed to process document: ${doc.title}`);
            }
          } else {
            console.log('⚠️ Skipping document without title');
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

        // Navigate back to companies list
        setTimeout(() => {
          onNavigate?.('companies');
        }, 1500); // Give time for toast to show
      } else {
        const newIndividual: Individual = {
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
        const createdIndividual = await dbHelpers.createIndividual({
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

        // Create reminders for document expiry dates
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
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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

            {/* Document Upload Section - Only for Companies */}
            {registrationType === 'company' && (
              <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Documents & Certificates</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload company documents and certificates (optional). Documents with expiry dates will automatically create reminders.
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Document Title *
                            </label>
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => updateDocument(doc.id, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g., Trade License, MOH Certificate"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Document Number
                            </label>
                            <input
                              type="text"
                              value={doc.documentNumber}
                              onChange={(e) => updateDocument(doc.id, 'documentNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Document ID/Number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Expiry Date (Optional)
                            </label>
                            <input
                              type="date"
                              value={doc.expiryDate}
                              onChange={(e) => updateDocument(doc.id, 'expiryDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    title: doc.title
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
                                Preview: (File: {doc.file.name}, Type: {doc.file.type}, Has Preview: {doc.preview ? 'Yes' : 'No'})
                              </div>
                              {doc.file.type.startsWith('image/') ? (
                                doc.preview && doc.preview !== 'non-image' ? (
                                  <div className="relative">
                                    <img
                                      src={doc.preview}
                                      alt="Document preview"
                                      className="w-48 h-36 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                                      onLoad={() => console.log('Image loaded successfully:', doc.file?.name)}
                                      onError={(e) => {
                                        console.error('Image failed to load:', doc.file?.name, e);
                                        console.log('Preview data length:', doc.preview?.length);
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                      Image
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-700">
                                      🖼️ Image preview loading... ({doc.file.name})
                                    </p>
                                  </div>
                                )
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
    </div>
  );
};

export default CustomerRegistration;