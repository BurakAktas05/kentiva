import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (defaultMunicipality?.onboarded && defaultMunicipality.id && !resolvedMunicipality) {
      setResolvedMunicipality(defaultMunicipality);
    }
  }, [defaultMunicipality, resolvedMunicipality]);

  const resolveMunicipalityAt = async (lat: number, lng: number) => {
    let resolved: PublicTenant | null = null;
    if (defaultMunicipality?.id) {
      setResolvedMunicipality(defaultMunicipality);
      setError('');
      resolved = defaultMunicipality;
    } else {
      const municipality = await resolveMunicipalityByGps(lat, lng);
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
        setNearbyLoading(true);
        const reportsList = await fetchNearbyReports(lat, lng, 1000);
        setNearbyReports(reportsList || []);
      } catch (err) {
        console.warn("Nearby reports fetch failed", err);
      } finally {
        setNearbyLoading(false);
      }
    }
    return resolved;
  };

  const getPosition = async () => {
    setLocating(true);
    setError('');
    if (!defaultMunicipality?.id) {
      setResolvedMunicipality(null);
    }

    try {
      let result = await getDevicePosition({ highAccuracy: true, timeoutMs: 3500 });
      if (result.ok === false && (result.reason === 'timeout' || result.reason === 'unavailable')) {
        result = await getDevicePosition({ highAccuracy: false, timeoutMs: 4000 });
      }
      if (result.ok) {
        const lat = result.coords.lat;
        const lng = result.coords.lng;
        setLatitude(lat);
        setLongitude(lng);
        setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        await resolveMunicipalityAt(lat, lng);
      } else if (isDeviceLocationFailure(result)) {
        if (result.reason === 'denied') setError(t('report.location.denied', lang));
        else if (result.reason === 'unsupported') setError(t('report.location.needGps', lang));
        else setError(lang === 'tr' ? 'Konum bilgisi alınamadı.' : 'Failed to retrieve location.');
      }
    } catch {
      setError(lang === 'tr' ? 'Konum çözümlenirken hata oluştu.' : 'Failed to resolve location.');
    } finally {
      setLocating(false);
    }
  };

  // Run initial lookup
  useEffect(() => {
    let active = true;
    const run = async () => {
      setLocating(true);
      setError('');
      try {
        let result = await getDevicePosition({ highAccuracy: true, timeoutMs: 3500 });
        if (!active) return;
        if (result.ok === false && (result.reason === 'timeout' || result.reason === 'unavailable')) {
          result = await getDevicePosition({ highAccuracy: false, timeoutMs: 4000 });
          if (!active) return;
        }
        if (result.ok) {
          const lat = result.coords.lat;
          const lng = result.coords.lng;
          setLatitude(lat);
          setLongitude(lng);
          setLocationText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          await resolveMunicipalityAt(lat, lng);
        } else if (isDeviceLocationFailure(result)) {
          if (result.reason === 'denied') setError(t('report.location.denied', lang));
          else if (result.reason === 'unsupported') setError(t('report.location.needGps', lang));
          else setError(lang === 'tr' ? 'Konum bilgisi alınamadı.' : 'Failed to retrieve location.');
        }
      } catch {
        if (active) {
          setError(lang === 'tr' ? 'Konum çözümlenirken hata oluştu.' : 'Failed to resolve location.');
        }
      } finally {
        if (active) setLocating(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [defaultMunicipality?.id, lang]);

  return {
    latitude,
    longitude,
    locationText,
    locating,
    error,
    setError,
    resolvedMunicipality,
    nearbyReports,
    nearbyLoading,
    getPosition,
  };
}
