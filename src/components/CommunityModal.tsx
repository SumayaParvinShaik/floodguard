import React, { useState, useEffect } from 'react';
import { X, MessageSquarePlus, MapPin, ShieldAlert } from 'lucide-react';
import { CommunityReport, GeoPoint } from '../types';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: GeoPoint;
}

const COMMUNITY_STORAGE_KEY = 'floodguard_community_reports';

export const CommunityModal: React.FC<CommunityModalProps> = ({ isOpen, onClose, userLocation }) => {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [reportType, setReportType] = useState<CommunityReport['type']>('water_level');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
      if (saved) {
        setReports(JSON.parse(saved));
      } else {
        // Initial sample reports
        const initial: CommunityReport[] = [
          {
            id: 'cr-1',
            type: 'blocked_road',
            description: 'Main highway underpass submerged under 1.2m of swift water. Impassable for cars.',
            lat: Number((userLocation.lat + 0.008).toFixed(4)),
            lng: Number((userLocation.lng + 0.005).toFixed(4)),
            timestamp: Date.now() - 1800000,
            confidenceScore: 85,
            verified: false
          },
          {
            id: 'cr-2',
            type: 'water_level',
            description: 'River bank water overflowed onto riverfront walkway and approaching lower shops.',
            lat: Number((userLocation.lat - 0.012).toFixed(4)),
            lng: Number((userLocation.lng - 0.009).toFixed(4)),
            timestamp: Date.now() - 3600000,
            confidenceScore: 72,
            verified: false
          }
        ];
        setReports(initial);
      }
    } catch {}
  }, [userLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    const newReport: CommunityReport = {
      id: `cr-${Date.now()}`,
      type: reportType,
      description: description.trim(),
      lat: userLocation.lat,
      lng: userLocation.lng,
      timestamp: Date.now(),
      confidenceScore: 65, // Initial unverified base score
      verified: false
    };

    const updated = [newReport, ...reports];
    setReports(updated);
    try {
      localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setDescription('');
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Community Flood Reports</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-950/40 border-b border-amber-600/30 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>
            Notice: Citizen reports are unverified public submissions. Always verify with official authorities before making travel decisions.
          </span>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Submit New Report Form */}
          <form onSubmit={handleSubmit} className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Submit Local Hazard Observation
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-slate-400 flex flex-col gap-1">
                Hazard Type
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="water_level">Floodwater Level / Depth</option>
                  <option value="blocked_road">Blocked Road / Highway</option>
                  <option value="bridge_closed">Submerged Bridge</option>
                  <option value="shelter_full">Shelter Full / Crowded</option>
                </select>
              </label>

              <div className="text-xs font-semibold text-slate-400 flex flex-col justify-end">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  At your GPS coordinates
                </span>
              </div>
            </div>

            <textarea
              placeholder="Describe current road conditions, water height, or danger..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />

            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              Post Unverified Hazard Report
            </button>
          </form>

          {/* Existing Reports List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Area Reports ({reports.length})
            </h3>

            {reports.map((report) => (
              <div
                key={report.id}
                className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                    {report.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
                      UNVERIFIED ({report.confidenceScore}% Confidence)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {report.description}
                </p>

                <p className="text-[10px] text-slate-500">
                  📍 Approx: {report.lat.toFixed(3)}°, {report.lng.toFixed(3)}°
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
