/**
 * Serviço de Quotes — CRUD + comparação de cotações.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Quote, QuoteInsert, QuoteUpdate } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export async function getQuotesByProject(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, suppliers(name, contact_name, phone, email)")
    .eq("project_id", projectId)
    .order("total_price", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getQuoteById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*, suppliers(name, contact_name, phone, email)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createQuote(supabase: Client, quote: QuoteInsert) {
  const { data, error } = await supabase.from("quotes").insert(quote).select().single();

  if (error) throw error;
  return data as Quote;
}

export async function updateQuote(supabase: Client, id: string, updates: QuoteUpdate) {
  const { data, error } = await supabase
    .from("quotes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Quote;
}

/** Marca uma cotação como escolhida e desmarca as demais do mesmo projeto (atômico via RPC) */
export async function chooseQuote(supabase: Client, quoteId: string, projectId: string) {
  // Usa database function para garantir atomicidade
  const { error: rpcError } = await supabase.rpc("choose_quote", {
    p_quote_id: quoteId,
    p_project_id: projectId,
  });

  if (rpcError) throw rpcError;

  // Retornar a cotação atualizada
  const { data, error } = await supabase.from("quotes").select().eq("id", quoteId).single();

  if (error) throw error;
  return data as Quote;
}

export async function deleteQuote(supabase: Client, id: string) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}
