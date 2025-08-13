import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { ANALYTICS_CONFIG } from '../config/analytics';

interface AnalyticsTrackerProps {
  children: React.ReactNode;
}

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ children }) => {
  const location = useLocation();
  const { trackPageView, trackEvent } = useAnalytics();

  useEffect(() => {
    // Track page view when route changes
    const pageTitle = getPageTitle(location.pathname);
    trackPageView(pageTitle, location.pathname);
    
    // Log for debugging
    console.log('📍 Page changed:', { pathname: location.pathname, pageTitle });
  }, [location, trackPageView]);

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return ANALYTICS_CONFIG.PAGE_TITLES.LANDING;
      case '/dashboard':
        return ANALYTICS_CONFIG.PAGE_TITLES.DASHBOARD;
      case '/editor':
        return ANALYTICS_CONFIG.PAGE_TITLES.EDITOR;
      case '/templates':
        return ANALYTICS_CONFIG.PAGE_TITLES.TEMPLATES;
      case '/billing':
        return ANALYTICS_CONFIG.PAGE_TITLES.BILLING;
      case '/login':
        return ANALYTICS_CONFIG.PAGE_TITLES.LOGIN;
      case '/register':
        return ANALYTICS_CONFIG.PAGE_TITLES.REGISTER;
      case '/demo':
        return 'Demo Page';
      default:
        return 'Unknown Page';
    }
  };

  // Test function for debugging
  const testAnalytics = () => {
    console.log('🧪 Testing Analytics...');
    trackEvent('test_event', 'debug', 'manual_test', 1);
    trackPageView('Test Page', '/test');
  };

  return (
    <>
      {children}
      {/* Debug button - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={testAnalytics}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'red',
            color: 'white',
            border: 'none',
            padding: '10px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Analytics
        </button>
      )}
    </>
  );
};
