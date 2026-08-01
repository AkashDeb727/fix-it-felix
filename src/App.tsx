import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { CitizenComplaintForm } from './components/CitizenComplaintForm';
import { AdminDashboard } from './components/AdminDashboard';
import { InteractiveMap } from './components/InteractiveMap';
import { AIChatbot } from './components/AIChatbot';
import { Complaint, ComplaintStatus, DashboardStats, SESNotificationLog, UserLocationInfo } from './types';
import { fetchAllComplaints, fetchDashboardStats, updateComplaintStatus, AWS_BASE_URL } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'citizen' | 'dashboard'>('map');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    highPriority: 0,
    departmentBreakdown: {},
    priorityBreakdown: {},
    statusBreakdown: {}
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mapTargetCoords, setMapTargetCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [chatPromptText, setChatPromptText] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<UserLocationInfo>({
    lat: 37.7749,
    lng: -122.4194,
    locationName: 'Detecting Location...',
    cityName: 'Local Area',
    isLocating: true,
    locationError: false
  });

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation(prev => ({
        ...prev,
        isLocating: false,
        locationError: true,
        locationName: 'Location Unavailable'
      }));
      return;
    }

    setUserLocation(prev => ({ ...prev, isLocating: true, locationError: false }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.district || 'Local Region';
            const road = addr.road ? (addr.house_number ? `${addr.house_number} ${addr.road}` : addr.road) : '';
            const suburbOrNeighbourhood = addr.suburb || addr.neighbourhood || addr.quarter || '';
            const stateOrCountry = addr.state || addr.country_code?.toUpperCase() || '';

            const areaName = suburbOrNeighbourhood || road;
            const locationName = areaName
              ? `${areaName}, ${city}`
              : (stateOrCountry ? `${city}, ${stateOrCountry}` : city);

            const streetAddress = road ? `${road}${suburbOrNeighbourhood ? `, ${suburbOrNeighbourhood}` : ''}` : city;
            const postalCode = addr.postcode || '';

            setUserLocation({
              lat,
              lng,
              locationName,
              cityName: city,
              streetAddress,
              postalCode,
              isLocating: false,
              locationError: false
            });
          } else {
            setUserLocation({
              lat,
              lng,
              locationName: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
              cityName: 'Local Area',
              isLocating: false,
              locationError: false
            });
          }
        } catch {
          setUserLocation({
            lat,
            lng,
            locationName: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
            cityName: 'Local Area',
            isLocating: false,
            locationError: false
          });
        }
      },
      (err) => {
        console.warn('Geolocation error on App load:', err);
        setUserLocation(prev => ({
          ...prev,
          isLocating: false,
          locationError: true,
          locationName: 'GPS Access Denied'
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchComplaintsAndStats = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loadedComplaints = await fetchAllComplaints();
      setComplaints(loadedComplaints);

      const loadedStats = await fetchDashboardStats(loadedComplaints);
      setStats(loadedStats);
    } catch (err: any) {
      console.error('Error connecting to AWS API Gateway endpoints:', err);
      setErrorMessage(err.message || 'Failed to load complaints from AWS serverless backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintsAndStats();
  }, []);

  const handleComplaintSubmitted = (newComplaint: Complaint, _sesLog: SESNotificationLog) => {
    setComplaints((prev) => [newComplaint, ...prev]);
    fetchComplaintsAndStats();
    showToast(`Complaint submitted: ${newComplaint.complaint_id} (${newComplaint.priority} Priority)`);
  };

  const handleStatusUpdate = async (complaint_id: string, newStatus: ComplaintStatus, notes?: string) => {
    try {
      const res = await updateComplaintStatus(complaint_id, newStatus);
      if (res.status) {
        setComplaints((prev) =>
          prev.map((c) =>
            c.complaint_id === complaint_id
              ? { ...c, status: res.status, admin_notes: notes !== undefined ? notes : c.admin_notes }
              : c
          )
        );
        fetchComplaintsAndStats();
        showToast(`AWS Status updated for ${complaint_id} → ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to update status on AWS:', err);
      showToast(`Error updating status: ${err.message || 'Network error'}`);
    }
  };

  const handleResetData = async () => {
    fetchComplaintsAndStats();
    showToast('Refreshed data directly from AWS API Gateway.');
  };

  const handleViewOnMap = (lat: number, lng: number) => {
    setMapTargetCoords({ lat, lng });
    setActiveTab('map');
  };

  const handleOpenChatWithPrompt = (promptText: string) => {
    setChatPromptText(promptText);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#3A3F3B] flex flex-col font-sans antialiased selection:bg-[#C86A53] selection:text-white">
      
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        pendingCount={stats.pending}
        userLocation={userLocation}
        onRequestLocation={requestUserLocation}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-[#3A3F3B] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-bounce border border-white/20">
          <span className="w-2 h-2 rounded-full bg-[#6B8E7B]"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Bottom-Right AI Chatbot Widget */}
      <AIChatbot
        initialPrompt={chatPromptText}
        onClearInitialPrompt={() => setChatPromptText(null)}
      />

      {/* Connection / Loading State Banner */}
      {isLoading && (
        <div className="bg-[#6B8E7B]/10 border-b border-[#6B8E7B]/20 px-4 py-2 text-center text-xs text-[#6B8E7B] font-semibold flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Fetching real-time data from AWS API Gateway ({AWS_BASE_URL})...</span>
        </div>
      )}

      {/* Error Retry Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center text-xs text-red-800 font-semibold flex items-center justify-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={fetchComplaintsAndStats}
            className="px-2.5 py-1 rounded-lg bg-red-800 text-white hover:bg-red-900 transition-colors text-[11px] font-bold"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'map' && (
          <InteractiveMap
            complaints={complaints}
            userLocation={userLocation}
            selectedCoords={mapTargetCoords}
            onStatusUpdate={handleStatusUpdate}
            onNavigateToReport={() => setActiveTab('citizen')}
          />
        )}

        {activeTab === 'citizen' && (
          <CitizenComplaintForm
            onComplaintSubmitted={handleComplaintSubmitted}
            onViewOnMap={handleViewOnMap}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            userLocation={userLocation}
          />
        )}

        {activeTab === 'dashboard' && (
          <AdminDashboard
            complaints={complaints}
            stats={stats}
            onStatusUpdate={handleStatusUpdate}
            onViewOnMap={handleViewOnMap}
            onOpenChatWithPrompt={handleOpenChatWithPrompt}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E0D8] bg-white py-6 px-6 text-center text-xs text-[#3A3F3B]/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium">Fix-It Felix • {userLocation.locationName}</p>
          <p className="text-[11px] text-[#3A3F3B]/50 font-mono">
            AWS Production API: {AWS_BASE_URL}
          </p>
        </div>
      </footer>

    </div>
  );
}
