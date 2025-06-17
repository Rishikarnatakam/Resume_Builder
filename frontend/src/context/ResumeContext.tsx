import React, { createContext, useContext, useState, useCallback } from 'react';

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    dates: string;
    location: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    dates: string;
    location: string;
  }>;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    dates: string;
  }>;
}

interface Resume {
  id: number;
  title: string;
  latex_content: string;
  job_description?: string;
  resume_data: ResumeData;
  pdf_path?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface ResumeContextType {
  currentResume: Resume | null;
  resumes: Resume[];
  isLoading: boolean;
  error: string | null;
  setCurrentResume: (resume: Resume | null) => void;
  setResumes: (resumes: Resume[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createEmptyResume: () => ResumeData;
}

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export const useResume = () => {
  const context = useContext(ResumeContext);
  if (context === undefined) {
    throw new Error('useResume must be used within a ResumeProvider');
  }
  return context;
};

interface ResumeProviderProps {
  children: React.ReactNode;
}

export const ResumeProvider: React.FC<ResumeProviderProps> = ({ children }) => {
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEmptyResume = useCallback((): ResumeData => {
    return {
      name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: []
    };
  }, []);

  const value: ResumeContextType = {
    currentResume,
    resumes,
    isLoading,
    error,
    setCurrentResume,
    setResumes,
    setIsLoading,
    setError,
    createEmptyResume
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
};

export type { ResumeData, Resume }; 