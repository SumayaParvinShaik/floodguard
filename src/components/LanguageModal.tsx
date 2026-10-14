import React, { useState } from 'react';
import { X, Languages, Search, Check, Sparkles } from 'lucide-react';
import { LanguageMeta } from '../types';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLangCode: string;
  onSelectLanguage: (lang: LanguageMeta) => void;
  aiSuggestedCode?: string;
  aiRationale?: string;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  selectedLangCode,
  onSelectLanguage,
  aiSuggestedCode,
  aiRationale
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-sky-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Select Language</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Recommendation Banner */}
        {aiRationale && (
          <div className="p-3 bg-sky-950/40 border-b border-sky-600/30 flex items-start gap-2 text-xs text-sky-200">
            <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sky-300">Regional Suggestion:</strong>
              {aiRationale}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search language or script..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Language List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          {filteredLanguages.map((lang) => {
            const isSelected = lang.code === selectedLangCode;
            const isAiSuggested = lang.code === aiSuggestedCode;

            return (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang);
                  onClose();
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{lang.nativeName}</span>
                    <span className="text-xs text-slate-400 font-medium">({lang.name})</span>
                    {lang.rtl && (
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                        RTL
                      </span>
                    )}
                  </div>
                  {isAiSuggested && (
                    <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Local Match
                    </span>
                  )}
                </div>

                {isSelected && <Check className="w-5 h-5 text-sky-400" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
