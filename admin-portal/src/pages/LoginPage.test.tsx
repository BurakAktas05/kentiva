import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from './LoginPage';
import api from '../api';
import '@testing-library/jest-dom';

vi.mock('../api', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(() => Promise.resolve({ data: { data: { needsBootstrap: false } } })),
    },
    TOKEN_KEY: 'token',
    REFRESH_KEY: 'refresh_token',
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
});
