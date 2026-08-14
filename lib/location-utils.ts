export const OUTLET_LAT = 22.5178;
export const OUTLET_LNG = 88.3471;
export const OUTLET_ADDRESS = '9, Satish Mukherjee Rd, Manoharpukur, Kalighat, Kolkata, West Bengal 700026';

export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}
