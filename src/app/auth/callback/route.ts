/**
 * Callback do Supabase Auth — troca o code por sessão.
 * Rota: /auth/callback
 */
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Se falhar, redireciona para login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
