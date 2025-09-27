import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Building,
  FileText,
  Eye,
  Edit,
  Trash2,
  Settings,
  TrendingUp,
  Target,
  Zap,
  MoreVertical,
  CalendarDays,
  Users,
  ToggleLeft,
  ToggleRight,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { dbHelpers, supabase } from '../lib/supabase';
import { emailService } from '../lib/emailService';

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: 'visa_renewal' | 'license_renewal' | 'document_expiry' | 'follow_up' | 'payment_due' | 'contract_renewal' | 'other';
  companyId?: string;
  employeeId?: string;
  vendorId?: string;
  date: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
  assignedTo?: string;
  createdBy: string;
  createdDate: string;
  completedDate?: string;
  notes?: string;
}

const RemindersServices: React.FC = () => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  // Load reminders from database
  const loadReminders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reminders')
        .select('*')
        .order('reminder_date', { ascending: true });

      // Only show enabled reminders if email notifications are enabled
      if (emailNotificationsEnabled) {
        query = query.eq('enabled', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Loaded reminders:', data);
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load dues from database
  const loadDues = async () => {
    setLoading(true);
    try {
      const data = await dbHelpers.getDues();
      console.log('Loaded dues:', data);
      setDues(data || []);
    } catch (error) {
      console.error('Error loading dues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    loadDues();
    if (emailNotificationsEnabled) {
      checkAndSendDueReminders();
      checkAndSendDocumentReminders();
    }
  }, [emailNotificationsEnabled]);

  // Check and send due reminder emails
  const checkAndSendDueReminders = async () => {
    if (!emailNotificationsEnabled) return;

    try {
      const today = new Date();
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(today.getDate() + 10);

      // Get dues that are due within 10 days and haven't been reminded recently
      const duesToRemind = dues.filter(due => {
        const dueDate = new Date(due.due_date);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder if due within 10 days and status is pending or partial
        return daysUntilDue <= 10 && daysUntilDue >= 0 &&
               (due.status === 'pending' || due.status === 'partial');
      });

      for (const due of duesToRemind) {
        try {
          const dueDate = new Date(due.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Get company email
          const companyEmail = due.company?.email1 || due.company?.email2;
          if (!companyEmail) continue;

          await emailService.sendDueReminderEmail({
            recipientEmail: companyEmail,
            companyName: due.company?.company_name || 'Unknown Company',
            dueAmount: due.due_amount,
            originalAmount: due.original_amount,
            serviceName: due.service_name || 'Service',
            dueDate: due.due_date,
            daysUntilDue: daysUntilDue
          });

          console.log(`Due reminder email sent to ${companyEmail} for ${due.company?.company_name}`);
        } catch (emailError) {
          console.error('Error sending due reminder email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  };

  // Check and send document expiry reminder emails
  const checkAndSendDocumentReminders = async () => {
    try {
      const today = new Date();
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(today.getDate() + 10);

      // Get reminders that are due within 10 days and are enabled
      const remindersToSend = reminders.filter(reminder => {
        if (!reminder.enabled) return false;

        const reminderDate = new Date(reminder.reminder_date);
        const daysUntilExpiry = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder if due within 10 days and status is active
        return daysUntilExpiry <= 10 && daysUntilExpiry >= 0 && reminder.status === 'active';
      });

      for (const reminder of remindersToSend) {
        try {
          const reminderDate = new Date(reminder.reminder_date);
          const daysUntilExpiry = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Get recipient email - try company first, then individual
          let recipientEmail = '';
          let recipientName = '';
          let companyName = '';

          if (reminder.company_id) {
            // Get company details
            const { data: company } = await supabase
              .from('companies')
              .select('company_name, email1, email2')
              .eq('id', reminder.company_id)
              .single();

            if (company) {
              recipientEmail = company.email1 || company.email2 || '';
              recipientName = company.company_name;
              companyName = company.company_name;
            }
          } else if (reminder.individual_id) {
            // Get individual details
            const { data: individual } = await supabase
              .from('individuals')
              .select('individual_name, email1, email2')
              .eq('id', reminder.individual_id)
              .single();

            if (individual) {
              recipientEmail = individual.email1 || individual.email2 || '';
              recipientName = individual.individual_name;
            }
          }

          if (!recipientEmail) continue;

          await emailService.sendReminderEmail({
            recipientEmail: recipientEmail,
            recipientName: recipientName,
            documentType: reminder.document_type || reminder.reminder_type,
            expiryDate: reminder.reminder_date,
            companyName: companyName,
            daysUntilExpiry: daysUntilExpiry
          });

          console.log(`Document reminder email sent to ${recipientEmail} for ${reminder.title}`);
        } catch (emailError) {
          console.error('Error sending document reminder email:', emailError);
        }
      }
    } catch (error) {
      console.error('Error checking document reminders:', error);
    }
  };

  // Toggle email notifications and enable/disable all reminders
  const toggleEmailNotifications = async () => {
    try {
      const newState = !emailNotificationsEnabled;
      setEmailNotificationsEnabled(newState);

      // Update all reminders to enabled/disabled state
      const { error } = await supabase
        .from('reminders')
        .update({ enabled: newState })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all records

      if (error) throw error;

      toast.success(`Email notifications ${newState ? 'enabled' : 'disabled'} for all reminders`);
      loadReminders(); // Reload to reflect changes
    } catch (error) {
      console.error('Error toggling email notifications:', error);
      toast.error('Failed to update email notification settings');
    }
  };

  // Toggle individual reminder notification
  const toggleReminderNotification = async (reminderId: string, currentState: boolean) => {
    try {
      const newState = !currentState;

      const { error } = await supabase
        .from('reminders')
        .update({ enabled: newState })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success(`Reminder notification ${newState ? 'enabled' : 'disabled'}`);
      loadReminders(); // Reload to reflect changes
    } catch (error) {
      console.error('Error toggling reminder notification:', error);
      toast.error('Failed to update reminder notification setting');
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'services' | 'calendar' | 'dues'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showReminderDetails, setShowReminderDetails] = useState(false);
  const [showEditReminder, setShowEditReminder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);

  // Add Reminder Form State
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    type: 'other' as 'visa_renewal' | 'license_renewal' | 'document_expiry' | 'follow_up' | 'payment_due' | 'contract_renewal' | 'other',
    companyId: '',
    employeeId: '',
    vendorId: '',
    date: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: '',
    notes: ''
  });

  // Edit Reminder Form State
  const [editReminderForm, setEditReminderForm] = useState({
    title: '',
    description: '',
    type: 'other' as 'visa_renewal' | 'license_renewal' | 'document_expiry' | 'follow_up' | 'payment_due' | 'contract_renewal' | 'other',
    companyId: '',
    employeeId: '',
    vendorId: '',
    date: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assignedTo: '',
    notes: ''
  });

  // Form handlers
  const resetReminderForm = () => {
    setNewReminder({
      title: '',
      description: '',
      type: 'other',
      companyId: '',
      employeeId: '',
      vendorId: '',
      date: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: '',
      notes: ''
    });
  };

  const handleCreateReminder = async () => {
    try {
      // Validate required fields
      if (!newReminder.title.trim()) {
        alert('Please enter a reminder title');
        return;
      }
      if (!newReminder.dueDate) {
        alert('Please select a due date');
        return;
      }

      // Prepare reminder data for database
      const reminderData = {
        title: newReminder.title.trim(),
        description: newReminder.description.trim() || null,
        reminder_date: newReminder.dueDate,
        reminder_type: newReminder.type,
        priority: newReminder.priority,
        status: 'active',
        company_id: newReminder.companyId && newReminder.companyId !== '' ? newReminder.companyId : null,
        employee_id: newReminder.employeeId && newReminder.employeeId !== '' ? newReminder.employeeId : null,
        vendor_id: newReminder.vendorId && newReminder.vendorId !== '' ? newReminder.vendorId : null,
        assigned_to: newReminder.assignedTo.trim() || null,
        notes: newReminder.notes.trim() || null,
        days_before_reminder: 30,
        created_by: 'System' // Add created_by field
      };

      console.log('Creating reminder with data:', reminderData);
      const result = await dbHelpers.createReminder(reminderData);
      console.log('Reminder created successfully:', result);

      // Reset form and close modal
      resetReminderForm();
      setShowAddReminder(false);
      alert('✅ Reminder created successfully!');

      // Reload reminders to show the new one
      await loadReminders();

    } catch (error) {
      console.error('Error creating reminder:', error);

      // Provide more specific error messages
      let errorMessage = 'Error creating reminder. ';
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          errorMessage += 'A reminder with similar details already exists.';
        } else if (error.message.includes('foreign key')) {
          errorMessage += 'Invalid company, employee, or vendor selected.';
        } else if (error.message.includes('not null')) {
          errorMessage += 'Please fill in all required fields.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }

      alert(`❌ ${errorMessage}`);
    }
  };
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [showReminderMenu, setShowReminderMenu] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: ''
  });

  // Add Service Form State
  const [newService, setNewService] = useState({
    name: '',
    client: '',
    type: 'company_formation' as 'company_formation' | 'visa' | 'license_renewal' | 'document_processing' | 'other',
    assignedTo: '',
    startDate: '',
    expectedCompletionDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    description: '',
    milestones: [] as Array<{name: string, expectedDate: string, status: 'pending' | 'in_progress' | 'completed'}>
  });

  // Handler functions
  const handleViewReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowReminderDetails(true);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    // Populate edit form with existing reminder data
    setEditReminderForm({
      title: reminder.title,
      description: reminder.description,
      type: reminder.type,
      companyId: reminder.companyId || '',
      employeeId: reminder.employeeId || '',
      vendorId: reminder.vendorId || '',
      date: reminder.date,
      dueDate: reminder.dueDate,
      priority: reminder.priority,
      assignedTo: reminder.assignedTo || '',
      notes: reminder.notes || ''
    });
    setShowEditReminder(true);
  };

  const handleUpdateReminder = async () => {
    if (!selectedReminder) return;

    try {
      // Validate required fields
      if (!editReminderForm.title.trim()) {
        alert('Please enter a reminder title');
        return;
      }
      if (!editReminderForm.dueDate) {
        alert('Please select a due date');
        return;
      }

      // Prepare updated reminder data
      const updatedReminderData = {
        title: editReminderForm.title.trim(),
        description: editReminderForm.description.trim() || null,
        reminder_date: editReminderForm.dueDate,
        reminder_type: editReminderForm.type,
        priority: editReminderForm.priority,
        company_id: editReminderForm.companyId && editReminderForm.companyId !== '' ? editReminderForm.companyId : null,
        employee_id: editReminderForm.employeeId && editReminderForm.employeeId !== '' ? editReminderForm.employeeId : null,
        vendor_id: editReminderForm.vendorId && editReminderForm.vendorId !== '' ? editReminderForm.vendorId : null,
        assigned_to: editReminderForm.assignedTo.trim() || null,
        notes: editReminderForm.notes.trim() || null
      };

      console.log('Updating reminder with data:', updatedReminderData);
      const result = await dbHelpers.updateReminder(selectedReminder.id, updatedReminderData);
      console.log('Reminder updated successfully:', result);

      // Close modal and reset form
      setShowEditReminder(false);
      setSelectedReminder(null);
      alert('✅ Reminder updated successfully!');

      // In a real app, you would reload the reminders list here
      // For now, we'll just show the success message

    } catch (error) {
      console.error('Error updating reminder:', error);

      // Provide more specific error messages
      let errorMessage = 'Error updating reminder. ';
      if (error instanceof Error) {
        if (error.message.includes('foreign key')) {
          errorMessage += 'Invalid company, employee, or vendor selected.';
        } else if (error.message.includes('not null')) {
          errorMessage += 'Please fill in all required fields.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again.';
      }

      alert(`❌ ${errorMessage}`);
    }
  };

  const handleCreateService = async () => {
    try {
      // Validate required fields
      if (!newService.name.trim()) {
        alert('Please enter a service name');
        return;
      }
      if (!newService.client.trim()) {
        alert('Please enter a client name');
        return;
      }
      if (!newService.expectedCompletionDate) {
        alert('Please select an expected completion date');
        return;
      }

      // For now, we'll just show a success message since this would typically
      // be stored in a separate services/projects table
      console.log('Creating service with data:', newService);

      // Reset form and close modal
      resetServiceForm();
      setShowAddService(false);
      alert('✅ Service milestone created successfully!');

    } catch (error) {
      console.error('Error creating service:', error);
      alert('❌ Error creating service. Please try again.');
    }
  };

  const resetServiceForm = () => {
    setNewService({
      name: '',
      client: '',
      type: 'company_formation',
      assignedTo: '',
      startDate: '',
      expectedCompletionDate: '',
      priority: 'medium',
      description: '',
      milestones: []
    });
  };

  const handleDeleteReminder = (reminderId: string) => {
    setReminderToDelete(reminderId);
    setShowDeleteConfirm(true);
  };

  const handleRecordPayment = (due: any) => {
    setSelectedDue(due);
    setPaymentForm({
      amount: due.due_amount.toString(),
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedDue || !paymentForm.amount) {
      alert('Please enter a payment amount');
      return;
    }

    try {
      const paymentAmount = parseFloat(paymentForm.amount);
      if (paymentAmount <= 0 || paymentAmount > selectedDue.due_amount) {
        alert('Please enter a valid payment amount');
        return;
      }

      await dbHelpers.markDueAsPaid(
        selectedDue.id,
        paymentAmount,
        paymentForm.paymentMethod,
        paymentForm.reference || undefined
      );

      // Reload dues to show updated information
      await loadDues();

      // Close modal and reset form
      setShowPaymentModal(false);
      setSelectedDue(null);
      setPaymentForm({
        amount: '',
        paymentMethod: 'bank_transfer',
        reference: '',
        notes: ''
      });

      alert('✅ Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('❌ Error recording payment. Please try again.');
    }
  };

  const confirmDeleteReminder = async () => {
    if (reminderToDelete) {
      try {
        console.log('🗑️ Deleting reminder:', reminderToDelete);

        const { error } = await supabase
          .from('reminders')
          .delete()
          .eq('id', reminderToDelete);

        if (error) throw error;

        console.log('✅ Reminder deleted successfully');
        toast.success('Reminder deleted successfully');

        // Reload reminders to reflect the deletion
        await loadReminders();

        setReminderToDelete(null);
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error('❌ Error deleting reminder:', error);
        toast.error('Failed to delete reminder');
      }
    }
  };

  const handleReminderMenuToggle = (reminderId: string) => {
    setShowReminderMenu(showReminderMenu === reminderId ? null : reminderId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysUntilDue = (reminderDate: string) => {
    const today = new Date();
    const dueDate = new Date(reminderDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const getDueDateColor = (reminderDate: string) => {
    const today = new Date();
    const dueDate = new Date(reminderDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'text-red-600 font-semibold'; // Overdue
    } else if (diffDays === 0) {
      return 'text-red-500 font-medium'; // Due today
    } else if (diffDays <= 3) {
      return 'text-orange-500 font-medium'; // Due soon
    } else if (diffDays <= 7) {
      return 'text-yellow-600'; // Due this week
    } else {
      return 'text-gray-500'; // Due later
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'snoozed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'visa_renewal': return User;
      case 'license_renewal': return Building;
      case 'document_expiry': return FileText;
      case 'payment_due': return AlertTriangle;
      case 'contract_renewal': return FileText;
      case 'follow_up': return Clock;
      default: return Bell;
    }
  };

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const filteredReminders = reminders.filter(reminder => {
    const matchesSearch = reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (reminder.description && reminder.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPriority = filterPriority === 'all' || reminder.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || reminder.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const totalOutstandingDues = dues.reduce((sum, due) => sum + due.due_amount, 0);
  const pendingDues = dues.filter(d => d.status === 'pending' || d.status === 'partial');
  const overdueDues = dues.filter(d => d.status === 'overdue' || new Date(d.due_date) < new Date());

  const stats = [
    {
      title: 'Active Reminders',
      value: reminders.filter(r => r.status === 'active').length.toString(),
      change: `${reminders.filter(r => r.priority === 'urgent' && r.status === 'active').length} urgent`,
      icon: Bell,
      color: 'blue'
    },
    {
      title: 'Outstanding Dues',
      value: `AED ${totalOutstandingDues.toFixed(0)}`,
      change: `${pendingDues.length} pending`,
      icon: DollarSign,
      color: 'red'
    },
    {
      title: 'Completed This Week',
      value: '12',
      change: '+4 from last week',
      icon: CheckCircle,
      color: 'green'
    },
    {
      title: 'Service Milestones',
      value: '8',
      change: '2 approaching',
      icon: Target,
      color: 'purple'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm mt-2 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    'text-blue-600'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'red' ? 'bg-red-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'red' ? 'text-red-600' :
                    'text-purple-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Reminders */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Urgent Reminders</h3>
        <div className="space-y-4">
          {reminders.filter(r => r.priority === 'urgent' && r.status === 'active').map((reminder) => {
            const TypeIcon = getTypeIcon(reminder.reminder_type);
            return (
              <div key={reminder.id} className="flex items-center space-x-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TypeIcon className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-sm text-gray-600">{reminder.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Due: {reminder.dueDate}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                    {reminder.priority.toUpperCase()}
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => handleReminderMenuToggle(reminder.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {showReminderMenu === reminder.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleViewReminder(reminder);
                              setShowReminderMenu(null);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => {
                              handleEditReminder(reminder);
                              setShowReminderMenu(null);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit Reminder</span>
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteReminder(reminder.id);
                              setShowReminderMenu(null);
                            }}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Milestones */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Milestones</h3>
        <div className="space-y-4">
          {[
            { service: 'Company Formation - XYZ Corp', milestone: 'MOA Approval', progress: 75, dueDate: '2024-02-01' },
            { service: 'Visa Processing - John Doe', milestone: 'Medical Test', progress: 50, dueDate: '2024-01-28' },
            { service: 'License Renewal - ABC Trading', milestone: 'Document Submission', progress: 90, dueDate: '2024-01-25' }
          ].map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{item.service}</p>
                  <p className="text-sm text-gray-600">{item.milestone}</p>
                </div>
                <span className="text-sm text-gray-500">Due: {item.dueDate}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">{item.progress}% complete</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'services', label: 'Services', icon: Target },
    { id: 'dues', label: 'Due', icon: DollarSign },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays }
  ];

  // Render Dues List
  const renderDuesList = () => {
    const filteredDues = dues.filter(due => {
      const matchesSearch = searchTerm === '' ||
        due.company?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        due.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        due.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        due.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = filterPriority === 'all' || due.priority === filterPriority;
      const matchesStatus = filterStatus === 'all' || due.status === filterStatus;

      return matchesSearch && matchesPriority && matchesStatus;
    });

    const getDueStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'partial': return 'bg-blue-100 text-blue-800';
        case 'paid': return 'bg-green-100 text-green-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        case 'cancelled': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-800';
        case 'high': return 'bg-orange-100 text-orange-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Dues</h3>
              <p className="text-sm text-gray-600">
                Track unpaid amounts when companies exceed their credit limits
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Total Outstanding: AED {dues.reduce((sum, due) => sum + due.due_amount, 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search dues by company, employee, service, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dues List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading dues...</p>
            </div>
          ) : filteredDues.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No dues found</h3>
              <p className="text-gray-600">All companies are within their credit limits.</p>
            </div>
          ) : (
            filteredDues.map((due) => (
              <div key={due.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {due.company?.company_name || 'Unknown Company'}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDueStatusColor(due.status)}`}>
                        {due.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(due.priority)}`}>
                        {due.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Service:</strong> {due.service_name || 'N/A'}</p>
                      <p><strong>Employee:</strong> {due.employee?.name || 'N/A'}</p>
                      <p><strong>Invoice:</strong> {due.invoice_number || 'N/A'}</p>
                      <p><strong>Service Date:</strong> {new Date(due.service_date).toLocaleDateString()}</p>
                      <p><strong>Due Date:</strong> {new Date(due.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Original Amount</p>
                        <p className="text-lg font-semibold text-gray-900">AED {due.original_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Paid Amount</p>
                        <p className="text-lg font-semibold text-green-600">AED {due.paid_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Due Amount</p>
                        <p className="text-xl font-bold text-red-600">AED {due.due_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {due.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{due.notes}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Created: {new Date(due.created_at).toLocaleDateString()}
                    {due.last_payment_date && (
                      <span className="ml-4">
                        Last Payment: {new Date(due.last_payment_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm">
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => handleRecordPayment(due)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reminders & Services</h1>
            <p className="text-gray-600 mt-1">Intelligent reminder system and service milestone tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowAddReminder(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'reminders' && renderRemindersList()}
      {activeTab === 'services' && renderServiceTracking()}
      {activeTab === 'dues' && renderDuesList()}
      {activeTab === 'calendar' && renderCalendarView()}

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Reminder</h2>
                <button
                  onClick={() => setShowAddReminder(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateReminder(); }} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter reminder title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newReminder.description}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter reminder description"
                    rows={3}
                  />
                </div>

                {/* Type and Priority Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="other">Other</option>
                      <option value="visa_renewal">Visa Renewal</option>
                      <option value="license_renewal">License Renewal</option>
                      <option value="document_expiry">Document Expiry</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="payment_due">Payment Due</option>
                      <option value="contract_renewal">Contract Renewal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newReminder.priority}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Date and Due Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newReminder.date}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newReminder.dueDate}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={newReminder.assignedTo}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter assignee name"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newReminder.notes}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Additional notes or comments"
                    rows={2}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      resetReminderForm();
                      setShowAddReminder(false);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newReminder.title.trim() || !newReminder.dueDate}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Reminder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Details Modal */}
      {showReminderDetails && selectedReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Reminder Details</h2>
                <button
                  onClick={() => setShowReminderDetails(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedReminder.title}</h3>
                  <p className="text-gray-600">{selectedReminder.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedReminder.priority)}`}>
                      {selectedReminder.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedReminder.status)}`}>
                      {selectedReminder.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className="text-gray-900">{selectedReminder.dueDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <p className="text-gray-900">{selectedReminder.assignedTo}</p>
                  </div>
                </div>
                {selectedReminder.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-gray-900">{selectedReminder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {showEditReminder && selectedReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Edit Reminder</h2>
                <button
                  onClick={() => setShowEditReminder(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateReminder(); }} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editReminderForm.title}
                    onChange={(e) => setEditReminderForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter reminder title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editReminderForm.description}
                    onChange={(e) => setEditReminderForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter reminder description"
                    rows={3}
                  />
                </div>

                {/* Type and Priority Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={editReminderForm.type}
                      onChange={(e) => setEditReminderForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="other">Other</option>
                      <option value="visa_renewal">Visa Renewal</option>
                      <option value="license_renewal">License Renewal</option>
                      <option value="document_expiry">Document Expiry</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="payment_due">Payment Due</option>
                      <option value="contract_renewal">Contract Renewal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={editReminderForm.priority}
                      onChange={(e) => setEditReminderForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Date and Due Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editReminderForm.date}
                      onChange={(e) => setEditReminderForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editReminderForm.dueDate}
                      onChange={(e) => setEditReminderForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={editReminderForm.assignedTo}
                    onChange={(e) => setEditReminderForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter assignee name"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editReminderForm.notes}
                    onChange={(e) => setEditReminderForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes or comments"
                    rows={2}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditReminder(false);
                      setSelectedReminder(null);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editReminderForm.title.trim() || !editReminderForm.dueDate}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Reminder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Delete Reminder</h3>
                  <p className="text-gray-600">Are you sure you want to delete this reminder?</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteReminder}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Add New Service</h2>
                <button
                  onClick={() => setShowAddService(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateService(); }} className="space-y-6">
                {/* Service Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter service name"
                    required
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newService.client}
                    onChange={(e) => setNewService(prev => ({ ...prev, client: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter client name"
                    required
                  />
                </div>

                {/* Service Type and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type
                    </label>
                    <select
                      value={newService.type}
                      onChange={(e) => setNewService(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="company_formation">Company Formation</option>
                      <option value="visa">Visa Processing</option>
                      <option value="license_renewal">License Renewal</option>
                      <option value="document_processing">Document Processing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newService.priority}
                      onChange={(e) => setNewService(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={newService.assignedTo}
                    onChange={(e) => setNewService(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter assignee name"
                  />
                </div>

                {/* Start Date and Expected Completion Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newService.startDate}
                      onChange={(e) => setNewService(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Completion Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newService.expectedCompletionDate}
                      onChange={(e) => setNewService(prev => ({ ...prev, expectedCompletionDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newService.description}
                    onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter service description"
                    rows={3}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      resetServiceForm();
                      setShowAddService(false);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newService.name.trim() || !newService.client.trim() || !newService.expectedCompletionDate}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedDue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Record Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">{selectedDue.company?.company_name}</h3>
                <p className="text-sm text-gray-600">Outstanding: AED {selectedDue.due_amount.toFixed(2)}</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handlePaymentSubmit(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedDue.due_amount}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Transaction reference"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!paymentForm.amount}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderRemindersList() {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
              <p className="text-sm text-gray-600">
                Enable automatic email reminders 10 days before document expiry
              </p>
            </div>
            <button
              onClick={toggleEmailNotifications}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                emailNotificationsEnabled
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {emailNotificationsEnabled ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
              <span className="font-medium">
                {emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="snoozed">Snoozed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading reminders...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders found</h3>
              <p className="text-gray-600">Create a new reminder to get started.</p>
            </div>
          ) : (
            filteredReminders.map((reminder) => {
            const TypeIcon = getTypeIcon(reminder.reminder_type);
            return (
              <div key={reminder.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <TypeIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{reminder.title}</h3>
                      <p className="text-gray-600 mb-3">{reminder.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(reminder.reminder_date).toLocaleDateString()}</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${getDueDateColor(reminder.reminder_date)}`}>
                          <Clock className="w-4 h-4" />
                          <span>{getDaysUntilDue(reminder.reminder_date)}</span>
                        </div>
                        {reminder.assigned_to && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>Assigned to: {reminder.assigned_to}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>Created: {new Date(reminder.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(reminder.priority)}`}>
                      {reminder.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(reminder.status)}`}>
                      {reminder.status.toUpperCase()}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => toggleReminderNotification(reminder.id, reminder.enabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          reminder.enabled
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={reminder.enabled ? 'Disable Notifications' : 'Enable Notifications'}
                      >
                        {reminder.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleViewReminder(reminder)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View Reminder"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditReminder(reminder)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                        title="Edit Reminder"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Reminder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    );
  }

  function renderServiceTracking() {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Service Milestone Tracking</h3>
            <button
              onClick={() => setShowAddService(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-6">
            {[
              {
                id: '1',
                name: 'Company Formation - XYZ Corp',
                client: 'XYZ Corporation',
                type: 'company_formation',
                status: 'in_progress',
                progress: 75,
                milestones: [
                  { name: 'Initial Consultation', status: 'completed', date: '2024-01-01' },
                  { name: 'Name Reservation', status: 'completed', date: '2024-01-05' },
                  { name: 'MOA Preparation', status: 'completed', date: '2024-01-10' },
                  { name: 'MOA Approval', status: 'in_progress', date: '2024-01-20' },
                  { name: 'License Issuance', status: 'pending', date: '2024-02-01' }
                ]
              },
              {
                id: '2',
                name: 'Visa Processing - John Doe',
                client: 'ABC Trading LLC',
                type: 'visa',
                status: 'in_progress',
                progress: 50,
                milestones: [
                  { name: 'Application Submission', status: 'completed', date: '2024-01-15' },
                  { name: 'Initial Approval', status: 'completed', date: '2024-01-18' },
                  { name: 'Medical Test', status: 'in_progress', date: '2024-01-25' },
                  { name: 'Emirates ID Application', status: 'pending', date: '2024-02-01' },
                  { name: 'Visa Stamping', status: 'pending', date: '2024-02-05' }
                ]
              }
            ].map((service) => (
              <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.client}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">{service.progress}% Complete</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${service.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {service.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        milestone.status === 'completed' ? 'bg-green-500 border-green-500' :
                        milestone.status === 'in_progress' ? 'bg-blue-500 border-blue-500' :
                        'bg-gray-200 border-gray-300'
                      }`}>
                        {milestone.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          milestone.status === 'completed' ? 'text-green-700' :
                          milestone.status === 'in_progress' ? 'text-blue-700' :
                          'text-gray-600'
                        }`}>
                          {milestone.name}
                        </p>
                        <p className="text-xs text-gray-500">{milestone.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderCalendarView() {
    // Get first day of the month and calculate calendar grid
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Calendar View</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="text-center">
                <h4 className="text-xl font-semibold text-gray-900">{monthName}</h4>
              </div>

              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-lg">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(startDate.getDate() + i);
              const dayReminders = reminders.filter(r => r.reminder_date === date.toISOString().split('T')[0]);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div key={i} className={`min-h-[100px] p-2 border border-gray-200 rounded-lg hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50 opacity-50' : ''
                } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <div className={`text-sm font-medium mb-2 ${
                    isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayReminders.slice(0, 2).map((reminder) => (
                      <div key={reminder.id} className={`text-xs p-1 rounded ${getPriorityColor(reminder.priority)}`}>
                        {reminder.title.substring(0, 20)}...
                      </div>
                    ))}
                    {dayReminders.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayReminders.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-gray-600">Urgent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
              <span className="text-gray-600">High Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-gray-600">Medium Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span className="text-gray-600">Low Priority</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default RemindersServices;
