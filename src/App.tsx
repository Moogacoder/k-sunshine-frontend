import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AgentWidget from './components/AgentWidget';
import Dashboard from './pages/Dashboard';
import Ingestion from './pages/Ingestion';
import Remediation from './pages/Remediation';
import Reporting from './pages/Reporting';
import DataExplorer from './pages/DataExplorer';
import AuditLogs from './pages/AuditLogs';
import AIAssistant from './pages/AIAssistant';
import Login from './pages/Login';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ingestion" element={<Ingestion />} />
          <Route path="/remediation" element={<Remediation />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/assistant" element={<AIAssistant />} />
        </Routes>
      </main>
      <AgentWidget />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
