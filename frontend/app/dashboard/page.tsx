'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { FileText, Plus, FileSearch, Trash2, Bell, AlertCircle, Clock, CalendarClock, FileWarning, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Card, CardBody, CardHeader } from '../../components/Card';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

interface Contract {
  _id: string;
  title?: string | null;
  project_name: string | null;
  client_name: string | null;
  client_contact?: { name?: string | null } | null;
  contract_type: string | null;
  extraction_status: string;
  created_at: string;
}

interface Notification {
  type: 'OVERDUE_PAYMENT' | 'PAYMENT_DUE_SOON' | 'UPCOMING_DEADLINE' | 'UNINVOICED_MILESTONE' | 'MISSED_DELIVERY' | 'UNINVOICED_TRIGGERED' | 'DELIVERY_REMINDER';
  milestone_id: string;
  contract_id: string;
  contract_title: string;
  client_name: string;
  milestone_number: number | null;
  deliverable_description: string | null;
  amount_inr: number | null;
  due_date: string | null;
  trigger_date: string | null;
  days_overdue: number | null;
  days_until_due: number | null;
  days_until_deadline: number | null;
  days_since_triggered: number | null;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [fadingMap, setFadingMap] = useState<Record<string, boolean>>({});

  const handleMarkPaid = async (milestoneId: string) => {
    setLoadingMap(prev => ({ ...prev, [milestoneId]: true }));
    setErrorMap(prev => ({ ...prev, [milestoneId]: '' }));
    
    try {
      await apiFetch(`/api/milestones/${milestoneId}/paid`, {
        method: 'PATCH',
      });
      
      showToast('Milestone marked as paid', 'success');
      // Success: trigger fade-out
      setFadingMap(prev => ({ ...prev, [milestoneId]: true }));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.milestone_id !== milestoneId));
        setFadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
        setLoadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
      }, 300);
    } catch (err: any) {
      console.error('Failed to mark milestone as paid:', err);
      setErrorMap(prev => ({ ...prev, [milestoneId]: err.message || 'Failed to update' }));
      showToast(err.message || 'Failed to update milestone status', 'error');
      setLoadingMap(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  const handleMarkTriggered = async (milestoneId: string) => {
    setLoadingMap(prev => ({ ...prev, [milestoneId]: true }));
    setErrorMap(prev => ({ ...prev, [milestoneId]: '' }));
    
    try {
      await apiFetch(`/api/milestones/${milestoneId}/trigger`, {
        method: 'PATCH',
      });
      
      showToast('Milestone marked as triggered', 'success');
      // Success: trigger fade-out
      setFadingMap(prev => ({ ...prev, [milestoneId]: true }));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.milestone_id !== milestoneId));
        setFadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
        setLoadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
      }, 300);
    } catch (err: any) {
      console.error('Failed to mark milestone as triggered:', err);
      setErrorMap(prev => ({ ...prev, [milestoneId]: err.message || 'Failed to update' }));
      showToast(err.message || 'Failed to trigger milestone', 'error');
      setLoadingMap(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  const handleGenerateInvoice = async (milestoneId: string) => {
    setLoadingMap(prev => ({ ...prev, [milestoneId]: true }));
    setErrorMap(prev => ({ ...prev, [milestoneId]: '' }));
    
    try {
      await apiFetch(`/api/milestones/${milestoneId}/invoice`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      
      showToast('Invoice generated successfully', 'success');
      // Success: trigger fade-out
      setFadingMap(prev => ({ ...prev, [milestoneId]: true }));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.milestone_id !== milestoneId));
        setFadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
        setLoadingMap(prev => {
          const copy = { ...prev };
          delete copy[milestoneId];
          return copy;
        });
      }, 300);
    } catch (err: any) {
      console.error('Failed to generate invoice:', err);
      setErrorMap(prev => ({ ...prev, [milestoneId]: err.message || 'Failed to generate' }));
      showToast(err.message || 'Failed to generate invoice', 'error');
      setLoadingMap(prev => ({ ...prev, [milestoneId]: false }));
    }
  };

  const getCenterContent = (notif: Notification) => {
    switch (notif.type) {
      case 'MISSED_DELIVERY':
        return `Delivery missed by ${notif.days_overdue} days — not yet triggered`;
      case 'OVERDUE_PAYMENT':
        return `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} overdue by ${notif.days_overdue} days`;
      case 'PAYMENT_DUE_SOON':
        return `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} due in ${notif.days_until_due} days`;
      case 'UNINVOICED_TRIGGERED':
        return `Triggered — deadline passed ${notif.days_since_triggered} days ago, invoice not raised`;
      case 'UPCOMING_DEADLINE':
      case 'DELIVERY_REMINDER': {
        const desc = notif.deliverable_description || '';
        const trunc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
        return `Due in ${notif.days_until_deadline} days — ${trunc}`;
      }
      case 'UNINVOICED_MILESTONE':
        return `Triggered ${notif.days_since_triggered} days ago — invoice not raised yet`;
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this contract?')) return;
    
    try {
      await apiFetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
      setContracts(contracts.filter(c => c._id !== id));
      showToast('Contract deleted successfully', 'success');
    } catch (error: any) {
      console.error('Failed to delete contract:', error);
      showToast(error.message || 'Failed to delete contract', 'error');
    }
  };

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

  useEffect(() => {
    if (!token) {
      setIsNotifLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        const data = await apiFetch('/api/notifications');
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsNotifLoading(false);
      }
    };

    fetchNotifications();
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton variant="rect" className="h-10 w-48" />
          <Skeleton variant="rect" className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 flex flex-col justify-between">
              <CardBody className="flex flex-col justify-between h-full">
                <div>
                  <Skeleton variant="text" className="h-6 w-3/4 mb-3" />
                  <Skeleton variant="text" className="h-4 w-1/2" />
                </div>
                <div className="flex justify-between items-end">
                  <Skeleton variant="rect" className="h-6 w-20 rounded-full" />
                  <Skeleton variant="text" className="h-4 w-16" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={FileText}
          title="No contracts yet"
          description="Upload your first freelance contract to automatically extract milestones and generate invoices."
          actionLabel="Upload Contract"
          onAction={() => router.push('/contracts/upload')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        <Link href="/contracts/upload">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && !isDismissed && (
        <Card variant="default" className="border-accent/20">
          <CardHeader
            title={
              <div className="flex items-center gap-2 text-text-primary font-semibold">
                <Bell className="w-5 h-5 text-accent animate-pulse" strokeWidth={1.5} />
                <span>
                  {notifications.length} {notifications.length === 1 ? 'item needs' : 'items need'} your attention
                </span>
              </div>
            }
            action={
              <button
                onClick={() => setIsDismissed(true)}
                className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            }
          />
          <CardBody className="divide-y divide-border-subtle/50 px-6 py-1">
            {notifications.map((notif) => (
              <div
                key={`${notif.type}-${notif.milestone_id}`}
                className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-slow ${
                  fadingMap[notif.milestone_id] ? 'opacity-0 -translate-x-4 pointer-events-none' : ''
                }`}
              >
                {/* Left Column */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {notif.type === 'MISSED_DELIVERY' && <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.5} />}
                  {notif.type === 'OVERDUE_PAYMENT' && <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />}
                  {notif.type === 'PAYMENT_DUE_SOON' && <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" strokeWidth={1.5} />}
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER') && (
                    <CalendarClock className="w-5 h-5 text-info shrink-0 mt-0.5" strokeWidth={1.5} />
                  )}
                  {(notif.type === 'UNINVOICED_MILESTONE' || notif.type === 'UNINVOICED_TRIGGERED') && (
                    <FileWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary leading-snug truncate">
                      {notif.contract_title} — Milestone {notif.milestone_number}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 truncate">
                      {notif.client_name}
                    </div>
                    
                    {/* Mobile Center Column Text (visible on mobile only) */}
                    <div className="block md:hidden mt-2 text-xs font-semibold text-text-primary">
                      {getCenterContent(notif)}
                    </div>
                    {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER' || notif.type === 'MISSED_DELIVERY') && notif.trigger_date && (
                      <div className="block md:hidden text-[10px] text-text-muted mt-1">
                        {notif.type === 'MISSED_DELIVERY' ? 'Trigger Date: ' : 'Deadline Date: '}
                        {formatDate(notif.trigger_date)}
                      </div>
                    )}
                    
                    {errorMap[notif.milestone_id] && (
                      <div className="text-xs text-danger mt-2 font-medium">
                        Error: {errorMap[notif.milestone_id]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Column (desktop only) */}
                <div className="hidden md:flex flex-col items-center justify-center text-center px-4 max-w-xs">
                  <span className="font-semibold text-sm text-text-primary">{getCenterContent(notif)}</span>
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER' || notif.type === 'MISSED_DELIVERY') && notif.trigger_date && (
                    <span className="text-xs text-text-muted mt-1">
                      {formatDate(notif.trigger_date)}
                    </span>
                  )}
                </div>

                {/* Right Column / Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {notif.type === 'MISSED_DELIVERY' && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleMarkTriggered(notif.milestone_id)}
                        isLoading={loadingMap[notif.milestone_id]}
                      >
                        Mark Triggered
                      </Button>
                      <Link href={`/contracts/${notif.contract_id}#milestone-${notif.milestone_id}`}>
                        <Button size="sm" variant="danger">
                          Missed Deadline Invoice
                        </Button>
                      </Link>
                      <Link href={`/contracts/${notif.contract_id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </>
                  )}
                  {notif.type === 'OVERDUE_PAYMENT' && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleMarkPaid(notif.milestone_id)}
                        isLoading={loadingMap[notif.milestone_id]}
                      >
                        Mark Paid
                      </Button>
                      <Link href={`/contracts/${notif.contract_id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </>
                  )}
                  {notif.type === 'PAYMENT_DUE_SOON' && (
                    <Link href={`/contracts/${notif.contract_id}`}>
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </Link>
                  )}
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER') && (
                    <Link href={`/contracts/${notif.contract_id}`}>
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </Link>
                  )}
                  {(notif.type === 'UNINVOICED_MILESTONE' || notif.type === 'UNINVOICED_TRIGGERED') && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleGenerateInvoice(notif.milestone_id)}
                        isLoading={loadingMap[notif.milestone_id]}
                      >
                        Generate Invoice
                      </Button>
                      <Link href={`/contracts/${notif.contract_id}`}>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts.map((contract) => (
          <Card 
            key={contract._id}
            variant="elevated"
            onClick={() => router.push(`/contracts/${contract._id}`)}
          >
            <CardBody className="flex flex-col h-full min-h-[190px] justify-between">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                    {contract.title || contract.project_name || 'Untitled Project'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 truncate">
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
                  
                  <span className={`text-xs font-semibold flex items-center gap-1 capitalize ${
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
                  <div className="bg-accent h-full rounded-full w-1/3 opacity-80"></div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-text-muted font-medium">
                  <span>Uploaded {new Date(contract.created_at).toLocaleDateString('en-IN')}</span>
                  <span>2 of 5 paid</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
