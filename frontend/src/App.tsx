import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { LanguagePicker } from './components/LanguagePicker';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ChatWindow } from './components/ChatWindow';
import { StatesPage } from './pages/StatesPage';
import { ChallanPage } from './pages/ChallanPage';
import { TravelPage } from './pages/TravelPage';
import { ExplainPage } from './pages/ExplainPage';
import { MessageSquare, Map, Calculator, Route, FileText, Scale } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'states' | 'challan' | 'travel' | 'explain'>('chat');

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatWindow />;
      case 'states':
        return <StatesPage />;
      case 'challan':
        return <ChallanPage />;
      case 'travel':
        return <TravelPage />;
      case 'explain':
        return <ExplainPage />;
      default:
        return <ChatWindow />;
    }
  };

  return (
    <div className="app-container">
      {/* Decorative Glow Orbs */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Offline Status bar */}
      <OfflineIndicator />

      {/* Navigation Header */}
      <header className="app-header">
        <div className="header-content">
          <a href="#" className="logo" onClick={() => setActiveTab('chat')}>
            <Scale size={24} className="text-primary" />
            Drive<span>Legal</span>
          </a>

          <nav className="main-nav">
            <a
              href="#"
              className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              Chatbot
            </a>
            <a
              href="#"
              className={`nav-link ${activeTab === 'states' ? 'active' : ''}`}
              onClick={() => setActiveTab('states')}
            >
              <Map size={16} />
              State Rules
            </a>
            <a
              href="#"
              className={`nav-link ${activeTab === 'challan' ? 'active' : ''}`}
              onClick={() => setActiveTab('challan')}
            >
              <Calculator size={16} />
              Challan Calc
            </a>
            <a
              href="#"
              className={`nav-link ${activeTab === 'travel' ? 'active' : ''}`}
              onClick={() => setActiveTab('travel')}
            >
              <Route size={16} />
              Travel Route
            </a>
            <a
              href="#"
              className={`nav-link ${activeTab === 'explain' ? 'active' : ''}`}
              onClick={() => setActiveTab('explain')}
            >
              <FileText size={16} />
              Law Explainer
            </a>
          </nav>

          <div className="header-actions">
            <LanguagePicker />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {renderActiveComponent()}
      </main>

      {/* Simple Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)', zIndex: 10 }}>
        <p>© {new Date().getFullYear()} DriveLegal - Indian Traffic Rules & Fines Advisor. All Rights Reserved.</p>
        <p style={{ marginTop: '0.25rem' }}>Designed for legal awareness. Obey speed limits, wear seat belts & helmets, and drive safely.</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
