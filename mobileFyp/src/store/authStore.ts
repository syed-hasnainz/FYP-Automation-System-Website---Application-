import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import { clearAuthSession, getStoredUser } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  hydrateUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  hydrateUser: async () => {
    const user = await getStoredUser<AuthUser>();
    set({ user });
    return user;
  },
  logout: async () => {
    await clearAuthSession();
    set({ user: null });
  },
}));
