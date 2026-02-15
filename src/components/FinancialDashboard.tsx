/**
 * FinancialDashboard — painel financeiro do projeto com cards de resumo,
 * gráficos de evolução mensal e pizza por categoria (recharts),
 * filtros por categoria, exportação CSV, e tabela de parcelas.
 */
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/format";
import { MonthlyBarChart, CategoryPieChart } from "@/components/financial/FinancialCharts";
import { SummaryCards } from "@/components/financial/SummaryCards";
import {
  CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import {
  getPaymentsByProject,
  deletePayment,
  getFinancialSummary,
  getMonthlyPaymentData,
  getAllInstallmentsByProject,
  markInstallmentPaid,
} from "@/services/payments";
import type { FinancialSummary, Supplier } from "@/types/database";
import type { ItemPaymentSummary } from "@/types/database";
import { getItemsWithPaymentSummary } from "@/services/items";
import PaymentForm from "./PaymentForm";
import DocumentUpload from "./DocumentUpload";
import { getDocumentsByInstallment, getDocumentUrl } from "@/services/documents";
import type { Document as DocType } from "@/types/database";
interface FinancialDashboardProps {
  projectId: string;
}

interface MonthlyData {
  month: string;
  due: number;
  paid: number;
}

interface PaymentRow {
  id: string;
  description: string;
  category: string;
  payment_method: string;
  total_amount: number;
  total_with_interest: number | null;
  is_installment: boolean;
  num_installments: number;
  has_interest: boolean;
  interest_rate: number;
  note: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
  items?: { name: string; category?: string } | null;
}

interface InstallmentRow {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  note: string | null;
  payments: {
    project_id: string;
    description: string;
    payment_method: string;
    category: string;
  };
}

const METHOD_LABELS = PAYMENT_METHOD_LABELS;

const STATUS_COLORS = PAYMENT_STATUS_COLORS;

const STATUS_LABELS = PAYMENT_STATUS_LABELS;

function formatDateFin(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

type CategoryFilter = "all" | "material" | "labor" | "service" | "other";

function buildCategoryPieData(payments: PaymentRow[]) {
  const map: Record<string, number> = {};
  for (const p of payments) {
    const cat = p.category || "other";
    const amount = p.total_with_interest ?? p.total_amount;
    map[cat] = (map[cat] ?? 0) + amount;
  }
  return Object.entries(map).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: Math.round(value * 100) / 100,
    key,
  }));
}

