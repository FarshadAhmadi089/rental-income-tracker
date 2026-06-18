export type UserRole = 'admin' | 'rent_collector' | 'spectator';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  last_seen?: string | null; // ISO datetime string or null
}
