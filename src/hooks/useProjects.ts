/**
 * React Query hooks para Projects.
 * Substitui chamadas manuais de useState + useEffect por cache automático.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "@/services/projects";
import type { ProjectInsert, ProjectUpdate } from "@/types/database";

const supabase = createClient();

export function useProjects(page = 1, status?: string) {
  return useQuery({
    queryKey: ["projects", page, status],
    queryFn: () => getProjects(supabase, page, status),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectById(supabase, id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (project: ProjectInsert) => createProject(supabase, project),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectUpdate }) =>
      updateProject(supabase, id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", vars.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(supabase, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
