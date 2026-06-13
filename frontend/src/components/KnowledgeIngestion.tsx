import React, { useState } from 'react';
import { UploadCloud, FolderSync, Database, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './KnowledgeIngestion.css';

export const KnowledgeIngestion: React.FC = () => {
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleStartAnalysis = async () => {
    if (selectedFiles.length === 0) return;
    
    setIngestStatus('processing');
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }
      
      setIngestStatus('completed');
    } catch (e) {
      console.error(e);
      setIngestStatus('idle');
    }
  };

  const handleNext = () => {
    navigate('/diagnostic');
  };

  return (
    <div className="ingestion-container animate-fade-in">
      <div className="ingestion-header">
        <h2>組織ナレッジの取り込み (Phase 0)</h2>
        <p>戦略立案の土台となる既存の文書、計画、社内データを取り込み、統合知識ベースを構築します。</p>
      </div>

      <div className="ingestion-cards">
        <div className="ingest-card glass-panel">
          <div className="card-icon"><UploadCloud size={32} /></div>
          <h3>ファイルアップロード</h3>
          <p>PDF、Word、Excel、画像など、個別の戦略文書や議事録をアップロードします。</p>
          
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          
          <div className="upload-zone" onClick={handleUploadClick}>
            <p>クリックしてファイルを選択してください</p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>選択されたファイル:</h4>
              <ul>
                {selectedFiles.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
              <button 
                className="btn-primary start-btn" 
                onClick={handleStartAnalysis}
                disabled={ingestStatus === 'processing'}
              >
                ファイルをアップロードして解析を開始
              </button>
            </div>
          )}
        </div>

        <div className="ingest-card glass-panel">
          <div className="card-icon"><FolderSync size={32} /></div>
          <h3>フォルダ・SaaS連携</h3>
          <p>Google Drive、Notion、Slackなど、組織の共有ワークスペースと同期します。</p>
          <button className="btn-secondary" onClick={() => alert('SaaS連携は準備中です。')}>連携を設定する</button>
        </div>
      </div>

      {ingestStatus !== 'idle' && (
        <div className="ingestion-status glass-panel">
          <div className="status-header">
            <h3><Database size={20} /> 統合知識ベースの構築</h3>
          </div>
          
          {ingestStatus === 'processing' && (
            <div className="status-content processing">
              <Loader2 className="spinning-icon" size={24} />
              <div>
                <p><strong>ドキュメントを解析中...</strong></p>
                <p className="status-detail">エンティティ・因果関係の抽出、RAPTORによる階層的要約を行っています。</p>
              </div>
            </div>
          )}

          {ingestStatus === 'completed' && (
            <div className="status-content completed">
              <CheckCircle size={24} className="success-icon" />
              <div>
                <p><strong>ナレッジの統合が完了しました</strong></p>
                <p className="status-detail">組織のコンテキストがSIPに移植されました。抽出された知識をもとに初期診断を開始できます。</p>
              </div>
              <button className="btn-primary start-diagnostic-btn" onClick={handleNext}>
                初期診断を開始する <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
