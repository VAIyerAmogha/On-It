'use client';

import { useEffect, useState, use } from 'react';
import { apiFetch } from '../../../lib/api';
import MilestoneCard, { Milestone } from '../../../components/MilestoneCard';
import ContractQA from '../../../components/ContractQA';
import { ArrowLeft, Building2, Calendar, FileText, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Button from '../../../components/Button';
import { Card, CardBody } from '../../../components/Card';
import Skeleton from '../../../components/Skeleton';
import EmptyState from '../../../components/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

interface Contract {
  _id: string;
  project_name: string | null;
  client_name: string | null;
  contract_type: string | null;
  project_value: number | null;
  contract_date: string | null;
  extraction_status: string;
  extraction_error?: string | null;
  title?: string | null;
  client_contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  summary?: string | null;
}

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQAOpen, setIsQAOpen] = useState(false);

  // PDF Viewer states
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPDFLoading, setIsPDFLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const fetchContractData = async () => {
    try {
      const data = await apiFetch(`/api/contracts/${id}`);
      setContract(data.contract);
      setMilestones(data.milestones);
    } catch (err: any) {
      console.error('Failed to fetch contract:', err);
      setError('Contract not found or permission denied');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContractData();
  }, [id]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (contract?.extraction_status === 'processing') {
      timeout = setTimeout(() => {
        fetchContractData();
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [contract?.extraction_status, id]);

  // Load PDF when collapsible section opens
  useEffect(() => {
    if (!isPDFOpen || pdfUrl || !token) return;

    let objectUrl: string | null = null;
    setIsPDFLoading(true);
    setPdfError('');

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
        setPdfError(err.message || 'Failed to load PDF');
        showToast('Failed to load contract PDF', 'error');
      } finally {
        setIsPDFLoading(false);
      }
    };
    
    fetchPdf();

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [isPDFOpen, id, token, pdfUrl, showToast]);

  const handleTrigger = async (milestoneId: string) => {
    await apiFetch(`/api/milestones/${milestoneId}/trigger`, { method: 'PATCH' });
    showToast('Milestone status marked as Triggered', 'success');
    await fetchContractData();
  };

  const handleInvoice = async (milestoneId: string) => {
    try {
      await apiFetch(`/api/milestones/${milestoneId}/invoice`, { method: 'POST' });
      showToast('Invoice generated successfully', 'success');
    } catch (e: any) {
      console.error('Invoice generation had an error:', e);
      showToast(e.message || 'Invoice generation failed', 'error');
    } finally {
      await fetchContractData();
    }
  };

  const handlePaid = async (milestoneId: string) => {
    await apiFetch(`/api/milestones/${milestoneId}/paid`, { method: 'PATCH' });
    showToast('Milestone status marked as Paid', 'success');
    await fetchContractData();
  };

  const handleMissedDeadline = async (milestoneId: string, discountPercentage: number) => {
    try {
      await apiFetch(`/api/milestones/${milestoneId}/invoice-missed-deadline`, {
        method: 'POST',
        body: JSON.stringify({ discount_percentage: discountPercentage })
      });
      showToast('Missed deadline invoice generated successfully', 'success');
    } catch (e: any) {
      console.error('Missed deadline invoice generation failed:', e);
      showToast(e.message || 'Invoice generation failed', 'error');
      throw e;
    } finally {
      await fetchContractData();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton variant="rect" className="h-6 w-24" />
        <Card variant="default" className="h-44 flex flex-col justify-between p-6">
          <CardBody className="space-y-4">
            <Skeleton variant="text" className="h-8 w-1/3" />
            <Skeleton variant="text" className="h-4 w-2/3" />
          </CardBody>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
             <Card key={i} className="h-48">
               <CardBody>
                 <Skeleton variant="rect" className="h-full w-full" />
               </CardBody>
             </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <Card variant="default" className="p-8 text-center max-w-sm">
          <CardBody>
            <h2 className="text-xl font-bold mb-4 text-text-primary">{error || 'Contract not found'}</h2>
            <Link href="/dashboard">
              <Button variant="primary">Return to Dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (contract.extraction_status === 'failed') {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <Card variant="default" className="p-8 text-center max-w-lg border-danger/20">
          <CardBody>
            <h2 className="text-xl font-bold mb-4 text-danger">Extraction Failed</h2>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              {contract.extraction_error || 'An unknown error occurred during processing. Please ensure this is a valid contract document.'}
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/contracts/upload">
                <Button variant="primary">Upload Again</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <Link href="/dashboard" className="inline-flex items-center text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={2} />
        Dashboard
      </Link>

      <Card variant="default">
        <CardBody className="p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3.5 flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight truncate">
              {contract.title || contract.project_name || 'Untitled Project'}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-text-secondary">
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> {contract.client_contact?.name || contract.client_name || 'Unknown Client'}</span>
              {contract.client_contact?.email && <span className="text-text-muted">{contract.client_contact.email}</span>}
              {contract.client_contact?.phone && <span className="text-text-muted">{contract.client_contact.phone}</span>}
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> {contract.contract_type?.replace('_', ' ') || 'Unclassified'}</span>
              {contract.contract_date && (
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-text-muted" strokeWidth={1.5} /> {contract.contract_date}</span>
              )}
            </div>

            {contract.summary && (
              <p className="text-sm text-text-secondary max-w-3xl leading-relaxed mt-2 pt-2 border-t border-border-subtle/30">
                {contract.summary}
              </p>
            )}
          </div>

          <div className="bg-bg-elevated/50 border border-border-subtle p-5 rounded-md w-full lg:w-auto flex flex-col items-start lg:items-end gap-4 shrink-0">
            <div className="text-left lg:text-right w-full">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-0.5">Total Project Value</p>
              <p className="text-2xl font-bold text-text-primary font-mono">
                {contract.project_value ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(contract.project_value) : 'TBD'}
              </p>
            </div>
            
            <div className="flex gap-2 w-full lg:w-auto">
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setIsQAOpen(true)}
                className="flex items-center justify-center gap-1.5 w-full lg:w-auto"
              >
                <MessageSquare className="w-4 h-4 text-accent" strokeWidth={1.5} />
                Ask AI
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment Milestones */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Payment Milestones</h2>
        {milestones.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No milestones extracted"
            description="This contract has no extracted payment milestones, or the processing engine is still running."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {milestones.sort((a,b) => a.milestone_number - b.milestone_number).map((milestone) => (
              <MilestoneCard 
                key={milestone._id} 
                milestone={milestone}
                onTrigger={handleTrigger}
                onInvoice={handleInvoice}
                onMissedDeadline={handleMissedDeadline}
                onPaid={handlePaid}
              />
            ))}
          </div>
        )}
      </div>

      {/* Collapsible PDF Section */}
      <div className="pt-6 border-t border-border-subtle">
        <Button
          variant="secondary"
          className="w-full flex items-center justify-between py-4"
          onClick={() => setIsPDFOpen(!isPDFOpen)}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" strokeWidth={1.5} />
            <span className="font-semibold text-text-primary text-sm">View Original Contract</span>
          </span>
          <span className="text-xs text-text-muted font-mono">{isPDFOpen ? '[ COLLAPSE ]' : '[ EXPAND ]'}</span>
        </Button>

        {isPDFOpen && (
          <div className="mt-4 border border-border-default rounded-md overflow-hidden bg-bg-surface h-[70vh] animate-in slide-in-from-top-4 duration-base">
            {isPDFLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-text-secondary text-sm font-semibold">Loading contract PDF...</p>
              </div>
            ) : pdfError || !pdfUrl ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm font-medium">
                {pdfError || 'Original PDF document not available'}
              </div>
            ) : (
              <iframe src={pdfUrl} className="w-full h-full border-none" title="Contract PDF" />
            )}
          </div>
        )}
      </div>

      <ContractQA 
        contractId={id} 
        isOpen={isQAOpen} 
        onClose={() => setIsQAOpen(false)} 
      />
    </div>
  );
}
