'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, File, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      // Allow fallback check via extension if MIME type is empty (sometimes happens on certain OS/browsers)
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(selectedFile.type) && !['pdf', 'docx'].includes(extension || '')) {
        setError('Only PDF and DOCX files are supported.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file || !token) return;
    
    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

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
      router.push(`/contracts/${data.contract_id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Dashboard
      </Link>

      <div className="glass-surface p-12 rounded-3xl">
        <h1 className="text-3xl font-bold mb-2">Upload Contract</h1>
        <p className="text-gray-500 mb-8">Upload a signed PDF or DOCX file to automatically extract payment milestones.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <div 
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[250px]
            ${file ? 'border-accent-500 bg-accent-500/5' : 'border-gray-300 dark:border-gray-700 hover:border-accent-500 hover:bg-accent-500/5'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          />
          
          {file ? (
            <>
              <div className="w-16 h-16 bg-accent-500/20 rounded-full flex items-center justify-center mb-4 text-accent-600 dark:text-accent-400">
                <File className="w-8 h-8" />
              </div>
              <p className="font-semibold text-lg">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-accent-600 dark:text-accent-400 text-sm mt-4 font-medium">Click to select a different file</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-500">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="font-semibold text-lg mb-1">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500">PDF or DOCX (max 10MB)</p>
            </>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full mt-8 py-3.5 rounded-xl font-medium flex justify-center items-center gap-2 transition-all
            ${!file 
              ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
              : 'bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/25'
            }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading & Processing...
            </>
          ) : (
            'Process Contract'
          )}
        </button>
      </div>
    </div>
  );
}
