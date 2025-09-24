import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'staff';
  service_employee_id?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Simple password validation for super admin
      if (email === 'rahulpradeepan77@gmail.com' && password === '123456') {
        const superAdminUser: User = {
          id: 'super-admin-id',
          email: 'rahulpradeepan77@gmail.com',
          name: 'Super Admin',
          role: 'super_admin',
          service_employee_id: 'c4e4f987-c6bf-408e-88b4-c9b8aaa31bf4'
        };

        setUser(superAdminUser);
        localStorage.setItem('user', JSON.stringify(superAdminUser));
        setIsLoading(false);
        return true;
      }
      
      // Try to authenticate against service employees database
      try {
        const { data: employees, error } = await supabase
          .from('service_employees')
          .select('*')
          .eq('email', email)
          .eq('is_active', true);

        if (error) throw error;

        if (employees && employees.length > 0) {
          const employee = employees[0];

          // Check if employee has password hash (for new employees with login credentials)
          if (employee.password_hash) {
            const inputPasswordHash = btoa(password);
            if (employee.password_hash === inputPasswordHash) {
              const staffUser: User = {
                id: employee.id,
                email: employee.email,
                name: employee.name,
                role: 'staff',
                service_employee_id: employee.id
              };

              setUser(staffUser);
              localStorage.setItem('user', JSON.stringify(staffUser));
              return true;
            }
          }
        }
      } catch (error) {
        console.error('Database authentication error:', error);
      }

      // Fallback to hardcoded staff users for existing users
      const staffUserMappings: Record<string, { name: string; service_employee_id: string }> = {
        'meenakshi@educare.com': { name: 'Meenakshi', service_employee_id: '4affba2f-5321-4579-a204-b767e53ca2d7' },
        'ahmed@servigence.com': { name: 'Ahmed Al-Rashid', service_employee_id: '0e39ccc9-c8a0-40f0-85fa-cbdfa0ca84a9' },
        'fatima@servigence.com': { name: 'Fatima Al-Zahra', service_employee_id: '30dac293-eac4-4b94-8a18-fcc44f0434fe' },
        'mohammed@servigence.com': { name: 'Mohammed Hassan', service_employee_id: 'f3b5ec26-8a49-4f36-a4c7-46927c88de75' },
        'sarah@servigence.com': { name: 'Sarah Khan', service_employee_id: '3bbe8642-af39-4042-8b18-8c2ea5149551' },
        'omar@servigence.com': { name: 'Omar Abdullah', service_employee_id: '0ef8614b-c3c4-486c-8030-f67c9150d2f7' }
      };

      if (email.includes('@') && password.length >= 6) {
        const userMapping = staffUserMappings[email];

        // Only allow login if user is in our mapping
        if (!userMapping) {
          return false;
        }

        const staffUser: User = {
          id: 'staff-user-id',
          email: email,
          name: userMapping.name,
          role: 'staff',
          service_employee_id: userMapping.service_employee_id
        };

        setUser(staffUser);
        localStorage.setItem('user', JSON.stringify(staffUser));
        setIsLoading(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
