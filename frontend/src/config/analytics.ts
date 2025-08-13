// Google Analytics Configuration
export const ANALYTICS_CONFIG = {
  // Replace with your actual Measurement ID from Google Analytics
  MEASUREMENT_ID: 'G-1LD7PC8S87',
  
  // Custom dimensions and metrics
  CUSTOM_DIMENSIONS: {
    USER_TYPE: 'cd1', // Free vs Premium user
    TEMPLATE_USED: 'cd2', // Which template was used
    AI_CREDITS_REMAINING: 'cd3', // User's remaining credits
  },
  
  // Event categories
  EVENT_CATEGORIES: {
    RESUME_BUILDER: 'resume_builder',
    AI_FEATURES: 'ai_features',
    AUTHENTICATION: 'authentication',
    BILLING: 'billing',
    TEMPLATES: 'templates',
    USER_ENGAGEMENT: 'user_engagement',
  },
  
  // Event actions
  EVENT_ACTIONS: {
    // Resume actions
    RESUME_CREATED: 'resume_created',
    RESUME_DOWNLOADED: 'resume_downloaded',
    RESUME_EDITED: 'resume_edited',
    RESUME_SAVED: 'resume_saved',
    
    // Template actions
    TEMPLATE_SELECTED: 'template_selected',
    TEMPLATE_PREVIEWED: 'template_previewed',
    
    // AI actions
    AI_CHAT_USED: 'ai_chat_used',
    AI_SUGGESTION_APPLIED: 'ai_suggestion_applied',
    AI_CREDITS_PURCHASED: 'ai_credits_purchased',
    
    // Authentication
    USER_LOGIN: 'user_login',
    USER_REGISTERED: 'user_registered',
    USER_LOGOUT: 'user_logout',
    
    // Billing
    SUBSCRIPTION_PURCHASED: 'subscription_purchased',
    PAYMENT_FAILED: 'payment_failed',
    UPGRADE_ATTEMPTED: 'upgrade_attempted',
    
    // Engagement
    PAGE_VIEWED: 'page_viewed',
    FEATURE_USED: 'feature_used',
    ERROR_OCCURRED: 'error_occurred',
  },
  
  // Page titles for tracking
  PAGE_TITLES: {
    LANDING: 'Landing Page',
    DASHBOARD: 'Dashboard',
    EDITOR: 'Resume Editor',
    TEMPLATES: 'Template Selection',
    BILLING: 'Billing & Pricing',
    LOGIN: 'Login',
    REGISTER: 'Register',
    AI_CHAT: 'AI Chat',
  },
};

// Helper function to get measurement ID
export const getMeasurementId = (): string => {
  return ANALYTICS_CONFIG.MEASUREMENT_ID;
};

// Helper function to check if analytics is enabled
export const isAnalyticsEnabled = (): boolean => {
  return process.env.NODE_ENV === 'production' && !!ANALYTICS_CONFIG.MEASUREMENT_ID;
};
