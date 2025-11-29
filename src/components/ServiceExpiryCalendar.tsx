import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, AlertCircle, Building2, User, FileText, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface ServiceBilling {
  id: string;
  service_date: string;
  expiry_date: string;
  invoice_number: string;
  total_amount_with_vat: number;
  company_id?: string;
  individual_id?: string;
  // Supabase returns plural field names
  service_types?: {
    name: string;
  };
  companies?: {
    company_name: string;
    email1: string;
  };
  individuals?: {
    individual_name: string;
    email1: string;
  };
  // Also support singular for compatibility
  service_type?: {
    name: string;
  };
  company?: {
    company_name: string;
    email1: string;
  };
  individual?: {
    individual_name: string;
    email1: string;
  };
}

const ServiceExpiryCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [serviceBillings, setServiceBillings] = useState<ServiceBilling[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceBillings();
  }, [currentDate]);

  const loadServiceBillings = async () => {
    try {
      setLoading(true);

      // Get first and last day of current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('service_billings')
        .select(`
          id,
          service_date,
          expiry_date,
          invoice_number,
          total_amount_with_vat,
          company_id,
          individual_id,
          service_types!service_type_id (
            name
          ),
          companies!company_id (
            company_name,
            email1
          ),
          individuals!individual_id (
            individual_name,
            email1
          )
        `)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', firstDay.toISOString().split('T')[0])
        .lte('expiry_date', lastDay.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      // Normalize the data to handle plural field names from Supabase
      const normalizedData = (data || []).map(billing => ({
        ...billing,
        service_type: billing.service_types || billing.service_type,
        company: billing.companies || billing.company,
        individual: billing.individuals || billing.individual
      }));

      setServiceBillings(normalizedData);
    } catch (error: any) {
      console.error('Error loading service billings:', error);
      toast.error('Failed to load service expiry data');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getServicesForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    
    return serviceBillings.filter(billing => billing.expiry_date === dateStr);
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const services = getServicesForDate(day);
    
    if (services.length > 0) {
      setSelectedDate(date);
      setShowModal(true);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const services = getServicesForDate(day);
      const hasServices = services.length > 0;
      const isToday = 
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`h-24 border border-gray-200 p-2 ${
            hasServices ? 'cursor-pointer hover:bg-blue-50' : ''
          } ${isToday ? 'bg-blue-100' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
            </span>
            {hasServices && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {services.length}
              </span>
            )}
          </div>
          {hasServices && (
            <div className="mt-1">
              <div className="text-xs text-red-600 font-medium truncate">
                {services[0].service_type?.name || 'Service'}
              </div>
              {services.length > 1 && (
                <div className="text-xs text-gray-500">
                  +{services.length - 1} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedServices = selectedDate ? getServicesForDate(selectedDate.getDate()) : [];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-8 h-8 text-white" />
          <div>
            <h1 className="text-2xl font-bold text-white">Service Expiry Calendar</h1>
            <p className="text-purple-100 text-sm mt-1">View all services expiring by date</p>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200">
              {renderCalendar()}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-gray-600">Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Services Expiring</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal for Selected Date */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Services Expiring on {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} expiring
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:bg-purple-800 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedServices.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No services expiring on this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border-2 border-red-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {service.company_id ? (
                            <Building2 className="w-6 h-6 text-blue-600" />
                          ) : (
                            <User className="w-6 h-6 text-green-600" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {service.company?.company_name || service.individual?.individual_name || 'N/A'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {service.company?.email1 || service.individual?.email1 || 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                          Expiring
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Service</p>
                            <p className="text-sm font-medium text-gray-800">
                              {service.service_type?.name || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Invoice Number</p>
                            <p className="text-sm font-medium text-gray-800">
                              {service.invoice_number || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Service Date</p>
                            <p className="text-sm font-medium text-gray-800">
                              {new Date(service.service_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="text-sm font-medium text-gray-800">
                              AED {service.total_amount_with_vat?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceExpiryCalendar;