function exportPaymentsCSV(payments: PaymentRow[], installments: InstallmentRow[]) {
  // Header
  const lines: string[] = [
    "Tipo;Descrição;Categoria;Forma Pgto;Valor Original;Valor c/ Juros;Parcelas;Juros (%);Fornecedor;Item;Nº Parcela;Valor Parcela;Vencimento;Status;Data Pgto",
  ];

  if (installments.length > 0) {
    // Export installments with payment context
    for (const inst of installments) {
      const payment = payments.find((p) => p.description === inst.payments.description);
      lines.push(
        [
          "Parcela",
          `"${inst.payments.description}"`,
          CATEGORY_LABELS[inst.payments.category] || inst.payments.category,
          METHOD_LABELS[inst.payments.payment_method] || inst.payments.payment_method,
          payment ? payment.total_amount.toFixed(2).replace(".", ",") : "",
          payment?.total_with_interest
            ? payment.total_with_interest.toFixed(2).replace(".", ",")
            : "",
          payment?.num_installments ?? "",
          payment?.interest_rate ?? "",
          "",
          "",
          inst.installment_number,
          inst.amount.toFixed(2).replace(".", ","),
          inst.due_date,
          STATUS_LABELS[inst.status] || inst.status,
          inst.paid_date || "",
        ].join(";"),
      );
    }
  } else {
    // Export payments only
    for (const p of payments) {
      lines.push(
        [
          "Pagamento",
          `"${p.description}"`,
          CATEGORY_LABELS[p.category] || p.category,
          METHOD_LABELS[p.payment_method] || p.payment_method,
          p.total_amount.toFixed(2).replace(".", ","),
          p.total_with_interest ? p.total_with_interest.toFixed(2).replace(".", ",") : "",
          p.num_installments,
          p.interest_rate,
          p.suppliers?.name ?? "",
          p.items?.name ?? "",
          "",
          "",
          "",
          "",
          "",
        ].join(";"),
      );
    }
  }

  const csvContent = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function FinancialDashboard({ projectId }: FinancialDashboardProps) {
  const supabase = createClient();

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "installments" | "items">(
    "overview",
  );
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [receiptUploadId, setReceiptUploadId] = useState<string | null>(null);
  const [receiptDocs, setReceiptDocs] = useState<Record<string, DocType[]>>({});
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null);
  const [itemsSummary, setItemsSummary] = useState<ItemPaymentSummary[]>([]);

  // Estado para pagamento pré-preenchido a partir de um item
  const [paymentFormDefaults, setPaymentFormDefaults] = useState<{
    itemId?: string;
    description?: string;
    amount?: number;
    category?: string;
  }>({});

  function openPaymentFormForItem(item: ItemPaymentSummary) {
    setPaymentFormDefaults({
      itemId: item.id,
      description: item.name,
      amount: item.estimated_total,
      category: item.category,
    });
    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    setPaymentFormDefaults({});
  }

  const loadData = useCallback(async () => {
    try {
      const [summaryData, paymentsData, installmentsData, chartData, itemsData] = await Promise.all(
        [
          getFinancialSummary(supabase, projectId),
          getPaymentsByProject(supabase, projectId),
          getAllInstallmentsByProject(supabase, projectId),
          getMonthlyPaymentData(supabase, projectId),
          getItemsWithPaymentSummary(supabase, projectId),
        ],
      );

      setSummary(summaryData);
      setPayments(paymentsData as PaymentRow[]);
      setInstallments(installmentsData as InstallmentRow[]);
      setMonthlyData(chartData);
      setItemsSummary(itemsData);

      // Carregar fornecedores para o form
      const { data: suppliersData } = await supabase.from("suppliers").select("*").order("name");
      setSuppliers((suppliersData ?? []) as Supplier[]);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
    }
    setIsLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDeletePayment(id: string) {
    if (!confirm("Excluir este pagamento e todas as suas parcelas?")) return;
    try {
      await deletePayment(supabase, id);
      await loadData();
    } catch (err) {
      console.error("Erro ao excluir pagamento:", err);
    }
  }

  async function handleMarkPaid(installmentId: string) {
    setMarkingPaid(installmentId);
    try {
      await markInstallmentPaid(supabase, installmentId);
      await loadData();
    } catch (err) {
      console.error("Erro ao marcar como pago:", err);
    }
    setMarkingPaid(null);
  }

  async function loadReceiptsForInstallment(installmentId: string) {
    try {
      const docs = await getDocumentsByInstallment(supabase, installmentId);
      setReceiptDocs((prev) => ({ ...prev, [installmentId]: docs }));
    } catch (err) {
      console.error("Erro ao carregar comprovantes:", err);
    }
  }

  async function handleViewReceipt(filePath: string) {
    try {
      const url = await getDocumentUrl(supabase, filePath);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Erro ao abrir comprovante:", err);
    }
  }

  async function toggleReceiptView(installmentId: string) {
    if (viewingReceiptId === installmentId) {
      setViewingReceiptId(null);
    } else {
      setViewingReceiptId(installmentId);
      if (!receiptDocs[installmentId]) {
        await loadReceiptsForInstallment(installmentId);
      }
    }
  }

  // Filtered data (hooks must be before any conditional returns)
  const today = new Date().toISOString().split("T")[0];

  const filteredPayments = useMemo(() => {
    if (categoryFilter === "all") return payments;
    return payments.filter((p) => p.category === categoryFilter);
  }, [payments, categoryFilter]);

  const filteredInstallments = useMemo(() => {
    if (categoryFilter === "all") return installments;
    return installments.filter((i) => i.payments.category === categoryFilter);
  }, [installments, categoryFilter]);

  const pieData = useMemo(() => buildCategoryPieData(payments), [payments]);

  const upcomingInstallments = useMemo(
    () =>
      filteredInstallments.filter((i) => i.status === "pending" && i.due_date >= today).slice(0, 5),
    [filteredInstallments, today],
  );
  const overdueInstallments = useMemo(
    () => filteredInstallments.filter((i) => i.status === "pending" && i.due_date < today),
    [filteredInstallments, today],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-navy">💰 Painel Financeiro</h2>
        <div className="flex gap-2">
          {payments.length > 0 && (
            <button
              onClick={() => exportPaymentsCSV(payments, installments)}
              className="btn-ghost"
              title="Exportar CSV"
            >
              📥 CSV
            </button>
          )}
          <button
            onClick={() => {
              if (showPaymentForm) {
                closePaymentForm();
              } else {
                setPaymentFormDefaults({});
                setShowPaymentForm(true);
              }
            }}
            className="btn-primary text-sm"
          >
            {showPaymentForm ? "✕ Fechar" : "+ Novo Pagamento"}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {payments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Filtrar:</span>
          {(["all", "material", "labor", "service", "other"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`pill transition-colors ${
                categoryFilter === cat
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "all" ? "Todos" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Payment Form */}
      {showPaymentForm && (
        <PaymentForm
          projectId={projectId}
          suppliers={suppliers}
          defaultItemId={paymentFormDefaults.itemId}
          defaultDescription={paymentFormDefaults.description}
          defaultAmount={paymentFormDefaults.amount}
          defaultCategory={paymentFormDefaults.category}
          onSuccess={() => {
            closePaymentForm();
            loadData();
          }}
          onCancel={closePaymentForm}
        />
      )}

      {/* Summary Cards + Progress Bar */}
      {summary && (
        <SummaryCards
          summary={summary}
          itemsCount={itemsSummary.length}
          estimatedTotal={itemsSummary.reduce((s, i) => s + i.estimated_total, 0)}
          formatDateFin={formatDateFin}
        />
      )}

      {/* Charts */}
      {(monthlyData.length > 0 || pieData.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          <MonthlyBarChart data={monthlyData} formatMonthLabel={formatMonthLabel} />
          <CategoryPieChart data={pieData} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(["overview", "payments", "installments", "items"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "overview" && "Visão Geral"}
            {tab === "payments" && `Pagamentos (${filteredPayments.length})`}
            {tab === "installments" && `Parcelas (${filteredInstallments.length})`}
            {tab === "items" && `Itens (${itemsSummary.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content: Overview */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Parcelas Vencidas */}
          {overdueInstallments.length > 0 && (
            <div className="card border-l-4 border-red-500">
              <h4 className="mb-3 text-sm font-semibold text-red-700">
                ⚠️ Parcelas Vencidas ({overdueInstallments.length})
              </h4>
              <div className="space-y-2">
                {overdueInstallments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-red-800">
                        {inst.payments.description} — Parcela {inst.installment_number}
                      </p>
                      <p className="text-xs text-red-600">
                        Venceu em {formatDateFin(inst.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-700">
                        {formatCurrency(inst.amount)}
                      </span>
                      <button
                        onClick={() => handleMarkPaid(inst.id)}
                        disabled={markingPaid === inst.id}
                        className="btn inline-flex items-center gap-1 bg-green-600 text-white text-xs !px-2 !py-1 hover:bg-green-700 disabled:opacity-50"
                        title="Marcar como pago"
                      >
                        {markingPaid === inst.id ? "..." : "Pagar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Próximos Vencimentos */}
          <div className="card">
            <h4 className="mb-3 text-sm font-semibold text-navy">📅 Próximos Vencimentos</h4>
            {upcomingInstallments.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma parcela pendente</p>
            ) : (
              <div className="space-y-2">
                {upcomingInstallments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {inst.payments.description} — Parcela {inst.installment_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vence em {formatDateFin(inst.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy">{formatCurrency(inst.amount)}</span>
                      <button
                        onClick={() => handleMarkPaid(inst.id)}
                        disabled={markingPaid === inst.id}
                        className="btn inline-flex items-center gap-1 bg-green-600 text-white text-xs !px-2 !py-1 hover:bg-green-700 disabled:opacity-50"
                        title="Marcar como pago"
                      >
                        {markingPaid === inst.id ? "..." : "✓"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Payments List */}
      {activeTab === "payments" && (
        <div className="space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray-400">Nenhum pagamento registrado ainda.</p>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="mt-2 text-sm font-medium text-navy hover:underline"
              >
                + Registrar primeiro pagamento
              </button>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{payment.description}</h4>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {CATEGORY_LABELS[payment.category] || payment.category}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                      <span>
                        💳 {METHOD_LABELS[payment.payment_method] || payment.payment_method}
                      </span>
                      {payment.is_installment && (
                        <span>
                          📊 {payment.num_installments}x
                          {payment.has_interest && ` (${payment.interest_rate}% a.m.)`}
                        </span>
                      )}
                      {payment.suppliers?.name && <span>🏢 {payment.suppliers.name}</span>}
                      {payment.items?.name && <span>📦 {payment.items.name}</span>}
                    </div>
                    {payment.note && (
                      <p className="mt-1 text-xs italic text-gray-400">{payment.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-navy">
                        {formatCurrency(payment.total_with_interest ?? payment.total_amount)}
                      </p>
                      {payment.total_with_interest &&
                        payment.total_with_interest !== payment.total_amount && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatCurrency(payment.total_amount)}
                          </p>
                        )}
                    </div>
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600 !p-2"
                      title="Excluir pagamento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: All Installments */}
      {activeTab === "installments" && (
        <div className="card overflow-x-auto">
          {filteredInstallments.length === 0 ? (
            <p className="py-4 text-center text-gray-400">Nenhuma parcela encontrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-3 py-2 font-medium text-gray-500">Pagamento</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Parcela</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Valor</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Vencimento</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Status</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Comprovante</th>
                  <th className="px-3 py-2 font-medium text-gray-500">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstallments.map((inst) => {
                  const isOverdue = inst.status === "pending" && inst.due_date < today;
                  const docs = receiptDocs[inst.id] ?? [];
                  return (
                    <React.Fragment key={inst.id}>
                      <tr className={`border-b border-gray-100 ${isOverdue ? "bg-red-50" : ""}`}>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {inst.payments.description}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{inst.installment_number}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {formatCurrency(inst.amount)}
                        </td>
                        <td
                          className={`px-3 py-2 ${isOverdue ? "font-semibold text-red-600" : "text-gray-600"}`}
                        >
                          {formatDateFin(inst.due_date)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              isOverdue
                                ? STATUS_COLORS.overdue
                                : STATUS_COLORS[inst.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {isOverdue ? "Vencido" : STATUS_LABELS[inst.status] || inst.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleReceiptView(inst.id)}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                viewingReceiptId === inst.id
                                  ? "bg-navy text-white"
                                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                              title="Ver/anexar comprovantes"
                            >
                              📎 {docs.length > 0 ? `(${docs.length})` : ""}
                            </button>
                            <button
                              onClick={() =>
                                setReceiptUploadId(receiptUploadId === inst.id ? null : inst.id)
                              }
                              className="rounded border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                              title="Anexar comprovante"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {inst.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(inst.id)}
                              disabled={markingPaid === inst.id}
                              className="btn inline-flex items-center gap-1 bg-green-600 text-white text-xs !px-2 !py-1 hover:bg-green-700 disabled:opacity-50"
                            >
                              {markingPaid === inst.id ? "..." : "Pagar"}
                            </button>
                          )}
                          {inst.status === "paid" && inst.paid_date && (
                            <span className="text-xs text-green-600">
                              ✓ {formatDateFin(inst.paid_date)}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Receipt upload row */}
                      {receiptUploadId === inst.id && (
                        <tr key={`upload-${inst.id}`}>
                          <td colSpan={7} className="bg-gray-50 px-3 py-3">
                            <DocumentUpload
                              projectId={projectId}
                              defaultDocType="receipt"
                              installmentId={inst.id}
                              hideTypeSelector
                              onSuccess={() => {
                                setReceiptUploadId(null);
                                loadReceiptsForInstallment(inst.id);
                              }}
                              onCancel={() => setReceiptUploadId(null)}
                            />
                          </td>
                        </tr>
                      )}

                      {/* Receipts view row */}
                      {viewingReceiptId === inst.id && (
                        <tr key={`receipts-${inst.id}`}>
                          <td colSpan={7} className="bg-blue-50/50 px-3 py-3">
                            {docs.length === 0 ? (
                              <p className="text-xs text-gray-400">Nenhum comprovante anexado.</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-600">
                                  📎 Comprovantes ({docs.length}):
                                </p>
                                {docs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between rounded bg-white px-3 py-2 text-xs shadow-sm"
                                  >
                                    <div>
                                      <span className="font-medium text-gray-800">{doc.name}</span>
                                      <span className="ml-2 text-gray-400">{doc.file_name}</span>
                                    </div>
                                    <button
                                      onClick={() => handleViewReceipt(doc.file_path)}
                                      className="rounded border border-navy/20 px-2 py-1 text-navy hover:bg-blue-50"
                                    >
                                      👁️ Ver
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: Items with Payment Status */}
      {activeTab === "items" && (
        <div className="card overflow-x-auto">
          {itemsSummary.length === 0 ? (
            <p className="py-4 text-center text-gray-400">Nenhum item cadastrado neste projeto.</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-xs font-medium text-gray-500">Total Estimado</p>
                  <p className="text-lg font-bold text-navy">
                    {formatCurrency(itemsSummary.reduce((s, i) => s + i.estimated_total, 0))}
                  </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <p className="text-xs font-medium text-green-700">Já Pago (itens)</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(itemsSummary.reduce((s, i) => s + i.totalPaid, 0))}
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center">
                  <p className="text-xs font-medium text-orange-700">Sem Pagamento</p>
                  <p className="text-lg font-bold text-orange">
                    {itemsSummary.filter((i) => i.paymentStatus === "unpaid").length} item(ns)
                  </p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="px-3 py-2 font-medium text-gray-500">Item</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Categoria</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Estimado</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Pgtos</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Pago</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Restante</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Status</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsSummary.map((item) => {
                    const remaining = Math.max(0, item.totalPaymentAmount - item.totalPaid);
                    const paidPercent =
                      item.totalPaymentAmount > 0
                        ? Math.round((item.totalPaid / item.totalPaymentAmount) * 100)
                        : 0;
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400">{item.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              {
                                material: "bg-blue-100 text-blue-800",
                                labor: "bg-orange-100 text-orange-800",
                                service: "bg-green-100 text-green-800",
                                other: "bg-purple-100 text-purple-800",
                              }[item.category] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-navy">
                          {formatCurrency(item.estimated_total)}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {item.paymentCount > 0 ? (
                            <span className="text-xs">{item.paymentCount} pgto(s)</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.paymentCount > 0 ? (
                            <div>
                              <span className="font-medium text-green-700">
                                {formatCurrency(item.totalPaid)}
                              </span>
                              {item.totalPaymentAmount > 0 && (
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className="h-full rounded-full bg-green-500 transition-all"
                                    style={{ width: `${Math.min(100, paidPercent)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.paymentCount > 0 ? (
                            <span
                              className={
                                remaining > 0 ? "font-medium text-orange" : "text-green-700"
                              }
                            >
                              {formatCurrency(remaining)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              {
                                unpaid: "bg-gray-100 text-gray-500",
                                partial: "bg-yellow-100 text-yellow-800",
                                paid: "bg-green-100 text-green-800",
                              }[item.paymentStatus]
                            }`}
                          >
                            {
                              {
                                unpaid: "Sem pgto",
                                partial: "Parcial",
                                paid: "Quitado ✓",
                              }[item.paymentStatus]
                            }
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {item.paymentStatus !== "paid" && (
                            <button
                              onClick={() => openPaymentFormForItem(item)}
                              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                              title={`Registrar pagamento para ${item.name}`}
                            >
                              💳 Pagar
                            </button>
                          )}
                          {item.paymentStatus === "paid" && (
                            <span className="text-xs text-green-600">✓ Quitado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Empty State */}
      {!summary || summary.totalCost === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-4xl">💰</p>
          <h3 className="mt-3 text-lg font-semibold text-gray-700">Nenhum pagamento registrado</h3>
          <p className="mt-1 text-sm text-gray-400">
            Registre seus pagamentos para acompanhar o financeiro da obra.
          </p>
          {!showPaymentForm && (
            <button onClick={() => setShowPaymentForm(true)} className="btn-primary mt-4 text-sm">
              + Registrar Pagamento
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
