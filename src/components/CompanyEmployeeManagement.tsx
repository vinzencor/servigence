import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Upload, Eye, Edit, Trash2, FileText, Calendar, Phone, Mail, User, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Company, Employee } from '../types';
import { dbHelpers } from '../lib/supabase';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

interface CompanyEmployeeManagementProps {
  company: Company;
  onBack: () => void;
}

const CompanyEmployeeManagement: React.FC<CompanyEmployeeManagementProps> = ({ company, onBack }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState('');
  const [customDocuments, setCustomDocuments] = useState<any[]>([]);
  const [showAddCustomDoc, setShowAddCustomDoc] = useState(false);
  const [newCustomDoc, setNewCustomDoc] = useState({ name: '', hasNumber: true, hasExpiry: true });
  const [showPassportSection, setShowPassportSection] = useState(false);
  const [showEmiratesIdSection, setShowEmiratesIdSection] = useState(false);
  const [showVisaSection, setShowVisaSection] = useState(false);
  const [showLaborCardSection, setShowLaborCardSection] = useState(false);

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
  }, [company.id]);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!employeeForm.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!employeeForm.name.trim()) newErrors.name = 'Name is required';
    if (!employeeForm.position.trim()) newErrors.position = 'Position is required';
    if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    if (!employeeForm.phone.trim()) newErrors.phone = 'Phone is required';
    if (!employeeForm.nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (!employeeForm.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
    if (!employeeForm.passportExpiry) newErrors.passportExpiry = 'Passport expiry is required';
    if (!employeeForm.joinDate) newErrors.joinDate = 'Join date is required';
    if (!employeeForm.department.trim()) newErrors.department = 'Department is required';
    if (!employeeForm.password.trim()) newErrors.password = 'Password is required';
    if (!employeeForm.confirmPassword.trim()) newErrors.confirmPassword = 'Confirm password is required';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      // Simple password hashing (in production, use proper bcrypt)
      const passwordHash = btoa(employeeForm.password); // Base64 encoding for demo

      const newEmployee = {
        company_id: company.id,
        employee_id: employeeForm.employeeId,
        name: employeeForm.name,
        position: employeeForm.position,
        email: employeeForm.email,
        phone: employeeForm.phone,
        nationality: employeeForm.nationality,
        passport_number: employeeForm.passportNumber,
        passport_expiry: employeeForm.passportExpiry,
        visa_type: employeeForm.visaType,
        visa_number: employeeForm.visaNumber || null,
        visa_issue_date: employeeForm.visaIssueDate || null,
        visa_expiry_date: employeeForm.visaExpiryDate || null,
        emirates_id: employeeForm.emiratesId || null,
        emirates_id_expiry: employeeForm.emiratesIdExpiry || null,
        labor_card_number: employeeForm.laborCardNumber || null,
        labor_card_expiry: employeeForm.laborCardExpiry || null,
        join_date: employeeForm.joinDate,
        salary: employeeForm.salary ? parseFloat(employeeForm.salary) : null,
        department: employeeForm.department,
        manager: employeeForm.manager || null,
        password_hash: passwordHash,
        status: 'active'
      };

      console.log('Creating employee:', newEmployee);
      const result = await dbHelpers.createEmployee(newEmployee);
      console.log('Employee created:', result);

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
          processedFile = await convertPdfToImage(file);
          console.log('PDF converted to image for OCR processing');
        } catch (pdfError) {
          console.error('PDF conversion failed:', pdfError);
          throw new Error('PDF processing failed. Please upload an image file (JPG, PNG) instead.');
        }
      }

      // Enhanced Tesseract.js configuration for better accuracy
      const { data: { text, confidence } } = await Tesseract.recognize(processedFile, 'eng+ara', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/\\:. ',
      });

      console.log('OCR Text extracted:', text);
      console.log('OCR Confidence:', confidence);

      // Only proceed if confidence is reasonable
      if (confidence < 30) {
        console.warn('Low OCR confidence:', confidence);
        throw new Error('Document quality too low for accurate text extraction');
      }

      // Extract relevant information based on document type
      const extractedData = extractDataFromOCR(text, documentType);

      // Update form with extracted data
      if (Object.keys(extractedData).length > 0) {
        setEmployeeForm(prev => ({
          ...prev,
          ...extractedData
        }));
        alert(`✅ Document processed successfully!\nExtracted: ${Object.keys(extractedData).join(', ')}\nConfidence: ${Math.round(confidence)}%`);
      } else {
        console.log('No relevant data extracted from OCR text');
        // Fallback to mock data if OCR doesn't extract useful information
        const mockData = getMockOCRResults(documentType);
        setEmployeeForm(prev => ({
          ...prev,
          ...mockData
        }));
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
      alert(`❌ Document processing failed: ${error.message}\nUsing sample data instead.`);
    } finally {
      setUploadingDocument('');
    }
  };

  // Convert PDF first page to image for OCR processing
  const convertPdfToImage = async (pdfFile: File): Promise<File> => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Converting PDF to image...');

        // Set up PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render PDF page to canvas
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        console.log('PDF page rendered to canvas');

        // Convert canvas to blob
        return new Promise<File>((resolveBlob) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const imageFile = new File([blob], `${pdfFile.name}_page1.png`, { type: 'image/png' });
              console.log('PDF converted to image file:', imageFile.name);
              resolveBlob(imageFile);
            } else {
              reject(new Error('Failed to convert PDF page to image'));
            }
          }, 'image/png', 0.95);
        });

      } catch (error) {
        console.error('PDF conversion error:', error);
        reject(new Error(`PDF conversion failed: ${error.message}. Please try uploading a JPG/PNG image instead.`));
      }
    });
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
              idNumber = `${idNumber.substring(0,3)}-${idNumber.substring(3,7)}-${idNumber.substring(7,14)}-${idNumber.substring(14)}`;
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

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
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
                      onClick={() => setSelectedEmployee(employee)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Documents"
                    >
                      <FileText className="w-4 h-4" />
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.employeeId ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={employeeForm.position}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={employeeForm.nationality}
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
                            Passport Number <span className="text-red-500">*</span>
                          </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="passportNumber"
                      value={employeeForm.passportNumber}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.passportNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
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
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                            uploadingDocument === 'passport' ? 'opacity-50 cursor-not-allowed' : ''
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
                  </div>
                  {errors.passportNumber && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.passportNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="passportExpiry"
                    value={employeeForm.passportExpiry}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.passportExpiry ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.passportExpiry && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.passportExpiry}
                    </p>
                  )}
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
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                            uploadingDocument === 'emirates-id' ? 'opacity-50 cursor-not-allowed' : ''
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
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                            uploadingDocument === 'visa' ? 'opacity-50 cursor-not-allowed' : ''
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
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                            uploadingDocument === 'labor-card' ? 'opacity-50 cursor-not-allowed' : ''
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
                                  className={`inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer ${
                                    uploadingDocument === `custom-${customDoc.id}` ? 'opacity-50 cursor-not-allowed' : ''
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.joinDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
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
                <div className="col-span-full mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Credentials</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={employeeForm.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter password for employee login"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={employeeForm.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
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
    </div>
  );
};

export default CompanyEmployeeManagement;
