// Geocoding Service with multiple fallback providers
const GOOGLE_MAPS_API_KEY = 'AIzaSyCqZ5_9CEycIaYuhdYq4rDDnEVR1cnlHAA'; 

export interface GeocodingResult {
  address: string;
  provider: 'google' | 'locationiq' | 'nominatim' | 'opencage' | 'coordinates';
  success: boolean;
}

// Google Geocoding API (Most reliable)
const reverseGeocodeGoogle = async (latitude: number, longitude: number): Promise<GeocodingResult> => {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'AIzaSyCqZ5_9CEycIaYuhdYq4rDDnEVR1cnlHAA') {
    return {
      address: `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
      provider: 'coordinates',
      success: false
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return {
        address: data.results[0].formatted_address,
        provider: 'google',
        success: true
      };
    } else {
      throw new Error(data.status || 'No results');
    }
  } catch (error) {
    console.warn('Google Geocoding failed:', error);
    throw error; // Let fallback handle it
  }
};

// LocationIQ Geocoding (First priority)
const reverseGeocodeLocationIQ = async (latitude: number, longitude: number): Promise<GeocodingResult> => {
  const LOCATIONIQ_API_KEY = 'pk.fad1b5846b96f2bda6e2b1227478a887';

  if (!LOCATIONIQ_API_KEY) {
    throw new Error('LocationIQ API key not configured');
  }

  try {
    const response = await fetch(
      `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VehicleTrackingApp/1.0',
          'Accept-Language': 'en',
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.display_name) {
      return {
        address: data.display_name,
        provider: 'locationiq',
        success: true
      };
    } else {
      throw new Error('No address found');
    }
  } catch (error) {
    console.warn('LocationIQ Geocoding failed:', error);
    throw error;
  }
};

// OpenStreetMap Nominatim (Free, no API key needed)
const reverseGeocodeNominatim = async (latitude: number, longitude: number): Promise<GeocodingResult> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VehicleTrackingApp/1.0',
          'Accept-Language': 'en',
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.address) {
      const address = data.address;
      const parts = [];
      
      // Build readable address
      if (address.road) parts.push(address.road);
      if (address.house_number) parts.push(address.house_number);
      if (address.suburb) parts.push(address.suburb);
      if (address.city) parts.push(address.city);
      if (address.town) parts.push(address.town);
      if (address.village) parts.push(address.village);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      
      const formattedAddress = parts.length > 0 ? parts.join(', ') : 'Address not available';
      
      return {
        address: formattedAddress,
        provider: 'nominatim',
        success: true
      };
    } else {
      throw new Error('No address found');
    }
  } catch (error) {
    console.warn('Nominatim Geocoding failed:', error);
    throw error;
  }
};


const reverseGeocodeOpenCage = async (latitude: number, longitude: number): Promise<GeocodingResult> => {
  const OPENCAGE_API_KEY = 'YOUR_OPENCAGE_API_KEY'; // Optional: Get from https://opencagedata.com/
  
  if (!OPENCAGE_API_KEY || OPENCAGE_API_KEY === 'YOUR_OPENCAGE_API_KEY') {
    throw new Error('OpenCage API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1`
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return {
        address: data.results[0].formatted,
        provider: 'opencage',
        success: true
      };
    } else {
      throw new Error('No results found');
    }
  } catch (error) {
    console.warn('OpenCage Geocoding failed:', error);
    throw error;
  }
};

// Main geocoding function with fallbacks
export const reverseGeocode = async (latitude: number, longitude: number): Promise<GeocodingResult> => {
  const fallbacks = [
    reverseGeocodeLocationIQ,
    reverseGeocodeNominatim,
    reverseGeocodeGoogle,
    reverseGeocodeOpenCage
  ];

  for (const geocoder of fallbacks) {
    try {
      const result = await geocoder(latitude, longitude);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`Geocoder ${geocoder.name} failed:`, error);
      // Continue to next fallback
    }
    
  
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // All fallbacks failed, return coordinates
  return {
    address: `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
    provider: 'coordinates',
    success: false
  };
};


export const batchReverseGeocode = async (
  coordinates: Array<{lat: number, lng: number, id: string}>,
  onProgress?: (progress: number) => void
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  const total = coordinates.length;

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    try {
      const result = await reverseGeocode(coord.lat, coord.lng);
      results[coord.id] = result.address;
      
  
      if (onProgress) {
        onProgress(((i + 1) / total) * 100);
      }
      
    
      if (i < coordinates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to geocode coordinate ${coord.id}:`, error);
      results[coord.id] = `Location (${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)})`;
    }
  }

  return results;
};