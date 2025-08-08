import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../config/api';
import type { Session } from '@supabase/supabase-js';

interface User {
  id: string; // Changed from number to string for UUID
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string) => void; // Keep same interface for compatibility
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from Supabase session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          // User has logged out, clear everything
          setIsAuthenticated(false);
          setToken(null);
          setUser(null);
          setLoading(false);
        } else if (session) {
          // Any other event with a session (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED)
          // means the user is authenticated.
          setSession(session);
        }
        // If event is something else without a session, do nothing to prevent flicker
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const setSession = async (session: Session) => {
    // Only update user state if the user ID has changed
    if (user?.id === session.user.id) {
      setToken(session.access_token);
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }
    
    setToken(session.access_token);
    setIsAuthenticated(true);
    
    // Fetch user profile from database
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    const userData: User = {
      id: session.user.id,
      email: session.user.email!,
      full_name: profileData?.full_name || session.user.email!.split('@')[0],
      is_active: true,
      created_at: session.user.created_at
    };
    
    setUser(userData);
    setLoading(false);
  };

  // Keep the same login interface for compatibility
  const login = async () => {
    // This function is kept for compatibility but will be called differently
    // The actual login will happen through Supabase in the login components
    setLoading(false);
  };

  const logout = async () => {
    try {
      // Sign out globally to invalidate refresh tokens as well
      await supabase.auth.signOut({ scope: 'global' as any });
    } catch (e) {
      // ignore
    }

    // Aggressively clear any persisted Supabase auth state
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
        .forEach((k) => localStorage.removeItem(k));
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('sb-') || k.startsWith('supabase.'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch (_) {}

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);

    // Hard redirect to login to avoid any stale in-memory auth
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.replace('/login');
    }
  };

  const value = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 