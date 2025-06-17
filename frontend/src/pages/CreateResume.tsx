import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  UserIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentArrowUpIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

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

const CreateResume: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customTemplate, setCustomTemplate] = useState<File | null>(null);
  const [showCustomUpload, setShowCustomUpload] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Fetch templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/templates/');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const templateData = await response.json();
        setTemplates(templateData);
        
        // No automatic selection - user must choose
        
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId !== 'custom_upload') {
      setCustomTemplate(null);
      setShowCustomUpload(false);
    }
  };

  const handleCustomTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.name.endsWith('.cls') || file.name.endsWith('.tex'))) {
      setCustomTemplate(file);
      setSelectedTemplate('custom_upload');
    } else {
      alert('Please upload a valid .cls or .tex file');
    }
  };

  const handleContinue = () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
      return;
    }

    // Store selected template in localStorage temporarily
    localStorage.setItem('selectedTemplate', selectedTemplate);
    
    // If custom template is selected, store it as well
    if (customTemplate && selectedTemplate === 'custom_upload') {
      // For now, we'll handle custom template upload in the next step
      localStorage.setItem('hasCustomTemplate', 'true');
    } else {
      localStorage.removeItem('hasCustomTemplate');
    }
    
    navigate('/create/details');
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
          <p className="text-xl text-red-400 mb-4">{error}</p>
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
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{user?.username}</span>
              </div>
              <button
                onClick={() => logout()}
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
            {templates.length} templates available • Please select one to continue
          </div>
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
              onClick={() => handleTemplateSelect(template.id)}
            >
              {/* Template Preview */}
              <div className="aspect-[3/4] border border-gray-600/20 rounded-3xl overflow-hidden relative" style={{ backgroundColor: '#0A0A0A' }}>
                <div className="w-full h-full relative">
                  {template.has_preview ? (
                    /* Preview Image */
                    <img 
                      src={`http://localhost:8000${template.preview_url}`}
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
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="backdrop-blur-sm rounded-3xl p-3" style={{ backgroundColor: 'rgba(21, 21, 21, 0.8)' }}>
                      <div className="text-xs text-gray-300 mb-1">{template.category}</div>
                      <div className="text-sm font-medium text-white">{template.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{template.type === 'class' ? 'LaTeX Class' : 'LaTeX Document'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="p-6 border border-gray-600/20 border-t-0 rounded-b-3xl" style={{ backgroundColor: '#0A0A0A' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </div>
                  {selectedTemplate === template.id && (
                    <CheckIcon className="w-6 h-6 text-green-400 ml-2 flex-shrink-0" />
                  )}
                </div>

                {/* Features */}
                {template.features && template.features.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 font-medium">Features:</div>
                    <ul className="space-y-1">
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="text-xs text-gray-400 flex items-center">
                          <StarIcon className="w-3 h-3 mr-2 text-gray-500" />
                          {feature}
                        </li>
                      ))}
                      {template.features.length > 3 && (
                        <li className="text-xs text-gray-500">
                          +{template.features.length - 3} more features
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Commands available */}
                {template.commands && template.commands.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600/20">
                    <div className="text-xs text-gray-300 font-medium mb-1">LaTeX commands available:</div>
                    <div className="text-xs text-gray-500">
                      {template.commands.length} LaTeX commands available
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Custom Template Upload Section */}
        <div className="border border-gray-600/20 rounded-3xl p-8 mb-8" style={{ backgroundColor: '#0A0A0A' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Upload Custom Template</h3>
              <p className="text-gray-400">Have your own LaTeX template? Upload it here for analysis and use.</p>
            </div>
            <button
              onClick={() => setShowCustomUpload(!showCustomUpload)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <span>{showCustomUpload ? 'Hide' : 'Show'}</span>
              {showCustomUpload ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {showCustomUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-600/20 pt-6"
            >
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600/30 border-dashed rounded-3xl cursor-pointer hover:border-gray-500/40 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <DocumentArrowUpIcon className="w-8 h-8 mb-4 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">.cls or .tex files only</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".cls,.tex"
                    onChange={handleCustomTemplateUpload}
                  />
                </label>
              </div>

              {customTemplate && (
                <div className="mt-4 p-4 rounded-3xl" style={{ backgroundColor: '#151515' }}>
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{customTemplate.name}</p>
                      <p className="text-xs text-gray-400">
                        {(customTemplate.size / 1024).toFixed(1)} KB • Ready to use
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            disabled={!selectedTemplate}
            className={`px-8 py-4 rounded-3xl font-semibold text-lg flex items-center space-x-3 transition-all ${
              selectedTemplate
                ? 'text-white hover:opacity-90'
                : 'text-gray-500 cursor-not-allowed opacity-50'
            }`}
            style={{ backgroundColor: selectedTemplate ? '#2A2A2A' : '#151515' }}
          >
            <span>Continue to Details</span>
            <ArrowRightIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {!selectedTemplate && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Please select a template to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default CreateResume; 