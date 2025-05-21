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
    }
  }
}
