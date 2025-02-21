import { create } from 'zustand';
import { createContext, useContext } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string } | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setUser: (user: { username: string } | null) => void;
}

const createAuthStore = () =>
  create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
    setUser: (user: { username: string } | null) => set({ user }),
  }));

export type AuthStore = ReturnType<typeof createAuthStore>;

export const AuthStoreContext = createContext<AuthStore | null>(null);

export const useAuthStore = () => {
  const store = useContext(AuthStoreContext);
  if (!store) throw new Error('Missing AuthStoreContext.Provider in the tree');
  return store;
};

export const initializeStore = createAuthStore;