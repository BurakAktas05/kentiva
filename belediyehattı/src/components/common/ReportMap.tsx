import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { ApiReportListResponse } from '../../api';

// Custom red divIcon for nearby reports
const redIcon = L.divIcon({
  className: 'custom-report-marker-container',
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; width: 30px; height: 36px;">
      <!-- Outer Circle -->
      <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #f43f5e; border: 2px solid white; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; transition: transform 0.2s;">
        <!-- Inner White Dot -->
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></div>
      </div>
      <!-- Triangle Pointer -->
      <div style="width: 8px; height: 8px; background-color: #f43f5e; transform: rotate(45deg); margin-top: -5px; border-right: 2px solid white; border-bottom: 2px solid white;"></div>
    </div>
  `,
  iconSize: [30, 36],
  iconAnchor: [15, 36]
});

// Custom blue divIcon for current user location (pulsing dot)
const blueIcon = L.divIcon({
  className: 'custom-user-marker-container',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
      <div class="animate-marker-ping"
           style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: #3b82f6; opacity: 0.4;"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #2563eb; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

interface ReportMapProps {
  latitude: number;
  longitude: number;
  isDark: boolean;
  nearbyReports: ApiReportListResponse[];
  lang: string;
}

export const ReportMap = React.memo(function ReportMap({
  latitude,
  longitude,
  isDark,
  nearbyReports,
  lang
}: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([latitude, longitude], 15);
    mapRef.current = map;

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Place current position blue marker
    L.marker([latitude, longitude], { icon: blueIcon })
      .addTo(map);

    // Place nearby reports as unclickable red markers
    if (nearbyReports && nearbyReports.length > 0) {
      nearbyReports.forEach((r) => {
        if (r.latitude != null && r.longitude != null) {
          L.marker([r.latitude, r.longitude], { icon: redIcon })
            .addTo(map);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, isDark, nearbyReports]);

  return (
    <div className="w-full h-full relative font-sans" style={{ zIndex: 10 }}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full grayscale-map" />
      <div className="absolute inset-0 pointer-events-none z-[1000] mix-blend-color opacity-10 bg-slate-500" />
      <div className="absolute bottom-2 left-2 z-[1000] rounded-md px-2 py-0.5 text-[9px] font-bold bg-white/85 text-slate-600 dark:bg-slate-950/85 dark:text-slate-400">
        {lang === 'tr' ? 'Çevre İhbarları Gösteriliyor' : 'Showing Nearby Reports'}
      </div>
    </div>
  );
});
