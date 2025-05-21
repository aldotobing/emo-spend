import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export async function createUserProfile(user: User) {
  const supabase = getSupabaseBrowserClient()

  // Check if profile already exists
  const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (existingProfile) {
    return existingProfile
  }

  // Create new profile
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      display_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()

  if (error) {
    console.error("Error creating user profile:", error)
    throw error
  }

  return data[0]
}
