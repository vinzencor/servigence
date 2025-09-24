import React, { useState } from 'react';
import { ArrowLeft, Save, Upload, AlertCircle } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';

interface DocumentEditModalProps {
  document: any;
  onClose: () => void;
  onSave: () => void;
}

const DocumentEditModal: React.FC<DocumentEditModalProps> = ({ document, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: document.name || '',
    type: document.type || '',
    expiry_date: document.expiry_date || '',
    status: document.status || 'active'
  });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

      setNewFile(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Document name is required';
    if (!formData.type.trim()) newErrors.type = 'Document type is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      let updateData = {
        name: formData.name,
        type: formData.type,
        expiry_date: formData.expiry_date || null,
        status: formData.status,
        updated_at: new Date().toISOString()
      };

      // If new file is selected, convert to base64 and update file_path
      if (newFile) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;
          updateData = {
            ...updateData,
            file_name: newFile.name,
            file_path: base64Data
          };

          await dbHelpers.updateEmployeeDocument(document.id, updateData);
          onSave();
          alert('Document updated successfully!');
        };
        reader.readAsDataURL(newFile);
      } else {
        await dbHelpers.updateEmployeeDocument(document.id, updateData);
        onSave();
        alert('Document updated successfully!');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      alert(`Error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Edit Document</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Current Document Preview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Document</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{document.name}</p>
                    <p className="text-sm text-gray-600">{document.file_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newWindow = window.open();
                      if (newWindow) {
                        newWindow.document.write(`
                          <html>
                            <head><title>${document.name}</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                              <img src="${document.file_path}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="${document.name}" />
                            </body>
                          </html>
                        `);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    View Current
                  </button>
                </div>
                {document.file_path && (
                  <div className="w-full h-32 bg-white rounded border overflow-hidden">
                    <img 
                      src={document.file_path} 
                      alt={document.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden flex items-center justify-center h-full text-gray-500">
                      <span>Preview not available</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter document name"
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
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.type ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select document type</option>
                <option value="passport">Passport</option>
                <option value="emirates-id">Emirates ID</option>
                <option value="visa">Visa</option>
                <option value="labor-card">Labor Card</option>
                <option value="educational-certificate">Educational Certificate</option>
                <option value="experience-certificate">Experience Certificate</option>
                <option value="medical-certificate">Medical Certificate</option>
                <option value="other">Other</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="invalid">Invalid</option>
              </select>
            </div>

            {/* Replace Document File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Replace Document File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload new document file (optional)</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="document-file-upload"
                  />
                  <label
                    htmlFor="document-file-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                  {newFile && (
                    <p className="mt-2 text-sm text-green-600">
                      Selected: {newFile.name}
                    </p>
                  )}
                </div>
              </div>
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
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
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

export default DocumentEditModal;
