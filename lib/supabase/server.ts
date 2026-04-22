import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cannot set cookies in Server Components — only in Route Handlers/Middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Cannot remove cookies in Server Components
          }
        },
      },
    },
  );
}

/** Server Components and Route Handlers — cookie-based SSR client. */
export function createServerSupabase() {
  return createClient();
}

/** Alias for use inside API Route Handlers (same cookie mechanism). */
export function createRouteSupabase() {
  return createClient();
}
