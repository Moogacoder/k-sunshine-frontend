import { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';

const AgentWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="agent-widget">
      <div className={`agent-panel ${isOpen ? '' : 'hidden'}`}>
        <div className="agent-header">
          <Bot size={24} color="var(--primary-glow)" />
          <div>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Compliance Agent</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by Gemini 3.1 Flash</span>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div className="agent-messages">
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Hello! I'm your Global Transparency compliance assistant. I can help you validate spend rules, explain remediation steps, or guide you through regional reporting formats. How can I assist you today?</p>
          </div>
        </div>
        
        <div className="agent-input-container">
          <input type="text" className="agent-input" placeholder="Ask about compliance rules..." />
          <button className="btn btn-primary" style={{ padding: '10px' }}>
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="agent-button" onClick={() => setIsOpen(!isOpen)} style={{ transform: isOpen ? 'scale(0)' : 'scale(1)' }}>
        <Bot size={28} />
      </div>
    </div>
  );
};

export default AgentWidget;
