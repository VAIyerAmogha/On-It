'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, FileText } from 'lucide-react';

export interface Milestone {
  _id: string;
  milestone_number: number;
  deliverable_description: string | null;
  trigger_type: string;
  amount_inr: number | null;
  status: 'PENDING' | 'TRIGGERED' | 'INVOICED' | 'PAID' | 'OVERDUE';
}

interface MilestoneCardProps {
  milestone: Milestone;
  onTrigger: (id: string) => Promise<void>;
  onInvoice: (id: string) => Promise<void>;
  onPaid: (id: string) => Promise<void>;
}

export default function MilestoneCard({ milestone, onTrigger, onInvoice, onPaid }: MilestoneCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formatINR = (amount: number | null) => {
    if (amount === null) return 'TBD';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
      case 'TRIGGERED': return 'bg-accent-500/10 text-accent-600 dark:text-accent-400';
      case 'INVOICED': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'PAID': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'OVERDUE': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const handleAction = async (action: (id: string) => Promise<void>) => {
    setIsLoading(true);
    try {
      await action(milestone._id);
    } catch (e) {
      console.error("Action failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-surface p-6 rounded-2xl flex flex-col h-full hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Milestone {milestone.milestone_number}
          </span>
          <h3 className="text-lg font-semibold mt-1 line-clamp-2">
            {milestone.deliverable_description || 'No description provided'}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusStyle(milestone.status)}`}>
          {milestone.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between mb-6 mt-auto">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trigger Type</p>
          <p className="text-sm font-medium capitalize">{(milestone.trigger_type || 'unknown').replace('_', ' ')}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
          <p className="text-sm font-medium">
            {formatINR(milestone.amount_inr)}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50 min-h-[3rem] flex items-center justify-center">
        {milestone.status === 'PENDING' && milestone.trigger_type === 'event_based' && (
          <button
            onClick={() => handleAction(onTrigger)}
            disabled={isLoading}
            className="w-full bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark Triggered
          </button>
        )}

        {milestone.status === 'PENDING' && milestone.trigger_type !== 'event_based' && (
          <div className="w-full text-center text-sm text-gray-500 font-medium py-2.5">
            Auto-triggers on conditions
          </div>
        )}

        {milestone.status === 'TRIGGERED' && (
          <button
            onClick={() => handleAction(onInvoice)}
            disabled={isLoading}
            className="w-full bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate Invoice
          </button>
        )}

        {(milestone.status === 'INVOICED' || milestone.status === 'OVERDUE') && (
          <button
            onClick={() => handleAction(onPaid)}
            disabled={isLoading}
            className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark Paid
          </button>
        )}

        {milestone.status === 'PAID' && (
          <div className="w-full text-center text-sm text-emerald-500 font-medium py-2.5 flex justify-center items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Payment Completed
          </div>
        )}
      </div>
    </div>
  );
}
