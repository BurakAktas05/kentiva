import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MunicipalitySettingsPage from './MunicipalitySettingsPage';
import api from '../api';
import '@testing-library/jest-dom';

vi.mock('../api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
    },
  };
});

vi.mock('../components/BusRoutesPanel', () => ({
  default: () => <div data-testid="bus-routes-panel">Bus Routes Panel</div>
}));
vi.mock('../components/MunicipalityLocationPanel', () => ({
  default: () => <div data-testid="location-panel">Location Panel</div>
}));
vi.mock('../components/OsmBoundaryFetchPanel', () => ({
  default: () => <div data-testid="boundary-fetch-panel">Boundary Fetch Panel</div>
}));
vi.mock('../components/ReportTemplatesPanel', () => ({
  default: () => <div data-testid="templates-panel">Templates Panel</div>
}));
vi.mock('../components/MunicipalityReputationSettingsPanel', () => ({
  default: () => <div data-testid="reputation-panel">Reputation Panel</div>
}));

describe('MunicipalitySettingsPage', () => {
  const mockMuni = {
    id: 'muni-123',
    name: 'Kadikoy',
    slug: 'kadikoy',
    displayName: 'Kadıköy Belediyesi',
    logoUrl: null,
    primaryColor: '#6200ee',
    secondaryColor: '#03dac6',
    accentColor: '#b00020',
    slogan: 'Smiling Kadikoy',
    contactEmail: 'contact@kadikoy.bel.tr',
    contactPhone: '2160000000',
    websiteUrl: 'https://kadikoy.bel.tr',
    publicStatsEnabled: true,
    workflowMode: 'SIMPLE',
  };

  it('renders loading skeleton and then loads settings', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockMuni } });

    render(<MunicipalitySettingsPage />);

    // After loading completes
    await waitFor(() => {
      expect(screen.getByText('Belediye Ayarları')).toBeInTheDocument();
    });

    expect(screen.getAllByText('kadikoy')[0]).toBeInTheDocument();
  });

  it('allows switching tabs', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockMuni } });

    render(<MunicipalitySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Belediye Ayarları')).toBeInTheDocument();
    });

    // Switch to Location tab
    const locationTab = screen.getByText('Konum & Harita');
    fireEvent.click(locationTab);

    expect(screen.getByTestId('location-panel')).toBeInTheDocument();
    expect(screen.getByTestId('boundary-fetch-panel')).toBeInTheDocument();
  });
});
