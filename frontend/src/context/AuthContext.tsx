import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiConfig } from '../config/api';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string) => void;
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

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      fetchUserData(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      console.log('🔍 Fetching user data from:', apiConfig.url(apiConfig.endpoints.auth.me));
      const response = await fetch(apiConfig.url(apiConfig.endpoints.auth.me), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      console.log('📡 User data response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User data fetched successfully:', userData);
        setUser(userData);
        setLoading(false);
      } else if (response.status === 401) {
        console.log('🔒 Token expired or invalid, logging out...');
        // Token is invalid, log out
        logout();
      } else {
        // For other errors (500, network issues), don't logout - keep user logged in
        console.error('❌ Error fetching user data, but keeping user logged in:', response.status);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        setLoading(false);
      }
    } catch (error) {
      // Network errors shouldn't log out the user
      console.error('❌ Network error fetching user data, keeping user logged in:', error);
      setLoading(false);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    fetchUserData(newToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
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