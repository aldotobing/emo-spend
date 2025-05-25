import { User } from '@supabase/supabase-js';

declare module '@/hooks/use-user' {
  export function useUser(): {
    user: User | null;
    isLoading: boolean;
  };
}
