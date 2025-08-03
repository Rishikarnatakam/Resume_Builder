import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import { 
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  CloudArrowUpIcon,
  PlusIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { apiConfig, supabase } from '../config/api';
import Logo from '../components/Logo';


interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  linkedin: string;
  website: string;
  github: string;
  portfolio: string;
  title: string;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  current: boolean;
  employmentType: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  location: string;
  gpa: string;
  honors: string;
  coursework: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate: string;
  url: string;
  github: string;
  role: string;
  teamSize: string;
}

interface Award {
  id: string;
  title: string;
  description: string;
  date?: string;
  issuer: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate: string;
  credentialId: string;
}

interface Publication {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  date: string;
  url: string;
  description: string;
}

interface Volunteering {
  id: string;
  organization: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
}

interface Speaking {
  id: string;
  title: string;
  event: string;
  date: string;
  location: string;
  description: string;
  url: string;
}

interface Military {
  id: string;
  branch: string;
  rank: string;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
}

interface AdditionalSection {
  id: string;
  section_name: string;
  content: string;
  type: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  awards: Award[];
  certifications: Certification[];
  publications: Publication[];
  volunteering: Volunteering[];
  speaking: Speaking[];
  military: Military[];
  references: string;
  hobbies: string[];
  languages: string[];
  additional_sections: AdditionalSection[];
}

interface DetectedSections {
  publications: boolean;
  volunteering: boolean;
  speaking: boolean;
  military: boolean;
  references: boolean;
  hobbies: boolean;
  portfolio: boolean;
  professional_title: boolean;
  academic_honors: boolean;
  enhanced_projects: boolean;
  enhanced_certifications: boolean;
  additional_sections: boolean;
}



const defaultPersonalInfo: PersonalInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
  linkedin: '',
  website: '',
  github: '',
  portfolio: '',
  title: ''
};

const defaultResumeData: ResumeData = {
  personalInfo: defaultPersonalInfo,
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  awards: [],
  certifications: [],
  publications: [],
  volunteering: [],
  speaking: [],
  military: [],
  references: '',
  hobbies: [],
  languages: [],
  additional_sections: []
};

