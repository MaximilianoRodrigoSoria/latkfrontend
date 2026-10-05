import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { decodeSession, type SessionUser } from './jwt';

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  signIn: (token: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: (token) => set({ token, user: decodeSession(token) }),
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: 'latk-session',
      storage: createJSONStorage(() => localStorage),
      // Al rehidratar se descarta una sesion vencida.
      onRehydrateStorage: () => (state) => {
        if (state?.user && state.user.expiresAt <= Date.now()) state.signOut();
      },
    },
  ),
);

export const getToken = () => {
  const { token, user } = useAuthStore.getState();
  return token && user && user.expiresAt > Date.now() ? token : null;
};
