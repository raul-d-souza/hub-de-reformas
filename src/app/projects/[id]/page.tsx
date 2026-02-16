/**
 * Detalhe de projeto — design premium com tabs, ícones e animações.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabaseClient";
import { getProjectById, updateProject, deleteProject } from "@/services/projects";
import { getRoomsByProject, createRoom, deleteRoom } from "@/services/rooms";
import { ROOM_CONFIGS, getRoomConfig, type RoomSelection } from "@/services/rooms";
import {
  getProjectInvitations,
  getInvitationRooms,
  deleteInvitation,
} from "@/services/invitations";
import type { InteractiveRoom } from "@/components/FloorPlanInteractive";
import { formatDateSafe } from "@/lib/format";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ItemList from "@/components/ItemList";
import DocumentList from "@/components/DocumentList";
import type {
  Project,
  ProjectStatus,
  ProjectRoom,
  RoomType,
  ProjectInvitationWithDetails,
} from "@/types/database";
import Link from "next/link";

const FloorPlanInteractive = dynamic(() => import("@/components/FloorPlanInteractive"), {
  ssr: false,
  loading: () => <div className="h-[500px] animate-pulse rounded-xl bg-gray-100" />,
});

const FinancialDashboard = dynamic(() => import("@/components/FinancialDashboard"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />,
});
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Package,
  Home,
  DollarSign,
  FileText,
  MapPin,
  Calendar,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Settings,
  Gavel,
  Plus,
  Save,
  Send,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  done: "Concluído",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: "badge-draft",
  active: "badge-active",
  paused: "badge-paused",
  done: "badge-done",
};

const TABS = [
  { key: "items", label: "Itens", icon: Package },
  { key: "rooms", label: "Cômodos", icon: Home },
  { key: "financial", label: "Financeiro", icon: DollarSign },
  { key: "documents", label: "Documentos", icon: FileText },
  { key: "bids", label: "Convites", icon: Send },
] as const;

type SectionKey = (typeof TABS)[number]["key"];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("items");
  const [rooms, setRooms] = useState<ProjectRoom[]>([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomType, setNewRoomType] = useState<RoomType>("quarto");
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<InteractiveRoom[]>([]);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const [invitations, setInvitations] = useState<ProjectInvitationWithDetails[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationRoomsMap, setInvitationRoomsMap] = useState<Record<string, string[]>>({});

  const loadProject = useCallback(async () => {
    try {
      const [data, roomsData] = await Promise.all([
        getProjectById(supabase, id),
        getRoomsByProject(supabase, id).catch(() => [] as ProjectRoom[]),
      ]);
      setProject(data);
      setRooms(roomsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Projeto não encontrado");
    }
    setIsLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  /** Carrega convites quando a aba de lances é aberta */
  const loadInvitations = useCallback(async () => {
    if (!id) return;
    setLoadingInvitations(true);
    try {
      const data = await getProjectInvitations(supabase, id);
      setInvitations(data);

      // Carregar cômodos de cada convite
      const roomsMap: Record<string, string[]> = {};
      await Promise.all(
        data.map(async (inv) => {
          try {
            const roomIds = await getInvitationRooms(supabase, inv.id);
            if (roomIds.length > 0) roomsMap[inv.id] = roomIds;
          } catch {
            /* silently ignore */
          }
        }),
      );
      setInvitationRoomsMap(roomsMap);
    } catch (err) {
      console.error("Erro ao carregar convites:", err);
    }
    setLoadingInvitations(false);
  }, [supabase, id]);

  useEffect(() => {
    if (activeSection === "bids") {
      loadInvitations();
    }
  }, [activeSection, loadInvitations]);

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project) return;
    try {
      const updated = await updateProject(supabase, project.id, { status: newStatus });
      setProject(updated);
    } catch (err: unknown) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  async function handleDelete() {
    if (!project) return;
    if (
      !confirm(
        "Tem certeza que deseja excluir este projeto? Todos os itens e cotações serão removidos.",
      )
    )
      return;
    try {
      await deleteProject(supabase, project.id);
      router.push("/projects");
    } catch (err: unknown) {
      console.error("Erro ao excluir:", err);
    }
  }

  async function handleAddRoom() {
    if (!project) return;
    setAddingRoom(true);
    try {
      const config = getRoomConfig(newRoomType);
      await createRoom(supabase, {
        project_id: project.id,
        owner_id: project.owner_id,
        room_type: newRoomType,
        custom_name: newRoomName.trim() || null,
        quantity: 1,
        floor: 0,
        area_m2: config.defaultArea,
        notes: null,
      });
      setNewRoomName("");
      setShowAddRoom(false);
      await loadProject();
    } catch (err) {
      console.error("Erro ao adicionar cômodo:", err);
    }
    setAddingRoom(false);
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("Excluir este cômodo? Itens associados perderão a vinculação.")) return;
    try {
      await deleteRoom(supabase, roomId);
      await loadProject();
    } catch (err) {
      console.error("Erro ao remover cômodo:", err);
    }
  }

  function handleLayoutChange(layout: InteractiveRoom[]) {
    setCurrentLayout(layout);
    setLayoutDirty(true);
  }

  async function handleRemoveInvitation(invId: string) {
    if (!confirm("Cancelar este convite?")) return;
    try {
      await deleteInvitation(supabase, invId);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err) {
      console.error("Erro ao remover convite:", err);
    }
  }

  async function handleSaveLayout() {
    if (!project) return;
    setSavingLayout(true);
    try {
      const updated = await updateProject(supabase, project.id, {
        floor_plan_layout: currentLayout.map((r) => ({ ...r })) as unknown as Record<
          string,
          unknown
        >[],
      });
      setProject(updated);
      setLayoutDirty(false);
    } catch (err) {
      console.error("Erro ao salvar layout:", err);
    }
    setSavingLayout(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="text-sm text-gray-500">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 font-medium text-red-600">{error || "Projeto não encontrado"}</p>
          <Link
            href="/projects"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos projetos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos projetos
          </Link>

          {/* Cabeçalho do projeto */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {project.title}
                </h1>
                <span className={STATUS_BADGE[project.status]}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>
              {project.description && <p className="mt-2 text-gray-600">{project.description}</p>}
              {project.address && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.address}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/quotes`} className="btn-accent">
                <ExternalLink className="h-4 w-4" />
                Ver Cotações
              </Link>
              <button onClick={handleDelete} className="btn-danger">
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>

          {/* Info do projeto */}
          <div className="mt-6 card-solid">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-surface-100 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Início</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {project.start_date ? formatDateSafe(project.start_date) : "Não definido"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-surface-100 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Término</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {project.end_date ? formatDateSafe(project.end_date) : "Não definido"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-surface-100 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-navy">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-medium text-gray-500">Alterar Status</p>
                  <div className="relative">
                    <select
                      value={project.status}
                      onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                      className="appearance-none rounded-md border border-gray-200 bg-white py-1 pl-2 pr-7 text-sm font-medium focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      aria-label="Alterar status do projeto"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativo</option>
                      <option value="paused">Pausado</option>
                      <option value="done">Concluído</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 tabs">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveSection(t.key)}
                  className={`tab ${activeSection === t.key ? "tab-active" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo das abas */}
          <AnimatePresence mode="wait">
            <motion.section
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              {activeSection === "items" && (
                <>
                  <h2 className="section-title">Itens da Obra</h2>
                  <ItemList projectId={project.id} />
                </>
              )}

              {activeSection === "rooms" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Cômodos e Planta Baixa</h2>
                    <button
                      onClick={() => setShowAddRoom(!showAddRoom)}
                      className={showAddRoom ? "btn-ghost" : "btn-primary"}
                    >
                      {showAddRoom ? (
                        <>
                          <Trash2 className="h-4 w-4" /> Cancelar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" /> Adicionar Cômodo
                        </>
                      )}
                    </button>
                  </div>

                  {/* Add room form */}
                  {showAddRoom && (
                    <div className="card-solid space-y-3">
                      <h4 className="text-sm font-semibold text-navy">Novo Cômodo</h4>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Tipo
                          </label>
                          <select
                            value={newRoomType}
                            onChange={(e) => setNewRoomType(e.target.value as RoomType)}
                            className="input"
                          >
                            {ROOM_CONFIGS.map((c) => (
                              <option key={c.type} value={c.type}>
                                {c.icon} {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Nome personalizado (opcional)
                          </label>
                          <input
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            placeholder="Ex: Quarto do João"
                            className="input"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={handleAddRoom}
                            disabled={addingRoom}
                            className="btn-primary w-full"
                          >
                            {addingRoom ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {rooms.length > 0 ? (
                    <>
                      <div className="card-solid">
                        <FloorPlanInteractive
                          rooms={rooms.reduce<RoomSelection[]>((acc, room) => {
                            const existing = acc.find((r) => r.type === room.room_type);
                            if (existing) {
                              existing.quantity += room.quantity;
                            } else {
                              acc.push({ type: room.room_type, quantity: room.quantity });
                            }
                            return acc;
                          }, [])}
                          initialLayout={
                            project.floor_plan_layout
                              ? (project.floor_plan_layout as InteractiveRoom[])
                              : undefined
                          }
                          onLayoutChange={handleLayoutChange}
                          backgroundImage={project.floor_plan_image_url ?? undefined}
                          editable
                          height={500}
                        />
                        {layoutDirty && (
                          <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                            <span className="text-xs text-amber-600">⚠️ Layout alterado</span>
                            <button
                              onClick={handleSaveLayout}
                              disabled={savingLayout}
                              className="btn-primary"
                            >
                              {savingLayout ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Salvar Planta
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="card-solid">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <Home className="h-4 w-4 text-navy" />
                          Lista de Cômodos ({rooms.reduce((acc, r) => acc + r.quantity, 0)} total)
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {rooms.map((room) => {
                            const config = ROOM_CONFIGS.find((c) => c.type === room.room_type);
                            return (
                              <div
                                key={room.id}
                                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-surface-100 p-3 transition-colors hover:border-gray-200 group"
                              >
                                <span
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                                  style={{ backgroundColor: (config?.color || "#6b7280") + "20" }}
                                >
                                  {config?.icon ?? "📐"}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {config?.label ?? room.room_type}
                                    {room.custom_name ? ` — ${room.custom_name}` : ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Qtd: {room.quantity}
                                    {room.area_m2 ? ` • ~${room.area_m2}m²` : ""}
                                    {room.floor > 0 ? ` • ${room.floor}° andar` : ""}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteRoom(room.id)}
                                  className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                  title="Remover cômodo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <Home className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-3 font-medium text-gray-500">
                        Nenhum cômodo cadastrado para este projeto.
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Clique em &quot;Adicionar Cômodo&quot; para começar a definir os cômodos da
                        obra.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "financial" && <FinancialDashboard projectId={project.id} />}

              {activeSection === "documents" && <DocumentList projectId={project.id} />}

              {activeSection === "bids" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="section-title">Convites & Propostas</h2>
                    <Link href="/marketplace" className="btn-primary">
                      <Send className="h-4 w-4" /> Convidar Fornecedor
                    </Link>
                  </div>

                  {loadingInvitations ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-navy" />
                    </div>
                  ) : invitations.length === 0 ? (
                    <div className="card-solid text-center py-8">
                      <Send className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <h3 className="text-lg font-bold text-gray-900">Nenhum convite enviado</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Convide fornecedores pelo Marketplace para receber propostas neste projeto.
                      </p>
                      <Link href="/marketplace" className="btn-primary mt-4 inline-flex">
                        <Send className="h-4 w-4" /> Ir ao Marketplace
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invitations.map((inv) => {
                        const roomIds = invitationRoomsMap[inv.id];
                        const invitedRoomNames = roomIds
                          ? roomIds
                              .map((rid) => {
                                const room = rooms.find((r) => r.id === rid);
                                if (!room) return null;
                                const config = ROOM_CONFIGS.find((c) => c.type === room.room_type);
                                return config
                                  ? `${config.icon} ${room.custom_name || config.label}`
                                  : room.custom_name || room.room_type;
                              })
                              .filter(Boolean)
                          : null;

                        const isAccepted = inv.status === "accepted";
                        const CardWrapper = isAccepted ? Link : "div";
                        const cardProps = isAccepted
                          ? { href: `/projects/${project.id}/bids?supplier=${inv.supplier_id}` }
                          : {};

                        return (
                          <CardWrapper
                            key={inv.id}
                            {...(cardProps as Record<string, string>)}
                            className={`card-solid flex items-start gap-4 transition-shadow hover:shadow-md ${
                              isAccepted
                                ? "cursor-pointer ring-1 ring-green-200 hover:ring-green-300"
                                : ""
                            }`}
                          >
                            {/* Icon */}
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                inv.status === "accepted"
                                  ? "bg-green-100 text-green-600"
                                  : inv.status === "declined"
                                    ? "bg-red-100 text-red-500"
                                    : "bg-amber-100 text-amber-600"
                              }`}
                            >
                              {inv.status === "accepted" ? (
                                <UserCheck className="h-5 w-5" />
                              ) : inv.status === "declined" ? (
                                <UserX className="h-5 w-5" />
                              ) : (
                                <Clock className="h-5 w-5" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {isAccepted ? (
                                  <span className="text-sm font-semibold text-navy truncate">
                                    {inv.supplier?.name || "Fornecedor"}
                                  </span>
                                ) : (
                                  <Link
                                    href={`/marketplace/${inv.supplier_id}`}
                                    className="text-sm font-semibold text-navy hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {inv.supplier?.name || "Fornecedor"}
                                  </Link>
                                )}
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                    inv.status === "accepted"
                                      ? "bg-green-100 text-green-700"
                                      : inv.status === "declined"
                                        ? "bg-red-100 text-red-600"
                                        : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {inv.status === "accepted"
                                    ? "Aceito"
                                    : inv.status === "declined"
                                      ? "Recusado"
                                      : "Pendente"}
                                </span>
                              </div>

                              {inv.message && (
                                <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                                  💬 {inv.message}
                                </p>
                              )}

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                <span>
                                  Enviado em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                                </span>
                                {inv.responded_at && (
                                  <span>
                                    • Respondido em{" "}
                                    {new Date(inv.responded_at).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>

                              {/* Invited rooms */}
                              {invitedRoomNames && invitedRoomNames.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {invitedRoomNames.map((name, i) => (
                                    <span
                                      key={i}
                                      className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 ring-1 ring-green-200"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {inv.status === "pending" && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveInvitation(inv.id);
                                }}
                                className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                                title="Cancelar convite"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            {isAccepted && (
                              <span className="shrink-0 text-xs font-medium text-green-600 flex items-center gap-1">
                                <Gavel className="h-3.5 w-3.5" /> Ver Lances →
                              </span>
                            )}
                          </CardWrapper>
                        );
                      })}
                    </div>
                  )}

                  {/* Link to bids page */}
                  {invitations.some((i) => i.status === "accepted") && (
                    <div className="text-center pt-2">
                      <Link
                        href={`/projects/${project.id}/bids`}
                        className="btn-accent inline-flex"
                      >
                        <Gavel className="h-4 w-4" /> Ver Lances
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
