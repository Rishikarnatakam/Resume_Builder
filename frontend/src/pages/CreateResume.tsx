import { logger } from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  StarIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '../hooks/useAuth';
import { apiConfig, supabase } from '../config/api';
import Logo from '../components/Logo';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  features?: string[];
  type: string;
  commands?: string[];
  has_preview?: boolean;
  preview_url?: string;
}

function normalizeStrings(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(normalizeStrings);
  } else if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" || typeof v === "undefined") {
        out[k] = v ?? "";
      } else if (v === null) {
        out[k] = "";
      } else {
        out[k] = normalizeStrings(v);
      }
    }
    return out;
  }
  return obj;
}

const CreateResume: React.FC = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState<string>('');

  useEffect(() => {
    // Load resume data from localStorage
    const storedResumeData = localStorage.getItem('resumeData');
    const storedJobDescription = localStorage.getItem('jobDescription');
    
    if (storedResumeData) {
      setResumeData(JSON.parse(storedResumeData));
    }
    if (storedJobDescription) {
      setJobDescription(storedJobDescription);
    }
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiConfig.baseUrl}/templates/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json();
        setTemplates(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [token]);

  const handleSelectTemplate = (templateId: string) => {
    // Just select the template, don't navigate
    setSelectedTemplate(templateId);
    logger.info('Selected template', { templateId });
  };

  const handleGenerateResume = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    if (!resumeData) {
      alert('Resume data not found. Please go back and fill out your information.');
      navigate('/create');
      return;
    }

    setIsGenerating(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error("User not authenticated");
      }
      const token = session.data.session.access_token;

      // Create the resume in the database
      const payload = {
        title: `${resumeData.personalInfo.name}'s Resume`,
        template_name: selectedTemplate, // This is now template.id which matches backend expectation
        resume_data: normalizeStrings(resumeData),
        job_description: jobDescription || undefined,
      };

      logger.info('Creating resume with payload', { payload });

      const response = await fetch(`${apiConfig.baseUrl}/resumes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newResume = await response.json();
        logger.success('Resume created successfully', { newResume });
        
        // Clean up localStorage
        localStorage.removeItem('resumeData');
        localStorage.removeItem('jobDescription');
        
        // Navigate to editor with the new resume
        navigate(`/editor/${newResume.id}`);
      } else {
        const errorData = await response.json();
        logger.error('Failed to create resume:', errorData);
        alert('Failed to create resume. Please try again.');
      }
    } catch (error) {
      logger.error('Error creating resume:', error);
      alert('Error creating resume. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#000000' }}>
        <div className="text-center">
          <DocumentTextIcon className="w-12 h-12 text-white animate-pulse mx-auto mb-4" />
          <p className="text-xl">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#000000' }}>
        <div className="text-center">
                      <p className="text-xl text-red-400 mb-4 break-words">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 text-white rounded-3xl hover:opacity-90 transition-all"
            style={{ backgroundColor: '#3A3A3A' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <header className="border-b border-gray-600/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Logo size="md" />
              <Link to="/create" className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Your Info</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{user?.full_name}</span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Template</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Select a professional template optimized for ATS systems. 
            All templates are AI-powered and designed for maximum compatibility.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            {templates.length} templates available • Generate your resume with AI
          </div>
          {resumeData && (
            <div className="mt-3 text-sm text-green-400">
              ✓ Ready to generate resume for {resumeData.personalInfo?.name}
            </div>
          )}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`group relative cursor-pointer rounded-3xl overflow-hidden transition-all ${
                selectedTemplate === template.id
                  ? 'ring-2 ring-white'
                  : 'hover:ring-1 hover:ring-gray-400'
              }`}
              onClick={() => handleSelectTemplate(template.id)}
            >
              {/* Template Preview */}
              <div className="aspect-[3/4] border border-gray-600/20 rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#0A0A0A' }}>
                <div className="w-full h-full relative">
                  {template.has_preview ? (
                    /* Preview Image */
                    <img 
                      src={apiConfig.hostUrl(template.preview_url || '')}
                      alt={`${template.name} Preview`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.template-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : (
                    /* No preview available - show placeholder */
                    <div className="w-full h-full flex flex-col items-center justify-center template-fallback" style={{ backgroundColor: '#0A0A0A' }}>
                      <DocumentTextIcon className="w-16 h-16 text-gray-600 mb-2" />
                      <span className="text-xs text-gray-500">Preview not available</span>
                    </div>
                  )}
                  
                  {/* Hidden fallback for error cases */}
                  <div className="w-full h-full flex items-center justify-center template-fallback" style={{ backgroundColor: '#0A0A0A', display: 'none' }}>
                    <DocumentTextIcon className="w-16 h-16 text-gray-600" />
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Template Info Overlay */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="backdrop-blur-sm rounded-3xl p-4 px-12" style={{ backgroundColor: 'rgba(21, 21, 21, 0.8)' }}>
                      <div className="text-2xl font-semibold text-white text-center whitespace-nowrap">{template.name}</div>
                    </div>
                  </div>
                </div>
              </div>


            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between mt-12">
          <Link
            to="/create"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Your Info</span>
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateResume}
            disabled={!selectedTemplate || isGenerating}
            className={`px-8 py-4 rounded-3xl font-semibold text-lg flex items-center space-x-3 transition-all ${
              selectedTemplate && !isGenerating
                ? 'text-white hover:opacity-90'
                : 'text-gray-500 cursor-not-allowed opacity-50'
            }`}
            style={{ backgroundColor: selectedTemplate && !isGenerating ? '#2A2A2A' : '#151515' }}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Generating Resume...</span>
              </>
            ) : (
              <>
                <span>Generate Resume</span>
            <ArrowRightIcon className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>

        {!selectedTemplate && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Please select a template to generate your resume
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateResume; 