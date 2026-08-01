import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, RefreshCw, CheckCircle2, Clock, AlertTriangle, Layers, Eye, Filter, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Complaint, ComplaintPriority, ComplaintStatus, UserLocationInfo } from '../types';

interface InteractiveMapProps {
  complaints: Complaint[];
  userLocation: UserLocationInfo;
  selectedCoords?: { lat: number; lng: number } | null;
  onStatusUpdate?: (complaint_id: string, newStatus: ComplaintStatus) => Promise<void>;
  onNavigateToReport?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  complaints,
  userLocation,
  selectedCoords,
  onStatusUpdate,
  onNavigateToReport
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerLayerRef = useRef<L.LayerGroup | null>(null);

  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [feedStatusTab, setFeedStatusTab] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved'>('All');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  // Stats calculation
  const totalAreaIssues = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const filteredFeedComplaints = complaints.filter(c => {
    if (feedStatusTab !== 'All' && c.status !== feedStatusTab) return false;
    return true;
  });

  // Custom marker pin generator
  const createCustomMarkerIcon = (priority: ComplaintPriority, status: ComplaintStatus) => {
    let pinBg = '#C86A53'; // High priority Terracotta
    if (priority === 'Medium') pinBg = '#D97706'; // Warm Amber
    if (priority === 'Low') pinBg = '#6B8E7B'; // Muted Sage

    if (status === 'Resolved') pinBg = '#6B8E7B'; // Muted Sage for resolved

    const htmlSvg = `
      <div style="
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: ${pinBg};
          border: 3px solid #FFFFFF;
          box-shadow: 0 6px 16px rgba(58,63,59,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 11px;
          font-family: system-ui, sans-serif;
        ">
          ${status === 'Resolved' ? '✓' : priority === 'High' ? '!' : priority === 'Medium' ? 'M' : 'L'}
        </div>
      </div>
    `;

    return L.divIcon({
      html: htmlSvg,
      className: 'custom-urban-map-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -18]
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.lat || 37.7749;
      const initialLng = userLocation?.lng || -122.4194;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: true
      });

      // Warm CartoDB Voyager tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      userMarkerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Live User Location Pin and Center Map on User Position
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!userMarkerLayerRef.current) {
      userMarkerLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    userMarkerLayerRef.current.clearLayers();

    if (userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      const userIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.25); border: 2px solid #2563EB;"></div>
            <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 4px 14px rgba(37,99,235,0.5); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 11px;">
              📍
            </div>
          </div>
        `,
        className: 'custom-user-live-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; color: #3A3F3B;">
          <strong style="color: #2563EB; font-size: 12px; display: block;">📍 Your Current Live Location</strong>
          <span style="font-size: 11px; color: #585D59;">${userLocation.locationName}</span>
        </div>
      `);
      userMarkerLayerRef.current.addLayer(userMarker);

