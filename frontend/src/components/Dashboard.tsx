import React from 'react';
import { Activity, Target, Network, Layers } from 'lucide-react';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h2>戦略ダッシュボード</h2>
        <p>抽出された戦略変数と因果ループの状況</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>戦略変数</h3>
            <p className="stat-value">24</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Network size={24} /></div>
          <div className="stat-info">
            <h3>因果ループ</h3>
            <p className="stat-value">5</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Layers size={24} /></div>
          <div className="stat-info">
            <h3>適用フレームワーク</h3>
            <p className="stat-value">3</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Target size={24} /></div>
          <div className="stat-info">
            <h3>戦略信頼度スコア</h3>
            <p className="stat-value">82%</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="glass-panel map-panel">
          <h3>因果ループマップ (プレビュー)</h3>
          <div className="placeholder-map">
            <p>※ここにD3.js等を用いたシステムダイナミクス図やFCM（ファジィ認知地図）が表示されます。</p>
          </div>
        </div>
        <div className="glass-panel list-panel">
          <h3>最近の思考トレース</h3>
          <ul className="trace-list">
            <li>
              <span className="trace-time">10:45</span>
              <span className="trace-desc">The AnalystがPESTEL分析を完了しました。</span>
            </li>
            <li>
              <span className="trace-time">10:47</span>
              <span className="trace-desc">Devil's Advocateが新規参入リスクを指摘しました。</span>
            </li>
            <li>
              <span className="trace-time">10:50</span>
              <span className="trace-desc">Orchestratorが防御戦略の生成を指示しました。</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
