import React, { useState, useRef } from 'react';
import { API_BASE_URL } from '../api';
import { UploadCloud, Loader2, CheckCircle } from 'lucide-react';
import './KnowledgeIngestion.css';

interface Props {
  onUploadStart?: () => void;
}

export const KnowledgeIngestion: React.FC<Props> = ({ onUploadStart }) => {
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await handleUpload(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // reset input
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (files: File[]) => {
    setIngestStatus('processing');
    if (onUploadStart) onUploadStart();
    
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('author', localStorage.getItem('sip_author') || 'System');
      formData.append('department', localStorage.getItem('sip_department') || 'General');
      formData.append('career', localStorage.getItem('sip_career') || '');
      formData.append('characteristics', localStorage.getItem('sip_characteristics') || '');

      // 非同期のバックエンドに投げる
      const response = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }
      
      setIngestStatus('completed');
      
      // 5秒後にトーストを消す
      setTimeout(() => {
        setIngestStatus('idle');
      }, 5000);
      
    } catch (e) {
      console.error(e);
      setIngestStatus('idle');
    }
  };

  return (
    <div className="ingestion-simple">
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />
      
      <button 
        className="btn-upload-simple" 
        onClick={handleUploadClick}
        disabled={ingestStatus === 'processing'}
      >
        <UploadCloud size={16} />
        ＋ ナレッジを追加
      </button>

      {ingestStatus === 'processing' && (
        <div className="toast processing">
          <Loader2 className="spinning-icon" size={14} />
          <span>解析中... (裏側で処理されます)</span>
        </div>
      )}

      {ingestStatus === 'completed' && (
        <div className="toast success">
          <CheckCircle size={14} />
          <span>アップロード完了 (順次反映されます)</span>
        </div>
      )}
    </div>
  );
};
