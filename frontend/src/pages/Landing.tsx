import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from "framer-motion";
import {
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import Logo from '../components/Logo';

const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);



  const stats = [
    { label: "AI Assistant", value: "Smart AI" },
    { label: "LaTeX Editor", value: "Code Control" },
    { label: "PDF Output", value: "Instant PDF" },
    { label: "Job Applications", value: "ATS-Friendly" }
  ];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <Logo size="lg" className="text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-6"
          >
            <Link
              to="/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-black px-6 py-3 rounded-3xl font-medium hover:bg-gray-100 transition-all"
              style={{ backgroundColor: '#2F2F2F', color: 'white' }}
            >
              Get started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
        <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
                      <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
                Craft Your
                <span className="block text-gray-300">
                  Perfect Resume
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Build professional resumes with AI assistance and LaTeX precision. 
                Edit code directly, see live previews, and create resumes that get you hired.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/register"
                className="group text-white px-8 py-4 rounded-3xl font-semibold text-lg hover:opacity-90 transition-all flex items-center space-x-2"
                style={{ backgroundColor: '#2F2F2F' }}
              >
                <span>Start Building</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="border border-gray-600/50 text-white px-8 py-4 rounded-3xl font-semibold text-lg hover:border-gray-400/50 transition-all"
              >
                Sign In
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center px-4">
                  <div className="text-xl lg:text-2xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default Landing; 