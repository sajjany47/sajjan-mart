'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getDistanceInKm, geocodeAddress, OUTLET_LAT, OUTLET_LNG } from '@/lib/location-utils';
import { toast } from 'sonner';

export type LocationStatus = 'pending' | 'checking' | 'granted' | 'denied' | 'out_of_range';

interface LocationContextValue {
  coords: { lat: number; lng: number } | null;
  address: string | null;
  distance: number | null;
  status: LocationStatus;
  isWithinRange: boolean;
  loading: boolean;
  detectLocation: () => Promise<boolean>;
  setLocationByAddress: (address: string) => Promise<boolean>;
  resetLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sajjan-mart-location';

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          setCoords(parsed.coords || null);
          setAddress(parsed.address || null);
          setDistance(parsed.distance ?? null);
          setStatus(parsed.status || 'pending');
        }
      }
    } catch (e) {
      console.error('Failed to load saved location', e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (coords || address || distance || status !== 'pending') {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify({ coords, address, distance, status })
        );
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save location state', e);
    }
  }, [coords, address, distance, status, hydrated]);

  const updateLocationState = useCallback((lat: number, lng: number, addrName: string | null) => {
    const dist = getDistanceInKm(lat, lng, OUTLET_LAT, OUTLET_LNG);
    setCoords({ lat, lng });
    setDistance(dist);
    setAddress(addrName);
    if (dist <= 6.0) {
      setStatus('granted');
      return true;
    } else {
      setStatus('out_of_range');
      return false;
    }
  }, []);

  const detectLocation = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      setStatus('denied');
      return false;
    }

    setLoading(true);
    setStatus('checking');

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let detectedAddress = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
          try {
            const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
            const revRes = await fetch(revUrl, {
              headers: { 'Accept-Language': 'en' },
            });
            if (revRes.ok) {
              const revData = await revRes.json();
              if (revData && revData.display_name) {
                detectedAddress = revData.display_name;
              }
            }
          } catch (e) {
            console.warn('Reverse geocoding failed', e);
          }

          const isOk = updateLocationState(latitude, longitude, detectedAddress);
          setLoading(false);
          if (isOk) {
            toast.success('Location detected successfully!');
          } else {
            toast.warning('Detected location is outside our food delivery range.');
          }
          resolve(isOk);
        },
        (error) => {
          console.error('Error getting location', error);
          setLoading(false);
          setStatus('denied');
          toast.error('Could not access your location. Please check browser permissions.');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [updateLocationState]);

  const setLocationByAddress = useCallback(async (addrString: string): Promise<boolean> => {
    if (!addrString.trim()) {
      toast.error('Please enter a valid address.');
      return false;
    }
    setLoading(true);
    setStatus('checking');
    try {
      const result = await geocodeAddress(addrString);
      if (result) {
        const isOk = updateLocationState(result.lat, result.lng, result.displayName);
        setLoading(false);
        if (isOk) {
          toast.success('Delivery location set successfully!');
        } else {
          toast.warning('This address is outside our food delivery range.');
        }
        return isOk;
      } else {
        setLoading(false);
        setStatus('pending');
        toast.error('Address not found. Please try adding more details (like pincode or city).');
        return false;
      }
    } catch (e) {
      setLoading(false);
      setStatus('pending');
      toast.error('Failed to geocode address. Please check your internet connection.');
      return false;
    }
  }, [updateLocationState]);

  const resetLocation = useCallback(() => {
    setCoords(null);
    setAddress(null);
    setDistance(null);
    setStatus('pending');
  }, []);

  const isWithinRange = status === 'granted';

  return (
    <LocationContext.Provider
      value={{
        coords,
        address,
        distance,
        status,
        isWithinRange,
        loading,
        detectLocation,
        setLocationByAddress,
        resetLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
