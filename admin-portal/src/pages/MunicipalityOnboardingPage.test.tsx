import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MunicipalityOnboardingPage from './MunicipalityOnboardingPage';
import api from '../api';
import '@testing-library/jest-dom';

vi.mock('../api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
    },
  };
});

// Mock Leaflet and React Leaflet to avoid DOM layout errors in JSDOM
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polygon: () => <div data-testid="leaflet-polygon" />,
  Polyline: () => <div data-testid="polyline" />,
  CircleMarker: () => <div data-testid="circle-marker" />,
  useMapEvents: () => {},
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

vi.mock('leaflet', () => ({
  default: {
    latLngBounds: vi.fn(() => ({})),
    latLng: vi.fn(),
  },
}));

describe('MunicipalityOnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/catalog/provinces')) {
        return Promise.resolve({ data: { data: [{ plateCode: '34', nameTr: 'İstanbul' }] } });
      }
      if (url.includes('/catalog/districts')) {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, memberId: '34-kadikoy', nameTr: 'Kadıköy', districtSlug: 'kadikoy', onboarded: false }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('navigates through onboarding steps correctly', async () => {
    render(
      <MemoryRouter>
        <MunicipalityOnboardingPage />
      </MemoryRouter>
    );

    // STEP 1: Branding
    expect(screen.getByText('Kurumsal Kimlik ve Operasyon Modu')).toBeInTheDocument();

    // Wait for province data to load
    await waitFor(() => {
      expect(screen.getByText('İstanbul')).toBeInTheDocument();
    });

    const provinceSelect = screen.getByLabelText(/İl Seçin/i);
    fireEvent.change(provinceSelect, { target: { value: '34' } });

    // Wait for district data to load
    await waitFor(() => {
      expect(screen.getByText(/Kadıköy/i)).toBeInTheDocument();
    });

    const districtSelect = screen.getByLabelText(/İlçe Seçin/i);
    fireEvent.change(districtSelect, { target: { value: '1' } });

    const nextBtn = screen.getByRole('button', { name: /İleri/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // STEP 2: Sınırlar (Boundaries)
    await waitFor(() => {
      expect(screen.getByText('Hizmet Sınırları ve Coğrafi Çit (Geofencing)')).toBeInTheDocument();
    });

    // Go next again
    const nextBtn2 = screen.getByRole('button', { name: /İleri/i });
    fireEvent.click(nextBtn2);

    // STEP 3: Hesaplar (Admin accounts)
    await waitFor(() => {
      expect(screen.getByText('Erişim ve Yetkilendirme Hesapları')).toBeInTheDocument();
    });
  });
});
