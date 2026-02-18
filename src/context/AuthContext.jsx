import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { userAPI } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Check if user is authenticated
   * This is the single source of truth
   */
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await userAPI.getCurrentUser();
      setUser(data.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Run once when app loads
   */
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login
   */
  const login = async (credentials) => {
    try {
      await userAPI.login(credentials);

      // After login, re-fetch authenticated user
      await checkAuth();

      return { success: true };
    } catch (error) {
        let message = 'Login failed.';
        console.log(error)
        if (error.response && error.response.data) {
          console.log(error.response.data.message)
          message = error.response.data.message || message;
        }

        return { success: false, error: message };
    }
  };

  /**
   * Register
   * If your backend auto-logs user in, this will work perfectly.
   * If not, you can redirect to login instead.
   */
  const register = async (formData) => {
    try {
      await userAPI.register(formData);

      // If register sets cookies, refresh auth
      await checkAuth();

      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Registration failed. Please try again.';
      return { success: false, error: message };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await userAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  /**
   * Exposed values
   */
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: checkAuth,
    setUser, // optional (use carefully)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
