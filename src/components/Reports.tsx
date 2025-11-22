import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  Download,
  Filter,
  Search,
  Users,
  Building2,
  CreditCard,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Receipt,
  Target
} from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

// Import individual report components
import DayBookReport from './reports/DayBookReport';
import ExpenseReport from './reports/ExpenseReport';
import IncomeReport from './reports/IncomeReport';
import CompanyWiseReport from './reports/CompanyWiseReport';
import ProfitLossReport from './reports/ProfitLossReport';
import EmployeeWiseReport from './reports/EmployeeWiseReport';
import BankReport from './reports/BankReport';
import CashReport from './reports/CashReport';
import ServiceWiseReport from './reports/ServiceWiseReport';
import OutstandingReport from './reports/OutstandingReport';
import CreditReport from './reports/CreditReport';
import DebitReport from './reports/DebitReport';
import AdvancePaymentReport from './reports/AdvancePaymentReport';
import VendorReports from './VendorReports';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  category: 'financial' | 'operational' | 'client' | 'payment';
}

const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const reportTypes: ReportType[] = [
    {
      id: 'daybook',
      title: 'Day Book Report',
      description: 'All transactions for selected date range',
      icon: Calendar,
      color: 'blue',
      category: 'financial'
    },
    {
      id: 'expense',
      title: 'Expense Report',
      description: 'Expenses breakdown by categories and payment methods',
      icon: TrendingUp,
      color: 'red',
      category: 'financial'
    },
    {
      id: 'income',
      title: 'Income Report',
      description: 'Revenue breakdown by service types and sources',
      icon: DollarSign,
      color: 'green',
      category: 'financial'
    },
    {
      id: 'company-wise',
      title: 'Company-wise Report',
      description: 'Financial summary for each company client',
      icon: Building2,
      color: 'purple',
      category: 'client'
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss Account',
      description: 'P&L statement with income vs expenses',
      icon: BarChart3,
      color: 'indigo',
      category: 'financial'
    },
    {
      id: 'employee-wise',
      title: 'Employee-wise Report',
      description: 'Performance and activity by employee',
      icon: Users,
      color: 'orange',
      category: 'operational'
    },
    {
      id: 'bank',
      title: 'By Bank Report',
      description: 'All bank transfer transactions',
      icon: CreditCard,
      color: 'cyan',
      category: 'payment'
    },
    {
      id: 'cash',
      title: 'By Cash Report',
      description: 'All cash transactions',
      icon: Banknote,
      color: 'emerald',
      category: 'payment'
    },
    {
      id: 'service-wise',
      title: 'Service-wise Report',
      description: 'Revenue and activity breakdown by service type',
      icon: Target,
      color: 'pink',
      category: 'operational'
    },
    {
      id: 'outstanding',
      title: 'Outstanding Report',
      description: 'Customer balances, advance payments, and outstanding amounts',
      icon: AlertTriangle,
      color: 'amber',
      category: 'client'
    },
    {
      id: 'credit',
      title: 'Credit Report',
      description: 'All credit transactions and receivables',
      icon: TrendingUp,
      color: 'teal',
      category: 'financial'
    },
    {
      id: 'debit',
      title: 'Debit Report',
      description: 'All debit transactions and payables',
      icon: TrendingDown,
      color: 'rose',
      category: 'financial'
    },
    {
      id: 'advance-payment',
      title: 'Advance Payment Report',
      description: 'All advance payment transactions and prepayments',
      icon: Clock,
      color: 'violet',
      category: 'financial'
    },
    {
      id: 'vendor',
      title: 'Vendor Report',
      description: 'Vendor transactions, expenses, and performance metrics',
      icon: Users,
      color: 'slate',
      category: 'operational'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Reports', icon: FileText },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'operational', label: 'Operational', icon: Activity },
    { id: 'client', label: 'Client Reports', icon: Building2 },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard }
  ];

  const filteredReports = reportTypes.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600 border-blue-200',
      red: 'bg-red-100 text-red-600 border-red-200',
      green: 'bg-green-100 text-green-600 border-green-200',
      purple: 'bg-purple-100 text-purple-600 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
      orange: 'bg-orange-100 text-orange-600 border-orange-200',
      cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200',
      emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200',
      pink: 'bg-pink-100 text-pink-600 border-pink-200',
      amber: 'bg-amber-100 text-amber-600 border-amber-200',
      teal: 'bg-teal-100 text-teal-600 border-teal-200',
      rose: 'bg-rose-100 text-rose-600 border-rose-200',
      violet: 'bg-violet-100 text-violet-600 border-violet-200',
      slate: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    return colorMap[color] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const renderReportComponent = () => {
    switch (activeReport) {
      case 'daybook':
        return <DayBookReport />;
      case 'expense':
        return <ExpenseReport />;
      case 'income':
        return <IncomeReport />;
      case 'company-wise':
        return <CompanyWiseReport />;
      case 'profit-loss':
        return <ProfitLossReport />;
      case 'employee-wise':
        return <EmployeeWiseReport />;
      case 'bank':
        return <BankReport />;
      case 'cash':
        return <CashReport />;
      case 'service-wise':
        return <ServiceWiseReport />;
      case 'outstanding':
        return <OutstandingReport />;
      case 'credit':
        return <CreditReport />;
      case 'debit':
        return <DebitReport />;
      case 'advance-payment':
        return <AdvancePaymentReport />;
      case 'vendor':
        return <VendorReports />;
      default:
        return null;
    }
  };

  if (activeReport !== 'overview') {
    return (
      <div className="space-y-6">
        {/* Back to Overview */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveReport('overview')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <FileText className="w-4 h-4" />
            <span>← Back to Reports Overview</span>
          </button>
        </div>
        
        {/* Render Selected Report */}
        {renderReportComponent()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive business reports and analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export All</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg border ${getColorClasses(report.color)}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(report.color)}`}>
                  {report.category}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {report.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4">
                {report.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Click to view</span>
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <span className="text-xs text-gray-600 group-hover:text-blue-600">→</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">13</div>
            <div className="text-sm text-gray-600">Available Reports</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">4</div>
            <div className="text-sm text-gray-600">Report Categories</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">Real-time</div>
            <div className="text-sm text-gray-600">Data Updates</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">Export</div>
            <div className="text-sm text-gray-600">PDF & Excel</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
