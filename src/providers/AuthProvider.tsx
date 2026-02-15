/**
 * AuthProvider — Context de autenticação centralizado.
 * Elimina listeners duplicados e múltiplos getUser() calls.
 * Gerencia user + profile + supplier em um único lugar.
 */
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { Profile, Supplier } from "@/types/database";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  supplier: Supplier | null;
  loading: boolean;
  isSupplier: boolean;
  isClient: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: "client" | "supplier",
    companyName?: string,
    specialty?: string,
    cnpj?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const fetchIdRef = useRef(0);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const currentFetchId = ++fetchIdRef.current;
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (currentFetchId !== fetchIdRef.current) return;

        if (profileData) {
          setProfile(profileData as Profile);
          if (profileData.role === "supplier") {
            const { data: supplierData } = await supabase
              .from("suppliers")
              .select("*")
              .eq("user_id", userId)
              .single();
            if (currentFetchId !== fetchIdRef.current) return;
            setSupplier(supplierData as Supplier | null);
          } else {
            setSupplier(null);
          }
        }
      } catch {
        // Profile may not exist yet
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
        setSupplier(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    [supabase.auth],
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({ email });
      return { error };
    },
    [supabase.auth],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      role: "client" | "supplier" = "client",
      companyName?: string,
      specialty?: string,
      cnpj?: string,
    ) => {
      const sanitizedCnpj = cnpj ? cnpj.replace(/[^0-9]/g, "") : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            company_name: companyName,
            specialty,
            cnpj: sanitizedCnpj,
          },
        },
      });
      return { error };
    },
    [supabase.auth],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase.auth]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile`,
      });
      return { error };
    },
    [supabase.auth],
  );

  const refetchProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        supplier,
        loading,
        isSupplier: profile?.role === "supplier",
        isClient: profile?.role === "client",
        signIn,
        signInWithMagicLink,
        signUp,
        signOut,
        resetPassword,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acessar autenticação e perfil.
 * Substitui useAuth + useProfile.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
