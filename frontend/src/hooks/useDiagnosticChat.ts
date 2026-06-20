import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

export interface Evaluation {
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  sources: string[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  evaluation?: Evaluation;
}

export const useDiagnosticChat = (sessionId: string | null, userId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnostic/history?session_id=${sessionId}`);
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        const loadedMessages = data.history.map((h: any, i: number) => ({
          id: `hist_${i}`,
          sender: h.sender,
          text: h.text
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([
          {
            id: '1',
            sender: 'ai',
            text: 'Project Workspaceへようこそ。まずは作成したいドキュメントのテンプレートを左側から選んでください。その後、必要な資料があればアップロードし、私と会話を始めましょう。'
          }
        ]);
      }
    } catch (err) {
      console.error("History load error:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = async (text: string) => {
    if (!sessionId || !text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId, template_id: 'default_session', author_id: userId })
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || '応答がありませんでした。'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: 'エラーが発生しました。通信を確認してください。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const ingestSession = async (user: any) => {
    if (!sessionId) return false;
    setIsIngesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/diagnostic/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          author: user?.display_name || localStorage.getItem('sip_author') || 'System',
          department: user?.department || localStorage.getItem('sip_department') || 'General',
          career: user?.career || localStorage.getItem('sip_career') || '',
          characteristics: user?.characteristics || localStorage.getItem('sip_characteristics') || '',
          author_id: user?.id || null
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        return true;
      } else {
        console.error(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsIngesting(false);
    }
    return false;
  };

  const reviewDeliverable = async (deliverableText: string) => {
    if (!sessionId || !deliverableText.trim()) return false;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: `【成果物レビュー依頼】\n${deliverableText}`
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, deliverable_text: deliverableText, author_id: userId })
      });
      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'レビュー結果がありません。'
      };
      setMessages(prev => [...prev, aiMessage]);
      return true;
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: 'レビュー中にエラーが発生しました。' }]);
      return false;
    }
  };

  return { messages, isLoading, isIngesting, sendMessage, ingestSession, reviewDeliverable };
};
