import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle2, Plus, Trash2, Copy } from 'lucide-react';
import { FamilyMemberStatus, GeoPoint } from '../types';

interface FamilySafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: GeoPoint;
  locationName: string;
}

const FAMILY_STORAGE_KEY = 'floodguard_family_list';

export const FamilySafetyModal: React.FC<FamilySafetyModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  locationName
}) => {
  const [members, setMembers] = useState<FamilyMemberStatus[]>([]);
  const [newName, setNewName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAMILY_STORAGE_KEY);
      if (saved) {
        setMembers(JSON.parse(saved));
      } else {
        // Default initial entry
        const initial: FamilyMemberStatus[] = [
          { id: '1', name: 'Self', status: 'safe', timestamp: Date.now(), message: 'At designated shelter' }
        ];
        setMembers(initial);
      }
    } catch {}
  }, []);

  const saveMembers = (updated: FamilyMemberStatus[]) => {
    setMembers(updated);
    try {
      localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const addMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMemberStatus = {
      id: `fam-${Date.now()}`,
      name: newName.trim(),
      status: 'safe',
      timestamp: Date.now()
    };
    saveMembers([...members, member]);
    setNewName('');
  };

  const removeMember = (id: string) => {
    saveMembers(members.filter((m) => m.id !== id));
  };

  const updateStatus = (id: string, status: FamilyMemberStatus['status']) => {
    saveMembers(
      members.map((m) => (m.id === id ? { ...m, status, timestamp: Date.now() } : m))
    );
  };

  const generateShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('safe', '1');
    url.searchParams.set('loc', `${userLocation.lat.toFixed(4)},${userLocation.lng.toFixed(4)}`);
    return url.toString();
  };

  const handleCopyLink = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Family Safety & Check-In</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Quick Share Link Box */}
          <div className="p-3.5 bg-sky-950/40 border border-sky-600/40 rounded-xl">
            <p className="text-xs font-semibold text-sky-200 mb-2">
              Share your live safety status link with family & loved ones:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`I am safe at ${locationName} (${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)})`}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-2 flex-1 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Add Member Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add family member name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
              className="bg-slate-800 border border-slate-700 text-sm text-white rounded-xl px-3 py-2 flex-1 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={addMember}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Members Status List */}
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{member.name}</h4>
                  <p className="text-[10px] text-slate-400">
                    Updated: {new Date(member.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={member.status}
                    onChange={(e) => updateStatus(member.id, e.target.value as any)}
                    className={`text-xs font-bold rounded-lg px-2 py-1.5 border ${
                      member.status === 'safe'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : member.status === 'evacuating'
                        ? 'bg-amber-950 text-amber-300 border-amber-500'
                        : 'bg-rose-950 text-rose-300 border-rose-500'
                    }`}
                  >
                    <option value="safe">✓ Safe</option>
                    <option value="evacuating">⏳ Evacuating</option>
                    <option value="needs_help">⚠️ Needs Help</option>
                  </select>

                  {member.name !== 'Self' && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
