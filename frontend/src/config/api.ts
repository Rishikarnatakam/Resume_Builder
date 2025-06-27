// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_HOST = import.meta.env.VITE_API_HOST;

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
  const token = localStorage.getItem('token');
  
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