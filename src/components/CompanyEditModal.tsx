import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Save, DollarSign, CreditCard, Upload, Eye, Trash2, FileText, X, Edit2, Calendar } from 'lucide-react';
import { Company, PaymentCard, ServiceEmployee, ServiceType } from '../types';
import { dbHelpers, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CompanyEditModalProps {
  company: Company;
  onClose: () => void;
  onSave: (updatedCompany: Company) => void;
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({ company, onClose, onSave }) => {
  const { user, isSuperAdmin } = useAuth();
  const [creditUsage, setCreditUsage] = useState<any>(null);
  const [loadingCreditUsage, setLoadingCreditUsage] = useState(false);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(null);
  const [serviceEmployees, setServiceEmployees] = useState<ServiceEmployee[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);

  // Debug logging for company prop
  console.log('✅ [CompanyEditModal] Received company prop:', {
    name: company.companyName,
    openingBalance: company.openingBalance,
    openingBalance_type: typeof company.openingBalance,
    openingBalanceUpdatedAt: company.openingBalanceUpdatedAt,
    openingBalanceUpdatedBy: company.openingBalanceUpdatedBy
  });

  const openingBalanceString = company.openingBalance?.toString() || '0';
  console.log('✅ [CompanyEditModal] Opening balance string for form:', openingBalanceString);

  const [formData, setFormData] = useState({
    companyName: company.companyName || '',
    vatTrnNo: company.vatTrnNo || '',
    phone1: company.phone1 || '',
    phone2: company.phone2 || '',
    email1: company.email1 || '',
    email2: company.email2 || '',
    address: company.address || '',
    companyType: company.companyType || '',
    licenseNo: company.licenseNo || '',
    mohreNo: company.mohreNo || '',
    moiNo: company.moiNo || '',
    quota: company.quota || '',
    companyGrade: company.companyGrade || '',
    creditLimit: company.creditLimit?.toString() || '',
    openingBalance: openingBalanceString,
    proName: company.proName || '',
    proPhone: company.proPhone || '',
    proEmail: company.proEmail || '',
    status: company.status || 'active'
  });

  console.log('✅ [CompanyEditModal] FormData initialized with openingBalance:', formData.openingBalance);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Document upload state
  const [documents, setDocuments] = useState<Array<{
    id: string;
    expiryDate: string;
    serviceId?: string;
    file: File | null;
    fileUrl?: string;
    preview?: string;
    uploading?: boolean;
  }>>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);

  // Advance payment state
  const [showAdvancePayment, setShowAdvancePayment] = useState(false);
  const [advancePaymentForm, setAdvancePaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });

  // Existing advance payments state
  const [existingAdvancePayments, setExistingAdvancePayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: '',
    paymentDate: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: '',
    description: ''
  });

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [advancePaymentReceipt, setAdvancePaymentReceipt] = useState<any>(null);



  // Image preview modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');
  const [modalImageTitle, setModalImageTitle] = useState('');

  // Constants from CustomerRegistration
  const companyTypes = [
    'Limited Liability Company',
    'Free Zone Company',
    'Branch Office',
    'Representative Office',
    'Partnership',
    'Sole Proprietorship'
  ];

  const companyGrades = ['Grade A+', 'Grade A', 'Grade B+', 'Grade B', 'Grade C+', 'Grade C'];

  const loadPaymentCards = async () => {
    try {
      const cards = await dbHelpers.getPaymentCards();
      setPaymentCards(cards);

      // Find the card that matches the company's current credit limit
      const matchingCard = cards.find(card =>
        card.isActive && card.creditLimit === company.creditLimit
      );
      if (matchingCard) {
        setSelectedCard(matchingCard);
      }
    } catch (error) {
      console.error('Error loading payment cards:', error);
      toast.error('Failed to load payment cards');
    }
  };

  // Load existing advance payments
  const loadExistingAdvancePayments = async () => {
    setLoadingPayments(true);
    try {
      const payments = await dbHelpers.getCustomerAdvancePayments(company.id, 'company');
      console.log('📋 Loaded existing advance payments:', payments);
      setExistingAdvancePayments(payments);
    } catch (error) {
      console.error('Error loading advance payments:', error);
      toast.error('Failed to load advance payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Load credit usage information and payment cards
  useEffect(() => {
    const loadCreditUsage = async () => {
      setLoadingCreditUsage(true);
      try {
        const usage = await dbHelpers.getCompanyCreditUsage(company.id);
        setCreditUsage(usage);
      } catch (error) {
        console.error('Error loading credit usage:', error);
      } finally {
        setLoadingCreditUsage(false);
      }
    };

    // Reset documents loaded flag when company changes
    setDocumentsLoaded(false);
    setDocuments([]);

    loadCreditUsage();
    loadPaymentCards();
    loadServiceEmployees();
    loadServices();
    loadCompanyDocuments();
    loadExistingAdvancePayments();
  }, [company.id]);

  const loadServiceEmployees = async () => {
    try {
      const employees = await dbHelpers.getServiceEmployees();
      setServiceEmployees(employees);
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

  const loadCompanyDocuments = async () => {
    try {
      console.log('🔍 Loading documents for company:', company.id);

      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Database error loading documents:', error);
        throw error;
      }

      console.log('✅ Loaded', data?.length || 0, 'documents for company');

      // Transform database documents to component state format
      const transformedDocs = (data || []).map((doc: any) => ({
        id: doc.id,
        expiryDate: doc.expiry_date || '',
        serviceId: doc.service_id || undefined,
        file: null, // Existing files are already uploaded
        fileUrl: doc.file_attachments?.[0]?.url || '',
        preview: 'existing-file'
      }));

      setDocuments(transformedDocs);
      setDocumentsLoaded(true);

      // Generate previews for existing files
      transformedDocs.forEach(doc => {
        if (doc.fileUrl) {
          generateExistingFilePreview(doc.fileUrl, doc.id);
        }
      });
    } catch (error) {
      console.error('Error loading company documents:', error);
      setDocumentsLoaded(true); // Set flag even on error to prevent infinite retries
    }
  };

  // Document handling functions
  const addDocument = () => {
    // Generate a temporary UUID-like string for new documents
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = {
      id: tempId,
      expiryDate: '',
      file: null,
      preview: undefined
    };
    setDocuments([...documents, newDoc]);
    setShowAddDocument(true);
  };

  const updateDocument = (id: string, field: string, value: any) => {
    console.log('🔄 Updating document:', { id, field, value: field === 'file' ? value?.name : value });

    setDocuments(prevDocuments => {
      const updatedDocs = prevDocuments.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      );

      console.log('📊 Documents state after update:', updatedDocs.map(doc => ({
        id: doc.id,
        serviceId: doc.serviceId,
        hasFile: !!doc.file,
        fileName: doc.file?.name,
        hasPreview: !!doc.preview
      })));

      return updatedDocs;
    });
  };

  const removeDocument = async (id: string) => {
    // Check if this is an existing document (UUID format) or new document (temp- prefix)
    const isExistingDocument = !id.startsWith('temp-');

    if (isExistingDocument) {
      // Delete from database
      try {
        const { error } = await supabase
          .from('company_documents')
          .update({ status: 'deleted' })
          .eq('id', id);

        if (error) {
          console.error('Error deleting document:', error);
          toast.error('Failed to delete document');
          return;
        }

        toast.success('Document deleted successfully');
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
        return;
      }
    }

    // Remove from local state
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  const handleFileUpload = (id: string, file: File, inputElement?: HTMLInputElement) => {
    console.log('📁 File upload initiated:', {
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
        updateDocument(id, 'uploading', false);
      };

      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        updateDocument(id, 'preview', 'error');
        updateDocument(id, 'uploading', false);
      };

      reader.readAsDataURL(file);
    } else {
      console.log('📄 Non-image file, setting placeholder preview');
      updateDocument(id, 'preview', 'non-image');
      updateDocument(id, 'uploading', false);
    }
  };

  // Function to generate preview for existing files
  const generateExistingFilePreview = (fileUrl: string, docId: string) => {
    try {
      console.log('🔍 Generating preview for existing file:', { fileUrl, docId });

      // Extract file extension from URL
      const urlParts = fileUrl.split('?')[0]; // Remove query parameters
      const extension = urlParts.split('.').pop()?.toLowerCase();

      console.log('📄 File extension detected:', extension);

      // Check if it's an image based on extension
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

      if (extension && imageExtensions.includes(extension)) {
        console.log('🖼️ Setting image preview for:', fileUrl);
        // For images, set the URL directly as preview
        updateDocument(docId, 'preview', fileUrl);
      } else if (extension === 'pdf') {
        console.log('📋 Setting PDF preview for:', fileUrl);
        // For PDFs, set a special preview type
        updateDocument(docId, 'preview', 'existing-pdf');
      } else {
        console.log('📁 Setting generic file preview for:', fileUrl);
        // For other files, keep the existing-file preview
        updateDocument(docId, 'preview', 'existing-file');
      }
    } catch (error) {
      console.error('Error generating preview for existing file:', error);
      // Fallback to existing-file preview
      updateDocument(docId, 'preview', 'existing-file');
    }
  };

  const uploadDocumentToSupabase = async (file: File, entityId: string, docTitle: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `companies/${entityId}/${docTitle.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;

      console.log('🔄 Attempting to upload file to storage:', {
        bucket: 'documents',
        fileName,
        fileSize: file.size,
        fileType: file.type
      });

      // Documents bucket exists and has public policies configured

      // Check authentication using custom auth context
      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      console.log('👤 User authenticated:', user.email);

      // Upload file to Supabase Storage (now with public policies)
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Storage upload error:', error);

        // Try with upsert enabled if initial upload fails
        if (error.message?.includes('already exists')) {
          console.log('🔄 File exists, trying with upsert...');
          const { data: retryData, error: retryError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (retryError) {
            console.error('❌ Retry upload failed:', retryError);
            throw new Error(`File upload failed: ${retryError.message}`);
          }

          console.log('✅ Retry upload successful:', retryData);
        } else {
          // For other storage issues, provide specific guidance
          if (error.message?.includes('row-level security policy') || error.statusCode === '403') {
            console.log('🔒 Storage RLS policy preventing upload');
            throw new Error('Storage access restricted. Storage policies have been created. Please try again.');
          } else if (error.statusCode === '400') {
            console.log('📦 Storage bucket issue detected');
            throw new Error('Storage bucket configuration issue. Please check Supabase storage settings.');
          } else {
            throw new Error(`File upload failed: ${error.message}`);
          }
        }
      }

      console.log('✅ File uploaded successfully:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (uploadError) {
      console.error('❌ Upload function error:', uploadError);

      // For now, return null to allow document creation without file
      // This prevents the entire document save from failing
      const errorMsg = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      toast.error(`File upload failed: ${errorMsg}. Document will be saved without file.`);
      return null;
    }
  };

  const createReminder = async (companyId: string, docTitle: string, expiryDate: string, reminderType: string, serviceId?: string) => {
    try {
      const reminderData = {
        company_id: companyId,
        title: `${docTitle} Expiry Reminder`,
        description: `The document "${docTitle}" is expiring soon. Please renew it before the expiry date.`,
        reminder_date: expiryDate,
        reminder_type: reminderType,
        service_id: serviceId || null,
        status: 'pending',
        created_by: user?.name || 'System'
      };

      const { error } = await supabase
        .from('reminders')
        .insert([reminderData]);

      if (error) {
        console.error('Error creating reminder:', error);
        toast.error(`Failed to create reminder for ${docTitle}`);
      } else {
        console.log('✅ Reminder created successfully for:', docTitle);
      }
    } catch (error) {
      console.error('Error in createReminder:', error);
    }
  };

  const handleCardSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.phone1.trim()) newErrors.phone1 = 'Primary phone is required';
    if (!formData.email1.trim()) newErrors.email1 = 'Primary email is required';
    if (!formData.companyType.trim()) newErrors.companyType = 'Company type is required';
    // if (!formData.companyGrade.trim()) newErrors.companyGrade = 'Company grade is required';
    if (!formData.creditLimit.trim()) newErrors.creditLimit = 'Credit limit is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email1 && !emailRegex.test(formData.email1)) {
      newErrors.email1 = 'Invalid email format';
    }
    if (formData.email2 && !emailRegex.test(formData.email2)) {
      newErrors.email2 = 'Invalid email format';
    }
    if (formData.proEmail && !emailRegex.test(formData.proEmail)) {
      newErrors.proEmail = 'Invalid email format';
    }

    // Numeric validation
    if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
      newErrors.creditLimit = 'Credit limit must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleEditPaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.amount.toString(),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method === 'credit_card' ? 'card' : payment.payment_method,
      paymentReference: payment.payment_reference || '',
      notes: payment.notes || '',
      description: payment.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
    setEditPaymentForm({
      amount: '',
      paymentDate: '',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
      description: ''
    });
  };

  const handleSaveEditedPayment = async () => {
    if (!editingPayment) return;

    try {
      const updateData = {
        amount: editPaymentForm.amount,
        payment_date: editPaymentForm.paymentDate,
        payment_method: editPaymentForm.paymentMethod,
        notes: editPaymentForm.notes,
        description: editPaymentForm.description
      };

      const result = await dbHelpers.updateAdvancePayment(editingPayment.id, updateData);

      // Check if this fixed a data inconsistency
      if (result._wasOverApplied) {
        toast.success(
          `✅ Advance payment updated and data inconsistency fixed!\n` +
          `The receipt was previously over-applied (AED ${result._totalApplied} applied from AED ${result._oldAmount} receipt). ` +
          `This has now been corrected.`,
          { duration: 6000 }
        );
      } else {
        toast.success('Advance payment updated successfully!');
      }

      // Trigger custom event to notify other components (e.g., Service Billing)
      // Using CustomEvent instead of storage event for same-window communication
      window.dispatchEvent(new CustomEvent('advancePaymentUpdated', {
        detail: {
          customerId: company.id,
          customerType: 'company',
          action: 'updated',
          payment: result
        }
      }));

      // Also trigger storage event for cross-tab communication
      localStorage.setItem('advance_payment_updated', Date.now().toString());
      localStorage.removeItem('advance_payment_updated');

      // Reload payments
      await loadExistingAdvancePayments();

      // Clear editing state
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating advance payment:', error);

      // Show the full error message if it's a data inconsistency error
      const errorMessage = error instanceof Error ? error.message : 'Failed to update advance payment';

      if (errorMessage.includes('Data Inconsistency')) {
        // Show detailed error in an alert for better visibility
        alert(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare update data for Supabase
      const newOpeningBalance = parseFloat(formData.openingBalance) || 0;
      const oldOpeningBalance = company.openingBalance || 0;
      const openingBalanceChanged = newOpeningBalance !== oldOpeningBalance;

      console.log('💾 [CompanyEditModal] Preparing to save company:', {
        formData_openingBalance: formData.openingBalance,
        formData_openingBalance_type: typeof formData.openingBalance,
        parsed_newOpeningBalance: newOpeningBalance,
        parsed_type: typeof newOpeningBalance,
        oldOpeningBalance: oldOpeningBalance,
        openingBalanceChanged: openingBalanceChanged
      });

      const updateData = {
        company_name: formData.companyName,
        vat_trn_no: formData.vatTrnNo || null,
        phone1: formData.phone1,
        phone2: formData.phone2 || null,
        email1: formData.email1,
        email2: formData.email2 || null,
        address: formData.address || null,
        company_type: formData.companyType,
        license_no: formData.licenseNo || null,
        mohre_no: formData.mohreNo || null,
        moi_no: formData.moiNo || null,
        quota: formData.quota || null,
        company_grade: formData.companyGrade,
        credit_limit: parseFloat(formData.creditLimit),
        opening_balance: newOpeningBalance,
        opening_balance_updated_at: openingBalanceChanged ? new Date().toISOString() : company.openingBalanceUpdatedAt,
        opening_balance_updated_by: openingBalanceChanged ? (user?.name || 'System') : company.openingBalanceUpdatedBy,
        pro_name: formData.proName || null,
        pro_phone: formData.proPhone || null,
        pro_email: formData.proEmail || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      console.log('💾 [CompanyEditModal] Update data:', {
        opening_balance: updateData.opening_balance,
        opening_balance_updated_at: updateData.opening_balance_updated_at,
        opening_balance_updated_by: updateData.opening_balance_updated_by
      });

      // Update in database
      const updatedData = await dbHelpers.updateCompany(company.id, updateData);

      console.log('✅ [CompanyEditModal] Company updated successfully:', {
        id: updatedData.id,
        name: updatedData.company_name,
        opening_balance: updatedData.opening_balance,
        opening_balance_type: typeof updatedData.opening_balance
      });

      // Handle document uploads and create reminders
      console.log('📄 Processing documents:', documents.length);
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
          documentsProcessed++;
          try {
            let fileUrl = doc.fileUrl; // Keep existing file URL if no new file

            // Get service name for document title
            const service = services.find(s => s.id === doc.serviceId);
            const documentTitle = service ? `${service.name} Document` : 'Service Document';

            // Upload new file to Supabase Storage if file exists
            if (doc.file) {
              console.log('📤 Uploading new file for document');
              try {
                fileUrl = await uploadDocumentToSupabase(doc.file, company.id, `document_${Date.now()}`);
                console.log('✅ File uploaded successfully:', fileUrl);
              } catch (uploadError) {
                console.error('❌ File upload failed, saving document without file:', uploadError);
                fileUrl = undefined; // Continue without file
                toast.error(`File upload failed for "${documentTitle}". Document saved without file. Please run the database migration script to fix storage.`);
              }
            }

            // Check if this is an existing document (UUID format) or new document (temp- prefix)
            const isExistingDocument = !doc.id.startsWith('temp-');

            if (isExistingDocument) {
              // Update existing document
              const updateData = {
                title: documentTitle,
                document_number: null,
                expiry_date: doc.expiryDate,
                service_id: doc.serviceId,
                ...(fileUrl && {
                  file_attachments: [{
                    name: doc.file?.name || 'existing-file',
                    url: fileUrl,
                    type: doc.file?.type,
                    size: doc.file?.size
                  }]
                }),
                updated_at: new Date().toISOString()
              };

              console.log('🔄 Updating existing document:', doc.id, updateData);

              try {
                // Try using database helper first
                const updatedDoc = await dbHelpers.updateCompanyDocument(doc.id, updateData);
                console.log('✅ Document updated successfully via helper:', documentTitle);
              } catch (helperError) {
                console.log('⚠️ Helper failed, trying direct update:', helperError);

                // Fallback to direct update
                const { error: updateError } = await supabase
                  .from('company_documents')
                  .update(updateData)
                  .eq('id', doc.id);

                if (updateError) {
                  console.error('❌ Error updating document:', updateError);

                  // Check if it's an RLS policy error
                  if (updateError.message?.includes('row-level security policy') || updateError.code === '42501') {
                    toast.error(`Document "${documentTitle}" updated locally but database access restricted. Contact administrator.`);
                    console.log('ℹ️ RLS policy prevents document update - changes saved locally only');
                  } else {
                    toast.error(`Failed to update document: ${documentTitle} - ${updateError.message}`);
                  }
                } else {
                  console.log('✅ Document updated successfully via direct update:', documentTitle);
                }
              }
            } else {
              // Create new document
              const documentData = {
                company_id: company.id,
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

              console.log('💾 Creating new document:', documentData);

              try {
                // Try using database helper first
                const savedDoc = await dbHelpers.createCompanyDocument(documentData);
                console.log('✅ Document saved successfully via helper:', documentTitle);
              } catch (helperError) {
                console.log('⚠️ Helper failed, trying direct insert:', helperError);

                // Fallback to direct insert
                const { error: docError } = await supabase
                  .from('company_documents')
                  .insert([documentData]);

                if (docError) {
                  console.error('❌ Error saving document:', docError);

                  // Check if it's an RLS policy error
                  if (docError.message?.includes('row-level security policy') || docError.code === '42501') {
                    toast.error(`Document "${documentTitle}" saved locally but database access restricted. Contact administrator to enable document storage.`);
                    console.log('ℹ️ RLS policy prevents document insert - document saved locally only');
                  } else {
                    toast.error(`Failed to save document: ${documentTitle} - ${docError.message}`);
                  }
                } else {
                  console.log('✅ Document saved successfully via direct insert:', documentTitle);
                }
              }
            }

            // Create reminder for expiry date (required field)
            console.log('📅 Creating reminder for document with expiry date:', doc.expiryDate);
            await createReminder(company.id, documentTitle, doc.expiryDate, 'company_document', doc.serviceId);

            // Dispatch event to notify other components about reminder creation
            window.dispatchEvent(new CustomEvent('reminderCreated', {
              detail: { companyId: company.id, documentTitle: documentTitle, expiryDate: doc.expiryDate }
            }));
          } catch (docError) {
            documentsWithErrors++;
            const errorMsg = docError instanceof Error ? docError.message : 'Unknown error';
            const service = services.find(s => s.id === doc.serviceId);
            const documentTitle = service ? `${service.name} Document` : 'Service Document';
            errorMessages.push(`${documentTitle}: ${errorMsg}`);
            console.error('❌ Error processing document:', documentTitle, docError);
          }
        } else {
          console.log('⚠️ Skipping document without service or expiry date:', doc);
        }
      }

      // Show summary of document processing
      if (documentsProcessed > 0) {
        if (documentsWithErrors === 0) {
          toast.success(`All ${documentsProcessed} documents processed successfully!`);
        } else if (documentsWithErrors < documentsProcessed) {
          toast.success(`${documentsProcessed - documentsWithErrors} of ${documentsProcessed} documents processed successfully. ${documentsWithErrors} had errors.`);
        } else {
          toast.error(`Failed to process all ${documentsProcessed} documents. Check console for details.`);
        }

        // Log detailed error information
        if (errorMessages.length > 0) {
          console.error('📋 Document processing errors:', errorMessages);
        }
      }

      // Create updated company object for local state
      const updatedCompany: Company = {
        ...company,
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
        openingBalance: newOpeningBalance,
        openingBalanceUpdatedAt: openingBalanceChanged ? new Date().toISOString() : company.openingBalanceUpdatedAt,
        openingBalanceUpdatedBy: openingBalanceChanged ? (user?.name || 'System') : company.openingBalanceUpdatedBy,
        proName: formData.proName || undefined,
        proPhone: formData.proPhone || undefined,
        proEmail: formData.proEmail || undefined,
        status: formData.status as 'active' | 'inactive' | 'pending'
      };

      // Process advance payment if provided
      if (showAdvancePayment && advancePaymentForm.amount && parseFloat(advancePaymentForm.amount) > 0) {
        try {
          console.log('💰 Processing advance payment:', advancePaymentForm);

          const paymentData = {
            company_id: company.id,
            individual_id: null,
            amount: parseFloat(advancePaymentForm.amount),
            payment_date: advancePaymentForm.paymentDate,
            payment_method: advancePaymentForm.paymentMethod,
            payment_reference: advancePaymentForm.paymentReference || null,
            notes: advancePaymentForm.notes || null,
            description: `Advance payment for company: ${formData.companyName}`,
            created_by: user?.name || 'System'
          };

          console.log('💾 Saving advance payment:', paymentData);

          const createdPayment = await dbHelpers.createCustomerAdvancePayment(paymentData);

          console.log('✅ Advance payment created:', createdPayment);

          // Auto-apply the advance payment to existing unpaid billings
          try {
            console.log('🤖 Auto-applying advance payment to existing unpaid billings...');
            const autoApplyResult = await dbHelpers.autoApplyAdvancePayment(
              createdPayment.id,
              company.id,
              'company',
              user?.id
            );

            if (autoApplyResult.applied) {
              console.log('✅ Auto-application successful:', autoApplyResult);
              toast.success(
                `💰 Advance payment created and applied!\n` +
                `Applied AED ${autoApplyResult.totalApplied.toLocaleString()} to ${autoApplyResult.applications.length} billing(s)`,
                { duration: 5000 }
              );
            } else {
              console.log('ℹ️ No unpaid billings to apply to:', autoApplyResult.message);
              toast.success('Advance payment created successfully!');
            }
          } catch (autoApplyError) {
            console.error('Error auto-applying advance payment:', autoApplyError);
            // Don't fail the payment creation if auto-apply fails
            toast.success('Advance payment created successfully!');
            toast.error('Failed to auto-apply to billings. You can apply manually.');
          }

          // Trigger custom event to notify other components (e.g., Service Billing)
          // Using CustomEvent instead of storage event for same-window communication
          const eventDetail = {
            customerId: company.id,
            customerType: 'company',
            action: 'created',
            payment: createdPayment
          };
          console.log('🔔 DISPATCHING CustomEvent "advancePaymentUpdated" with detail:', eventDetail);

          const customEvent = new CustomEvent('advancePaymentUpdated', { detail: eventDetail });
          window.dispatchEvent(customEvent);

          console.log('✅ CustomEvent dispatched successfully');

          // Also trigger storage event for cross-tab communication
          localStorage.setItem('advance_payment_updated', Date.now().toString());
          localStorage.removeItem('advance_payment_updated');

          // Reload existing payments list
          await loadExistingAdvancePayments();

          // Set receipt data for modal
          setAdvancePaymentReceipt({
            ...createdPayment,
            customerName: formData.companyName,
            customerType: 'company'
          });

          // Show receipt modal
          setShowReceiptModal(true);

          toast.success(`💰 Advance payment of AED ${parseFloat(advancePaymentForm.amount).toLocaleString()} recorded successfully!`);
        } catch (error) {
          console.error('❌ Error processing advance payment:', error);
          toast.error('Failed to process advance payment. Company updated successfully.');
        }
      }

      onSave(updatedCompany);

      // Dispatch event to notify other components about document updates
      window.dispatchEvent(new CustomEvent('documentUpdated', {
        detail: { companyId: company.id, documentsProcessed, documentsWithErrors }
      }));

      toast.success('Company updated successfully!');
    } catch (error) {
      console.error('Error updating company:', error);
      alert(`Error updating company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit Company</h2>
            <button
              onClick={onClose}
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
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VAT/TRN Number</label>
              <input
                type="text"
                name="vatTrnNo"
                value={formData.vatTrnNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="TRN100234567890123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Type <span className="text-red-500">*</span>
              </label>
              <select
                name="companyType"
                value={formData.companyType}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.companyType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select company type</option>
                <option value="Limited Liability Company">Limited Liability Company</option>
                <option value="Free Zone Company">Free Zone Company</option>
                <option value="Branch Office">Branch Office</option>
                <option value="Representative Office">Representative Office</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
              </select>
              {errors.companyType && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyType}
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone1"
                value={formData.phone1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.phone1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="+971-4-123-4567"
              />
              {errors.phone1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone</label>
              <input
                type="tel"
                name="phone2"
                value={formData.phone2}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+971-50-123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email1"
                value={formData.email1}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="admin@company.ae"
              />
              {errors.email1 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Email</label>
              <input
                type="email"
                name="email2"
                value={formData.email2}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="finance@company.ae"
              />
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter company address"
              />
            </div>

            {/* License Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">License Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
              <input
                type="text"
                name="licenseNo"
                value={formData.licenseNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="DED-123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MOHRE Number</label>
              <input
                type="text"
                name="mohreNo"
                value={formData.mohreNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="MOH-789123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">MOI Number</label>
              <input
                type="text"
                name="moiNo"
                value={formData.moiNo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="MOI-456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quota</label>
              <input
                type="text"
                name="quota"
                value={formData.quota}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Grade <span className="text-red-500">*</span>
              </label>
              <select
                name="companyGrade"
                value={formData.companyGrade}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Financial Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>

              {/* Credit Usage Summary */}
              {creditUsage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Credit Usage Summary</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Credit Limit</p>
                      <p className="font-semibold text-gray-900">AED {creditUsage.creditLimit.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Outstanding Dues</p>
                      <p className="font-semibold text-red-600">AED {creditUsage.totalOutstanding.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Available Credit</p>
                      <p className="font-semibold text-green-600">AED {creditUsage.availableCredit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Credit Usage</span>
                      <span>{creditUsage.creditUsagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          creditUsage.creditUsagePercentage > 90 ? 'bg-red-500' :
                          creditUsage.creditUsagePercentage > 75 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(creditUsage.creditUsagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Card Selection */}
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Card <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCard?.id || ''}
                onChange={handleCardSelect}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
              {errors.creditLimit && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.creditLimit}
                </p>
              )}
            </div>

            {/* Selected Card Display */}
            {selectedCard && (
              <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
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

            {/* Opening Balance */}
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opening Balance (AED)
              </label>
              <input
                type="number"
                step="0.01"
                name="openingBalance"
                value={formData.openingBalance}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter positive value if customer owes you money (receivable), negative value if you owe customer money (payable)
              </p>
            </div>

            {/* PRO Information */}
            <div className="col-span-full mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">PRO Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Name</label>
              <input
                type="text"
                name="proName"
                value={formData.proName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Ahmed Al-Rashid"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Phone</label>
              <input
                type="tel"
                name="proPhone"
                value={formData.proPhone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="+971-55-987-6543"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PRO Email</label>
              <input
                type="email"
                name="proEmail"
                value={formData.proEmail}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.proEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="ahmed@proservices.ae"
              />
              {errors.proEmail && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.proEmail}
                </p>
              )}
            </div>

            {/* Documents & Certificates Section */}
            <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Documents & Certificates
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${documents.length > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {documents.length} docs loaded
                    </span>
                  </h3>
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





              {documents.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h4>
                  <p className="text-gray-600">
                    {documentsLoaded
                      ? 'This company has no documents yet. Click "Add Document" to upload the first document.'
                      : 'Loading documents...'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc, index) => (
                    <div key={doc.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
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

                                handleFileUpload(doc.id, file, e.target);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                          </p>
                          {/* Uploading Indicator */}
                          {doc.uploading && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-blue-700 font-medium">
                                  Processing {doc.file?.name}...
                                </span>
                              </div>
                            </div>
                          )}

                          {(doc.file || doc.fileUrl) && !doc.uploading && (
                            <div className="mt-3 space-y-3">
                              {/* File Status Indicator */}
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

                              {/* Debug info */}
                              {/* <div className="text-xs text-blue-600 mb-2">
                                Debug: Preview={doc.preview ? 'Yes' : 'No'} | Type={doc.preview} | FileUrl={doc.fileUrl ? 'Yes' : 'No'}
                              </div> */}

                              {/* Image Preview */}
                              {doc.preview && doc.preview !== 'non-image' && doc.preview !== 'error' && doc.preview !== 'existing-file' && doc.preview !== 'existing-pdf' && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
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
                                          console.error('Preview image failed to load');
                                          e.currentTarget.style.display = 'none';
                                        }}
                                        onClick={() => {
                                          setModalImageSrc(doc.preview || '');
                                          setModalImageTitle('Document Preview');
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

                              {/* Non-image file indicator */}
                              {doc.preview === 'non-image' && doc.file && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-blue-50">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                      <span className="text-blue-600 text-xs font-bold">
                                        {doc.file.name.split('.').pop()?.toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-700">{doc.file.name}</div>
                                      <div className="text-xs text-gray-500">
                                        {doc.file.type} • {(doc.file.size / 1024).toFixed(1)} KB
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Existing PDF file indicator */}
                              {doc.preview === 'existing-pdf' && doc.fileUrl && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-red-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-red-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-700">PDF Document</div>
                                        <div className="text-xs text-gray-500">Previously uploaded PDF file</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                        PDF
                                      </div>
                                      <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                      >
                                        View
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Existing file indicator */}
                              {doc.preview === 'existing-file' && doc.fileUrl && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                        <Eye className="w-4 h-4 text-gray-600" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-700">Existing Document</div>
                                        <div className="text-xs text-gray-500">Previously uploaded file</div>
                                      </div>
                                    </div>
                                    <a
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                    >
                                      View
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advance Payment Section */}
            <div className="col-span-full mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Advance Payments</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {existingAdvancePayments.length > 0
                      ? 'View and edit existing advance payments for this company.'
                      : 'Add an advance payment for this company.'}
                  </p>
                </div>
                {/* Only show "Add New" button if no existing advance payments */}
                {existingAdvancePayments.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAdvancePayment(!showAdvancePayment)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shrink-0"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{showAdvancePayment ? 'Hide' : 'Add New'} Advance Payment</span>
                  </button>
                )}
              </div>

              {/* Existing Advance Payments List */}
              {loadingPayments ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading advance payments...</p>
                </div>
              ) : existingAdvancePayments.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Advance Payments</h4>
                  <div className="space-y-3">
                    {existingAdvancePayments.map((payment) => (
                      <div key={payment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        {editingPayment?.id === payment.id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Amount (AED) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  name="amount"
                                  value={editPaymentForm.amount}
                                  onChange={handleEditPaymentChange}
                                  min="0.01"
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Payment Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  name="paymentDate"
                                  value={editPaymentForm.paymentDate}
                                  onChange={handleEditPaymentChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Payment Method <span className="text-red-500">*</span>
                                </label>
                                <select
                                  name="paymentMethod"
                                  value={editPaymentForm.paymentMethod}
                                  onChange={handleEditPaymentChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                  <option value="cheque">Cheque</option>
                                  <option value="card">Card</option>
                                  <option value="online">Online</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                                <input
                                  type="text"
                                  name="paymentReference"
                                  value={editPaymentForm.paymentReference}
                                  onChange={handleEditPaymentChange}
                                  placeholder="Transaction ID, Cheque number, etc."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="col-span-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                  name="notes"
                                  value={editPaymentForm.notes}
                                  onChange={handleEditPaymentChange}
                                  rows={2}
                                  placeholder="Additional notes..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEditedPayment}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-start justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-600">Amount</p>
                                <p className="text-lg font-semibold text-gray-900">AED {parseFloat(payment.amount).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Payment Date</p>
                                <p className="text-sm font-medium text-gray-900 flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {new Date(payment.payment_date).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Payment Method</p>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                  {payment.payment_method === 'credit_card' ? 'Card' : payment.payment_method.replace('_', ' ')}
                                </p>
                              </div>
                              {payment.receipt_number && (
                                <div>
                                  <p className="text-xs text-gray-600">Receipt Number</p>
                                  <p className="text-sm font-medium text-gray-900">{payment.receipt_number}</p>
                                </div>
                              )}
                              {payment.payment_reference && (
                                <div>
                                  <p className="text-xs text-gray-600">Reference</p>
                                  <p className="text-sm font-medium text-gray-900">{payment.payment_reference}</p>
                                </div>
                              )}
                              {payment.notes && (
                                <div className="col-span-full">
                                  <p className="text-xs text-gray-600">Notes</p>
                                  <p className="text-sm text-gray-700">{payment.notes}</p>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEditPayment(payment)}
                              className="ml-4 p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Edit Payment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : !showAdvancePayment ? (
                <div className="mb-6 text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No advance payments recorded yet</p>
                  <p className="text-xs text-gray-500 mt-1">Click "Add New Advance Payment" to create one</p>
                </div>
              ) : null}

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
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="online">Online</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                    <input
                      type="text"
                      name="paymentReference"
                      value={advancePaymentForm.paymentReference}
                      onChange={handleAdvancePaymentChange}
                      placeholder="Transaction ID, Cheque number, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      name="notes"
                      value={advancePaymentForm.notes}
                      onChange={handleAdvancePaymentChange}
                      rows={3}
                      placeholder="Additional notes about the payment..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

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

export default CompanyEditModal;
