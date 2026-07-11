'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface InvoicePreviewProps {
  invoiceId: string;
  token: string | null;
}

export default function InvoicePreview({ invoiceId, token }: InvoicePreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/invoices/${invoiceId}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to load PDF preview');
        }
        
        const blob = await response.blob();
        setPdfBlob(blob);
      } catch (err: any) {
        setError(err.message || 'Error loading PDF preview');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId && token) {
      fetchPdf();
    }
  }, [invoiceId, token]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black/5 dark:bg-white/5 rounded-2xl h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500 mb-4" />
        <p className="text-gray-500 font-medium">Loading preview...</p>
      </div>
    );
  }

  if (error || !pdfBlob) {
    return (
      <div className="flex items-center justify-center p-12 bg-black/5 dark:bg-white/5 rounded-2xl h-[500px]">
        <p className="text-red-500 font-medium">{error || 'Preview unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-full overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="overflow-auto w-full max-h-[800px] flex justify-center p-4">
        <Document
          file={pdfBlob}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
            </div>
          }
          error={<div className="p-12 text-red-500">Failed to load PDF preview</div>}
          className="max-w-full"
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-lg" 
            width={Math.min(window.innerWidth - 64, 800)} 
          />
        </Document>
      </div>
      
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-4 p-4 border-t border-gray-200 dark:border-gray-700 w-full justify-center bg-white dark:bg-gray-900">
          <button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <p className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </p>
          <button 
            disabled={pageNumber >= numPages} 
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
