import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Save, DollarSign, CreditCard, Upload, Eye, Trash2 } from 'lucide-react';
import { Company, PaymentCard, ServiceEmployee } from '../types';
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
    proName: company.proName || '',
    proPhone: company.proPhone || '',
    proEmail: company.proEmail || '',
    status: company.status || 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Document upload state
  const [documents, setDocuments] = useState<Array<{
    id: string;
    title: string;
    documentNumber: string;
    expiryDate: string;
    file: File | null;
    fileUrl?: string;
    preview?: string;
    uploading?: boolean;
  }>>([]);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);

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
    loadCompanyDocuments();
  }, [company.id]);

  const loadServiceEmployees = async () => {
    try {
      const employees = await dbHelpers.getServiceEmployees();
      setServiceEmployees(employees);
    } catch (error) {
      console.error('Error loading service employees:', error);
    }
  };

  const loadCompanyDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database documents to component state format
      const transformedDocs = (data || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title || '',
        documentNumber: doc.document_number || '',
        expiryDate: doc.expiry_date || '',
        file: null, // Existing files are already uploaded
        fileUrl: doc.file_attachments?.[0]?.url || '',
        preview: 'existing-file'
      }));

      setDocuments(transformedDocs);
      setDocumentsLoaded(true);
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
    console.log('🔄 Updating document:', { id, field, value: field === 'file' ? value?.name : value });

    setDocuments(prevDocuments => {
      const updatedDocs = prevDocuments.map(doc =>
        doc.id === id ? { ...doc, [field]: value } : doc
      );

      console.log('📊 Documents state after update:', updatedDocs.map(doc => ({
        id: doc.id,
        title: doc.title,
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

  const createReminder = async (companyId: string, docTitle: string, expiryDate: string, reminderType: string) => {
    try {
      const reminderData = {
        company_id: companyId,
        title: `${docTitle} Expiry Reminder`,
        description: `The document "${docTitle}" is expiring soon. Please renew it before the expiry date.`,
        reminder_date: expiryDate,
        reminder_type: reminderType,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Prepare update data for Supabase
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
        pro_name: formData.proName || null,
        pro_phone: formData.proPhone || null,
        pro_email: formData.proEmail || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      // Update in database
      await dbHelpers.updateCompany(company.id, updateData);

      // Handle document uploads and create reminders
      console.log('📄 Processing documents:', documents.length);
      let documentsProcessed = 0;
      let documentsWithErrors = 0;
      const errorMessages: string[] = [];

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
          documentsProcessed++;
          try {
            let fileUrl = doc.fileUrl; // Keep existing file URL if no new file

            // Upload new file to Supabase Storage if file exists
            if (doc.file) {
              console.log('📤 Uploading new file for document:', doc.title);
              try {
                fileUrl = await uploadDocumentToSupabase(doc.file, company.id, doc.title);
                console.log('✅ File uploaded successfully:', fileUrl);
              } catch (uploadError) {
                console.error('❌ File upload failed, saving document without file:', uploadError);
                fileUrl = null; // Continue without file
                toast.error(`File upload failed for "${doc.title}". Document saved without file. Please run the database migration script to fix storage.`);
              }
            }

            // Check if this is an existing document (UUID format) or new document (temp- prefix)
            const isExistingDocument = !doc.id.startsWith('temp-');

            if (isExistingDocument) {
              // Update existing document
              const updateData = {
                title: doc.title,
                document_number: doc.documentNumber || null,
                expiry_date: doc.expiryDate || null,
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
                console.log('✅ Document updated successfully via helper:', doc.title);
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
                    toast.error(`Document "${doc.title}" updated locally but database access restricted. Contact administrator.`);
                    console.log('ℹ️ RLS policy prevents document update - changes saved locally only');
                  } else {
                    toast.error(`Failed to update document: ${doc.title} - ${updateError.message}`);
                  }
                } else {
                  console.log('✅ Document updated successfully via direct update:', doc.title);
                }
              }
            } else {
              // Create new document
              const documentData = {
                company_id: company.id,
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

              console.log('💾 Creating new document:', documentData);

              try {
                // Try using database helper first
                const savedDoc = await dbHelpers.createCompanyDocument(documentData);
                console.log('✅ Document saved successfully via helper:', doc.title);
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
                    toast.error(`Document "${doc.title}" saved locally but database access restricted. Contact administrator to enable document storage.`);
                    console.log('ℹ️ RLS policy prevents document insert - document saved locally only');
                  } else {
                    toast.error(`Failed to save document: ${doc.title} - ${docError.message}`);
                  }
                } else {
                  console.log('✅ Document saved successfully via direct insert:', doc.title);
                }
              }
            }

            // Create reminder if expiry date is provided (for both new and updated documents)
            if (doc.expiryDate) {
              console.log('📅 Creating reminder for document with expiry date:', doc.expiryDate);
              await createReminder(company.id, doc.title, doc.expiryDate, 'company_document');
            } else {
              console.log('ℹ️ No expiry date for document:', doc.title);
            }
          } catch (docError) {
            documentsWithErrors++;
            const errorMsg = docError instanceof Error ? docError.message : 'Unknown error';
            errorMessages.push(`${doc.title}: ${errorMsg}`);
            console.error('❌ Error processing document:', doc.title, docError);
          }
        } else {
          console.log('⚠️ Skipping document without title:', doc);
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
        proName: formData.proName || undefined,
        proPhone: formData.proPhone || undefined,
        proEmail: formData.proEmail || undefined,
        status: formData.status as 'active' | 'inactive' | 'pending'
      };

      onSave(updatedCompany);
      alert('Company updated successfully!');
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

                              {/* File Preview */}
                              {doc.preview && doc.preview !== 'non-image' && doc.preview !== 'error' && doc.preview !== 'existing-file' && (
                                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Preview:</span>
                                    <span className="text-xs text-gray-500">
                                      {doc.file ? `${(doc.file.size / 1024).toFixed(1)} KB` : ''}
                                    </span>
                                  </div>
                                  <div className="flex justify-center">
                                    <img
                                      src={doc.preview}
                                      alt={`Preview of ${doc.title}`}
                                      className="max-w-full max-h-48 object-contain rounded border border-gray-300 shadow-sm"
                                      onError={(e) => {
                                        console.error('Preview image failed to load');
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
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
    </div>
  );
};

export default CompanyEditModal;
