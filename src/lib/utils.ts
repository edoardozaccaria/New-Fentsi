// General-purpose utility functions.
// Keep functions pure and side-effect free.

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
