/**
 * PaymentForm — formulário para registrar pagamentos com opção de parcelamento e juros.
 * Calcula automaticamente o valor com juros e gera parcelas.
 */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, type PaymentFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabaseClient";
import { formatCurrency } from "@/lib/format";
import { createPayment, createInstallmentsForPayment } from "@/services/payments";
import { getItemsByProject } from "@/services/items";
import type { Item, Supplier, PaymentInsert } from "@/types/database";

interface PaymentFormProps {
  projectId: string;
  suppliers: Supplier[];
  onSuccess: () => void;
  onCancel: () => void;
  /** Pré-seleciona um item no formulário */
  defaultItemId?: string;
  /** Pré-preenche a descrição */
  defaultDescription?: string;
  /** Pré-preenche o valor total */
  defaultAmount?: number;
  /** Pré-seleciona a categoria */
  defaultCategory?: string;
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  boleto: "Boleto Bancário",
  bank_transfer: "Transferência Bancária",
  cash: "Dinheiro",
  check: "Cheque",
  auto_debit: "Débito Automático",
  other: "Outro",
};

const CATEGORY_LABELS: Record<string, string> = {
  material: "Material",
  labor: "Mão de Obra",
  service: "Serviço",
  other: "Outro",
};

export default function PaymentForm({
  projectId,
  suppliers,
  onSuccess,
  onCancel,
  defaultItemId,
  defaultDescription,
  defaultAmount,
  defaultCategory,
}: PaymentFormProps) {
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      description: defaultDescription ?? "",
      category: (defaultCategory as "material" | "labor" | "service" | "other") ?? "material",
      payment_method: "pix",
      total_amount: defaultAmount ?? 0,
      is_installment: false,
      num_installments: 1,
      has_interest: false,
      interest_rate: 0,
      first_due_date: new Date().toISOString().split("T")[0],
      item_id: defaultItemId ?? "",
      supplier_id: "",
      quote_id: "",
      note: "",
    },
  });

  const isInstallment = watch("is_installment");
  const hasInterest = watch("has_interest");
  const totalAmount = watch("total_amount");
  const interestRate = watch("interest_rate");
  const numInstallments = watch("num_installments");

  // Cálculo do valor com juros (juros compostos mensais)
  const totalWithInterest = useMemo(() => {
    if (!hasInterest || !interestRate || interestRate <= 0 || !totalAmount) {
      return totalAmount || 0;
    }
    const monthlyRate = interestRate / 100;
    return totalAmount * Math.pow(1 + monthlyRate, numInstallments || 1);
  }, [hasInterest, interestRate, totalAmount, numInstallments]);

  const installmentAmount = useMemo(() => {
    const n = isInstallment ? Math.max(1, numInstallments || 1) : 1;
    return totalWithInterest / n;
  }, [totalWithInterest, isInstallment, numInstallments]);

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItemsByProject(supabase, projectId);
        setItems(data);
      } catch {
        /* silently ignore */
      }
    }
    loadItems();
  }, [supabase, projectId]);

  async function onSubmit(data: PaymentFormData) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const paymentInsert: PaymentInsert = {
        project_id: projectId,
        owner_id: userData.user.id,
        description: data.description,
        category: data.category,
        payment_method: data.payment_method,
        total_amount: data.total_amount,
        is_installment: data.is_installment,
        num_installments: data.is_installment ? data.num_installments : 1,
        has_interest: data.has_interest,
        interest_rate: data.has_interest ? data.interest_rate : 0,
        total_with_interest: data.has_interest ? Math.round(totalWithInterest * 100) / 100 : null,
        item_id: data.item_id || null,
        supplier_id: data.supplier_id || null,
        quote_id: data.quote_id || null,
        note: data.note || null,
      };

      const payment = await createPayment(supabase, paymentInsert);

      // Gerar parcelas automaticamente
      await createInstallmentsForPayment(supabase, payment, data.first_due_date, userData.user.id);

      onSuccess();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao criar pagamento");
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
      <h3 className="text-lg font-semibold text-navy">Novo Pagamento</h3>

      {submitError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</div>
      )}

      {/* Descrição */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descrição *</label>
        <input
          {...register("description")}
          className="input"
          placeholder="Ex: Cimento para fundação"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Categoria + Método */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Categoria *</label>
          <select {...register("category")} className="input">
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Forma de Pagamento *
          </label>
          <select {...register("payment_method")} className="input">
            {Object.entries(METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Valor total */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Valor Total (R$) *</label>
        <input
          {...register("total_amount")}
          type="number"
          step="0.01"
          min="0"
          className="input"
          placeholder="0,00"
        />
        {errors.total_amount && (
          <p className="mt-1 text-xs text-red-500">{errors.total_amount.message}</p>
        )}
      </div>

      {/* Parcelamento */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="is_installment"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                />
                <span className="text-sm font-medium text-gray-700">Parcelado</span>
              </label>
            )}
          />
        </div>

        {isInstallment && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nº de Parcelas</label>
              <input
                {...register("num_installments")}
                type="number"
                min="2"
                max="120"
                className="input"
              />
              {errors.num_installments && (
                <p className="mt-1 text-xs text-red-500">{errors.num_installments.message}</p>
              )}
            </div>

            <div className="flex items-end">
              <Controller
                control={control}
                name="has_interest"
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
                    />
                    <span className="text-sm font-medium text-gray-700">Com Juros</span>
                  </label>
                )}
              />
            </div>

            {hasInterest && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Taxa de Juros Mensal (%)
                </label>
                <input
                  {...register("interest_rate")}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input"
                  placeholder="1.99"
                />
                {errors.interest_rate && (
                  <p className="mt-1 text-xs text-red-500">{errors.interest_rate.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resumo do parcelamento */}
        {totalAmount > 0 && (
          <div className="rounded-lg bg-white p-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Valor original:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            {hasInterest && interestRate > 0 && (
              <div className="mt-1 flex justify-between text-orange">
                <span>Com juros ({interestRate}% a.m.):</span>
                <span className="font-semibold">{formatCurrency(totalWithInterest)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-semibold text-navy">
              <span>{isInstallment ? `${numInstallments}x de:` : "À vista:"}</span>
              <span>{formatCurrency(installmentAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Data do primeiro vencimento */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Data do {isInstallment ? "Primeiro " : ""}Vencimento *
        </label>
        <input {...register("first_due_date")} type="date" className="input" />
        {errors.first_due_date && (
          <p className="mt-1 text-xs text-red-500">{errors.first_due_date.message}</p>
        )}
      </div>

      {/* Vínculos opcionais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Item (opcional)</label>
          <select {...register("item_id")} className="input">
            <option value="">— Nenhum —</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Fornecedor (opcional)
          </label>
          <select {...register("supplier_id")} className="input">
            <option value="">— Nenhum —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Observação */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Observação</label>
        <textarea
          {...register("note")}
          rows={2}
          className="input"
          placeholder="Nota adicional..."
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Registrar Pagamento"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
