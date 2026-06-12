import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportsPage from './ReportsPage';
import api from '../api';
import '@testing-library/jest-dom';

vi.mock('../api', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

vi.mock('../context/ReportLiveContext', () => ({
  useReportLive: () => ({
    newCount: 0,
    latestReport: null,
    wsConnected: true,
    clearNewCount: vi.fn(),
  }),
}));

describe('ReportsPage', () => {
  const mockReports = {
    content: [
      {
        id: 'report-1',
        title: 'Cukur Problem',
        categoryName: 'Yol Cukuru',
        district: 'Kadikoy',
        status: 'PENDING',
        createdAt: '2026-06-12T10:00:00Z',
      },
      {
        id: 'report-2',
        title: 'Sokak Lambasi Bozuk',
        categoryName: 'Aydinlatma',
        district: 'Kadikoy',
        status: 'PROCESSING',
        createdAt: '2026-06-12T11:00:00Z',
      },
    ],
    totalPages: 1,
    totalElements: 2,
    number: 0,
    size: 15,
  };

  const mockUserMe = {
    id: 'user-admin',
    roles: ['ROLE_ADMIN'],
    departmentId: 'dept-1',
  };

  const mockOfficers = {
    content: [
      { id: 'officer-1', firstName: 'Ahmet', lastName: 'Yilmaz', role: 'ROLE_FIELD_OFFICER' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupGetMock = () => {
    vi.mocked(api.get).mockImplementation((url) => {
      console.log('api.get called with:', url);
      if (url === '/reports') return Promise.resolve({ data: { data: mockReports } });
      if (url === '/auth/me') return Promise.resolve({ data: { data: mockUserMe } });
      if (url.startsWith('/users')) return Promise.resolve({ data: { data: mockOfficers } });
      return Promise.reject(new Error('Unknown url: ' + url));
    });
  };

  it('renders reports list and metric cards', async () => {
    setupGetMock();

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    // Wait for reports to load
    await waitFor(() => {
      expect(screen.getByText('Cukur Problem')).toBeInTheDocument();
      expect(screen.getByText('Sokak Lambasi Bozuk')).toBeInTheDocument();
    });

    // Check metric card
    expect(screen.getByText('Gorunen kayit')).toBeInTheDocument();
  });

  it('filters reports when typing in search input', async () => {
    setupGetMock();

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cukur Problem')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Başlık, kategori, ilçe…');
    fireEvent.change(searchInput, { target: { value: 'Sokak' } });

    // Should filter locally
    expect(screen.queryByText('Cukur Problem')).not.toBeInTheDocument();
    expect(screen.getByText('Sokak Lambasi Bozuk')).toBeInTheDocument();
  });

  it('performs bulk assignment operation', async () => {
    setupGetMock();

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: { successCount: 1, failureCount: 0, failures: [] } },
    });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cukur Problem')).toBeInTheDocument();
    });

    // Select the first report checkbox
    const checkbox = screen.getByLabelText('Cukur Problem seç');
    fireEvent.click(checkbox);

    // Click bulk assignment button
    const assignBtn = screen.getByRole('button', { name: /Ata/i });
    fireEvent.click(assignBtn);

    // Modal appears, select officer
    expect(screen.getByText('Toplu atama')).toBeInTheDocument();
    const select = screen.getAllByRole('combobox')[1];
    fireEvent.change(select, { target: { value: 'officer-1' } });

    // Click confirm inside modal
    const confirmBtn = screen.getByRole('button', { name: /Onayla/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reports/batch/assign', {
        reportIds: ['report-1'],
        assigneeId: 'officer-1',
      });
    });
  });
});