const ResumeDetails: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize function for textareas - optimized for responsiveness
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      element.style.height = 'auto';
      const scrollHeight = element.scrollHeight;
      const minHeight = 60; // Minimum height for better UX
      const maxHeight = 300; // Maximum height before scrolling
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      element.style.height = `${newHeight}px`;
    });
  };

  // Auto-resize handler for onChange events - immediate response
  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    updateFunction: (value: string) => void
  ) => {
    const value = e.target.value;
    // Update the value immediately
    updateFunction(value);
    // Adjust height immediately without delay
    adjustTextareaHeight(e.target);
  };
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<boolean>(false);

  
  // Adaptive form state
  const [detectedSections] = useState<DetectedSections>({
    publications: false,
    volunteering: false,
    speaking: false,
    military: false,
    references: false,
    hobbies: false,
    portfolio: false,
    professional_title: false,
    academic_honors: false,
    enhanced_projects: false,
    enhanced_certifications: false,
    additional_sections: false
  });
  const [visibleSections] = useState<string[]>([
    'personalInfo', 'summary', 'skills', 'experience', 'education', 'projects', 'awards', 'certifications', 'languages', 'additional'
  ]);
  
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);

  const [jobDescription, setJobDescription] = useState<string>('');

  // Store raw input values for better typing experience
  const [skillsRawInput, setSkillsRawInput] = useState<string>('');
  const [languagesRawInput, setLanguagesRawInput] = useState<string>('');
  const [projectTechInputs, setProjectTechInputs] = useState<{[key: string]: string}>({});

  // Initialize raw input values when resumeData changes
  useEffect(() => {
    setSkillsRawInput(resumeData.skills.join(', '));
    setLanguagesRawInput(resumeData.languages.join(', '));
    
    // Initialize project technology inputs
    const techInputs: {[key: string]: string} = {};
    resumeData.projects.forEach(project => {
      techInputs[project.id] = project.technologies.join(', ');
    });
    setProjectTechInputs(techInputs);
  }, [resumeData.skills, resumeData.languages, resumeData.projects]);

  // Auto-resize all textareas on mount and when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        adjustTextareaHeight(textarea as HTMLTextAreaElement);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [resumeData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error("User not authenticated");
      }
      const token = session.data.session.access_token;

      const response = await fetch(`${apiConfig.baseUrl}/resumes/extract-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to extract data');
      }

      const data = await response.json();
      setResumeData(prev => ({ ...prev, ...data.resume_data }));
        setExtractedData(true);
    } catch (error: any) {
      logger.error('Extraction failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
      current: false,
      employmentType: ''
    };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp]
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      location: '',
      gpa: '',
      honors: '',
      coursework: []
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: '',
      description: '',
      technologies: [],
      startDate: '',
      endDate: '',
      url: '',
      github: '',
      role: '',
      teamSize: ''
    };
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, newProject]
    }));
    // Initialize empty tech input for new project
    setProjectTechInputs(prev => ({
      ...prev,
      [newProject.id]: ''
    }));
  };

  const removeProject = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }));
    // Clean up the tech input for removed project
    setProjectTechInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[id];
      return newInputs;
    });
  };

  const updateProject = (id: string, field: keyof Project, value: any) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(proj => 
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const handleSkillsChange = (value: string) => {
    // Store the raw input value for natural typing
    setSkillsRawInput(value);
  };

  const handleSkillsBlur = () => {
    // Process skills when user finishes typing
    const skills = skillsRawInput.split(',').map(skill => skill.trim()).filter(skill => skill);
    setResumeData(prev => ({ ...prev, skills }));
    setSkillsRawInput(skills.join(', '));
  };

  const addAward = () => {
    const newAward: Award = {
      id: Date.now().toString(),
      title: '',
      description: '',
      date: '',
      issuer: ''
    };
    setResumeData(prev => ({
      ...prev,
      awards: [...prev.awards, newAward]
    }));
  };

  const removeAward = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      awards: prev.awards.filter(award => award.id !== id)
    }));
  };

  const updateAward = (id: string, field: keyof Award, value: string) => {
    setResumeData(prev => ({
      ...prev,
      awards: prev.awards.map(award => 
        award.id === id ? { ...award, [field]: value } : award
      )
    }));
  };

  const addCertification = () => {
    const newCert: Certification = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      credentialId: ''
    };
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCert]
    }));
  };

  const removeCertification = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert => 
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const handleLanguagesChange = (value: string) => {
    // Store the raw input value for natural typing
    setLanguagesRawInput(value);
  };

  const handleLanguagesBlur = () => {
    // Process languages when user finishes typing
    const items = languagesRawInput.split(',').map(item => item.trim()).filter(item => item);
    setResumeData(prev => ({ ...prev, languages: items }));
    setLanguagesRawInput(items.join(', '));
  };

  const handleProjectTechChange = (projectId: string, value: string) => {
    setProjectTechInputs(prev => ({
      ...prev,
      [projectId]: value
    }));
  };

  const handleProjectTechBlur = (projectId: string) => {
    const techArray = projectTechInputs[projectId]?.split(',').map(tech => tech.trim()).filter(tech => tech.length > 0) || [];
    updateProject(projectId, 'technologies', techArray);
  };

  const addAdditionalSection = () => {
    const newSection: AdditionalSection = {
      id: Date.now().toString(),
      section_name: '',
      content: '',
      type: 'text'
    };
    setResumeData(prev => ({
      ...prev,
      additional_sections: [...prev.additional_sections, newSection]
    }));
  };

  const removeAdditionalSection = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      additional_sections: prev.additional_sections.filter(section => section.id !== id)
    }));
  };

  const updateAdditionalSection = (id: string, field: keyof AdditionalSection, value: string) => {
    setResumeData(prev => ({
      ...prev,
      additional_sections: prev.additional_sections.map(section => 
        section.id === id ? { ...section, [field]: value } : section
      )
    }));
  };

  const handleContinueToTemplates = () => {
    if (!resumeData.personalInfo.name) {
      alert('Please fill in your name.');
      return;
    }

    // Store resume data in localStorage to pass to template selection
    localStorage.setItem('resumeData', JSON.stringify(resumeData));
    localStorage.setItem('jobDescription', jobDescription || '');
    
    // Navigate to template selection
    navigate('/create/templates');
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      {/* Add custom styles for better input appearance */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide date input spinners and scrollbars */
          input[type="date"]::-webkit-calendar-picker-indicator {
            background: transparent;
            color: #9CA3AF;
            cursor: pointer;
          }
          
          input[type="date"]::-webkit-inner-spin-button,
          input[type="date"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
          
          /* Better date input styling */
          input[type="date"] {
            color-scheme: dark;
          }
          
          /* Hide all scrollbars completely for textareas */
          textarea {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* Internet Explorer 10+ */
          }
          
          textarea::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none; /* Chrome, Safari, Edge */
          }
          
          /* Ensure textareas are still scrollable but without visible scrollbars */
          textarea {
            overflow-y: auto;
            overflow-x: hidden;
            resize: none;
            border-radius: 1.5rem;
            transition: border-color 0.2s ease;
          }
          
          /* Auto-resize behavior */
          textarea.auto-resize {
            min-height: 60px;
            max-height: 300px;
          }
          
          /* Remove wrapper styling since we're not using wrappers anymore */
          .textarea-wrapper {
            display: none;
          }
        `
      }} />

      {/* Header */}
      <header className="border-b border-gray-600/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Logo size="md" />
              <Link to="/dashboard" className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{user?.full_name}</span>
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

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Tell Us About Yourself</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Fill in your information first, then choose the perfect template for your resume. You can upload an existing resume to auto-fill the form.
          </p>
          {isUploading && (
            <div className="flex items-center justify-center space-x-3 mt-4 p-3 rounded-3xl" style={{ backgroundColor: '#0A0A0A' }}>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span className="text-white">Processing your resume...</span>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="border border-gray-600/20 rounded-3xl p-6 mb-8" style={{ backgroundColor: '#0A0A0A' }}>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Quick Start</h3>
            <p className="text-gray-400 mb-6">Upload your current resume to auto-extract information</p>
            
            {!uploadedFile ? (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full max-w-md mx-auto flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-600/30 rounded-3xl text-gray-400 hover:text-white hover:border-gray-500/40 transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-5 h-5 mr-3" />
                      <span>Upload Resume (PDF, DOC, DOCX)</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  This will automatically extract your information to fill the form below
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3 p-4 rounded-3xl" style={{ backgroundColor: '#151515' }}>
                  <DocumentArrowUpIcon className="w-6 h-6 text-green-400" />
                  <span className="text-white font-medium">{uploadedFile.name}</span>
                  {extractedData && (
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  )}
                </div>
                {extractedData && (
                  <p className="text-green-400 text-sm">
                    ✓ Information extracted successfully! Review and edit the form below.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-10">
          {/* Personal Information */}
          <div>
            <h2 className="text-xl font-medium mb-6 pb-2 border-b border-gray-600/20">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={resumeData.personalInfo.name}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, name: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              <input
                type="email"
                placeholder="Email Address *"
                value={resumeData.personalInfo.email}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, email: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              <input
                type="tel"
                placeholder="Phone Number *"
                value={resumeData.personalInfo.phone}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, phone: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              <input
                type="text"
                placeholder="Location *"
                value={resumeData.personalInfo.address}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, address: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              
              {/* Professional Title - Show if detected or if user wants to add */}
              {(detectedSections.professional_title || visibleSections.includes('professional_title')) && (
                <input
                  type="text"
                  placeholder="Professional Title"
                  value={resumeData.personalInfo.title}
                  onChange={(e) => setResumeData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, title: e.target.value }
                  }))}
                  className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                  style={{ backgroundColor: '#151515' }}
                />
              )}
              
              <input
                type="url"
                placeholder="LinkedIn URL *"
                value={resumeData.personalInfo.linkedin}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, linkedin: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              <input
                type="url"
                placeholder="GitHub URL *"
                value={resumeData.personalInfo.github}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, github: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
              
              {/* Portfolio Website - Show if detected or if user wants to add */}
              {(detectedSections.portfolio || visibleSections.includes('portfolio')) && (
                <input
                  type="url"
                  placeholder="Portfolio Website"
                  value={resumeData.personalInfo.portfolio}
                  onChange={(e) => setResumeData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, portfolio: e.target.value }
                  }))}
                  className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                  style={{ backgroundColor: '#151515' }}
                />
              )}
              
              <input
                type="url"
                placeholder="Website URL *"
                value={resumeData.personalInfo.website}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, website: e.target.value }
                }))}
                className="border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none transition-all"
                style={{ backgroundColor: '#151515' }}
              />
            </div>
          </div>

          {/* Professional Summary */}
          <div>
            <h2 className="text-xl font-medium mb-6 pb-2 border-b border-gray-600/20">Professional Summary</h2>
            <textarea
              placeholder="Write a professional summary highlighting your key achievements and career goals..."
              value={resumeData.summary}
              onChange={(e) => handleTextareaChange(e, (value) => setResumeData(prev => ({ ...prev, summary: value })))}
              className="auto-resize w-full px-4 py-3 text-white placeholder-gray-500 transition-all border border-gray-600/30 focus:border-gray-500/50 focus:outline-none"
              style={{ backgroundColor: '#151515' }}
            />
          </div>

          {/* Skills */}
          <div>
            <h2 className="text-xl font-medium mb-6 pb-2 border-b border-gray-600/20">Skills</h2>
            <textarea
              placeholder="JavaScript, Python, React, Node.js, AWS, Docker, etc. (comma-separated)"
              value={skillsRawInput}
              onChange={(e) => {
                handleSkillsChange(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              onBlur={handleSkillsBlur}
              className="auto-resize w-full px-4 py-3 text-white placeholder-gray-500 transition-all border border-gray-600/30 focus:border-gray-500/50 focus:outline-none"
              style={{ backgroundColor: '#151515' }}
            />
          </div>

          {/* Work Experience */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
              <h2 className="text-xl font-medium">Work Experience</h2>
              <button
                onClick={addExperience}
                className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Experience</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {resumeData.experience.map((exp, index) => (
                <div key={exp.id} className="border border-gray-600/20 rounded-3xl p-6" style={{ backgroundColor: '#0A0A0A' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-300">Experience {index + 1}</h3>
                    <button
                      onClick={() => removeExperience(exp.id)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                      <input
                        type="text"
                        placeholder="Job Title"
                        value={exp.position}
                        onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                        className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                    </div>
                    <textarea
                      placeholder="Describe your key achievements and responsibilities..."
                      value={exp.description}
                      onChange={(e) => handleTextareaChange(e, (value) => updateExperience(exp.id, 'description', value))}
                      className="auto-resize w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none resize-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                  </div>
                </div>
              ))}
              {resumeData.experience.length === 0 && (
                <p className="text-gray-500 text-center py-8 italic">No work experience added yet</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
              <h2 className="text-xl font-medium">Education</h2>
              <button
                onClick={addEducation}
                className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Education</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {resumeData.education.map((edu, index) => (
                <div key={edu.id} className="border border-gray-600/20 rounded-3xl p-6" style={{ backgroundColor: '#0A0A0A' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-300">Education {index + 1}</h3>
                    <button
                      onClick={() => removeEducation(edu.id)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Institution Name"
                      value={edu.institution}
                      onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                      className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                      <input
                        type="text"
                        placeholder="Field of Study"
                        value={edu.field}
                        onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                        className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {resumeData.education.length === 0 && (
                <p className="text-gray-500 text-center py-8 italic">No education added yet</p>
              )}
            </div>
          </div>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
              <h2 className="text-xl font-medium">Projects</h2>
              <button
                onClick={addProject}
                className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {resumeData.projects.map((project, index) => (
                <div key={project.id} className="border border-gray-600/20 rounded-3xl p-6" style={{ backgroundColor: '#0A0A0A' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-300">Project {index + 1}</h3>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={project.name}
                      onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                      className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                    <input
                      type="text"
                      placeholder="Technologies Used (comma-separated)"
                      value={projectTechInputs[project.id] || ''}
                      onChange={(e) => handleProjectTechChange(project.id, e.target.value)}
                      onBlur={() => handleProjectTechBlur(project.id)}
                      className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                    <textarea
                      placeholder="Project description and key achievements..."
                      value={project.description}
                      onChange={(e) => handleTextareaChange(e, (value) => updateProject(project.id, 'description', value))}
                      className="auto-resize w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none resize-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                  </div>
                </div>
              ))}
              {resumeData.projects.length === 0 && (
                <p className="text-gray-500 text-center py-8 italic">No projects added yet</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Awards & Achievements */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
                <h2 className="text-xl font-medium">Awards & Achievements</h2>
                <button
                  onClick={addAward}
                  className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Award</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {resumeData.awards.map((award, index) => (
                  <div key={award.id} className="border border-gray-600/20 rounded-3xl p-4" style={{ backgroundColor: '#0A0A0A' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-300 text-sm">Award {index + 1}</h3>
                      <button
                        onClick={() => removeAward(award.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Award Title"
                        value={award.title}
                        onChange={(e) => updateAward(award.id, 'title', e.target.value)}
                        className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <textarea
                          placeholder="Award description or achievement details..."
                          value={award.description}
                          onChange={(e) => handleTextareaChange(e, (value) => updateAward(award.id, 'description', value))}
                          className="auto-resize border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none resize-none transition-all"
                          style={{ backgroundColor: '#151515' }}
                        />
                        <input
                          type="text"
                          placeholder="Date (e.g., Jan 2023)"
                          value={award.date || ''}
                          onChange={(e) => updateAward(award.id, 'date', e.target.value)}
                          className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                          style={{ backgroundColor: '#151515' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {resumeData.awards.length === 0 && (
                  <p className="text-gray-500 text-center py-6 italic">No awards added yet</p>
                )}
              </div>
            </div>
            
            {/* Certifications */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
                <h2 className="text-xl font-medium">Certifications</h2>
                <button
                  onClick={addCertification}
                  className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                  style={{ backgroundColor: '#2A2A2A' }}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Certification</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {resumeData.certifications.map((cert, index) => (
                  <div key={cert.id} className="border border-gray-600/20 rounded-3xl p-4" style={{ backgroundColor: '#0A0A0A' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-300 text-sm">Certification {index + 1}</h3>
                      <button
                        onClick={() => removeCertification(cert.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Certification Name"
                        value={cert.name}
                        onChange={(e) => updateCertification(cert.id, 'name', e.target.value)}
                        className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                        style={{ backgroundColor: '#151515' }}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Issuing Organization"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)}
                          className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                          style={{ backgroundColor: '#151515' }}
                        />
                        <input
                          type="text"
                          placeholder="Date (e.g., Jan 2023)"
                          value={cert.date}
                          onChange={(e) => updateCertification(cert.id, 'date', e.target.value)}
                          className="border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                          style={{ backgroundColor: '#151515' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {resumeData.certifications.length === 0 && (
                  <p className="text-gray-500 text-center py-6 italic">No certifications added yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Languages */}
          <div>
            <h2 className="text-xl font-medium mb-6 pb-2 border-b border-gray-600/20">Languages</h2>
            <textarea
              placeholder="Languages and proficiency levels (comma-separated) - e.g., English (Fluent), Hindi (Native), Spanish (Intermediate)"
              value={languagesRawInput}
              onChange={(e) => {
                handleLanguagesChange(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              onBlur={handleLanguagesBlur}
              className="auto-resize w-full px-4 py-3 text-white placeholder-gray-500 transition-all border border-gray-600/30 focus:border-gray-500/50 focus:outline-none"
              style={{ backgroundColor: '#151515' }}
            />
          </div>

          {/* Additional Sections - Always visible now */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-600/20">
              <h2 className="text-xl font-medium">Additional Information</h2>
              <button
                onClick={addAdditionalSection}
                className="text-white px-4 py-2 rounded-3xl transition-all hover:opacity-90 flex items-center space-x-2 text-sm"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Additional Section</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {resumeData.additional_sections.map((section, index) => (
                <div key={section.id} className="border border-gray-600/20 rounded-3xl p-4" style={{ backgroundColor: '#0A0A0A' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-300 text-sm">Section {index + 1}</h3>
                    <button
                      onClick={() => removeAdditionalSection(section.id)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Section Name"
                      value={section.section_name}
                      onChange={(e) => updateAdditionalSection(section.id, 'section_name', e.target.value)}
                      className="w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                    <textarea
                      placeholder="Section content..."
                      value={section.content}
                      onChange={(e) => handleTextareaChange(e, (value) => updateAdditionalSection(section.id, 'content', value))}
                      className="auto-resize w-full border border-gray-600/30 rounded-3xl px-3 py-2 text-white placeholder-gray-500 text-sm focus:border-gray-500/50 focus:outline-none resize-none transition-all"
                      style={{ backgroundColor: '#151515' }}
                    />
                  </div>
                </div>
              ))}
              {resumeData.additional_sections.length === 0 && (
                <p className="text-gray-500 text-center py-6 italic">No additional sections added yet. Click "Add Additional Section" to create custom sections like Hobbies, Volunteer Work, etc.</p>
              )}
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h2 className="text-xl font-medium mb-6 pb-2 border-b border-gray-600/20">Job Description (Optional)</h2>
            <p className="text-gray-400 mb-4 text-sm">
              Paste the job description to optimize your resume content with AI
            </p>
            <textarea
              placeholder="Paste the job description here and our AI will tailor your resume content to match the requirements..."
              value={jobDescription}
              onChange={(e) => handleTextareaChange(e, setJobDescription)}
              className="auto-resize w-full border border-gray-600/30 rounded-3xl px-4 py-3 text-white placeholder-gray-500 focus:border-gray-500/50 focus:outline-none resize-none transition-all"
              style={{ backgroundColor: '#151515' }}
            />
            {jobDescription && (
              <div className="mt-4 p-3 bg-gray-800 border border-gray-600 rounded-md flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                <p className="text-green-400 text-sm">
                  AI will optimize your resume to match this job description
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-600/20">
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={handleContinueToTemplates}
            disabled={!resumeData.personalInfo.name}
            className="px-8 py-3 rounded-3xl font-medium transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-white hover:opacity-90"
            style={{ backgroundColor: '#2A2A2A' }}
          >
            <span>Continue to Templates</span>
                <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDetails; 