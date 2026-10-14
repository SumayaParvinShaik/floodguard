import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoPoint, Shelter, DischargePoint, RiskLevel } from '../types';

interface MapProps {
  userLocation: GeoPoint;
  primaryShelter: Shelter | null;
  alternateShelter: Shelter | null;
  candidateShelters: Shelter[];
  dischargePoints: DischargePoint[];
  currentLevel: RiskLevel;
  lowDataMode?: boolean;
}

export const Map: React.FC<MapProps> = ({
  userLocation,
  primaryShelter,
  alternateShelter,
  candidateShelters,
  dischargePoints,
  currentLevel,
  lowDataMode = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // Standard OpenStreetMap tiles (free, worldwide, no API key)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map markers and layers whenever location, shelters, or risk points update
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. User Location Marker (Pulsing Beacon)
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-sky-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-sky-500 border-2 border-white shadow-lg"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup(`
        <div class="text-slate-900 text-sm font-sans p-1">
          <p class="font-bold text-sky-700">📍 You Are Here</p>
          <p class="text-xs text-slate-600">${userLocation.lat.toFixed(4)}°, ${userLocation.lng.toFixed(4)}°</p>
        </div>
      `)
      .addTo(group);

    // 2. 5km, 20km, 50km Threat Geofence Circles
    if (!lowDataMode) {
      L.circle([userLocation.lat, userLocation.lng], {
        radius: 5000,
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity: currentLevel === 'LEAVE_NOW' ? 0.15 : 0.04,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(group).bindTooltip('5 km Immediate Danger Zone');

      L.circle([userLocation.lat, userLocation.lng], {
        radius: 20000,
        color: '#ea580c',
        fillColor: '#ea580c',
        fillOpacity: 0.02,
        weight: 1,
        dashArray: '6, 6'
      }).addTo(group);
    }

    // 3. Flood Discharge Points
    dischargePoints.forEach((point) => {
      let color = '#059669'; // Green Safe
      if (point.dischargeRatio >= 3.0) color = '#dc2626'; // Danger
      else if (point.dischargeRatio >= 2.0) color = '#ea580c'; // Prepare
      else if (point.dischargeRatio >= 1.5) color = '#d97706'; // Watch

      const circle = L.circleMarker([point.lat, point.lng], {
        radius: point.dischargeRatio >= 2.0 ? 12 : 7,
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2
      }).addTo(group);

      circle.bindPopup(`
        <div class="text-slate-900 text-xs font-sans">
          <strong style="color: ${color}">GloFAS River Discharge Point</strong><br/>
          Forecast Peak: <strong>${point.maxForecastDischarge} m³/s</strong><br/>
          Historical 30d Mean: <strong>${point.meanHistoricalDischarge} m³/s</strong><br/>
          Surge Ratio: <strong>${point.dischargeRatio}x</strong><br/>
          Distance: <strong>${point.distanceKm} km</strong>
        </div>
      `);
    });

    // 4. Candidate Shelters Markers
    candidateShelters.forEach((shelter) => {
      const isPrimary = primaryShelter && primaryShelter.id === shelter.id;
      const isAlternate = alternateShelter && alternateShelter.id === shelter.id;

      let badgeBg = 'bg-slate-700';
      let border = 'border-slate-300';
      let iconSymbol = '🏠';

      if (isPrimary) {
        badgeBg = 'bg-emerald-600';
        border = 'border-white';
        iconSymbol = '⭐';
      } else if (isAlternate) {
        badgeBg = 'bg-amber-600';
        border = 'border-white';
        iconSymbol = '🛡️';
      } else if (shelter.type === 'hospital') {
        badgeBg = 'bg-rose-700';
        iconSymbol = '🏥';
      } else if (shelter.type === 'school') {
        badgeBg = 'bg-blue-700';
        iconSymbol = '🏫';
      }

      const shelterIcon = L.divIcon({
        className: 'shelter-marker-icon',
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg ${badgeBg} border-2 ${border} text-xs text-white">
            ${iconSymbol}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([shelter.lat, shelter.lng], { icon: shelterIcon }).addTo(group);

      const statusTag = isPrimary
        ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">PRIMARY REFUGE</span>'
        : isAlternate
        ? '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">ALTERNATE SHELTER</span>'
        : '';

      marker.bindPopup(`
        <div class="text-slate-900 text-xs font-sans min-w-[170px]">
          <div class="mb-1">${statusTag}</div>
          <p class="font-bold text-sm text-slate-800">${shelter.name}</p>
          <p class="text-slate-600">Distance: <strong>${shelter.distanceKm} km</strong> (${shelter.compassDirection || 'N'})</p>
          <p class="text-slate-600">Travel time: <strong>${shelter.travelMinutes} mins</strong></p>
          <p class="text-emerald-700 font-semibold">Elevation gain: <strong>+${shelter.elevationGainMeters}m</strong></p>
          <p class="text-[10px] text-slate-500 mt-1">${shelter.address || 'Public Facility'}</p>
        </div>
      `);
    });

    // 5. Evacuation Route to Primary Shelter
    if (primaryShelter) {
      // Find if any flood point is near the straight line path
      const nearestFlood = dischargePoints.find((p) => p.dischargeRatio >= 2.0 && p.distanceKm <= 10.0);
      let routePoints: [number, number][] = [
        [userLocation.lat, userLocation.lng],
        [primaryShelter.lat, primaryShelter.lng]
      ];

      // If a flood point is directly between user and shelter, route slightly around it
      if (nearestFlood) {
        const midLat = (userLocation.lat + primaryShelter.lat) / 2;
        const midLng = (userLocation.lng + primaryShelter.lng) / 2;
        // Offset vector perpendicular to flood point
        const offsetLat = midLat + (midLat - nearestFlood.lat) * 0.4;
        const offsetLng = midLng + (midLng - nearestFlood.lng) * 0.4;
        routePoints = [
          [userLocation.lat, userLocation.lng],
          [offsetLat, offsetLng],
          [primaryShelter.lat, primaryShelter.lng]
        ];
      }

      // Draw glowing evacuation route
      L.polyline(routePoints, {
        color: '#10b981',
        weight: 4,
        opacity: 0.9,
        dashArray: '6, 8',
        lineCap: 'round'
      }).addTo(group);
    }

    // Adjust map viewport to bound user and primary shelter
    if (primaryShelter) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [primaryShelter.lat, primaryShelter.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation, primaryShelter, alternateShelter, candidateShelters, dischargePoints, currentLevel, lowDataMode]);

  return (
    <div className="relative w-full h-[340px] md:h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 flex flex-wrap gap-3 items-center shadow-lg">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block border border-white" />
          You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Safest Shelter
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          Flood Surge
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-emerald-500 border-dashed inline-block" />
          Safe Route
        </span>
      </div>
    </div>
  );
};
