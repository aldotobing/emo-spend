import { createServerClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createServerClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Create or update user profile
      try {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.session.user.id,
            email: data.session.user.email || "",
            display_name: data.session.user.user_metadata?.full_name || null,
            avatar_url: data.session.user.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
            ignoreDuplicates: false,
          },
        )

        if (profileError) {
          console.error("Error updating profile:", profileError)
        }
      } catch (profileError) {
        console.error("Error in profile creation:", profileError)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
