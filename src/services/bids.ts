/**
 * Serviço de Project Bids — lances e negociações.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectBidInsert, ProjectBidUpdate, ProjectBidWithDetails } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Busca todos os lances de um projeto */
export async function getProjectBids(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("project_bids")
    .select("*, supplier:suppliers(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ProjectBidWithDetails[];
}

/** Busca lances de um fornecedor específico */
export async function getSupplierBids(
  supabase: Client,
  supplierId: string,
  options?: { page?: number; pageSize?: number; status?: string },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("project_bids")
    .select("*, supplier:suppliers(*)", { count: "exact" })
    .eq("supplier_id", supplierId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as ProjectBidWithDetails[], count: count ?? 0, page, pageSize };
}

/** Busca thread de negociação (lance + contra-propostas) */
export async function getBidThread(supabase: Client, bidId: string) {
  // Busca o lance original e todas as contra-propostas
  const { data, error } = await supabase
    .from("project_bids")
    .select("*, supplier:suppliers(*)")
    .or(`id.eq.${bidId},parent_bid_id.eq.${bidId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ProjectBidWithDetails[];
}

/** Fornecedor cria um lance */
export async function createBid(supabase: Client, bid: ProjectBidInsert) {
  const { data, error } = await supabase
    .from("project_bids")
    .insert(bid)
    .select("*, supplier:suppliers(*)")
    .single();

  if (error) throw error;
  return data as ProjectBidWithDetails;
}

/** Atualiza status do lance (aceitar, rejeitar) ou cria contra-proposta */
export async function updateBid(supabase: Client, id: string, updates: ProjectBidUpdate) {
  const { data, error } = await supabase
    .from("project_bids")
    .update(updates)
    .eq("id", id)
    .select("*, supplier:suppliers(*)")
    .single();

  if (error) throw error;
  return data as ProjectBidWithDetails;
}

export async function deleteBid(supabase: Client, id: string) {
  const { error } = await supabase.from("project_bids").delete().eq("id", id);
  if (error) throw error;
}
