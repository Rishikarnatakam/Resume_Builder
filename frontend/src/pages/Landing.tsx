import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from "framer-motion";
import {
  DocumentTextIcon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BoltIcon,
  GlobeAltIcon,
  CodeBracketIcon
} from "@heroicons/react/24/outline";

const Landing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: SparklesIcon,
      title: "AI-Powered Generation",
      description: "Generate professional LaTeX resumes using advanced AI technology tailored to specific job descriptions."
    },
    {
      icon: CodeBracketIcon,
      title: "Live LaTeX Editor",
      description: "Edit LaTeX code directly with Monaco Editor and see real-time PDF preview updates."
    },
    {
      icon: BoltIcon,
      title: "Instant Compilation",
      description: "Fast local LaTeX compilation with detailed error reporting and logging."
    },
    {
      icon: GlobeAltIcon,
      title: "Modern Interface",
      description: "Beautiful, responsive design with dark mode and intuitive user experience."
    }
  ];

  const stats = [
    { label: "AI Models", value: "Latest" },
    { label: "Templates", value: "Professional" },
    { label: "Export", value: "PDF" },
    { label: "Speed", value: "Real-time" }
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
            <div className="w-8 h-8 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#2F2F2F' }}>
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">LaTeX Resume AI</span>
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
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
                AI-Powered
                <span className="block text-gray-300">
                  LaTeX Resumes
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Generate professional resumes using AI and LaTeX. Edit code directly, 
                see live previews, and create documents that stand out.
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
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto pt-16"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6" style={{ backgroundColor: '#212121' }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold">
              Everything you need to create
              <span className="block text-gray-300">
                professional resumes
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powered by cutting-edge AI and modern web technologies
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                <div 
                  className="relative border border-gray-600/30 rounded-3xl p-8 hover:border-gray-500/50 transition-all"
                  style={{ backgroundColor: '#2F2F2F' }}
                >
                  <feature.icon className="w-12 h-12 text-gray-300 mb-6" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div 
              className="relative border border-gray-600/30 rounded-3xl p-12 text-center"
              style={{ backgroundColor: '#212121' }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Ready to revolutionize your resume?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join the future of resume creation with AI-powered LaTeX generation
              </p>
              <Link
                to="/register"
                className="inline-flex items-center text-white px-8 py-4 rounded-3xl font-semibold text-lg hover:opacity-90 transition-all space-x-2"
                style={{ backgroundColor: '#2F2F2F' }}
              >
                <span>Get Started Free</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-600/30 py-12 px-6" style={{ backgroundColor: '#212121' }}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-3xl flex items-center justify-center" style={{ backgroundColor: '#2F2F2F' }}>
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">LaTeX Resume AI</span>
          </div>
          <p className="text-gray-400">
            © 2024 LaTeX Resume AI. Powered by cutting-edge AI technology.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing; 