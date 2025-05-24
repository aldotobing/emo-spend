// Script to fix badges in the database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixBadges() {
  try {
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return;
    }
    
    if (!session || !session.user) {
      console.log("No user logged in. Please log in first.");
      return;
    }
    
    const userId = session.user.id;
    console.log("User ID:", userId);
    
    // 1. Check current streak
    const { data: streakData, error: streakError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (streakError && streakError.code !== "PGRST116") {
      console.error("Error fetching streak data:", streakError);
      return;
    }
    
    const currentStreak = streakData?.current_streak || 5; // Default to 5 if not found
    console.log("Current streak:", currentStreak);
    
    // 2. Force add the 3-day streak badge
    console.log("Adding 3-day streak badge...");
    const { error: badgeError } = await supabase.from("user_badges").upsert({
      user_id: userId,
      badge_id: "3-day-streak",
      earned_at: new Date().toISOString()
    }, { onConflict: 'user_id,badge_id' });
    
    if (badgeError) {
      console.error("Error adding badge:", badgeError);
    } else {
      console.log("3-day streak badge added successfully!");
    }
    
    // 3. Update streak if needed
    if (!streakData || streakData.current_streak < 5) {
      console.log("Updating streak to 5...");
      const { error: updateError } = await supabase.from("user_streaks").upsert({
        user_id: userId,
        current_streak: 5,
        longest_streak: Math.max(streakData?.longest_streak || 0, 5),
        last_activity_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id' });
      
      if (updateError) {
        console.error("Error updating streak:", updateError);
      } else {
        console.log("Streak updated successfully!");
      }
    }
    
    console.log("Badge fix complete! Please refresh your app to see the changes.");
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

fixBadges();
