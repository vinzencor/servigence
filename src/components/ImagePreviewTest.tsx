import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

const ImagePreviewTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const handleFileSelect = (file: File) => {
    console.log('🔄 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isImage: file.type.startsWith('image/')
    });

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('✅ Preview generated:', {
          length: result?.length,
          start: result?.substring(0, 50) + '...'
        });
        setPreview(result);
      };

      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        setPreview('error');
      };

      reader.readAsDataURL(file);
    } else {
      setPreview('non-image');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Image Preview Test</h2>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(file);
            }
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {selectedFile && (
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-2">File Info:</h3>
          <p className="text-sm text-gray-600">Name: {selectedFile.name}</p>
          <p className="text-sm text-gray-600">Type: {selectedFile.type}</p>
          <p className="text-sm text-gray-600">Size: {(selectedFile.size / 1024).toFixed(1)} KB</p>
          <p className="text-sm text-gray-600">Is Image: {selectedFile.type.startsWith('image/') ? 'Yes' : 'No'}</p>
          <p className="text-sm text-gray-600">Preview Status: {preview ? 'Generated' : 'None'}</p>
          <p className="text-sm text-gray-600">Preview Type: {typeof preview}</p>
        </div>
      )}

      {selectedFile && selectedFile.type.startsWith('image/') && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-2">Preview:</h3>
          
          {preview && preview !== 'error' && preview !== 'non-image' ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Preview"
                className="w-48 h-36 object-cover rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setShowModal(true)}
                onLoad={() => console.log('✅ Image loaded successfully')}
                onError={(e) => {
                  console.error('❌ Image failed to load');
                  console.log('Preview data:', preview?.substring(0, 100));
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
          ) : preview === 'error' ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">❌ Failed to generate preview</p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">🖼️ Generating preview...</p>
            </div>
          )}
        </div>
      )}

      {selectedFile && selectedFile.type === 'application/pdf' && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-2">PDF File:</h3>
          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <FileText className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                PDF Document • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded">PDF</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={preview}
              alt="Full size preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
              {selectedFile?.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreviewTest;
