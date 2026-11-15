import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    // If on /login and no token is present, we are unauthenticated and skip /api/auth/me
    // to avoid an infinite reload loop when AUTH_REQUIRED=true (since api() 401 handler redirects to /login).
    if (location.pathname === '/login' && !token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Use cached user while verifying token
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }

    try {
      // In AUTH_REQUIRED=false mode, returns default admin user even without a token.
      // In AUTH_REQUIRED=true mode, verifies Bearer token and returns decoded user profile.
      const userData = await api('erp5', '/api/auth/me');
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      // api() automatically clears token and redirects to /login on 401
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
