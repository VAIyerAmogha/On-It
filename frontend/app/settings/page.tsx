'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Save, CheckCircle2, User, Building, Mail, Landmark, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { token } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstin: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    upi_id: '',
    gmail_address: '',
    gmail_app_password: '', // Kept empty initially (write-only)
    default_gst_rate: 0.18,
    invoice_prefix: 'INV-'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
          bank_name: data.bank_name || '',
          account_number: data.account_number || '',
          ifsc: data.ifsc || '',
          upi_id: data.upi_id || '',
          gmail_address: data.gmail_address || '',
          gmail_app_password: '', // Never populate from backend
          default_gst_rate: data.default_gst_rate ?? 0.18,
          invoice_prefix: data.invoice_prefix || 'INV-'
        });
      } catch (err: any) {
        setError('Failed to load settings.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [token]);

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
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setFormData(prev => ({ ...prev, gmail_app_password: '' })); // clear on success
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="glass-surface p-8 rounded-3xl h-64 bg-gray-200/50 dark:bg-gray-700/50"></div>
        <div className="glass-surface p-8 rounded-3xl h-64 bg-gray-200/50 dark:bg-gray-700/50"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Settings</h1>
        
        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          {showSuccess && (
            <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <CheckCircle2 className="w-4 h-4" />
              Saved successfully
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 min-w-[140px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-8">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Profile Group */}
        <div className="glass-surface p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Profile & Business Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Full Name / Business Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">GSTIN (Optional)</label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Billing Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="123 Freelancer Street, City, State, ZIP"
              />
            </div>
          </div>
        </div>

        {/* Bank Details Group */}
        <div className="glass-surface p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Landmark className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Bank Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Bank Name</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="HDFC Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">IFSC Code</label>
              <input
                type="text"
                name="ifsc"
                value={formData.ifsc}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="HDFC0001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Account Number</label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="50100012345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">UPI ID</label>
              <input
                type="text"
                name="upi_id"
                value={formData.upi_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="name@upi"
              />
            </div>
          </div>
        </div>

        {/* Invoicing Settings */}
        <div className="glass-surface p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Building className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Invoicing Defaults</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Invoice Prefix</label>
              <input
                type="text"
                name="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="INV-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Default GST Rate (Decimal)</label>
              <input
                type="number"
                step="0.01"
                name="default_gst_rate"
                value={formData.default_gst_rate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="0.18"
              />
            </div>
          </div>
        </div>

        {/* Email Templates */}
        <div className="glass-surface p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Email Integration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Gmail Address</label>
              <input
                type="email"
                name="gmail_address"
                value={formData.gmail_address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="you@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex justify-between">
                Gmail App Password
                <span className="text-xs text-gray-500 font-normal mt-0.5">(Leave empty to keep existing)</span>
              </label>
              <input
                type="password"
                name="gmail_app_password"
                value={formData.gmail_app_password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="••••••••••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            You must generate a 16-character "App Password" in your Google Account security settings. Standard passwords will not work.
          </p>
        </div>

      </form>
    </div>
  );
}
