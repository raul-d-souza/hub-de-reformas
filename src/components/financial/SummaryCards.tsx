/**
 * FinancialSummaryCards — cards de resumo financeiro.
 */
"use client";

import { formatCurrency } from "@/lib/format";
import type { FinancialSummary } from "@/types/database";

interface SummaryCardsProps {
  summary: FinancialSummary;
  itemsCount: number;
  estimatedTotal: number;
  formatDateFin: (dateStr: string) => string;
}

export function SummaryCards({
  summary,
  itemsCount,
  estimatedTotal,
  formatDateFin,
}: SummaryCardsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Custo Total */}
        <div className="card-solid">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <span className="text-lg">🏗️</span> Custo Total da Obra
          </div>
          <p className="mt-1 text-2xl font-bold text-navy">{formatCurrency(summary.totalCost)}</p>
          {itemsCount > 0 && (
            <p className="mt-0.5 text-xs text-gray-400">
              {itemsCount} item(ns) · Est: {formatCurrency(estimatedTotal)}
            </p>
          )}
        </div>

        {/* Já Pago */}
        <div className="card-solid">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <span className="text-lg">✅</span> Já Pago
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {formatCurrency(summary.totalPaid)}
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            {summary.percentPaid.toFixed(1)}% do total
          </p>
        </div>

        {/* Falta Pagar */}
        <div className="card-solid">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
            <span className="text-lg">⏳</span> Falta Pagar
          </div>
          <p className="mt-1 text-2xl font-bold text-orange">
            {formatCurrency(summary.totalRemaining)}
          </p>
          {summary.overdueCount > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-red-600">
              ⚠️ {summary.overdueCount} parcela(s) vencida(s)
            </p>
          )}
        </div>

        {/* Tempo para Quitar */}
        <div className="card-solid">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
            <span className="text-lg">📅</span> Tempo para Quitar
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {summary.monthsRemaining > 0
              ? `${summary.monthsRemaining} ${summary.monthsRemaining === 1 ? "mês" : "meses"}`
              : summary.totalRemaining > 0
                ? "Vencido"
                : "Quitado! 🎉"}
          </p>
          {summary.nextDueDate && (
            <p className="mt-0.5 text-xs text-blue-600">
              Próx. vencimento: {formatDateFin(summary.nextDueDate)}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {summary.totalCost > 0 && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progresso de Pagamento</span>
            <span className="font-semibold text-navy">{summary.percentPaid.toFixed(1)}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy to-orange transition-all duration-700"
              style={{ width: `${Math.min(100, summary.percentPaid)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Pago: {formatCurrency(summary.totalPaid)}</span>
            <span>Restante: {formatCurrency(summary.totalRemaining)}</span>
          </div>
        </div>
      )}
    </>
  );
}