      // If no specific complaint coordinate target was passed, center directly on user location
      if (!selectedCoords) {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13, { animate: true });
      }
    }
  }, [userLocation]);

  // Center on selected coordinates if provided
  useEffect(() => {
    if (selectedCoords && mapInstanceRef.current) {
      mapInstanceRef.current.setView([selectedCoords.lat, selectedCoords.lng], 15, {
        animate: true
      });
    }
  }, [selectedCoords]);

  // Update Markers when complaints or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = complaints.filter(c => {
      if (priorityFilter !== 'All' && c.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
      if (statusFilter !== 'All' && c.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (categoryFilter !== 'All' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      return true;
    });

    filtered.forEach(c => {
      const icon = createCustomMarkerIcon(c.priority, c.status);
      const marker = L.marker([c.latitude, c.longitude], { icon });

      const photoHtml = (c.photos && c.photos.length > 0)
        ? `<div style="margin-top: 8px; margin-bottom: 8px;"><img src="${c.photos[0]}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px;" /></div>`
        : '';

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; padding: 6px; width: 230px; color: #3A3F3B;">
          <div style="font-size: 11px; font-weight: 700; color: #6B8E7B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
            ${c.complaint_id} • ${c.category}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #3A3F3B; margin-bottom: 4px; line-height: 1.3;">
            ${c.title}
          </div>
          ${photoHtml}
          <div style="font-size: 11px; color: #585D59; margin-bottom: 6px; line-height: 1.5;">
            <strong>Dept:</strong> ${c.department}<br/>
            <strong>Priority:</strong> <span style="color: ${c.priority === 'High' ? '#C86A53' : '#3A3F3B'}">${c.priority}</span> | 
            <strong>Status:</strong> ${c.status}
          </div>
          <div style="font-size: 11px; color: #3A3F3B; background-color: #F7F5F0; padding: 8px; border-radius: 8px; line-height: 1.4;">
            "${c.summary}"
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setActiveComplaint(c);
      });
      markersLayerRef.current?.addLayer(marker);
    });

  }, [complaints, priorityFilter, statusFilter, categoryFilter]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    }
  };

  const handleFocusItem = (c: Complaint) => {
    setActiveComplaint(c);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([c.latitude, c.longitude], 15, { animate: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Geographical Header & Primary Metrics */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 text-[#6B8E7B] text-xs font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#C86A53]" />
            <span>{userLocation?.locationName || 'Detecting Location...'} • Local Area Overview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#3A3F3B] tracking-tight">
            Community Maintenance Map & Issues
          </h2>
          <p className="text-sm text-[#3A3F3B]/70 mt-1">
            Real-time geospatial tracker for reported road hazards, sanitation requests, public lighting, and civic maintenance.
          </p>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Issues in Your Area */}
          <div className="urban-card p-5 sm:p-6 transition-all hover:translate-y-[-2px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#3A3F3B]/70 uppercase tracking-wider">
                Issues in Area
              </span>
              <div className="p-2 rounded-xl bg-[#F7F5F0] text-[#3A3F3B]">
                <MapPin className="w-5 h-5 text-[#C86A53]" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#3A3F3B]">{totalAreaIssues}</div>
            <p className="text-xs text-[#3A3F3B]/60 mt-1">Logged in district</p>
          </div>

          {/* Card 2: Pending Issues */}
          <div className="urban-card p-5 sm:p-6 transition-all hover:translate-y-[-2px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#3A3F3B]/70 uppercase tracking-wider">
                Pending Review
              </span>
              <div className="p-2 rounded-xl bg-[#F7F5F0] text-[#D97706]">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#3A3F3B]">{pendingCount}</div>
            <p className="text-xs text-[#D97706] font-medium mt-1">Awaiting dispatch</p>
          </div>

          {/* Card 3: In Progress */}
          <div className="urban-card p-5 sm:p-6 transition-all hover:translate-y-[-2px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#3A3F3B]/70 uppercase tracking-wider">
                In Progress
              </span>
              <div className="p-2 rounded-xl bg-[#F7F5F0] text-[#0284C7]">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#3A3F3B]">{inProgressCount}</div>
            <p className="text-xs text-[#0284C7] font-medium mt-1">Crews dispatched</p>
          </div>

          {/* Card 4: Resolved Issues */}
          <div className="urban-card p-5 sm:p-6 transition-all hover:translate-y-[-2px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#3A3F3B]/70 uppercase tracking-wider">
                Resolved Issues
              </span>
              <div className="p-2 rounded-xl bg-[#6B8E7B]/10 text-[#6B8E7B]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#3A3F3B]">{resolvedCount}</div>
            <p className="text-xs text-[#6B8E7B] font-semibold mt-1">Completed repairs</p>
          </div>

        </div>
      </div>

      {/* Map Filter Controls Bar */}
      <div className="urban-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 text-sm font-bold text-[#3A3F3B]">
          <Filter className="w-4 h-4 text-[#C86A53]" />
          <span>Filter Map Pins:</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs">
            <span className="text-[#3A3F3B]/60 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-[#3A3F3B] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">Terracotta High (!)</option>
              <option value="Medium">Amber Medium (M)</option>
              <option value="Low">Sage Low (L)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs">
            <span className="text-[#3A3F3B]/60 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[#3A3F3B] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <button
            onClick={handleRecenter}
            className="px-3.5 py-2 bg-[#F7F5F0] hover:bg-[#EAE6DF] border border-[#E5E0D8] rounded-xl text-xs text-[#3A3F3B] font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#6B8E7B]" />
            <span>Recenter Map</span>
          </button>
        </div>
      </div>

      {/* Main Map Frame */}
      <div className="urban-card p-3 overflow-hidden">
        <div
          ref={mapContainerRef}
          className="w-full h-[520px] sm:h-[580px] rounded-xl z-10"
        />
      </div>

      {/* Nearby Incidents Grid */}
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#3A3F3B]">Local Area Incident Feed</h3>
            <p className="text-xs text-[#3A3F3B]/70 mt-0.5">Click any report card to focus on map coordinates.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Pills for Feed */}
            <div className="inline-flex p-1 rounded-2xl bg-[#F7F5F0] border border-[#E5E0D8] text-xs font-semibold">
              <button
                onClick={() => setFeedStatusTab('All')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  feedStatusTab === 'All'
                    ? 'bg-white text-[#3A3F3B] shadow-sm font-bold border border-[#E5E0D8]'
                    : 'text-[#3A3F3B]/70 hover:text-[#3A3F3B]'
                }`}
              >
                <span>All Feed</span>
                <span className="px-1.5 py-0.2 bg-[#3A3F3B]/10 text-[#3A3F3B] rounded-full text-[10px] font-mono">
                  {totalAreaIssues}
                </span>
              </button>

              <button
                onClick={() => setFeedStatusTab('Pending')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  feedStatusTab === 'Pending'
                    ? 'bg-amber-50 text-amber-900 shadow-sm font-bold border border-amber-200'
                    : 'text-[#3A3F3B]/70 hover:text-[#3A3F3B]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending</span>
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-mono">
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setFeedStatusTab('In Progress')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  feedStatusTab === 'In Progress'
                    ? 'bg-sky-50 text-sky-900 shadow-sm font-bold border border-sky-200'
                    : 'text-[#3A3F3B]/70 hover:text-[#3A3F3B]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
                <span>In Progress</span>
                <span className="px-1.5 py-0.2 bg-sky-200 text-sky-900 rounded-full text-[10px] font-mono">
                  {inProgressCount}
                </span>
              </button>

              <button
                onClick={() => setFeedStatusTab('Resolved')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  feedStatusTab === 'Resolved'
                    ? 'bg-emerald-50 text-emerald-900 shadow-sm font-bold border border-emerald-200'
                    : 'text-[#3A3F3B]/70 hover:text-[#3A3F3B]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resolved</span>
                <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-mono">
                  {resolvedCount}
                </span>
              </button>
            </div>

            {onNavigateToReport && (
              <button
                onClick={onNavigateToReport}
                className="btn-terracotta px-4 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <span>Report New Issue</span>
              </button>
            )}
          </div>
        </div>

        {filteredFeedComplaints.length === 0 ? (
          <div className="urban-card p-10 text-center space-y-2">
            <p className="text-sm font-bold text-[#3A3F3B]">No {feedStatusTab.toLowerCase()} incidents found in this area.</p>
            <p className="text-xs text-[#3A3F3B]/60">Select another filter tab or report a new issue to log an incident.</p>
            <button
              onClick={() => setFeedStatusTab('All')}
              className="mt-2 text-xs font-bold text-[#C86A53] hover:underline"
            >
              Show all incidents ({totalAreaIssues})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeedComplaints.map((c) => (
              <div
                key={c.complaint_id}
                onClick={() => handleFocusItem(c)}
                className={`urban-card p-6 transition-all cursor-pointer hover:translate-y-[-2px] border-2 ${
                  activeComplaint?.complaint_id === c.complaint_id
                    ? 'border-[#C86A53]'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#6B8E7B] uppercase tracking-wider font-mono">
                    {c.complaint_id}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      c.status === 'Resolved'
                        ? 'bg-[#6B8E7B]/15 text-[#6B8E7B]'
                        : c.status === 'In Progress'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <h4 className="font-bold text-[#3A3F3B] text-base mb-1 line-clamp-1">{c.title}</h4>
                <p className="text-xs text-[#3A3F3B]/70 mb-3 line-clamp-2 leading-relaxed">{c.summary}</p>

                {/* Photos preview if present */}
                {c.photos && c.photos.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {c.photos.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Incident photo"
                        className="w-16 h-16 rounded-lg object-cover border border-[#E5E0D8] shrink-0"
                      />
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-[#F7F5F0] flex items-center justify-between text-xs text-[#3A3F3B]/70">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#C86A53]" />
                    <span className="truncate max-w-[150px]">{c.address || `${c.latitude.toFixed(3)}, ${c.longitude.toFixed(3)}`}</span>
                  </span>
                  <span className="font-semibold text-[#3A3F3B]">{c.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
