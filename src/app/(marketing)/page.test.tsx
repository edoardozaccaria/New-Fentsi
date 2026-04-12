import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MarketingPage from './page';

describe('Marketing landing page', () => {
  it('renders without crashing', () => {
    render(<MarketingPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the Fentsi brand name', () => {
    render(<MarketingPage />);
    expect(screen.getAllByText(/fentsi/i).length).toBeGreaterThan(0);
  });

  it('renders the primary CTA link', () => {
    render(<MarketingPage />);
    const ctas = screen.getAllByRole('link', { name: /crea il tuo piano/i });
    expect(ctas.length).toBeGreaterThan(0);
  });
});
