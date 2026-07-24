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
  fetchNearbyReports: vi.fn(),
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
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('detects GPS location and loads categories on mount', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    vi.mocked(api.fetchNearbyReports).mockResolvedValueOnce([]);

    render(
      <NewReport
        defaultMunicipality={mockMunicipality}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />
    );

    // Wait for step 0 map view and resolved region
    await waitFor(() => {
      expect(screen.getByText('Kadikoy Belediyesi')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    // Verify fetchNearbyReports call with proper coordinates from device geolocation
    expect(api.fetchNearbyReports).toHaveBeenCalledWith(41.0082, 28.9784, 1000);

    // Click "İhbar Oluştur" to go to step 1
    const createBtn = screen.getByRole('button', { name: /İhbar Oluştur/i });
    expect(createBtn).not.toBeDisabled();
    fireEvent.click(createBtn);

    // Wait for step 1 categories to load
    await waitFor(() => {
      expect(screen.getByText('Yol Cukuru')).toBeInTheDocument();
      expect(screen.getByText('Sokak Lambasi')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('progresses to step 2 review screen and submits successfully', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    vi.mocked(api.fetchNearbyReports).mockResolvedValueOnce([]);
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

    // Wait for step 0
    await waitFor(() => {
      expect(screen.getByText('Kadikoy Belediyesi')).toBeInTheDocument();
    });

    // Click "İhbar Oluştur" to go to step 1
    const createBtn = screen.getByRole('button', { name: /İhbar Oluştur/i });
    fireEvent.click(createBtn);

    // Wait for load of step 1
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
    expect(screen.getByText('Göndermeden önce son kontrol')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');

    // Check KVKK box
    const kvkkCheckbox = screen.getByRole('checkbox');
    expect(screen.getByRole('button', { name: /Gönder/i })).toBeDisabled();
    fireEvent.click(kvkkCheckbox);

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Gönder/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createReport).toHaveBeenCalled();
      expect(onSubmitMock).toHaveBeenCalled();
    });
  });

  it('shows a recoverable location-permission error instead of an incorrect municipality warning', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    const deniedGeolocation = {
      getCurrentPosition: vi.fn((_success, failure) => {
        failure({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 });
      }),
    };
    Object.defineProperty(global.navigator, 'geolocation', {
      value: deniedGeolocation,
      writable: true,
      configurable: true,
    });

    render(
      <NewReport
        defaultMunicipality={mockMunicipality}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />,
    );

    expect(await screen.findByText('Konum Alınamadı')).toBeInTheDocument();
    expect(screen.queryByText('Belediye Kayıtlı Değil')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konumu yeniden dene' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Haritadan manuel belirle' })).toBeInTheDocument();
  });

  it('keeps a municipality lookup failure recoverable on the location step', async () => {
    vi.mocked(api.resolveMunicipalityByGps).mockRejectedValueOnce(new Error('Lookup unavailable'));

    render(
      <NewReport
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />,
    );

    expect(await screen.findByText('Bölge doğrulanamadı')).toBeInTheDocument();
    expect(screen.getByText('Konum çözümlenirken hata oluştu.')).toBeInTheDocument();
    expect(screen.queryByText('Belediye Kayıtlı Değil')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Konumu yeniden dene' })).toBeInTheDocument();
  });

  it('announces submission errors and keeps the review available for retry', async () => {
    vi.mocked(api.getCategories).mockResolvedValueOnce(mockCategories);
    vi.mocked(api.getReportTemplates).mockResolvedValueOnce([]);
    vi.mocked(api.fetchNearbyReports).mockResolvedValueOnce([]);
    vi.mocked(api.fetchNearbyReportHints).mockResolvedValueOnce([]);
    vi.mocked(api.createReport).mockRejectedValueOnce(new Error('Belediye servisine ulaşılamadı.'));
    const onSubmit = vi.fn();

    render(
      <NewReport
        defaultMunicipality={mockMunicipality}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        lang="tr"
        isDark={false}
      />,
    );

    await screen.findByText('Kadikoy Belediyesi');
    fireEvent.click(screen.getByRole('button', { name: /İhbar Oluştur/i }));
    await screen.findByText('Yol Cukuru');
    fireEvent.change(screen.getByPlaceholderText(/Sorunu kısaca anlatın/i), {
      target: { value: 'Sokaktaki yol çukuru çok derin ve tehlikeli.' },
    });
    fireEvent.click(screen.getByText('Yol Cukuru'));
    fireEvent.click(screen.getByRole('button', { name: /Önizle/i }));
    await screen.findByText('Göndermeden önce son kontrol');
    fireEvent.click(screen.getByRole('checkbox'));
    const submitButton = screen.getByRole('button', { name: /Gönder/i });
    fireEvent.click(submitButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Belediye servisine ulaşılamadı.');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(submitButton).not.toBeDisabled();
  });
});
