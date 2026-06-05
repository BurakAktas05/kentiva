import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from './StatCard';
import '@testing-library/jest-dom';

describe('StatCard component', () => {
  it('renders label, value, and icon correctly', () => {
    render(
      <StatCard
        icon={<span data-testid="mock-icon">📊</span>}
        label="TOPLAM RAPOR"
        value={150}
        suffix=" adet"
      />
    );

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('TOPLAM RAPOR')).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/adet/i)).toBeInTheDocument();
  });

  it('renders a loading pulse when value is "-"', () => {
    render(
      <StatCard
        icon={<span>📊</span>}
        label="TOPLAM RAPOR"
        value="-"
      />
    );

    expect(screen.getByText('TOPLAM RAPOR')).toBeInTheDocument();
    // Pulse animation block should be rendered
    const pulseBlock = document.querySelector('.animate-pulse');
    expect(pulseBlock).toBeInTheDocument();
  });
});
