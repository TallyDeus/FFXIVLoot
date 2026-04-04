import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PinUpdateDialog } from './PinUpdateDialog';
import { raidTierService } from '../services/api/raidTierService';
import { scheduleService } from '../services/api/scheduleService';
import { ScheduleConsensus } from '../types/schedule';
import { mondayOfWeekIso, scheduleRangeStartMonday, todayLocalIso } from '../utils/scheduleDates';
import { PermissionRole } from '../types/member';
import { PermissionRoleTag } from './Tag';
import { Button } from './Button';
import { signalRService } from '../services/signalrService';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  icon?: React.ReactNode;
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

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
  </svg>
);

const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

/**
 * Sidebar navigation component styled similar to FFXIV Teamcraft
 */
export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['static', 'loot']));
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [currentTierName, setCurrentTierName] = useState<string | null>(null);
  const [todayRaidStatus, setTodayRaidStatus] = useState<
    'idle' | 'loading' | 'raiding' | 'maybe' | 'not' | 'incomplete' | 'unknown'
  >('idle');

  useEffect(() => {
    if (!user) {
      setCurrentTierName(null);
      return;
    }
    raidTierService
      .getCurrent()
      .then((t) => setCurrentTierName(t.name))
      .catch(() => setCurrentTierName(null));
  }, [user]);

  const refreshTodayRaidStatus = useCallback(() => {
    if (!user) return;
    setTodayRaidStatus('loading');
    const viewStart = scheduleRangeStartMonday();
    scheduleService
      .getView(viewStart)
      .then((view) => {
        const today = todayLocalIso();
        const monday = mondayOfWeekIso(today);
        const week = view.weeks.find((w) => w.weekStartMonday === monday);
        if (!week) {
          setTodayRaidStatus('unknown');
          return;
        }
        const day = week.days.find((d) => d.date === today);
        if (!day) {
          setTodayRaidStatus('unknown');
          return;
        }
        switch (day.consensus) {
          case ScheduleConsensus.Raiding:
            setTodayRaidStatus('raiding');
            break;
          case ScheduleConsensus.MaybeRaiding:
            setTodayRaidStatus('maybe');
            break;
          case ScheduleConsensus.NotRaiding:
            setTodayRaidStatus('not');
            break;
          default:
            setTodayRaidStatus('incomplete');
        }
      })
      .catch(() => setTodayRaidStatus('unknown'));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTodayRaidStatus('idle');
      return;
    }
    refreshTodayRaidStatus();
  }, [user, location.pathname, refreshTodayRaidStatus]);

  useEffect(() => {
    if (!user) return;
    const onScheduleUpdated = () => {
      refreshTodayRaidStatus();
    };
    const connect = async () => {
      try {
        await signalRService.start();
        signalRService.onScheduleUpdated(onScheduleUpdated);
      } catch (e) {
        console.error('Sidebar: SignalR schedule updates failed', e);
      }
    };
    void connect();
    return () => {
      signalRService.offScheduleUpdated(onScheduleUpdated);
    };
  }, [user, refreshTodayRaidStatus]);

  const navGroups: NavGroup[] = [
    {
      id: 'static',
      label: 'Static management',
      icon: <SettingsIcon />,
      items: [
        { id: 'members', label: 'Members', icon: <UsersIcon />, path: '/members' },
        { id: 'raid-tiers', label: 'Raid Tiers', icon: <LayersIcon />, path: '/raid-tiers' },
        { id: 'schedule', label: 'Schedule', icon: <CalendarIcon />, path: '/schedule' },
      ],
    },
    {
      id: 'loot',
      label: 'Loot',
      icon: <BoxIcon />,
      items: [
        { id: 'bis', label: 'BiS Tracker', icon: <CheckSquareIcon />, path: '/bis' },
        { id: 'loot', label: 'Loot Distribution', icon: <PackageIcon />, path: '/loot' },
        { id: 'history', label: 'History', icon: <HistoryIcon />, path: '/history' },
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

  const resolvedNavPath = React.useMemo(() => {
    let p = location.pathname;
    if (location.hash && location.hash.length > 1) {
      p = location.hash.substring(1).split('?')[0];
    } else {
      p = p.split('?')[0];
    }
    return p;
  }, [location.pathname, location.hash]);

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

      {user && (
        <div className="sidebar-today-raid" aria-live="polite">
          <div className="sidebar-today-raid-label">Today</div>
          {(todayRaidStatus === 'idle' || todayRaidStatus === 'loading') && (
            <div className="sidebar-today-raid-value sidebar-today-raid-loading">Loading…</div>
          )}
          {todayRaidStatus === 'raiding' && (
            <div className="sidebar-today-raid-value sidebar-today-raid-yes">Raiding</div>
          )}
          {todayRaidStatus === 'maybe' && (
            <div className="sidebar-today-raid-value sidebar-today-raid-maybe">Maybe Raiding</div>
          )}
          {todayRaidStatus === 'not' && (
            <div className="sidebar-today-raid-value sidebar-today-raid-no">Not Raiding</div>
          )}
          {todayRaidStatus === 'incomplete' && (
            <div className="sidebar-today-raid-value sidebar-today-raid-incomplete">Incomplete</div>
          )}
          {todayRaidStatus === 'unknown' && (
            <div className="sidebar-today-raid-value sidebar-today-raid-unknown">—</div>
          )}
        </div>
      )}

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
                    const isActive =
                      resolvedNavPath === item.path ||
                      (item.path === '/schedule' &&
                        (resolvedNavPath === '/' || resolvedNavPath === ''));
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

      {user && (
        <div className="sidebar-raid-tier">
          <div className="sidebar-raid-tier-label">Active raid tier</div>
          <div className="sidebar-raid-tier-name">{currentTierName ?? '—'}</div>
        </div>
      )}

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

