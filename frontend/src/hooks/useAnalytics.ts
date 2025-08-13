// Google Analytics Hook for Resume Builder
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const useAnalytics = () => {
  const trackEvent = (
    action: string,
    category: string,
    label?: string,
    value?: number
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('🔍 Analytics Event:', { action, category, label, value });
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    } else {
      console.warn('⚠️ Analytics not available:', { action, category, label, value });
    }
  };

  const trackPageView = (page_title: string, page_location?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('🔍 Analytics Page View:', { page_title, page_location });
      window.gtag('event', 'page_view', {
        page_title: page_title,
        page_location: page_location || window.location.href,
      });
    } else {
      console.warn('⚠️ Analytics not available for page view:', { page_title, page_location });
    }
  };

  const trackUserAction = (action: string, parameters?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('🔍 Analytics User Action:', { action, parameters });
      window.gtag('event', action, parameters);
    } else {
      console.warn('⚠️ Analytics not available for user action:', { action, parameters });
    }
  };

  // Resume Builder specific tracking functions
  const trackResumeCreation = (templateName: string) => {
    trackEvent('resume_created', 'resume_builder', templateName);
  };

  const trackResumeDownload = (templateName: string, format: string) => {
    trackEvent('resume_downloaded', 'resume_builder', `${templateName}_${format}`);
  };

  const trackTemplateSelection = (templateName: string) => {
    trackEvent('template_selected', 'resume_builder', templateName);
  };

  const trackAIChatUsage = (action: string, creditsUsed: number) => {
    trackEvent('ai_chat_used', 'ai_features', action, creditsUsed);
  };

  const trackSubscription = (plan: string, amount: number) => {
    trackEvent('subscription_purchased', 'billing', plan, amount);
  };

  const trackLogin = (method: string) => {
    trackEvent('user_login', 'authentication', method);
  };

  const trackRegistration = (method: string) => {
    trackEvent('user_registered', 'authentication', method);
  };

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackResumeCreation,
    trackResumeDownload,
    trackTemplateSelection,
    trackAIChatUsage,
    trackSubscription,
    trackLogin,
    trackRegistration,
  };
};
