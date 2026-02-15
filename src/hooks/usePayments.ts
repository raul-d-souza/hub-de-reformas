/**
 * React Query hooks para Payments e Installments.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import {
  getPaymentsByProject,
  createPayment,
  updatePayment,
  deletePayment,
  getInstallmentsByPayment,
  createInstallmentsForPayment,
  updateInstallment,
  getFinancialSummary,
} from "@/services/payments";
import type { PaymentInsert, PaymentUpdate, Payment, InstallmentUpdate } from "@/types/database";

const supabase = createClient();

export function usePayments(projectId: string) {
  return useQuery({
    queryKey: ["payments", projectId],
    queryFn: () => getPaymentsByProject(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useFinancialSummary(projectId: string) {
  return useQuery({
    queryKey: ["financial-summary", projectId],
    queryFn: () => getFinancialSummary(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useCreatePayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payment: PaymentInsert) => createPayment(supabase, payment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", projectId] });
      qc.invalidateQueries({ queryKey: ["financial-summary", projectId] });
    },
  });
}

export function useUpdatePayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentUpdate }) =>
      updatePayment(supabase, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", projectId] });
      qc.invalidateQueries({ queryKey: ["financial-summary", projectId] });
    },
  });
}

export function useDeletePayment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayment(supabase, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments", projectId] });
      qc.invalidateQueries({ queryKey: ["financial-summary", projectId] });
    },
  });
}

export function useInstallments(paymentId: string) {
  return useQuery({
    queryKey: ["installments", paymentId],
    queryFn: () => getInstallmentsByPayment(supabase, paymentId),
    enabled: !!paymentId,
  });
}

export function useCreateInstallments(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payment,
      firstDueDate,
      ownerId,
    }: {
      payment: Payment;
      firstDueDate: string;
      ownerId: string;
    }) => createInstallmentsForPayment(supabase, payment, firstDueDate, ownerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      qc.invalidateQueries({ queryKey: ["payments", projectId] });
      qc.invalidateQueries({ queryKey: ["financial-summary", projectId] });
    },
  });
}

export function useUpdateInstallment(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InstallmentUpdate }) =>
      updateInstallment(supabase, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["installments"] });
      qc.invalidateQueries({ queryKey: ["payments", projectId] });
      qc.invalidateQueries({ queryKey: ["financial-summary", projectId] });
    },
  });
}
