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
    expect(screen.getByText('Görünen kayıt')).toBeInTheDocument();
  });

  it('applies saved view chip status filter', async () => {
    setupGetMock();

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cukur Problem')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Bekleyen' }));

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        '/reports',
        expect.objectContaining({
          params: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  it('sends search query to the API after debounce', async () => {
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

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/reports',
        expect.objectContaining({
          params: expect.objectContaining({ q: 'Sokak' }),
        }),
      );
    });
  });

  it('performs bulk process operation', async () => {
    setupGetMock();

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { data: { successCount: 1, failureCount: 0, failures: [] } },
    });
    vi.mocked(api.patch).mockResolvedValueOnce({
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

    const checkbox = screen.getByLabelText('Cukur Problem seç');
    fireEvent.click(checkbox);

    const processBtn = screen.getByRole('button', { name: 'İşle' });
    fireEvent.click(processBtn);

    expect(screen.getByText('Toplu işlem')).toBeInTheDocument();
    const assigneeSelect = screen.getByLabelText(/Saha görevlisi/i);
    fireEvent.change(assigneeSelect, { target: { value: 'officer-1' } });

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
