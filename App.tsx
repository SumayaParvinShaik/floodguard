import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  PhoneCall,
  Share2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Menu,
  X,
  RefreshCw,
  MapPin,
  Settings,
  Languages,
  Cpu,
  Users,
  CheckSquare,
  MessageSquarePlus,
  Radio,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';

import {
  GeoPoint,
  RiskLevel,
  DischargePoint,
  WeatherData,
  ReverseGeoResult,
  Shelter,
  HelplineInfo,
  SensorReading,
  AppSettings,
  AlertHistoryRecord,
  LanguageMeta,
  TravelMode
} from './types';

import { fetchHydrologicData } from './api/openMeteo';
import { reverseGeocode } from './api/geocoding';
import { fetchNearbyShelters } from './api/osmOverpass';
import { detectLanguageWithGemini } from './api/gemini';
import { evaluateOverallRisk, shouldTriggerAlarm } from './logic/risk';
import { selectSafestShelter } from './logic/shelter';
import { generateFactualAlertText } from './logic/alertText';
import { SUPPORTED_LANGUAGES, resolveBestLanguage } from './i18n/languages';
import { getTranslations } from './i18n/translations';
import { getHelplineForCountry } from './data/helplines';

import {
  speakEmergencyAlert,
  startAutoRepeatAlert,
  stopAutoRepeatAlert,
  stopEmergencySpeech
} from './audio/speech';
import { stopEmergencySiren } from './audio/siren';
import { RiverSensorSimulator } from './sensors';

import { Map } from './components/Map';
import { CompassDirectionCard } from './components/CompassDirectionCard';
import { SetupModal } from './components/SetupModal';
import { LanguageModal } from './components/LanguageModal';
import { SensorsModal } from './components/SensorsModal';
import { FamilySafetyModal } from './components/FamilySafetyModal';
import { ChecklistModal } from './components/ChecklistModal';
import { CommunityModal } from './components/CommunityModal';
import { AuthoritiesModal } from './components/AuthoritiesModal';
import { SettingsModal } from './components/SettingsModal';
import { FirstRunWizard } from './components/FirstRunWizard';

const DEFAULT_LOCATION: GeoPoint = { lat: 16.5062, lng: 80.6480 }; // Vijayawada / Krishna River basin (test example)
const STORAGE_PREFIX = 'floodguard_';

