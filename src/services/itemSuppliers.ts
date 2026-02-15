/**
 * Serviço de Item Suppliers — CRUD para associação item ↔ fornecedor.
 * Permite vincular fornecedores a itens da obra com preço unitário.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ItemSupplier,
  ItemSupplierInsert,
  ItemSupplierUpdate,
  ItemSupplierWithDetails,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/**
 * Busca todos os fornecedores vinculados a um item, com dados do fornecedor.
 */
export async function getSuppliersByItem(
  supabase: Client,
  itemId: string,
): Promise<ItemSupplierWithDetails[]> {
  const { data, error } = await supabase
    .from("item_suppliers")
    .select("*, supplier:suppliers(*)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ItemSupplierWithDetails[];
}

/**
 * Busca todos os fornecedores vinculados a itens de um projeto (batch).
 * Retorna um mapa { item_id: ItemSupplierWithDetails[] }.
 */
export async function getSuppliersByProject(
  supabase: Client,
  projectId: string,
): Promise<Record<string, ItemSupplierWithDetails[]>> {
  const { data, error } = await supabase
    .from("item_suppliers")
    .select("*, supplier:suppliers(*), item:items!inner(project_id)")
    .eq("item.project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const result: Record<string, ItemSupplierWithDetails[]> = {};
  for (const row of (data ?? []) as (ItemSupplierWithDetails & {
    item: { project_id: string };
  })[]) {
    if (!result[row.item_id]) result[row.item_id] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { item: _item, ...clean } = row;
    result[row.item_id].push(clean as unknown as ItemSupplierWithDetails);
  }
  return result;
}

/**
 * Vincula um fornecedor a um item.
 */
export async function addSupplierToItem(
  supabase: Client,
  data: ItemSupplierInsert,
): Promise<ItemSupplier> {
  const { data: row, error } = await supabase.from("item_suppliers").insert(data).select().single();

  if (error) throw error;
  return row as ItemSupplier;
}

/**
 * Atualiza o preço/nota de um vínculo item-fornecedor.
 */
export async function updateItemSupplier(
  supabase: Client,
  id: string,
  updates: ItemSupplierUpdate,
): Promise<ItemSupplier> {
  const { data, error } = await supabase
    .from("item_suppliers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ItemSupplier;
}

/**
 * Remove um vínculo item-fornecedor.
 */
export async function removeSupplierFromItem(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("item_suppliers").delete().eq("id", id);
  if (error) throw error;
}
