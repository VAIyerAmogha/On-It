'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Button from '../../../../components/Button';
import { Card, CardBody } from '../../../../components/Card';
import { useToast } from '../../../../context/ToastContext';

export default function ContractPDFPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { showToast } = useToast();
  
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
        showToast('Failed to load contract PDF', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPdf();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [id, token, showToast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-text-secondary text-sm font-semibold">Loading contract view...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] max-w-4xl mx-auto">
        <Card variant="default" className="p-12 text-center w-full">
          <CardBody className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-text-primary">{error || 'PDF not available'}</h2>
            <Link href={`/contracts/${id}`}>
              <Button variant="primary" className="flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back to Contract
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] max-w-5xl mx-auto space-y-4">
      <div>
        <Link href={`/contracts/${id}`}>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to Contract
          </Button>
        </Link>
      </div>
      
      <div className="border border-border-default rounded-md overflow-hidden flex-1 bg-bg-surface">
        <iframe src={pdfUrl} className="w-full h-full border-none" title="Contract PDF" />
      </div>
    </div>
  );
}
