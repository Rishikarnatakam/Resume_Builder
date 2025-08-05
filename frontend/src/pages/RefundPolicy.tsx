import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const RefundPolicy: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-white">Refund Policy</h1>
          <p className="text-gray-400 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-neutral-900 rounded-lg shadow-sm p-8 space-y-6 border border-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. General Policy</h2>
            <div className="space-y-3 text-gray-300">
              <p>Due to the digital nature of our services, most purchases are non-refundable. However, we may consider refunds in specific circumstances.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. When Refunds Are Available</h2>
            <div className="space-y-3 text-gray-300">
              <p>We may provide refunds in the following cases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Duplicate charges due to system errors</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Non-Refundable Items</h2>
            <div className="space-y-3 text-gray-300">
              <p>The following are generally non-refundable:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Message pack purchases (once messages are consumed)</li>
                <li>Subscription payments after service period has begun</li>
                <li>Services that have been fully utilized</li>
                <li>Change of mind or dissatisfaction with service quality</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. How to Request a Refund</h2>
            <div className="space-y-3 text-gray-300">
              <p>To request a refund:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Contact our support team at craftairesume@gmail.com</li>
                <li>Include your order ID and reason for refund</li>
                <li>Provide any relevant documentation</li>
                <li>We will review your request within 3-5 business days</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Refund Processing</h2>
            <div className="space-y-3 text-gray-300">
              <p>Approved refunds will be processed through the original payment method within 10-14 business days.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Contact Us</h2>
            <div className="space-y-3 text-gray-300">
              <p>If you have any questions about our refund policy, please contact us at:</p>
              <p>Email: craftairesume@gmail.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy; 