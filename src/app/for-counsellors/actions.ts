"use server";

import { redirect } from "next/navigation";

import { createSupabaseSSRServerClient } from "@/lib/supabase/server";

export async function signOutCounsellor() {
  const supabase = await createSupabaseSSRServerClient();
  await supabase.auth.signOut();

  redirect("/for-counsellors/sign-in");
}
