import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Building2,
  Eye,
  MapPin,
  Sparkles,
  Filter,
  ShieldAlert,
  Check,
  Edit3,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Complaint, ComplaintStatus, DashboardStats } from '../types';

const ComplaintPinMap: React.FC<{ complaint: Complaint }> = ({ complaint }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const lat = complaint.latitude;
    const lng = complaint.longitude;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19
    }).addTo(map);

    const pinIcon = L.divIcon({
      html: `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: #C86A53;
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(200,106,83,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 15px;
        ">📍</div>
      `,
      className: 'custom-admin-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
        <strong style="color: #3A3F3B; display: block; margin-bottom: 2px;">${complaint.title}</strong>
        <span style="color: #6B8E7B; font-weight: 600;">${complaint.address || 'Issue Site Location'}</span>
      </div>
    `).openPopup();

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [complaint]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E5E0D8] shadow-sm">
      <div ref={mapRef} className="w-full h-[220px] z-10" />
    </div>
  );
};

interface AdminDashboardProps {
  complaints: Complaint[];
  stats: DashboardStats;
  onStatusUpdate: (complaint_id: string, newStatus: ComplaintStatus, notes?: string) => Promise<void>;
  onViewOnMap: (lat: number, lng: number) => void;
  onOpenChatWithPrompt: (promptText: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  complaints,
  stats,
  onStatusUpdate,
  onViewOnMap,
  onOpenChatWithPrompt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'All' && c.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (priorityFilter !== 'All' && c.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    if (categoryFilter !== 'All' && c.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = c.complaint_id.toLowerCase().includes(q);
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchCitizen = c.citizen_name.toLowerCase().includes(q);
      const matchDept = c.department.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchCitizen && !matchDept && !matchDesc) return false;
    }
    return true;
  });

  const handleQuickStatusChange = async (complaint_id: string, newStatus: ComplaintStatus) => {
    setUpdatingId(complaint_id);
    try {
      await onStatusUpdate(complaint_id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedComplaint) return;
    setUpdatingId(selectedComplaint.complaint_id);
    try {
      await onStatusUpdate(selectedComplaint.complaint_id, selectedComplaint.status, adminNoteInput);
      setSelectedComplaint((prev) => prev ? { ...prev, admin_notes: adminNoteInput } : null);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      
      {/* Dashboard Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#3A3F3B] tracking-tight">
            Municipal Admin Command Dashboard
          </h2>
          <p className="text-sm text-[#3A3F3B]/70 mt-1">
            Real-time monitoring of civic complaints, AI triage assignments, and field dispatch resolutions.
          </p>
        </div>

        {/* AI Quick Audit Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenChatWithPrompt("How many complaints are pending?")}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E0D8] text-xs text-[#3A3F3B] font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C86A53]" />
            <span>AI Pending Summary</span>
          </button>
          <button
            onClick={() => onOpenChatWithPrompt("Which department has the most high priority issues?")}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F7F5F0] border border-[#E5E0D8] text-xs text-[#C86A53] font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#C86A53]" />
            <span>High Priority Audit</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Complaints */}
        <div className="urban-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#3A3F3B]/60 uppercase tracking-wider">Total Issues</span>
            <div className="w-8 h-8 rounded-xl bg-[#F7F5F0] flex items-center justify-center text-[#3A3F3B]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#3A3F3B]">{stats.total}</div>
          <span className="text-[11px] text-[#3A3F3B]/60 mt-1 block font-mono">DynamoDB Records</span>
        </div>

        {/* Pending Complaints */}
        <div className="urban-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#3A3F3B]">{stats.pending}</div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">Awaiting Dispatch</span>
        </div>

        {/* In Progress */}
        <div className="urban-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#3A3F3B]">{stats.inProgress}</div>
          <span className="text-[11px] text-sky-700 font-semibold mt-1 block">Crews Dispatched</span>
        </div>

        {/* Resolved Complaints */}
        <div className="urban-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6B8E7B] uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-[#6B8E7B]/10 flex items-center justify-center text-[#6B8E7B]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#3A3F3B]">{stats.resolved}</div>
          <span className="text-[11px] text-[#6B8E7B] font-semibold mt-1 block">Cleared & Closed</span>
        </div>

        {/* High Priority */}
        <div className="col-span-2 lg:col-span-1 urban-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#C86A53] uppercase tracking-wider">High Priority</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#C86A53]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#C86A53]">{stats.highPriority}</div>
          <span className="text-[11px] text-[#C86A53] font-semibold mt-1 block">Critical Attention</span>
        </div>

      </div>

      {/* Toolbar / Search */}
      <div className="urban-card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#3A3F3B]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, title, citizen name, department..."
              className="w-full bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#3A3F3B] placeholder-[#3A3F3B]/40 focus:outline-none focus:ring-1 focus:ring-[#C86A53]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <div className="flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#3A3F3B]">
              <Filter className="w-3.5 h-3.5 text-[#3A3F3B]/60" />
              <span className="text-[#3A3F3B]/60">Status:</span>
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

            <div className="flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#3A3F3B]">
              <span className="text-[#3A3F3B]/60">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-[#3A3F3B] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#3A3F3B]">
              <span className="text-[#3A3F3B]/60">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-[#3A3F3B] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Roads & Potholes">Roads & Potholes</option>
                <option value="Sanitation & Waste">Sanitation & Waste</option>
                <option value="Public Lighting">Public Lighting</option>
                <option value="Water & Sewage">Water & Sewage</option>
                <option value="Parks & Recreation">Parks & Recreation</option>
                <option value="Traffic & Transport">Traffic & Transport</option>
                <option value="Building & Public Safety">Building & Safety</option>
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* Complaints Data Table */}
      <div className="urban-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#3A3F3B] text-base">Complaints Registry</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F7F5F0] border border-[#E5E0D8] text-xs font-mono font-bold text-[#6B8E7B]">
              {filteredComplaints.length} records
            </span>
          </div>
          <span className="text-xs text-[#3A3F3B]/50">Database: Amazon DynamoDB</span>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#3A3F3B]/60 text-sm">No complaints match your selected search filter criteria.</p>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('All'); setPriorityFilter('All'); setCategoryFilter('All'); }}
              className="mt-3 text-xs text-[#C86A53] hover:underline font-bold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F5F0] text-[#3A3F3B]/70 text-xs font-bold uppercase tracking-wider border-b border-[#E5E0D8]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Complaint ID & Citizen</th>
                  <th className="py-3.5 px-4">Title & Photos</th>
                  <th className="py-3.5 px-4">Category & Department</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status & Action</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D8]">
                {filteredComplaints.map((c) => (
                  <tr key={c.complaint_id} className="hover:bg-[#F7F5F0]/50 transition-colors">
                    
                    {/* ID & Citizen */}
                    <td className="py-4 px-4 sm:px-6 align-top">
                      <span className="font-mono text-xs font-bold text-[#6B8E7B] block">
                        {c.complaint_id}
                      </span>
                      <span className="text-xs text-[#3A3F3B] font-semibold block mt-0.5">
                        {c.citizen_name}
                      </span>
                      <span className="text-[11px] text-[#3A3F3B]/60 block mt-0.5">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Title & Photos */}
                    <td className="py-4 px-4 align-top max-w-xs">
                      <span className="font-bold text-[#3A3F3B] text-xs block truncate" title={c.title}>
                        {c.title}
                      </span>
                      <p className="text-xs text-[#3A3F3B]/70 mt-1 line-clamp-2 leading-relaxed">
                        {c.summary}
                      </p>
                      {c.photos && c.photos.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <ImageIcon className="w-3.5 h-3.5 text-[#6B8E7B]" />
                          <span className="text-[10px] font-bold text-[#6B8E7B]">
                            {c.photos.length} photo(s)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Category & Department */}
                    <td className="py-4 px-4 align-top">
                      <span className="text-xs font-semibold text-[#3A3F3B] block">
                        {c.category}
                      </span>
                      <span className="text-[11px] text-[#6B8E7B] block mt-0.5 font-medium">
                        {c.department}
                      </span>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-4 px-4 align-top">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        c.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : c.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.priority}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-4 px-4 align-top">
                      <select
                        value={c.status}
                        disabled={updatingId === c.complaint_id}
                        onChange={(e) => handleQuickStatusChange(c.complaint_id, e.target.value as ComplaintStatus)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer transition-all ${
                          c.status === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : c.status === 'In Progress'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 align-top text-right space-x-2">
                      <button
                        onClick={() => { setSelectedComplaint(c); setAdminNoteInput(c.admin_notes || ''); }}
                        className="px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-[#3A3F3B] transition-colors text-xs font-semibold inline-flex items-center gap-1"
                        title="Inspect Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C86A53]" />
                        <span className="hidden sm:inline">Inspect</span>
                      </button>

                      <button
                        onClick={() => onViewOnMap(c.latitude, c.longitude)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-[#3A3F3B] transition-colors text-xs font-semibold inline-flex items-center gap-1"
                        title="View Map Pin"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#6B8E7B]" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-[#3A3F3B]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="urban-card max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E0D8] pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#6B8E7B]">{selectedComplaint.complaint_id}</span>
                <h3 className="text-lg font-bold text-[#3A3F3B]">{selectedComplaint.title}</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg text-[#3A3F3B]/60 hover:text-[#3A3F3B] hover:bg-[#F7F5F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Summary Banner */}
            <div className="bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 rounded-xl p-4">
              <span className="text-xs font-bold text-[#6B8E7B] uppercase block mb-1">
                Gemini AI Assessment
              </span>
              <p className="text-sm text-[#3A3F3B]">{selectedComplaint.summary}</p>
            </div>

            {/* Uploaded Photos / Issue Evidence */}
            {(() => {
              const photoList: string[] = [];
              if (selectedComplaint.photos && selectedComplaint.photos.length > 0) {
                photoList.push(...selectedComplaint.photos);
              }
              if ((selectedComplaint as any).image && !photoList.includes((selectedComplaint as any).image)) {
                photoList.push((selectedComplaint as any).image);
              }
              if ((selectedComplaint as any).image_url && !photoList.includes((selectedComplaint as any).image_url)) {
                photoList.push((selectedComplaint as any).image_url);
              }
              if (photoList.length === 0) return null;

              return (
                <div className="bg-[#F7F5F0] p-4 rounded-xl border border-[#E5E0D8]">
                  <span className="text-xs text-[#3A3F3B] font-bold block mb-2.5 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#C86A53]" />
                    <span>Uploaded Citizen Issue Photo / Evidence ({photoList.length}):</span>
                  </span>
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {photoList.map((img, i) => (
                      <div key={i} className="shrink-0 relative group">
                        <img
                          src={img}
                          alt="Uploaded issue evidence"
                          className="h-40 max-w-[320px] object-cover rounded-xl border border-[#E5E0D8] bg-white shadow-sm transition-transform hover:scale-[1.02]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E5E0D8]">
                <span className="text-[#3A3F3B]/60 block font-medium">Citizen Name</span>
                <span className="font-bold text-[#3A3F3B]">{selectedComplaint.citizen_name}</span>
              </div>
              <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E5E0D8]">
                <span className="text-[#3A3F3B]/60 block font-medium">Assigned Department</span>
                <span className="font-bold text-[#3A3F3B]">{selectedComplaint.department}</span>
              </div>
              <div className="bg-[#F7F5F0] p-3 rounded-xl border border-[#E5E0D8]">
                <span className="text-[#3A3F3B]/60 block font-medium">Category</span>
                <span className="font-bold text-[#3A3F3B]">{selectedComplaint.category}</span>
              </div>
            </div>

            {/* Full Issue Site Address & Pinpoint Map View */}
            <div className="bg-[#F7F5F0] p-4 rounded-xl border border-[#E5E0D8] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B8E7B] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C86A53]" />
                    <span>Full Issue Site Address</span>
                  </span>
                  <p className="text-sm font-bold text-[#3A3F3B] mt-1">
                    {selectedComplaint.address || `GPS Site (${selectedComplaint.latitude}, ${selectedComplaint.longitude})`}
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#6B8E7B] bg-[#6B8E7B]/10 px-2.5 py-1 rounded-lg border border-[#6B8E7B]/20 shrink-0">
                  Lat: {selectedComplaint.latitude.toFixed(5)}, Lng: {selectedComplaint.longitude.toFixed(5)}
                </span>
              </div>

              {/* Pinpoint Leaflet Map View */}
              <ComplaintPinMap complaint={selectedComplaint} />
            </div>

            {/* Full Citizen Description */}
            <div>
              <span className="text-xs text-[#3A3F3B] font-bold block mb-1">Original Description:</span>
              <p className="bg-[#F7F5F0] p-3.5 rounded-xl border border-[#E5E0D8] text-xs text-[#3A3F3B] leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Admin Notes */}
            <div className="space-y-3 pt-2 border-t border-[#E5E0D8]">
              <label htmlFor="admin_notes_input" className="text-xs font-bold text-[#3A3F3B] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#C86A53]" />
                <span>Admin Dispatch Notes & Activity Log</span>
              </label>
              <textarea
                id="admin_notes_input"
                rows={3}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Enter updates (e.g. Crew #4 dispatched at 10:15 AM)..."
                className="w-full bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#3A3F3B] focus:outline-none focus:ring-1 focus:ring-[#C86A53]"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSaveNotes}
                  disabled={updatingId === selectedComplaint.complaint_id}
                  className="btn-terracotta px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Notes</span>
                </button>

                <button
                  onClick={() => {
                    onViewOnMap(selectedComplaint.latitude, selectedComplaint.longitude);
                    setSelectedComplaint(null);
                  }}
                  className="btn-sage px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View Map Pin</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
