import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentSubscription, apiRequest } from '../config/api';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { UserIcon, CheckCircleIcon, XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { usePricing } from '../hooks/usePricing';
import Logo from '../components/Logo';
import { useAnalytics } from '../hooks/useAnalytics';

interface UserSubscription {
  messages_used: number;
  message_quota: number;
}

const Billing: React.FC = () => {
  const { user, logout } = useAuth();
  const { trackSubscription } = useAnalytics();
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [paymentRestriction, setPaymentRestriction] = useState<boolean>(true);
  
  // Use the new pricing hook
  const { countryInfo, packs, loading: pricingLoading, error: pricingError } = usePricing();

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      const sub = await getCurrentSubscription();
      setCurrentSubscription(sub);
    } catch (err) {
      setError((err as Error).message || 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentRestriction = useCallback(async () => {
    try {
      const response = await apiRequest('/pricing/payment-restriction');
      if (response.ok) {
        const data = await response.json();
        setPaymentRestriction(data.india_only);
      }
    } catch (err) {
      // Error handling without console output
    }
  }, []);

  // Remove fetchPacks since we're using the pricing hook now

  useEffect(() => {
    fetchSubscriptionData();
    fetchPaymentRestriction();
  }, [fetchSubscriptionData, fetchPaymentRestriction]);

  const handleBuyPack = async (packId: string) => {
    try {
      setTopupLoading(true);
      setError(null);
      const response = await apiRequest('/subscriptions/purchase/topup', {
        method: 'POST',
        body: JSON.stringify({ pack_id: packId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create top-up order');
      }
      const res = await response.json();
      const pack = packs.find(p => p.id === packId);
      
      // Configure payment methods based on country
      const isInternational = res.country_code !== 'IN';
      
      // Base options
      const options: any = {
        key: res.key_id,
        order_id: res.order_id,
        amount: res.amount,
        currency: res.currency,
        name: 'ResumeCraft',
        description: pack ? `Top-up for ${pack.messages} messages` : 'Top-up',
        handler: async (_response: any) => {
          setShowToast(true);
          await fetchSubscriptionData();
          
          // Track successful subscription purchase
          if (pack) {
            trackSubscription(`Pack ${pack.id}`, pack.price);
          }
          
          // Auto-hide toast after 3 seconds
          setTimeout(() => setShowToast(false), 3000);
        },
        notes: {},
        theme: { color: '#3399CC' },
      };
      
             // Configure payment methods based on country
      if (isInternational) {
        // For international users: ONLY PayPal - hide all other payment methods
        options.method = {
          wallet: ["paypal"]
        };
        options.prefill = {
          method: "wallet"
        };
        // Force only PayPal to be shown and completely hide cards
        options.config = {
          display: {
            blocks: {
              wallet: {
                name: "PayPal",
                instruments: [
                  {
                    method: "wallet",
                    wallets: ["paypal"]
                  }
                ]
              }
            },
            sequence: ["block.wallet"],
            preferences: {
              show_default_blocks: false
            }
          }
        };
        // Explicitly disable cards for international users
        options.method = {
          wallet: ["paypal"],
          card: false,
          netbanking: false,
          upi: false,
          emi: false
        };
      } else {
        // For Indian users: All payment methods (cards, UPI, etc.)
        options.prefill = {
          method: "card"
        };
      }
       
       const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError((err as Error).message || 'Failed to initiate top-up.');
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading || pricingLoading) return <div className="p-8 text-center text-white">Loading billing data...</div>;
  if (error || pricingError) return <div className="p-8 text-center text-red-400">Error: {error || pricingError}</div>;

  const messagesUsed = currentSubscription?.messages_used || 0;
  const messageQuota = currentSubscription?.message_quota || 0;
  const messagesRemaining = messageQuota - messagesUsed;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      {/* Header copied from CreateResume */}
      <header className="border-b border-gray-600/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Logo size="md" />
              <Link to="/dashboard" className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
                <ArrowLeftIcon className="w-5 h-5 flex-shrink-0" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">{user?.full_name}</span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* End header */}
      <Helmet>
        <title>Billing & Credits - ResumeCraft</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Overview</h1>
        {/* Two-column grid for Message Balance and Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Message Balance Card */}
          <div className="bg-[#212121] border border-gray-600/30 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-4">AI Credits</h2>
            <div className="text-gray-400 mb-2">
              <p className="text-3xl font-bold text-gray-400">
                {messagesRemaining} messages remaining.
              </p>
              {messagesRemaining <= 6 && (
                <p className={`mt-4 font-semibold ${messagesRemaining <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>{messagesRemaining <= 3 ? 'Almost out! Buy more messages now.' : 'Running low? Buy more messages!'}</p>
              )}
            </div>
          </div>
          {/* Account Info Card */}
          <div className="bg-[#212121] border border-gray-600/30 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Account Info</h2>
            <div className="text-gray-400 mb-4">
              <p className="text-lg font-medium">Name: {user?.full_name}</p>
              <p className="text-lg font-medium">Email: {user?.email}</p>
            </div>
            <div className="text-sm text-gray-500 mt-6">
              Need help? Contact us at <a href="mailto:craftairesume@gmail.com" className="underline hover:text-white">craftairesume@gmail.com</a>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Get more AI Credits</h2>
          {countryInfo && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <GlobeAltIcon className="w-4 h-4" />
              <span>Pricing for {countryInfo.country_name}</span>
            </div>
          )}
        </div>
        
        {/* International Payment Notice */}
        {!paymentRestriction && countryInfo && countryInfo.country_code !== 'IN' && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400">International Payments Available via PayPal</h3>
                <p className="text-sm text-blue-300">
                  Great news! You can now pay using PayPal. All major credit cards, debit cards, and PayPal accounts are accepted.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* India-Only Restriction Notice */}
        {paymentRestriction && countryInfo && countryInfo.country_code !== 'IN' && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Payment Currently Limited to India</h3>
                <p className="text-sm text-yellow-300">
                  We're currently accepting payments from India only. Support for {countryInfo.country_name} and other countries will be available soon!
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map((pack, _idx) => {
            const isIndia = countryInfo?.country_code === 'IN';
            const canPurchase = !paymentRestriction || isIndia;
            
            return (
              <div key={pack.id} className="rounded-3xl p-6 flex flex-col items-center text-center bg-[#212121] transition-all">
                <h3 className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
                  {pack.id.charAt(0).toUpperCase() + pack.id.slice(1)}
                  {pack.id === 'pro' && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-blue-600 text-xs font-semibold text-white">Most Popular</span>
                  )}
                  {pack.id === 'ultra' && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-yellow-400 text-xs font-semibold text-black">Best Value</span>
                  )}
                </h3>
                <p className="text-4xl font-extrabold text-white mb-4">
                  {pack.display_price}<span className="text-lg font-medium text-gray-300"> / {pack.messages} messages</span>
                </p>
                <ul className="list-disc list-inside text-left text-gray-400 mb-6">
                  <li>{pack.messages} AI messages</li>
                  <li>Access to all resume templates</li>
                  <li>Priority support</li>
                </ul>
                
                {canPurchase ? (
                  <button
                    onClick={() => handleBuyPack(pack.id)}
                    className="mt-auto px-8 py-3 bg-gray-700 text-white font-semibold rounded-3xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                    disabled={topupLoading}
                  >
                    {topupLoading ? 'Processing...' : (isIndia ? 'Buy Now' : 'Pay with PayPal')}
                  </button>
                ) : (
                  <div className="mt-auto">
                    <button
                      className="px-8 py-3 bg-gray-600 text-gray-300 font-semibold rounded-3xl cursor-not-allowed"
                      disabled
                    >
                      Coming Soon
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Currently available in India only
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Professional Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out transform translate-x-0 opacity-100">
          <div className="bg-green-600 border border-green-500 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-100 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Success!</p>
              <p className="text-sm text-green-100">Your message balance has been updated.</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-green-100 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing; 