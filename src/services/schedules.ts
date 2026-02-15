/**
 * Serviço de Supplier Schedules — agenda do fornecedor nos projetos.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SupplierScheduleInsert,
  SupplierScheduleUpdate,
  SupplierScheduleWithDetails,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Busca agenda de fornecedores em um projeto */
export async function getProjectSchedules(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("supplier_schedules")
    .select("*, supplier:suppliers(*), project:projects(*)")
    .eq("project_id", projectId)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return data as SupplierScheduleWithDetails[];
}

/** Busca todos os projetos agendados de um fornecedor */
export async function getSupplierSchedules(
  supabase: Client,
  supplierId: string,
  options?: { page?: number; pageSize?: number },
) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  const query = supabase
    .from("supplier_schedules")
    .select("*, supplier:suppliers(*), project:projects(*)", { count: "exact" })
    .eq("supplier_id", supplierId)
    .order("start_date", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as SupplierScheduleWithDetails[], count: count ?? 0, page, pageSize };
}

export async function createSchedule(supabase: Client, schedule: SupplierScheduleInsert) {
  const { data, error } = await supabase
    .from("supplier_schedules")
    .insert(schedule)
    .select("*, supplier:suppliers(*), project:projects(*)")
    .single();

  if (error) throw error;
  return data as SupplierScheduleWithDetails;
}

export async function updateSchedule(
  supabase: Client,
  id: string,
  updates: SupplierScheduleUpdate,
) {
  const { data, error } = await supabase
    .from("supplier_schedules")
    .update(updates)
    .eq("id", id)
    .select("*, supplier:suppliers(*), project:projects(*)")
    .single();

  if (error) throw error;
  return data as SupplierScheduleWithDetails;
}

export async function deleteSchedule(supabase: Client, id: string) {
  const { error } = await supabase.from("supplier_schedules").delete().eq("id", id);
  if (error) throw error;
}
