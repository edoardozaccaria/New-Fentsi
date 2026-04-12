import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

// Smoke test — verifies the Home dashboard renders without crashing.
describe('Home page', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(document.body).toBeTruthy();
  });

  it('displays the Fentsi brand name', () => {
    render(<Home />);
    expect(screen.getAllByText(/fentsi/i).length).toBeGreaterThan(0);
  });
});
