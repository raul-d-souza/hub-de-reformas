/**
 * Meus Lances — convites recebidos, propostas enviadas e negociações para o fornecedor.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useProfile } from "@/hooks/useProfile";
import { getSupplierInvitations, respondToInvitation } from "@/services/invitations";
import { getSupplierBids, createBid } from "@/services/bids";
import { getSupplierSchedules, createSchedule } from "@/services/schedules";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  Mail,
  Gavel,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Send,
  AlertCircle,
  ChevronDown,
  X,
  StickyNote,
} from "lucide-react";
import type {
  ProjectInvitationWithDetails,
  ProjectBidWithDetails,
  SupplierScheduleWithDetails,
} from "@/types/database";
import Pagination from "@/components/Pagination";

type Tab = "invitations" | "bids" | "schedules";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "invitations", label: "Convites", icon: Mail },
  { key: "bids", label: "Lances", icon: Gavel },
  { key: "schedules", label: "Agenda", icon: Calendar },
];

export default function MyBidsPage() {
  const { user, profile, supplier, loading: profileLoading } = useProfile();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("invitations");
  const [invitations, setInvitations] = useState<ProjectInvitationWithDetails[]>([]);
  const [bids, setBids] = useState<ProjectBidWithDetails[]>([]);
  const [schedules, setSchedules] = useState<SupplierScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination state
  const [invitationsPage, setInvitationsPage] = useState(1);
  const [invitationsCount, setInvitationsCount] = useState(0);
  const [bidsPage, setBidsPage] = useState(1);
  const [bidsCount, setBidsCount] = useState(0);
  const [schedulesPage, setSchedulesPage] = useState(1);
  const [schedulesCount, setSchedulesCount] = useState(0);
  const pageSize = 10;

  // Bid form state
  const [showBidForm, setShowBidForm] = useState<string | null>(null); // projectId
  const [bidForm, setBidForm] = useState({ total_price: "", note: "" });

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState<string | null>(null); // projectId
  const [scheduleForm, setScheduleForm] = useState({
    start_date: "",
    end_date: "",
    deadline: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const [invResult, bidResult, schedResult] = await Promise.all([
        getSupplierInvitations(supabase, supplier.id, { page: invitationsPage, pageSize }),
        getSupplierBids(supabase, supplier.id, { page: bidsPage, pageSize }),
        getSupplierSchedules(supabase, supplier.id, { page: schedulesPage, pageSize }),
      ]);
      setInvitations(invResult.data);
      setInvitationsCount(invResult.count);
      setBids(bidResult.data);
      setBidsCount(bidResult.count);
      setSchedules(schedResult.data);
      setSchedulesCount(schedResult.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [supplier, supabase, invitationsPage, bidsPage, schedulesPage]);

  useEffect(() => {
    if (!profileLoading && supplier) fetchData();
    else if (!profileLoading) setLoading(false);
  }, [profileLoading, supplier, fetchData]);

  async function handleInvitationResponse(id: string, status: "accepted" | "rejected") {
    setActionLoading(id);
    try {
      await respondToInvitation(supabase, id, { status });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao responder convite");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendBid(projectId: string) {
    if (!supplier) return;
    setActionLoading(projectId);
    try {
      await createBid(supabase, {
        project_id: projectId,
        supplier_id: supplier.id,
        bid_type: "total",
        total_price: Number(bidForm.total_price) || 0,
        items_detail: null,
        status: "pending",
        note: bidForm.note || null,
        parent_bid_id: null,
      });
      setShowBidForm(null);
      setBidForm({ total_price: "", note: "" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar lance");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateSchedule(projectId: string) {
    if (!supplier) return;
    setActionLoading(projectId);
    try {
      await createSchedule(supabase, {
        project_id: projectId,
        supplier_id: supplier.id,
        start_date: scheduleForm.start_date,
        end_date: scheduleForm.end_date,
        deadline: scheduleForm.deadline || null,
        notes: scheduleForm.notes || null,
      });
      setShowScheduleForm(null);
      setScheduleForm({ start_date: "", end_date: "", deadline: "", notes: "" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar agenda");
    } finally {
      setActionLoading(null);
    }
  }

  if (profileLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    );
  }

  if (!user || profile?.role !== "supplier") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="card-solid text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold text-gray-900">Acesso restrito</h2>
          <p className="mt-2 text-gray-500">Página exclusiva para fornecedores.</p>
        </div>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const answeredInvitations = invitations.filter((i) => i.status !== "pending");

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-600 shadow-glow">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Meus Lances & Convites
                </h1>
                <p className="text-sm text-gray-500">
                  Gerencie convites, propostas e agenda de obras
                </p>
              </div>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="alert-error mb-6 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 text-red-500" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-2xl bg-white p-1 shadow-soft">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-navy text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.key === "invitations" && pendingInvitations.length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {pendingInvitations.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {tab === "invitations" && (
              <motion.div
                key="invitations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {invitations.length === 0 ? (
                  <div className="card-solid py-12 text-center">
                    <Mail className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhum convite recebido</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Quando clientes enviarem convites para seus projetos, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInvitations.length > 0 && (
                      <div>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          <Clock className="h-4 w-4 text-amber-500" /> Pendentes (
                          {pendingInvitations.length})
                        </h3>
                        <div className="space-y-3">
                          {pendingInvitations.map((inv) => (
                            <div key={inv.id} className="card-solid border-l-4 border-l-amber-400">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-gray-900">
                                    {inv.project?.title || "Projeto"}
                                  </h4>
                                  {inv.project?.description && (
                                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                      {inv.project.description}
                                    </p>
                                  )}
                                  {inv.message && (
                                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2.5 text-sm text-blue-800">
                                      <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                                      {inv.message}
                                    </div>
                                  )}
                                  <p className="mt-2 text-xs text-gray-400">
                                    Recebido em {formatDate(inv.created_at)}
                                  </p>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-4">
                                  <button
                                    onClick={() => handleInvitationResponse(inv.id, "rejected")}
                                    disabled={actionLoading === inv.id}
                                    className="btn-ghost text-red-600 hover:text-red-700"
                                  >
                                    {actionLoading === inv.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                    Recusar
                                  </button>
                                  <button
                                    onClick={() => handleInvitationResponse(inv.id, "accepted")}
                                    disabled={actionLoading === inv.id}
                                    className="btn-primary"
                                  >
                                    {actionLoading === inv.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Aceitar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {answeredInvitations.length > 0 && (
                      <div>
                        <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          <ChevronDown className="h-4 w-4" /> Respondidos (
                          {answeredInvitations.length})
                        </h3>
                        <div className="space-y-3">
                          {answeredInvitations.map((inv) => (
                            <div
                              key={inv.id}
                              className={`card-solid border-l-4 ${inv.status === "accepted" ? "border-l-emerald-400" : "border-l-red-300"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {inv.project?.title || "Projeto"}
                                  </h4>
                                  <p className="text-xs text-gray-400">
                                    {formatDate(inv.created_at)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                      inv.status === "accepted"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {inv.status === "accepted" ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    {inv.status === "accepted" ? "Aceito" : "Recusado"}
                                  </span>
                                  {inv.status === "accepted" &&
                                    !bids.some((b) => b.project_id === inv.project_id) && (
                                      <button
                                        onClick={() => {
                                          setShowBidForm(inv.project_id);
                                          setBidForm({ total_price: "", note: "" });
                                        }}
                                        className="btn-primary text-xs"
                                      >
                                        <Gavel className="h-3 w-3" /> Enviar Lance
                                      </button>
                                    )}
                                  {inv.status === "accepted" &&
                                    !schedules.some((s) => s.project_id === inv.project_id) && (
                                      <button
                                        onClick={() => {
                                          setShowScheduleForm(inv.project_id);
                                          setScheduleForm({
                                            start_date: "",
                                            end_date: "",
                                            deadline: "",
                                            notes: "",
                                          });
                                        }}
                                        className="btn-ghost text-xs"
                                      >
                                        <Calendar className="h-3 w-3" /> Agendar
                                      </button>
                                    )}
                                </div>
                              </div>

                              {/* Inline Bid Form */}
                              <AnimatePresence>
                                {showBidForm === inv.project_id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 overflow-hidden rounded-xl bg-surface-100 p-4"
                                  >
                                    <h5 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                      <DollarSign className="h-4 w-4 text-orange" /> Enviar Proposta
                                    </h5>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                          Valor Total (R$)
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={bidForm.total_price}
                                          onChange={(e) =>
                                            setBidForm({ ...bidForm, total_price: e.target.value })
                                          }
                                          className="input"
                                          placeholder="0,00"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                          Observação
                                        </label>
                                        <input
                                          type="text"
                                          value={bidForm.note}
                                          onChange={(e) =>
                                            setBidForm({ ...bidForm, note: e.target.value })
                                          }
                                          className="input"
                                          placeholder="Inclui materiais..."
                                        />
                                      </div>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                      <button
                                        onClick={() => setShowBidForm(null)}
                                        className="btn-ghost text-xs"
                                      >
                                        <X className="h-3 w-3" /> Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSendBid(inv.project_id)}
                                        disabled={
                                          actionLoading === inv.project_id || !bidForm.total_price
                                        }
                                        className="btn-primary text-xs"
                                      >
                                        {actionLoading === inv.project_id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Send className="h-3 w-3" />
                                        )}
                                        Enviar
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Inline Schedule Form */}
                              <AnimatePresence>
                                {showScheduleForm === inv.project_id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 overflow-hidden rounded-xl bg-surface-100 p-4"
                                  >
                                    <h5 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                                      <Calendar className="h-4 w-4 text-emerald-600" /> Agendar Obra
                                    </h5>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                          Início
                                        </label>
                                        <input
                                          type="date"
                                          value={scheduleForm.start_date}
                                          onChange={(e) =>
                                            setScheduleForm({
                                              ...scheduleForm,
                                              start_date: e.target.value,
                                            })
                                          }
                                          className="input"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                          Fim
                                        </label>
                                        <input
                                          type="date"
                                          value={scheduleForm.end_date}
                                          onChange={(e) =>
                                            setScheduleForm({
                                              ...scheduleForm,
                                              end_date: e.target.value,
                                            })
                                          }
                                          className="input"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                          Prazo máximo
                                        </label>
                                        <input
                                          type="date"
                                          value={scheduleForm.deadline}
                                          onChange={(e) =>
                                            setScheduleForm({
                                              ...scheduleForm,
                                              deadline: e.target.value,
                                            })
                                          }
                                          className="input"
                                        />
                                      </div>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                      <button
                                        onClick={() => setShowScheduleForm(null)}
                                        className="btn-ghost text-xs"
                                      >
                                        <X className="h-3 w-3" /> Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleCreateSchedule(inv.project_id)}
                                        disabled={
                                          actionLoading === inv.project_id ||
                                          !scheduleForm.start_date ||
                                          !scheduleForm.end_date
                                        }
                                        className="btn-primary text-xs"
                                      >
                                        {actionLoading === inv.project_id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Calendar className="h-3 w-3" />
                                        )}
                                        Salvar
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {invitations.length > 0 && (
                  <Pagination
                    currentPage={invitationsPage}
                    totalPages={Math.ceil(invitationsCount / pageSize)}
                    onPageChange={setInvitationsPage}
                    totalItems={invitationsCount}
                    itemsPerPage={pageSize}
                  />
                )}
              </motion.div>
            )}

            {tab === "bids" && (
              <motion.div
                key="bids"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {bids.length === 0 ? (
                  <div className="card-solid py-12 text-center">
                    <Gavel className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhum lance enviado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Aceite um convite e envie uma proposta para participar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bids.map((bid, i) => (
                      <motion.div
                        key={bid.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`card-solid border-l-4 ${
                          bid.status === "accepted"
                            ? "border-l-emerald-400"
                            : bid.status === "rejected"
                              ? "border-l-red-300"
                              : bid.status === "counter"
                                ? "border-l-amber-400"
                                : "border-l-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(bid.total_price ?? 0)}
                              </span>
                              <span className="rounded-md bg-surface-100 px-2 py-0.5 text-xs text-gray-500">
                                {bid.bid_type === "total" ? "Preço total" : "Por item"}
                              </span>
                            </div>
                            {bid.note && <p className="mt-1 text-sm text-gray-500">{bid.note}</p>}
                            <p className="mt-1 text-xs text-gray-400">
                              {formatDate(bid.created_at)}
                            </p>
                          </div>
                          <span
                            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                              bid.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : bid.status === "rejected"
                                  ? "bg-red-50 text-red-700"
                                  : bid.status === "counter"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {bid.status === "accepted" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {bid.status === "rejected" && <XCircle className="h-3.5 w-3.5" />}
                            {bid.status === "pending" && <Clock className="h-3.5 w-3.5" />}
                            {bid.status === "counter" && <TrendingUp className="h-3.5 w-3.5" />}
                            {bid.status === "accepted"
                              ? "Aceito"
                              : bid.status === "rejected"
                                ? "Rejeitado"
                                : bid.status === "counter"
                                  ? "Contra-proposta"
                                  : "Pendente"}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {bids.length > 0 && (
                  <Pagination
                    currentPage={bidsPage}
                    totalPages={Math.ceil(bidsCount / pageSize)}
                    onPageChange={setBidsPage}
                    totalItems={bidsCount}
                    itemsPerPage={pageSize}
                  />
                )}
              </motion.div>
            )}

            {tab === "schedules" && (
              <motion.div
                key="schedules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {schedules.length === 0 ? (
                  <div className="card-solid py-12 text-center">
                    <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhuma obra agendada</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Aceite um projeto e defina suas datas para agendar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((sched, i) => {
                      const now = new Date();
                      const start = new Date(sched.start_date);
                      const end = new Date(sched.end_date);
                      const isActive = now >= start && now <= end;
                      const isPast = now > end;

                      return (
                        <motion.div
                          key={sched.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`card-solid border-l-4 ${isActive ? "border-l-emerald-400" : isPast ? "border-l-gray-200" : "border-l-blue-400"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-gray-900">
                                {sched.project?.title || "Projeto"}
                              </h4>
                              <div className="mt-1.5 flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(sched.start_date)} → {formatDate(sched.end_date)}
                                </span>
                                {sched.deadline && (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    Prazo: {formatDate(sched.deadline)}
                                  </span>
                                )}
                              </div>
                              {sched.notes && (
                                <p className="mt-1 text-xs text-gray-400">{sched.notes}</p>
                              )}
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : isPast
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isActive ? "Em andamento" : isPast ? "Concluído" : "Futuro"}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {schedules.length > 0 && (
                  <Pagination
                    currentPage={schedulesPage}
                    totalPages={Math.ceil(schedulesCount / pageSize)}
                    onPageChange={setSchedulesPage}
                    totalItems={schedulesCount}
                    itemsPerPage={pageSize}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  );
}
