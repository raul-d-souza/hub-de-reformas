/**
 * Sidebar — navegação lateral com ícones Lucide, indicador animado e suporte a roles.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  User,
  X,
  HardHat,
  Wrench,
  Gavel,
  Building2,
} from "lucide-react";

const CLIENT_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/marketplace", label: "Marketplace", icon: Building2 },
  { href: "/profile", label: "Perfil", icon: User },
];

const SUPPLIER_LINKS = [
  { href: "/supplier-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-services", label: "Meus Serviços", icon: Wrench },
  { href: "/my-bids", label: "Lances & Convites", icon: Gavel },
  { href: "/marketplace", label: "Marketplace", icon: Building2 },
  { href: "/profile", label: "Perfil", icon: User },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isSupplier } = useProfile();

  const links = isSupplier ? SUPPLIER_LINKS : CLIENT_LINKS;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -260, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-100 bg-white/90 pt-16 backdrop-blur-xl lg:static lg:pt-0"
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            aria-label="Fechar sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <nav className="flex flex-col gap-1 p-4">
          {isSupplier && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700">
              <HardHat className="h-4 w-4" />
              Modo Fornecedor
            </div>
          )}
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive ? "text-navy" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 rounded-xl bg-navy-50 border border-navy-100"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </AnimatePresence>
  );
}
