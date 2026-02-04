import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side client with service role for write operations
export function createServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Browser-side client with anon key for read operations
export function createBrowserClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Singleton for server-side usage
let serverClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createServerClient();
  }
  return serverClient;
}
