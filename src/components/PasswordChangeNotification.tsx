import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const PasswordChangeNotification: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if user has seen the password change notification
    const hasSeenNotification = localStorage.getItem('password_change_notification_seen');
    if (!hasSeenNotification) {
      setShowNotification(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowNotification(false);
    localStorage.setItem('password_change_notification_seen', 'true');
  };

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Security Update
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                The admin password has been updated for security reasons. 
                The new password is: <strong>Admin@2024!Secure</strong>
              </p>
              <p className="mt-1">
                Please update your saved passwords and inform other administrators.
              </p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-amber-400 hover:text-amber-600 focus:outline-none focus:text-amber-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeNotification;
