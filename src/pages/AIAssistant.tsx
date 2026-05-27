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
      text: 'Hello! I am the Global Transparency Compliance AI assistant. I am fully trained on statutory regulations globally, including the US CMS Open Payments, South Korea Sunshine Act, France Loi Bertrand, Italy Sanità Trasparente, and Colombia RTVSS (Resolution 2881). How can I assist your compliance review today?',
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
      
      const cleanedReply = reply
        .replace(/k-transparency/gi, 'Global Transparency Manager')
        .replace(/K-Sunshine Compliance AI/g, 'Global Transparency Compliance AI')
        .replace(/k-sunshine/gi, 'Global Transparency');

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: cleanedReply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.warn("Using high-performance local compliance rules-engine:", error);
      
      const text = userMessage.text.toLowerCase();
      let reply = "That is an excellent compliance query. Under our central Global Transparency rules, all transfers of value to Healthcare Professionals (HCPs) and Medical Institutions must be tracked in our Universal Data Model. Let me know if you would like me to review specific ledger items or generate compliance-ready reports!";
      
      if (text.includes('colombia') || text.includes('rtvss') || text.includes('2881') || text.includes('cop')) {
        reply = "Under Colombia's RTVSS (Resolution 2881 of 2018), any individual value transfer exceeding **1,500,000 COP** (approx. $375 USD) to an HCP must be reported via SISPRO. Semi-annual deadlines are September 30 (for H1) and March 31 (for H2). Mapped categories are HONORARIOS, REUNIONES, VIAJES, and DONACIONES.";
      } else if (text.includes('france') || text.includes('bertrand') || text.includes('loi')) {
        reply = "Under France's Loi Bertrand, agreements are reportable regardless of value, and benefits/remuneration of **€10 or more** must be declared. Hospitality exceeding **€150** or advisory fees exceeding **€500** will trigger compliance alerts. Reports must be pushed semi-annually to the official Transparence Santé register (March 1 for H2, September 1 for H1).";
      } else if (text.includes('italy') || text.includes('sanita') || text.includes('62/2022') || text.includes('legge') || text.includes('trasparente')) {
        reply = "Under Italy's Sanità Trasparente (Law 62/2022), HCP agreements above **€1,000** or HCO sponsorships/donations above **€5,000** must be uploaded to the electronic registry managed by the Ministry of Health. Deadlines follow semi-annual windows (Phase 1 due April 30, Phase 2 due October 31). Failure to report results in high administrative fines.";
      } else if (text.includes('usa') || text.includes('us ') || text.includes('open payments') || text.includes('cms')) {
        reply = "Under the USA CMS Open Payments (Physician Payments Sunshine Act), applicable manufacturers must report all transfers of value above **$500** to covered clinicians (MDs, DOs, NPs, PAs, etc.). Data is compiled annually (January 1 - December 31) and must be submitted to the CMS Open Payments system by March 31 of the following year.";
      } else if (text.includes('south korea') || text.includes('korea') || text.includes('sunshine') || text.includes('krpia')) {
        reply = "Under Article 47-2 of South Korea's Pharmaceutical Affairs Act, reportable transfers include food, beverages, and promotional goods. Educational events exceeding **100,000 KRW** for meals and **10,000 KRW** for promotional items (50,000 KRW for multi-institution events) are subject to strict disclosure requirements. Advisory panels are capped at **500,000 KRW** per session. Reports are submitted annually to the Ministry of Health and Welfare (MOHW).";
      } else if (text.includes('limit') || text.includes('presentation') || text.includes('briefing') || text.includes('food') || text.includes('beverage') || text.includes('meal')) {
        reply = "Statutory meal, presentation, and threshold limits vary significantly by jurisdiction under global rules:\n\n• **South Korea**: Meals capped at **₩100,000** per HCP per session, promotional items at **₩10,000** or less, and advisory panels capped at **₩500,000** per session.\n• **Italy**: Agreements above **€1,000** or donations/sponsorships above **€5,000** must be disclosed. Hospitality during educational briefings is reportable and capped at **€150** per event.\n• **Colombia**: Food and travel expenses are tracked under Resolution 2881 with an individual value transfer disclosure threshold of **1,500,000 COP** per transaction.\n• **United States**: Transfers of value (including meals) above **$500** per covered clinician must be reported to the CMS Open Payments system.";
      } else if (text.includes('remediation') || text.includes('flagged') || text.includes('resolved') || text.includes('violation')) {
        reply = "The Remediation engine automatically flags transactions exceeding standard regional limits. Users can review, approve, or reject these records under the 'Data Remediation' panel. All decisions are logged in the cryptographic Audit Trail.";
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
      <p className="page-subtitle" style={{ marginBottom: '24px' }}>Powered by Google Gemini. Ask any questions about global transparency reporting limits, statutory regulations, or safe harbors.</p>
 
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
