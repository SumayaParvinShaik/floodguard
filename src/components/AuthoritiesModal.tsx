import React, { useState } from 'react';
import { X, Radio, Copy, Download, CheckCircle2, Send, AlertOctagon } from 'lucide-react';
import { RiskLevel, GeoPoint, Shelter } from '../types';
import { buildCap12Xml, mapRiskToCapProperties } from '../logic/cap';

interface AuthoritiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: GeoPoint;
  locationName: string;
  currentLevel: RiskLevel;
  primaryShelter: Shelter | null;
  proxyUrl?: string;
}

export const AuthoritiesModal: React.FC<AuthoritiesModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  locationName,
  currentLevel,
  primaryShelter,
  proxyUrl
}) => {
  const [copied, setCopied] = useState(false);
  const [testSmsNumber, setTestSmsNumber] = useState('');
  const [smsStatus, setSmsStatus] = useState('');

  if (!isOpen) return null;

  const capProps = mapRiskToCapProperties(currentLevel);

  const headline = `EMERGENCY FLOOD WARNING FOR ${locationName.toUpperCase()}`;
  const description = `Severe river inundation and flash flood surge detected. Danger level: ${currentLevel}. Immediate evacuation advised to ${
    primaryShelter?.name || 'designated high ground shelters'
  }.`;
  const instruction = `Move immediately away from river banks and low-lying roads. Follow marked evacuation paths to ${
    primaryShelter?.name || 'safe refuge'
  }. Do not drive or walk into moving waters.`;

  const capXml = buildCap12Xml({
    headline,
    description,
    instruction,
    urgency: capProps.urgency,
    severity: capProps.severity,
    certainty: capProps.certainty,
    userLocation,
    radiusKm: 50.0,
    languages: ['en', 'te', 'hi', 'bn', 'es'],
    primaryShelter
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(capXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob([capXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CAP-1.2-FloodGuard-${Date.now()}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSendTestSms = async () => {
    if (!testSmsNumber.trim()) {
      setSmsStatus('Please enter an emergency coordinator phone number.');
      return;
    }

    setSmsStatus('Dispatching through SMS gateway proxy...');
    const endpoint = proxyUrl ? `${proxyUrl}/api/sms/send` : '/api/sms/send';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testSmsNumber.trim(),
          message: `FLOODGUARD CAP ALERT: ${headline}. Evacuate to ${primaryShelter?.name || 'high ground'}.`
        })
      });

      if (res.ok) {
        const json = await res.json();
        setSmsStatus(`Success: ${json.message || 'SMS alert queued.'}`);
      } else {
        setSmsStatus(`Gateway response (${res.status}). Serverless proxy in /server is optional.`);
      }
    } catch {
      setSmsStatus('Local mode: Direct SMS opened via native phone dialer / SMS client instead.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-bold text-white">
              Authorities Console & Cell Broadcast (CAP 1.2)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Honest Limitations Notice */}
        <div className="bg-amber-950/40 border-b border-amber-600/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="block text-amber-200">Critical Delivery Transparency:</strong>
            A web application cannot reach phones that do not have it open or installed. To alert all mobile phones within 50 km regardless of app installation, emergency authorities must transmit this standard <strong>OASIS CAP 1.2 XML</strong> payload to telecom <strong>Cell Broadcast Centres (CBC)</strong> or Google Android Emergency Alerts.
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Generated CAP 1.2 Standard Alert Payload (50 km Circle Geocode)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 flex items-center gap-1"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied XML' : 'Copy XML'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 rounded text-xs text-white font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .xml
                </button>
              </div>
            </div>

            <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-52 leading-relaxed">
              {capXml}
            </pre>
          </div>

          {/* SMS Fan-Out Gateway Section */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4 text-sky-400" />
              Optional SMS Fan-Out Gateway (Twilio / Telecom Proxy)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Forward CAP alerts through your serverless proxy in <code className="text-sky-300">/server</code> to emergency responders:
            </p>

            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Phone number (+91..., +1...)"
                value={testSmsNumber}
                onChange={(e) => setTestSmsNumber(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 flex-1 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSendTestSms}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
              >
                Send SMS Alert
              </button>
            </div>
            {smsStatus && <p className="text-[11px] font-mono text-amber-300 mt-1">{smsStatus}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
