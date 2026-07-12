'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { ArrowLeft, CheckCircle2, FileText, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';

interface MilestoneDetail {
  _id: string;
  milestone_number: number;
  deliverable_description: string | null;
  trigger_type: string;
  trigger_condition: string | null;
  trigger_date: string | null;
  percentage: number | null;
  amount_inr: number | null;
  status: string;
  contract_id: string;
}

interface ContractInfo {
  _id: string;
  project_name: string | null;
  client_name: string | null;
}

interface InvoiceInfo {
  _id: string;
  invoice_number: string;
  total_amount: number;
}

export default function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [milestone, setMilestone] = useState<MilestoneDetail | null>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Invoice form state
  const [editedAmount, setEditedAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const gstRate = 0.18;

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await apiFetch(`/api/milestones/detail/${id}`);
        setMilestone(data.milestone);
        setContract(data.contract);
        setInvoice(data.invoice);
        if (data.milestone?.amount_inr !== null) {
          setEditedAmount(data.milestone.amount_inr.toString());
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch milestone');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = editedAmount ? { edited_amount: parseFloat(editedAmount) } : {};
      const newInvoice = await apiFetch(`/api/milestones/${id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      router.push(`/invoices/${newInvoice._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse max-w-3xl mx-auto p-8 space-y-6">
        <div className="w-32 h-4 bg-bg-elevated rounded mb-8"></div>
        <div className="bg-bg-elevated p-8 rounded-3xl h-64"></div>
      </div>
    );
  }

  if (error || !milestone) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-3xl mx-auto">
        <div className="bg-gradient-surface border border-border-default shadow-card p-12 rounded-xl text-center w-full">
          <h2 className="text-xl font-bold mb-4 text-text-primary">{error || 'Milestone not found'}</h2>
          <Link href="/dashboard" className="text-accent font-medium hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const numericAmount = parseFloat(editedAmount) || 0;
  const gstAmount = numericAmount * gstRate;
  const totalAmount = numericAmount + gstAmount;

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link href={contract ? `/contracts/${contract._id}` : '/dashboard'} className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Contract
      </Link>

      <div className="bg-gradient-surface border border-border-default shadow-card p-8 rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1 block">Milestone {milestone.milestone_number}</span>
            <h1 className="text-2xl font-bold text-text-primary">{milestone.deliverable_description || 'Unnamed Milestone'}</h1>
            {contract && (
              <div className="flex items-center gap-2 text-sm text-text-muted mt-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{contract.project_name || 'Untitled'}</span>
                <span>•</span>
                <span>{contract.client_name || 'Unknown Client'}</span>
              </div>
            )}
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize shrink-0 ${
            milestone.status === 'TRIGGERED' ? 'bg-warning-subtle text-warning' :
            milestone.status === 'INVOICED' ? 'bg-info-subtle text-status-invoiced' :
            milestone.status === 'PAID' ? 'bg-success-subtle text-status-paid' :
            milestone.status === 'OVERDUE' ? 'bg-danger-subtle text-status-overdue' :
            'bg-[#F5F5F4] text-status-pending'
          }`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-border-subtle text-text-primary">
          <div>
            <p className="text-xs text-text-muted uppercase mb-1">Trigger Type</p>
            <p className="font-medium capitalize">{milestone.trigger_type.replace('_', ' ')}</p>
          </div>
          {milestone.trigger_date && (
            <div>
              <p className="text-xs text-text-muted uppercase mb-1">Trigger Date</p>
              <p className="font-medium">{milestone.trigger_date}</p>
            </div>
          )}
          {milestone.trigger_condition && (
            <div className="col-span-2">
              <p className="text-xs text-text-muted uppercase mb-1">Condition</p>
              <p className="font-medium text-sm line-clamp-2">{milestone.trigger_condition}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted uppercase mb-1">Percentage</p>
            <p className="font-medium">{milestone.percentage ? `${milestone.percentage}%` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase mb-1">Base Amount</p>
            <p className="font-medium font-mono">{milestone.amount_inr ? formatINR(milestone.amount_inr) : 'TBD'}</p>
          </div>
        </div>

        <div className="mt-8">
          {milestone.status === 'TRIGGERED' && (
            <div className="bg-accent-subtle border border-border-accent/35 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary">
                <FileText className="w-5 h-5 text-accent" />
                Generate Invoice
              </h3>
              
              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Invoice Base Amount (INR)</label>
                    <input 
                      type="number" 
                      value={editedAmount}
                      onChange={(e) => setEditedAmount(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-border-default rounded-xl focus:outline-none focus:border-border-accent focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] transition-all duration-base ease-standard font-medium text-text-primary placeholder:text-text-muted"
                    />
                    <p className="text-xs text-text-muted mt-2">Adjust the final amount if needed before generating the invoice. GST is added on top.</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 space-y-2 border border-border-subtle">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Subtotal</span>
                      <span className="font-medium text-text-primary">{formatINR(numericAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">GST (18%)</span>
                      <span className="font-medium text-text-primary">{formatINR(gstAmount)}</span>
                    </div>
                    <div className="pt-3 mt-1 border-t border-border-subtle flex justify-between">
                      <span className="font-semibold text-text-primary">Total Invoice Value</span>
                      <span className="font-bold text-accent text-lg font-mono">{formatINR(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || numericAmount <= 0}
                  className="w-full bg-gradient-accent hover:bg-none hover:bg-accent-hover text-bg-base font-medium py-3.5 rounded-xl transition-all duration-base ease-standard flex justify-center items-center gap-2 shadow-accent cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  Confirm & Generate PDF
                </button>
              </form>
            </div>
          )}

          {['INVOICED', 'OVERDUE', 'PAID'].includes(milestone.status) && invoice && (
            <div className="bg-success-subtle border border-success/20 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="font-bold mb-1 flex items-center gap-2 text-lg text-text-primary">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Invoice Generated
                </h3>
                <p className="text-sm text-text-secondary mt-1">Invoice {invoice.invoice_number} • {formatINR(invoice.total_amount)}</p>
              </div>
              <Link 
                href={`/invoices/${invoice._id}`}
                className="bg-success hover:bg-success/90 text-white font-medium px-6 py-3 rounded-xl transition-colors shrink-0 shadow-md"
              >
                View Invoice
              </Link>
            </div>
          )}
          
          {milestone.status === 'PENDING' && (
            <div className="text-center p-8 bg-bg-elevated rounded-2xl border border-border-subtle">
              <CheckCircle2 className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="font-medium text-text-primary">This milestone is currently pending.</p>
              {milestone.trigger_type === 'event_based' && (
                <p className="text-sm text-text-muted mt-2">Mark it as triggered from the contract details page when the deliverable is met.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