export const App: React.FC = () => {
  // Navigation & Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);

  // Core Geolocation & Place
  const [userLocation, setUserLocation] = useState<GeoPoint>(DEFAULT_LOCATION);
  const [locationName, setLocationName] = useState<string>('Vijayawada, Andhra Pradesh, India');
  const [geoResult, setGeoResult] = useState<ReverseGeoResult | null>(null);
  const [userElevation, setUserElevation] = useState<number>(20);

  // Hydrology & Shelters
  const [dischargePoints, setDischargePoints] = useState<DischargePoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dataSourceNote, setDataSourceNote] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sensor Telemetry
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [simulator] = useState(() => new RiverSensorSimulator());

  // Language & Translation
  const [currentLanguage, setCurrentLanguage] = useState<LanguageMeta>(SUPPORTED_LANGUAGES[0]);
  const [aiSuggestedLang, setAiSuggestedLang] = useState<LanguageMeta | undefined>();
  const [aiRationale, setAiRationale] = useState<string>('');

  // Audio & Alert State
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioSpeechRate, setAudioSpeechRate] = useState<number>(1.0); // 0.8 for slow
  const [captionBannerText, setCaptionBannerText] = useState<string>('');
  const [lastAlertLevel, setLastAlertLevel] = useState<RiskLevel | null>(null);
  const [lastAlertTimestamp, setLastAlertTimestamp] = useState<number>(0);
  const [acknowledgedSafety, setAcknowledgedSafety] = useState<boolean>(false);

  // User Settings
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');
  const [isDrillMode, setIsDrillMode] = useState<boolean>(false);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryRecord[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    geminiApiKey: '',
    proxyUrl: '',
    highContrast: false,
    largeText: false,
    simpleLanguage: false,
    audioFirst: false,
    lowDataMode: false,
    batterySaver: false,
    travelMode: 'walking',
    dangerThresholdRatio: 3.0,
    prepareThresholdRatio: 2.0,
    watchThresholdRatio: 1.5,
    fastRiseThresholdCmMin: 5.0,
    emergencyContacts: [],
    officialShelters: [],
    overrideHelplines: {}
  });

  // Load saved preferences on initial mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      const hasRun = localStorage.getItem(`${STORAGE_PREFIX}onboarded`);
      if (!hasRun) {
        setShowFirstRun(true);
      }

      const savedLangCode = localStorage.getItem(`${STORAGE_PREFIX}lang`);
      if (savedLangCode) {
        const matched = SUPPORTED_LANGUAGES.find((l) => l.code === savedLangCode);
        if (matched) setCurrentLanguage(matched);
      }
    } catch {}

    // Request GPS location
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
        },
        (err) => {
          console.log('[Geolocation] GPS note:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Update HTML document direction for RTL languages (Arabic)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = currentLanguage.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLanguage.code;
    }
  }, [currentLanguage]);

  // Translations dictionary
  const t = useMemo(() => getTranslations(currentLanguage.code), [currentLanguage.code]);

  // Helplines for detected country
  const helpline: HelplineInfo = useMemo(() => {
    return getHelplineForCountry(geoResult?.countryCode, settings.overrideHelplines);
  }, [geoResult?.countryCode, settings.overrideHelplines]);

  // Main Data Refresh Pipeline
  const refreshData = useCallback(async (loc: GeoPoint = userLocation) => {
    setIsRefreshing(true);
    try {
      // 1. Reverse Geocode (BigDataCloud + Open-Meteo)
      const geo = await reverseGeocode(loc);
      setGeoResult(geo);
      setLocationName(geo.displayName);

      // 2. Resolve or suggest language
      const regionalLang = resolveBestLanguage(geo.countryCode, geo.state);
      setAiSuggestedLang(regionalLang);

      // Asynchronously consult Gemini if available
      detectLanguageWithGemini(geo.countryName, geo.state, geo.locality, navigator.language).then((aiRes) => {
        const match = SUPPORTED_LANGUAGES.find((l) => l.code === aiRes.language);
        if (match) {
          setAiSuggestedLang(match);
          setAiRationale(aiRes.rationale);
        }
      });

      // 3. Hydrologic River Discharge & Weather
      const hydro = await fetchHydrologicData(loc);
      setDischargePoints(hydro.dischargePoints);
      setWeatherData(hydro.weather);
      setUserElevation(hydro.userElevation);
      setLastUpdated(hydro.lastUpdated);
      setDataSourceNote(hydro.source);

      // 4. Overpass Shelters (combine with official overrides)
      const shelterData = await fetchNearbyShelters(loc, hydro.userElevation);
      const combinedShelters = [...settings.officialShelters, ...shelterData.shelters];
      setShelters(combinedShelters);
    } catch (err) {
      console.warn('[FloodGuard] Data refresh issue:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userLocation, settings.officialShelters]);

  // Trigger data fetch on location change
  useEffect(() => {
    refreshData(userLocation);
  }, [userLocation.lat, userLocation.lng]);

  // Risk Evaluation Calculation
  const riskResult = useMemo(() => {
    const thresholds = {
      dangerRatio: settings.dangerThresholdRatio,
      prepareRatio: settings.prepareThresholdRatio,
      watchRatio: settings.watchThresholdRatio,
      fastRiseThresholdCmMin: settings.fastRiseThresholdCmMin
    };
    return evaluateOverallRisk(dischargePoints, weatherData || undefined, sensorData || undefined, thresholds);
  }, [dischargePoints, weatherData, sensorData, settings]);

  const effectiveLevel: RiskLevel = isDrillMode ? 'WATCH' : riskResult.overallLevel;

  // Safe Refuge Selection
  const shelterResult = useMemo(() => {
    return selectSafestShelter(
      userLocation,
      userElevation,
      shelters,
      riskResult.nearestCriticalPoint,
      travelMode,
      riskResult.timeToPeakHours
    );
  }, [userLocation, userElevation, shelters, riskResult, travelMode]);

  // Factual Alert Text String
  const alertText = useMemo(() => {
    return generateFactualAlertText({
      level: effectiveLevel,
      locationName,
      criticalDistanceKm: riskResult.criticalDistanceKm,
      expectedTimeHours: riskResult.timeToPeakHours,
      shelter: shelterResult.primaryShelter,
      helpline,
      verticalEvacuationAdvised: shelterResult.verticalEvacuationAdvised
    });
  }, [effectiveLevel, locationName, riskResult, shelterResult, helpline]);

  // Audible Warning & Auto-Repeat Trigger
  useEffect(() => {
    if (effectiveLevel === 'SAFE') {
      stopAutoRepeatAlert();
      setIsAudioPlaying(false);
      return;
    }

    // Check anti-fatigue filter
    const shouldAlarm = shouldTriggerAlarm(effectiveLevel, lastAlertLevel, lastAlertTimestamp);

    if (shouldAlarm && !acknowledgedSafety) {
      setLastAlertLevel(effectiveLevel);
      setLastAlertTimestamp(Date.now());

      // Log alert in history
      const newRecord: AlertHistoryRecord = {
        id: `alert-${Date.now()}`,
        timestamp: Date.now(),
        level: effectiveLevel,
        locationName,
        summary: riskResult.reason
      };
      setAlertHistory((prev) => [newRecord, ...prev.slice(0, 29)]);

      // If LEAVE NOW: auto-repeat until acknowledged
      if (effectiveLevel === 'LEAVE_NOW') {
        startAutoRepeatAlert(alertText, {
          bcp47: currentLanguage.bcp47,
          rate: audioSpeechRate,
          volume: 1.0,
          playSirenIntro: true
        });
        setIsAudioPlaying(true);
      } else if (settings.audioFirst) {
        speakEmergencyAlert(alertText, {
          bcp47: currentLanguage.bcp47,
          rate: audioSpeechRate,
          playSirenIntro: true
        });
        setIsAudioPlaying(true);
      }
    }
  }, [effectiveLevel, alertText, currentLanguage.bcp47, audioSpeechRate, acknowledgedSafety]);

  // Toggle Voice Alert Button Handler
  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      stopAutoRepeatAlert();
      stopEmergencySpeech();
      stopEmergencySiren();
      setIsAudioPlaying(false);
    } else {
      const res = speakEmergencyAlert(alertText, {
        bcp47: currentLanguage.bcp47,
        rate: audioSpeechRate,
        volume: 1.0,
        playSirenIntro: true,
        onEnded: () => setIsAudioPlaying(false)
      });
      setIsAudioPlaying(true);
      if (!res.hasVoice) {
        setCaptionBannerText(alertText);
      }
    }
  };

  // SOS Button: Generates Offline SMS to Emergency Services + Family
  const handleTriggerSos = () => {
    const latStr = userLocation.lat.toFixed(4);
    const lngStr = userLocation.lng.toFixed(4);
    const primaryNumber = helpline.disaster || helpline.police || '112';

    const smsBody = encodeURIComponent(
      `EMERGENCY FLOOD RESCUE NEEDED! My GPS Location: ${latStr}, ${lngStr} (${locationName}). Danger Level: ${effectiveLevel}. People with me need immediate rescue assistance. Maps link: https://maps.google.com/?q=${latStr},${lngStr}`
    );

    // Open phone native SMS app directly
    window.location.href = `sms:${primaryNumber}?body=${smsBody}`;
  };

  // Share Location (works offline without needing Google Maps to load)
  const handleShareLocation = async () => {
    const plainText = `FLOODGUARD EMERGENCY LOCATION: I am at ${locationName} (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}). Status: ${effectiveLevel}. Shelter: ${shelterResult.primaryShelter?.name || 'Local High Ground'}. https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FloodGuard Emergency Location',
          text: plainText
        });
        return;
      } catch {}
    }

    navigator.clipboard.writeText(plainText);
    alert('Location text copied to clipboard! You can paste it into SMS, WhatsApp, or any messenger without internet.');
  };

  // Acknowledge Safety
  const handleIAmSafe = () => {
    setAcknowledgedSafety(true);
    stopAutoRepeatAlert();
    stopEmergencySpeech();
    stopEmergencySiren();
    setIsAudioPlaying(false);
  };

  // First Run Wizard Completion
  const handleCompleteFirstRun = (loc: GeoPoint, name: string, lang: LanguageMeta) => {
    setUserLocation(loc);
    setLocationName(name);
    setCurrentLanguage(lang);
    setShowFirstRun(false);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}onboarded`, 'true');
      localStorage.setItem(`${STORAGE_PREFIX}lang`, lang.code);
    } catch {}
  };

  // Delete All Local Data
  const handleDeleteAllData = () => {
    localStorage.clear();
    setAlertHistory([]);
    setSensorData(null);
    alert('All local FloodGuard caches and history have been completely deleted.');
    window.location.reload();
  };

  // Visual Theme Classes
  const statusTheme = useMemo(() => {
    switch (effectiveLevel) {
      case 'LEAVE_NOW':
        return {
          bannerBg: 'bg-red-600',
          bannerBorder: 'border-red-500',
          title: t.leaveNowTitle,
          desc: t.leaveNowDesc,
          icon: <ShieldAlert className="w-9 h-9 text-white animate-bounce" />,
          steps: [t.stepLeave1, t.stepLeave2],
          accentColor: 'text-red-500'
        };
      case 'PREPARE':
        return {
          bannerBg: 'bg-orange-600',
          bannerBorder: 'border-orange-500',
          title: t.prepareTitle,
          desc: t.prepareDesc,
          icon: <AlertTriangle className="w-9 h-9 text-white" />,
          steps: [t.stepPrepare1, t.stepPrepare2],
          accentColor: 'text-orange-500'
        };
      case 'WATCH':
        return {
          bannerBg: 'bg-amber-600',
          bannerBorder: 'border-amber-500',
          title: t.watchTitle,
          desc: t.watchDesc,
          icon: <AlertTriangle className="w-9 h-9 text-white" />,
          steps: [t.stepWatch1, t.stepWatch2],
          accentColor: 'text-amber-500'
        };
      default:
        return {
          bannerBg: 'bg-emerald-600',
          bannerBorder: 'border-emerald-500',
          title: t.safeTitle,
          desc: t.safeDesc,
          icon: <ShieldCheck className="w-9 h-9 text-white" />,
          steps: [t.stepSafe1, t.stepSafe2],
          accentColor: 'text-emerald-500'
        };
    }
  }, [effectiveLevel, t]);

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors ${
        settings.highContrast ? 'contrast-125 selection:bg-yellow-400' : ''
      } ${settings.largeText ? 'text-lg' : 'text-sm'}`}
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-base md:text-lg tracking-tight text-white leading-none">
              {t.appTitle}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs mt-0.5">
              📍 {locationName}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector Trigger */}
          <button
            onClick={() => setActiveModal('language')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
            aria-label="Change Language"
          >
            <Languages className="w-4 h-4 text-sky-400" />
            <span>{currentLanguage.nativeName}</span>
          </button>

          {/* Menu Drawer Toggle */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 transition"
            aria-label="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Drill Mode Prominent Banner */}
      {isDrillMode && (
        <div className="bg-amber-500 text-slate-950 font-black text-xs py-1.5 text-center tracking-widest uppercase shadow-md flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {t.drillBanner}
        </div>
      )}

      {/* Main Single-Screen Content (Ordered for stressed, non-technical person) */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-3.5 md:p-6 space-y-4">
        {/* 1. HUGE STATUS BANNER */}
        <section
          aria-label="Flood Threat Status"
          className={`w-full ${statusTheme.bannerBg} rounded-3xl p-5 md:p-6 shadow-2xl border-2 ${statusTheme.bannerBorder} text-white flex flex-col justify-between relative overflow-hidden transition-all duration-300`}
        >
          <div className="flex items-start justify-between relative z-10">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest bg-black/25 px-2.5 py-1 rounded-full backdrop-blur-sm">
                CURRENT THREAT STATUS
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mt-1">
                {statusTheme.title}
              </h2>
            </div>
            <div className="p-3 bg-black/20 rounded-2xl backdrop-blur-sm shadow-inner">
              {statusTheme.icon}
            </div>
          </div>

          <p className="text-sm sm:text-base font-semibold text-white/95 mt-3 relative z-10 leading-snug">
            {statusTheme.desc}
          </p>

          {/* Critical reason snippet */}
          <div className="mt-3 pt-3 border-t border-white/20 text-xs font-medium text-white/90 flex items-center justify-between relative z-10">
            <span className="truncate max-w-[85%]">{riskResult.reason}</span>
            {effectiveLevel === 'LEAVE_NOW' && (
              <button
                onClick={handleIAmSafe}
                className="px-3 py-1 bg-white text-slate-950 rounded-lg font-black text-xs hover:bg-slate-100 shadow transition"
              >
                {t.btnIAmSafe}
              </button>
            )}
          </div>
        </section>

        {/* 2. WHAT TO DO RIGHT NOW CARD (Numbered Steps) */}
        <section
          aria-label="Action Steps"
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl backdrop-blur-md"
        >
          <h3 className="font-extrabold text-sm md:text-base text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-sky-400" />
            {t.whatToDoTitle}
          </h3>
          <div className="space-y-2.5">
            {statusTheme.steps.map((stepText, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-sky-400 font-extrabold text-xs flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs md:text-sm font-semibold text-slate-200 leading-relaxed">
                  {stepText}
                </p>
              </div>
            ))}
          </div>

          {/* Multi-hazard warnings if heavy rain or landslide risks exist */}
          {(riskResult.heavyRainWarning || riskResult.landslideRisk) && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-[11px] font-bold">
              {riskResult.heavyRainWarning && (
                <span className="bg-sky-950 text-sky-300 border border-sky-600/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  🌧️ Heavy Rain Alert ({weatherData?.precipitation24h}mm / 24h)
                </span>
              )}
              {riskResult.landslideRisk && (
                <span className="bg-amber-950 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  ⛰️ Steep Slope Landslide Hazard
                </span>
              )}
            </div>
          )}
        </section>

        {/* 3. FOUR LARGE EMERGENCY ACTION BUTTONS */}
        <section
          aria-label="Immediate Emergency Actions"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
        >
          {/* Button 1: Hear Alert Voice / Stop Siren + Speed/Volume Controls */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleToggleAudio}
              className={`w-full p-3.5 sm:p-4 rounded-2xl font-black text-xs md:text-sm flex flex-col items-center justify-center gap-1.5 shadow-xl border transition ${
                isAudioPlaying
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100'
              }`}
            >
              {isAudioPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
              <span className="text-center">{isAudioPlaying ? t.btnStopAlert : t.btnHearAlert}</span>
            </button>
            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setAudioSpeechRate((prev) => (prev === 1.0 ? 0.8 : 1.0))}
                className={`flex-1 py-1 rounded-lg border font-bold ${
                  audioSpeechRate === 0.8
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {audioSpeechRate === 0.8 ? 'Slow: ON' : 'Slow'}
              </button>
            </div>
          </div>

          {/* Button 2: SOS Button */}
          <button
            onClick={handleTriggerSos}
            className="p-3.5 sm:p-4 rounded-2xl font-black text-xs md:text-sm bg-red-600 hover:bg-red-500 border border-red-500 text-white flex flex-col items-center justify-center gap-2 shadow-xl shadow-red-900/30 transition transform active:scale-95"
          >
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <span className="text-center">{t.btnSos}</span>
          </button>

          {/* Button 3: Call Emergency Helpline */}
          <a
            href={`tel:${helpline.disaster || helpline.police || '112'}`}
            className="p-3.5 sm:p-4 rounded-2xl font-black text-xs md:text-sm bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 transition transform active:scale-95"
          >
            <PhoneCall className="w-6 h-6" />
            <span className="text-center">
              {t.btnCallHelpline} ({helpline.disaster || helpline.police})
            </span>
          </a>

          {/* Button 4: Share Location */}
          <button
            onClick={handleShareLocation}
            className="p-3.5 sm:p-4 rounded-2xl font-black text-xs md:text-sm bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex flex-col items-center justify-center gap-2 shadow-xl transition transform active:scale-95"
          >
            <Share2 className="w-6 h-6 text-amber-400" />
            <span className="text-center">{t.btnShareLocation}</span>
          </button>
        </section>

        {/* Caption Banner (Displayed if phone has no voice for detected language) */}
        {captionBannerText && (
          <div className="p-4 bg-slate-900 border-2 border-amber-500 rounded-2xl shadow-2xl text-amber-200 text-sm md:text-base leading-relaxed">
            <strong className="block text-amber-300 font-extrabold mb-1">
              📢 Voice Alert Caption:
            </strong>
            {captionBannerText}
          </div>
        )}

        {/* 4. COMPASS DIRECTION & NEAREST REFUGE CARD */}
        <section aria-label="Safe Shelter Direction">
          <CompassDirectionCard
            primaryShelter={shelterResult.primaryShelter}
            alternateShelter={shelterResult.alternateShelter}
            verticalEvacuationAdvised={shelterResult.verticalEvacuationAdvised}
            honestAdvice={shelterResult.honestAdvice}
            labels={{
              safePlaceTitle: t.safePlaceTitle,
              directionLabel: t.directionLabel,
              distanceLabel: t.distanceLabel,
              travelTimeLabel: t.travelTimeLabel,
              elevationGainLabel: t.elevationGainLabel,
              alternateShelterLabel: t.alternateShelterLabel,
              verticalEvacWarning: t.verticalEvacWarning,
              noSheltersFound: t.noSheltersFound
            }}
          />
        </section>

        {/* Travel Mode Selector */}
        <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">Travel Mode:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setTravelMode('walking')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                travelMode === 'walking'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Foot (4.5 km/h)
            </button>
            <button
              onClick={() => setTravelMode('slow_walking')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                travelMode === 'slow_walking'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Child/Elderly (2.5 km/h)
            </button>
            <button
              onClick={() => setTravelMode('vehicle')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                travelMode === 'vehicle'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Vehicle (25 km/h)
            </button>
          </div>
        </div>

        {/* 5. INTERACTIVE LEAFLET MAP */}
        <section aria-label="Interactive Map">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {t.mapTitle}
            </h3>
            <button
              onClick={() => refreshData()}
              disabled={isRefreshing}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <Map
            userLocation={userLocation}
            primaryShelter={shelterResult.primaryShelter}
            alternateShelter={shelterResult.alternateShelter}
            candidateShelters={shelters}
            dischargePoints={dischargePoints}
            currentLevel={effectiveLevel}
            lowDataMode={settings.lowDataMode}
          />
        </section>

        {/* Visible Data Source & Last Updated Line */}
        <footer className="text-center text-[11px] text-slate-500 py-4 space-y-1">
          <p>{dataSourceNote || t.dataSourceLabel}</p>
          <p>
            {t.lastUpdatedLabel}: {lastUpdated || 'Live'} • Elevation: ~{userElevation}m • GPS: {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
          </p>
        </footer>
      </main>

      {/* Slide-out Menu Drawer for Auxiliary Tools (Setup, Sensors, Checklist, Authorities, Settings) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-sky-400" />
                  <span className="font-black text-white text-base">FloodGuard Menu</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('setup');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs">{t.menuSetup}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('language');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Languages className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-xs">{t.menuLanguage}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{currentLanguage.nativeName}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('sensors');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs">{t.menuSensors}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                    Web Serial / Sim
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('family');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs">{t.menuFamily}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('checklist');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-xs">{t.menuChecklist}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('community');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquarePlus className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-xs">{t.menuCommunity}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('authorities');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs">{t.menuAuthorities}</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded font-mono">
                    CAP 1.2
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveModal('settings');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-slate-300" />
                    <span className="font-bold text-xs">{t.menuSettings}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Bottom Menu Info */}
            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              FloodGuard Open Source v1.0 • MIT License
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialogs */}
      <FirstRunWizard
        isOpen={showFirstRun}
        onComplete={handleCompleteFirstRun}
        detectedLocation={userLocation}
        detectedLocationName={locationName}
        suggestedLanguage={aiSuggestedLang || currentLanguage}
      />

      <SetupModal
        isOpen={activeModal === 'setup'}
        onClose={() => setActiveModal(null)}
        onKeyChanged={() => refreshData()}
      />

      <LanguageModal
        isOpen={activeModal === 'language'}
        onClose={() => setActiveModal(null)}
        selectedLangCode={currentLanguage.code}
        onSelectLanguage={(lang) => {
          setCurrentLanguage(lang);
          try {
            localStorage.setItem(`${STORAGE_PREFIX}lang`, lang.code);
          } catch {}
        }}
        aiSuggestedCode={aiSuggestedLang?.code}
        aiRationale={aiRationale}
      />

      <SensorsModal
        isOpen={activeModal === 'sensors'}
        onClose={() => setActiveModal(null)}
        sensorData={sensorData}
        onSensorUpdate={(reading) => setSensorData(reading)}
        simulator={simulator}
      />

      <FamilySafetyModal
        isOpen={activeModal === 'family'}
        onClose={() => setActiveModal(null)}
        userLocation={userLocation}
        locationName={locationName}
      />

      <ChecklistModal
        isOpen={activeModal === 'checklist'}
        onClose={() => setActiveModal(null)}
        langCode={currentLanguage.code}
      />

      <CommunityModal
        isOpen={activeModal === 'community'}
        onClose={() => setActiveModal(null)}
        userLocation={userLocation}
      />

      <AuthoritiesModal
        isOpen={activeModal === 'authorities'}
        onClose={() => setActiveModal(null)}
        userLocation={userLocation}
        locationName={locationName}
        currentLevel={effectiveLevel}
        primaryShelter={shelterResult.primaryShelter}
        proxyUrl={settings.proxyUrl}
      />

      <SettingsModal
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          try {
            localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(newSettings));
          } catch {}
        }}
        alertHistory={alertHistory}
        isDrillMode={isDrillMode}
        onToggleDrillMode={(enabled) => setIsDrillMode(enabled)}
        onDeleteAllData={handleDeleteAllData}
      />
    </div>
  );
};

export default App;
