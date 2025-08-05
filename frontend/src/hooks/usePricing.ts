import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../config/api';

export interface PricingData {
  amount: number;
  currency: string;
  symbol: string;
  messages: number;
  display_price: string;
  country_code: string;
  smallest_unit: string;
}

export interface CountryInfo {
  country_code: string;
  country_name: string;
  currency: string;
  symbol: string;
}

export interface PackInfo {
  id: string;
  price: number;
  messages: number;
  currency: string;
  symbol: string;
  display_price: string;
}

export const usePricing = () => {
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect user's country
  const detectCountry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest('/pricing/detect-country');
      if (!response.ok) {
        throw new Error('Failed to detect country');
      }
      
      const data = await response.json();
      setCountryInfo(data);
      
      // Fetch packs for detected country
      await fetchPacksForCountry(data.country_code);
      
    } catch (err) {
      setError((err as Error).message);
      // Fallback to US
      setCountryInfo({
        country_code: 'US',
        country_name: 'United States',
        currency: 'USD',
        symbol: '$'
      });
      await fetchPacksForCountry('US');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch packs for specific country
  const fetchPacksForCountry = useCallback(async (countryCode: string) => {
    try {
      const response = await apiRequest(`/pricing/packs/${countryCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }
      
      const data = await response.json();
      setPacks(data.packs);
      
    } catch (err) {
      setError((err as Error).message);
      // Fallback to US packs
      const fallbackResponse = await apiRequest('/pricing/packs/US');
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        setPacks(fallbackData.packs);
      }
    }
  }, []);

  // Get pricing for specific pack
  const getPackPricing = useCallback(async (packId: string): Promise<PricingData | null> => {
    try {
      const response = await apiRequest(`/pricing/pack/${packId}`);
      if (!response.ok) {
        throw new Error('Failed to get pack pricing');
      }
      
      const data = await response.json();
      return data.pricing;
      
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  // Initialize pricing on component mount
  useEffect(() => {
    detectCountry();
  }, [detectCountry]);

  return {
    countryInfo,
    packs,
    loading,
    error,
    detectCountry,
    fetchPacksForCountry,
    getPackPricing,
    refreshPricing: detectCountry
  };
}; 