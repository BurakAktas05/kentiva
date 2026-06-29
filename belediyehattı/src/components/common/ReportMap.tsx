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
  onLocationChange?: (lat: number, lng: number) => void;
}

export const ReportMap = React.memo(function ReportMap({
  latitude,
  longitude,
  isDark,
  nearbyReports,
  lang,
  onLocationChange
}: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const nearbyMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map = mapRef.current;
    if (!map) {
      map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([latitude, longitude], 15);
      mapRef.current = map;

      const tileUrl = 'https://mt1.google.com/vt/lyrs=m&hl=tr&x={x}&y={y}&z={z}';

      L.tileLayer(tileUrl, {
        attribution: '&copy; Google Maps',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({
        position: 'bottomright'
      }).addTo(map);
    } else {
      map.setView([latitude, longitude]);
    }

    // Handle user marker
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], { 
        icon: blueIcon,
        draggable: onLocationChange != null
      }).addTo(map);

      if (onLocationChange) {
        marker.on('dragend', (event) => {
          const m = event.target as L.Marker;
          const pos = m.getLatLng();
          onLocationChange(pos.lat, pos.lng);
        });
      }
      markerRef.current = marker;
    }

    // Clear old nearby markers
    nearbyMarkersRef.current.forEach(m => m.remove());
    nearbyMarkersRef.current = [];

    // Place nearby reports as unclickable red markers
    if (nearbyReports && nearbyReports.length > 0) {
      nearbyReports.forEach((r) => {
        if (r.latitude != null && r.longitude != null) {
          const m = L.marker([r.latitude, r.longitude], { icon: redIcon })
            .addTo(map);
          nearbyMarkersRef.current.push(m);
        }
      });
    }
  }, [latitude, longitude, isDark, nearbyReports, onLocationChange]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        nearbyMarkersRef.current = [];
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative font-sans" style={{ zIndex: 10 }}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full grayscale-map" />
      <div className="absolute bottom-2 left-2 z-[1000] rounded-md px-2 py-0.5 text-[9px] font-bold bg-white/85 text-slate-600 dark:bg-slate-950/85 dark:text-slate-400">
        {lang === 'tr' ? 'Çevre İhbarları Gösteriliyor' : 'Showing Nearby Reports'}
      </div>
    </div>
  );
});
