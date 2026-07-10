'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import MilestoneCard, { Milestone } from '../../../components/MilestoneCard';
import ContractQA from '../../../components/ContractQA';
import { ArrowLeft, Building2, Calendar, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Contract {
  _id: string;
  project_name: string | null;
  client_name: string | null;
  contract_type: string | null;
  project_value: number | null;
  currency: string | null;
  contract_date: string | null;
  extraction_status: string;
}

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isQAOpen, setIsQAOpen] = useState(false);

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

  const handleTrigger = async (milestoneId: string) => {
    await apiFetch(`/api/milestones/${milestoneId}/trigger`, { method: 'PATCH' });
    await fetchContractData();
  };

  const handleInvoice = async (milestoneId: string) => {
    await apiFetch(`/api/milestones/${milestoneId}/invoice`, { method: 'POST' });
    await fetchContractData();
  };

  const handlePaid = async (milestoneId: string) => {
    await apiFetch(`/api/milestones/${milestoneId}/paid`, { method: 'PATCH' });
    await fetchContractData();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8 max-w-5xl mx-auto">
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
        <div className="glass-surface p-8 rounded-3xl h-32 flex justify-between items-center">
          <div className="space-y-4">
            <div className="w-64 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-96 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="w-24 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
             <div key={i} className="glass-surface p-6 rounded-2xl h-48 bg-gray-200/50 dark:bg-gray-700/50"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="glass-surface p-8 rounded-3xl text-center">
          <h2 className="text-xl font-bold mb-4">{error || 'Contract not found'}</h2>
          <Link href="/" className="text-accent-600 dark:text-accent-400 hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Dashboard
      </Link>

      <div className="glass-surface p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-3">{contract.project_name || 'Untitled Project'}</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium"><Building2 className="w-4 h-4" /> {contract.client_name || 'Unknown Client'}</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {contract.contract_type?.replace('_', ' ') || 'Unclassified'}</span>
            {contract.contract_date && (
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {contract.contract_date}</span>
            )}
          </div>
        </div>
        <div className="md:text-right bg-black/5 dark:bg-white/5 p-4 rounded-2xl w-full md:w-auto flex flex-col md:items-end gap-3">
          <div className="text-left md:text-right w-full">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">Total Project Value</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {contract.project_value ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(contract.project_value) : 'TBD'}
            </p>
          </div>
          <button 
            onClick={() => setIsQAOpen(true)}
            className="flex justify-center items-center gap-2 bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors w-full md:w-auto mt-2 md:mt-0"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Contract AI
          </button>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-bold mb-6">Payment Milestones</h2>
        {milestones.length === 0 ? (
          <div className="glass-surface p-12 text-center text-gray-500 rounded-3xl flex flex-col items-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4 opacity-50" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No milestones extracted</p>
            <p className="text-sm mt-2 max-w-sm">This contract has no extracted payment milestones, or it's still processing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {milestones.sort((a,b) => a.milestone_number - b.milestone_number).map((milestone) => (
              <MilestoneCard 
                key={milestone._id} 
                milestone={milestone}
                onTrigger={handleTrigger}
                onInvoice={handleInvoice}
                onPaid={handlePaid}
              />
            ))}
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
