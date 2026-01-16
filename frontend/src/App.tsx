import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HashRouter, BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { BiSTrackerPage } from './pages/BiSTrackerPage';
import { LootDistributionPage } from './pages/LootDistributionPage';
import { LootHistoryPage } from './pages/LootHistoryPage';
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
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Extract page from pathname (e.g., '/members' -> 'members' or '/#/members' -> 'members')
  const getActivePage = (): 'members' | 'bis' | 'loot' | 'history' => {
    // HashRouter uses location.hash (e.g., '#/members'), BrowserRouter uses location.pathname
    let path = location.pathname;
    if (location.hash) {
      // Extract path from hash (remove the #)
      path = location.hash.substring(1);
    }
    if (path.startsWith('/bis')) return 'bis';
    if (path.startsWith('/loot')) return 'loot';
    if (path.startsWith('/history')) return 'history';
    return 'members'; // default
  };

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
      <Sidebar activePage={getActivePage()} />
      <main className="App-main">
        <Routes>
          <Route path="/" element={<Navigate to="/members" replace />} />
          <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/bis" element={<ProtectedRoute><BiSTrackerPage /></ProtectedRoute>} />
          <Route path="/loot" element={<ProtectedRoute><LootDistributionPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><LootHistoryPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/members" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  // Use HashRouter for GitHub Pages compatibility
  // This allows the app to work without server-side routing configuration
  // Routes will be like: /#/members instead of /members
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
