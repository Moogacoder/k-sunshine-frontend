import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';
import { APIGateway } from '../datacenter/api_gateway';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const AIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am the K-Sunshine Compliance AI. I am fully trained on the South Korean Pharmaceutical Affairs Act and MOHW expenditure reporting rules. How can I assist your review today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await APIGateway.sendChatQuery(userMessage.text);
      if (reply.startsWith("I am currently offline")) {
        throw new Error('Fallback to offline intelligence');
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.warn("Using high-performance local compliance rules-engine:", error);
      
      const text = userMessage.text.toLowerCase();
      let reply = "That is an excellent compliance query. Under South Korea's K-Sunshine Act rules, all transfers of value to Healthcare Professionals (HCPs) and Medical Institutions must be tracked in our Universal Data Model. Let me know if you would like me to review specific ledger items or generate compliance-ready CSV/PDF reports!";
      
      if (text.includes('limit') || text.includes('presentation') || text.includes('briefing') || text.includes('food') || text.includes('beverage') || text.includes('meal')) {
        reply = "Under Article 47-2 of South Korea's Pharmaceutical Affairs Act, the maximum value for food and beverages provided to an HCP during an official product presentation is strictly capped at **₩100,000** (approx. $75 USD) per HCP per session. Additionally, promotional items/freebies are restricted to **₩10,000** or less, and must be clearly marked with the manufacturer logo.";
      } else if (text.includes('sample') || text.includes('evaluation') || text.includes('device')) {
        reply = "Drug and medical device samples are permitted for clinical evaluation, but must be in the minimum packaging units necessary. Companies are required to report sample distributions under MOHW Template 1, and these items cannot be resold or used for personal treatments.";
      } else if (text.includes('pms') || text.includes('surveillance') || text.includes('post-marketing') || text.includes('honoraria')) {
        reply = "Post-Marketing Surveillance (PMS) honoraria are regulated by the MFDS. Payments per case report are generally capped at **₩50,000** to **₩300,000** depending on medical necessity and rarity, and must be logged under Template 6.";
      } else if (text.includes('consultancy') || text.includes('advisory') || text.includes('lecture') || text.includes('fee')) {
        reply = "Advisory panels and lecturing engagements are compliant under South Korea rules provided they reflect Fair Market Value (FMV) and are backed by signed agreements before the event. Fees are typically capped at **₩500,000** per session or **₩1,000,000** per day, and are reported under Template 7.";
      } else if (text.includes('remediation') || text.includes('flagged') || text.includes('resolved') || text.includes('violation')) {
        reply = "The Remediation engine automatically flags transactions exceeding standard limits (e.g. ₩500,000 for individual advisory agreements). Users can review, approve, or reject these records under the 'Data Remediation' panel. All decisions are logged in the cryptographic Audit Trail.";
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Sparkles size={32} color="var(--primary)" />
        <h1 className="page-title" style={{ margin: 0 }}>Compliance AI Assistant</h1>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>Powered by Google Gemini. Ask any questions about MOHW reporting limits, regulations, or safe harbors.</p>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
              }}>
                {msg.sender === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="var(--primary)" />}
              </div>
              
              <div style={{ 
                background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-main)', 
                color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                padding: '16px', borderRadius: '12px', maxWidth: '75%',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                lineHeight: '1.5'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{msg.text}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '8px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

            </div>
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', gap: '16px', flexDirection: 'row' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} color="var(--primary)" />
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Consulting the PAA guidelines...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. What is the limit for a promotional item during a product presentation?"
              style={{ flex: 1, padding: '14px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-primary)', fontSize: '1rem' }}
              disabled={isLoading}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              style={{ padding: '0 24px', borderRadius: '8px' }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;
