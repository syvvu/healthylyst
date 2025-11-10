// App Router Setup with Tab-Based Navigation
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TabNavigation from './components/TabNavigation';
import DashboardTab from './pages/DashboardTab';
import TimelineTab from './pages/TimelineTab';
import InsightsHub from './pages/InsightsHub';
import MetricsTab from './pages/MetricsTab';
import SettingsModal from './components/SettingsModal';
import AboutTab from './pages/AboutTab';
import AIHealthAssistant from './components/AIHealthAssistant';
import { useState, useEffect } from 'react';
import { loadAllHealthData } from './utils/dataLoader';

// Protected Route Wrapper
const ProtectedRoutes = ({ allHealthData, aiChatOpen, setAiChatOpen }) => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleOpenSettings = () => {
    setSettingsModalOpen(true);
  };


  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)' }}>
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <DashboardTab 
              allHealthData={allHealthData} 
              onOpenSettings={handleOpenSettings}
            />
          } 
        />
        <Route 
          path="/timeline" 
          element={
            <TimelineTab 
              allHealthData={allHealthData} 
              onOpenSettings={handleOpenSettings}
            />
          } 
        />
        <Route 
          path="/insights" 
          element={
            <InsightsHub 
              allHealthData={allHealthData} 
              onOpenSettings={handleOpenSettings}
            />
          } 
        />
        <Route 
          path="/metrics" 
          element={
            <MetricsTab 
              allHealthData={allHealthData} 
              onOpenSettings={handleOpenSettings}
            />
          } 
        />
        <Route 
          path="/about" 
          element={
            <AboutTab 
              allHealthData={allHealthData}
              onOpenSettings={handleOpenSettings}
            />
          } 
        />
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Redirect old routes to new tab structure */}
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/correlations" element={<Navigate to="/insights" replace />} />
        <Route path="/anomalies" element={<Navigate to="/insights" replace />} />
        <Route path="/connections" element={<Navigate to="/dashboard" replace />} />
        <Route path="/data" element={<Navigate to="/dashboard" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
        <Route path="/sources" element={<Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* Tab Navigation - Fixed at bottom */}
      <TabNavigation 
        onOpenAIChat={() => setAiChatOpen(true)}
        newInsightsCount={0} // Can be calculated from insights
      />
      
      {/* AI Health Assistant */}
      <AIHealthAssistant 
        isOpen={aiChatOpen} 
        onClose={() => setAiChatOpen(false)}
        allHealthData={allHealthData}
      />
      
      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        allHealthData={allHealthData}
        onLogout={() => {
          // Handle logout
          localStorage.removeItem('onboarding_completed');
          window.location.href = '/dashboard';
        }}
      />
    </div>
  );
};

const AppRouter = () => {
  const [allHealthData, setAllHealthData] = useState(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const data = await loadAllHealthData();
      setAllHealthData(data);
    };
    loadData();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Protected Routes */}
        <Route path="/*" element={
          <ProtectedRoutes 
            allHealthData={allHealthData} 
            aiChatOpen={aiChatOpen}
            setAiChatOpen={setAiChatOpen}
          />
        } />
      </Routes>
    </Router>
  );
};

export default AppRouter;
