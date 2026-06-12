import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportDetailPage from './ReportDetailPage';
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

describe('ReportDetailPage', () => {
  const mockReport = {
    id: 'report-123',
    title: 'Kirik Bank',
    description: 'Parktaki oturma banki kirilmis.',
    status: 'PENDING',
    categoryName: 'Park ve Yesil Alan',
    reporterFullName: 'Veli Can',
    assigneeFullName: null,
    createdAt: '2026-06-12T10:00:00Z',
    latitude: 41.0082,
    longitude: 28.9784,
    mediaUrls: [],
  };

  const mockProcessingReport = {
    ...mockReport,
    status: 'PROCESSING',
    assigneeFullName: 'Ahmet Yilmaz',
  };

  const mockUserMe = {
    id: 'user-admin',
    roles: ['ROLE_ADMIN', 'ROLE_WHITE_DESK'],
    departmentId: 'dept-1',
  };

  const mockTimeline = [
    {
      at: '2026-06-12T10:00:00Z',
      oldStatus: 'PENDING',
      newStatus: 'PENDING',
      actorName: 'Sistem',
      note: 'Rapor olusturuldu.',
    },
  ];

  const mockOfficers = {
    content: [
      { id: 'officer-1', firstName: 'Ahmet', lastName: 'Yilmaz', role: 'ROLE_FIELD_OFFICER' },
    ],
  };

  const mockDepartments = {
    content: [
      { id: 'dept-1', name: 'Fen Isleri' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = (report = mockReport) => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === `/reports/${report.id}`) return Promise.resolve({ data: { data: report } });
      if (url === `/reports/${report.id}/timeline`) return Promise.resolve({ data: { data: mockTimeline } });
      if (url === `/reports/${report.id}/duplicate-group`) return Promise.resolve({ data: { data: [] } });
      if (url === '/auth/me') return Promise.resolve({ data: { data: mockUserMe } });
      if (url.startsWith('/users')) return Promise.resolve({ data: { data: mockOfficers } });
      if (url === '/departments') return Promise.resolve({ data: { data: mockDepartments } });
      return Promise.reject(new Error('Unknown url: ' + url));
    });
  };

  it('renders report details and timeline info', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <ReportDetailPage reportId="report-123" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kirik Bank')).toBeInTheDocument();
      expect(screen.getByText('Parktaki oturma banki kirilmis.')).toBeInTheDocument();
      expect(screen.getByText('Rapor olusturuldu.')).toBeInTheDocument();
    });
  });

  it('allows assigning a field officer via accept flow', async () => {
    setupMocks();
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
    vi.mocked(api.patch).mockResolvedValue({ data: { data: mockProcessingReport } });

    render(
      <MemoryRouter>
        <ReportDetailPage reportId="report-123" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kirik Bank')).toBeInTheDocument();
    });

    // Click "Kabul Et" to enter accept flow
    const acceptBtn = screen.getByRole('button', { name: /Kabul Et/i });
    fireEvent.click(acceptBtn);

    // Now we should see the officer select
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'officer-1' } });

    // Click "Kabul Et — İşleme Al" to save
    const saveBtn = screen.getByRole('button', { name: /Kabul Et — İşleme Al/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reports/report-123/assign', {
        assigneeId: 'officer-1',
      });
    });
  });

  it('allows status and note update via resolve flow', async () => {
    setupMocks(mockProcessingReport);
    vi.mocked(api.patch).mockResolvedValue({ data: { data: { ...mockProcessingReport, status: 'RESOLVED' } } });

    render(
      <MemoryRouter>
        <ReportDetailPage reportId="report-123" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kirik Bank')).toBeInTheDocument();
    });

    // The note field and resolve button should be directly visible
    const noteTextarea = screen.getByLabelText('Çözüm Notu');
    fireEvent.change(noteTextarea, { target: { value: 'Çözüldü.' } });

    const resolveBtn = screen.getByRole('button', { name: 'Çözüldü Yap' });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/reports/report-123/status', {
        status: 'RESOLVED',
        note: 'Çözüldü.',
        resolvedMediaUrls: null,
      });
    });
  });
});
