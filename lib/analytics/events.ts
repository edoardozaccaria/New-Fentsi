export function trackEvent({
  name,
  payload,
}: {
  name: string;
  payload?: Record<string, unknown>;
}) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, payload);
  }
  // Add analytics integrations here (e.g., PostHog, Mixpanel, Segment)
}
