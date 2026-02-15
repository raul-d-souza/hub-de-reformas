/**
 * Serviço de Suppliers — CRUD de fornecedores.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Supplier, SupplierInsert, SupplierUpdate } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export async function getSuppliers(supabase: Client) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Supplier[];
}

export async function getSupplierById(supabase: Client, id: string) {
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();

  if (error) throw error;
  return data as Supplier;
}

export async function createSupplier(supabase: Client, supplier: SupplierInsert) {
  const { data, error } = await supabase.from("suppliers").insert(supplier).select().single();

  if (error) throw error;
  return data as Supplier;
}

export async function updateSupplier(supabase: Client, id: string, updates: SupplierUpdate) {
  const { data, error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Supplier;
}

export async function deleteSupplier(supabase: Client, id: string) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}
