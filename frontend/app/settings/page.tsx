'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Save, User, Building, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, CardBody } from '../../components/Card';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function SettingsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstin: '',
    gmail_address: '',
    gmail_app_password: '', // Kept empty initially (write-only)
    default_gst_rate: 0.18,
    invoice_prefix: 'INV-'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    
    const fetchSettings = async () => {
      try {
        const data = await apiFetch('/api/settings');
        setFormData({
          name: data.name || '',
          address: data.address || '',
          gstin: data.gstin || '',
          gmail_address: data.gmail_address || '',
          gmail_app_password: '', // Never populate from backend
          default_gst_rate: data.default_gst_rate ?? 0.18,
          invoice_prefix: data.invoice_prefix || 'INV-'
        });
      } catch (err: any) {
        setError('Failed to load settings.');
        showToast('Failed to load settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [token, showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      // Only include password if explicitly typed by the user
      const payload: any = { ...formData };
      if (!payload.gmail_app_password) {
        delete payload.gmail_app_password;
      }
      
      await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      showToast('Settings saved successfully', 'success');
      setFormData(prev => ({ ...prev, gmail_app_password: '' })); // clear password input field
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton variant="rect" className="h-10 w-48" />
        <Skeleton variant="rect" className="h-64 w-full" />
        <Skeleton variant="rect" className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <Button
            onClick={handleSubmit}
            variant="primary"
            isLoading={isSaving}
            className="w-full sm:w-auto min-w-[140px]"
          >
            {!isSaving && <Save className="w-4 h-4 shrink-0" strokeWidth={2} />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-md text-sm mb-8 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Profile Group */}
        <Card variant="default">
          <CardBody className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-accent-subtle flex items-center justify-center text-accent border border-accent/10">
                <User className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Profile & Business Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name / Business Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
              <Input
                label="GSTIN (Optional)"
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="22AAAAA0000A1Z5"
              />
              <div className="md:col-span-2">
                <Input
                  label="Billing Address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Freelancer Street, City, State, ZIP"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Invoicing Settings */}
        <Card variant="default">
          <CardBody className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-accent-subtle flex items-center justify-center text-accent border border-accent/10">
                <Building className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Invoicing Defaults</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Invoice Prefix"
                type="text"
                name="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={handleChange}
                placeholder="INV-"
              />
              <Input
                label="Default GST Rate (Decimal)"
                type="number"
                step="0.01"
                name="default_gst_rate"
                value={formData.default_gst_rate}
                onChange={handleChange}
                placeholder="0.18"
                isMono={true}
              />
            </div>
          </CardBody>
        </Card>

        {/* Email Templates */}
        <Card variant="default">
          <CardBody className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-accent-subtle flex items-center justify-center text-accent border border-accent/10">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Email Integration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Gmail Address"
                type="email"
                name="gmail_address"
                value={formData.gmail_address}
                onChange={handleChange}
                placeholder="you@gmail.com"
              />
              <Input
                label="Gmail App Password"
                type="password"
                name="gmail_app_password"
                value={formData.gmail_app_password}
                onChange={handleChange}
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
            </div>
            <p className="mt-4 text-xs text-text-muted">
              You must generate a 16-character "App Password" in your Google Account security settings. Standard passwords will not work.
            </p>
          </CardBody>
        </Card>

      </form>
    </div>
  );
}
