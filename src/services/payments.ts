/**
 * Serviço de Payments — CRUD de pagamentos e parcelas com cálculos financeiros.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Payment,
  PaymentInsert,
  PaymentUpdate,
  Installment,
  InstallmentInsert,
  InstallmentUpdate,
  FinancialSummary,
  Item,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

/* ─── Payments CRUD ─── */

export async function getPaymentsByProject(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, suppliers(name), items(name, category)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Busca todos os pagamentos vinculados a um item específico.
 */
export async function getPaymentsByItem(supabase: Client, itemId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, suppliers(name), installments(id, installment_number, amount, due_date, paid_date, status)",
    )
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPayment(supabase: Client, payment: PaymentInsert) {
  const { data, error } = await supabase.from("payments").insert(payment).select().single();

  if (error) throw error;
  return data as Payment;
}

export async function updatePayment(supabase: Client, id: string, updates: PaymentUpdate) {
  const { data, error } = await supabase
    .from("payments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}

export async function deletePayment(supabase: Client, id: string) {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}

/* ─── Installments CRUD ─── */

export async function getInstallmentsByPayment(supabase: Client, paymentId: string) {
  const { data, error } = await supabase
    .from("installments")
    .select("*")
    .eq("payment_id", paymentId)
    .order("installment_number", { ascending: true });

  if (error) throw error;
  return data as Installment[];
}

export async function getAllInstallmentsByProject(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("installments")
    .select("*, payments!inner(project_id, description, payment_method, category)")
    .eq("payments.project_id", projectId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateInstallment(supabase: Client, id: string, updates: InstallmentUpdate) {
  const { data, error } = await supabase
    .from("installments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Installment;
}

/**
 * Marca uma parcela como paga com a data de hoje.
 */
export async function markInstallmentPaid(supabase: Client, id: string) {
  return updateInstallment(supabase, id, {
    status: "paid",
    paid_date: new Date().toISOString().split("T")[0],
  });
}

/**
 * Cria as parcelas automaticamente ao registrar um pagamento.
 * Distribui o valor total (com juros se aplicável) em N parcelas mensais.
 */
export async function createInstallmentsForPayment(
  supabase: Client,
  payment: Payment,
  firstDueDate: string,
  ownerId: string,
) {
  const totalAmount = payment.total_with_interest ?? payment.total_amount;
  const installmentAmount = Math.round((totalAmount / payment.num_installments) * 100) / 100;

  // Ajusta a última parcela para compensar arredondamento
  const installments: InstallmentInsert[] = [];
  let remaining = totalAmount;

  for (let i = 1; i <= payment.num_installments; i++) {
    const isLast = i === payment.num_installments;
    const amount = isLast ? Math.round(remaining * 100) / 100 : installmentAmount;
    remaining -= amount;

    // Calcula a data de vencimento (mês a mês)
    const dueDate = new Date(firstDueDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    installments.push({
      payment_id: payment.id,
      owner_id: ownerId,
      installment_number: i,
      amount,
      due_date: dueDate.toISOString().split("T")[0],
      paid_date: null,
      status: "pending",
      payment_method_used: null,
      receipt_url: null,
      note: null,
    });
  }

  const { data, error } = await supabase.from("installments").insert(installments).select();

  if (error) throw error;
  return data as Installment[];
}

/* ─── Financial Summary (cálculos do dashboard) ─── */

/**
 * Calcula o resumo financeiro de um projeto.
 * Busca todos os pagamentos, parcelas e itens para gerar métricas.
 * O custo total combina: pagamentos registrados + itens sem pagamento vinculado.
 */
export async function getFinancialSummary(
  supabase: Client,
  projectId: string,
): Promise<FinancialSummary> {
  // Buscar todos os pagamentos do projeto
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("project_id", projectId);

  if (paymentsError) throw paymentsError;

  // Buscar todas as parcelas do projeto (via join)
  const { data: installments, error: installmentsError } = await supabase
    .from("installments")
    .select("*, payments!inner(project_id)")
    .eq("payments.project_id", projectId);

  if (installmentsError) throw installmentsError;

  // Buscar itens do projeto para calcular custo estimado total
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("project_id", projectId);

  if (itemsError) throw itemsError;

  const allPayments = (payments ?? []) as Payment[];
  const allInstallments = (installments ?? []) as (Installment & {
    payments: { project_id: string };
  })[];
  const allItems = (items ?? []) as Item[];

  // IDs de itens que já têm pagamento vinculado
  const itemsWithPayment = new Set(allPayments.filter((p) => p.item_id).map((p) => p.item_id));

  // Custo total dos pagamentos (inclui juros se aplicável)
  const totalPaymentsCost = allPayments.reduce(
    (sum, p) => sum + (p.total_with_interest ?? p.total_amount),
    0,
  );

  // Custo estimado dos itens SEM pagamento vinculado (para incluir no total)
  const totalItemsWithoutPayment = allItems
    .filter((item) => !itemsWithPayment.has(item.id))
    .reduce((sum, item) => sum + item.estimated_total, 0);

  // Custo total = pagamentos + itens sem pagamento (evita contagem dupla)
  const totalCost = totalPaymentsCost + totalItemsWithoutPayment;

  // Total pago = soma das parcelas com status 'paid'
  const totalPaid = allInstallments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalRemaining = Math.max(0, totalCost - totalPaid);
  const percentPaid = totalCost > 0 ? (totalPaid / totalCost) * 100 : 0;

  // Próximo vencimento (pendente, mais próximo do hoje)
  const today = new Date().toISOString().split("T")[0];
  const pendingInstallments = allInstallments
    .filter((i) => i.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const nextDueDate = pendingInstallments.length > 0 ? pendingInstallments[0].due_date : null;

  // Parcelas vencidas
  const overdueCount = allInstallments.filter(
    (i) => i.status === "pending" && i.due_date < today,
  ).length;

  // Última parcela (data)
  const allDueDates = allInstallments.map((i) => i.due_date).sort();
  const lastDueDate = allDueDates.length > 0 ? allDueDates[allDueDates.length - 1] : null;

  // Meses restantes até quitar
  let monthsRemaining = 0;
  if (lastDueDate) {
    const lastDate = new Date(lastDueDate);
    const now = new Date();
    monthsRemaining = Math.max(
      0,
      (lastDate.getFullYear() - now.getFullYear()) * 12 + (lastDate.getMonth() - now.getMonth()),
    );
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
    percentPaid: Math.round(percentPaid * 100) / 100,
    nextDueDate,
    overdueCount,
    monthsRemaining,
    lastDueDate,
  };
}

/**
 * Dados para gráficos — evolução mensal de pagamentos.
 */
export async function getMonthlyPaymentData(supabase: Client, projectId: string) {
  const { data: installments, error } = await supabase
    .from("installments")
    .select("*, payments!inner(project_id)")
    .eq("payments.project_id", projectId)
    .order("due_date", { ascending: true });

  if (error) throw error;

  const allInstallments = (installments ?? []) as (Installment & {
    payments: { project_id: string };
  })[];

  // Agrupa por mês
  const monthlyMap = new Map<string, { month: string; due: number; paid: number }>();

  for (const inst of allInstallments) {
    const monthKey = inst.due_date.substring(0, 7); // "2026-03"
    const existing = monthlyMap.get(monthKey) ?? { month: monthKey, due: 0, paid: 0 };
    existing.due += inst.amount;
    if (inst.status === "paid") {
      existing.paid += inst.amount;
    }
    monthlyMap.set(monthKey, existing);
  }

  return Array.from(monthlyMap.values()).map((m) => ({
    month: m.month,
    due: Math.round(m.due * 100) / 100,
    paid: Math.round(m.paid * 100) / 100,
  }));
}
