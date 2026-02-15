/**
 * React Query hooks para Quotes e Bids.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabaseClient";
import { getQuotesByProject, createQuote, deleteQuote, chooseQuote } from "@/services/quotes";
import { getProjectBids, getSupplierBids, createBid, updateBid } from "@/services/bids";
import type { QuoteInsert, ProjectBidInsert, ProjectBidUpdate } from "@/types/database";

const supabase = createClient();

/* ─── Quotes ─── */

export function useQuotes(projectId: string) {
  return useQuery({
    queryKey: ["quotes", projectId],
    queryFn: () => getQuotesByProject(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useCreateQuote(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quote: QuoteInsert) => createQuote(supabase, quote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", projectId] }),
  });
}

export function useDeleteQuote(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuote(supabase, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", projectId] }),
  });
}

export function useChooseQuote(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => chooseQuote(supabase, quoteId, projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes", projectId] }),
  });
}

/* ─── Bids ─── */

export function useProjectBids(projectId: string) {
  return useQuery({
    queryKey: ["bids", "project", projectId],
    queryFn: () => getProjectBids(supabase, projectId),
    enabled: !!projectId,
  });
}

export function useSupplierBids(supplierId: string, page = 1) {
  return useQuery({
    queryKey: ["bids", "supplier", supplierId, page],
    queryFn: () => getSupplierBids(supabase, supplierId, { page }),
    enabled: !!supplierId,
  });
}

export function useCreateBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bid: ProjectBidInsert) => createBid(supabase, bid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bids"] }),
  });
}

export function useUpdateBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectBidUpdate }) =>
      updateBid(supabase, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bids"] }),
  });
}
