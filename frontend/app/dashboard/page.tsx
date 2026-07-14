'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import {
  FileText,
  Plus,
  FileSearch,
  Bell,
  AlertCircle,
  Clock,
  CalendarClock,
  FileWarning,
  XCircle,
  X,
  TrendingUp,
  Briefcase,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  UploadCloud,
  File,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Card, CardBody, CardHeader } from '../../components/Card';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

interface Stats {
  total_revenue: number;
  paid_contracts_count: number;
  unpaid_contracts_count: number;
  active_contracts_count: number;
  overdue_count: number;
  overdue_amount: number;
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
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [fadingMap, setFadingMap] = useState<Record<string, boolean>>({});

  // Contract Upload states (embedded in Dashboard)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedContractId, setUploadedContractId] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Reading your contract...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll for contract extraction status
  useEffect(() => {
    if (extractionStatus === 'processing' && uploadedContractId && token) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/contracts/${uploadedContractId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const status = data.contract.extraction_status;
            
            if (status === 'extracted' || status === 'review_required') {
              setExtractionStatus(status);
              showToast('Contract milestones extracted successfully', 'success');
              router.push(`/contracts/${uploadedContractId}`);
            } else if (status === 'failed') {
              setExtractionStatus('failed');
              setUploadError(data.contract.extraction_error || 'An error occurred during processing. Please ensure this is a valid contract document.');
              showToast('Contract extraction failed', 'error');
              setIsUploading(false);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);

      const texts = ["Reading your contract...", "Classifying contract type...", "Extracting milestones...", "Resolving payment terms..."];
      let i = 0;
      const textInterval = setInterval(() => {
        i = (i + 1) % texts.length;
        setLoadingText(texts[i]);
      }, 4000);

      return () => {
        clearInterval(interval);
        clearInterval(textInterval);
      };
    }
  }, [extractionStatus, uploadedContractId, router, token, showToast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(selectedFile.type) && !['pdf', 'docx'].includes(extension || '')) {
        setUploadError('Only PDF and DOCX files are supported.');
        showToast('Only PDF and DOCX files are supported', 'warning');
        return;
      }
      setUploadFile(selectedFile);
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !token) return;
    
    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/contracts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload contract');
      }

      const data = await response.json();
      setUploadedContractId(data.contract_id);
      setExtractionStatus('processing');
      showToast('Upload successful. Processing file...', 'info');
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload.');
      showToast(err.message || 'Failed to upload contract', 'error');
      setIsUploading(false);
    }
  };

  // Fetch Stats & Notifications
  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/contracts/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/api/notifications');
      const allNotifs: Notification[] = data.notifications || [];
      const dismissedKeys = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
      const filteredNotifs = allNotifs.filter(n => !dismissedKeys.includes(`${n.type}-${n.milestone_id}`));
      setNotifications(filteredNotifs);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsNotifLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchNotifications();
  }, [token]);

  // Actions on notifications
  const handleMarkPaid = async (milestoneId: string) => {
    setLoadingMap(prev => ({ ...prev, [milestoneId]: true }));
    setErrorMap(prev => ({ ...prev, [milestoneId]: '' }));
    
    try {
      await apiFetch(`/api/milestones/${milestoneId}/paid`, {
        method: 'PATCH',
      });
      
      showToast('Milestone marked as paid', 'success');
      fetchStats(); // Update stats dynamically
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
      fetchStats(); // Update stats dynamically
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
      fetchStats(); // Update stats dynamically
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

  const handleDismissIndividual = (type: string, milestoneId: string) => {
    const key = `${type}-${milestoneId}`;
    const dismissedKeys = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    if (!dismissedKeys.includes(key)) {
      dismissedKeys.push(key);
      localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedKeys));
    }
    
    setFadingMap(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => !(`${n.type}-${n.milestone_id}` === key)));
      setFadingMap(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 300);
  };

  const getCenterContent = (notif: Notification) => {
    switch (notif.type) {
      case 'MISSED_DELIVERY': {
        const days = notif.days_overdue ?? 0;
        return days === 0 
          ? `Delivery expected by end of day — not yet triggered`
          : `Delivery missed by ${days} days — not yet triggered`;
      }
      case 'OVERDUE_PAYMENT': {
        const days = notif.days_overdue ?? 0;
        return days === 0
          ? `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} due by end of day`
          : `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} overdue by ${days} days`;
      }
      case 'PAYMENT_DUE_SOON': {
        const days = notif.days_until_due ?? 0;
        return days === 0
          ? `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} expected by end of day`
          : `₹${notif.amount_inr?.toLocaleString('en-IN') || 0} due in ${days} days`;
      }
      case 'UNINVOICED_TRIGGERED': {
        const days = notif.days_since_triggered ?? 0;
        return days === 0
          ? `Triggered today — invoice not raised`
          : `Triggered — deadline passed ${days} days ago, invoice not raised`;
      }
      case 'UPCOMING_DEADLINE':
      case 'DELIVERY_REMINDER': {
        const desc = notif.deliverable_description || '';
        const trunc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
        const days = notif.days_until_deadline ?? 0;
        return days === 0
          ? `Expected by end of day — ${trunc}`
          : `Due in ${days} days — ${trunc}`;
      }
      case 'UNINVOICED_MILESTONE': {
        const days = notif.days_since_triggered ?? 0;
        return days === 0
          ? `Triggered today — invoice not raised yet`
          : `Triggered ${days} days ago — invoice not raised yet`;
      }
      default:
        return '';
    }
  };

  const getDetailedSummary = (notif: Notification) => {
    const dateStr = notif.trigger_date || notif.due_date;
    const formattedDate = dateStr ? formatDate(dateStr) : 'end of day today';
    
    switch (notif.type) {
      case 'MISSED_DELIVERY':
        return `The deadline for this milestone has passed without the deliverables being marked as triggered. To proceed, please contact the client to align on expectations, then either mark the milestone as completed and triggered, or issue a missed deadline invoice with a goodwill discount as per contract terms by ${formattedDate}.`;
      case 'OVERDUE_PAYMENT':
        return `The payment due date for this milestone's invoice has passed, and we have not received payment confirmation. Please review your bank account, follow up with the client directly to request payment status, and mark this milestone as paid once the funds have successfully cleared, originally due by ${formattedDate}.`;
      case 'PAYMENT_DUE_SOON':
        return `This milestone has been invoiced and payment is expected soon. Please keep an eye on your incoming bank transfers. If the due date of ${formattedDate} arrives without receiving payment, the system will prepare automated reminder drafts that you can send to prompt the client for payment.`;
      case 'UNINVOICED_TRIGGERED':
      case 'UNINVOICED_MILESTONE':
        return `The deliverables for this milestone have been completed and marked as triggered, but no invoice has been generated yet. Please review the milestone amount, select generate invoice to draft the billing document, and send it to the client by ${formattedDate} to initiate payment collection.`;
      case 'UPCOMING_DEADLINE':
      case 'DELIVERY_REMINDER':
        return `This milestone work is currently in progress and expected to be delivered soon. Please review the project requirements, finish the deliverables, and present them to the client. Once the client approves the work, you can mark this milestone as triggered by ${formattedDate} to invoice.`;
      default:
        return `This milestone requires your attention. Please review the contract terms and deliverables with your client, complete any outstanding work, trigger the milestone status when ready, and ensure that the appropriate invoice is raised and sent to the client for payment by ${formattedDate}.`;
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Loading skeleton for statistics
  const renderStatsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="h-32 flex flex-col justify-between p-5">
          <CardBody className="p-0 space-y-3">
            <Skeleton variant="text" className="h-4 w-1/3" />
            <Skeleton variant="text" className="h-8 w-2/3" />
            <Skeleton variant="rect" className="h-2 w-full rounded-full" />
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Notifications Panel (crucial actions) */}
      {notifications.length > 0 && !isDismissed && (
        <Card variant="default" className="border-accent/20 animate-fade-in-up">
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
                className={`group py-4 flex flex-col justify-between gap-1 transition-all duration-slow hover:bg-bg-elevated/10 px-3 -mx-3 rounded-md ${
                  fadingMap[notif.milestone_id] || fadingMap[`${notif.type}-${notif.milestone_id}`] ? 'opacity-0 -translate-x-4 pointer-events-none' : ''
                }`}
              >
                {/* Row Content */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                  {/* Left Column */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {notif.type === 'MISSED_DELIVERY' && <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.5} />}
                    {notif.type === 'OVERDUE_PAYMENT' && <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" strokeWidth={1.5} />}
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
                      
                      {/* Mobile Center Column Text */}
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
                    
                    <button
                      onClick={() => handleDismissIndividual(notif.type, notif.milestone_id)}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-md transition-colors cursor-pointer ml-1 shrink-0"
                      title="Dismiss notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Detailed 40-50 Word Summary revealed on group hover */}
                <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-28 group-hover:opacity-100 transition-all duration-300 ease-in-out pl-8 pr-12">
                  <p className="text-xs text-text-secondary leading-relaxed font-normal italic border-l-2 border-accent/30 pl-3 mt-1 py-0.5">
                    {getDetailedSummary(notif)}
                  </p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Freelance Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Welcome back, {user?.name || 'Freelancer'}!
          </h1>
          <p className="text-sm text-text-secondary font-medium">
            Here is your freelance business performance at a glance today.
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <Link href="/contracts" className="flex-1 md:flex-none">
            <Button variant="secondary" className="w-full justify-center">
              View Contracts
            </Button>
          </Link>
          <Link href="/contracts/upload" className="flex-1 md:flex-none">
            <Button variant="primary" className="w-full justify-center flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              New Contract
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Section with Sleek Graphics and Hover Animations */}
      {isLoadingStats ? (
        renderStatsSkeleton()
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Stat Card */}
          <Card
            variant="glass"
            className="group relative overflow-hidden transition-all duration-slow ease-spring hover:scale-[1.02] hover:-translate-y-0.5 hover:border-accent/30 shadow-card hover:shadow-elevated"
          >
            <CardBody className="p-5 flex flex-col justify-between h-full min-h-[135px]">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Revenue Paid</span>
                  <h3 className="text-2xl font-black text-text-primary font-mono mt-1 group-hover:text-accent transition-colors">
                    {formatCurrency(stats.total_revenue)}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center text-success transition-transform duration-slow group-hover:rotate-12">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
              </div>
              
              {/* Graphic: Custom Sparkline SVG */}
              <div className="mt-3 w-full h-8 opacity-60 group-hover:opacity-90 transition-opacity">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient-sparkline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,18 Q15,10 30,12 T60,5 T90,8 T100,2 L100,20 L0,20 Z"
                    fill="url(#gradient-sparkline)"
                  />
                  <path
                    d="M0,18 Q15,10 30,12 T60,5 T90,8 T100,2"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </CardBody>
          </Card>

          {/* Paid / Unpaid Contracts Stat Card */}
          <Card
            variant="glass"
            className="group relative overflow-hidden transition-all duration-slow ease-spring hover:scale-[1.02] hover:-translate-y-0.5 hover:border-accent/30 shadow-card hover:shadow-elevated"
          >
            <CardBody className="p-5 flex flex-col justify-between h-full min-h-[135px]">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Contracts Paid / Unpaid</span>
                  <h3 className="text-xl font-black text-text-primary mt-1 font-mono">
                    {stats.paid_contracts_count} / {stats.unpaid_contracts_count}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent transition-transform duration-slow group-hover:scale-110">
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Graphic: Custom segmented progress bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[9px] text-text-muted font-bold uppercase">
                  <span>Paid Completion</span>
                  <span>
                    {stats.paid_contracts_count + stats.unpaid_contracts_count > 0
                      ? Math.round(
                          (stats.paid_contracts_count /
                            (stats.paid_contracts_count + stats.unpaid_contracts_count)) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-border-subtle rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-success h-full transition-all duration-slow"
                    style={{
                      width: `${
                        stats.paid_contracts_count + stats.unpaid_contracts_count > 0
                          ? (stats.paid_contracts_count /
                              (stats.paid_contracts_count + stats.unpaid_contracts_count)) *
                            100
                          : 0
                      }%`
                    }}
                  />
                  <div
                    className="bg-accent/40 h-full transition-all duration-slow"
                    style={{
                      width: `${
                        stats.paid_contracts_count + stats.unpaid_contracts_count > 0
                          ? (stats.unpaid_contracts_count /
                              (stats.paid_contracts_count + stats.unpaid_contracts_count)) *
                            100
                          : 100
                      }%`
                    }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Active Contracts Stat Card */}
          <Card
            variant="glass"
            className="group relative overflow-hidden transition-all duration-slow ease-spring hover:scale-[1.02] hover:-translate-y-0.5 hover:border-accent/30 shadow-card hover:shadow-elevated"
          >
            <CardBody className="p-5 flex flex-col justify-between h-full min-h-[135px]">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Active Projects</span>
                  <h3 className="text-2xl font-black text-text-primary mt-1 font-mono">
                    {stats.active_contracts_count}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-full bg-info/10 flex items-center justify-center text-info transition-transform duration-slow group-hover:rotate-45">
                  <Activity className="w-4.5 h-4.5" />
                </div>
              </div>

              {/* Graphic: Custom radar pulse animation inside SVG */}
              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                </div>
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                  {stats.active_contracts_count === 1 ? '1 ongoing contract' : `${stats.active_contracts_count} ongoing contracts`}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Overdue Payment Stat Card */}
          <Card
            variant="glass"
            className={`group relative overflow-hidden transition-all duration-slow ease-spring hover:scale-[1.02] hover:-translate-y-0.5 shadow-card hover:shadow-elevated border-l-4 ${
              stats.overdue_count > 0 ? 'border-l-danger hover:border-danger/30' : 'border-l-border-default hover:border-accent/30'
            }`}
          >
            <CardBody className="p-5 flex flex-col justify-between h-full min-h-[135px]">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Payments Overdue</span>
                  <h3 className={`text-2xl font-black mt-1 font-mono ${stats.overdue_count > 0 ? 'text-danger' : 'text-text-primary'}`}>
                    {formatCurrency(stats.overdue_amount)}
                  </h3>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-slow group-hover:-translate-y-0.5 ${
                  stats.overdue_count > 0 ? 'bg-danger/10 text-danger animate-bounce' : 'bg-border-default/20 text-text-muted'
                }`}>
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${stats.overdue_count > 0 ? 'text-danger font-extrabold' : 'text-text-muted'}`}>
                  {stats.overdue_count} {stats.overdue_count === 1 ? 'milestone overdue' : 'milestones overdue'}
                </span>
                
                {stats.overdue_count > 0 && (
                  <span className="text-[9px] bg-danger-subtle text-danger font-bold px-1.5 py-0.5 rounded-full">
                    Action required
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}



      {/* Contract Upload Section directly in Dashboard */}
      <div className="animate-fade-in-up">
        {extractionStatus === 'processing' ? (
          <Card variant="glass" className="p-8 text-center border-accent/20">
            <CardBody className="flex flex-col items-center justify-center max-w-md mx-auto py-6">
              <div className="w-14 h-14 bg-accent-subtle border border-accent/20 rounded-full flex items-center justify-center mb-5 text-accent">
                <Loader2 className="w-7 h-7 animate-spin" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold mb-1.5 text-text-primary">Processing Document</h3>
              <p className="text-sm text-text-secondary font-medium animate-pulse">{loadingText}</p>
            </CardBody>
          </Card>
        ) : extractionStatus === 'failed' ? (
          <Card variant="default" className="border-danger/20">
            <CardBody className="p-8 flex flex-col items-center text-center max-w-lg mx-auto">
              <AlertCircle className="w-12 h-12 text-danger mb-4" />
              <h3 className="text-lg font-bold mb-2 text-danger">Milestone Extraction Failed</h3>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">{uploadError}</p>
              <div className="flex justify-center gap-3 w-full">
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setExtractionStatus(null);
                    setUploadFile(null);
                    setUploadError('');
                    setIsUploading(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  Upload Again
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card variant="default" className="border-border-default">
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-md bg-accent/15 border border-accent/20 flex items-center justify-center text-accent">
                  <UploadCloud className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Add New Contract</h2>
                  <p className="text-xs text-text-secondary">Drag and drop your project contract to extract milestones instantly.</p>
                </div>
              </div>

              {uploadError && (
                <div className="bg-danger/10 border border-danger/20 text-danger p-3.5 rounded-md text-xs mb-4 font-semibold">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div 
                  className={`lg:col-span-2 border border-dashed rounded-lg p-8 text-center transition-all duration-base ease-standard cursor-pointer flex flex-col items-center justify-center min-h-[170px]
                    ${uploadFile 
                      ? 'border-accent bg-accent-subtle/10' 
                      : 'border-border-default hover:border-accent hover:bg-bg-elevated'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  />
                  
                  {uploadFile ? (
                    <>
                      <div className="w-11 h-11 bg-accent/10 border border-accent/20 rounded-md flex items-center justify-center mb-3 text-accent">
                        <File className="w-5.5 h-5.5" strokeWidth={1.5} />
                      </div>
                      <p className="font-semibold text-text-primary text-sm truncate max-w-sm">{uploadFile.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5 font-mono">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p className="text-accent text-[10px] mt-2 font-bold uppercase tracking-wider">Click to select different file</p>
                    </>
                  ) : (
                    <>
                      <div className="w-11 h-11 bg-bg-elevated rounded-md flex items-center justify-center mb-3 text-text-secondary border border-border-subtle">
                        <UploadCloud className="w-5.5 h-5.5" strokeWidth={1.5} />
                      </div>
                      <p className="font-semibold text-text-primary text-sm mb-0.5">Click to upload or drag and drop</p>
                      <p className="text-[10px] text-text-muted">PDF or DOCX (max 10MB)</p>
                    </>
                  )}
                </div>

                <div className="bg-bg-surface border border-border-subtle p-5 rounded-lg flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      AI Extraction Pipeline
                    </h3>
                    <ul className="text-[11px] text-text-secondary space-y-1.5 list-disc pl-4 font-medium">
                      <li>OCR scanning of scanned documents</li>
                      <li>Structure classification (Fixed, Retainer, etc.)</li>
                      <li>Milestone deliverables & value resolution</li>
                      <li>Auto GST-compliant invoice structure setup</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!uploadFile || isUploading}
                    variant="primary"
                    isLoading={isUploading}
                    className="w-full py-2.5 text-sm"
                  >
                    Process Contract
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
