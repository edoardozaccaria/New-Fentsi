import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DealsCard } from '../DealsCard';
import type { LinkOption } from '@/types/deals.types';

const BOOKING_LINKS: LinkOption[] = [
  {
    label: 'Value accommodation in Austin',
    url: 'https://booking.com/a',
    source: 'booking',
  },
  {
    label: 'Best match in Austin',
    url: 'https://booking.com/b',
    source: 'booking',
  },
  {
    label: 'Premium in Austin',
    url: 'https://booking.com/c',
    source: 'booking',
  },
];

const GOOGLE_LINKS: LinkOption[] = [
  {
    label: 'Catering services near Austin',
    url: 'https://maps.google.com/1',
    source: 'google_maps',
  },
  {
    label: 'Private chef near Austin',
    url: 'https://maps.google.com/2',
    source: 'google_maps',
  },
  {
    label: 'Food trucks near Austin',
    url: 'https://maps.google.com/3',
    source: 'google_maps',
  },
];

describe('DealsCard', () => {
  it('renders title and all link labels', () => {
    render(<DealsCard title="Find Accommodation" deals={BOOKING_LINKS} />);
    expect(screen.getByText('Find Accommodation')).toBeInTheDocument();
    expect(
      screen.getByText('Value accommodation in Austin')
    ).toBeInTheDocument();
    expect(screen.getByText('Best match in Austin')).toBeInTheDocument();
    expect(screen.getByText('Premium in Austin')).toBeInTheDocument();
  });

  it('shows affiliate disclosure for booking links', () => {
    render(<DealsCard title="Accommodation" deals={BOOKING_LINKS} />);
    expect(screen.getByText(/affiliate link/i)).toBeInTheDocument();
  });

  it('does not show affiliate disclosure for google_maps links', () => {
    render(<DealsCard title="Catering" deals={GOOGLE_LINKS} />);
    expect(screen.queryByText(/affiliate link/i)).not.toBeInTheDocument();
  });

  it('renders links with target="_blank"', () => {
    render(<DealsCard title="Catering" deals={GOOGLE_LINKS} />);
    const links = screen.getAllByRole('link');
    links.forEach((l) => expect(l).toHaveAttribute('target', '_blank'));
  });

  it('renders nothing when deals array is empty', () => {
    const { container } = render(
      <DealsCard title="Accommodation" deals={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});
