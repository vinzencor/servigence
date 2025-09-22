import React, { useState, useEffect } from 'react';
import { Building2, Users, FileText, DollarSign, Home, Plus, Bell, Search, Settings, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Load total unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user?.service_employee_id) {
        try {
          const count = await dbHelpers.getTotalUnreadCount(user.service_employee_id);
          setTotalUnreadCount(count);
        } catch (error) {
          console.error('Error loading unread count:', error);
        }
      }
    };

    loadUnreadCount();

    // Refresh unread count every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user?.service_employee_id]);
  const allNavigationItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'customer-registration', label: 'Customer Registration', icon: Plus },
    { id: 'companies', label: 'Registered Companies', icon: Building2 },
    { id: 'service-management', label: 'Service Management', icon: FileText },
    { id: 'services', label: 'Service Billing', icon: FileText },
    { id: 'employees', label: 'Employee Management', icon: Users, superAdminOnly: true },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'reminders', label: 'Reminders & Services', icon: Bell },
    { id: 'accounts', label: 'Account', icon: DollarSign },
    { id: 'invoices', label: 'Invoice', icon: FileText },
  ];

  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    Servigens CRM
                  </h1>
                  <p className="text-sm text-gray-500">Corporate Services Management</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search companies, services..."
                  className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                
                <div className="ml-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                      <p className="text-xs text-gray-500">
                        {isSuperAdmin ? 'Super Admin' : 'Staff User'}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-20">
        {/* Sidebar */}
        <nav className="w-72 bg-white border-r border-gray-200 h-screen fixed left-0 top-20 bottom-0 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-2 whitespace-nowrap">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 relative ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'chat' && totalUnreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 ml-72 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;