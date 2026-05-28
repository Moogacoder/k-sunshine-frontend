import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles } from 'lucide-react';
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
  const [isRulesEngineMode, setIsRulesEngineMode] = useState<boolean>(false);
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
      
      const isFallback = reply.includes("Running in Local Rules-Engine Mode");
      setIsRulesEngineMode(isFallback);

      const cleanedReply = reply
        .replace(/k-transparency/gi, 'Intelligent Transparency')
        .replace(/K-Sunshine Compliance AI/g, 'Intelligent Transparency Compliance AI')
        .replace(/k-sunshine/gi, 'Intelligent Transparency');

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: cleanedReply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.warn("Using high-performance local compliance rules-engine:", error);
      setIsRulesEngineMode(true);
      
      const text = userMessage.text.toLowerCase();
      let header = `*(⚠️ Running in Local Client Rules-Engine Mode. The compliance backend is offline. Showing rule-based statutory answers.)*\n\n`;
      let reply = header + `### Intelligent Transparency Rules Engine Active
Your question was analyzed by the local client-side compliance rules-engine.

#### Local Rules Capabilities:
- **South Korea Sunshine Act (PAA Article 47-2)**: Meal caps, promotional limits, advisory session caps.
- **Italy Sanità Trasparente (Law 62/2022)**: CF validation, €1k agreements, €5k sponsorships thresholds.
- **Colombia SISPRO (Resolution 2881)**: 1,500,000 COP reporting limit, 4,000 COP exchange rate routing.
- **France Loi Bertrand**: €10 benefit minimum registry publication.
- **United States CMS Open Payments**: $500 covered clinician warning cap.

To query a jurisdiction directly, type its name (e.g. *Korea*, *Italy*, *Colombia*, *France*, *USA*), ask about *limits* / *meals*, or ask about *remediation* procedures.

*To re-enable live Gemini 3.5 Flash semantic analysis, please start the backend API gateway server.*`;
      
      if (text.includes('colombia') || text.includes('rtvss') || text.includes('2881') || text.includes('cop')) {
        reply = header + `### Colombia Transparency Rules (Resolution 2881 / RTVSS)
Under Colombia's Resolution 2881 of 2018, any transfer of value exceeding **1,500,000 COP** (approx. $375 USD) to a Healthcare Professional (HCP) must be reported via the SISPRO platform.
- **Reporting Deadlines**: Semi-annual. Sept 30 (for H1: Jan-Jun) and March 31 (for H2: Jul-Dec).
- **Core Categories**: HONORARIOS (Fees), REUNIONES (Briefings/Meals), VIAJES (Travel), and DONACIONES (Donations).
- **Standard Exchange Rate**: 1 USD = 4,000 COP for system mapping.`;
      } else if (text.includes('france') || text.includes('bertrand') || text.includes('loi')) {
        reply = header + `### France Transparency Rules (Loi Bertrand / Transparence Santé)
Under France's Loi Bertrand, life science companies producing or marketing cosmetics, medical devices, or pharmaceuticals must publicly disclose all agreements, benefits, and remuneration:
- **Core Thresholds**: Benefits/remuneration of **€10 or more** must be declared. Agreements are reportable regardless of value.
- **Compliance Alerts**: Hospitality exceeding **€150** or advisory fees exceeding **€500** will trigger system alerts.
- **Reporting Deadlines**: Semi-annual. H1 data due Sept 1; H2 data due March 1.`;
      } else if (text.includes('italy') || text.includes('sanita') || text.includes('62/2022') || text.includes('legge') || text.includes('trasparente')) {
        reply = header + `### Italy Transparency Rules (Sanità Trasparente / Law 62 of 2022)
Under Italy's Law 62/2022 (Sanità Trasparente), manufacturers must report all relationships with HCPs and HCOs:
- **Core Thresholds**: HCP agreements above **€1,000** or HCO donations/sponsorships above **€5,000** must be uploaded.
- **Filing Window**: Phase 1 is typically due by April 30, and Phase 2 by October 31.
- **Required Identifiers**: A valid 16-character Codice Fiscale or Partita IVA is mandatory for all recipients.`;
      } else if (text.includes('usa') || text.includes('us ') || text.includes('open payments') || text.includes('cms')) {
        reply = header + `### USA Transparency Rules (CMS Open Payments / Physician Payments Sunshine Act)
Under the US Physician Payments Sunshine Act, manufacturers must report all transfers of value to covered recipients (physicians, teaching hospitals, and advanced practice clinicians):
- **Core Thresholds**: Individual value transfers above **$500** trigger compliance warning thresholds.
- **Reporting Deadlines**: Annual collection (Jan 1 - Dec 31). Submission must be completed by March 31 of the following year.`;
      } else if (text.includes('south korea') || text.includes('korea') || text.includes('sunshine') || text.includes('krpia')) {
        reply = header + `### South Korea Sunshine Act (Pharmaceutical Affairs Act Article 47-2)
Under South Korea's Sunshine Act, applicable manufacturers must log all value transfers including food, beverages, promotional items, and academic support:
- **Statutory Limits**:
  - **Meals**: Capped at **₩100,000** per HCP per session.
  - **Promotional Items**: Capped at **₩10,000** (₩50,000 for multi-institution events).
  - **Consultancy/Advisory**: Capped at **₩500,000** per session, **₩1,000,000** per day, and a cumulative annual cap of **₩3,000,000** per HCP.
- **Filing Window**: Annual compilation within 3 months of fiscal year-end, with a mandated 5-year retention for MOHW audits.`;
      } else if (text.includes('limit') || text.includes('presentation') || text.includes('briefing') || text.includes('food') || text.includes('beverage') || text.includes('meal') || text.includes('threshold')) {
        reply = header + `### Statutory Compliance Thresholds Comparison

Here is a comparative summary of global transparency thresholds configured in the system:

| Jurisdiction | Meal Cap | Promotional Cap | Advisory Cap | Submission Deadline |
| :--- | :--- | :--- | :--- | :--- |
| **South Korea** | ₩100,000 / session | ₩10,000 (₩50,000 multi-inst) | ₩500,000 / session | Annual (within 3 months of FY end) |
| **Italy** | €150 (Hospitality cap) | N/A | €1,000 threshold | Semi-annual (Apr 30 / Oct 31) |
| **France** | €150 (Hospitality cap) | €10 minimum threshold | €500 threshold | Semi-annual (Sept 1 / March 1) |
| **Colombia** | Included in 1.5M COP limit | N/A | 1,500,000 COP threshold | Semi-annual (Sept 30 / March 31) |
| **United States** | N/A | N/A | $500 threshold | Annual (by March 31) |

*Transactions exceeding these regional caps in the Global Data Center will be automatically flagged for compliance remediation.*`;
      } else if (text.includes('remediation') || text.includes('flagged') || text.includes('resolved') || text.includes('violation')) {
        reply = header + `### Data Center Remediation Workflow
The remediation engine automatically flags transactions exceeding standard regional limits.
- **Actionable Steps**:
  1. Navigate to the **Data Remediation** dashboard.
  2. View any flagged items (marked in amber/red).
  3. Edit records directly using the inline explorer to fix missing fields (e.g. License Number / Codice Fiscale).
  4. Approve/resolve the transactions to prepare them for final ledger commitment.`;
      } else if (text.includes('hello') || text.includes('hi') || text.includes('welcome') || text.includes('help')) {
        reply = `### Welcome to the Intelligent Transparency Compliance Assistant!
I am operating in **Local Rules-Engine Fallback Mode** because the compliance backend is offline.

#### Suggested Compliance Questions:
* *"What is the meal cap for South Korea Sunshine Act?"*
* *"Explain Italy's Law 62/2022 filing deadlines."*
* *"What are Colombia's Resolution 2881 thresholds?"*
* *"Show me a comparison table of statutory limits by country."*
* *"How do I resolve flagged records?"*

How can I help you audit your global transparency ledger today?`;
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
 
      {isRulesEngineMode && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#f59e0b'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
            <strong>Local Rules-Engine Active:</strong> Operating in local fallback mode because the live Gemini AI engine is unconfigured or offline. Ask any statutory compliance question!
          </div>
        </div>
      )}

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                background: msg.sender === 'user' ? 'var(--primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                overflow: 'hidden'
              }}>
                {msg.sender === 'user' ? <User size={20} color="white" /> : <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="EngageAgent" style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'white', padding: '2px' }} />}
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
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', background: 'white', padding: '2px', border: '1px solid var(--border-color)' }}>
                <img src="https://www.qordata.com/wp-content/uploads/2019/10/Updated_Logo_transparent.png" alt="EngageAgent" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
