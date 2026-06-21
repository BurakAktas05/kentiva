import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { ApiReportListResponse } from '../../api';

// Custom red icon for nearby reports
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom blue icon for current user location
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
    <div className="w-full h-full relative" style={{ zIndex: 10 }}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 pointer-events-none z-[1000] mix-blend-color opacity-10 bg-slate-500" />
      <div className="absolute bottom-2 left-2 z-[1000] rounded-md px-2 py-0.5 text-[9px] font-bold bg-white/85 text-slate-600 dark:bg-slate-950/85 dark:text-slate-400">
        {lang === 'tr' ? 'Çevre İhbarları Gösteriliyor' : 'Showing Nearby Reports'}
      </div>
    </div>
  );
});
