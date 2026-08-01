import React from 'react';
import { MapPin, Building2, LayoutDashboard, RefreshCw, LocateFixed } from 'lucide-react';
import { UserLocationInfo } from '../types';

interface HeaderProps {
  activeTab: 'map' | 'citizen' | 'dashboard';
  setActiveTab: (tab: 'map' | 'citizen' | 'dashboard') => void;
  onResetData: () => void;
  pendingCount: number;
  userLocation: UserLocationInfo;
  onRequestLocation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onResetData,
  pendingCount,
  userLocation,
  onRequestLocation
}) => {
  return (
    <header className="bg-white border-b border-[#E5E0D8] sticky top-0 z-40 shadow-[0_4px_20px_rgba(58,63,59,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => setActiveTab('map')}
            >
              <div className="w-10 h-10 rounded-xl bg-[#C86A53] flex items-center justify-center text-white shadow-sm group-hover:bg-[#B25A44] transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-[#3A3F3B] tracking-tight">
                    Fix-It Felix
                  </h1>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestLocation();
                    }}
                    title="Click to detect or refresh your location"
                    className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                      userLocation.isLocating
                        ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                        : userLocation.locationError
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
                        : 'bg-[#6B8E7B]/10 text-[#6B8E7B] border-[#6B8E7B]/20 hover:bg-[#6B8E7B]/20 cursor-pointer'
                    }`}
                  >
                    <LocateFixed className={`w-3 h-3 shrink-0 ${userLocation.isLocating ? 'animate-spin' : ''}`} />
                    <span className="truncate max-w-[180px] sm:max-w-[240px]">
                      {userLocation.isLocating ? 'Detecting Location...' : userLocation.locationName}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-[#3A3F3B]/70">Community Maintenance & Incident Portal</p>
              </div>
            </div>

            {/* Mobile Reset Action */}
            <button
              onClick={onResetData}
              title="Reset Demo Database"
              className="sm:hidden p-2 text-[#3A3F3B]/70 hover:text-[#3A3F3B] hover:bg-[#F7F5F0] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar text-sm font-medium">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-[#C86A53] text-white shadow-sm font-semibold'
                  : 'text-[#3A3F3B]/80 hover:bg-[#F7F5F0] hover:text-[#3A3F3B]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Issues & Local Map</span>
            </button>

            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'citizen'
                  ? 'bg-[#C86A53] text-white shadow-sm font-semibold'
                  : 'text-[#3A3F3B]/80 hover:bg-[#F7F5F0] hover:text-[#3A3F3B]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap relative ${
                activeTab === 'dashboard'
                  ? 'bg-[#C86A53] text-white shadow-sm font-semibold'
                  : 'text-[#3A3F3B]/80 hover:bg-[#F7F5F0] hover:text-[#3A3F3B]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Dashboard</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#6B8E7B] text-white font-bold text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>

          {/* System Indicators & Reset */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onResetData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EAE6DF] text-xs font-medium text-[#3A3F3B] transition-colors border border-[#E5E0D8]"
              title="Reset DynamoDB complaints to initial seed"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#6B8E7B]" />
              <span>Reset Demo Seed</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
