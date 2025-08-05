import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PrivacyPolicy: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="text-gray-400 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-neutral-900 rounded-lg shadow-sm p-8 space-y-6 border border-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <div className="space-y-3 text-gray-300">
              <p>We collect information you provide directly to us, such as when you:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create an account or update your profile</li>
                <li>Use our resume builder services</li>
                <li>Make payments through our platform</li>
                <li>Contact us for support</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <div className="space-y-3 text-gray-300">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our services</li>
                <li>Process payments and transactions</li>
                <li>Send you important updates and notifications</li>
                <li>Improve our services and user experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Payment Information</h2>
            <div className="space-y-3 text-gray-300">
              <p>Payment processing is handled securely by Razorpay. We do not store your complete payment card details on our servers. Razorpay's privacy policy applies to payment information.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
            <div className="space-y-3 text-gray-300">
              <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Contact Us</h2>
            <div className="space-y-3 text-gray-300">
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <p>Email: craftairesume@gmail.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 