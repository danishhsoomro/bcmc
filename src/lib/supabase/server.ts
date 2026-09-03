import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "../../../supabase/database.types";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createServerSupabaseClient() {
  return createClient<Database>(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || getRequiredEnv("SUPABASE_URL");
}

function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    getRequiredEnv("SUPABASE_PUBLISHABLE_KEY")
  );
}

export async function createSupabaseSSRServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; src/proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
