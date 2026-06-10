import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Phone, MapPin } from 'lucide-react';
import { type PharmacyWidget } from '../../api';
import { openMapsNavigation } from '../../lib/deviceLocation';
import { Lang, t } from '../../i18n';

// Fix Leaflet marker icon asset paths in Vite bundling
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom red icon for duty pharmacies
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

interface PharmacyMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacies: PharmacyWidget[];
  userLat?: number | null;
  userLng?: number | null;
  lang: Lang;
  isDark: boolean;
}

export default function PharmacyMapModal({
  isOpen,
  onClose,
  pharmacies,
  userLat,
  userLng,
  lang,
  isDark,
}: PharmacyMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Center coordinates: prioritize user location, fallback to first pharmacy, fallback to Turkey center
    let centerLat = 39.9334;
    let centerLng = 32.8597;
    let zoomLevel = 13;

    const validPharmacies = pharmacies.filter(p => p.lat != null && p.lng != null);

    if (userLat != null && userLng != null) {
      centerLat = userLat;
      centerLng = userLng;
    } else if (validPharmacies.length > 0) {
      centerLat = validPharmacies[0].lat!;
      centerLng = validPharmacies[0].lng!;
      zoomLevel = 14;
    }

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([centerLat, centerLng], zoomLevel);

    mapRef.current = map;

    // Add clean map tiles (CartoDB Positron for light mode, Dark Matter for dark mode)
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    // Place user marker
    if (userLat != null && userLng != null) {
      L.marker([userLat, userLng], { icon: blueIcon })
        .addTo(map)
        .bindPopup(`<div class="text-xs font-semibold">${t('home.widgets.yourLocation', lang) || 'Konumunuz'}</div>`);
    }

    // Place pharmacy markers
    validPharmacies.forEach(p => {
      const popupHtml = `
        <div style="font-family: inherit; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0; font-weight: 700; font-size: 13px; color: ${isDark ? '#fff' : '#0f172a'};">${p.name}</h4>
          <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 1.4; color: ${isDark ? '#94a3b8' : '#64748b'};">${p.address}</p>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            ${p.phone ? `
              <a href="tel:${p.phone.replace(/\s/g, '')}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #10b981; text-decoration: none;">
                📞 ${p.phone}
              </a>
            ` : ''}
          </div>
        </div>
      `;

      const marker = L.marker([p.lat!, p.lng!], { icon: redIcon })
        .addTo(map)
        .bindPopup(popupHtml);

      // Handle marker click
      marker.on('click', () => {
        map.setView([p.lat!, p.lng!], 15);
      });
    });

    // Fit bounds if there are multiple markers
    if (validPharmacies.length > 0) {
      const boundsPoints: L.LatLngExpression[] = validPharmacies.map(p => [p.lat!, p.lng!]);
      if (userLat != null && userLng != null) {
        boundsPoints.push([userLat, userLng]);
      }
      if (boundsPoints.length > 1) {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
      }
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, pharmacies, userLat, userLng, isDark, lang]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/40 backdrop-blur-sm">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 bg-white dark:bg-slate-900 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {t('home.widgets.pharmacyMap', lang) || 'Nöbetçi Eczane Haritası'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </div>

        {/* Bottom Drawer listing pharmacies for quick interaction */}
        <div className="max-h-[30vh] overflow-y-auto bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 shrink-0 z-10">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            {t('home.widgets.pharmacyList', lang) || 'NÖBETÇİ ECZANELER'}
          </p>
          <div className="space-y-3">
            {pharmacies.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {p.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.address}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                      >
                        <Phone className="h-3 w-3" />
                        {p.phone}
                      </a>
                    )}
                    {p.lat != null && p.lng != null && (
                      <button
                        onClick={() => openMapsNavigation(p.lat!, p.lng!, p.name)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {t('home.widgets.directions', lang)}
                      </button>
                    )}
                  </div>
                </div>

                {p.lat != null && p.lng != null && mapRef.current && (
                  <button
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.setView([p.lat!, p.lng!], 16);
                        // find layer and open popup
                        mapRef.current.eachLayer((layer: any) => {
                          if (layer instanceof L.Marker) {
                            const latlng = layer.getLatLng();
                            if (latlng.lat === p.lat && latlng.lng === p.lng) {
                              layer.openPopup();
                            }
                          }
                        });
                      }
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition shrink-0"
                  >
                    {t('home.widgets.showOnMap', lang) || 'Haritada Gör'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
