/**
 * Lances do Projeto — dono do projeto vê propostas, aceita, rejeita ou contra-propõe.
 */
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getProjectBids, updateBid, createBid } from "@/services/bids";
import { getProjectInvitations } from "@/services/invitations";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Gavel,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Send,
  AlertCircle,
  X,
  HardHat,
  StickyNote,
  MessageSquare,
} from "lucide-react";
import type { ProjectBidWithDetails, ProjectInvitationWithDetails } from "@/types/database";
import Link from "next/link";

export default function ProjectBidsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const supabase = createClient();

  const [bids, setBids] = useState<ProjectBidWithDetails[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitationWithDetails[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Counter-offer form
  const [counterBidId, setCounterBidId] = useState<string | null>(null);
  const [counterForm, setCounterForm] = useState({ total_price: "", note: "" });
  const [counterSupplierId, setCounterSupplierId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [bidData, invData] = await Promise.all([
        getProjectBids(supabase, projectId),
        getProjectInvitations(supabase, projectId),
      ]);

      const { data: project } = await supabase
        .from("projects")
        .select("title")
        .eq("id", projectId)
        .single();

      setBids(bidData);
      setInvitations(invData);
      setProjectTitle(project?.title || "Projeto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar lances");
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleBidAction(bidId: string, status: "accepted" | "rejected") {
    setActionLoading(bidId);
    try {
      await updateBid(supabase, bidId, { status });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar lance");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCounterOffer() {
    if (!counterBidId || !counterSupplierId) return;
    setActionLoading(counterBidId);
    try {
      // Marcar lance original como counter
      await updateBid(supabase, counterBidId, { status: "counter" });
      // Criar novo lance (contra-proposta do dono)
      await createBid(supabase, {
        project_id: projectId,
        supplier_id: counterSupplierId,
        bid_type: "total",
        total_price: Number(counterForm.total_price) || 0,
        items_detail: null,
        status: "pending",
        note: counterForm.note || null,
        parent_bid_id: counterBidId,
      });
      setCounterBidId(null);
      setCounterForm({ total_price: "", note: "" });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar contra-proposta");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  // Group bids by supplier
  const supplierBids = new Map<string, ProjectBidWithDetails[]>();
  bids.forEach((bid) => {
    const key = bid.supplier_id;
    if (!supplierBids.has(key)) supplierBids.set(key, []);
    supplierBids.get(key)!.push(bid);
  });

  const acceptedSuppliers = invitations.filter((i) => i.status === "accepted");

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          <Link
            href={`/projects/${projectId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 shadow-glow">
                <Gavel className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Lances & Propostas
                </h1>
                <p className="text-sm text-gray-500">{projectTitle}</p>
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

          {/* Summary */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="card-solid flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <HardHat className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">{acceptedSuppliers.length}</p>
                <p className="text-xs text-gray-500">Fornecedores convidados</p>
              </div>
            </div>
            <div className="card-solid flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Gavel className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">
                  {bids.filter((b) => b.status === "pending").length}
                </p>
                <p className="text-xs text-gray-500">Lances pendentes</p>
              </div>
            </div>
            <div className="card-solid flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">
                  {bids.filter((b) => b.status === "accepted").length}
                </p>
                <p className="text-xs text-gray-500">Lances aceitos</p>
              </div>
            </div>
          </div>

          {/* Bids by Supplier */}
          {bids.length === 0 ? (
            <div className="card-solid py-12 text-center">
              <Gavel className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900">Nenhum lance recebido</h3>
              <p className="mt-1 text-sm text-gray-500">
                Convide fornecedores pelo Marketplace para começar a receber propostas.
              </p>
              <Link href="/marketplace" className="btn-primary mt-4 inline-flex">
                <HardHat className="h-4 w-4" /> Ir ao Marketplace
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(supplierBids.entries()).map(([supplierId, supplierBidList]) => {
                const supplierName = supplierBidList[0]?.supplier?.name || "Fornecedor";
                const latestBid = supplierBidList[0]; // sorted by created_at desc

                return (
                  <motion.div
                    key={supplierId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-solid"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                        <HardHat className="h-5 w-5 text-orange" />
                      </div>
                      <h3 className="font-bold text-gray-900">{supplierName}</h3>
                    </div>

                    {/* Thread of bids */}
                    <div className="space-y-2 border-l-2 border-gray-100 pl-4 ml-5">
                      {supplierBidList.reverse().map((bid) => (
                        <div
                          key={bid.id}
                          className={`rounded-xl p-3 ${bid.parent_bid_id ? "bg-blue-50" : "bg-surface-100"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="text-lg font-bold text-gray-900">
                                R${" "}
                                {(bid.total_price ?? 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              {bid.parent_bid_id && (
                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <MessageSquare className="mr-1 inline h-3 w-3" />
                                  Contra-proposta
                                </span>
                              )}
                            </div>
                            <span
                              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                bid.status === "accepted"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : bid.status === "rejected"
                                    ? "bg-red-50 text-red-700"
                                    : bid.status === "counter"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {bid.status === "accepted" && <CheckCircle2 className="h-3 w-3" />}
                              {bid.status === "rejected" && <XCircle className="h-3 w-3" />}
                              {bid.status === "pending" && <Clock className="h-3 w-3" />}
                              {bid.status === "counter" && <TrendingUp className="h-3 w-3" />}
                              {bid.status === "accepted"
                                ? "Aceito"
                                : bid.status === "rejected"
                                  ? "Rejeitado"
                                  : bid.status === "counter"
                                    ? "Contra-proposta"
                                    : "Pendente"}
                            </span>
                          </div>
                          {bid.note && (
                            <p className="mt-1 text-sm text-gray-500">
                              <StickyNote className="mr-1 inline h-3 w-3" />
                              {bid.note}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(bid.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Actions for latest pending bid */}
                    {latestBid.status === "pending" && (
                      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleBidAction(latestBid.id, "accepted")}
                          disabled={actionLoading === latestBid.id}
                          className="btn-primary text-sm"
                        >
                          {actionLoading === latestBid.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleBidAction(latestBid.id, "rejected")}
                          disabled={actionLoading === latestBid.id}
                          className="btn-ghost text-sm text-red-600"
                        >
                          <XCircle className="h-4 w-4" /> Recusar
                        </button>
                        <button
                          onClick={() => {
                            setCounterBidId(latestBid.id);
                            setCounterSupplierId(latestBid.supplier_id);
                            setCounterForm({ total_price: "", note: "" });
                          }}
                          className="btn-ghost text-sm text-amber-600"
                        >
                          <TrendingUp className="h-4 w-4" /> Contra-proposta
                        </button>
                      </div>
                    )}

                    {/* Counter-offer form */}
                    <AnimatePresence>
                      {counterBidId === latestBid.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden rounded-xl bg-amber-50 p-4"
                        >
                          <h5 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                            <TrendingUp className="h-4 w-4 text-amber-600" /> Enviar Contra-proposta
                          </h5>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Novo valor (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={counterForm.total_price}
                                onChange={(e) =>
                                  setCounterForm({ ...counterForm, total_price: e.target.value })
                                }
                                className="input"
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Mensagem
                              </label>
                              <input
                                type="text"
                                value={counterForm.note}
                                onChange={(e) =>
                                  setCounterForm({ ...counterForm, note: e.target.value })
                                }
                                className="input"
                                placeholder="Justificativa..."
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => setCounterBidId(null)}
                              className="btn-ghost text-xs"
                            >
                              <X className="h-3 w-3" /> Cancelar
                            </button>
                            <button
                              onClick={handleCounterOffer}
                              disabled={!counterForm.total_price || actionLoading === counterBidId}
                              className="btn-primary text-xs"
                            >
                              {actionLoading === counterBidId ? (
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
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
