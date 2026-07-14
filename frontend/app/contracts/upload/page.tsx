'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, File, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/Button';
import { Card, CardBody } from '../../../components/Card';
import { useToast } from '../../../context/ToastContext';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('Reading your contract...');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (extractionStatus === 'processing' && contractId && token) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/contracts/${contractId}`, {
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
              router.push(`/contracts/${contractId}`);
            } else if (status === 'failed') {
              setExtractionStatus('failed');
              setError(data.contract.extraction_error || 'An error occurred during processing. Please ensure this is a valid contract document.');
              showToast('Contract extraction failed', 'error');
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
  }, [extractionStatus, contractId, router, token, showToast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(selectedFile.type) && !['pdf', 'docx'].includes(extension || '')) {
        setError('Only PDF and DOCX files are supported.');
        showToast('Only PDF and DOCX files are supported', 'warning');
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/contracts/upload`, {
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
      setContractId(data.contract_id);
      setExtractionStatus('processing');
      showToast('Upload successful. Processing file...', 'info');
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      showToast(err.message || 'Failed to upload contract', 'error');
      setIsUploading(false);
    }
  };

  if (extractionStatus === 'processing') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Card variant="glass" className="p-12 text-center max-w-md w-full">
          <CardBody className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-accent-subtle border border-accent/20 rounded-full flex items-center justify-center mb-6 text-accent">
               <Loader2 className="w-8 h-8 animate-spin" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold mb-2 text-text-primary">Processing Document</h2>
            <p className="text-sm text-text-secondary font-medium animate-pulse">{loadingText}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (extractionStatus === 'failed') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Card variant="default" className="text-center max-w-lg w-full border-danger/20">
          <CardBody className="p-8 flex flex-col items-center">
            <h2 className="text-xl font-bold mb-3 text-danger">Extraction Failed</h2>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">{error}</p>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button 
                variant="primary"
                onClick={() => {
                  setExtractionStatus(null);
                  setFile(null);
                  setError('');
                  setIsUploading(false);
                }}
              >
                Upload Again
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href="/dashboard" className="inline-flex items-center text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" strokeWidth={2} />
        Dashboard
      </Link>

      <Card variant="default">
        <CardBody className="p-10">
          <h1 className="text-3xl font-bold mb-2 text-text-primary">Upload Contract</h1>
          <p className="text-sm text-text-secondary mb-8">Upload a signed PDF or DOCX file to automatically extract payment milestones.</p>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-md text-sm mb-6 font-medium">
              {error}
            </div>
          )}

          <div 
            className={`border border-dashed rounded-lg p-12 text-center transition-all duration-base ease-standard cursor-pointer flex flex-col items-center justify-center min-h-[250px]
              ${file 
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
            
            {file ? (
              <>
                <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-md flex items-center justify-center mb-4 text-accent">
                  <File className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-text-primary text-base truncate max-w-sm">{file.name}</p>
                <p className="text-xs text-text-muted mt-1 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p className="text-accent text-xs mt-4 font-semibold">Click to select a different file</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-bg-elevated rounded-md flex items-center justify-center mb-4 text-text-secondary border border-border-subtle">
                  <UploadCloud className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-text-primary text-base mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-text-muted">PDF or DOCX (max 10MB)</p>
              </>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            variant="primary"
            isLoading={isUploading}
            className="w-full mt-8"
          >
            Process Contract
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
