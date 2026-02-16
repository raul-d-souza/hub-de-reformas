/**
 * Perfil público do fornecedor — exibe serviços, avaliação e botão de convidar.
 */
"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { getSupplierServices } from "@/services/supplierServices";
import { createInvitation, setInvitationRooms } from "@/services/invitations";
import { getRoomsByProject, ROOM_CONFIGS } from "@/services/rooms";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  Star,
  MapPin,
  Wrench,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
  Package,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  HardHat,
  StickyNote,
  Edit,
  Boxes,
} from "lucide-react";
import type { Supplier, Profile, SupplierService, Project, ProjectRoom } from "@/types/database";
import Link from "next/link";

const CATEGORY_CONFIG = {
  service: { label: "Serviço", icon: Wrench, color: "text-blue-600 bg-blue-50" },
  material: { label: "Material", icon: Package, color: "text-emerald-600 bg-emerald-50" },
  labor: { label: "Mão de obra", icon: Users, color: "text-purple-600 bg-purple-50" },
};

export default function SupplierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { supplier: ownSupplier } = useProfile();
  const supabase = createClient();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<SupplierService[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se é o próprio fornecedor
  const isOwner = ownSupplier?.id === id;

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [projectRooms, setProjectRooms] = useState<ProjectRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Edit service modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<SupplierService | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data: supplierData, error: sErr } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", id)
          .single();

        if (sErr) throw sErr;
        setSupplier(supplierData);

        if (supplierData.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", supplierData.user_id)
            .single();
          setProfile(profileData);
        }

        const svcResult = await getSupplierServices(supabase, id, { pageSize: 1000 });
        setServices(svcResult.data);

        // Carregar projetos do usuário logado (para enviar convite)
        if (user) {
          const { data: projectData } = await supabase
            .from("projects")
            .select("id, title")
            .eq("owner_id", user.id)
            .in("status", ["draft", "active"])
            .order("title");
          setProjects((projectData || []) as Project[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar fornecedor");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id, user, supabase]);

  async function handleProjectChange(projectId: string) {
    setSelectedProject(projectId);
    setSelectedRoomIds(new Set());
    setProjectRooms([]);
    if (!projectId) return;
    setLoadingRooms(true);
    try {
      const rooms = await getRoomsByProject(supabase, projectId);
      setProjectRooms(rooms);
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  }

  function toggleRoom(roomId: string) {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }

  async function handleInvite() {
    if (!user || !selectedProject) return;
    setInviting(true);
    try {
      const invitation = await createInvitation(supabase, {
        project_id: selectedProject,
        supplier_id: id,
        invited_by: user.id,
        status: "pending",
        message: inviteMessage || null,
      });

      // Salvar cômodos selecionados
      if (selectedRoomIds.size > 0) {
        await setInvitationRooms(supabase, invitation.id, [...selectedRoomIds]);
      }

      setInviteSuccess(true);
      setTimeout(() => {
        setShowInvite(false);
        setInviteSuccess(false);
        setSelectedRoomIds(new Set());
        setProjectRooms([]);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      if (code === "23505" || msg.includes("duplicate key") || msg.includes("23505")) {
        setError("Este fornecedor já foi convidado para o projeto selecionado.");
      } else {
        setError(msg || "Erro ao enviar convite");
      }
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="card-solid text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900">Fornecedor não encontrado</h2>
          <Link href="/marketplace" className="btn-primary mt-4 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao marketplace
        </Link>

        {error && (
          <div className="alert-error mb-6 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            {error}
          </div>
        )}

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-solid mb-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange to-orange-400 shadow-glow">
                <HardHat className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {profile?.company_name || supplier.name}
                </h1>
                {supplier.contact_name && <p className="text-gray-500">{supplier.contact_name}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {profile?.specialty && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                      <Wrench className="h-3 w-3" /> {profile.specialty}
                    </span>
                  )}
                  {profile?.city && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5" /> {profile.city}
                      {profile.state ? `, ${profile.state}` : ""}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-4 w-4 ${idx < Math.round(supplier.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                      />
                    ))}
                    <span className="ml-1 text-sm font-medium text-gray-500">
                      {supplier.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {user && (
              <button
                onClick={() => {
                  setShowInvite(true);
                  setError(null);
                }}
                className="btn-primary shrink-0"
              >
                <Send className="h-4 w-4" /> Convidar para projeto
              </button>
            )}
          </div>

          {/* Contact Info */}
          <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
            {supplier.phone && (
              <a
                href={`tel:${supplier.phone}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy transition-colors"
              >
                <Phone className="h-4 w-4 text-gray-400" /> {supplier.phone}
              </a>
            )}
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy transition-colors"
              >
                <Mail className="h-4 w-4 text-gray-400" /> {supplier.email}
              </a>
            )}
            {supplier.website && (
              <a
                href={supplier.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy transition-colors"
              >
                <Globe className="h-4 w-4 text-gray-400" /> {supplier.website}
              </a>
            )}
          </div>

          {profile?.bio && (
            <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
              {profile.bio}
            </p>
          )}
        </motion.div>

        {/* Services */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Serviços Section */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Wrench className="h-5 w-5 text-navy" />
              Serviços (
              {services.filter((s) => s.category === "service" || s.category === "labor").length})
            </h2>
            {services.filter((s) => s.category === "service" || s.category === "labor").length ===
            0 ? (
              <div className="card-solid py-8 text-center">
                <p className="text-sm text-gray-400">Nenhum serviço cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services
                  .filter((s) => s.category === "service" || s.category === "labor")
                  .map((svc, i) => {
                    const cat =
                      CATEGORY_CONFIG[svc.category as keyof typeof CATEGORY_CONFIG] ||
                      CATEGORY_CONFIG.service;
                    return (
                      <motion.div
                        key={svc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className={`card-solid ${isOwner ? "cursor-pointer hover:shadow-elevated" : ""}`}
                        onClick={() => isOwner && (setEditingService(svc), setShowEditModal(true))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cat.color}`}
                            >
                              <cat.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{svc.name}</p>
                              {svc.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                  {svc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {isOwner && <Edit className="h-4 w-4 text-gray-400 shrink-0" />}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{svc.unit}</span>
                          <span className="font-bold text-orange text-lg">
                            R${" "}
                            {svc.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Materiais Section */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
              <Boxes className="h-5 w-5 text-navy" />
              Materiais & Produtos ({services.filter((s) => s.category === "material").length})
            </h2>
            {services.filter((s) => s.category === "material").length === 0 ? (
              <div className="card-solid py-8 text-center">
                <p className="text-sm text-gray-400">Nenhum material cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services
                  .filter((s) => s.category === "material")
                  .map((svc, i) => {
                    const cat =
                      CATEGORY_CONFIG[svc.category as keyof typeof CATEGORY_CONFIG] ||
                      CATEGORY_CONFIG.material;
                    return (
                      <motion.div
                        key={svc.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className={`card-solid ${isOwner ? "cursor-pointer hover:shadow-elevated" : ""}`}
                        onClick={() => isOwner && (setEditingService(svc), setShowEditModal(true))}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cat.color}`}
                            >
                              <cat.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{svc.name}</p>
                              {svc.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                  {svc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {isOwner && <Edit className="h-4 w-4 text-gray-400 shrink-0" />}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{svc.unit}</span>
                          <span className="font-bold text-orange text-lg">
                            {formatCurrency(svc.unit_price)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Edit Service Modal */}
        <AnimatePresence>
          {showEditModal && editingService && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-elevated max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-navy" />
                    {editingService.name}
                  </h3>
                  <button onClick={() => setShowEditModal(false)} className="btn-ghost !p-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Categoria
                    </label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cat =
                          CATEGORY_CONFIG[editingService.category as keyof typeof CATEGORY_CONFIG];
                        return (
                          <div
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${cat.color}`}
                          >
                            <cat.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{cat.label}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {editingService.description && (
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Descrição
                      </label>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        {editingService.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Unidade
                      </label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg p-3">
                        {editingService.unit}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        Preço
                      </label>
                      <p className="text-lg font-bold text-orange bg-orange-50 rounded-lg p-3">
                        {formatCurrency(editingService.unit_price)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setShowEditModal(false)} className="btn-ghost">
                    Fechar
                  </button>
                  <Link href="/my-services" className="btn-primary inline-flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Editar em Meus Serviços
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowInvite(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated"
              >
                {inviteSuccess ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                    <h3 className="text-lg font-bold text-gray-900">Convite enviado!</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      O fornecedor receberá a notificação.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Send className="h-5 w-5 text-navy" />
                        Convidar {profile?.company_name || supplier.name}
                      </h3>
                      <button onClick={() => setShowInvite(false)} className="btn-ghost !p-2">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Selecione o projeto
                        </label>
                        <select
                          value={selectedProject}
                          onChange={(e) => handleProjectChange(e.target.value)}
                          className="input"
                        >
                          <option value="">Escolha um projeto...</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Seleção de cômodos */}
                      {selectedProject && (
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Cômodos (opcional — deixe vazio para todo o projeto)
                          </label>
                          {loadingRooms ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                              <Loader2 className="h-4 w-4 animate-spin" /> Carregando cômodos...
                            </div>
                          ) : projectRooms.length === 0 ? (
                            <p className="text-xs text-gray-400 py-2">
                              Nenhum cômodo cadastrado neste projeto.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {projectRooms.map((room, i) => {
                                const config = ROOM_CONFIGS.find((c) => c.type === room.room_type);
                                const selected = selectedRoomIds.has(room.id);
                                return (
                                  <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => toggleRoom(room.id)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                                      selected
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                    }`}
                                  >
                                    <span>{config?.icon || "🏠"}</span>#{i + 1}{" "}
                                    {room.custom_name || config?.label || room.room_type}
                                    {selected && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {selectedRoomIds.size > 0 && (
                            <p className="text-xs text-emerald-600 mt-1.5">
                              {selectedRoomIds.size} cômodo{selectedRoomIds.size > 1 ? "s" : ""}{" "}
                              selecionado{selectedRoomIds.size > 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Mensagem (opcional)
                        </label>
                        <div className="relative">
                          <StickyNote className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <textarea
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                            className="input pl-10"
                            rows={3}
                            placeholder="Descreva o que você precisa..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {error}
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowInvite(false);
                            setError(null);
                          }}
                          className="btn-ghost"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleInvite}
                          disabled={inviting || !selectedProject}
                          className="btn-primary"
                        >
                          {inviting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Enviar Convite
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
