import { useState, useRef, useEffect } from 'react';
import { X, Send, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { APIGateway } from '../datacenter/api_gateway';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const AgentWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Drag Resizing States (defaults matching original static sizes)
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(500);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Resizing from top-left anchors to bottom-right:
      // Leftward drag (negative deltaX) increases width.
      // Upward drag (negative deltaY) increases height.
      const newWidth = Math.max(300, Math.min(800, startWidth - deltaX));
      const newHeight = Math.max(400, Math.min(800, startHeight - deltaY));

      setWidth(newWidth);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Determine standard route greeting
  const getGreetingForRoute = (path: string) => {
    let contextName = "Global compliance transparency databases";
    if (path.includes('/remediation')) {
      contextName = "Data Remediation workflow and flagged validation anomalies";
    } else if (path.includes('/ingestion')) {
      contextName = "Local data files and spreadsheet ingestion processes";
    } else if (path.includes('/reporting')) {
      contextName = "Statutory disclosure reports generation";
    } else if (path.includes('/calendar')) {
      contextName = "Global transparency deadlines and filing timelines";
    } else if (path.includes('/audit')) {
      contextName = "System trail log records and security tracking";
    }
    
    return `Hello! I am your Global Transparency compliance copilot. I noticed you are viewing the **${contextName}** portal. Ask me anything about regional thresholds, regulatory limits, or how to resolve staging issues on this page!`;
  };

  // Re-initialize greeting when route changes
  useEffect(() => {
    setMessages([
      {
        id: 'widget-welcome',
        sender: 'bot',
        text: getGreetingForRoute(location.pathname),
        timestamp: new Date()
      }
    ]);
  }, [location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await APIGateway.sendChatQuery(userMsg.text, location.pathname);
      
      const cleanedReply = reply
        .replace(/k-transparency/gi, 'Intelligent Transparency')
        .replace(/K-Sunshine Compliance AI/g, 'Intelligent Transparency Compliance AI')
        .replace(/k-sunshine/gi, 'Intelligent Transparency');

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: cleanedReply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.warn("Agent widget error, using rule explanation:", err);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I was unable to consult the compliance server. Please verify your internet connection or check the backend services.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="agent-widget" style={{ zIndex: 1000 }}>
      <div 
        className={`agent-panel ${isOpen ? '' : 'hidden'}`} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: `${width}px`,
          height: `${height}px`,
          position: 'absolute',
          bottom: '80px',
          right: 0
        }}
      >
        {/* Resizable drag handle (top-left corner) */}
        <div 
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
            zIndex: 110,
            borderTop: '2px solid var(--text-muted)',
            borderLeft: '2px solid var(--text-muted)',
            borderTopLeftRadius: 'var(--radius-md)'
          }}
        />
        <div className="agent-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
          <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="EngageAgent" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'contain', background: 'white', padding: '2px', border: '1px solid var(--border-color)' }} />
          <div style={{ marginLeft: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 'bold' }}>Compliance Agent</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by Gemini 3.5 Flash</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="agent-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: '8px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ 
                width: '28px', height: '28px', borderRadius: '50%', 
                background: msg.sender === 'user' ? 'var(--primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                overflow: 'hidden'
              }}>
                {msg.sender === 'user' ? <User size={14} color="white" /> : <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="Agent" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'white', padding: '2px' }} />}
              </div>
              <div style={{ 
                background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.03)', 
                color: 'var(--text-primary)', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                maxWidth: '80%',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                border: '1px solid var(--border-color)',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'row' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', background: 'white', padding: '2px', border: '1px solid var(--border-color)' }}>
                <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="Agent" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Consulting regulations...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="agent-input-container" style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="agent-input" 
            placeholder="Ask about compliance rules..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-main)', 
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{ padding: '8px 12px', borderRadius: '6px' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="agent-button" onClick={() => setIsOpen(!isOpen)} style={{ transform: isOpen ? 'scale(0)' : 'scale(1)', cursor: 'pointer', overflow: 'hidden', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid var(--border-color)' }}>
        <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="Agent" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </div>
  );
};

export default AgentWidget;
