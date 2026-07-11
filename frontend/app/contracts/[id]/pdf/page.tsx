'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ContractPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    
    let objectUrl: string | null = null;
    
    const fetchPdf = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/contracts/${id}/pdf`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Contract file not found');
        }
        
        const blob = await response.blob();
        objectUrl = window.URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      } catch (err: any) {
        setError(err.message || 'Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPdf();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
        <p className="text-gray-500 font-medium">Loading contract view...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-4xl mx-auto">
        <div className="glass-surface p-12 rounded-3xl text-center w-full">
          <h2 className="text-xl font-bold mb-4">{error || 'PDF not available'}</h2>
          <Link href={`/contracts/${id}`} className="text-accent-500 font-medium hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Contract
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href={`/contracts/${id}`} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Contract
        </Link>
      </div>
      
      <div className="glass-surface rounded-3xl overflow-hidden flex-1 border border-gray-200 dark:border-gray-800">
        <iframe src={pdfUrl} className="w-full h-full" title="Contract PDF" />
      </div>
    </div>
  );
}
