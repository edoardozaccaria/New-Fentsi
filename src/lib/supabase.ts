// Compatibility shim — new code should import from './supabase/client' or './supabase/server'.
// The singleton below is preserved for existing client components during the Phase 1 migration.
import { createSupabaseBrowserClient } from './supabase/client';

export { createSupabaseBrowserClient } from './supabase/client';

/** @deprecated Use `createSupabaseBrowserClient()` from '@/lib/supabase/client'. */
export const supabase = createSupabaseBrowserClient();
