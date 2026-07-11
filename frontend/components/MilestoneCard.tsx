'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, FileText, ArrowRight, Receipt } from 'lucide-react';
import Link from 'next/link';

export interface Milestone {
  _id: string;
  milestone_number: number;
  deliverable_description: string | null;
  trigger_type: string;
  trigger_condition?: string | null;
  trigger_date?: string | null;
  amount_inr: number | null;
  status: 'PENDING' | 'TRIGGERED' | 'INVOICED' | 'PAID' | 'OVERDUE';
  invoice_id?: string;
}

interface MilestoneCardProps {
  milestone: Milestone;
  onTrigger: (id: string) => Promise<void>;
  onInvoice: (id: string) => Promise<void>;
  onPaid: (id: string) => Promise<void>;
}

export default function MilestoneCard({ milestone, onTrigger, onInvoice, onPaid }: MilestoneCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedInvoiceId, setResolvedInvoiceId] = useState<string | undefined>(milestone.invoice_id);

  // If status indicates an invoice should exist but invoice_id wasn't provided,
  // fetch it directly from the by-milestone endpoint as a fallback
  useEffect(() => {
    setResolvedInvoiceId(milestone.invoice_id);
    
    if (['INVOICED', 'OVERDUE', 'PAID'].includes(milestone.status) && !milestone.invoice_id) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      
      fetch(`${baseUrl}/api/invoices/by-milestone/${milestone._id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?._id) setResolvedInvoiceId(data._id);
        })
        .catch(() => {}); // silent — button simply won't show if fetch fails
    }
  }, [milestone._id, milestone.status, milestone.invoice_id]);



  const formatINR = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'TBD';
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
          {(milestone.trigger_condition || milestone.trigger_date) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">
              Expected to trigger: {milestone.trigger_date ? `${milestone.trigger_date}` : ''}
              {milestone.trigger_date && milestone.trigger_condition ? ' - ' : ''}
              {milestone.trigger_condition || ''}
            </p>
          )}
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
        {milestone.status === 'PENDING' && (
          <button
            onClick={() => handleAction(onTrigger)}
            disabled={isLoading}
            className="w-full bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark Triggered
          </button>
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
          <div className="w-full flex flex-col gap-2">
            {resolvedInvoiceId && (
              <Link
                href={`/invoices/${resolvedInvoiceId}`}
                className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                View Invoice
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => handleAction(onPaid)}
              disabled={isLoading}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark Paid
            </button>
          </div>
        )}

        {milestone.status === 'PAID' && (
          <div className="w-full flex flex-col gap-2">
            <div className="w-full text-center text-sm text-emerald-500 font-medium py-2.5 flex justify-center items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Payment Completed
            </div>
            {resolvedInvoiceId && (
              <Link
                href={`/invoices/${resolvedInvoiceId}`}
                className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                View Invoice
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
