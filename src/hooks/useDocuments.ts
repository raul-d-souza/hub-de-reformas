/**
 * React Query hooks para Documents.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import { getDocumentsByProject, deleteDocument } from "@/services/documents";

const supabase = createClient();

export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => getDocumentsByProject(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: { id: string; file_path: string }) => deleteDocument(supabase, doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", projectId] }),
  });
}
