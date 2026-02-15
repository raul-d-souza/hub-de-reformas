/**
 * ItemList — lista de itens de uma obra com CRUD inline.
 * Client Component que gerencia criação, edição e exclusão de itens.
 * Inclui categorias, filtro, resumo de pagamento e vinculação de fornecedores.
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/format";
import { getItemsWithPaymentSummary, createItem, updateItem, deleteItem } from "@/services/items";
import { getSuppliers } from "@/services/suppliers";
import {
  getSuppliersByProject,
  addSupplierToItem,
  updateItemSupplier,
  removeSupplierFromItem,
} from "@/services/itemSuppliers";
import type {
  ItemPaymentSummary,
  PaymentCategory,
  Supplier,
  ItemSupplierWithDetails,
} from "@/types/database";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link2,
  Save,
  X,
  Store,
  Loader2,
} from "lucide-react";

interface ItemListProps {
  projectId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  material: "Material",
  labor: "Mão de Obra",
  service: "Serviço",
  other: "Outro",
};

const CATEGORY_COLORS: Record<string, string> = {
  material: "bg-blue-100 text-blue-800",
  labor: "bg-orange-100 text-orange-800",
  service: "bg-green-100 text-green-800",
  other: "bg-purple-100 text-purple-800",
};

type CategoryFilter = "all" | PaymentCategory;

export default function ItemList({ projectId }: ItemListProps) {
  const supabase = createClient();
  const [items, setItems] = useState<ItemPaymentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // Supplier states
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [itemSuppliersMap, setItemSuppliersMap] = useState<
    Record<string, ItemSupplierWithDetails[]>
  >({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [addingSupplierItemId, setAddingSupplierItemId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierUnitPrice, setSupplierUnitPrice] = useState("");
  const [supplierNote, setSupplierNote] = useState("");
  const [editingItemSupplierId, setEditingItemSupplierId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { quantity: 1, unit: "un", estimated_unit_price: 0, category: "material" },
  });

  const loadItems = useCallback(async () => {
    try {
      const [data, suppliersData] = await Promise.all([
        getItemsWithPaymentSummary(supabase, projectId),
        getSuppliers(supabase),
      ]);
      setItems(data);
      setAllSuppliers(suppliersData);

      // Carrega vínculos item↔fornecedor (pode falhar se migration não aplicada ainda)
      try {
        const itemSuppData = await getSuppliersByProject(supabase, projectId);
        setItemSuppliersMap(itemSuppData);
      } catch (err) {
        console.warn("item_suppliers ainda não disponível:", err);
        setItemSuppliersMap({});
      }
    } catch (err) {
      console.error("Erro ao carregar itens:", err);
    }
    setIsLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  async function onSubmit(data: ItemFormData) {
    try {
      if (editingId) {
        await updateItem(supabase, editingId, {
          name: data.name,
          description: data.description || null,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          estimated_unit_price: data.estimated_unit_price,
        });
      } else {
        await createItem(supabase, {
          project_id: projectId,
          name: data.name,
          description: data.description || null,
          category: data.category,
          quantity: data.quantity,
          unit: data.unit,
          estimated_unit_price: data.estimated_unit_price,
        });
      }
      reset();
      setShowForm(false);
      setEditingId(null);
      await loadItems();
    } catch (err) {
      console.error("Erro ao salvar item:", err);
    }
  }

  function handleEdit(item: ItemPaymentSummary) {
    setEditingId(item.id);
    setValue("name", item.name);
    setValue("description", item.description ?? "");
    setValue("category", item.category);
    setValue("quantity", item.quantity);
    setValue("unit", item.unit);
    setValue("estimated_unit_price", item.estimated_unit_price);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este item?")) return;
    try {
      await deleteItem(supabase, id);
      await loadItems();
    } catch (err) {
      console.error("Erro ao excluir item:", err);
    }
  }

  // ── Supplier management ──
  function toggleExpand(itemId: string) {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId));
    setAddingSupplierItemId(null);
    setEditingItemSupplierId(null);
  }

  function openAddSupplierForm(itemId: string) {
    setAddingSupplierItemId(itemId);
    setSelectedSupplierId("");
    setSupplierUnitPrice("");
    setSupplierNote("");
  }

  async function handleAddSupplier(itemId: string) {
    if (!selectedSupplierId) return;
    try {
      await addSupplierToItem(supabase, {
        item_id: itemId,
        supplier_id: selectedSupplierId,
        unit_price: parseFloat(supplierUnitPrice) || 0,
        note: supplierNote || null,
      });
      setAddingSupplierItemId(null);
      await loadItems();
    } catch (err) {
      console.error("Erro ao adicionar fornecedor:", err);
      alert("Erro ao adicionar fornecedor. Pode já estar vinculado a este item.");
    }
  }

  function startEditItemSupplier(is: ItemSupplierWithDetails) {
    setEditingItemSupplierId(is.id);
    setEditPrice(String(is.unit_price));
    setEditNote(is.note ?? "");
  }

  async function handleSaveItemSupplier(id: string) {
    try {
      await updateItemSupplier(supabase, id, {
        unit_price: parseFloat(editPrice) || 0,
        note: editNote || null,
      });
      setEditingItemSupplierId(null);
      await loadItems();
    } catch (err) {
      console.error("Erro ao atualizar fornecedor do item:", err);
    }
  }

  async function handleRemoveSupplier(id: string) {
    if (!confirm("Desvincular este fornecedor do item?")) return;
    try {
      await removeSupplierFromItem(supabase, id);
      await loadItems();
    } catch (err) {
      console.error("Erro ao remover fornecedor:", err);
    }
  }

  function getAvailableSuppliers(itemId: string) {
    const linked = (itemSuppliersMap[itemId] ?? []).map((is) => is.supplier_id);
    return allSuppliers.filter((s) => !linked.includes(s.id));
  }

  const totalEstimated = filteredItems.reduce((sum, item) => sum + item.estimated_total, 0);

  // Category summary counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  if (isLoading)
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens...
      </div>
    );

  return (
    <div>
      {/* Summary + Add button */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-500">
            {filteredItems.length} item(ns) · Estimado:{" "}
            <strong>{formatCurrency(totalEstimated)}</strong>
          </p>
          <span className="text-xs text-gray-400">💡 Valores detalhados no painel Financeiro</span>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setShowForm(!showForm);
          }}
          className={showForm ? "btn-ghost" : "btn-primary"}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Adicionar Item
            </>
          )}
        </button>
      </div>

      {/* Category filter */}
      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Filtrar:</span>
          {(["all", "material", "labor", "service", "other"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all"
                ? `Todos (${items.length})`
                : `${CATEGORY_LABELS[cat]} (${categoryCounts[cat] ?? 0})`}
            </button>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-navy">
            {editingId ? "Editar Item" : "Novo Item"}
          </h4>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <input
                {...register("name")}
                placeholder="Nome do item *"
                className="input"
                aria-label="Nome do item"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <select {...register("category")} className="input" aria-label="Categoria do item">
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <input
              {...register("description")}
              placeholder="Descrição (opcional)"
              className="input"
              aria-label="Descrição do item"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <input
                type="number"
                step="0.01"
                {...register("quantity")}
                placeholder="Quantidade"
                className="input"
                aria-label="Quantidade"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
              )}
            </div>
            <div>
              <input
                {...register("unit")}
                placeholder="Unidade (un, m², kg...)"
                className="input"
                aria-label="Unidade"
              />
              {errors.unit && <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p>}
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                {...register("estimated_unit_price")}
                placeholder="Preço unitário (R$)"
                className="input"
                aria-label="Preço unitário estimado"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            <Save className="h-4 w-4" />
            {editingId ? "Salvar Alterações" : "Adicionar"}
          </button>
        </form>
      )}

      {/* Items table */}
      {filteredItems.length === 0 ? (
        <div className="card py-6 text-center text-sm text-gray-400">
          {items.length === 0
            ? "Nenhum item cadastrado nesta obra."
            : "Nenhum item nesta categoria."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-surface-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Categoria</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2">Preço Unit.</th>
                <th className="px-3 py-2">Total Est.</th>
                <th className="px-3 py-2">Fornecedores</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const itemSuppliers = itemSuppliersMap[item.id] ?? [];
                const isExpanded = expandedItemId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-gray-50 hover:bg-surface-100 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-400">{item.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[item.category] || "bg-gray-100 text-gray-600"}`}
                        >
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {formatCurrency(item.estimated_unit_price)}
                      </td>
                      <td className="px-3 py-2 font-medium text-navy">
                        {formatCurrency(item.estimated_total)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-navy/5 text-navy hover:bg-navy/10 transition-colors"
                          title="Ver fornecedores vinculados"
                        >
                          <Store className="h-3 w-3" /> {itemSuppliers.length}
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-navy-50 hover:text-navy transition-colors"
                            aria-label={`Editar ${item.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label={`Excluir ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Painel expandido de fornecedores */}
                    {isExpanded && (
                      <tr key={`${item.id}-suppliers`} className="bg-surface-100">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                <Store className="h-4 w-4 text-navy" />
                                Fornecedores de &quot;{item.name}&quot;
                              </h4>
                              {addingSupplierItemId !== item.id && (
                                <button
                                  onClick={() => openAddSupplierForm(item.id)}
                                  className="btn inline-flex items-center gap-1 bg-navy text-white text-xs px-3 py-1.5 hover:bg-navy-600"
                                  disabled={getAvailableSuppliers(item.id).length === 0}
                                  title={
                                    getAvailableSuppliers(item.id).length === 0
                                      ? "Todos os fornecedores já estão vinculados"
                                      : ""
                                  }
                                >
                                  <Link2 className="h-3 w-3" /> Vincular
                                </button>
                              )}
                            </div>

                            {/* Lista de fornecedores vinculados */}
                            {itemSuppliers.length > 0 ? (
                              <div className="space-y-2">
                                {itemSuppliers.map((is) => (
                                  <div
                                    key={is.id}
                                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                                  >
                                    {editingItemSupplierId === is.id ? (
                                      /* Modo edição */
                                      <div className="flex flex-1 flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          {is.supplier.name}
                                        </span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editPrice}
                                          onChange={(e) => setEditPrice(e.target.value)}
                                          className="input w-32 !py-1.5 text-sm"
                                          placeholder="Preço (R$)"
                                        />
                                        <input
                                          value={editNote}
                                          onChange={(e) => setEditNote(e.target.value)}
                                          className="input flex-1 min-w-[120px] !py-1.5 text-sm"
                                          placeholder="Obs (opcional)"
                                        />
                                        <button
                                          onClick={() => handleSaveItemSupplier(is.id)}
                                          className="btn inline-flex items-center gap-1 bg-navy text-white text-xs px-2.5 py-1.5 hover:bg-navy-600"
                                        >
                                          <Save className="h-3 w-3" /> Salvar
                                        </button>
                                        <button
                                          onClick={() => setEditingItemSupplierId(null)}
                                          className="btn-ghost text-xs !px-2.5 !py-1.5"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      /* Modo visualização */
                                      <>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {is.supplier.name}
                                            {is.supplier.contact_name && (
                                              <span className="ml-1 text-xs text-gray-400">
                                                ({is.supplier.contact_name})
                                              </span>
                                            )}
                                          </p>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                            <span className="font-semibold text-navy">
                                              {formatCurrency(is.unit_price)}
                                            </span>
                                            {is.supplier.phone && (
                                              <span>📱 {is.supplier.phone}</span>
                                            )}
                                            {is.note && (
                                              <span className="italic text-gray-400">
                                                &quot;{is.note}&quot;
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => startEditItemSupplier(is)}
                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-navy-50 hover:text-navy transition-colors"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleRemoveSupplier(is.id)}
                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">
                                Nenhum fornecedor vinculado a este item.
                              </p>
                            )}

                            {/* Formulário para adicionar fornecedor */}
                            {addingSupplierItemId === item.id && (
                              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-100 bg-white p-3">
                                <div className="flex-1 min-w-[150px]">
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Fornecedor
                                  </label>
                                  <select
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="input !py-1.5 text-sm"
                                  >
                                    <option value="">Selecione...</option>
                                    {getAvailableSuppliers(item.id).map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="w-32">
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Preço Unit. (R$)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={supplierUnitPrice}
                                    onChange={(e) => setSupplierUnitPrice(e.target.value)}
                                    className="input !py-1.5 text-sm"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                  <label className="mb-1 block text-xs font-medium text-gray-600">
                                    Obs (opcional)
                                  </label>
                                  <input
                                    value={supplierNote}
                                    onChange={(e) => setSupplierNote(e.target.value)}
                                    className="input !py-1.5 text-sm"
                                    placeholder="Observação"
                                  />
                                </div>
                                <button
                                  onClick={() => handleAddSupplier(item.id)}
                                  disabled={!selectedSupplierId}
                                  className="btn inline-flex items-center gap-1 bg-navy text-white text-xs px-3 py-1.5 hover:bg-navy-600 disabled:opacity-50"
                                >
                                  <Plus className="h-3 w-3" /> Adicionar
                                </button>
                                <button
                                  onClick={() => setAddingSupplierItemId(null)}
                                  className="btn-ghost text-xs !px-3 !py-1.5"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-semibold">
                <td colSpan={5} className="px-3 py-2 text-right text-gray-700">
                  Total Estimado:
                </td>
                <td className="px-3 py-2 text-navy">{formatCurrency(totalEstimated)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
