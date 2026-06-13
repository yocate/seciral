import React, { useState } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import './DiagnosticSession.css';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const DiagnosticSession: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Strategy Intelligence Platformへようこそ。まずは貴社の現状について教えてください。現在の事業フェーズと、最も大きな課題は何だと認識していますか？'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // API call to the mock FastAPI backend
      const response = await fetch('http://localhost:8000/api/diagnostic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_input: input })
      });
      const data = await response.json();
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('API Error:', error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: '通信エラーが発生しました。バックエンドAPIが起動しているか確認してください。' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="diagnostic-container glass-panel animate-fade-in">
      <div className="diagnostic-header">
        <h2>初期診断セッション</h2>
        <p>組織のコンテキストと課題をAIと共に構造化します。</p>
      </div>

      <div className="chat-area">
        {messages.map(msg => (
          <div key={msg.id} className={`message-bubble ${msg.sender}`}>
            <div className="message-avatar">
              {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-bubble ai">
            <div className="message-avatar"><Bot size={20} /></div>
            <div className="message-content">
              <Loader2 className="spinning-icon" size={20} /> 分析中...
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input 
          type="text" 
          className="input-field" 
          placeholder="課題や状況を入力してください..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              handleSend();
            }
          }}
        />
        <button className="btn-primary icon-btn" onClick={handleSend} disabled={isLoading}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
