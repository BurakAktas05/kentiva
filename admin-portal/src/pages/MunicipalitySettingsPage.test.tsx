import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import api from '../api';
import MunicipalitySettingsPage from './MunicipalitySettingsPage';

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

vi.mock('../components/MunicipalityLocationPanel', () => ({
  default: () => <div data-testid="location-panel">Location Panel</div>,
}));
vi.mock('../components/OsmBoundaryFetchPanel', () => ({
  default: () => <div data-testid="boundary-fetch-panel">Boundary Fetch Panel</div>,
}));
vi.mock('../components/ReportTemplatesPanel', () => ({
  default: () => <div data-testid="templates-panel">Templates Panel</div>,
}));
vi.mock('../components/MunicipalityReputationSettingsPanel', () => ({
  default: () => <div data-testid="reputation-panel">Reputation Panel</div>,
}));

describe('MunicipalitySettingsPage', () => {
  const mockMunicipality = {
    id: 'muni-123',
    name: 'Kadikoy',
    slug: 'kadikoy',
    displayName: 'Kadikoy Belediyesi',
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
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockMunicipality } });

    render(<MunicipalitySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Belediye Ayarlari')).toBeInTheDocument();
    });

    expect(screen.getAllByText('kadikoy')[0]).toBeInTheDocument();
  });

  it('allows switching tabs', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockMunicipality } });

    render(<MunicipalitySettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Belediye Ayarlari')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Konum & Harita'));

    await waitFor(() => {
      expect(screen.getByTestId('location-panel')).toBeInTheDocument();
      expect(screen.getByTestId('boundary-fetch-panel')).toBeInTheDocument();
    });
  });
});
