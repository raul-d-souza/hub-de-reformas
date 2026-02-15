/**
 * Comparador de cotações de um projeto — design premium.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { getProjectById } from "@/services/projects";
import { getQuotesByProject, chooseQuote, deleteQuote, createQuote } from "@/services/quotes";
import { getSuppliers } from "@/services/suppliers";
import { getItemsByProject } from "@/services/items";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import QuoteComparisonModal from "@/components/QuoteComparisonModal";
import type { Project, Supplier, Item, QuoteItem } from "@/types/database";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quoteSchema, type QuoteFormData } from "@/lib/validations";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  BarChart3,
  CheckCircle2,
  Trash2,
  Loader2,
  Save,
  X,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  StickyNote,
  DollarSign,
  Building2,
} from "lucide-react";

export default function ProjectQuotesPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quotes, setQuotes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { project_id: id, items_json: [], total_price: 0 },
  });

  const loadData = useCallback(async () => {
    try {
      const [projectData, quotesData, suppliersData, itemsData] = await Promise.all([
        getProjectById(supabase, id),
        getQuotesByProject(supabase, id),
        getSuppliers(supabase),
        getItemsByProject(supabase, id),
      ]);
      setProject(projectData);
      setQuotes(quotesData);
      setSuppliers(suppliersData);
      setItems(itemsData);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
    setIsLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleChoose(quoteId: string) {
    try {
      await chooseQuote(supabase, quoteId, id);
      await loadData();
    } catch (err) {
      console.error("Erro ao escolher cotação:", err);
    }
  }

  async function handleDeleteQuote(quoteId: string) {
    if (!confirm("Excluir esta cotação?")) return;
    try {
      await deleteQuote(supabase, quoteId);
      await loadData();
    } catch (err) {
      console.error("Erro ao excluir cotação:", err);
    }
  }

  async function onSubmitQuote(data: QuoteFormData) {
    if (!user) return;
    setFormError(null);

    const quoteItems: QuoteItem[] = items.map((item) => ({
      item_name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.estimated_unit_price,
      total: item.quantity * item.estimated_unit_price,
    }));

    const totalPrice = quoteItems.reduce((sum, qi) => sum + qi.total, 0);

    try {
      await createQuote(supabase, {
        supplier_id: data.supplier_id,
        project_id: id,
        total_price: data.total_price || totalPrice,
        items_json: quoteItems,
        expires_at: data.expires_at || null,
        note: data.note || null,
        chosen: false,
        owner_id: user.id,
      });
      reset();
      setShowForm(false);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar cotação");
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="text-sm text-gray-500">Carregando cotações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href={`/projects/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao projeto
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
                Cotações — {project?.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {quotes.length} cotação(ões) encontrada(s)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(true)}
                disabled={quotes.length < 2}
                className="btn-secondary disabled:opacity-50"
              >
                <BarChart3 className="h-4 w-4" />
                Comparar
              </button>
              <button onClick={() => setShowForm(!showForm)} className="btn-accent">
                {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm ? "Fechar" : "Nova Cotação"}
              </button>
            </div>
          </div>

          {/* Formulário de nova cotação */}
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit(onSubmitQuote)}
                className="card-solid mt-6 space-y-5 overflow-hidden"
              >
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <FileSpreadsheet className="h-5 w-5 text-navy" />
                  Nova Cotação
                </h3>

                {formError && (
                  <div className="alert-error flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    {formError}
                  </div>
                )}

                <input type="hidden" {...register("project_id")} value={id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="supplier_id"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Fornecedor *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select id="supplier_id" {...register("supplier_id")} className="input pl-10">
                        <option value="">Selecione...</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.supplier_id && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.supplier_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="total_price"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Preço Total (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="total_price"
                        type="number"
                        step="0.01"
                        {...register("total_price")}
                        className="input pl-10"
                        placeholder="0 = calcular automaticamente"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="expires_at"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Validade
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="expires_at"
                        type="date"
                        {...register("expires_at")}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="note"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Observação
                    </label>
                    <div className="relative">
                      <StickyNote className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="note"
                        type="text"
                        {...register("note")}
                        className="input pl-10"
                        placeholder="Notas adicionais..."
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  Os itens serão copiados automaticamente do projeto. Edite preços após criar.
                </p>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button type="submit" className="btn-primary">
                    <Save className="h-4 w-4" />
                    Salvar Cotação
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                    Cancelar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Lista de cotações */}
          <div className="mt-6 space-y-4">
            {quotes.length === 0 ? (
              <div className="empty-state">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 font-medium text-gray-500">Nenhuma cotação ainda.</p>
                <p className="text-sm text-gray-400">Crie a primeira clicando no botão acima!</p>
              </div>
            ) : (
              quotes.map((quote, i) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card-solid flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all ${
                    quote.chosen ? "ring-2 ring-green-400 bg-green-50/50" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {quote.suppliers?.name ?? "Fornecedor"}
                      </h3>
                      {quote.chosen && (
                        <span className="badge-active flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Escolhida
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-2xl font-bold text-navy">
                      {formatCurrency(quote.total_price)}
                    </p>
                    {quote.note && <p className="mt-1 text-sm text-gray-500">{quote.note}</p>}
                    <p className="mt-1 text-xs text-gray-400">
                      Criada em {new Date(quote.created_at).toLocaleDateString("pt-BR")}
                      {quote.expires_at &&
                        ` · Validade: ${new Date(quote.expires_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!quote.chosen && (
                      <button
                        onClick={() => handleChoose(quote.id)}
                        className="btn inline-flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Escolher
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>
      <Footer />

      {showModal && <QuoteComparisonModal quotes={quotes} onClose={() => setShowModal(false)} />}
    </div>
  );
}
