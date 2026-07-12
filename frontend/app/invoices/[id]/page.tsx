'use client';

import { useEffect, useState, use } from 'react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Download, FileText, Loader2, Calendar, IndianRupee, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import InvoicePreview from '../../../components/InvoicePreview';
import Button from '../../../components/Button';
import { Card, CardBody } from '../../../components/Card';
import Modal from '../../../components/Modal';
import { Input, Textarea } from '../../../components/Input';
import Skeleton from '../../../components/Skeleton';
import { useToast } from '../../../context/ToastContext';

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
  delivery_missed?: boolean;
  discount_percentage?: number;
  discount_amount?: number;
  original_amount_inr?: number;
  gst_rate?: number;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { showToast } = useToast();
  
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

  const handleOpenEmailModal = async () => {
    setSendError('');
    setIsEmailModalOpen(true);
    setIsPreviewLoading(true);
    try {
      const preview = await apiFetch(`/api/invoices/${id}/email-preview`);
      setEmailPreview(preview);
      setEmailSubject(preview.subject);
      setEmailBody(preview.body);
    } catch (err: any) {
      setSendError(err.message || 'Failed to load email preview');
      showToast('Failed to load email preview', 'error');
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
      showToast('Invoice sent successfully to client', 'success');
    } catch (err: any) {
      setSendError(err.message || 'Failed to send email');
      showToast(err.message || 'Failed to send email', 'error');
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
      showToast('Invoice PDF downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to download invoice', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton variant="rect" className="h-6 w-32" />
        <Card variant="default" className="h-96 flex flex-col justify-center items-center">
          <CardBody className="space-y-4 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <Skeleton variant="text" className="h-6 w-48" />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-4xl mx-auto">
        <Card variant="default" className="p-12 text-center w-full">
          <CardBody className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-text-primary">{error || 'Invoice not found'}</h2>
            <Link href="/dashboard">
              <Button variant="primary" className="flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Link href={`/contracts/${invoice.contract_id}`} className="inline-flex items-center text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={2} />
        Back to Contract
      </Link>
      
      <Card variant="default" className="p-8">
        <CardBody className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-success/15 border border-success/30 rounded-md flex items-center justify-center mb-6 text-success">
            <FileText className="w-8 h-8" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl font-bold mb-2 text-text-primary">Invoice {invoice.invoice_number}</h1>
          <p className="text-text-secondary text-sm mb-8 max-w-md">
            This invoice has been successfully generated. You can download the PDF or send it to your client directly.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10">
            <div className="bg-bg-elevated/50 border border-border-subtle p-4 rounded-md">
              <Calendar className="w-5 h-5 text-text-muted mb-2 mx-auto" strokeWidth={1.5} />
              <p className="text-[10px] text-text-muted uppercase font-semibold mb-0.5">Invoice Date</p>
              <p className="font-semibold text-sm text-text-primary">{invoice.invoice_date}</p>
            </div>
            <div className="bg-bg-elevated/50 border border-border-subtle p-4 rounded-md">
              <Calendar className="w-5 h-5 text-text-muted mb-2 mx-auto" strokeWidth={1.5} />
              <p className="text-[10px] text-text-muted uppercase font-semibold mb-0.5">Due Date</p>
              <p className="font-semibold text-sm text-text-primary">{invoice.due_date}</p>
            </div>
            <div className="bg-success/15 border border-success/30 p-4 rounded-md text-success flex flex-col justify-center items-center">
              <IndianRupee className="w-5 h-5 mb-2 mx-auto" strokeWidth={1.5} />
              <p className="text-[10px] text-center uppercase font-semibold mb-0.5">Total Amount</p>
              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-2 justify-center">
                  {invoice.delivery_missed && invoice.original_amount_inr !== undefined && (
                    <span className="text-xs line-through opacity-60 font-semibold font-mono">
                      {formatINR(invoice.original_amount_inr * (1 + (invoice.gst_rate ?? 0.18)))}
                    </span>
                  )}
                  <span className="font-bold font-mono text-base">{formatINR(invoice.total_amount)}</span>
                </div>
                {invoice.delivery_missed && (
                  <span className="text-[9px] mt-1 px-1.5 py-0.5 bg-accent-subtle text-accent rounded-full font-semibold">
                    Discount ({invoice.discount_percentage}%)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full max-w-4xl border border-border-subtle rounded-md overflow-hidden bg-bg-base/30 p-4 mb-10">
            <InvoicePreview invoiceId={id as string} token={token} />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="secondary"
              className="flex justify-center items-center gap-2 w-full sm:w-auto min-w-[160px]"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" strokeWidth={1.5} />
                  Download PDF
                </>
              )}
            </Button>
            
            <div className="flex flex-col items-center w-full sm:w-auto">
              <Button
                onClick={handleOpenEmailModal}
                variant="primary"
                className="flex justify-center items-center gap-2 w-full sm:w-auto min-w-[180px]"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
                {invoice.sent_at ? 'Resend to Client' : 'Send to Client'}
              </Button>
              {invoice.sent_at && (
                <p className="text-[10px] text-text-muted mt-2 font-medium">
                  Last sent on {new Date(invoice.sent_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Reusable Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={invoice.sent_at ? 'Resend Invoice' : 'Send Invoice to Client'}
        footerActions={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsEmailModalOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
              variant="primary"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                  Send Email
                </>
              )}
            </Button>
          </>
        }
      >
        {isPreviewLoading ? (
          <div className="py-12 flex flex-col justify-center items-center text-text-secondary gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs font-semibold">Preparing email preview...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-semibold text-text-muted uppercase mb-1">To (Client)</label>
                <div className="bg-bg-elevated border border-border-subtle/50 px-3.5 py-2 rounded-md text-xs truncate opacity-70 cursor-not-allowed">
                  {emailPreview?.to || 'Loading...'}
                </div>
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-semibold text-text-muted uppercase mb-1">From (System)</label>
                <div className="bg-bg-elevated border border-border-subtle/50 px-3.5 py-2 rounded-md text-xs truncate opacity-70 cursor-not-allowed">
                  {emailPreview?.from || 'Loading...'}
                </div>
              </div>
            </div>
            
            <Input
              label="Subject"
              type="text"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Email Subject"
            />
            
            <Textarea
              label="Message"
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              rows={6}
              placeholder="Type your message here..."
            />
            
            <p className="text-[10px] text-text-muted mt-2 font-medium">
              The PDF invoice will be automatically attached to this email.
            </p>

            {sendError && (
              <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger text-xs rounded-md font-medium">
                {sendError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
