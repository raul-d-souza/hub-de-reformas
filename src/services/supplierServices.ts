/**
 * Serviço de Supplier Services — catálogo de serviços/materiais do fornecedor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SupplierService,
  SupplierServiceInsert,
  SupplierServiceUpdate,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export async function getSupplierServices(
  supabase: Client,
  supplierId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 12;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("supplier_services")
    .select("*", { count: "exact" })
    .eq("supplier_id", supplierId);

  // Apply filters
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  // Pagination
  query = query
    .order("category", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as SupplierService[], count: count ?? 0, page, pageSize };
}

export async function getSupplierServiceById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("supplier_services")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as SupplierService;
}

export async function createSupplierService(supabase: Client, service: SupplierServiceInsert) {
  const { data, error } = await supabase
    .from("supplier_services")
    .insert(service)
    .select()
    .single();

  if (error) throw error;
  return data as SupplierService;
}

export async function updateSupplierService(
  supabase: Client,
  id: string,
  updates: SupplierServiceUpdate,
) {
  const { data, error } = await supabase
    .from("supplier_services")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as SupplierService;
}

export async function deleteSupplierService(supabase: Client, id: string) {
  const { error } = await supabase.from("supplier_services").delete().eq("id", id);
  if (error) throw error;
}
