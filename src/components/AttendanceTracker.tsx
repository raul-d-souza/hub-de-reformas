/**
 * AttendanceTracker — componente de presença na obra.
 * Usado pelo fornecedor para registrar check-in/check-out.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  getSupplierAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from "@/services/attendance";
import { motion } from "framer-motion";
import { formatDateFull, formatDateShort } from "@/lib/format";
import {
  ClipboardCheck,
  LogIn,
  LogOut,
  Calendar,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  StickyNote,
} from "lucide-react";
import type { AttendanceRecord } from "@/types/database";

interface AttendanceTrackerProps {
  projectId: string;
  supplierId: string;
  readOnly?: boolean;
}

export default function AttendanceTracker({
  projectId,
  supplierId,
  readOnly = false,
}: AttendanceTrackerProps) {
  const supabase = createClient();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await getSupplierAttendance(supabase, projectId, supplierId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar presença");
    } finally {
      setLoading(false);
    }
  }, [supabase, projectId, supplierId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const today = new Date().toISOString().split("T")[0];
  const todayRecord = records.find((r) => r.date === today);

  async function handleCheckIn() {
    setActionLoading(true);
    setError(null);
    try {
      await createAttendance(supabase, {
        project_id: projectId,
        supplier_id: supplierId,
        date: today,
        check_in: new Date().toISOString(),
        check_out: null,
        note: null,
      });
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no check-in");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!todayRecord) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateAttendance(supabase, todayRecord.id, {
        check_out: new Date().toISOString(),
      });
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no check-out");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este registro?")) return;
    try {
      await deleteAttendance(supabase, id);
      await fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <ClipboardCheck className="h-5 w-5 text-purple-600" />
          Presença na Obra
        </h3>
        {!readOnly && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {formatDateFull()}
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error mb-4 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-red-500" />
          {error}
        </div>
      )}

      {/* Today Action */}
      {!readOnly && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100 p-4">
          {!todayRecord ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Não registrado hoje</p>
                <p className="text-sm text-gray-500">Clique para registrar sua presença na obra</p>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="btn-primary bg-purple-600 hover:bg-purple-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Check-in
              </button>
            </div>
          ) : !todayRecord.check_out ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="font-semibold text-gray-900">Check-in realizado</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Entrada:{" "}
                  {new Date(todayRecord.check_in!).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="btn-primary bg-purple-600 hover:bg-purple-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Check-out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Dia completo</p>
                <p className="text-sm text-gray-500">
                  {new Date(todayRecord.check_in!).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  →{" "}
                  {new Date(todayRecord.check_out!).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {records.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Nenhum registro de presença.</p>
      ) : (
        <div className="space-y-2">
          {records.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between rounded-xl bg-surface-100 p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${rec.check_out ? "bg-emerald-50" : "bg-amber-50"}`}
                >
                  {rec.check_out ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDateShort(rec.date)}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {rec.check_in && (
                      <span className="flex items-center gap-1">
                        <LogIn className="h-3 w-3" />
                        {new Date(rec.check_in).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {rec.check_out && (
                      <span className="flex items-center gap-1">
                        <LogOut className="h-3 w-3" />
                        {new Date(rec.check_out).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rec.note && (
                  <span className="text-xs text-gray-400" title={rec.note}>
                    <StickyNote className="h-3.5 w-3.5" />
                  </span>
                )}
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="btn-ghost !p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
