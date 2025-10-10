import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { dbHelpers } from '../lib/supabase';
import toast from 'react-hot-toast';

interface CardBalance {
  id: string;
  cardName: string;
  cardType: string;
  bankName?: string;
  creditLimit: number;
  totalUsed: number;
  availableCredit: number;
  utilizationPercentage: number;
  isDefault: boolean;
  todayUsage: number;
  transactionCount: number;
  lastTransactionDate?: string;
}

interface CardBalanceWidgetProps {
  onCardClick?: (cardId: string) => void;
  showTitle?: boolean;
  compact?: boolean;
}

const CardBalanceWidget: React.FC<CardBalanceWidgetProps> = ({ 
  onCardClick, 
  showTitle = true, 
  compact = false 
}) => {
  const [cardBalances, setCardBalances] = useState<CardBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCardBalances();
  }, []);

  const loadCardBalances = async () => {
    try {
      setLoading(true);
      const balances = await dbHelpers.getCardBalances();
      setCardBalances(balances);
    } catch (error) {
      console.error('Error loading card balances:', error);
      toast.error('Failed to load card balances');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCardBalances();
      toast.success('Card balances refreshed');
    } catch (error) {
      console.error('Error refreshing card balances:', error);
      toast.error('Failed to refresh card balances');
    } finally {
      setRefreshing(false);
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-orange-600 bg-orange-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getUtilizationBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalCreditLimit = cardBalances.reduce((sum, card) => sum + card.creditLimit, 0);
  const totalAvailableCredit = cardBalances.reduce((sum, card) => sum + card.availableCredit, 0);
  const totalTodayUsage = cardBalances.reduce((sum, card) => sum + card.todayUsage, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Card Balances</h2>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (cardBalances.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Card Balances</h2>
          </div>
        )}
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No active payment cards found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Card Balances</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Credit</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(totalCreditLimit)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Available Credit</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(totalAvailableCredit)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Today's Usage</p>
                <p className="text-lg font-bold text-purple-900">{formatCurrency(totalTodayUsage)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Card List */}
      <div className="space-y-4">
        {cardBalances.map((card) => (
          <div
            key={card.id}
            className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
              onCardClick ? 'cursor-pointer hover:border-blue-300' : ''
            }`}
            onClick={() => onCardClick?.(card.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{card.cardName}</h3>
                    {card.isDefault && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)}
                    {card.bankName && ` • ${card.bankName}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(card.utilizationPercentage)}`}>
                  {card.utilizationPercentage >= 90 && <AlertCircle className="w-3 h-3 mr-1" />}
                  {card.utilizationPercentage.toFixed(1)}% used
                </div>
              </div>
            </div>

            {/* Credit Usage Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Credit Usage</span>
                <span>{formatCurrency(card.totalUsed)} / {formatCurrency(card.creditLimit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getUtilizationBarColor(card.utilizationPercentage)}`}
                  style={{ width: `${Math.min(100, card.utilizationPercentage)}%` }}
                ></div>
              </div>
            </div>

            {/* Card Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Available</p>
                <p className="font-semibold text-green-600">{formatCurrency(card.availableCredit)}</p>
              </div>
              <div>
                <p className="text-gray-500">Today's Usage</p>
                <p className="font-semibold text-purple-600">{formatCurrency(card.todayUsage)}</p>
              </div>
              <div>
                <p className="text-gray-500">Transactions</p>
                <p className="font-semibold text-gray-900">{card.transactionCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Used</p>
                <p className="font-semibold text-gray-900">
                  {card.lastTransactionDate 
                    ? new Date(card.lastTransactionDate).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardBalanceWidget;
