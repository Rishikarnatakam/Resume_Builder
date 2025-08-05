import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white hover:text-gray-300 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          <p className="text-gray-400 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-neutral-900 rounded-lg shadow-sm p-8 space-y-6 border border-neutral-700">
                    <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. What You're Agreeing To</h2>
            <div className="space-y-3 text-gray-300">
              <p>By using ResumeCraft, you agree to these simple terms. It's like agreeing to play by the rules.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. What We Provide</h2>
            <div className="space-y-3 text-gray-300">
              <p>ResumeCraft gives you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-powered resume builder</li>
                <li>Multiple professional templates</li>
                <li>PDF export functionality</li>
                <li>Message credits for AI assistance</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Payment & Credits</h2>
            <div className="space-y-3 text-gray-300">
              <p>We use Razorpay for secure payments. When you buy message credits:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Credits are added to your account immediately</li>
                <li>Used credits cannot be refunded</li>
                <li>Unused credits don't expire</li>
                <li>Prices may change with notice</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. What You Can & Can't Do</h2>
            <div className="space-y-3 text-gray-300">
                              <p><strong>You CAN:</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create unlimited resumes</li>
                  <li>Use AI assistance with your credits</li>
                  <li>Export your resumes as PDF</li>
                  <li>Contact us to request account deletion</li>
                </ul>
               <p><strong>You CAN'T:</strong></p>
               <ul className="list-disc pl-6 space-y-2">
                 <li>Share your account with others</li>
                 <li>Try to break or hack our service</li>
                 <li>Use the service for illegal purposes</li>
                 <li>Spam or abuse the AI system</li>
               </ul>
             </div>
           </section>

                      <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Your Data & Privacy</h2>
              <div className="space-y-3 text-gray-300">
                <p>We take your privacy seriously:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your resume content belongs to you</li>
                  <li>We store your LaTeX code securely in our database</li>
                  <li>We don't share your personal data with third parties</li>
                  <li>You can request data deletion by contacting us</li>
                  <li>We use secure servers and encryption</li>
                </ul>
              </div>
            </section>

           <section>
             <h2 className="text-xl font-semibold text-white mb-4">6. Service Availability</h2>
             <div className="space-y-3 text-gray-300">
               <p>We try to keep ResumeCraft running 24/7, but sometimes:</p>
               <ul className="list-disc pl-6 space-y-2">
                 <li>We need to do maintenance (we'll warn you)</li>
                 <li>Things might break (we'll fix them quickly)</li>
                 <li>We're not responsible for internet issues</li>
                 <li>We can suspend accounts that break the rules</li>
               </ul>
             </div>
           </section>

           <section>
             <h2 className="text-xl font-semibold text-white mb-4">7. Simple Stuff</h2>
             <div className="space-y-3 text-gray-300">
               <ul className="list-disc pl-6 space-y-2">
                 <li>These terms can change (we'll tell you)</li>
                 <li>If something goes wrong, we'll try to fix it</li>
                 <li>We're not liable for job application outcomes</li>
                 <li>Contact us if you have questions</li>
               </ul>
             </div>
           </section>

           <section>
             <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
             <div className="space-y-3 text-gray-300">
               <p>Questions about these terms? Email us at:</p>
               <p>Email: craftairesume@gmail.com</p>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 