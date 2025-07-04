import { createClient } from '@supabase/supabase-js';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_HOST = import.meta.env.VITE_API_HOST;

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const apiConfig = {
  baseUrl: API_BASE_URL,
  host: API_HOST,
  
  // Helper methods for building URLs
  url: (endpoint: string) => `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
  hostUrl: (path: string) => `${API_HOST}${path.startsWith('/') ? path : `/${path}`}`,
  
  // Common endpoints
  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      me: '/auth/me',
    },
    resumes: {
      list: '/resumes/',
      create: '/resumes/',
      get: (id: string) => `/resumes/${id}`,
      delete: (id: string) => `/resumes/${id}`,
      updateTitle: (id: string) => `/resumes/${id}/title`,
      extractPdf: '/resumes/extract-pdf',
    },
    templates: {
      list: '/templates/',
      get: (name: string) => `/templates/${name}`,
    },
    ai: {
      sessionStart: '/ai/session/start',
      sessionMessage: '/ai/session/message',
      sessionEnd: (id: string) => `/ai/session/${id}`,
    },
    latex: {
      compileForAnalysis: '/latex/compile-for-analysis',
    },
  },
};

// Helper function for making API requests with consistent headers
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Get Supabase session token instead of localStorage token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',  // Skip ngrok browser warning
  };
  
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : apiConfig.url(endpoint);
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

export default apiConfig; 