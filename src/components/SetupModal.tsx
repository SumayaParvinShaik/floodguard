import React, { useState } from 'react';
import { X, Key, ShieldCheck, CheckCircle2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { getActiveGeminiKey, saveGeminiKey, clearGeminiKey, testGeminiApiKey } from '../api/gemini';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChanged?: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, onKeyChanged }) => {
  const [keyInput, setKeyInput] = useState<string>(getActiveGeminiKey());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    saveGeminiKey(keyInput);
    setTestResult({ success: true, message: 'Key saved locally in your browser!' });
    if (onKeyChanged) onKeyChanged();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testGeminiApiKey(keyInput);
    setTestResult(result);
    setTesting(false);
  };

  const handleClear = () => {
    clearGeminiKey();
    setKeyInput('');
    setTestResult({ success: true, message: 'Key removed from browser storage.' });
    if (onKeyChanged) onKeyChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-bold text-white">Setup & Optional Gemini Key</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs md:text-sm">
          {/* Privacy & Zero-Key Notice */}
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-200 leading-relaxed">
            <strong className="text-white block mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Free Core Functionality (No Key Required)
            </strong>
            FloodGuard's core hydrologic calculations, Open-Meteo river models, OpenStreetMap shelter search, offline speech, siren, and emergency SOS work <strong>completely free without any API key</strong>.
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Google Gemini API Key (Optional)
            </label>
            <p className="text-xs text-slate-400 leading-relaxed">
              Used strictly for dynamic multi-lingual dialect detection and situational AI alert summaries. It is stored <strong>only in your browser's localStorage</strong> and never transmitted to third parties.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !keyInput.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-700"
              >
                {testing ? 'Testing...' : 'Test Key'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500 text-rose-300'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline underline-offset-2"
            >
              Get free Gemini API Key <ExternalLink className="w-3 h-3" />
            </a>

            {keyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Key
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleSave();
              onClose();
            }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
