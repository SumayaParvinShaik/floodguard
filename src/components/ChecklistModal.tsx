import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, HeartPulse, Droplets, Zap, ShieldAlert, Sparkles } from 'lucide-react';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  langCode: string;
}

const CHECKLIST_STORAGE_KEY = 'floodguard_kit_checked_items';

interface KitItem {
  id: string;
  name: string;
  desc: string;
  category: 'water' | 'medical' | 'tools' | 'documents';
}

const DEFAULT_KIT_ITEMS: KitItem[] = [
  { id: 'water', name: 'Clean Drinking Water', desc: 'At least 3 litres per person for 3 days', category: 'water' },
  { id: 'meds', name: 'Essential Prescription Medicines', desc: '7-day supply of daily medicines + basic first aid kit', category: 'medical' },
  { id: 'torch', name: 'Waterproof Flashlight / Torch', desc: 'With spare alkaline batteries or solar/hand-crank', category: 'tools' },
  { id: 'power', name: 'Charged Mobile Power Bank', desc: 'Keep phone charged and sealed in waterproof ziplock', category: 'tools' },
  { id: 'food', name: 'Non-Perishable Ready-to-Eat Food', desc: 'Energy bars, canned goods, dry fruits, biscuits', category: 'water' },
  { id: 'docs', name: 'Identification & Property Documents', desc: 'Passports, deeds, certificates sealed in waterproof bag', category: 'documents' },
  { id: 'whistle', name: 'Emergency Signal Whistle', desc: 'Audible signal to rescuers through heavy rain and noise', category: 'tools' },
  { id: 'blanket', name: 'Warm Blankets & Rain Poncho', desc: 'Protects from hypothermia and cold flood winds', category: 'medical' },
];

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose }) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'kit' | 'firstaid'>('kit');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (saved) setCheckedItems(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleItem = (id: string) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  if (!isOpen) return null;

  const totalItems = DEFAULT_KIT_ITEMS.length;
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalItems) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Emergency Kit & First Aid</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('kit')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold transition border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'kit'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Go-Bag Checklist ({completedCount}/{totalItems})
          </button>
          <button
            onClick={() => setActiveTab('firstaid')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold transition border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'firstaid'
                ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            First Aid Guide Cards
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {activeTab === 'kit' ? (
            <div>
              {/* Progress Bar */}
              <div className="mb-4 bg-slate-800 p-3 rounded-xl border border-slate-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300">Readiness Progress</span>
                  <span className="text-emerald-400">{progressPct}% Complete</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {DEFAULT_KIT_ITEMS.map((item) => {
                  const isChecked = Boolean(checkedItems[item.id]);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                        isChecked
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-300'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isChecked ? 'line-through text-slate-400' : 'text-white'}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* First Aid Card 1: Hypothermia */}
              <div className="p-3.5 bg-sky-950/40 border border-sky-600/40 rounded-xl">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-sm mb-1">
                  <Droplets className="w-4 h-4" />
                  1. Hypothermia & Cold Immersion
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wet clothing accelerates body heat loss 25 times faster. Immediately remove wet clothes, wrap in dry blankets or plastic sheeting, and warm the core (chest, neck, groin). Give warm sweet liquids if conscious. Never rub frostbitten skin.
                </p>
              </div>

              {/* First Aid Card 2: Wound Disinfection */}
              <div className="p-3.5 bg-rose-950/40 border border-rose-600/40 rounded-xl">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  2. Flood Wound Disinfection & Tetanus
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Floodwater carries severe sewage bacteria and Leptospirosis. Wash any cut immediately with bottled or boiled water and soap for 5 minutes. Apply antiseptic and seal with a waterproof bandage. Seek medical antibiotics if redness spreads.
                </p>
              </div>

              {/* First Aid Card 3: Electrical Hazard */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-600/40 rounded-xl">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                  <Zap className="w-4 h-4" />
                  3. Submerged Electrical Hazards
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Water conducts lethal current from submerged junction boxes and downed wires. Never step in standing water near utility poles. If you feel a tingling sensation in your legs, stop, turn around, and hop on one foot or shuffle feet without lifting them.
                </p>
              </div>

              {/* First Aid Card 4: Safe Drinking Water */}
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-600/40 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1">
                  <Sparkles className="w-4 h-4" />
                  4. Emergency Water Purification
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never drink unboiled flood or tap water during disaster. Bring water to a rolling boil for at least 1 full minute (3 minutes at high altitude). Alternatively, use chlorine water purification tablets according to instructions, or 2 drops of unscented household bleach per litre.
                </p>
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
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
