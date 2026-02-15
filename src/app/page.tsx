/**
 * Dashboard — página inicial moderna com resumo animado,
 * cards de estatísticas, atalhos rápidos e projetos recentes.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectCard from "@/components/ProjectCard";
import type { Project } from "@/types/database";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  ClipboardList,
  Plus,
  ArrowRight,
  Sparkles,
  Loader2,
  FolderKanban,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { isSupplier, loading: profileLoading } = useProfile();
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<number>(0);
  const [totalProjects, setTotalProjects] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Fornecedores são redirecionados para seu dashboard
    if (isSupplier) {
      router.replace("/supplier-dashboard");
      return;
    }

    async function fetchDashboard() {
      const { data: projectsData, count } = await supabase
        .from("projects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(4);

      setProjects(projectsData ?? []);
      setTotalProjects(count ?? 0);

      const { count: quotesCount } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("chosen", false);

      setPendingQuotes(quotesCount ?? 0);
      setIsLoading(false);
    }

    fetchDashboard();
  }, [user, loading, profileLoading, isSupplier, router, supabase]);

  // Mostrar loading enquanto verifica autenticação e perfil
  if (loading || profileLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-navy" />
          <p className="text-sm font-medium text-gray-500">Carregando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  // Se for fornecedor, mostrar loading enquanto redireciona
  if (isSupplier) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-navy" />
          <p className="text-sm font-medium text-gray-500">Redirecionando...</p>
        </motion.div>
      </div>
    );
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Usuário";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="page-container">
        <motion.div initial="initial" animate="animate" variants={stagger}>
          {/* Hero greeting */}
          <motion.div variants={fadeUp} className="mb-8">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-500 mb-1">
              <Sparkles className="h-4 w-4" />
              {greeting}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Olá, <span className="text-gradient">{firstName}</span>!
            </h1>
            <p className="mt-2 text-gray-500 max-w-lg">
              Aqui está o resumo das suas reformas. Acompanhe projetos, cotações e mantenha tudo sob
              controle.
            </p>
          </motion.div>

          {/* Stat cards */}
          <motion.div variants={fadeUp} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="stat-card">
              <div className="stat-icon bg-navy-50">
                <Building2 className="h-6 w-6 text-navy" />
              </div>
              <div>
                <p className="stat-label">Total de Projetos</p>
                <p className="stat-value text-navy">{totalProjects}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon bg-orange-50">
                <ClipboardList className="h-6 w-6 text-orange" />
              </div>
              <div>
                <p className="stat-label">Cotações Pendentes</p>
                <p className="stat-value text-orange">{pendingQuotes}</p>
              </div>
            </div>

            <Link
              href="/projects/new"
              className="stat-card group sm:col-span-2 lg:col-span-1 hover:border-navy-100 hover:shadow-glow"
            >
              <div className="stat-icon bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <Plus className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-navy transition-colors">
                  Novo Projeto
                </p>
                <p className="text-xs text-gray-400">Criar uma nova obra</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-300 transition-all group-hover:text-navy group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={fadeUp} className="mb-8 flex flex-wrap gap-3">
            <Link href="/projects" className="btn-primary">
              <FolderKanban className="h-4 w-4" />
              Ver todos os projetos
            </Link>
            <Link href="/marketplace" className="btn-secondary">
              <Building2 className="h-4 w-4" />
              Marketplace
            </Link>
          </motion.div>

          {/* Recent projects */}
          <motion.section variants={fadeUp}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="section-title">Projetos Recentes</h2>
                <p className="section-subtitle">Últimas obras atualizadas</p>
              </div>
              {projects.length > 0 && (
                <Link
                  href="/projects"
                  className="flex items-center gap-1 text-sm font-medium text-navy hover:underline"
                >
                  Ver todos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="card-solid empty-state">
                <span className="empty-state-icon">🏗️</span>
                <p className="empty-state-title">Nenhum projeto ainda</p>
                <p className="empty-state-text">
                  Comece criando seu primeiro projeto para gerenciar sua reforma.
                </p>
                <Link href="/projects/new" className="btn-accent mt-6">
                  <Plus className="h-4 w-4" />
                  Criar primeiro projeto
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
