/**
 * Lista de projetos — design premium com filtros animados, grid responsivo e paginação elegante.
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getProjects } from "@/services/projects";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProjectCard from "@/components/ProjectCard";
import Pagination from "@/components/Pagination";
import type { Project, ProjectStatus } from "@/types/database";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Loader2, FolderKanban } from "lucide-react";

const STATUS_OPTIONS: { label: string; value: ProjectStatus | "" }[] = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "draft" },
  { label: "Ativo", value: "active" },
  { label: "Pausado", value: "paused" },
  { label: "Concluído", value: "done" },
];

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

export default function ProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const result = await getProjects(supabase, page, statusFilter || undefined);
        setProjects(result.data);
        setTotalCount(result.count);
      } catch (err) {
        console.error("Erro ao carregar projetos:", err);
      }
      setIsLoading(false);
    }
    load();
  }, [page, statusFilter, supabase]);

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="page-container">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.08 } } }}
        >
          {/* Page header */}
          <motion.div
            variants={fadeUp}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Projetos</h1>
              <p className="mt-1 text-sm text-gray-500">
                {totalCount} projeto{totalCount !== 1 ? "s" : ""} encontrado
                {totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/projects/new" className="btn-accent">
              <Plus className="h-4 w-4" />
              Novo Projeto
            </Link>
          </motion.div>

          {/* Status filter pills */}
          <motion.div variants={fadeUp} className="mb-6 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  statusFilter === opt.value
                    ? "bg-navy text-white shadow-sm"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeUp}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-navy" />
              </div>
            ) : projects.length === 0 ? (
              <div className="card-solid empty-state">
                <div className="empty-state-icon">
                  <FolderKanban className="h-12 w-12 text-gray-300 mx-auto" />
                </div>
                <p className="empty-state-title">Nenhum projeto encontrado</p>
                <p className="empty-state-text">
                  {statusFilter
                    ? "Tente outro filtro ou crie um novo projeto."
                    : "Comece criando seu primeiro projeto de reforma."}
                </p>
                <Link href="/projects/new" className="btn-accent mt-6">
                  <Plus className="h-4 w-4" />
                  Criar primeiro projeto
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalCount}
                    itemsPerPage={pageSize}
                  />
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
