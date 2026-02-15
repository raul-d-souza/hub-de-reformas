/**
 * React Query hooks para Suppliers.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/services/suppliers";
import type { SupplierInsert, SupplierUpdate } from "@/types/database";

const supabase = createClient();

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => getSuppliers(supabase),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: () => getSupplierById(supabase, id),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (supplier: SupplierInsert) => createSupplier(supabase, supplier),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierUpdate }) =>
      updateSupplier(supabase, id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["supplier", vars.id] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(supabase, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}
