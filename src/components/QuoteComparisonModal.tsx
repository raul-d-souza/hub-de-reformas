/**
 * QuoteComparisonModal — modal premium para comparar cotações lado a lado.
 */
"use client";

import { useEffect, useRef } from "react";
import type { QuoteItem } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion } from "framer-motion";
import { X, TrendingDown, CheckCircle2, Clock } from "lucide-react";

interface QuoteData {
  id: string;
  total_price: number;
  items_json: QuoteItem[];
  chosen: boolean;
  note: string | null;
  created_at: string;
  expires_at: string | null;
  suppliers?: { name: string; contact_name?: string; phone?: string; email?: string } | null;
}

interface QuoteComparisonModalProps {
  quotes: QuoteData[];
  onClose: () => void;
}

export default function QuoteComparisonModal({ quotes, onClose }: QuoteComparisonModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const sorted = [...quotes].sort((a, b) => a.total_price - b.total_price);
  const cheapest = sorted[0]?.id;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Comparador de cotações"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-elevated"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
            Comparador de Cotações
          </h2>
          <button onClick={onClose} className="btn-icon" aria-label="Fechar modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabela de comparação */}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-surface-100">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Fornecedor
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Preço Total
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Itens
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Validade
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((quote) => (
                <tr
                  key={quote.id}
                  className={`border-b border-gray-50 transition-colors ${
                    quote.chosen
                      ? "bg-green-50/80"
                      : quote.id === cheapest
                        ? "bg-emerald-50/50"
                        : "hover:bg-surface-100"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{quote.suppliers?.name ?? "—"}</p>
                    {quote.suppliers?.contact_name && (
                      <p className="text-xs text-gray-400">{quote.suppliers.contact_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-lg font-bold text-navy">
                      {formatCurrency(quote.total_price)}
                    </p>
                    {quote.id === cheapest && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <TrendingDown className="h-3 w-3" />
                        Mais barato
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1">
                      {quote.items_json.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-600">
                          {item.item_name}: {item.quantity} {item.unit} ×{" "}
                          {formatCurrency(item.unit_price)}
                          {" = "}
                          <strong className="text-gray-800">{formatCurrency(item.total)}</strong>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {quote.expires_at ? formatDate(quote.expires_at) : "Sem validade"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {quote.chosen ? (
                      <span className="badge-active inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Escolhida
                      </span>
                    ) : (
                      <span className="badge-draft">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notas */}
        {sorted.some((q) => q.note) && (
          <div className="mt-5 rounded-xl bg-surface-100 p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Observações
            </h3>
            {sorted
              .filter((q) => q.note)
              .map((q) => (
                <p key={q.id} className="text-xs text-gray-600">
                  <strong className="text-gray-800">{q.suppliers?.name}:</strong> {q.note}
                </p>
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
