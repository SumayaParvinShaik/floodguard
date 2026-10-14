import React, { useState, useEffect } from 'react';
import { X, Cpu, Cable, Sliders, Battery, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SensorReading } from '../types';
import { WebSerialSensorManager, RiverSensorSimulator } from '../sensors';

interface SensorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensorData: SensorReading | null;
  onSensorUpdate: (reading: SensorReading) => void;
  simulator: RiverSensorSimulator;
}

export const SensorsModal: React.FC<SensorsModalProps> = ({
  isOpen,
  onClose,
  sensorData,
  onSensorUpdate,
  simulator
}) => {
  const [serialManager] = useState(() => new WebSerialSensorManager());
  const [serialStatus, setSerialStatus] = useState<string>('');
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(true);
  const [simLevel, setSimLevel] = useState<number>(simulator.currentLevelCm);
  const [simRate, setSimRate] = useState<number>(simulator.currentRateCmMin);
  const [simBattery, setSimBattery] = useState<number>(simulator.currentBattery);
  const [isFaultSimulated, setIsFaultSimulated] = useState<boolean>(false);

  useEffect(() => {
    // Start simulator by default so demos and hackathons work right out of the box
    if (isSimulatorActive) {
      simulator.start(onSensorUpdate);
    } else {
      simulator.stop();
    }
    return () => simulator.stop();
  }, [isSimulatorActive]);

  const handleConnectSerial = async () => {
    setSerialStatus('Requesting USB port...');
    const res = await serialManager.connect(onSensorUpdate);
    setSerialStatus(res.message);
    if (res.success) {
      setIsSimulatorActive(false);
    }
  };

  const handleSimLevelChange = (val: number) => {
    setSimLevel(val);
    simulator.currentLevelCm = val;
  };

  const handleSimRateChange = (val: number) => {
    setSimRate(val);
    simulator.currentRateCmMin = val;
  };

  const handleSimBatteryChange = (val: number) => {
    setSimBattery(val);
    simulator.currentBattery = val;
  };

  const toggleFaultSim = (checked: boolean) => {
    setIsFaultSimulated(checked);
    simulator.isSilentFault = checked;
  };

  if (!isOpen) return null;

  // Watchdog calculation: Silent > 30s = FAULT
  const now = Date.now();
  const timeSinceLastSeenSec = sensorData ? Math.round((now - sensorData.timestamp) / 1000) : 999;
  const isSilentFault = timeSinceLastSeenSec > 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base md:text-lg font-bold text-white">River Depth Telemetry & Gauge</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Telemetry Display */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active River Node:</span>
                <span className="text-xs font-mono font-bold text-white">
                  {sensorData?.sensorId || 'ESP32-LOCAL'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isSilentFault ? (
                  <span className="bg-rose-950 text-rose-300 border border-rose-500 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> FAULT: SILENT ({timeSinceLastSeenSec}s)
                  </span>
                ) : (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> LIVE ONLINE ({timeSinceLastSeenSec}s ago)
                  </span>
                )}
              </div>
            </div>

            {/* Gauge Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block">RIVER DEPTH</span>
                <span className={`text-2xl font-black ${
                  (sensorData?.levelCm || 0) >= 300
                    ? 'text-rose-500 animate-pulse'
                    : (sensorData?.levelCm || 0) >= 240
                    ? 'text-orange-400'
                    : 'text-emerald-400'
                }`}>
                  {(sensorData?.levelCm || 0).toFixed(0)} <span className="text-xs font-normal text-slate-400">cm</span>
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block">RATE OF RISE</span>
                <span className={`text-2xl font-black ${
                  (sensorData?.rateOfRiseCmMin || 0) >= 5.0 ? 'text-rose-500' : 'text-sky-400'
                }`}>
                  {(sensorData?.rateOfRiseCmMin || 0) > 0 ? '+' : ''}
                  {(sensorData?.rateOfRiseCmMin || 0).toFixed(1)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">cm/m</span>
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block">BATTERY</span>
                <span className="text-2xl font-black text-slate-200 flex items-center justify-center gap-1">
                  <Battery className="w-4 h-4 text-emerald-400 inline" />
                  {sensorData?.batteryPct ?? 95}%
                </span>
              </div>
            </div>
          </div>

          {/* Web Serial Hardware Connection */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cable className="w-4 h-4 text-sky-400" />
              Physical ESP32 Hardware Connection
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Plug your ESP32 waterproof ultrasonic sensor into your computer or Android phone via USB cable (baud 115200). Telemetry will stream directly with sub-second local alarm triggering.
            </p>
            <button
              onClick={handleConnectSerial}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
            >
              <Cable className="w-4 h-4" />
              Connect USB / Web Serial
            </button>
            {serialStatus && (
              <p className="text-[11px] text-sky-300 font-mono mt-2">{serialStatus}</p>
            )}
          </div>

          {/* Interactive Demo Simulator */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                Live River Sensor Simulator (Demo)
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSimulatorActive}
                  onChange={(e) => setIsSimulatorActive(e.target.checked)}
                  className="rounded text-amber-500"
                />
                Enable Sim
              </label>
            </div>

            {/* Slider 1: Depth */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Water Depth (Warning: 180cm, Prepare: 240cm, Danger: 300cm):</span>
                <span className="text-white font-mono font-bold">{simLevel} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                value={simLevel}
                onChange={(e) => handleSimLevelChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Slider 2: Rate of Rise */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Rate of Rise (Surge trigger: ≥ 5.0 cm/min):</span>
                <span className="text-white font-mono font-bold">{simRate.toFixed(1)} cm/min</span>
              </div>
              <input
                type="range"
                min="-2"
                max="10"
                step="0.5"
                value={simRate}
                onChange={(e) => handleSimRateChange(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Slider 3: Battery % */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Battery Level:</span>
                <span className="text-white font-mono font-bold">{simBattery}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simBattery}
                onChange={(e) => handleSimBatteryChange(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Silent Fault Toggle */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-700/60 text-xs">
              <span className="text-slate-400">Simulate Silent Sensor Fault (&gt;30s silence):</span>
              <button
                type="button"
                onClick={() => toggleFaultSim(!isFaultSimulated)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                  isFaultSimulated
                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}
              >
                {isFaultSimulated ? 'Fault Triggered' : 'Normal Stream'}
              </button>
            </div>
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
