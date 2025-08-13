import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { ANALYTICS_CONFIG } from '../config/analytics';

interface AnalyticsTrackerProps {
  children: React.ReactNode;
}

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ children }) => {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page view when route changes
    const pageTitle = getPageTitle(location.pathname);
    trackPageView(pageTitle, location.pathname);
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
      default:
        return 'Unknown Page';
    }
  };

  return <>{children}</>;
};
