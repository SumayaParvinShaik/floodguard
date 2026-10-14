import React, { useState, useEffect } from 'react';
import { Compass, Navigation, ShieldCheck, Mountain, Clock } from 'lucide-react';
import { Shelter } from '../types';

interface CompassDirectionCardProps {
  primaryShelter: Shelter | null;
  alternateShelter: Shelter | null;
  verticalEvacuationAdvised?: boolean;
  honestAdvice?: string;
  labels: {
    safePlaceTitle: string;
    directionLabel: string;
    distanceLabel: string;
    travelTimeLabel: string;
    elevationGainLabel: string;
    alternateShelterLabel: string;
    verticalEvacWarning: string;
    noSheltersFound: string;
  };
}

export const CompassDirectionCard: React.FC<CompassDirectionCardProps> = ({
  primaryShelter,
  alternateShelter,
  verticalEvacuationAdvised,
  honestAdvice,
  labels
}) => {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  // Listen to device orientation for true live compass needle
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading for iOS, alpha for Android
      let heading: number | null = null;
      if ((e as any).webkitCompassHeading !== undefined) {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }
      if (heading !== null) {
        setDeviceHeading(heading);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  if (verticalEvacuationAdvised) {
    return (
      <div className="w-full bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80 border-2 border-red-500/80 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-red-600/30 rounded-xl border border-red-500 text-red-300">
            <Mountain className="w-7 h-7 text-red-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg text-red-200 tracking-wide">
              {labels.verticalEvacWarning}
            </h3>
            <p className="text-sm text-red-300/90 mt-1.5 leading-relaxed font-medium">
              {honestAdvice || 'Do not travel on low-lying roads. Move upward immediately.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!primaryShelter) {
    return (
      <div className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl p-4 text-center text-slate-400 text-sm">
        {labels.noSheltersFound}
      </div>
    );
  }

  // Calculate rotation relative to device heading (or static bearing if device orientation unavailable)
  const bearing = primaryShelter.bearingDeg || 0;
  const needleRotation = deviceHeading !== null ? (bearing - deviceHeading + 360) % 360 : bearing;

  return (
    <div className="w-full bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm md:text-base text-slate-100 tracking-wide">
            {labels.safePlaceTitle}
          </h3>
        </div>
        <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
          RECOMMENDED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Compass Dial */}
        <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-2 border-slate-700 bg-slate-900 shadow-inner">
            <span className="absolute top-1 text-[10px] font-bold text-rose-400">N</span>
            <span className="absolute bottom-1 text-[10px] font-bold text-slate-500">S</span>
            <span className="absolute left-1 text-[10px] font-bold text-slate-500">W</span>
            <span className="absolute right-1 text-[10px] font-bold text-slate-500">E</span>
            
            {/* Rotating Arrow Needle */}
            <div
              className="w-16 h-16 flex items-center justify-center transition-transform duration-500 ease-out"
              style={{ transform: `rotate(${needleRotation}deg)` }}
            >
              <Navigation className="w-10 h-10 text-emerald-400 fill-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            </div>
          </div>
          <p className="mt-2 text-xs font-bold text-emerald-300 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            {primaryShelter.compassDirection || 'N'} ({bearing}°)
          </p>
        </div>

        {/* Shelter Metrics */}
        <div className="sm:col-span-8 flex flex-col justify-between h-full">
          <div>
            <h4 className="text-base md:text-lg font-extrabold text-white leading-snug">
              {primaryShelter.name}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{primaryShelter.address || 'Designated Public Refuge'}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 text-center">
              <span className="block text-[10px] text-slate-400 font-medium">{labels.distanceLabel}</span>
              <span className="text-sm font-black text-white">{primaryShelter.distanceKm} km</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 text-center">
              <span className="block text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {labels.travelTimeLabel}
              </span>
              <span className="text-sm font-black text-emerald-400">{primaryShelter.travelMinutes}m</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 text-center">
              <span className="block text-[10px] text-slate-400 font-medium flex items-center justify-center gap-0.5">
                <Mountain className="w-2.5 h-2.5" />
                {labels.elevationGainLabel}
              </span>
              <span className="text-sm font-black text-sky-400">+{primaryShelter.elevationGainMeters}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alternate Shelter Card */}
      {alternateShelter && (
        <div className="mt-1 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-400">{labels.alternateShelterLabel}:</span>
            <span className="font-medium text-slate-200">{alternateShelter.name}</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {alternateShelter.distanceKm} km • +{alternateShelter.elevationGainMeters}m
          </span>
        </div>
      )}
    </div>
  );
};
