/**
 * ProjectCard — card premium de projeto com hover elevado, gradiente e ícones.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Project, ProjectStatus } from "@/types/database";

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

const STATUS_DOT: Record<ProjectStatus, string> = {
  draft: "bg-gray-400",
  active: "bg-emerald-400 animate-pulse-soft",
  paused: "bg-amber-400",
  done: "bg-navy",
};

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="group card-interactive block overflow-hidden"
      >
        {/* Accent bar */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${STATUS_DOT[project.status]}`} />
              <h3 className="font-bold text-gray-900 group-hover:text-navy transition-colors">
                {project.title}
              </h3>
            </div>
            {project.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-gray-500 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
          <span className={STATUS_BADGE[project.status]}>{STATUS_LABELS[project.status]}</span>
        </div>

        {project.address && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{project.address}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(project.start_date)}
              </span>
            )}
            {project.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(project.end_date)}
              </span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 transition-all duration-200 group-hover:text-navy group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}
