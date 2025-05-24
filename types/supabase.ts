export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          icon: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          icon: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          amount: number
          category_id: string
          mood_id: string
          mood_reason: string | null
          date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          category_id: string
          mood_id: string
          mood_reason?: string | null
          date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          category_id?: string
          mood_id?: string
          mood_reason?: string | null
          date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      moods: {
        Row: {
          id: string
          label: string
          emoji: string
          color: string
          created_at: string
        }
        Insert: {
          id: string
          label: string
          emoji: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          emoji?: string
          color?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    } // Add these to your Database interface in types/supabase.ts
    badges: {
      Row: {
        id: string
        name: string
        icon: string
        description: string
        created_at: string
      }
      Insert: {
        id: string
        name: string
        icon: string
        description: string
        created_at?: string
      }
      Update: {
        id?: string
        name?: string
        icon?: string
        description?: string
        created_at?: string
      }
    }
    user_badges: {
      Row: {
        id: string
        user_id: string
        badge_id: string
        earned_at: string
      }
      Insert: {
        id?: string
        user_id: string
        badge_id: string
        earned_at?: string
      }
      Update: {
        id?: string
        user_id?: string
        badge_id?: string
        earned_at?: string
      }
    }
    user_streaks: {
      Row: {
        id: string
        user_id: string
        current_streak: number
        longest_streak: number
        last_activity_date: string
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        user_id: string
        current_streak?: number
        longest_streak?: number
        last_activity_date?: string
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        user_id?: string
        current_streak?: number
        longest_streak?: number
        last_activity_date?: string
        created_at?: string
        updated_at?: string
      }
    }
    
  }
}
