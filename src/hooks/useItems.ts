/**
 * React Query hooks para Items.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import { getItemsByProject, createItem, updateItem, deleteItem } from "@/services/items";
import type { ItemInsert, ItemUpdate } from "@/types/database";

const supabase = createClient();

export function useItems(projectId: string) {
  return useQuery({
    queryKey: ["items", projectId],
    queryFn: () => getItemsByProject(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useCreateItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: ItemInsert) => createItem(supabase, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", projectId] }),
  });
}

export function useUpdateItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ItemUpdate }) => updateItem(supabase, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", projectId] }),
  });
}

export function useDeleteItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(supabase, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", projectId] }),
  });
}
