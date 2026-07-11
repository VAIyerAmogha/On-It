'use client';

import { useEffect, useState, use } from 'react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Download, FileText, Loader2, Calendar, IndianRupee, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import InvoicePreview from '../../../components/InvoicePreview';

interface Invoice {
  _id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount_before_gst: number;
  gst_amount: number;
  total_amount: number;
  milestone_id: string;
  contract_id: string;
  sent_at?: string;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{to: string, from: string, subject: string, body: string} | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleOpenEmailModal = async () => {
    setSendError('');
    setSendSuccess(false);
    setIsEmailModalOpen(true);
    setIsPreviewLoading(true);
    try {
      const preview = await apiFetch(`/api/invoices/${id}/email-preview`);
      setEmailPreview(preview);
      setEmailSubject(preview.subject);
      setEmailBody(preview.body);
    } catch (err: any) {
      setSendError(err.message || 'Failed to load email preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendError('');
    setIsSending(true);
    try {
      const res = await apiFetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({ subject: emailSubject, body: emailBody })
      });
      setInvoice(prev => prev ? { ...prev, sent_at: res.sent_at } : null);
      setIsEmailModalOpen(false);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (err: any) {
      setSendError(err.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    const fetchInvoice = async () => {
      try {
        const data = await apiFetch(`/api/invoices/${id}`);
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || 'Invoice not found');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvoice();
  }, [id, token]);

  const handleDownload = async () => {
    if (!token) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/invoices/${id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || 'Failed to download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="glass-surface p-12 rounded-3xl h-[60vh] flex flex-col justify-center items-center gap-6">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-4xl mx-auto">
        <div className="glass-surface p-12 rounded-3xl text-center w-full">
          <h2 className="text-xl font-bold mb-4">{error || 'Invoice not found'}</h2>
          <Link href="/dashboard" className="text-accent-500 font-medium hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Link href={`/contracts/${invoice.contract_id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Contract
      </Link>
      
      <div className="glass-surface p-12 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-emerald-500">
          <FileText className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Invoice {invoice.invoice_number}</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          This invoice has been successfully generated. You can download the PDF or send it to your client directly.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl mb-10">
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
            <Calendar className="w-5 h-5 text-gray-400 mb-2 mx-auto" />
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Invoice Date</p>
            <p className="font-medium">{invoice.invoice_date}</p>
          </div>
          <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
            <Calendar className="w-5 h-5 text-gray-400 mb-2 mx-auto" />
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Due Date</p>
            <p className="font-medium">{invoice.due_date}</p>
          </div>
          <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-700 dark:text-emerald-400">
            <IndianRupee className="w-5 h-5 mb-2 mx-auto" />
            <p className="text-xs uppercase font-semibold mb-1">Total Amount</p>
            <p className="font-bold text-lg">{formatINR(invoice.total_amount)}</p>
          </div>
        </div>
        
        <div className="w-full max-w-4xl mb-10">
          <InvoicePreview invoiceId={id as string} token={token} />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-medium px-8 py-4 rounded-xl transition-colors flex justify-center items-center gap-3 w-full sm:w-auto"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Preparing PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
          
          <div className="flex flex-col items-center">
            <button
              onClick={handleOpenEmailModal}
              className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-8 py-4 rounded-xl transition-colors flex justify-center items-center gap-3 shadow-lg shadow-accent-500/25 w-full sm:w-auto"
            >
              <Send className="w-5 h-5" />
              {invoice.sent_at ? 'Resend Invoice to Client' : 'Send Invoice to Client'}
            </button>
            {invoice.sent_at && (
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Last sent on {new Date(invoice.sent_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="glass-surface w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6">
              {invoice.sent_at ? 'Resend Invoice' : 'Send Invoice to Client'}
            </h3>
            
            {isPreviewLoading ? (
              <div className="py-12 flex flex-col justify-center items-center text-gray-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-2" />
                <span>Preparing email preview...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To (Client)</label>
                    <div className="bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg text-sm truncate opacity-80 cursor-not-allowed">
                      {emailPreview?.to || 'Loading...'}
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From (System)</label>
                    <div className="bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg text-sm truncate opacity-80 cursor-not-allowed">
                      {emailPreview?.from || 'Loading...'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent-500/50 rounded-lg px-4 py-2 outline-none transition-colors font-medium"
                    placeholder="Email Subject"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={6}
                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent-500/50 rounded-lg px-4 py-3 outline-none transition-colors resize-none leading-relaxed"
                    placeholder="Type your message here..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    The PDF invoice will be automatically attached to this email.
                  </p>
                </div>

                {sendError && (
                  <div className="p-3 mt-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
                    <div className="mt-0.5 font-bold">!</div>
                    <div>{sendError}</div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    disabled={isSending}
                    className="px-6 py-2 rounded-xl font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
                    className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {sendSuccess && (
        <div className="fixed bottom-6 right-6 glass-surface bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 shadow-xl z-50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Invoice sent successfully to the client.</span>
        </div>
      )}
    </div>
  );
}
