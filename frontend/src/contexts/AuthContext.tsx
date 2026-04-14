import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Member, PermissionRole } from '../types/member';
import { authService } from '../services/api/authService';

interface AuthContextType {
  user: Member | null;
  currentUser: Member | null; // Alias for user for consistency
  token: string | null;
  login: (memberName: string, pin: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (requiredRole: PermissionRole) => boolean;
  isSelf: (memberId: string) => boolean;
  canEditMember: (targetMember: Member) => boolean;
  canEditPermissionRole: (targetMember: Member) => boolean;
  canEditBiS: (targetMember: Member) => boolean;
  canAssignLoot: () => boolean;
  canCreateWeek: () => boolean;
  canDeleteWeek: () => boolean;
  /** Re-fetch the current member from the session token (e.g. after profile update). */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/** API / JSON may send enum as number, numeric string, or name — normalize for comparisons. */
function permissionLevel(role: unknown): PermissionRole {
  if (role === undefined || role === null) {
    return PermissionRole.User;
  }
  if (typeof role === 'number' && !Number.isNaN(role)) {
    if (role >= PermissionRole.Administrator) {
      return PermissionRole.Administrator;
    }
    if (role >= PermissionRole.Manager) {
      return PermissionRole.Manager;
    }
    return PermissionRole.User;
  }
  if (typeof role === 'string') {
    const n = Number(role);
    if (!Number.isNaN(n)) {
      if (n >= PermissionRole.Administrator) {
        return PermissionRole.Administrator;
      }
      if (n >= PermissionRole.Manager) {
        return PermissionRole.Manager;
      }
      return PermissionRole.User;
    }
    const s = role.trim().toLowerCase();
    if (s === 'administrator' || s === 'admin') {
      return PermissionRole.Administrator;
    }
    if (s === 'manager') {
      return PermissionRole.Manager;
    }
    if (s === 'user') {
      return PermissionRole.User;
    }
  }
  return PermissionRole.User;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const validateSession = useCallback(async (sessionToken: string) => {
    try {
      const member = await authService.validate(sessionToken);
      if (member) {
        setUser(member);
        setToken(sessionToken);
      } else {
        localStorage.removeItem('authToken');
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Refresh signed-in member without showing the full-app loading gate (e.g. after profile edit). */
  const refreshSession = useCallback(async () => {
    const t = token ?? localStorage.getItem('authToken');
    if (!t) return;
    try {
      const member = await authService.validate(t);
      if (member) {
        setUser(member);
        setToken(t);
      }
    } catch {
      /* keep existing session on transient failure */
    }
  }, [token]);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      validateSession(storedToken);
    } else {
      setLoading(false);
    }
  }, [validateSession]);

  const login = async (memberName: string, pin: string) => {
    const response = await authService.login(memberName, pin);
    setUser(response.member);
    setToken(response.token);
    localStorage.setItem('authToken', response.token);
  };

  const logout = () => {
    if (token) {
      authService.logout(token).catch(() => {
        // Silently handle logout errors
      });
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
  };

  const hasPermission = (requiredRole: PermissionRole): boolean => {
    if (!user) return false;
    return permissionLevel(user.permissionRole) >= requiredRole;
  };

  const canonicalMemberId = (s: string | undefined): string | undefined => {
    if (s == null) return undefined;
    const t = s.trim().replace(/^\{|\}$/g, '').toLowerCase();
    return t.length > 0 ? t : undefined;
  };

  const sameMemberId = (a: string | undefined, b: string | undefined): boolean => {
    const na = canonicalMemberId(a);
    const nb = canonicalMemberId(b);
    if (na == null || nb == null) return false;
    return na === nb;
  };

  const sameDisplayName = (a: string | undefined, b: string | undefined): boolean => {
    if (a == null || b == null) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  };

  const isSelf = (memberId: string): boolean => {
    return user != null && sameMemberId(user.id, memberId);
  };

  const canEditMember = (targetMember: Member): boolean => {
    if (!user) return false;
    if (hasPermission(PermissionRole.Manager)) return true;
    if (sameMemberId(user.id, targetMember.id)) return true;
    if (!hasPermission(PermissionRole.Manager) && sameDisplayName(user.name, targetMember.name)) {
      return true;
    }
    return false;
  };

  const canEditPermissionRole = (_targetMember: Member): boolean => {
    if (!user) return false;
    return hasPermission(PermissionRole.Administrator);
  };

  const canEditBiS = (targetMember: Member): boolean => {
    if (!user) return false;
    if (hasPermission(PermissionRole.Manager)) return true;
    if (sameMemberId(user.id, targetMember.id)) return true;
    if (!hasPermission(PermissionRole.Manager) && sameDisplayName(user.name, targetMember.name)) {
      return true;
    }
    return false;
  };

  const canAssignLoot = (): boolean => {
    if (!user) return false;
    return hasPermission(PermissionRole.Manager);
  };

  const canCreateWeek = (): boolean => {
    if (!user) return false;
    return hasPermission(PermissionRole.Manager);
  };

  const canDeleteWeek = (): boolean => {
    if (!user) return false;
    return hasPermission(PermissionRole.Administrator);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user, // Alias for consistency
        token,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        isSelf,
        canEditMember,
        canEditPermissionRole,
        canEditBiS,
        canAssignLoot,
        canCreateWeek,
        canDeleteWeek,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

