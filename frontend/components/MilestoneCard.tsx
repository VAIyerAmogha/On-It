'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, FileText, ArrowRight, Receipt, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Button from './Button';
import { Card, CardBody } from './Card';
import Badge from './Badge';
import Modal from './Modal';
import { Input } from './Input';

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
    <Card variant="default" className="flex flex-col h-full">
      <CardBody className="flex flex-col h-full min-h-[220px] justify-between p-6">
        <div>
          <div className="flex justify-between items-start gap-4">
            <span className="text-xs font-semibold text-text-muted">
              Milestone {milestone.milestone_number}
            </span>
            <Badge status={milestone.status} />
          </div>
          
          <h3 className="text-base font-semibold text-text-primary mt-2.5 line-clamp-2">
            {milestone.deliverable_description || 'No description provided'}
          </h3>
          
          {(milestone.trigger_condition || milestone.trigger_date) && (
            <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed bg-bg-base/40 p-2 rounded border border-border-subtle/50">
              Expected to trigger: {milestone.trigger_date ? `${milestone.trigger_date}` : ''}
              {milestone.trigger_date && milestone.trigger_condition ? ' - ' : ''}
              {milestone.trigger_condition || ''}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle/30">
          <div>
            <p className="text-[10px] text-text-muted uppercase font-semibold">Trigger Type</p>
            <p className="text-xs font-semibold text-text-primary capitalize mt-0.5">
              {(milestone.trigger_type || 'unknown').replace('_', ' ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-text-muted uppercase font-semibold">Amount</p>
            <p className="text-xs font-semibold text-text-primary font-mono mt-0.5">
              {formatINR(milestone.amount_inr)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border-subtle mt-4 flex items-center justify-center min-h-[44px]">
          {milestone.status === 'PENDING' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction(onTrigger)}
              isLoading={isLoading}
              className="w-full flex items-center justify-center gap-1.5"
            >
              {!isLoading && <CheckCircle2 className="w-4 h-4 text-accent" strokeWidth={1.5} />}
              Mark Triggered
            </Button>
          )}

          {milestone.status === 'TRIGGERED' && (
            <div className="w-full flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAction(onInvoice)}
                isLoading={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                {!isLoading && <FileText className="w-4 h-4" strokeWidth={1.5} />}
                Invoice
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-warning" strokeWidth={1.5} />
                Missed Deadline
              </Button>
            </div>
          )}

          {(milestone.status === 'INVOICED' || milestone.status === 'OVERDUE') && (
            <div className="w-full flex flex-col gap-2">
              {resolvedInvoiceId && (
                <Link href={`/invoices/${resolvedInvoiceId}`} className="w-full">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" strokeWidth={1.5} />
                    View Invoice
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" strokeWidth={2} />
                  </Button>
                </Link>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAction(onPaid)}
                isLoading={isLoading}
                className="w-full flex items-center justify-center gap-1.5"
              >
                {!isLoading && <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.5} />}
                Mark Paid
              </Button>
            </div>
          )}

          {milestone.status === 'PAID' && (
            <div className="w-full flex flex-col gap-2">
              <div className="w-full text-center text-xs font-semibold text-success py-2 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                Payment Completed
              </div>
              {resolvedInvoiceId && (
                <Link href={`/invoices/${resolvedInvoiceId}`} className="w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" strokeWidth={1.5} />
                    View Invoice
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </CardBody>

      {/* Missed Deadline Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Missed Deadline Invoice"
        footerActions={
          <>
            <Button variant="ghost" onClick={handleCloseModal} disabled={isModalSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmDiscount} isLoading={isModalSubmitting}>
              Generate Missed Deadline Invoice
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Discount Percentage"
            type="number"
            min="1"
            max="100"
            placeholder="e.g. 15"
            value={discountInput}
            onChange={(e) => {
              setDiscountInput(e.target.value);
              setFieldError('');
              setErrorMsg('');
            }}
            error={fieldError}
            isMono={true}
          />
          
          <div className="bg-bg-elevated p-3.5 border border-border-subtle rounded-md text-xs font-semibold text-text-secondary">
            Invoice amount: ₹{discounted.toLocaleString('en-IN')} (₹{original.toLocaleString('en-IN')} - {discountVal}%)
          </div>
          
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-md font-medium">
              {errorMsg}
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
