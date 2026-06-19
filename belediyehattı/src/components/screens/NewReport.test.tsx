import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewReport from './NewReport';
import * as api from '../../api';
import '@testing-library/jest-dom';

vi.mock('../../api', () => ({
  getCategories: vi.fn(),
  getReportTemplates: vi.fn(),
  resolveMunicipalityByGps: vi.fn(),
  fetchNearbyReportHints: vi.fn(),
  createReport: vi.fn(),
  resolveMediaUrl: vi.fn(url => url),
}));

vi.mock('../ReportAiScanOverlay', () => ({
  default: () => <div data-testid="ai-scan-overlay">AI Scan Overlay</div>
}));

describe('NewReport Screen Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Yol Cukuru' },
    { id: 'cat-2', name: 'Sokak Lambasi' },
  ] as any;

  const mockMunicipality = {
    id: 'muni-123',
    displayName: 'Kadikoy Belediyesi',
    slug: 'kadikoy',
    onboarded: true,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock geolocation API in jsdom
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 41.0082,
            longitude: 28.9784,
          },
        });
      }),
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('detects GPS location and loads categories on mount', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    vi.mocked(api.resolveMunicipalityByGps).mockResolvedValueOnce(mockMunicipality);

    render(
      <NewReport
        defaultMunicipality={mockMunicipality}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Yol Cukuru')).toBeInTheDocument();
      expect(screen.getByText('Sokak Lambasi')).toBeInTheDocument();
    });

    // Verify coordinate auto-fill
    expect(screen.getByPlaceholderText('Konum')).toHaveValue('41.00820, 28.97840');
  });

  it('progresses to step 2 review screen and submits successfully', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    vi.mocked(api.resolveMunicipalityByGps).mockResolvedValueOnce(mockMunicipality);
    vi.mocked(api.fetchNearbyReportHints).mockResolvedValueOnce([]);
    vi.mocked(api.createReport).mockResolvedValueOnce({} as any);

    const onSubmitMock = vi.fn();

    render(
      <NewReport
        defaultMunicipality={mockMunicipality}
        onSubmit={onSubmitMock}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />
    );

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText('Yol Cukuru')).toBeInTheDocument();
    });

    // Enter description (at least 20 chars)
    const textarea = screen.getByPlaceholderText(/Sorunu kısaca anlatın/i);
    fireEvent.change(textarea, { target: { value: 'Sokaktaki yol cukuru cok derin ve tehlikeli.' } });

    // Select category
    const categoryBtn = screen.getByText('Yol Cukuru');
    fireEvent.click(categoryBtn);

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Önizle/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Should be on Step 2 Review Screen
    await waitFor(() => {
      expect(screen.getByText('Gönder')).toBeInTheDocument();
    });

    // Check KVKK box
    const kvkkCheckbox = screen.getByRole('checkbox');
    fireEvent.click(kvkkCheckbox);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Gönder/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createReport).toHaveBeenCalled();
      expect(onSubmitMock).toHaveBeenCalled();
    });
  });
});
