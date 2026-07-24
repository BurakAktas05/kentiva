import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import BottomNavigation from './BottomNavigation';

describe('BottomNavigation', () => {
  it('renders four balanced primary destinations without a report action', () => {
    render(
      <BottomNavigation activeTab="home" lang="tr" isDark={false} onNavigate={vi.fn()} />,
    );

    const navigation = screen.getByRole('navigation', { name: 'Ana menü' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /ihbar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana sayfa' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates to the selected destination', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNavigation activeTab="home" lang="tr" isDark onNavigate={onNavigate} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Profilim' }));
    expect(onNavigate).toHaveBeenCalledWith('profile');
  });
});
