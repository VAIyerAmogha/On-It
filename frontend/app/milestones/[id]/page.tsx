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
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
        <div className="glass-surface p-8 rounded-3xl h-64 bg-gray-200/50 dark:bg-gray-700/50"></div>
      </div>
    );
  }

  if (error || !milestone) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-3xl mx-auto">
        <div className="glass-surface p-12 rounded-3xl text-center w-full">
          <h2 className="text-xl font-bold mb-4">{error || 'Milestone not found'}</h2>
          <Link href="/dashboard" className="text-accent-500 font-medium hover:underline flex items-center justify-center gap-2">
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
      <Link href={contract ? `/contracts/${contract._id}` : '/dashboard'} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Contract
      </Link>

      <div className="glass-surface p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1 block">Milestone {milestone.milestone_number}</span>
            <h1 className="text-2xl font-bold">{milestone.deliverable_description || 'Unnamed Milestone'}</h1>
            {contract && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{contract.project_name || 'Untitled'}</span>
                <span>•</span>
                <span>{contract.client_name || 'Unknown Client'}</span>
              </div>
            )}
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize shrink-0 ${
            milestone.status === 'TRIGGERED' ? 'bg-accent-500/10 text-accent-600' :
            milestone.status === 'INVOICED' ? 'bg-blue-500/10 text-blue-600' :
            milestone.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' :
            milestone.status === 'OVERDUE' ? 'bg-amber-500/10 text-amber-600' :
            'bg-gray-500/10 text-gray-600'
          }`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-gray-200/50 dark:border-gray-800/50">
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Trigger Type</p>
            <p className="font-medium capitalize">{milestone.trigger_type.replace('_', ' ')}</p>
          </div>
          {milestone.trigger_date && (
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">Trigger Date</p>
              <p className="font-medium">{milestone.trigger_date}</p>
            </div>
          )}
          {milestone.trigger_condition && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase mb-1">Condition</p>
              <p className="font-medium text-sm line-clamp-2">{milestone.trigger_condition}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Percentage</p>
            <p className="font-medium">{milestone.percentage ? `${milestone.percentage}%` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase mb-1">Base Amount</p>
            <p className="font-medium">{milestone.amount_inr ? formatINR(milestone.amount_inr) : 'TBD'}</p>
          </div>
        </div>

        <div className="mt-8">
          {milestone.status === 'TRIGGERED' && (
            <div className="bg-accent-500/5 border border-accent-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent-500" />
                Generate Invoice
              </h3>
              
              <form onSubmit={handleGenerateInvoice} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Base Amount (INR)</label>
                    <input 
                      type="number" 
                      value={editedAmount}
                      onChange={(e) => setEditedAmount(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors font-medium"
                    />
                    <p className="text-xs text-gray-500 mt-2">Adjust the final amount if needed before generating the invoice. GST is added on top.</p>
                  </div>
                  
                  <div className="bg-white/50 dark:bg-black/50 rounded-xl p-4 space-y-2 border border-gray-200/50 dark:border-gray-800/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">{formatINR(numericAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST (18%)</span>
                      <span className="font-medium">{formatINR(gstAmount)}</span>
                    </div>
                    <div className="pt-3 mt-1 border-t border-gray-200/50 dark:border-gray-800/50 flex justify-between">
                      <span className="font-semibold">Total Invoice Value</span>
                      <span className="font-bold text-accent-600 dark:text-accent-400 text-lg">{formatINR(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || numericAmount <= 0}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-3.5 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-accent-500/20"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  Confirm & Generate PDF
                </button>
              </form>
            </div>
          )}

          {['INVOICED', 'OVERDUE', 'PAID'].includes(milestone.status) && invoice && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="font-bold mb-1 flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Invoice Generated
                </h3>
                <p className="text-sm text-gray-500 mt-1">Invoice {invoice.invoice_number} • {formatINR(invoice.total_amount)}</p>
              </div>
              <Link 
                href={`/invoices/${invoice._id}`}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl transition-colors shrink-0 shadow-lg shadow-emerald-500/20"
              >
                View Invoice
              </Link>
            </div>
          )}
          
          {milestone.status === 'PENDING' && (
            <div className="text-center p-8 bg-black/5 dark:bg-white/5 rounded-2xl border border-gray-200/50 dark:border-gray-800/50">
              <CheckCircle2 className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-700 dark:text-gray-300">This milestone is currently pending.</p>
              {milestone.trigger_type === 'event_based' && (
                <p className="text-sm text-gray-500 mt-2">Mark it as triggered from the contract details page when the deliverable is met.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
