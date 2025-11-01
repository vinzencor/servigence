import React, { useState } from 'react';
import { X, Edit, Download, CheckCircle, XCircle, Clock, Building2, Users, Calendar, DollarSign, FileText, Phone, Mail, MapPin, User } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface QuotationViewModalProps {
  quotation: any;
  onClose: () => void;
  onEdit: () => void;
  onStatusUpdate: (status: string) => void;
}

const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  quotation,
  onClose,
  onEdit,
  onStatusUpdate
}) => {
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'sent': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'accepted': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expired': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'converted': return <CheckCircle className="w-5 h-5 text-purple-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'converted': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleConvertToCompany = async () => {
    if (quotation.quotation_type !== 'new_company') {
      toast.error('Only new company quotations can be converted');
      return;
    }

    try {
      setConvertLoading(true);
      
      const companyData = {
        company_name: quotation.company_name,
        phone1: quotation.phone,
        email1: quotation.email,
        address: quotation.address,
        contact_person: quotation.contact_person,
        status: 'active'
      };

      const result = await dbHelpers.convertQuotationToCompany(quotation.id, companyData);
      
      toast.success(`Quotation converted to company successfully! Company ID: ${result.company.id}`);
      setShowConvertModal(false);
      onStatusUpdate('converted');
    } catch (error) {
      console.error('Error converting quotation:', error);
      toast.error('Failed to convert quotation to company');
    } finally {
      setConvertLoading(false);
    }
  };

  const generatePDF = () => {
    // This would typically integrate with a PDF generation library
    // For now, we'll create a simple print-friendly version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quotation ${quotation.quotation_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .label { font-weight: bold; }
              .value { margin-left: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>QUOTATION</h1>
              <h2>${quotation.quotation_number}</h2>
            </div>
            
            <div class="section">
              <h3>Company Information</h3>
              <p><span class="label">Company Name:</span><span class="value">${quotation.company_name}</span></p>
              ${quotation.contact_person ? `<p><span class="label">Contact Person:</span><span class="value">${quotation.contact_person}</span></p>` : ''}
              ${quotation.phone ? `<p><span class="label">Phone:</span><span class="value">${quotation.phone}</span></p>` : ''}
              ${quotation.email ? `<p><span class="label">Email:</span><span class="value">${quotation.email}</span></p>` : ''}
              ${quotation.address ? `<p><span class="label">Address:</span><span class="value">${quotation.address}</span></p>` : ''}
            </div>
            
            <div class="section">
              <h3>Quotation Details</h3>
              <table>
                <tr>
                  <th>Service</th>
                  <th>Amount (AED)</th>
                </tr>
                <tr>
                  <td>${quotation.service_name}</td>
                  <td>${quotation.total_amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td><strong>Total</strong></td>
                  <td><strong>AED ${quotation.total_amount.toLocaleString()}</strong></td>
                </tr>
              </table>
            </div>
            
            <div class="section">
              <p><span class="label">Quotation Date:</span><span class="value">${new Date(quotation.quotation_date).toLocaleDateString()}</span></p>
              <p><span class="label">Valid Until:</span><span class="value">${new Date(quotation.valid_until).toLocaleDateString()}</span></p>
            </div>
            
            ${quotation.terms_conditions ? `
            <div class="section">
              <h3>Terms & Conditions</h3>
              <p>${quotation.terms_conditions}</p>
            </div>
            ` : ''}
            
            ${quotation.notes ? `
            <div class="section">
              <h3>Notes</h3>
              <p>${quotation.notes}</p>
            </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-900">Quotation Details</h2>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(quotation.status)}`}>
                {getStatusIcon(quotation.status)}
                <span className="text-sm font-medium">
                  {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={generatePDF}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onEdit}
                className="text-amber-600 hover:text-amber-800 transition-colors"
                title="Edit Quotation"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Quotation Header */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Quotation Number</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{quotation.quotation_number}</p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">Date</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(quotation.quotation_date).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-medium">Total Amount</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">
                    AED {quotation.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                {quotation.quotation_type === 'existing_company' ? (
                  <Building2 className="w-5 h-5 text-blue-500" />
                ) : (
                  <Users className="w-5 h-5 text-green-500" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {quotation.quotation_type === 'existing_company' ? 'Existing Company' : 'New Company (Lead)'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-semibold text-gray-900">{quotation.company_name}</p>
                </div>
                
                {quotation.contact_person && (
                  <div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <User className="w-3 h-3" />
                      <span>Contact Person</span>
                    </div>
                    <p className="font-semibold text-gray-900">{quotation.contact_person}</p>
                  </div>
                )}
                
                {quotation.phone && (
                  <div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Phone className="w-3 h-3" />
                      <span>Phone</span>
                    </div>
                    <p className="font-semibold text-gray-900">{quotation.phone}</p>
                  </div>
                )}
                
                {quotation.email && (
                  <div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </div>
                    <p className="font-semibold text-gray-900">{quotation.email}</p>
                  </div>
                )}
                
                {quotation.address && (
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span>Address</span>
                    </div>
                    <p className="font-semibold text-gray-900">{quotation.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Service Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{quotation.service_name}</p>
                    {quotation.service?.category && (
                      <p className="text-sm text-gray-600">{quotation.service.category}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-600">
                      AED {quotation.total_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Valid Until</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(quotation.valid_until).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Validity Period</p>
                  <p className="font-semibold text-gray-900">{quotation.validity_period} days</p>
                </div>

                {quotation.lead_status && (
                  <div>
                    <p className="text-sm text-gray-600">Lead Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{quotation.lead_status}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            {(quotation.notes || quotation.terms_conditions) && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>

                {quotation.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-900 whitespace-pre-wrap">{quotation.notes}</p>
                    </div>
                  </div>
                )}

                {quotation.terms_conditions && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Terms & Conditions</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-900 whitespace-pre-wrap">{quotation.terms_conditions}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                {quotation.quotation_type === 'new_company' && quotation.status !== 'converted' && (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Convert to Company
                  </button>
                )}

                {quotation.status === 'pending' && (
                  <button
                    onClick={() => onStatusUpdate('sent')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Mark as Sent
                  </button>
                )}

                {quotation.status === 'sent' && (
                  <>
                    <button
                      onClick={() => onStatusUpdate('accepted')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Mark as Accepted
                    </button>
                    <button
                      onClick={() => onStatusUpdate('rejected')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Mark as Rejected
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={generatePDF}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={onEdit}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert to Company Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Convert to Company</h3>
            <p className="text-gray-600 mb-6">
              This will create a new company record from this quotation and mark the quotation as converted.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Company Details:</h4>
              <p><strong>Name:</strong> {quotation.company_name}</p>
              {quotation.contact_person && <p><strong>Contact:</strong> {quotation.contact_person}</p>}
              {quotation.phone && <p><strong>Phone:</strong> {quotation.phone}</p>}
              {quotation.email && <p><strong>Email:</strong> {quotation.email}</p>}
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={convertLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToCompany}
                disabled={convertLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {convertLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{convertLoading ? 'Converting...' : 'Convert to Company'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuotationViewModal;
