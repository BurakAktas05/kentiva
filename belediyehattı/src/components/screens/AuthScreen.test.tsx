import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthScreen from './AuthScreen';
import * as api from '../../api';
import '@testing-library/jest-dom';

vi.mock('../../api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  sendRegistrationOtp: vi.fn(),
  apiBase: vi.fn(() => 'http://localhost:8080'),
}));

describe('AuthScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default and submits credentials', async () => {
    const onAuthMock = vi.fn();
    const mockUser = { id: 'user-1', email: 'test@kentiva.com', firstName: 'John', lastName: 'Doe' } as any;
    vi.mocked(api.login).mockResolvedValueOnce(mockUser);

    render(<AuthScreen onAuth={onAuthMock} lang="tr" />);

    // Check defaults
    expect(screen.getByPlaceholderText('E-posta adresi')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Şifre (en az 8 karakter)')).toBeInTheDocument();

    // Fill credentials
    fireEvent.change(screen.getByPlaceholderText('E-posta adresi'), { target: { value: 'test@kentiva.com' } });
    fireEvent.change(screen.getByPlaceholderText('Şifre (en az 8 karakter)'), { target: { value: 'password123' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Giriş yap/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@kentiva.com', 'password123');
      expect(onAuthMock).toHaveBeenCalledWith(mockUser);
    });
  });

  it('continues as a guest without submitting the login form', () => {
    const onAuthMock = vi.fn();
    const onContinueAsGuest = vi.fn();

    render(
      <AuthScreen
        onAuth={onAuthMock}
        onContinueAsGuest={onContinueAsGuest}
        lang="tr"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Misafir olarak keşfet/i }));

    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
    expect(api.login).not.toHaveBeenCalled();
    expect(onAuthMock).not.toHaveBeenCalled();
  });

  it('allows switching to register form and submits successfully', async () => {
    const onAuthMock = vi.fn();
    const mockUser = { id: 'user-1', email: 'test@kentiva.com', firstName: 'John', lastName: 'Doe' } as any;
    vi.mocked(api.register).mockResolvedValueOnce(mockUser);
    vi.mocked(api.sendRegistrationOtp).mockResolvedValueOnce({ devOtpCode: '000000' });

    render(<AuthScreen onAuth={onAuthMock} lang="tr" />);

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /Kayıt Ol/i });
    fireEvent.click(registerTab);

    // Register fields should be visible
    expect(screen.getByPlaceholderText('Ad')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Soyad')).toBeInTheDocument();
    
    // Fill fields for Step 1
    fireEvent.change(screen.getByPlaceholderText('Ad'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Soyad'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Telefon numarası'), { target: { value: '05551234567' } });
    fireEvent.change(screen.getByPlaceholderText('E-posta adresi'), { target: { value: 'test@kentiva.com' } });
    fireEvent.change(screen.getByPlaceholderText('Şifre (en az 8 karakter)'), { target: { value: 'password123' } });

    // Check KVKK box
    const kvkkCheckbox = screen.getByRole('checkbox');
    fireEvent.click(kvkkCheckbox);

    // Click "Kayıt Ol"
    const submitBtnStep1 = screen.getByRole('button', { name: /Kayıt Ol/i });
    fireEvent.click(submitBtnStep1);

    // Verify OTP was requested
    await waitFor(() => {
      expect(api.sendRegistrationOtp).toHaveBeenCalledWith('05551234567');
    });

    // Check that OTP code input is now visible
    expect(screen.getByPlaceholderText('SMS doğrulama kodu')).toBeInTheDocument();

    // Fill OTP code
    fireEvent.change(screen.getByPlaceholderText('SMS doğrulama kodu'), { target: { value: '000000' } });

    // Submit registration (Step 2)
    const submitBtnStep2 = screen.getByRole('button', { name: /Kayıt Ol/i });
    fireEvent.click(submitBtnStep2);

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith(
        'John',
        'Doe',
        'test@kentiva.com',
        'password123',
        '05551234567',
        '000000',
        true,
      );
      expect(onAuthMock).toHaveBeenCalledWith(mockUser, { isNewUser: true });
    });
  });
});
