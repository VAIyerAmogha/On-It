'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileWarning,
  ArrowRight,
  Building2,
  FileSearch,
  ListTodo
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Card, CardBody } from '../../components/Card';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

interface Contract {
  _id: string;
  title?: string | null;
  project_name: string | null;
  client_name: string | null;
  client_contact?: { name?: string | null } | null;
  contract_type: string | null;
  extraction_status: string;
  created_at: string;
  total_milestones?: number;
  paid_milestones?: number;
}

interface Milestone {
  _id: string;
  contract_id: string;
  contract_title: string;
  client_name: string;
  milestone_number: number;
  trigger_type: string;
  trigger_condition: string | null;
  trigger_date: string | null;
  percentage: number;
  amount_inr: number;
  deliverable_description: string | null;
  status: 'PENDING' | 'TRIGGERED' | 'INVOICED' | 'PAID' | 'OVERDUE';
  invoice_id?: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'list'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modal states for contract deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();

  const fetchContracts = async () => {
    try {
      const data = await apiFetch('/api/contracts');
      setContracts(data);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      showToast('Failed to fetch contracts', 'error');
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const data = await apiFetch('/api/milestones/all/list');
      setMilestones(data);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setIsLoadingMilestones(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchContracts();
    fetchMilestones();
  }, [token]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const contract = contracts.find(c => c._id === id);
    if (contract) {
      setContractToDelete(contract);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setContractToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/contracts/${contractToDelete._id}`, {
        method: 'DELETE',
      });
      setContracts(contracts.filter(c => c._id !== contractToDelete._id));
      setMilestones(milestones.filter(m => m.contract_id !== contractToDelete._id));
      showToast('Contract deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      setContractToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete contract:', error);
      showToast(error.message || 'Failed to delete contract', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to format currency
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper to format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // Sorting milestones chronologically
  // Sort priority:
  // 1. OVERDUE first
  // 2. TRIGGERED / INVOICED by date/deadline (earliest first)
  // 3. PENDING milestones by date/deadline
  // 4. PAID milestones (latest first)
  const getSortedMilestones = () => {
    return [...milestones].sort((a, b) => {
      const statusPriority = {
        'OVERDUE': 0,
        'TRIGGERED': 1,
        'INVOICED': 2,
        'PENDING': 3,
        'PAID': 4
      };
      
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      
      // Secondary sorting: dates
      const dateA = a.trigger_date ? new Date(a.trigger_date).getTime() : Infinity;
      const dateB = b.trigger_date ? new Date(b.trigger_date).getTime() : Infinity;
      
      if (a.status === 'PAID') {
        // For paid milestones, show the most recent first
        return dateB - dateA;
      }
      
      return dateA - dateB;
    });
  };

  // Filters contracts
  const filteredContracts = contracts.filter(c => {
    const title = (c.title || c.project_name || 'Untitled').toLowerCase();
    const client = (c.client_contact?.name || c.client_name || 'Unknown').toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase()) || client.includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PAID') return matchesSearch && c.paid_milestones === c.total_milestones && (c.total_milestones || 0) > 0;
    if (statusFilter === 'ACTIVE') return matchesSearch && (c.paid_milestones || 0) < (c.total_milestones || 0);
    if (statusFilter === 'PROCESSING') return matchesSearch && c.extraction_status === 'processing';
    return matchesSearch;
  });

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'OVERDUE':
        return <AlertCircle className="w-5 h-5 text-danger animate-pulse" />;
      case 'INVOICED':
        return <FileWarning className="w-5 h-5 text-info" />;
      case 'TRIGGERED':
        return <Clock className="w-5 h-5 text-warning" />;
      default:
        return <Calendar className="w-5 h-5 text-text-muted" />;
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'border-success bg-success/5 text-success';
      case 'OVERDUE': return 'border-danger bg-danger/5 text-danger';
      case 'INVOICED': return 'border-info bg-info/5 text-info';
      case 'TRIGGERED': return 'border-warning bg-warning/5 text-warning';
      default: return 'border-border-default bg-bg-elevated/40 text-text-secondary';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Contracts & Milestones</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your contracts and track milestone delivery schedules.</p>
        </div>
        <Link href="/contracts/upload">
          <Button variant="primary" size="md" className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle gap-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Timeline View
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'list'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          All Contracts ({contracts.length})
        </button>
      </div>

      {/* Timeline View Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {isLoadingMilestones ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="h-5 w-1/3" />
                      <Skeleton variant="text" className="h-4 w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : milestones.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No milestones trackable"
              description="No milestone schedules found. Upload a contract to begin tracking milestones on a timeline."
              actionLabel="Upload Contract"
              onAction={() => router.push('/contracts/upload')}
            />
          ) : (
            <div className="relative pl-6 sm:pl-8 border-l border-border-subtle/80 space-y-8 py-2 ml-3">
              {getSortedMilestones().map((milestone, idx) => {
                const dateText = milestone.trigger_date 
                  ? formatDate(milestone.trigger_date)
                  : milestone.trigger_condition || 'No deadline';
                  
                return (
                  <div key={milestone._id} className="relative group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                    {/* Circle Node on the line */}
                    <div className="absolute -left-[35px] sm:-left-[41px] top-1.5 flex items-center justify-center bg-bg-base p-1.5 rounded-full z-10 transition-transform group-hover:scale-110">
                      <div className={`p-1 border rounded-full ${getMilestoneStatusColor(milestone.status)}`}>
                        {getMilestoneStatusIcon(milestone.status)}
                      </div>
                    </div>

                    <Card variant="glass" className="max-w-2xl hover:border-accent/30 transition-all duration-base cursor-pointer" onClick={() => router.push(`/contracts/${milestone.contract_id}`)}>
                      <CardBody className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Contract Info */}
                          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                            <span className="truncate max-w-[150px]">{milestone.client_name}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px] text-accent">{milestone.contract_title}</span>
                          </div>

                          {/* Milestone Header */}
                          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <span>Milestone #{milestone.milestone_number}</span>
                            <span className="text-xs font-normal text-text-secondary bg-bg-elevated px-2 py-0.5 rounded-full">
                              {milestone.status}
                            </span>
                          </h3>

                          {/* Deliverable Description */}
                          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                            {milestone.deliverable_description || 'No deliverable description available.'}
                          </p>
                        </div>

                        {/* Amount and due date info */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 border-border-subtle/30 pt-3 md:pt-0 gap-3 shrink-0">
                          <div className="text-left md:text-right">
                            <span className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold">Value</span>
                            <span className="text-lg font-bold text-text-primary font-mono">
                              {formatINR(milestone.amount_inr)}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="block text-[10px] text-text-muted uppercase tracking-wider font-semibold">Expected Date</span>
                            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-text-muted" />
                              {dateText}
                            </span>
                          </div>

                          <div className="hidden md:block text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contracts List Tab */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search contracts or clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-md border border-border-default bg-bg-surface text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
            
            {/* Filter status */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <div className="flex border border-border-default rounded-md overflow-hidden bg-bg-surface text-xs font-semibold">
                {['ALL', 'ACTIVE', 'PAID', 'PROCESSING'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-2 border-r last:border-r-0 border-border-default cursor-pointer transition-colors ${
                      statusFilter === f 
                        ? 'bg-accent/10 text-accent font-bold' 
                        : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          {isLoadingContracts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48 flex flex-col justify-between">
                  <CardBody className="space-y-4">
                    <Skeleton variant="text" className="h-6 w-3/4" />
                    <Skeleton variant="text" className="h-4 w-1/2" />
                    <Skeleton variant="rect" className="h-4 w-full rounded-full" />
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchTerm || statusFilter !== 'ALL' ? "No matching contracts" : "No contracts uploaded yet"}
              description={
                searchTerm || statusFilter !== 'ALL' 
                  ? "Try resetting your search query or filters to find other documents."
                  : "Upload a contract to start extracting milestones and billing clients."
              }
              actionLabel={searchTerm || statusFilter !== 'ALL' ? undefined : "Upload Contract"}
              onAction={searchTerm || statusFilter !== 'ALL' ? undefined : () => router.push('/contracts/upload')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContracts.map((contract) => (
                <Card 
                  key={contract._id}
                  variant="elevated"
                  onClick={() => router.push(`/contracts/${contract._id}`)}
                  className="group cursor-pointer hover:shadow-elevated hover:border-accent/20 transition-all duration-base"
                >
                  <CardBody className="flex flex-col h-full min-h-[195px] justify-between">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                          {contract.title || contract.project_name || 'Untitled Project'}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 truncate font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          {contract.client_contact?.name || contract.client_name || 'Unknown Client'}
                        </p>
                      </div>
                      
                      <button 
                        onClick={(e) => handleDelete(e, contract._id)}
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors shrink-0 cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4.5 h-4.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    
                    <div className="space-y-3 mt-auto">
                      <div className="flex items-center justify-between gap-2">
                        <Badge status={contract.contract_type ? contract.contract_type : 'PENDING'} />
                        
                        <span className={`text-xs font-bold flex items-center gap-1 capitalize ${
                          contract.extraction_status === 'processing' ? 'text-warning' :
                          contract.extraction_status === 'failed' ? 'text-danger' :
                          contract.extraction_status === 'review_required' ? 'text-info' :
                          'text-success'
                        }`}>
                          {contract.extraction_status === 'processing' && <FileSearch className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.5} />}
                          {contract.extraction_status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="w-full bg-border-subtle rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full opacity-80 transition-all duration-slow"
                          style={{ width: `${contract.total_milestones && contract.total_milestones > 0 ? Math.round(((contract.paid_milestones || 0) / contract.total_milestones) * 100) : 0}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] text-text-muted font-medium">
                        <span>Uploaded {new Date(contract.created_at).toLocaleDateString('en-IN')}</span>
                        <span>
                          {contract.extraction_status === 'processing' 
                            ? 'Processing...' 
                            : `${contract.paid_milestones || 0} of ${contract.total_milestones || 0} paid`}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Contract"
        footerActions={
          <>
            <Button
              variant="ghost"
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold leading-relaxed">
              Warning: This action is irreversible. All associated data will be permanently wiped from the database.
            </div>
          </div>
          
          <div className="space-y-1.5 bg-bg-elevated p-4 rounded-lg border border-border-subtle/50">
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Contract Details</div>
            <div className="text-sm font-bold text-text-primary font-mono leading-tight">
              {contractToDelete?.title || contractToDelete?.project_name || 'Untitled Project'}
            </div>
            <div className="text-xs text-text-secondary">
              Client: {contractToDelete?.client_contact?.name || contractToDelete?.client_name || 'Unknown Client'}
            </div>
          </div>

          <div className="text-xs text-text-secondary space-y-2 leading-relaxed">
            <p className="font-semibold text-text-primary">The following records will be permanently deleted:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All associated milestones and tracking timelines</li>
              <li>Generated PDF invoices and client follow-up logs</li>
              <li>Indexed document chunks used for AI chatbot queries</li>
              <li>Upload history and status logs</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
