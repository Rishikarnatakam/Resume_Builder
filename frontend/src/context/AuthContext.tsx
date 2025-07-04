import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../config/api';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string; // Changed from number to string for UUID
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string) => void; // Keep same interface for compatibility
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
      async (event, session) => {
        if (session) {
          setSession(session);
        } else {
          setIsAuthenticated(false);
          setToken(null);
          setUser(null);
      setLoading(false);
    }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const setSession = async (session: Session) => {
    setToken(session.access_token);
    setIsAuthenticated(true);
    
    // Convert Supabase user to our User interface
    const supabaseUser = session.user;
    const userData: User = {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
      is_active: true,
      created_at: supabaseUser.created_at
    };
    
    setUser(userData);
    setLoading(false);
  };

  // Keep the same login interface for compatibility
  const login = async (emailOrToken: string, password?: string) => {
    // This function is kept for compatibility but will be called differently
    // The actual login will happen through Supabase in the login components
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    
    // Only redirect if we're not already on login/register pages
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.location.href = '/';
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

export default AuthContext; 