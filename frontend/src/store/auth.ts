import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  role: "student" | "admin";
  avatar_url?: string;
  level?: string;
  plan?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.login(email, password);
          Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "lax" });
          Cookies.set("refresh_token", data.refresh_token, { expires: 30, sameSite: "lax" });
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Erro ao fazer login";
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { data: res } = await authApi.register(data);
          Cookies.set("access_token", res.access_token, { expires: 1, sameSite: "lax" });
          Cookies.set("refresh_token", res.refresh_token, { expires: 30, sameSite: "lax" });
          set({ user: res.user, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Erro ao criar conta";
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        set({ user: null, isAuthenticated: false });
        window.location.href = "/";
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      clearError: () => set({ error: null }),
    }),
    {
      name: "plataforma-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
