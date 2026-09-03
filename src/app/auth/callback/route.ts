import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseSSRServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/for-counsellors/sign-in?error=auth", requestUrl.origin),
    );
  }

  const supabase = await createSupabaseSSRServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/for-counsellors/sign-in?error=auth", requestUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL("/for-counsellors/profile", requestUrl.origin),
  );
}
