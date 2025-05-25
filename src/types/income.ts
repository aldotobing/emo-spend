export interface Income {
  id: string;
  amount: number;
  date: string;
  description?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  synced: boolean;
  syncError?: string;
  syncStatus?: 'pending' | 'synced' | 'error';
}
