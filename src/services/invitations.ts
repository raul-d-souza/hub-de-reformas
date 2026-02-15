/**
 * Serviço de Project Invitations — convites de projetos para fornecedores.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectInvitationInsert,
  ProjectInvitationUpdate,
  ProjectInvitationWithDetails,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Convites enviados pelo cliente para um projeto */
export async function getProjectInvitations(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("project_invitations")
    .select("*, supplier:suppliers(*), project:projects(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ProjectInvitationWithDetails[];
}

/** Convites recebidos pelo fornecedor (todas as suas propostas) */
export async function getSupplierInvitations(
  supabase: Client,
  supplierId: string,
  options?: { page?: number; pageSize?: number; status?: string },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("project_invitations")
    .select("*, supplier:suppliers(*), project:projects(*)", { count: "exact" })
    .eq("supplier_id", supplierId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as ProjectInvitationWithDetails[], count: count ?? 0, page, pageSize };
}

/** Cliente envia convite a fornecedor */
export async function createInvitation(supabase: Client, invitation: ProjectInvitationInsert) {
  const { data, error } = await supabase
    .from("project_invitations")
    .insert(invitation)
    .select("*, supplier:suppliers(*), project:projects(*)")
    .single();

  if (error) throw error;
  return data as ProjectInvitationWithDetails;
}

/** Fornecedor aceita ou rejeita convite */
export async function respondToInvitation(
  supabase: Client,
  id: string,
  updates: ProjectInvitationUpdate,
) {
  const { data, error } = await supabase
    .from("project_invitations")
    .update({ ...updates, responded_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, supplier:suppliers(*), project:projects(*)")
    .single();

  if (error) throw error;
  return data as ProjectInvitationWithDetails;
}

export async function deleteInvitation(supabase: Client, id: string) {
  const { error } = await supabase.from("project_invitations").delete().eq("id", id);
  if (error) throw error;
}
