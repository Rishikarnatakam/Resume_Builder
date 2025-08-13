import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';
import SEOHead from '../components/SEOHead';

const Demo: React.FC = () => {
  return (
    <>
      <SEOHead 
        title="Demo - ResumeCraft"
        description="Watch the complete ResumeCraft demo and see how AI-powered resume building works."
        keywords="resume builder demo, AI resume demo, LaTeX editor demo, professional resume demo"
      />
      
      <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
        {/* Navigation */}
        <nav className="relative z-50 px-6 py-4" style={{ backgroundColor: '#000000' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              <Logo size="lg" className="text-white" />
              <Link
                to="/"
                className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              <Link
                to="/"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/login"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-black px-6 py-3 rounded-3xl font-medium hover:bg-gray-100 transition-all"
                style={{ backgroundColor: '#2F2F2F', color: 'white' }}
              >
                Get started
              </Link>
            </motion.div>
          </div>
        </nav>

                 {/* Demo Section */}
         <section className="pt-8 pb-4" style={{ backgroundColor: '#000000' }}>
           <div className="max-w-6xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative max-w-6xl mx-auto"
              >
               {/* Video Container */}
               <div className="rounded-2xl overflow-hidden shadow-2xl">
                 <video
                   className="w-full h-auto"
                   controls
                   preload="metadata"
                   style={{ backgroundColor: '#1a1a1a' }}
                 >
                   <source src="/full-demo-video.mp4" type="video/mp4" />
                   Your browser does not support the video tag.
                 </video>
               </div>
             </motion.div>
           </div>
         </section>
      </div>
    </>
  );
};

export default Demo;
