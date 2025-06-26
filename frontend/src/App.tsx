import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ResumeProvider } from './context/ResumeContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateResume from './pages/CreateResume';
import ResumeDetails from './pages/ResumeDetails';
import Editor from './pages/Editor';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ResumeProvider>
        <Router>
          <div className="min-h-screen bg-black">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
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
              
              {/* Redirect any unmatched routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ResumeProvider>
    </AuthProvider>
  );
}

export default App;
