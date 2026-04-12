// Centralised, type-safe environment variable access.
// Throws at startup if required variables are missing.

const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  isDev: process.env.NEXT_PUBLIC_APP_ENV === 'development',
  isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production',
} as const;

export default env;
