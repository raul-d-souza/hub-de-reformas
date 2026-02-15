/**
 * Header — barra de navegação premium com glassmorphism, indicador ativo
 * animado, menu mobile com transições suaves, e avatar do usuário.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  Building2,
  Wrench,
  Gavel,
  User,
  LogOut,
  Menu,
  X,
  LogIn,
  ChevronDown,
} from "lucide-react";

const CLIENT_NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/marketplace", label: "Marketplace", icon: Building2 },
];

const SUPPLIER_NAV_LINKS = [
  { href: "/supplier-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-services", label: "Serviços", icon: Wrench },
  { href: "/my-bids", label: "Lances", icon: Gavel },
  { href: "/marketplace", label: "Marketplace", icon: Building2 },
];

export default function Header() {
  const { user, signOut } = useAuth();
  const { isSupplier } = useProfile();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/40 bg-white/70 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-white/90 backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Ir para o Dashboard">
          <div className="relative">
            <Image
              src="/assets/logo.svg"
              alt="Hub de Reformas"
              width={34}
              height={34}
              priority
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <span className="hidden text-lg font-extrabold tracking-tight text-navy sm:inline">
            Hub<span className="text-orange">.</span>Reformas
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {(isSupplier ? SUPPLIER_NAV_LINKS : CLIENT_NAV_LINKS).map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${active ? "text-navy" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl bg-navy-50 border border-navy-100"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50"
                aria-expanded={profileOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-600 text-xs font-bold text-white shadow-sm">
                  {initials}
                </div>
                <span className="max-w-[120px] truncate text-sm font-medium text-gray-700">
                  {user.user_metadata?.full_name || "Usuário"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-elevated"
                  >
                    <div className="border-b border-gray-50 px-3 py-2.5 mb-1">
                      <p className="text-xs font-medium text-gray-500">Conectado como</p>
                      <p className="truncate text-sm font-semibold text-gray-900">{user.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      Meu Perfil
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn-icon md:hidden"
          aria-label="Abrir menu de navegação"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {(isSupplier ? SUPPLIER_NAV_LINKS : CLIENT_NAV_LINKS).map((link) => {
                const active = isActive(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${active ? "bg-navy-50 text-navy font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-gray-100" />
              {user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <User className="h-5 w-5" />
                    Meu Perfil
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full justify-center"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
