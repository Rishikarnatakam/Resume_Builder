import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from "framer-motion";
import { DocumentTextIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { apiConfig } from '../config/api';
import Logo from '../components/Logo';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Create form data object
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(apiConfig.url(apiConfig.endpoints.auth.login), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'ngrok-skip-browser-warning': 'true'
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          // Use the login function from AuthContext
          login(data.access_token);
          navigate('/dashboard');
        }
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Link to="/" className="inline-flex items-center space-x-3 mb-8">
            <Logo size="lg" />
          </Link>
          <h2 className="text-3xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-gray-400">Sign in to your account</p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-gray-600/30 rounded-3xl p-8"
          style={{ backgroundColor: '#212121' }}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-red-500/30 rounded-3xl p-4 text-red-400 text-sm text-center"
                style={{ backgroundColor: '#2F2F2F' }}
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600/50 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
                style={{ backgroundColor: '#2F2F2F' }}
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-600/50 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500/50 focus:border-gray-500/50 transition-all"
                  style={{ backgroundColor: '#2F2F2F' }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 border border-gray-600/30 rounded-3xl font-medium text-white hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: '#2F2F2F' }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="text-center">
              <p className="text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-white hover:text-gray-300 font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            ← Back to home
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Login; 