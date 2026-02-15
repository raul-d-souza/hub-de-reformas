/**
 * Hook de perfil — re-exporta do AuthProvider centralizado.
 * @deprecated Importe useAuth de @/providers/AuthProvider
 */
"use client";

import { useAuth } from "@/providers/AuthProvider";

export function useProfile() {
  const auth = useAuth();
  return {
    user: auth.user,
    profile: auth.profile,
    supplier: auth.supplier,
    loading: auth.loading,
    isSupplier: auth.isSupplier,
    isClient: auth.isClient,
    refetch: auth.refetchProfile,
  };
}
