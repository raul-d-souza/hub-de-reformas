/**
 * Lista de fornecedores — design premium com busca interativa, cards, estrelas e paginação.
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { deleteSupplier } from "@/services/suppliers";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import type { Supplier, Profile } from "@/types/database";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Globe,
  Trash2,
  Star,
  Truck,
  Loader2,
  Filter,
} from "lucide-react";

export default function SuppliersPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<(Supplier & { profile?: Profile | null })[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "rating">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const pageSize = 12;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const offset = (page - 1) * pageSize;

        let query = supabase
          .from("suppliers")
          .select("*", { count: "exact" })
          .range(offset, offset + pageSize - 1);

        // Aplicar busca
        if (search) {
          query = query.or(
            `name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`,
          );
        }

        // Aplicar ordenação
        query = query.order(sortBy, { ascending: sortOrder === "asc" });

        const { data, count, error } = await query;

        if (error) throw error;

        // Buscar profiles para mostrar nome fantasia (company_name)
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
        }));

        setSuppliers(enriched);
        setTotalCount(count || 0);
      } catch (err) {
        console.error("Erro ao carregar fornecedores:", err);
      }
      setIsLoading(false);
    }
    load();
  }, [supabase, page, search, sortBy, sortOrder]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este fornecedor?")) return;
    try {
      await deleteSupplier(supabase, id);
      // Recarregar a página atual
      const offset = (page - 1) * pageSize;
      const { data, count } = await supabase
        .from("suppliers")
        .select("*", { count: "exact" })
        .range(offset, offset + pageSize - 1)
        .order(sortBy, { ascending: sortOrder === "asc" });

      const userIds = (data || []).map((s: Supplier) => s.user_id).filter(Boolean);
      let profiles: Profile[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase.from("profiles").select("*").in("id", userIds);
        profiles = profileData || [];
      }

      const enriched = (data || []).map((s: Supplier) => ({
        ...s,
        profile: profiles.find((p) => p.id === s.user_id) || null,
      }));

      setSuppliers(enriched);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1); // Voltar para primeira página ao buscar
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="page-container">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Fornecedores</h1>
              <p className="mt-1 text-sm text-gray-500">
                {totalCount} fornecedor{totalCount !== 1 ? "es" : ""} cadastrado
                {totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/suppliers/new" className="btn-accent">
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, contato ou email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-10"
                aria-label="Buscar fornecedores"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "rating")}
                className="input max-w-[150px]"
                aria-label="Ordenar por"
              >
                <option value="name">Nome</option>
                <option value="rating">Avaliação</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="btn-ghost px-3"
                aria-label="Inverter ordenação"
                title={sortOrder === "asc" ? "Ordem crescente" : "Ordem decrescente"}
              >
                <Filter
                  className={`h-4 w-4 ${sortOrder === "desc" ? "rotate-180" : ""} transition-transform`}
                />
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-navy" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="card-solid py-16 text-center">
              <Truck className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900">
                {search ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? "Tente ajustar sua busca" : "Comece adicionando seu primeiro fornecedor"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((supplier, index) => (
                  <motion.div
                    key={supplier.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/marketplace/${supplier.id}`}
                      className="card-interactive block h-full"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">
                            {supplier.profile?.company_name || supplier.name}
                          </h3>
                          {supplier.contact_name && (
                            <p className="text-sm text-gray-500 mt-0.5">{supplier.contact_name}</p>
                          )}
                        </div>
                        {renderStars(supplier.rating)}
                      </div>

                      <div className="space-y-2 text-sm text-gray-500">
                        {supplier.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate text-navy">
                              {supplier.website.replace(/^https?:\/\//, "")}
                            </span>
                          </div>
                        )}
                      </div>

                      {user && supplier.owner_id === user.id && (
                        <div className="mt-4 pt-3 border-t border-gray-50">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(supplier.id);
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={setPage}
                totalItems={totalCount}
                itemsPerPage={pageSize}
              />
            </>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
