/**
 * Serviço de Attendance Records — presença na obra.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceRecord,
  AttendanceRecordInsert,
  AttendanceRecordUpdate,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/** Busca registros de presença em um projeto */
export async function getProjectAttendance(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, supplier:suppliers(id, name)")
    .eq("project_id", projectId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as (AttendanceRecord & { supplier: { id: string; name: string } })[];
}

/** Busca presença de um fornecedor específico em um projeto */
export async function getSupplierAttendance(
  supabase: Client,
  projectId: string,
  supplierId: string,
) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("project_id", projectId)
    .eq("supplier_id", supplierId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as AttendanceRecord[];
}

/** Busca todos os registros de presença do fornecedor (todos os projetos) */
export async function getAllSupplierAttendance(supabase: Client, supplierId: string) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, project:projects(id, title)")
    .eq("supplier_id", supplierId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as (AttendanceRecord & { project: { id: string; title: string } })[];
}

/** Fornecedor registra presença (check-in) */
export async function createAttendance(supabase: Client, record: AttendanceRecordInsert) {
  const { data, error } = await supabase
    .from("attendance_records")
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as AttendanceRecord;
}

/** Atualiza registro (check-out, nota) */
export async function updateAttendance(
  supabase: Client,
  id: string,
  updates: AttendanceRecordUpdate,
) {
  const { data, error } = await supabase
    .from("attendance_records")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as AttendanceRecord;
}

export async function deleteAttendance(supabase: Client, id: string) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) throw error;
}
