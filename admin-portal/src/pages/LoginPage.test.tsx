import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from './LoginPage';
import api, { setStoredAuthTokens } from '../api';
import '@testing-library/jest-dom';

vi.mock('../api', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(() => Promise.resolve({ data: { data: { needsBootstrap: false } } })),
    },
    clearAuthStorage: vi.fn(),
    setStoredAuthTokens: vi.fn(),
  };
});

describe('LoginPage', () => {
  it('renders login form correctly', () => {
    render(
      <Router>
        <LoginPage portal="municipality" onLogin={vi.fn()} />
      </Router>
    );

    expect(screen.getByPlaceholderText('admin@belediye.gov.tr')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByLabelText('E-posta')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Şifre')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /Çalışma alanına gir/i })).toBeInTheDocument();
  });

  it('shows error on failed login credentials', async () => {
    // Mock the post request failure
    const axiosError = {
      response: { data: { message: 'Geçersiz e-posta veya şifre' } },
    };
    Object.defineProperty(axiosError, 'isAxiosError', { value: true, writable: false });
    
    vi.mocked(api.post).mockRejectedValueOnce(axiosError);

    render(
      <Router>
        <LoginPage portal="municipality" onLogin={vi.fn()} />
      </Router>
    );

    const emailInput = screen.getByPlaceholderText('admin@belediye.gov.tr');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Çalışma alanına gir/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@belediye.gov.tr' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Geçersiz e-posta veya şifre')).toBeInTheDocument();
    });
  });

  it('stores server-issued tokens and completes an allowed municipality login', async () => {
    const onLogin = vi.fn();
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          email: 'admin@belediye.gov.tr',
          fullName: 'Belediye Yöneticisi',
          roles: ['ROLE_ADMIN'],
          municipality: {
            id: 'muni-1',
            name: 'Test Belediyesi',
            slug: 'test',
            centerLat: 40,
            centerLng: 30,
            defaultZoom: 12,
          },
        },
      },
    });

    render(
      <Router>
        <LoginPage portal="municipality" onLogin={onLogin} />
      </Router>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@belediye.gov.tr'), {
      target: { value: 'admin@belediye.gov.tr' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'valid-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Çalışma alanına gir/i }));

    await waitFor(() => {
      expect(setStoredAuthTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(onLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@belediye.gov.tr',
          roles: ['ROLE_ADMIN'],
        }),
      );
    });
  });
});
