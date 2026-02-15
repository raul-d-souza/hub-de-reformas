/**
 * Serviço de Projects — CRUD completo usando Supabase.
 * Pode ser chamado tanto de Server Components quanto de Client Components.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectInsert, ProjectUpdate } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

const PAGE_SIZE = 10;

export async function getProjects(supabase: Client, page = 1, status?: string) {
  let query = supabase
    .from("projects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as Project[], count: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function getProjectById(supabase: Client, id: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();

  if (error) throw error;
  return data as Project;
}

export async function createProject(supabase: Client, project: ProjectInsert) {
  const { data, error } = await supabase.from("projects").insert(project).select().single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(supabase: Client, id: string, updates: ProjectUpdate) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function deleteProject(supabase: Client, id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
