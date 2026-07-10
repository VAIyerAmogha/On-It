'use client';

import { useEffect, useState, use } from 'react';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Download, FileText, Loader2, Calendar, IndianRupee } from 'lucide-react';
import Link from 'next/link';

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
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);

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
      <Link href={`/milestones/${invoice.milestone_id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Milestone
      </Link>
      
      <div className="glass-surface p-12 rounded-3xl flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 text-emerald-500">
          <FileText className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Invoice {invoice.invoice_number}</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          This invoice has been successfully generated and sent to the client.
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
        
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-8 py-4 rounded-xl transition-colors flex justify-center items-center gap-3 shadow-lg shadow-accent-500/25 min-w-[240px]"
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
      </div>
    </div>
  );
}
