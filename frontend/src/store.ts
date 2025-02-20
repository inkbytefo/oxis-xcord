import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string } | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: { username: string } | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  setUser: (user: { username: string } | null) => set({ user }),
}));