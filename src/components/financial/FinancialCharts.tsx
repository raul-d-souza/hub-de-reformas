/**
 * FinancialCharts — sub-componentes de gráficos do FinancialDashboard.
 * Isolados para facilitar lazy-loading do Recharts.
 */
"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";

/* ─── Types ─── */

interface MonthlyData {
  month: string;
  due: number;
  paid: number;
  label?: string;
}

interface PieEntry {
  key: string;
  name: string;
  value: number;
}

const PIE_COLORS: Record<string, string> = {
  material: "#0B3D91",
  labor: "#FF8C42",
  service: "#10B981",
  equipment: "#8B5CF6",
  tax: "#EF4444",
  other: "#6B7280",
};

/* ─── Bar Chart ─── */

interface MonthlyBarChartProps {
  data: MonthlyData[];
  formatMonthLabel: (m: string) => string;
}

export function MonthlyBarChart({ data, formatMonthLabel }: MonthlyBarChartProps) {
  if (data.length === 0) return null;
  return (
    <div className="card lg:col-span-2">
      <h3 className="mb-4 text-base font-semibold text-navy">📊 Evolução Mensal</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.map((d) => ({ ...d, label: formatMonthLabel(d.month) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                name === "due" ? "A Pagar" : "Pago",
              ]}
              labelFormatter={(label) => `Mês: ${String(label)}`}
            />
            <Legend formatter={(value: string) => (value === "due" ? "A Pagar" : "Pago")} />
            <Bar dataKey="due" stackId="a" radius={[0, 0, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`due-${index}`} fill="#0B3D91" opacity={0.3} />
              ))}
            </Bar>
            <Bar dataKey="paid" stackId="a" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`paid-${index}`} fill="#FF8C42" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Pie Chart ─── */

interface CategoryPieChartProps {
  data: PieEntry[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) return null;
  return (
    <div className="card">
      <h3 className="mb-4 text-base font-semibold text-navy">🍩 Gastos por Categoria</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={PIE_COLORS[entry.key] || "#6B7280"} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
        {data.map((entry) => (
          <div key={entry.key} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: PIE_COLORS[entry.key] || "#6B7280" }}
            />
            <span className="text-gray-600">{entry.name}</span>
            <span className="font-medium text-gray-800">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
