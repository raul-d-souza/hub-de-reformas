/**
 * Serviço de Items — CRUD vinculado a um project.
 * Inclui funções de resumo financeiro por item.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Item,
  ItemInsert,
  ItemUpdate,
  ItemPaymentSummary,
  Payment,
  Installment,
} from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export async function getItemsByProject(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Item[];
}

export async function createItem(supabase: Client, item: ItemInsert) {
  const { data, error } = await supabase.from("items").insert(item).select().single();

  if (error) throw error;
  return data as Item;
}

export async function updateItem(supabase: Client, id: string, updates: ItemUpdate) {
  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Item;
}

export async function deleteItem(supabase: Client, id: string) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Busca todos os itens de um projeto com resumo de pagamento.
 * Para cada item, calcula quanto já foi pago (via parcelas das payments vinculadas).
 */
export async function getItemsWithPaymentSummary(
  supabase: Client,
  projectId: string,
): Promise<ItemPaymentSummary[]> {
  // 1. Buscar itens do projeto
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  // 2. Buscar pagamentos vinculados a itens deste projeto
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("project_id", projectId)
    .not("item_id", "is", null);

  if (paymentsError) throw paymentsError;

  // 3. Buscar parcelas pagas dos pagamentos vinculados a itens
  const paymentIds = (payments ?? []).map((p: Payment) => p.id);
  const paidByPayment: Record<string, number> = {};

  if (paymentIds.length > 0) {
    const { data: installments, error: instError } = await supabase
      .from("installments")
      .select("payment_id, amount, status")
      .in("payment_id", paymentIds);

    if (instError) throw instError;

    for (const inst of (installments ?? []) as Pick<
      Installment,
      "payment_id" | "amount" | "status"
    >[]) {
      if (inst.status === "paid") {
        paidByPayment[inst.payment_id] = (paidByPayment[inst.payment_id] ?? 0) + inst.amount;
      }
    }
  }

  // 4. Agrupar pagamentos por item_id
  const paymentsByItem: Record<string, Payment[]> = {};
  for (const p of (payments ?? []) as Payment[]) {
    if (p.item_id) {
      if (!paymentsByItem[p.item_id]) paymentsByItem[p.item_id] = [];
      paymentsByItem[p.item_id].push(p);
    }
  }

  // 5. Montar o resumo
  return ((items ?? []) as Item[]).map((item) => {
    const itemPayments = paymentsByItem[item.id] ?? [];
    const paymentCount = itemPayments.length;
    const totalPaymentAmount = itemPayments.reduce(
      (sum, p) => sum + (p.total_with_interest ?? p.total_amount),
      0,
    );
    const totalPaid = itemPayments.reduce((sum, p) => sum + (paidByPayment[p.id] ?? 0), 0);

    let paymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
    if (paymentCount > 0) {
      paymentStatus =
        totalPaid >= totalPaymentAmount ? "paid" : totalPaid > 0 ? "partial" : "unpaid";
    }

    return {
      ...item,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPaymentAmount: Math.round(totalPaymentAmount * 100) / 100,
      paymentCount,
      paymentStatus,
    };
  });
}
