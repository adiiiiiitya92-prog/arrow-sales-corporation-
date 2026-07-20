import React, { useState } from 'react';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

interface SiteMapPickerProps {
  onAddressSelect: (lat: number, lng: number, address: string) => void;
  isLoaded: boolean;
}

export const SiteMapPicker: React.FC<SiteMapPickerProps> = ({ onAddressSelect, isLoaded: _isLoaded }) => {
  // Nominatim Address Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Manual Coordinates State
  const [manualLat, setManualLat] = useState('12.9716');
  const [manualLng, setManualLng] = useState('77.5946');
  const [siteName, setSiteName] = useState('Vidhana Soudha, Bengaluru');

  // GPS Fetching State
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const handleNominatimSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SolarCRM-ShadowAnalysis/1.0'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        const displayName = place.display_name;

        // Populate manual coordinate fields
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        setSiteName(displayName.split(',')[0]);

        // Proceed to Step 2 (Map Outline)
        onAddressSelect(lat, lng, displayName);
      } else {
        alert("No sites found. Please check spelling or enter latitude & longitude manually.");
      }
    } catch (err) {
      console.error("Geocoding fetch failed:", err);
      alert("Address search failed. Please try entering coordinates directly.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setManualLat(lat.toFixed(6));
        setManualLng(lng.toFixed(6));
        setSiteName("My Current GPS Location");
        setIsFetchingGps(false);

        // Proceed to Step 2
        onAddressSelect(lat, lng, "My Current GPS Location");
      },
      (error) => {
        console.error("GPS retrieval failed:", error);
        setIsFetchingGps(false);
        alert("Unable to fetch location. Please ensure site permissions are granted.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onAddressSelect(lat, lng, siteName.trim() || `Coordinates: ${lat}, ${lng}`);
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Search Input Bar (OSM Nominatim Fallback) */}
      <form onSubmit={handleNominatimSearch} className="space-y-2.5">
        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
          Step 1: Search Project Site Address
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="e.g. Lajpat Nagar Delhi, Mumbai Airport, or street address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 rounded-xl shadow transition-all flex items-center justify-center min-w-[70px] cursor-pointer disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {/* GPS Fetch Option */}
      <button
        onClick={handleFetchCurrentLocation}
        disabled={isFetchingGps}
        className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
      >
        {isFetchingGps ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-650" />
        ) : (
          <Navigation className="w-4 h-4 text-emerald-650 animate-pulse" />
        )}
        <span>Use My GPS Current Location</span>
      </button>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80"></div>
        </div>
        <div className="relative flex justify-center text-xs font-extrabold uppercase">
          <span className="bg-slate-50 px-3 text-[9px] text-slate-400 tracking-wider">
            Or Enter Coordinates Manually
          </span>
        </div>
      </div>

      {/* Manual Coordinates Override Form */}
      <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
            Site / Building Name
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. Factory Roof, Solar Area"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none text-center"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="0.000001"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none text-center"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Locate Site Coordinates</span>
        </button>
      </form>
    </div>
  );
};

export default SiteMapPicker;
