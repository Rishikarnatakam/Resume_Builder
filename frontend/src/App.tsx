import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ResumeProvider } from './context/ResumeContext';
import { EditorStateProvider } from './context/EditorStateContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateResume from './pages/CreateResume';
import ResumeDetails from './pages/ResumeDetails';
import Editor from './pages/Editor';
import Billing from './pages/Billing'; // Import the new Billing page
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import RefundPolicy from './pages/RefundPolicy';
import Contact from './pages/Contact';
import Demo from './pages/Demo';
import ProtectedRoute from './components/ProtectedRoute';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import SEOHead from './components/SEOHead';

function App() {
  return (
    <AuthProvider>
      <ResumeProvider>
        <EditorStateProvider>
        <Router>
          <SEOHead />
          <AnalyticsTracker>
            <div className="min-h-screen bg-black">
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <ResumeDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create/templates"
                element={
                  <ProtectedRoute>
                    <CreateResume />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/:resumeId?"
                element={
                  <ProtectedRoute>
                    <Editor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                }
              />
              
              {/* Legal and Support Pages (Public) */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/refund" element={<RefundPolicy />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Redirect any unmatched routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </div>
          </AnalyticsTracker>
        </Router>
        </EditorStateProvider>
      </ResumeProvider>
    </AuthProvider>
  );
}

export default App;
