/**
 * Serviço de Project Invitations — convites de projetos para fornecedores.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectInvitationInsert,
  ProjectInvitationUpdate,
  ProjectInvitationWithDetails,
  Profile,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Enriquece convites com o profile do convidador (invited_by) */
async function enrichWithInviterProfiles(
  supabase: Client,
  invitations: ProjectInvitationWithDetails[],
): Promise<ProjectInvitationWithDetails[]> {
  const inviterIds = [...new Set(invitations.map((i) => i.invited_by).filter(Boolean))];
  if (inviterIds.length === 0) return invitations;

  const { data: profiles } = await supabase.from("profiles").select("*").in("id", inviterIds);

  const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));
  return invitations.map((inv) => ({
    ...inv,
    inviter: profileMap.get(inv.invited_by) || undefined,
  }));
}

/** Convites enviados pelo cliente para um projeto */
export async function getProjectInvitations(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("project_invitations")
    .select("*, supplier:suppliers(*), project:projects(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return enrichWithInviterProfiles(supabase, data as ProjectInvitationWithDetails[]);
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
  const enriched = await enrichWithInviterProfiles(
    supabase,
    data as ProjectInvitationWithDetails[],
  );
  return { data: enriched, count: count ?? 0, page, pageSize };
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

/** Salvar cômodos selecionados para um convite */
export async function setInvitationRooms(
  supabase: Client,
  invitationId: string,
  roomIds: string[],
) {
  // Remover cômodos anteriores
  await supabase.from("invitation_rooms").delete().eq("invitation_id", invitationId);

  if (roomIds.length === 0) return;

  const rows = roomIds.map((room_id) => ({
    invitation_id: invitationId,
    room_id,
  }));

  const { error } = await supabase.from("invitation_rooms").insert(rows);
  if (error) throw error;
}

/** Buscar cômodos vinculados a um convite */
export async function getInvitationRooms(supabase: Client, invitationId: string) {
  const { data, error } = await supabase
    .from("invitation_rooms")
    .select("room_id")
    .eq("invitation_id", invitationId);

  if (error) throw error;
  return (data || []).map((r: { room_id: string }) => r.room_id);
}
