import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<Member | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      validateSession(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSession = async (sessionToken: string) => {
    try {
      const member = await authService.validate(sessionToken);
      if (member) {
        setUser(member);
        setToken(sessionToken);
      } else {
        // Session invalid - clear token but don't redirect (let the app handle it)
        localStorage.removeItem('authToken');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      // Session validation failed - clear token but don't redirect
      localStorage.removeItem('authToken');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

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
    return (user.permissionRole ?? PermissionRole.User) >= requiredRole;
  };

  const isSelf = (memberId: string): boolean => {
    return user?.id === memberId;
  };

  const canEditMember = (targetMember: Member): boolean => {
    if (!user) return false;
    if (user.permissionRole === PermissionRole.Administrator) return true;
    if (user.permissionRole === PermissionRole.Manager) return true;
    return user.id === targetMember.id;
  };

  const canEditPermissionRole = (targetMember: Member): boolean => {
    if (!user) return false;
    return user.permissionRole === PermissionRole.Administrator;
  };

  const canEditBiS = (targetMember: Member): boolean => {
    if (!user) return false;
    if (user.permissionRole === PermissionRole.Administrator || 
        user.permissionRole === PermissionRole.Manager) {
      return true;
    }
    return user.id === targetMember.id;
  };

  const canAssignLoot = (): boolean => {
    if (!user) return false;
    return user.permissionRole === PermissionRole.Administrator || 
           user.permissionRole === PermissionRole.Manager;
  };

  const canCreateWeek = (): boolean => {
    if (!user) return false;
    return user.permissionRole === PermissionRole.Administrator || 
           user.permissionRole === PermissionRole.Manager;
  };

  const canDeleteWeek = (): boolean => {
    if (!user) return false;
    return user.permissionRole === PermissionRole.Administrator;
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

