import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-black py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white">Contact Us</h1>
          <p className="text-gray-400 mt-2">Get in touch with our support team</p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Contact Information */}
          <div className="bg-neutral-900 rounded-lg shadow-sm p-8 border border-neutral-700">
            <h2 className="text-xl font-semibold text-white mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <EnvelopeIcon className="w-6 h-6 text-gray-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Email Support</h3>
                  <a 
                    href="mailto:craftairesume@gmail.com" 
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    craftairesume@gmail.com
                  </a>
                  <p className="text-sm text-gray-400">Response within 48 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <svg className="w-6 h-6 text-gray-400 mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <div>
                  <h3 className="font-medium text-white">Twitter</h3>
                  <a 
                    href="https://twitter.com/craftairesume" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    @craftairesume
                  </a>
                  <p className="text-sm text-gray-400">Follow us for updates</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-neutral-800 rounded-lg border border-neutral-600">
              <h3 className="font-medium text-white mb-2">Quick Support</h3>
              <p className="text-sm text-gray-300">
                For urgent issues or payment-related queries, please include your order ID in your message.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact; 