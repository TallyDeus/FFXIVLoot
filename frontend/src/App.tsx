import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { BiSTrackerPage } from './pages/BiSTrackerPage';
import { LootDistributionPage } from './pages/LootDistributionPage';
import { LootHistoryPage } from './pages/LootHistoryPage';
import { RaidTiersPage } from './pages/RaidTiersPage';
import { RaidPlansPage } from './pages/RaidPlansPage';
import { SchedulePage } from './pages/SchedulePage';
import { Sidebar } from './components/Sidebar';
import { theme } from './theme';
import './App.css';

/**
 * Protected route wrapper
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Main application component with URL-based routing
 */
function AppContent() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="App">
      <Sidebar />
      <main className="App-main">
        <Routes>
          <Route path="/" element={<Navigate to="/schedule" replace />} />
          <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/raid-tiers" element={<ProtectedRoute><RaidTiersPage /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/bis" element={<ProtectedRoute><BiSTrackerPage /></ProtectedRoute>} />
          <Route path="/loot" element={<ProtectedRoute><LootDistributionPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><LootHistoryPage /></ProtectedRoute>} />
          <Route path="/raid-plans" element={<ProtectedRoute><RaidPlansPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const Router = process.env.NODE_ENV === 'production' ? HashRouter : BrowserRouter;
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
