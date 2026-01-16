import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PinUpdateDialog } from './PinUpdateDialog';
import { PermissionRole } from '../types/member';
import { PermissionRoleTag } from './Tag';
import { Button } from './Button';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  page: 'members' | 'bis' | 'loot' | 'history';
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  icon?: React.ReactNode;
}

interface SidebarProps {
  activePage: 'members' | 'bis' | 'loot' | 'history';
}

// Minimalist SVG icons (monochrome, no colors)
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const PackageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

/**
 * Sidebar navigation component styled similar to FFXIV Teamcraft
 */
export const Sidebar: React.FC<SidebarProps> = ({ activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['loot']));
  const [showPinDialog, setShowPinDialog] = useState(false);

  const navGroups: NavGroup[] = [
    {
      id: 'loot',
      label: 'Loot',
      icon: <BoxIcon />,
      items: [
        { id: 'members', label: 'Members', icon: <UsersIcon />, page: 'members', path: '/members' },
        { id: 'bis', label: 'BiS Tracker', icon: <CheckSquareIcon />, page: 'bis', path: '/bis' },
        { id: 'loot', label: 'Loot Distribution', icon: <PackageIcon />, page: 'loot', path: '/loot' },
        { id: 'history', label: 'History', icon: <HistoryIcon />, page: 'history', path: '/history' },
      ],
    },
  ];

  const handlePageChange = (path: string) => {
    navigate(path);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img 
            src={`${process.env.PUBLIC_URL}/pp-icon.jpg`}
            alt="App Icon" 
            className="app-icon"
            onError={(e) => {
              // Show a placeholder instead of the broken image
              (e.target as HTMLImageElement).style.backgroundColor = 'var(--tc-bg-card)';
            }}
          />
        </div>
        <h1 className="app-title">Brain damage is a choice</h1>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          
          return (
            <div key={group.id} className="nav-group">
              <button
                className="nav-group-header"
                onClick={() => toggleGroup(group.id)}
              >
                {group.icon && <span className="nav-group-icon">{group.icon}</span>}
                <span className="nav-group-label">{group.label}</span>
                <span className={`nav-group-arrow ${isExpanded ? 'expanded' : ''}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </button>
              
              {isExpanded && (
                <div className="nav-group-items">
                  {group.items.map(item => {
                    const isActive = location.pathname === item.path || 
                                    (item.path === '/members' && location.pathname === '/');
                    return (
                      <button
                        key={item.id}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => handlePageChange(item.path)}
                      >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span className="nav-item-label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-info">
            <span className="user-name-with-role">
              <span className="user-name">{user.name}</span>
              <PermissionRoleTag permissionRole={user.permissionRole ?? PermissionRole.User} />
            </span>
          </div>
        )}
        <Button 
          variant="outlined"
          size="small"
          onClick={() => setShowPinDialog(true)}
          startIcon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"></path>
              <path d="M21 2l-9 9"></path>
            </svg>
          }
        >
          Update PIN
        </Button>
        <Button 
          variant="outlined"
          color="error"
          size="small"
          onClick={logout}
          startIcon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          }
        >
          Logout
        </Button>
      </div>
      <PinUpdateDialog isOpen={showPinDialog} onClose={() => setShowPinDialog(false)} />
    </aside>
  );
};

