import React, { useState } from 'react';
import { X, Settings, Shield, Sliders, Trash2, Download, Eye, Accessibility, Building2 } from 'lucide-react';
import { AppSettings, AlertHistoryRecord, Shelter } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  alertHistory: AlertHistoryRecord[];
  isDrillMode: boolean;
  onToggleDrillMode: (enabled: boolean) => void;
  onDeleteAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  alertHistory,
  isDrillMode,
  onToggleDrillMode,
  onDeleteAllData
}) => {
  const [activeTab, setActiveTab] = useState<'accessibility' | 'thresholds' | 'privacy' | 'history'>('accessibility');
  const [newOfficialShelterName, setNewOfficialShelterName] = useState('');
  const [newOfficialShelterLat, setNewOfficialShelterLat] = useState('');
  const [newOfficialShelterLng, setNewOfficialShelterLng] = useState('');

  if (!isOpen) return null;

  const handleToggle = (key: keyof AppSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  const handleThresholdChange = (key: keyof AppSettings, val: number) => {
    onUpdateSettings({
      ...settings,
      [key]: val
    });
  };

  const handleAddOfficialShelter = () => {
    if (!newOfficialShelterName.trim() || !newOfficialShelterLat || !newOfficialShelterLng) return;
    const shelter: Shelter = {
      id: `official-${Date.now()}`,
      name: newOfficialShelterName.trim(),
      type: 'shelter',
      lat: parseFloat(newOfficialShelterLat),
      lng: parseFloat(newOfficialShelterLng),
      distanceKm: 0,
      elevationMeters: 50,
      elevationGainMeters: 20,
      travelMinutes: 15,
      isReachableInTime: true,
      address: 'Official Disaster Relief Sanctuary'
    };

    onUpdateSettings({
      ...settings,
      officialShelters: [shelter, ...settings.officialShelters]
    });

    setNewOfficialShelterName('');
    setNewOfficialShelterLat('');
    setNewOfficialShelterLng('');
  };

  const handleExportIncidentReport = () => {
    const reportData = {
      application: 'FloodGuard Emergency Response System',
      generatedAt: new Date().toISOString(),
      activeSettings: settings,
      alertHistory
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FloodGuard-Incident-Report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-300" />
            <h2 className="text-base md:text-lg font-bold text-white">System Settings & Data Control</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'accessibility'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Accessibility className="w-4 h-4" /> Accessibility & Modes
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'thresholds'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> Thresholds & Shelters
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" /> Alert History ({alertHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Privacy & Delete Data
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'accessibility' && (
            <div className="space-y-3">
              {/* Drill Mode Toggle */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-200">Emergency Drill / Simulation Mode</h4>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    Visibly marks all alert banners as "TEST DRILL" to prevent public panic during disaster preparedness exercises.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isDrillMode}
                  onChange={(e) => onToggleDrillMode(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* High Contrast Mode */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">High-Contrast Mode (WCAG AA)</h4>
                  <p className="text-xs text-slate-400">Enhances black/white borders and text readability in bright sunlight.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={() => handleToggle('highContrast')}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Large Text Mode */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Large-Text Mode</h4>
                  <p className="text-xs text-slate-400">Increases font sizes for elder and vision-impaired users.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.largeText}
                  onChange={() => handleToggle('largeText')}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Simple Language Mode */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Simple-Language Mode</h4>
                  <p className="text-xs text-slate-400">Replaces hydrologic terms with ultra-plain words (e.g., "Water rising fast").</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.simpleLanguage}
                  onChange={() => handleToggle('simpleLanguage')}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Audio-First Mode */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Audio-First Mode (Low Literacy)</h4>
                  <p className="text-xs text-slate-400">Automatically speaks status and shelter directions on page load.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.audioFirst}
                  onChange={() => handleToggle('audioFirst')}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Low-Data & Battery Saver */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Low-Data & Battery Saver</h4>
                  <p className="text-xs text-slate-400">Stops map background tile prefetching and pauses animations to preserve power.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.lowDataMode}
                  onChange={() => handleToggle('lowDataMode')}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'thresholds' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Configurable Discharge Threshold Ratios (Forecast vs 30-Day Mean)
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-400 font-semibold">Danger (LEAVE NOW) Ratio:</span>
                    <span className="text-white font-mono font-bold">{settings.dangerThresholdRatio}x</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="5.0"
                    step="0.1"
                    value={settings.dangerThresholdRatio}
                    onChange={(e) => handleThresholdChange('dangerThresholdRatio', parseFloat(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-400 font-semibold">Prepare (WARNING) Ratio:</span>
                    <span className="text-white font-mono font-bold">{settings.prepareThresholdRatio}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.6"
                    max="3.0"
                    step="0.1"
                    value={settings.prepareThresholdRatio}
                    onChange={(e) => handleThresholdChange('prepareThresholdRatio', parseFloat(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400 font-semibold">Watch (ADVISORY) Ratio:</span>
                    <span className="text-white font-mono font-bold">{settings.watchThresholdRatio}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={settings.watchThresholdRatio}
                    onChange={(e) => handleThresholdChange('watchThresholdRatio', parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Official Shelter Override Input */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Pluggable Official Shelter Overrides (Beat OSM Data)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Shelter Name"
                    value={newOfficialShelterName}
                    onChange={(e) => setNewOfficialShelterName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={newOfficialShelterLat}
                    onChange={(e) => setNewOfficialShelterLat(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={newOfficialShelterLng}
                    onChange={(e) => setNewOfficialShelterLng(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddOfficialShelter}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                >
                  Add Official Shelter
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Session Incident Log ({alertHistory.length} events)
                </h4>
                <button
                  onClick={handleExportIncidentReport}
                  className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded text-xs text-white font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Incident Report (JSON)
                </button>
              </div>

              <div className="space-y-2">
                {alertHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No previous alert events in log.</p>
                ) : (
                  alertHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.level === 'LEAVE_NOW'
                              ? 'bg-red-950 text-red-300 border border-red-500'
                              : item.level === 'PREPARE'
                              ? 'bg-orange-950 text-orange-300 border border-orange-500'
                              : item.level === 'WATCH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-500'
                          }`}
                        >
                          {item.level}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{item.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  FloodGuard Privacy Commitment
                </h4>
                <p>
                  1. <strong>Zero Account Requirement:</strong> FloodGuard never asks for your email, name, or phone number.
                </p>
                <p>
                  2. <strong>On-Device GPS:</strong> Your coordinates are processed entirely inside your browser. They are never sent to any analytics server or advertising tracker.
                </p>
                <p>
                  3. <strong>Anonymous Hydrologic Queries:</strong> Requests to Open-Meteo and OpenStreetMap transmit only coarse latitude and longitude coordinates.
                </p>
              </div>

              <div className="p-4 bg-rose-950/20 border border-rose-600/40 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-rose-300">Wipe All Local Data</h4>
                <p className="text-xs text-slate-400">
                  Deletes all cached shelters, emergency contacts, check-in statuses, alert history, and custom settings from this device.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete all cached FloodGuard data from this device?')) {
                      onDeleteAllData();
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete My Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
