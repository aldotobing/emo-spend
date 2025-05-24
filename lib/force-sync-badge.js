// Force sync the 3-day streak badge
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceSyncBadge() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user logged in");
      return;
    }
    
    console.log("User ID:", user.id);
    console.log("Forcing sync of 3-day streak badge...");
    
    // Force add the 3-day streak badge
    const { data, error } = await supabase.from("user_badges").upsert({
      user_id: user.id,
      badge_id: "3-day-streak",
      earned_at: new Date().toISOString()
    }, { onConflict: 'user_id,badge_id' });
    
    if (error) {
      console.error("Error syncing badge:", error);
    } else {
      console.log("Badge synced successfully!");
    }
    
    // Also update the streak
    const { data: streakData, error: streakError } = await supabase
      .from("user_streaks")
      .update({
        current_streak: 5, // Set to your actual streak
        last_activity_date: new Date().toISOString().split('T')[0]
      })
      .eq("user_id", user.id);
    
    if (streakError) {
      console.error("Error updating streak:", streakError);
    } else {
      console.log("Streak updated successfully!");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

forceSyncBadge();
