import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import BottomNavigation from './BottomNavigation';

describe('BottomNavigation', () => {
  it('renders Ana, Bildir, İhbarlarım and Belediye', () => {
    render(
      <BottomNavigation activeTab="home" lang="tr" isDark={false} onNavigate={vi.fn()} />,
    );

    const navigation = screen.getByRole('navigation', { name: 'Ana menü' });
    expect(navigation).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Bildir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'İhbarlarım' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Belediye' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Profilim' })).not.toBeInTheDocument();
  });

  it('navigates to belediye hub (kent)', () => {
    const onNavigate = vi.fn();
    render(
      <BottomNavigation activeTab="home" lang="tr" isDark onNavigate={onNavigate} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Belediye' }));
    expect(onNavigate).toHaveBeenCalledWith('kent');
  });
});
