import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  UserIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { apiConfig, apiRequest, getCurrentSubscription } from '../config/api';
import Logo from '../components/Logo';

interface Resume {
  id: string;
  title: string;
  template_name: string;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);

  useEffect(() => {
    fetchResumes();
    fetchTemplates();
    fetchMessageBalance();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(apiConfig.url(apiConfig.endpoints.templates.list), {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (response.ok) {
        const templateData = await response.json();
        setTemplates(templateData);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template ? template.name : templateId.charAt(0).toUpperCase() + templateId.slice(1);
  };

  const fetchResumes = async () => {
    try {
      const response = await apiRequest(apiConfig.endpoints.resumes.list);
      
      if (response.ok) {
        const data = await response.json();
        setResumes(data);
      }
    } catch (error) {
      console.error('Error fetching resumes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      const response = await apiRequest(apiConfig.endpoints.resumes.delete(resumeId), {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setResumes(resumes.filter(resume => resume.id !== resumeId));
      }
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };

  const startEditing = (resume: Resume) => {
    setEditingId(resume.id);
    setEditingTitle(resume.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveTitle = async (resumeId: string) => {
    if (!editingTitle.trim()) return;
    
    try {
      const response = await apiRequest(`${apiConfig.endpoints.resumes.updateTitle(resumeId)}?new_title=${encodeURIComponent(editingTitle)}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setResumes(resumes.map(resume => 
          resume.id === resumeId 
            ? { ...resume, title: editingTitle }
            : resume
        ));
        setEditingId(null);
        setEditingTitle('');
      }
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const fetchMessageBalance = async () => {
    try {
      const sub = await getCurrentSubscription();
      const used = sub?.messages_used || 0;
      const quota = sub?.message_quota || 0;
      setMessagesRemaining(quota - used);
    } catch (err) {
      setMessagesRemaining(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#000000' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      {/* Navigation */}
      <nav className="border-b border-gray-600/30 px-6 py-4" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo size="md" className="text-white" />
          </div>

          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-2 text-sm text-gray-400">
              <UserIcon className="w-4 h-4" />
              <span className="full-name-text hover:text-white transition-colors">{user?.full_name}</span>
            </span>
            {messagesRemaining !== null && (
              <span className={`text-base font-semibold ${messagesRemaining > 6 ? 'text-green-400' : messagesRemaining > 3 ? 'text-yellow-400' : 'text-red-400'}`}>AI messages left: {messagesRemaining}</span>
            )}
            <Link
              to="/billing"
              className="px-4 py-2 rounded-3xl text-sm transition-colors text-gray-400 hover:text-white"
              style={{ backgroundColor: '#000000' }}
              title="Go to Billing to buy more messages"
            >
              Billing
            </Link>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Resumes</h1>
            <p className="text-gray-400">
              Create and manage your professional resumes with AI assistance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/create"
              className="text-white px-6 py-3 rounded-3xl font-medium hover:opacity-90 transition-all flex items-center space-x-2"
              style={{ backgroundColor: '#2F2F2F' }}
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Resume</span>
            </Link>
          </div>
        </div>

        {/* Resume Grid */}
        {resumes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <DocumentTextIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first AI-powered LaTeX resume to get started
            </p>
            <Link
              to="/create"
              className="inline-flex items-center text-white px-6 py-3 rounded-3xl font-medium hover:opacity-90 transition-all space-x-2"
              style={{ backgroundColor: '#2F2F2F' }}
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Resume</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume, index) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group border border-gray-600/30 rounded-3xl p-6 hover:border-gray-500/50 transition-all"
                style={{ backgroundColor: '#212121' }}
              >
                <div className="mb-4">
                  {editingId === resume.id ? (
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="border border-gray-600/50 rounded-3xl px-3 py-2 text-white text-lg font-semibold flex-1 focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#2F2F2F' }}
                        onKeyPress={(e) => e.key === 'Enter' && saveTitle(resume.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => saveTitle(resume.id)}
                        className="p-2 text-green-400 hover:text-green-300 rounded-full hover:bg-gray-600/20 transition-all"
                        title="Save"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-gray-600/20 transition-all"
                        title="Cancel"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <h3 className="font-semibold text-lg mb-1 leading-tight title-text">
                        {resume.title}
                      </h3>
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    {getTemplateName(resume.template_name)}
                  </p>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Created {formatDate(resume.created_at)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Updated {formatDate(resume.updated_at)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/editor/${resume.id}`}
                    className="flex-1 text-white px-3 py-2 rounded-3xl text-sm font-medium hover:opacity-90 transition-all text-center"
                    style={{ backgroundColor: '#2F2F2F' }}
                  >
                    Edit Resume
                  </Link>
                  <button
                    onClick={() => startEditing(resume)}
                    className="p-2 text-gray-400 hover:text-white rounded-full transition-all"
                    style={{ backgroundColor: 'rgba(47, 47, 47, 0.8)' }}
                    title="Edit name"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteResume(resume.id)}
                    className="p-2 text-gray-400 hover:text-red-400 rounded-full transition-all"
                    style={{ backgroundColor: 'rgba(47, 47, 47, 0.8)' }}
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 