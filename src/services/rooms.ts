/**
 * Serviço de Project Rooms (Cômodos) — CRUD + helpers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProjectRoom,
  ProjectRoomInsert,
  ProjectRoomUpdate,
  RoomConfig,
  RoomType,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/* ─── Configuração dos tipos de cômodo ─── */
export const ROOM_CONFIGS: RoomConfig[] = [
  { type: "sala_estar", label: "Sala de Estar", icon: "🛋️", color: "#4F86C6", defaultArea: 20 },
  { type: "sala_jantar", label: "Sala de Jantar", icon: "🍽️", color: "#5A9BD5", defaultArea: 14 },
  { type: "quarto", label: "Quarto", icon: "🛏️", color: "#7CB9E8", defaultArea: 12 },
  { type: "suite", label: "Suíte", icon: "🛏️", color: "#6CA0DC", defaultArea: 16 },
  { type: "banheiro", label: "Banheiro", icon: "🚿", color: "#89CFF0", defaultArea: 5 },
  { type: "lavabo", label: "Lavabo", icon: "🚽", color: "#A7D8DE", defaultArea: 3 },
  { type: "cozinha", label: "Cozinha", icon: "🍳", color: "#FF8C42", defaultArea: 10 },
  { type: "escritorio", label: "Escritório", icon: "💻", color: "#9B59B6", defaultArea: 10 },
  { type: "lavanderia", label: "Lavanderia", icon: "🧺", color: "#1ABC9C", defaultArea: 6 },
  { type: "area_servico", label: "Área de Serviço", icon: "🧹", color: "#2ECC71", defaultArea: 6 },
  { type: "sacada", label: "Sacada", icon: "🌤️", color: "#F1C40F", defaultArea: 6 },
  { type: "varanda", label: "Varanda", icon: "🌿", color: "#E67E22", defaultArea: 8 },
  { type: "terraço", label: "Terraço", icon: "☀️", color: "#F39C12", defaultArea: 15 },
  { type: "garagem", label: "Garagem", icon: "🚗", color: "#95A5A6", defaultArea: 18 },
  { type: "corredor", label: "Corredor", icon: "🚪", color: "#BDC3C7", defaultArea: 6 },
  { type: "hall", label: "Hall", icon: "🏠", color: "#D5DBDB", defaultArea: 4 },
  { type: "despensa", label: "Despensa", icon: "📦", color: "#A0522D", defaultArea: 4 },
  { type: "closet", label: "Closet", icon: "👔", color: "#C39BD3", defaultArea: 5 },
  { type: "churrasqueira", label: "Churrasqueira", icon: "🔥", color: "#E74C3C", defaultArea: 12 },
  { type: "piscina", label: "Piscina", icon: "🏊", color: "#3498DB", defaultArea: 20 },
  { type: "jardim", label: "Jardim", icon: "🌳", color: "#27AE60", defaultArea: 15 },
  { type: "outro", label: "Outro", icon: "📐", color: "#7F8C8D", defaultArea: 10 },
];

export function getRoomConfig(type: RoomType): RoomConfig {
  return ROOM_CONFIGS.find((c) => c.type === type) ?? ROOM_CONFIGS[ROOM_CONFIGS.length - 1];
}

/* ─── Tipo para seleção de cômodos na UI (antes de salvar) ─── */
export interface RoomSelection {
  type: RoomType;
  quantity: number;
  customName?: string;
  floor?: number;
}

/* ─── CRUD ─── */

export async function getRoomsByProject(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("project_rooms")
    .select("*")
    .eq("project_id", projectId)
    .order("room_type");

  if (error) throw error;
  return data as ProjectRoom[];
}

export async function createRoom(supabase: Client, room: ProjectRoomInsert) {
  const { data, error } = await supabase.from("project_rooms").insert(room).select().single();

  if (error) throw error;
  return data as ProjectRoom;
}

export async function createRoomsForProject(
  supabase: Client,
  projectId: string,
  ownerId: string,
  selections: RoomSelection[],
) {
  const roomInserts: ProjectRoomInsert[] = selections.map((s) => ({
    project_id: projectId,
    owner_id: ownerId,
    room_type: s.type,
    custom_name: s.customName ?? null,
    quantity: s.quantity,
    floor: s.floor ?? 0,
    area_m2: getRoomConfig(s.type).defaultArea,
    notes: null,
  }));

  const { data, error } = await supabase.from("project_rooms").insert(roomInserts).select();

  if (error) throw error;
  return data as ProjectRoom[];
}

export async function updateRoom(supabase: Client, id: string, updates: ProjectRoomUpdate) {
  const { data, error } = await supabase
    .from("project_rooms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRoom;
}

export async function deleteRoom(supabase: Client, id: string) {
  const { error } = await supabase.from("project_rooms").delete().eq("id", id);

  if (error) throw error;
}

export async function deleteAllRoomsForProject(supabase: Client, projectId: string) {
  const { error } = await supabase.from("project_rooms").delete().eq("project_id", projectId);

  if (error) throw error;
}
