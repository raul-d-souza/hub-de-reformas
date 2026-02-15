/**
 * Meus Serviços — gerenciamento do catálogo de serviços/materiais do fornecedor.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useProfile } from "@/hooks/useProfile";
import {
  getSupplierServices,
  createSupplierService,
  updateSupplierService,
  deleteSupplierService,
} from "@/services/supplierServices";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Wrench,
  Package,
  Users,
  DollarSign,
  HardHat,
  Search,
  AlertCircle,
} from "lucide-react";
import type { SupplierService, SupplierServiceInsert } from "@/types/database";
import Pagination from "@/components/Pagination";

const CATEGORIES = [
  { value: "service", label: "Serviço", icon: Wrench, color: "text-blue-600 bg-blue-50" },
  { value: "material", label: "Material", icon: Package, color: "text-emerald-600 bg-emerald-50" },
  { value: "labor", label: "Mão de obra", icon: Users, color: "text-purple-600 bg-purple-50" },
] as const;

const UNITS = ["un", "m²", "m³", "m", "kg", "hora", "diária", "vb", "pç", "cx", "lt"];

export default function MyServicesPage() {
  const { user, profile, supplier, loading: profileLoading } = useProfile();
  const supabase = createClient();

  const [services, setServices] = useState<SupplierService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "service" as "service" | "material" | "labor",
    unit: "un",
    unit_price: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!supplier) return;
    setLoading(true);
    try {
      const result = await getSupplierServices(supabase, supplier.id, {
        page,
        pageSize,
        search: search || undefined,
        category: filterCategory,
      });
      setServices(result.data);
      setTotalCount(result.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar serviços");
    } finally {
      setLoading(false);
    }
  }, [supplier, supabase, page, search, filterCategory]);

  useEffect(() => {
    if (!profileLoading && supplier) fetchServices();
    else if (!profileLoading) setLoading(false);
  }, [profileLoading, supplier, fetchServices]);

  function openNewForm() {
    setEditingId(null);
    setFormData({ name: "", description: "", category: "service", unit: "un", unit_price: "" });
    setShowForm(true);
  }

  function openEditForm(service: SupplierService) {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category as "service" | "material" | "labor",
      unit: service.unit,
      unit_price: String(service.unit_price),
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!supplier) return;
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateSupplierService(supabase, editingId, {
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          unit: formData.unit,
          unit_price: Number(formData.unit_price) || 0,
        });
      } else {
        const insert: SupplierServiceInsert = {
          supplier_id: supplier.id,
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          unit: formData.unit,
          unit_price: Number(formData.unit_price) || 0,
        };
        await createSupplierService(supabase, insert);
      }
      setShowForm(false);
      setEditingId(null);
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este serviço?")) return;
    try {
      await deleteSupplierService(supabase, id);
      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1); // Reset to first page on search
  }

  function handleCategoryFilter(category: string) {
    setFilterCategory(category);
    setPage(1); // Reset to first page on filter change
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
          <p className="mt-2 text-gray-500">Esta página é exclusiva para fornecedores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange to-orange-400 shadow-glow">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  Meus Serviços
                </h1>
                <p className="text-sm text-gray-500">
                  Gerencie seu catálogo de serviços e materiais
                </p>
              </div>
            </div>
            <button onClick={openNewForm} className="btn-primary">
              <Plus className="h-4 w-4" />
              Novo Serviço
            </button>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="alert-error mb-6 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 text-red-500" />
              {error}
            </motion.div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCategoryFilter("all")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  filterCategory === "all"
                    ? "bg-navy text-white shadow-soft"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryFilter(cat.value)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    filterCategory === cat.value
                      ? "bg-navy text-white shadow-soft"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="card-solid">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                    {editingId ? (
                      <Pencil className="h-5 w-5 text-orange" />
                    ) : (
                      <Plus className="h-5 w-5 text-orange" />
                    )}
                    {editingId ? "Editar Serviço" : "Novo Serviço"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input"
                        placeholder="Ex: Instalação elétrica"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input"
                        rows={2}
                        placeholder="Descrição detalhada do serviço..."
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category: e.target.value as "service" | "material" | "labor",
                          })
                        }
                        className="input"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Unidade
                        </label>
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="input"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Preço (R$)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.unit_price}
                            onChange={(e) =>
                              setFormData({ ...formData, unit_price: e.target.value })
                            }
                            className="input pl-9"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                      }}
                      className="btn-ghost"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !formData.name}
                      className="btn-primary"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {editingId ? "Salvar" : "Adicionar"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Service List */}
          {!loading && services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-solid py-12 text-center"
            >
              <HardHat className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900">
                {search || filterCategory !== "all"
                  ? "Nenhum serviço encontrado"
                  : "Nenhum serviço cadastrado"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || filterCategory !== "all"
                  ? "Tente ajustar seus filtros"
                  : "Adicione seus serviços e materiais para que clientes possam encontrá-lo."}
              </p>
              {!search && filterCategory === "all" && (
                <button onClick={openNewForm} className="btn-primary mt-4 inline-flex">
                  <Plus className="h-4 w-4" /> Adicionar primeiro serviço
                </button>
              )}
            </motion.div>
          ) : services.length === 0 ? (
            <div className="card-solid py-16 text-center">
              <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900">
                {search || filterCategory !== "all"
                  ? "Nenhum serviço encontrado"
                  : "Nenhum serviço cadastrado"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || filterCategory !== "all"
                  ? "Tente ajustar seus filtros"
                  : "Comece adicionando seus serviços e materiais"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {services.map((service, i) => {
                  const cat = CATEGORIES.find((c) => c.value === service.category) || CATEGORIES[0];
                  return (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card-solid group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.color}`}
                        >
                          <cat.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {service.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            <span className="rounded-md bg-surface-100 px-2 py-0.5">
                              {cat.label}
                            </span>
                            <span>{service.unit}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-orange">
                          {formatCurrency(service.unit_price)}
                        </span>
                        <span className="text-xs text-gray-400">/{service.unit}</span>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEditForm(service)} className="btn-ghost !p-2">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="btn-ghost !p-2 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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
        </main>
      </div>
      <Footer />
    </div>
  );
}
