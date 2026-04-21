import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginButtons } from './LoginButtons';

const signInWithOAuth = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

describe('LoginButtons', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
  });

  it('renders the Google sign-in button', () => {
    render(<LoginButtons appleEnabled={false} />);
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('does not render Apple button when feature flag is off', () => {
    render(<LoginButtons appleEnabled={false} />);
    expect(
      screen.queryByRole('button', { name: /apple/i })
    ).not.toBeInTheDocument();
  });

  it('renders Apple button when feature flag is on', () => {
    render(<LoginButtons appleEnabled={true} />);
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument();
  });

  it('calls signInWithOAuth with google when Google button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginButtons appleEnabled={false} />);
    await user.click(screen.getByRole('button', { name: /google/i }));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    });
  });
});
