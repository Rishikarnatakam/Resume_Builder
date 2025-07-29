import React, { useEffect, useState, useCallback } from 'react';
import { getCurrentSubscription, apiRequest } from '../config/api';
import { formatCurrency } from '../lib/utils';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { UserIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';

interface UserSubscription {
  messages_used: number;
  message_quota: number;
}

interface TopupPack {
  id: string;
  name: string;
  price: number;
  messages: number;
  description: string;
}

const Billing: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);
  const [packs, setPacks] = useState<TopupPack[]>([]);
  const [showToast, setShowToast] = useState(false);

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

  const fetchPacks = useCallback(async () => {
    try {
      const response = await apiRequest('/subscriptions/topup-packs');
      if (!response.ok) {
        throw new Error('Failed to fetch message packs');
      }
      const data = await response.json();
      setPacks(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load message packs.');
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
    fetchPacks();
  }, [fetchSubscriptionData, fetchPacks]);

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
      const options = {
        key: res.key_id,
        order_id: res.order_id,
        amount: res.amount,
        currency: res.currency,
        name: 'ResumeCraft',
        description: pack ? `Top-up for ${pack.messages} messages` : 'Top-up',
        handler: async (response: any) => {
          setShowToast(true);
          await fetchSubscriptionData();
          // Auto-hide toast after 3 seconds
          setTimeout(() => setShowToast(false), 3000);
        },
        prefill: {},
        notes: {},
        theme: { color: '#3399CC' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError((err as Error).message || 'Failed to initiate top-up.');
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading billing data...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

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
              Need help? Contact us at <a href="mailto:support@resumecraft.com" className="underline hover:text-white">support@resumecraft.com</a>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Get more AI Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map((pack, idx) => {
            return (
              <div key={pack.id} className="rounded-3xl p-6 flex flex-col items-center text-center bg-[#212121] transition-all">
                <h3 className="text-3xl font-bold text-white mb-2 flex items-center justify-center">
                  {pack.name}
                  {pack.id === 'pro' && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-blue-600 text-xs font-semibold text-white">Most Popular</span>
                  )}
                  {pack.id === 'ultra' && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-yellow-400 text-xs font-semibold text-black">Best Value</span>
                  )}
                </h3>
                <p className="text-4xl font-extrabold text-white mb-4">
                  {formatCurrency(pack.price, 'INR')}<span className="text-lg font-medium text-gray-300"> / {pack.messages} messages</span>
                </p>
                <ul className="list-disc list-inside text-left text-gray-400 mb-6">
                  <li>{pack.messages} AI messages</li>
                  <li>Access to all resume templates</li>
                  <li>Priority support</li>
                </ul>
                <button
                  onClick={() => handleBuyPack(pack.id)}
                  className="mt-auto px-8 py-3 bg-gray-700 text-white font-semibold rounded-3xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                  disabled={topupLoading}
                >
                  {topupLoading ? 'Processing...' : 'Buy Now'}
                </button>
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