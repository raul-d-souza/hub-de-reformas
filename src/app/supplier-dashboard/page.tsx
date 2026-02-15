/**
 * Dashboard do Fornecedor — visão geral com convites, lances, agenda e presença.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useProfile } from "@/hooks/useProfile";
import { getSupplierInvitations } from "@/services/invitations";
import { getSupplierBids } from "@/services/bids";
import { getSupplierSchedules } from "@/services/schedules";
import { getAllSupplierAttendance } from "@/services/attendance";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  Mail,
  Gavel,
  Calendar,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  HardHat,
  Wrench,
  TrendingUp,
} from "lucide-react";
import type {
  ProjectInvitationWithDetails,
  ProjectBidWithDetails,
  SupplierScheduleWithDetails,
  AttendanceRecord,
} from "@/types/database";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export default function SupplierDashboardPage() {
  const { user, profile, supplier, loading: profileLoading } = useProfile();
  const supabase = createClient();

  const [invitations, setInvitations] = useState<ProjectInvitationWithDetails[]>([]);
  const [bids, setBids] = useState<ProjectBidWithDetails[]>([]);
  const [schedules, setSchedules] = useState<SupplierScheduleWithDetails[]>([]);
  const [attendance, setAttendance] = useState<
    (AttendanceRecord & { project: { id: string; title: string } })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supplier) return;
    try {
      const [invResult, bidResult, schedResult, att] = await Promise.all([
        getSupplierInvitations(supabase, supplier.id, { pageSize: 5 }),
        getSupplierBids(supabase, supplier.id, { pageSize: 5 }),
        getSupplierSchedules(supabase, supplier.id, { pageSize: 5 }),
        getAllSupplierAttendance(supabase, supplier.id),
      ]);
      setInvitations(invResult.data);
      setBids(bidResult.data);
      setSchedules(schedResult.data);
      setAttendance(att);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [supplier, supabase]);

  useEffect(() => {
    if (!profileLoading && supplier) fetchData();
    else if (!profileLoading) setLoading(false);
  }, [profileLoading, supplier, fetchData]);

  // Redirecionar se não for fornecedor (antes de qualquer return)
  useEffect(() => {
    // Só redirecionar se: não está carregando E tem usuário E tem profile E não é supplier
    if (!profileLoading && user && profile && profile.role !== "supplier") {
      window.location.href = "/projects";
    }
  }, [user, profile, profileLoading]);

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
        <Loader2 className="h-8 w-8 animate-spin text-orange" />
      </div>
    );
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const activeProjects = schedules.filter((s) => new Date(s.end_date) >= new Date());
  const pendingBids = bids.filter((b) => b.status === "pending");
  const recentAttendance = attendance.slice(0, 5);

  const stats = [
    {
      label: "Convites Pendentes",
      value: pendingInvitations.length,
      icon: Mail,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/my-bids",
    },
    {
      label: "Lances Abertos",
      value: pendingBids.length,
      icon: Gavel,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/my-bids",
    },
    {
      label: "Projetos Ativos",
      value: activeProjects.length,
      icon: Building2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/my-bids",
    },
    {
      label: "Presenças (mês)",
      value: attendance.filter((a) => new Date(a.date).getMonth() === new Date().getMonth()).length,
      icon: ClipboardCheck,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/my-bids",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange to-orange-400 shadow-glow">
                <HardHat className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  Olá, {profile.full_name || "Fornecedor"}!
                </h1>
                <p className="text-gray-500">
                  {supplier?.name || profile.company_name || "Seu painel de fornecedor"}
                  {profile.specialty && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                      <Wrench className="h-3 w-3" />
                      {profile.specialty}
                    </span>
                  )}
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
              <AlertTriangle className="h-4 w-4 text-red-500" />
              {error}
            </motion.div>
          )}

          {/* Stats cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Link
                  href={stat.href}
                  className="card-solid group flex items-center gap-4 transition-shadow hover:shadow-elevated"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Convites Pendentes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card-solid"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Convites Pendentes
                </h2>
                <Link
                  href="/my-bids"
                  className="text-sm font-medium text-navy hover:text-navy-600 transition-colors flex items-center gap-1"
                >
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {pendingInvitations.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum convite pendente</p>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.slice(0, 4).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-xl bg-surface-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {inv.project?.title || "Projeto"}
                        </p>
                        {inv.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{inv.message}</p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        <Clock className="h-3 w-3" />
                        Pendente
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Lances Recentes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-solid"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Gavel className="h-5 w-5 text-amber-600" />
                  Lances Recentes
                </h2>
                <Link
                  href="/my-bids"
                  className="text-sm font-medium text-navy hover:text-navy-600 transition-colors flex items-center gap-1"
                >
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {bids.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum lance enviado</p>
              ) : (
                <div className="space-y-3">
                  {bids.slice(0, 4).map((bid) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between rounded-xl bg-surface-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {bid.bid_type === "total" ? "Preço total" : "Por item"}{" "}
                          {bid.total_price != null && (
                            <span className="text-orange font-bold">
                              {formatCurrency(bid.total_price)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(bid.created_at)}</p>
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
                  ))}
                </div>
              )}
            </motion.div>

            {/* Agenda */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card-solid"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Agenda de Obras
                </h2>
              </div>
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhuma obra agendada</p>
              ) : (
                <div className="space-y-3">
                  {schedules.slice(0, 4).map((sched) => (
                    <div key={sched.id} className="rounded-xl bg-surface-100 p-3">
                      <p className="font-semibold text-gray-900 text-sm">
                        {sched.project?.title || "Projeto"}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>
                          {formatDate(sched.start_date)} → {formatDate(sched.end_date)}
                        </span>
                        {sched.deadline && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            Prazo: {formatDate(sched.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Presenças Recentes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="card-solid"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                  Presenças Recentes
                </h2>
              </div>
              {recentAttendance.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Nenhuma presença registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAttendance.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-xl bg-surface-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {att.project?.title || "Projeto"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(att.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {att.check_in && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">
                            {new Date(att.check_in).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {att.check_out && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600">
                            {new Date(att.check_out).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 rounded-2xl bg-gradient-to-r from-orange to-orange-400 p-6 text-white shadow-glow"
          >
            <h3 className="text-lg font-bold">Ações Rápidas</h3>
            <p className="mt-1 text-sm text-orange-100">
              Gerencie seus serviços e encontre novos projetos
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/my-services"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <Wrench className="h-4 w-4" />
                Meus Serviços
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <Building2 className="h-4 w-4" />
                Marketplace
              </Link>
              <Link
                href="/my-bids"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <Gavel className="h-4 w-4" />
                Meus Lances
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
