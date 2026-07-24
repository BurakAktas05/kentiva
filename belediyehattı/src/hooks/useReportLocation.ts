import { useState, useEffect, useRef } from 'react';
import { getDevicePosition, isDeviceLocationFailure } from '../lib/deviceLocation';
import { resolveMunicipalityByGps, fetchNearbyReports, type PublicTenant, type ApiReportListResponse } from '../api';
import { Lang, t } from '../i18n';

interface UseReportLocationProps {
  defaultMunicipality?: PublicTenant | null;
  lang: Lang;
}

export function useReportLocation({ defaultMunicipality, lang }: UseReportLocationProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [resolvedMunicipality, setResolvedMunicipality] = useState<PublicTenant | null>(null);
  const [nearbyReports, setNearbyReports] = useState<ApiReportListResponse[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const locationRequestRef = useRef(0);

  useEffect(() => {
    if (defaultMunicipality?.onboarded && defaultMunicipality.id && !resolvedMunicipality) {
      setResolvedMunicipality(defaultMunicipality);
    }
  }, [defaultMunicipality, resolvedMunicipality]);

  const resolveMunicipalityForRequest = async (lat: number, lng: number, requestId: number) => {
    const isCurrent = () => locationRequestRef.current === requestId;
    let resolved: PublicTenant | null = null;
    if (defaultMunicipality?.id) {
      if (!isCurrent()) return null;
      setResolvedMunicipality(defaultMunicipality);
      setError('');
      resolved = defaultMunicipality;
    } else {
      const municipality = await resolveMunicipalityByGps(lat, lng);
      if (!isCurrent()) return null;
      setResolvedMunicipality(municipality);
      if (!municipality) {
        setError(t('report.municipality.outside', lang));
      } else {
        setError('');
      }
      resolved = municipality;
    }

    if (resolved && resolved.onboarded) {
      try {
        if (!isCurrent()) return null;
        setNearbyLoading(true);
        const reportsList = await fetchNearbyReports(lat, lng, 1000);
        if (isCurrent()) setNearbyReports(reportsList || []);
      } catch (err) {
        console.warn("Nearby reports fetch failed", err);
      } finally {
        if (isCurrent()) setNearbyLoading(false);
      }
    } else if (isCurrent()) {
      setNearbyReports([]);
      setNearbyLoading(false);
    }
    return isCurrent() ? resolved : null;
  };

  const getPosition = async () => {
    const requestId = ++locationRequestRef.current;
    setLocating(true);
    setError('');
    setNearbyLoading(false);
    if (!defaultMunicipality?.id) {
      setResolvedMunicipality(null);
    }

    try {
      let result = await getDevicePosition({ highAccuracy: true, timeoutMs: 3500 });
      if (locationRequestRef.current !== requestId) return;
      if (result.ok === false && (result.reason === 'timeout' || result.reason === 'unavailable')) {
        result = await getDevicePosition({ highAccuracy: false, timeoutMs: 4000 });
        if (locationRequestRef.current !== requestId) return;
      }
      if (result.ok) {
        const lat = result.coords.lat;
        const lng = result.coords.lng;
        setLatitude(lat);
        setLongitude(lng);
        setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        await resolveMunicipalityForRequest(lat, lng, requestId);
      } else if (isDeviceLocationFailure(result)) {
        if (result.reason === 'denied') setError(t('report.location.denied', lang));
        else if (result.reason === 'unsupported') setError(t('report.location.needGps', lang));
        else setError(lang === 'tr' ? 'Konum bilgisi alınamadı.' : 'Failed to retrieve location.');
      }
    } catch {
      if (locationRequestRef.current === requestId) {
        setError(lang === 'tr' ? 'Konum çözümlenirken hata oluştu.' : 'Failed to resolve location.');
      }
    } finally {
      if (locationRequestRef.current === requestId) setLocating(false);
    }
  };

  const setManualLocation = async (lat: number, lng: number) => {
    const requestId = ++locationRequestRef.current;
    setLocating(false);
    setNearbyLoading(false);
    setError('');
    setLatitude(lat);
    setLongitude(lng);
    setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    if (!defaultMunicipality?.id) setResolvedMunicipality(null);

    try {
      await resolveMunicipalityForRequest(lat, lng, requestId);
    } catch {
      if (locationRequestRef.current === requestId) {
        setError(lang === 'tr' ? 'Konum çözümlenirken hata oluştu.' : 'Failed to resolve location.');
      }
    }
  };

  // Run initial lookup
  useEffect(() => {
    let active = true;
    const requestId = ++locationRequestRef.current;
    const isCurrent = () => active && locationRequestRef.current === requestId;
    const run = async () => {
      setLocating(true);
      setError('');
      try {
        let result = await getDevicePosition({ highAccuracy: true, timeoutMs: 3500 });
        if (!isCurrent()) return;
        if (result.ok === false && (result.reason === 'timeout' || result.reason === 'unavailable')) {
          result = await getDevicePosition({ highAccuracy: false, timeoutMs: 4000 });
          if (!isCurrent()) return;
        }
        if (result.ok) {
          const lat = result.coords.lat;
          const lng = result.coords.lng;
          setLatitude(lat);
          setLongitude(lng);
          setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          await resolveMunicipalityForRequest(lat, lng, requestId);
        } else if (isDeviceLocationFailure(result)) {
          if (result.reason === 'denied') setError(t('report.location.denied', lang));
          else if (result.reason === 'unsupported') setError(t('report.location.needGps', lang));
          else setError(lang === 'tr' ? 'Konum bilgisi alınamadı.' : 'Failed to retrieve location.');
        }
      } catch {
        if (isCurrent()) {
          setError(lang === 'tr' ? 'Konum çözümlenirken hata oluştu.' : 'Failed to resolve location.');
        }
      } finally {
        if (isCurrent()) setLocating(false);
      }
    };
    void run();
    return () => {
      active = false;
      if (locationRequestRef.current === requestId) locationRequestRef.current += 1;
    };
  }, [defaultMunicipality?.id, lang]);

  return {
    latitude,
    longitude,
    locationText,
    locating,
    error,
    resolvedMunicipality,
    nearbyReports,
    nearbyLoading,
    getPosition,
    setManualLocation,
    setLatitude,
    setLongitude,
    setLocationText,
    resolveMunicipalityAt: setManualLocation,
  };
}
