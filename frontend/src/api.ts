// src/api.ts
// APIのベースURLを一元管理します。
// Viteの環境変数があればそれを使い、なければデフォルトのローカルホストを使用します。
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
