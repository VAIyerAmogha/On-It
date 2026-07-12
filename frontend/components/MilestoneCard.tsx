'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, FileText, ArrowRight, Receipt, AlertTriangle } from 'lucide-react';
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
  onMissedDeadline: (id: string, discountPercentage: number) => Promise<void>;
  onPaid: (id: string) => Promise<void>;
}

export default function MilestoneCard({ milestone, onTrigger, onInvoice, onMissedDeadline, onPaid }: MilestoneCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedInvoiceId, setResolvedInvoiceId] = useState<string | undefined>(milestone.invoice_id);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleCloseModal = () => {
    if (isModalSubmitting) return;
    setIsModalOpen(false);
    setDiscountInput('');
    setFieldError('');
    setErrorMsg('');
  };

  const handleConfirmDiscount = async () => {
    const val = parseInt(discountInput);
    if (!discountInput.trim() || isNaN(val) || val < 1 || val > 100) {
      setFieldError('Discount percentage must be an integer between 1 and 100');
      return;
    }
    
    setIsModalSubmitting(true);
    setErrorMsg('');
    try {
      await onMissedDeadline(milestone._id, val);
      setIsModalOpen(false);
      setDiscountInput('');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to generate missed deadline invoice');
    } finally {
      setIsModalSubmitting(false);
    }
  };

  // Client-side calculations for the live preview
  const original = milestone.amount_inr || 0;
  const discountVal = parseInt(discountInput) || 0;
  const discountAmount = original * (discountVal / 100);
  const discounted = Math.max(0, original - discountAmount);

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
          <div className="w-full flex gap-2">
            <button
              onClick={() => handleAction(onInvoice)}
              disabled={isLoading}
              className="flex-1 bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate Invoice
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isLoading}
              className="flex-1 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Missed Deadline
            </button>
          </div>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="glass-surface w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Missed Deadline Invoice
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Discount Percentage
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    placeholder="e.g. 15"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value);
                      setFieldError('');
                      setErrorMsg('');
                    }}
                    className={`w-full bg-black/5 dark:bg-white/5 border ${
                      fieldError ? 'border-red-500/50' : 'border-transparent focus:border-accent-500/50'
                    } rounded-lg pl-4 pr-10 py-2.5 outline-none transition-colors font-medium`}
                  />
                  <span className="absolute right-4 text-gray-500 font-medium">%</span>
                </div>
                {fieldError && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{fieldError}</p>
                )}
              </div>
              
              <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
                Invoice amount: ₹{discounted.toLocaleString('en-IN')} (₹{original.toLocaleString('en-IN')} - {discountVal}%)
              </div>
              
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isModalSubmitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDiscount}
                  disabled={isModalSubmitting}
                  className="bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-accent-500/20"
                >
                  {isModalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Missed Deadline Invoice'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
