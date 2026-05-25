import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AgentWidget from './components/AgentWidget';
import Dashboard from './pages/Dashboard';
import Ingestion from './pages/Ingestion';
import SourceFiles from './pages/SourceFiles';
import Remediation from './pages/Remediation';
import Reporting from './pages/Reporting';
import DataExplorer from './pages/DataExplorer';
import AuditLogs from './pages/AuditLogs';
import AIAssistant from './pages/AIAssistant';
import Login from './pages/Login';
import DataCenter from './pages/DataCenter';
import ItalyDashboard from './pages/ItalyDashboard';
import ItalyReporting from './pages/ItalyReporting';
import ColombiaDashboard from './pages/ColombiaDashboard';
import ColombiaReporting from './pages/ColombiaReporting';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

const AppLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content animate-fade-in">
        <Routes>
          <Route path="/" element={<Navigate to="/datacenter" replace />} />
          <Route path="/datacenter" element={<DataCenter />} />
          <Route path="/global-data-status" element={<DataCenter defaultTab="compliance_map" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/source-files" element={<SourceFiles />} />
          <Route path="/ingestion" element={<Ingestion />} />
          <Route path="/remediation" element={<Remediation />} />
          <Route path="/reporting" element={<Reporting />} />
          <Route path="/italy/dashboard" element={<ItalyDashboard />} />
          <Route path="/italy/reporting" element={<ItalyReporting />} />
          <Route path="/italy/data" element={<DataExplorer />} />
          <Route path="/italy/remediation" element={<Remediation />} />
          <Route path="/italy/ingestion" element={<Ingestion />} />
          <Route path="/italy/source-files" element={<SourceFiles />} />
          <Route path="/colombia/dashboard" element={<ColombiaDashboard />} />
          <Route path="/colombia/reporting" element={<ColombiaReporting />} />
          <Route path="/colombia/data" element={<DataExplorer />} />
          <Route path="/colombia/remediation" element={<Remediation />} />
          <Route path="/colombia/ingestion" element={<Ingestion />} />
          <Route path="/colombia/source-files" element={<SourceFiles />} />
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
