/**
 * Marketplace — clientes navegam pelos fornecedores disponíveis.
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  MapPin,
  Wrench,
  Phone,
  Mail,
  Globe,
  Loader2,
  AlertCircle,
  HardHat,
  Building2,
  ChevronRight,
  Crown,
} from "lucide-react";
import type { Supplier, Profile } from "@/types/database";
import { formatCnpj } from "@/lib/validations";
import Link from "next/link";
import Pagination from "@/components/Pagination";

interface SupplierWithProfile extends Supplier {
  profile?: Profile | null;
  isOwn?: boolean;
}

export default function MarketplacePage() {
  const supabase = createClient();
  useAuth();
  const { supplier: ownSupplier } = useProfile();
  const [suppliers, setSuppliers] = useState<SupplierWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allSuppliers, setAllSuppliers] = useState<SupplierWithProfile[]>([]);
  const pageSize = 12;

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        // Buscar fornecedores que têm user_id (registrados na plataforma)
        const { data, error, count } = await supabase
          .from("suppliers")
          .select("*", { count: "exact" })
          .not("user_id", "is", null)
          .order("rating", { ascending: false });

        if (error) throw error;

        // Buscar profiles dos fornecedores para dados extras
        const userIds = (data || []).map((s: Supplier) => s.user_id).filter(Boolean);
        let profiles: Profile[] = [];
        if (userIds.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);
          profiles = profileData || [];
        }

        const enriched = (data || []).map((s: Supplier) => ({
          ...s,
          profile: profiles.find((p) => p.id === s.user_id) || null,
          isOwn: ownSupplier?.id === s.id,
        }));

        // Se for fornecedor, colocar o próprio perfil primeiro
        if (ownSupplier) {
          const ownIndex = enriched.findIndex((s) => s.id === ownSupplier.id);
          if (ownIndex > 0) {
            const [own] = enriched.splice(ownIndex, 1);
            enriched.unshift(own);
          }
        }

        setAllSuppliers(enriched);
        setTotalCount(count || enriched.length);
        applyFiltersAndPagination(enriched, 1, "", "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar marketplace");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [supabase, ownSupplier]);

  // Apply filters and pagination
  function applyFiltersAndPagination(
    data: SupplierWithProfile[],
    targetPage: number,
    searchTerm: string,
    specialty: string,
  ) {
    const filtered = data.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.profile?.company_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contact_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.profile?.specialty || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.profile?.city || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchSpecialty = !specialty || s.profile?.specialty === specialty;
      return matchSearch && matchSpecialty;
    });

    const start = (targetPage - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    setSuppliers(paginated);
    setTotalCount(filtered.length);
    setPage(targetPage);
  }

  function handleSearch(value: string) {
    setSearch(value);
    applyFiltersAndPagination(allSuppliers, 1, value, filterSpecialty);
  }

  function handleSpecialtyFilter(specialty: string) {
    setFilterSpecialty(specialty);
    applyFiltersAndPagination(allSuppliers, 1, search, specialty);
  }

  function handlePageChange(newPage: number) {
    applyFiltersAndPagination(allSuppliers, newPage, search, filterSpecialty);
  }

  const specialties = [...new Set(allSuppliers.map((s) => s.profile?.specialty).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-600 shadow-glow">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Marketplace
                </h1>
                <p className="text-sm text-gray-500">
                  Encontre fornecedores qualificados para sua obra
                </p>
              </div>
            </div>
          </motion.div>

          {error && (
            <div className="alert-error mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              {error}
            </div>
          )}

          {/* Search & Filter */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, especialidade, cidade..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            {specialties.length > 0 && (
              <select
                value={filterSpecialty}
                onChange={(e) => handleSpecialtyFilter(e.target.value)}
                className="input max-w-[200px]"
              >
                <option value="">Todas especialidades</option>
                {specialties.map((s) => (
                  <option key={s} value={s!}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Results */}
          {suppliers.length === 0 && !loading ? (
            <div className="card-solid py-12 text-center">
              <HardHat className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900">Nenhum fornecedor encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/marketplace/${s.id}`}
                      className={`card-solid group flex flex-col h-full transition-shadow hover:shadow-elevated ${
                        s.isOwn ? "ring-2 ring-orange-400" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            s.isOwn
                              ? "bg-gradient-to-br from-orange to-orange-400"
                              : "bg-gradient-to-br from-orange-50 to-orange-100"
                          }`}
                        >
                          <HardHat
                            className={`h-6 w-6 ${s.isOwn ? "text-white" : "text-orange"}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 truncate">
                              {s.profile?.company_name || s.name}
                            </h3>
                            {s.isOwn && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                <Crown className="h-3 w-3" /> Seu Perfil
                              </span>
                            )}
                          </div>
                          {s.contact_name && (
                            <p className="text-sm text-gray-500 truncate">{s.contact_name}</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-navy transition-colors shrink-0" />
                      </div>

                      {/* Info */}
                      <div className="mt-3 space-y-1.5">
                        {s.profile?.specialty && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Wrench className="h-3.5 w-3.5 text-gray-400" />
                            {s.profile.specialty}
                          </div>
                        )}
                        {s.profile?.city && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {s.profile.city}
                            {s.profile.state ? `, ${s.profile.state}` : ""}
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{s.email}</span>
                          </div>
                        )}
                        {s.website && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Globe className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{s.website}</span>
                          </div>
                        )}
                        {s.cnpj && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-mono text-xs">{formatCnpj(s.cnpj)}</span>
                          </div>
                        )}
                      </div>

                      {/* Rating & Bio */}
                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-4 w-4 ${idx < Math.round(s.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                            />
                          ))}
                          <span className="ml-1 text-xs font-medium text-gray-500">
                            {s.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {s.profile?.bio && (
                        <p className="mt-2 text-xs text-gray-400 line-clamp-2">{s.profile.bio}</p>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={handlePageChange}
                totalItems={totalCount}
                itemsPerPage={pageSize}
              />
            </>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}
