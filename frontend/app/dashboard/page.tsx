'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { FileText, Plus, FileSearch, Trash2, Bell, AlertCircle, Clock, CalendarClock, FileWarning, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    } catch (error) {
      console.error('Failed to delete contract:', error);
      alert('Failed to delete contract');
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

      {/* Notifications Panel */}
      {notifications.length > 0 && !isDismissed && (
        <div className="glass-surface p-6 rounded-2xl animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Bell className="w-5 h-5 text-accent-500" />
              <span>{notifications.length} {notifications.length === 1 ? 'item needs' : 'items need'} your attention</span>
            </div>
            <button 
              onClick={() => setIsDismissed(true)} 
              className="text-sm font-medium text-gray-500 hover:text-foreground transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-4 divide-y divide-black/5 dark:divide-white/5">
            {notifications.map((notif) => (
              <div 
                key={`${notif.type}-${notif.milestone_id}`} 
                className={`py-4 first:pt-0 last:pb-0 grid grid-cols-1 md:grid-cols-12 items-start md:items-center gap-4 transition-all duration-300 ${fadingMap[notif.milestone_id] ? 'opacity-0 -translate-x-4 pointer-events-none' : ''}`}
              >
                {/* Left Column */}
                <div className="flex items-start gap-3 md:col-span-6">
                  {notif.type === 'MISSED_DELIVERY' && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  {notif.type === 'OVERDUE_PAYMENT' && <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                  {notif.type === 'PAYMENT_DUE_SOON' && <Clock className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />}
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER') && <CalendarClock className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />}
                  {(notif.type === 'UNINVOICED_MILESTONE' || notif.type === 'UNINVOICED_TRIGGERED') && <FileWarning className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground leading-snug line-clamp-2 md:line-clamp-1">
                      {notif.contract_title} — Milestone {notif.milestone_number}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {notif.client_name}
                    </div>
                    
                    {/* Mobile Center Column Text (visible on mobile only) */}
                    <div className="block md:hidden mt-2 text-sm font-medium text-foreground">
                      {getCenterContent(notif)}
                    </div>
                    {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER' || notif.type === 'MISSED_DELIVERY') && notif.trigger_date && (
                      <div className="block md:hidden text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notif.type === 'MISSED_DELIVERY' ? 'Trigger Date: ' : 'Deadline Date: '}
                        {formatDate(notif.trigger_date)}
                      </div>
                    )}
                    
                    {/* Mobile/Inline error display */}
                    {errorMap[notif.milestone_id] && (
                      <div className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">
                        Error: {errorMap[notif.milestone_id]}
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Column (desktop only) */}
                <div className="hidden md:flex flex-col items-center justify-center text-center px-4 md:col-span-3">
                  <span className="font-medium text-foreground">{getCenterContent(notif)}</span>
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER' || notif.type === 'MISSED_DELIVERY') && notif.trigger_date && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(notif.trigger_date)}
                    </span>
                  )}
                </div>

                {/* Right Column / Actions */}
                <div className="flex items-center gap-2 justify-start md:justify-end md:col-span-3 shrink-0 flex-wrap">
                  {notif.type === 'MISSED_DELIVERY' && (
                    <>
                      <button
                        onClick={() => handleMarkTriggered(notif.milestone_id)}
                        disabled={loadingMap[notif.milestone_id]}
                        className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {loadingMap[notif.milestone_id] ? 'Updating...' : 'Mark Triggered'}
                      </button>
                      <Link
                        href={`/contracts/${notif.contract_id}#milestone-${notif.milestone_id}`}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Missed Deadline Invoice
                      </Link>
                      <Link
                        href={`/contracts/${notif.contract_id}`}
                        className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground text-xs font-semibold rounded-lg transition-colors"
                      >
                        View
                      </Link>
                    </>
                  )}
                  {notif.type === 'OVERDUE_PAYMENT' && (
                    <>
                      <button
                        onClick={() => handleMarkPaid(notif.milestone_id)}
                        disabled={loadingMap[notif.milestone_id]}
                        className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {loadingMap[notif.milestone_id] ? 'Updating...' : 'Mark Paid'}
                      </button>
                      <Link
                        href={`/contracts/${notif.contract_id}`}
                        className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground text-xs font-semibold rounded-lg transition-colors"
                      >
                        View
                      </Link>
                    </>
                  )}
                  {notif.type === 'PAYMENT_DUE_SOON' && (
                    <Link
                      href={`/contracts/${notif.contract_id}`}
                      className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground text-xs font-semibold rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {(notif.type === 'UPCOMING_DEADLINE' || notif.type === 'DELIVERY_REMINDER') && (
                    <Link
                      href={`/contracts/${notif.contract_id}`}
                      className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground text-xs font-semibold rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {(notif.type === 'UNINVOICED_MILESTONE' || notif.type === 'UNINVOICED_TRIGGERED') && (
                    <>
                      <button
                        onClick={() => handleGenerateInvoice(notif.milestone_id)}
                        disabled={loadingMap[notif.milestone_id]}
                        className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-500/50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {loadingMap[notif.milestone_id] ? 'Generating...' : 'Generate Invoice'}
                      </button>
                      <Link
                        href={`/contracts/${notif.contract_id}`}
                        className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-foreground text-xs font-semibold rounded-lg transition-colors"
                      >
                        View
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts.map((contract) => (
          <div 
            key={contract._id}
            onClick={() => router.push(`/contracts/${contract._id}`)}
            className="glass-surface p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-transform duration-200 group flex flex-col h-full"
          >
            <div className="flex-1 mb-4 flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold group-hover:text-accent-500 transition-colors line-clamp-1">
                  {contract.title || contract.project_name || 'Untitled Project'}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {contract.client_contact?.name || contract.client_name || 'Unknown Client'}
                </p>
              </div>
              <button 
                onClick={(e) => handleDelete(e, contract._id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
