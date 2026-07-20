export interface Coordinates {
  latitude: number;
  longitude: number;
}

const geoCache: Record<string, string> = {};

export const mapService = {
  getCurrentCoordinates(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (geoCache[key]) {
      return geoCache[key];
    }

    try {
      // Nominatim requires an email/user-agent, but for frontend client we call standard endpoint.
      // We will fallback to a readable lat/long description if Nominatim fails or is blocked.
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      
      if (!response.ok) {
        throw new Error('Nominatim request failed');
      }

      const data = await response.json();
      const displayName = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      geoCache[key] = displayName;
      return displayName;
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
      return `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }
};
