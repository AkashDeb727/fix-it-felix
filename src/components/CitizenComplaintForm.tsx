import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Sparkles, Send, CheckCircle2, Mail, ShieldAlert, Upload, X, Camera, ArrowRight, Image as ImageIcon, Building, Compass, Landmark as LandmarkIcon, LocateFixed } from 'lucide-react';
import { Complaint, SESNotificationLog, UserLocationInfo } from '../types';
import { submitNewComplaint } from '../services/api';

interface CitizenComplaintFormProps {
  onComplaintSubmitted: (complaint: Complaint, sesLog: SESNotificationLog) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  onNavigateToDashboard: () => void;
  userLocation?: UserLocationInfo;
}

export const CitizenComplaintForm: React.FC<CitizenComplaintFormProps> = ({
  onComplaintSubmitted,
  onViewOnMap,
  onNavigateToDashboard,
  userLocation
}) => {
  const [citizenName, setCitizenName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Detailed Structured Address State
  const [streetAddress, setStreetAddress] = useState('45 MG Road');
  const [landmark, setLandmark] = useState('Near Landmark');
  const [postalCode, setPostalCode] = useState('560001');
  const [specificLocation, setSpecificLocation] = useState('Main Area');

  const [latitude, setLatitude] = useState<number>(userLocation?.lat || 37.7858);
  const [longitude, setLongitude] = useState<number>(userLocation?.lng || -122.4065);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>(
    userLocation?.locationName ? `${userLocation.locationName} • Pin placed on map` : 'Detecting user location...'
  );

  // Sync user location prop when available
  useEffect(() => {
    if (userLocation && !userLocation.isLocating) {
      setLatitude(userLocation.lat);
      setLongitude(userLocation.lng);
      setLocationStatus(`${userLocation.locationName} • Live GPS Pin Placed`);
      if (userLocation.streetAddress) {
        setStreetAddress(userLocation.streetAddress);
      }
      if (userLocation.postalCode) {
        setPostalCode(userLocation.postalCode);
      }
    }
  }, [userLocation]);

  // Mini Location Picker Map Refs
  const pickerMapContainerRef = useRef<HTMLDivElement>(null);
  const pickerMapInstanceRef = useRef<L.Map | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  
  // Photo upload state (Max 5 photos)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [submittedData, setSubmittedData] = useState<{
    complaint: Complaint;
    sesLog: SESNotificationLog;
  } | null>(null);

  // Custom Pin Marker Generator for Picker Map
  const createPickerPinIcon = () => {
    const htmlSvg = `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #C86A53;
          border: 3px solid #FFFFFF;
          box-shadow: 0 8px 20px rgba(200,106,83,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-weight: 800;
          font-size: 13px;
        ">
          📍
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlSvg,
      className: 'custom-picker-pin',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
  };

  // Initialize Interactive Pin Map Picker
  useEffect(() => {
    if (!pickerMapContainerRef.current) return;

    if (!pickerMapInstanceRef.current) {
      const map = L.map(pickerMapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: true
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      // Create initial draggable pin marker
      const marker = L.marker([latitude, longitude], {
        icon: createPickerPinIcon(),
        draggable: true
      }).addTo(map);

      marker.bindTooltip('Drag me or click map to pin issue location', { permanent: false, direction: 'top' });

      // Handle Marker Drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLatitude(position.lat);
        setLongitude(position.lng);
        setLocationStatus(`Pin Moved: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
      });

      // Handle Map Click
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setLatitude(lat);
        setLongitude(lng);
        setLocationStatus(`Pin Placed: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });

      pickerMarkerRef.current = marker;
      pickerMapInstanceRef.current = map;
    }

    return () => {
      if (pickerMapInstanceRef.current) {
        pickerMapInstanceRef.current.remove();
        pickerMapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map marker when latitude/longitude changes from external sources (e.g., GPS button)
  useEffect(() => {
    if (pickerMarkerRef.current && pickerMapInstanceRef.current) {
      pickerMarkerRef.current.setLatLng([latitude, longitude]);
      pickerMapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
    }
  }, [latitude, longitude]);

  // Handle Photo File selection (Up to 5 images)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      setPhotoError('You have already attached the maximum allowed 5 photos.');
      return;
    }

    const selectedFiles: File[] = [];
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const f = files.item(i);
      if (f) selectedFiles.push(f);
    }

    const newPhotoPromises: Promise<string>[] = [];

    selectedFiles.forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Please select valid image files (JPG, PNG, WebP).');
        return;
      }

      const promise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
      newPhotoPromises.push(promise);
    });

    Promise.all(newPhotoPromises).then((base64Photos) => {
      setPhotos((prev) => [...prev, ...base64Photos]);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoError(null);
  };

  // Handle HTML5 Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road ? (addr.house_number ? `${addr.house_number} ${addr.road}` : addr.road) : '';
            const city = addr.city || addr.town || addr.village || addr.suburb || 'Local Area';
            if (road) setStreetAddress(road);
            if (addr.postcode) setPostalCode(addr.postcode);
            setLocationStatus(`GPS Captured: ${road ? `${road}, ${city}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`);
          } else {
            setLocationStatus(`GPS Captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setLocationStatus(`GPS Captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setLocationStatus('GPS access denied. Using fallback coordinates.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenName.trim() || !title.trim() || !description.trim()) {
      setErrorMsg('Please fill in your name, complaint title, and detailed description.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      setLoadingStep('1/4 Connecting to Municipal API Gateway...');
      await new Promise(r => setTimeout(r, 400));

      setLoadingStep('2/4 Processing photos & invoking Gemini AI Categorizer...');
      await new Promise(r => setTimeout(r, 500));

      setLoadingStep('3/4 Categorizing issue & saving record to Amazon DynamoDB...');
      await new Promise(r => setTimeout(r, 400));

      setLoadingStep('4/4 Dispatching alert email via Amazon SES...');

      const imageStr = photos.length > 0 ? photos[0] : '';

      const formattedFullAddress = [
        streetAddress.trim(),
        specificLocation.trim() ? `Specific Location: ${specificLocation.trim()}` : '',
        landmark.trim() ? `Landmark: ${landmark.trim()}` : '',
        postalCode.trim() ? `PIN: ${postalCode.trim()}` : ''
      ].filter(Boolean).join(', ');

      setLoadingStep('Calling AWS API Gateway POST /submit...');

      const result = await submitNewComplaint({
        citizen_name: citizenName,
        title,
        description,
        latitude,
        longitude,
        street_address: streetAddress,
        landmark,
        postal_code: postalCode,
        specific_location: specificLocation,
        image: imageStr,
        address: formattedFullAddress || `District (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        photos
      });

      setIsSubmitting(false);

      if (result && result.complaint) {
        setSubmittedData({
          complaint: result.complaint,
          sesLog: result.sesNotification
        });
        onComplaintSubmitted(result.complaint, result.sesNotification);
      } else {
        throw new Error('Invalid response from AWS API Gateway.');
      }
    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Submission failed. Please try again.');
    }
  };

  const resetForm = () => {
    setCitizenName('');
    setTitle('');
    setDescription('');
    setStreetAddress('45 MG Road');
    setSpecificLocation('Gate 2');
    setLandmark('Near Metro Station');
    setPostalCode('560001');
    setPhotos([]);
    setSubmittedData(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Page Title Header */}
      <div className="text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 text-[#6B8E7B] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#C86A53]" />
          <span>Citizen Maintenance Portal • {userLocation?.locationName || 'Local Area'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#3A3F3B] tracking-tight">
          Report a Municipal Civic Issue
        </h2>
        <p className="mt-1 text-sm text-[#3A3F3B]/70 max-w-2xl leading-relaxed">
          Submit damaged roads, potholes, sanitation overflow, or streetlight outages with up to 5 photos. Gemini AI will analyze your report, assign department routing, and notify district supervisors.
        </p>
      </div>

      {/* Form Container (Pure White Card on Warm Sand) */}
      {!submittedData ? (
        <div className="urban-card p-6 sm:p-8 space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Citizen Name */}
            <div>
              <label htmlFor="citizen_name" className="block text-sm font-semibold text-[#3A3F3B] mb-1.5">
                Your Full Name <span className="text-[#C86A53]">*</span>
              </label>
              <input
                id="citizen_name"
                type="text"
                required
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#3A3F3B] placeholder-[#3A3F3B]/40 focus:outline-none focus:ring-2 focus:ring-[#C86A53] text-sm transition-all"
              />
            </div>

            {/* Complaint Title */}
            <div>
              <label htmlFor="complaint_title" className="block text-sm font-semibold text-[#3A3F3B] mb-1.5">
                Issue Title <span className="text-[#C86A53]">*</span>
              </label>
              <input
                id="complaint_title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep Pothole on Market St & 4th Street"
                className="w-full bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#3A3F3B] placeholder-[#3A3F3B]/40 focus:outline-none focus:ring-2 focus:ring-[#C86A53] text-sm transition-all"
              />
            </div>

            {/* Complaint Description */}
            <div>
              <label htmlFor="complaint_description" className="block text-sm font-semibold text-[#3A3F3B] mb-1.5">
                Detailed Description <span className="text-[#C86A53]">*</span>
              </label>
              <textarea
                id="complaint_description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the condition, safety hazard level, estimated size, or specific impact on traffic/pedestrians..."
                className="w-full bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-4 py-3 text-[#3A3F3B] placeholder-[#3A3F3B]/40 focus:outline-none focus:ring-2 focus:ring-[#C86A53] text-sm transition-all resize-y"
              />
            </div>

            {/* PHOTO UPLOAD CONTAINER (Up to 5 Photos) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-[#3A3F3B]">
                  Attach Photos of Issue <span className="text-xs text-[#3A3F3B]/60 font-normal">(Maximum 5 photos)</span>
                </label>
                <span className="text-xs font-bold text-[#6B8E7B]">
                  {photos.length} / 5 photos attached
                </span>
              </div>

              {/* Photo Upload Drop Area */}
              {photos.length < 5 && (
                <div className="relative border-2 border-dashed border-[#E5E0D8] hover:border-[#C86A53] rounded-2xl p-6 text-center bg-[#F7F5F0] transition-colors cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-[#C86A53] group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#3A3F3B] group-hover:text-[#C86A53]">
                        Click or drag images to upload
                      </span>
                      <p className="text-xs text-[#3A3F3B]/60 mt-0.5">
                        High resolution pavement photos help Gemini AI assess urgency
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {photoError && (
                <p className="text-xs font-semibold text-red-600 mt-1">{photoError}</p>
              )}

              {/* Photo Preview Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group rounded-xl overflow-hidden border border-[#E5E0D8] shadow-sm bg-white">
                      <img
                        src={photo}
                        alt={`Upload preview ${index + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-mono rounded">
                        #{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Location Pin Map & Detailed Address Form */}
            <div className="bg-[#F7F5F0] border border-[#E5E0D8] rounded-2xl p-5 sm:p-6 space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#C86A53]" />
                    <span className="text-base font-bold text-[#3A3F3B]">Location Pin & Site Address</span>
                  </div>
                  <p className="text-xs text-[#3A3F3B]/70 mt-0.5">
                    Pinpoint exact coordinates on the map so municipal maintenance crews can reach the location easily.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="btn-sage px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
                </button>
              </div>

              {/* Interactive Mini Map Picker */}
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-[#E5E0D8] shadow-sm">
                  <div
                    ref={pickerMapContainerRef}
                    className="w-full h-[240px] sm:h-[260px] z-10"
                  />
                  <div className="absolute top-3 left-3 z-[20] bg-white/95 backdrop-blur-sm border border-[#E5E0D8] px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#3A3F3B] shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C86A53] animate-pulse"></span>
                    <span>Click or drag pin to mark exact location</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#3A3F3B]/80 bg-white p-3 rounded-xl border border-[#E5E0D8] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#3A3F3B]">Pinned Coordinates:</span>
                    <span className="font-mono text-[#6B8E7B] font-bold bg-[#6B8E7B]/10 px-2 py-0.5 rounded">
                      Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                    </span>
                  </div>
                  <span className="text-[#3A3F3B]/60 text-[11px] font-medium">{locationStatus}</span>
                </div>
              </div>

              {/* Detailed Structured Address Form */}
              <div className="space-y-4 pt-2 border-t border-[#E5E0D8]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B8E7B] block">
                  Detailed Site Address & Access Landmark
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Street Address */}
                  <div className="sm:col-span-2">
                    <label htmlFor="street_address" className="block text-xs font-semibold text-[#3A3F3B] mb-1">
                      Street Address <span className="text-[#C86A53]">*</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-[#3A3F3B]/40 absolute left-3 top-3" />
                      <input
                        id="street_address"
                        type="text"
                        required
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="e.g. 45 MG Road"
                        className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-9 pr-3.5 py-2.5 text-[#3A3F3B] placeholder-[#3A3F3B]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A53]"
                      />
                    </div>
                  </div>

                  {/* Specific Location */}
                  <div>
                    <label htmlFor="specific_location" className="block text-xs font-semibold text-[#3A3F3B] mb-1">
                      Specific Location / Gate / Unit <span className="text-[#3A3F3B]/50 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="specific_location"
                      type="text"
                      value={specificLocation}
                      onChange={(e) => setSpecificLocation(e.target.value)}
                      placeholder="e.g. Gate 2 or In front of Crosswalk"
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-[#3A3F3B] placeholder-[#3A3F3B]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A53]"
                    />
                  </div>

                  {/* Landmark / Reference Point */}
                  <div>
                    <label htmlFor="landmark" className="block text-xs font-semibold text-[#3A3F3B] mb-1">
                      Landmark / Nearby Reference <span className="text-[#C86A53]">*</span>
                    </label>
                    <div className="relative">
                      <LandmarkIcon className="w-4 h-4 text-[#3A3F3B]/40 absolute left-3 top-3" />
                      <input
                        id="landmark"
                        type="text"
                        required
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near Metro Station"
                        className="w-full bg-white border border-[#E5E0D8] rounded-xl pl-9 pr-3.5 py-2.5 text-[#3A3F3B] placeholder-[#3A3F3B]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A53]"
                      />
                    </div>
                  </div>

                  {/* Postal / ZIP Code */}
                  <div className="sm:col-span-2">
                    <label htmlFor="postal_code" className="block text-xs font-semibold text-[#3A3F3B] mb-1">
                      Postal Code / PIN
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 560001"
                      className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3.5 py-2.5 text-[#3A3F3B] placeholder-[#3A3F3B]/40 text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A53]"
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Submission Progress / Action Button */}
            {isSubmitting ? (
              <div className="bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 rounded-xl p-5 text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#C86A53] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-[#3A3F3B]">Analyzing Report with Gemini AI...</span>
                </div>
                <p className="text-xs text-[#6B8E7B] font-mono animate-pulse">{loadingStep}</p>
              </div>
            ) : (
              <button
                type="submit"
                className="btn-terracotta w-full py-4 px-6 rounded-xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" />
                <span>Submit Report to District Maintenance</span>
                <Send className="w-4 h-4 ml-1" />
              </button>
            )}

          </form>
        </div>
      ) : (
        /* Submission Success Outcome Card */
        <div className="urban-card p-6 sm:p-8 space-y-6 border-2 border-[#6B8E7B]">
          
          <div className="flex items-start justify-between gap-4 border-b border-[#E5E0D8] pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#6B8E7B]/15 border border-[#6B8E7B]/30 flex items-center justify-center text-[#6B8E7B] shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B8E7B]">
                  Report Registered Successfully
                </span>
                <h3 className="text-xl font-bold text-[#3A3F3B] flex items-center gap-2">
                  <span>Reference ID:</span>
                  <span className="font-mono text-[#C86A53]">{submittedData.complaint.complaint_id}</span>
                </h3>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs text-[#3A3F3B]/60">Timestamp</span>
              <p className="text-xs font-mono text-[#3A3F3B] font-semibold">
                {new Date(submittedData.complaint.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* AI Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl p-4">
              <span className="text-xs text-[#3A3F3B]/60 font-medium block mb-1">AI Category</span>
              <span className="text-sm font-bold text-[#3A3F3B]">
                {submittedData.complaint.category}
              </span>
            </div>

            <div className="bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl p-4">
              <span className="text-xs text-[#3A3F3B]/60 font-medium block mb-1">Assigned Priority</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                submittedData.complaint.priority === 'High'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {submittedData.complaint.priority} Priority
              </span>
            </div>

            <div className="bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl p-4">
              <span className="text-xs text-[#3A3F3B]/60 font-medium block mb-1">Target Department</span>
              <span className="text-sm font-bold text-[#3A3F3B]">
                {submittedData.complaint.department}
              </span>
            </div>
          </div>

          {/* Photos Displayed if attached */}
          {submittedData.complaint.photos && submittedData.complaint.photos.length > 0 && (
            <div className="bg-[#F7F5F0] p-4 rounded-xl border border-[#E5E0D8] space-y-2">
              <span className="text-xs font-bold text-[#3A3F3B]">
                Attached Photos ({submittedData.complaint.photos.length}):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {submittedData.complaint.photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt="Attached incident"
                    className="w-20 h-20 rounded-lg object-cover border border-[#E5E0D8]"
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI Executive Summary */}
          <div className="bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 rounded-xl p-4 sm:p-5">
            <span className="text-xs font-bold text-[#6B8E7B] uppercase block mb-1">
              Gemini AI Summary
            </span>
            <p className="text-sm text-[#3A3F3B] leading-relaxed">
              "{submittedData.complaint.summary}"
            </p>
          </div>

          {/* Email Alert Banner */}
          <div className="bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#6B8E7B]" />
              <div>
                <span className="font-bold text-[#3A3F3B]">Notification Dispatched</span>
                <span className="text-[#3A3F3B]/60 block">Sent to management</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-[#6B8E7B] text-white font-mono rounded text-[11px] font-bold">
              DELIVERED
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DF] text-[#3A3F3B] text-sm font-semibold transition-colors border border-[#E5E0D8]"
            >
              Submit Another Report
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => onViewOnMap(submittedData.complaint.latitude, submittedData.complaint.longitude)}
                className="btn-sage px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>View Pin on Map</span>
              </button>

              <button
                onClick={onNavigateToDashboard}
                className="btn-terracotta px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <span>Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
