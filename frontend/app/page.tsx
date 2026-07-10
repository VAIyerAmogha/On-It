'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { FileText, Plus, FileSearch } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

interface Contract {
  _id: string;
  project_name: string | null;
  client_name: string | null;
  contract_type: string | null;
  extraction_status: string;
  created_at: string;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchContracts = async () => {
      try {
        const data = await apiFetch('/api/contracts');
        setContracts(data);
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-surface p-6 rounded-2xl animate-pulse h-48 flex flex-col justify-between">
              <div>
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="flex justify-between items-end">
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="glass-surface p-12 rounded-3xl max-w-lg w-full flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-accent-500/10 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-accent-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No contracts yet</h2>
          <p className="text-gray-500 mb-8 max-w-sm">
            Upload your first freelance contract to automatically extract milestones and generate invoices.
          </p>
          <Link 
            href="/contracts/upload"
            className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Upload Contract
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Link 
          href="/contracts/upload"
          className="bg-accent-500 hover:bg-accent-600 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts.map((contract) => (
          <div 
            key={contract._id}
            onClick={() => router.push(`/contracts/${contract._id}`)}
            className="glass-surface p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-transform duration-200 group flex flex-col h-full"
          >
            <div className="flex-1 mb-4">
              <h3 className="text-lg font-semibold group-hover:text-accent-500 transition-colors line-clamp-1">
                {contract.project_name || 'Untitled Project'}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                {contract.client_name || 'Unknown Client'}
              </p>
            </div>
            
            <div className="mt-auto flex flex-col gap-4">
              <div className="flex items-center justify-between">
                {contract.contract_type ? (
                  <span className="px-3 py-1 bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-medium rounded-full capitalize">
                    {contract.contract_type.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-500/10 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
                    Unclassified
                  </span>
                )}
                
                <span className={`text-xs font-medium flex items-center gap-1 ${
                  contract.extraction_status === 'processing' ? 'text-amber-500' :
                  contract.extraction_status === 'failed' ? 'text-red-500' :
                  contract.extraction_status === 'review_required' ? 'text-purple-500' :
                  'text-emerald-500'
                }`}>
                  {contract.extraction_status === 'processing' && <FileSearch className="w-3 h-3 animate-pulse" />}
                  {contract.extraction_status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="bg-accent-500 h-full rounded-full w-1/3 opacity-50"></div>
              </div>
              <p className="text-xs text-gray-500 text-right">
                {/* Mocked milestone progress as requested */}
                2 of 5 paid
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
