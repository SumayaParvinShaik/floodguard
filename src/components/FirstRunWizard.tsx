import React, { useState } from 'react';
import { MapPin, Check, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { GeoPoint, LanguageMeta } from '../types';
import { searchPlaceCoordinates } from '../api/geocoding';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';

interface FirstRunWizardProps {
  isOpen: boolean;
  onComplete: (location: GeoPoint, locationName: string, language: LanguageMeta) => void;
  detectedLocation: GeoPoint;
  detectedLocationName: string;
  suggestedLanguage: LanguageMeta;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({
  isOpen,
  onComplete,
  detectedLocation,
  detectedLocationName,
  suggestedLanguage
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [chosenLocation, setChosenLocation] = useState<GeoPoint>(detectedLocation);
  const [chosenLocationName, setChosenLocationName] = useState<string>(detectedLocationName);
  const [chosenLanguage, setChosenLanguage] = useState<LanguageMeta>(suggestedLanguage);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchPlaceCoordinates(searchQuery.trim());
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectSearchResult = (result: any) => {
    setChosenLocation({ lat: result.lat, lng: result.lng });
    setChosenLocationName([result.name, result.admin1, result.country].filter(Boolean).join(', '));
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/95 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col gap-5">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 text-xs font-black flex items-center justify-center">
              {step}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {step === 1 ? 'Step 1 of 2: Confirm Location' : 'Step 2 of 2: Confirm Language'}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Offline Ready
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">Where are you located?</h2>
              <p className="text-xs text-slate-400 mt-1">
                FloodGuard calculates river discharge and safe shelters nearest to your position.
              </p>
            </div>

            {/* Current Detected Location Option */}
            <button
              type="button"
              onClick={() => {
                setChosenLocation(detectedLocation);
                setChosenLocationName(detectedLocationName);
              }}
              className="w-full p-3.5 bg-slate-800/80 hover:bg-slate-800 border-2 border-sky-500/80 rounded-2xl text-left flex items-start gap-3 transition"
            >
              <MapPin className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">
                  Use GPS Location
                </span>
                <span className="text-sm font-bold text-white block">
                  {chosenLocationName || `${detectedLocation.lat.toFixed(3)}°, ${detectedLocation.lng.toFixed(3)}°`}
                </span>
              </div>
            </button>

            {/* Or Search City */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Or search city / town anywhere in the world:
              </span>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Vijayawada, Kathmandu, Dhaka, Houston..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 flex-1 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-2 bg-slate-950 border border-slate-800 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-800/80">
                  {searchResults.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(r)}
                      className="w-full p-2.5 text-left hover:bg-slate-800/60 text-xs text-slate-200"
                    >
                      <strong className="text-white">{r.name}</strong>, {r.admin1 ? `${r.admin1}, ` : ''}{r.country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl transition"
            >
              Continue to Language <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-white">Choose your alert language</h2>
              <p className="text-xs text-slate-400 mt-1">
                Emergency voice warnings and refuge directions will be spoken in this language.
              </p>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = lang.code === chosenLanguage.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setChosenLanguage(lang)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm block">{lang.nativeName}</span>
                      <span className="text-[11px] text-slate-400">{lang.name}</span>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-sky-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onComplete(chosenLocation, chosenLocationName, chosenLanguage)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl transition"
              >
                Start FloodGuard <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
