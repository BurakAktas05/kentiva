import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from './Home';
import * as api from '../../api';
import '@testing-library/jest-dom';

vi.mock('../../api', () => ({
  getMyReports: vi.fn(),
  getMyProfile: vi.fn(),
  getPublicAnnouncements: vi.fn(),
}));

vi.mock('../home/HomeWidgets', () => ({
  WeatherWidgetCard: () => <div data-testid="weather-widget">Weather</div>
}));

vi.mock('../home/AnnouncementCarousel', () => ({
  default: () => <div data-testid="announcement-carousel">Carousel</div>
}));

vi.mock('./Surveys', () => ({
  default: () => <div data-testid="surveys-section">Surveys</div>
}));

describe('Home Screen Component', () => {
  const mockProfile = {
    id: 'user-1',
    firstName: 'Burak',
    lastName: 'Aktas',
  } as any;

  const mockReportsResponse = {
    content: [
      { id: 'rep-1', title: 'Su Patlagi' },
    ],
    totalElements: 1,
    totalPages: 1,
  } as any;

  const mockAnnouncements = [
    { id: 'ann-1', title: 'Yol Calismasi', content: 'Kadikoyde yol calismasi var' },
  ] as any;

  const mockMunicipality = {
    id: 'muni-123',
    displayName: 'Kadikoy Belediyesi',
    onboarded: true,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders guest welcome when profile loading fails', async () => {
    vi.mocked(api.getMyReports).mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0 } as any);
    vi.mocked(api.getMyProfile).mockRejectedValueOnce(new Error('Auth error'));

    render(
      <Home
        onCreateReport={vi.fn()}
        onViewMyReports={vi.fn()}
        onOpenAnnouncement={vi.fn()}
        lang="tr"
        isDark={false}
        homeMunicipality={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Değerli hemşehrimiz')).toBeInTheDocument();
    });
  });

  it('loads and displays user profile and reports preview', async () => {
    vi.mocked(api.getMyReports).mockResolvedValueOnce(mockReportsResponse);
    vi.mocked(api.getMyProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(api.getPublicAnnouncements).mockResolvedValueOnce(mockAnnouncements);

    render(
      <Home
        onCreateReport={vi.fn()}
        onViewMyReports={vi.fn()}
        onOpenAnnouncement={vi.fn()}
        lang="tr"
        isDark={false}
        homeMunicipality={mockMunicipality}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Burak Aktas')).toBeInTheDocument();
      expect(screen.getByText('Su Patlagi')).toBeInTheDocument();
    });
  });

  it('handles clicking view my reports button', async () => {
    vi.mocked(api.getMyReports).mockResolvedValueOnce(mockReportsResponse);
    vi.mocked(api.getMyProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(api.getPublicAnnouncements).mockResolvedValueOnce(mockAnnouncements);

    const onViewReportsMock = vi.fn();

    render(
      <Home
        onCreateReport={vi.fn()}
        onViewMyReports={onViewReportsMock}
        onOpenAnnouncement={vi.fn()}
        lang="tr"
        isDark={false}
        homeMunicipality={mockMunicipality}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Burak Aktas')).toBeInTheDocument();
    });

    const cardButton = screen.getByRole('button', { name: /Son başvurularım/i });
    fireEvent.click(cardButton);

    expect(onViewReportsMock).toHaveBeenCalled();
  });

  it('opens report creation from the primary home call to action', async () => {
    vi.mocked(api.getMyReports).mockResolvedValueOnce(mockReportsResponse);
    vi.mocked(api.getMyProfile).mockResolvedValueOnce(mockProfile);
    vi.mocked(api.getPublicAnnouncements).mockResolvedValueOnce(mockAnnouncements);
    const onCreateReport = vi.fn();

    render(
      <Home
        onCreateReport={onCreateReport}
        onViewMyReports={vi.fn()}
        onOpenAnnouncement={vi.fn()}
        lang="tr"
        isDark={false}
        homeMunicipality={mockMunicipality}
      />,
    );

    const createButton = await screen.findByRole('button', { name: /Yeni ihbar oluştur/i });
    fireEvent.click(createButton);
    expect(onCreateReport).toHaveBeenCalledTimes(1);
  });
});
