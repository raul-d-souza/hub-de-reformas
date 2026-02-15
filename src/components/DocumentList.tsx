/**
 * DocumentList — lista de documentos de um projeto com filtros,
 * visualização, download e exclusão.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  getDocumentsByProject,
  getDocumentUrl,
  deleteDocument,
  formatFileSize,
} from "@/services/documents";
import { formatDate } from "@/lib/format";
import type { DocumentType } from "@/types/database";
import DocumentUpload from "./DocumentUpload";

interface DocumentListProps {
  projectId: string;
}

interface DocumentRow {
  id: string;
  name: string;
  description: string | null;
  doc_type: DocumentType;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  payment_id: string | null;
  installment_id: string | null;
  supplier_id: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
  payments?: { description: string } | null;
  installments?: { installment_number: number } | null;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract: "Contrato",
  receipt: "Comprovante",
  invoice: "Nota Fiscal",
  budget: "Orçamento",
  blueprint: "Planta",
  photo: "Foto",
  report: "Relatório",
  other: "Outro",
};

const DOC_TYPE_ICONS: Record<DocumentType, string> = {
  contract: "📄",
  receipt: "🧾",
  invoice: "🧾",
  budget: "💰",
  blueprint: "📐",
  photo: "📷",
  report: "📊",
  other: "📎",
};

const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  contract: "bg-blue-100 text-blue-800",
  receipt: "bg-green-100 text-green-800",
  invoice: "bg-purple-100 text-purple-800",
  budget: "bg-yellow-100 text-yellow-800",
  blueprint: "bg-cyan-100 text-cyan-800",
  photo: "bg-pink-100 text-pink-800",
  report: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-600",
};

type FilterType = "all" | DocumentType;

export default function DocumentList({ projectId }: DocumentListProps) {
  const supabase = createClient();

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadDocuments = useCallback(async () => {
    try {
      const data = await getDocumentsByProject(supabase, projectId);
      setDocuments(data as DocumentRow[]);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    }
    setIsLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleView(doc: DocumentRow) {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentUrl(supabase, doc.file_path);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Erro ao abrir documento:", err);
    }
    setDownloadingId(null);
  }

  async function handleDownload(doc: DocumentRow) {
    setDownloadingId(doc.id);
    try {
      const url = await getDocumentUrl(supabase, doc.file_path);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      link.click();
    } catch (err) {
      console.error("Erro no download:", err);
    }
    setDownloadingId(null);
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Excluir o documento "${doc.name}"?`)) return;
    try {
      await deleteDocument(supabase, { id: doc.id, file_path: doc.file_path });
      await loadDocuments();
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
    }
  }

  // Filtros combinados
  const filteredDocs = documents.filter((doc) => {
    if (filterType !== "all" && doc.doc_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.file_name.toLowerCase().includes(q) ||
        (doc.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // Contagem por tipo
  const typeCounts: Record<string, number> = {};
  for (const doc of documents) {
    typeCounts[doc.doc_type] = (typeCounts[doc.doc_type] ?? 0) + 1;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
          <p className="text-sm text-gray-500">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-navy">📁 Documentos</h2>
        <button onClick={() => setShowUpload(!showUpload)} className="btn-primary text-sm">
          {showUpload ? "✕ Fechar" : "+ Enviar Documento"}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <DocumentUpload
          projectId={projectId}
          onSuccess={() => {
            setShowUpload(false);
            loadDocuments();
          }}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* Stats */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {documents.length} documento{documents.length !== 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {formatFileSize(documents.reduce((sum, d) => sum + d.file_size, 0))} total
          </span>
        </div>
      )}

      {/* Search + Filter */}
      {documents.length > 0 && (
        <div className="space-y-3">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Buscar por nome ou descrição..."
            className="input"
          />

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterType === "all"
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todos ({documents.length})
            </button>
            {Object.entries(typeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as DocumentType)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === type
                    ? "bg-navy text-white"
                    : `${DOC_TYPE_COLORS[type as DocumentType] || "bg-gray-100 text-gray-600"} hover:opacity-80`
                }`}
              >
                {DOC_TYPE_ICONS[type as DocumentType]}{" "}
                {DOC_TYPE_LABELS[type as DocumentType] || type} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="card py-12 text-center">
          {documents.length === 0 ? (
            <>
              <p className="text-4xl">📁</p>
              <h3 className="mt-3 text-lg font-semibold text-gray-700">Nenhum documento ainda</h3>
              <p className="mt-1 text-sm text-gray-400">
                Envie contratos, comprovantes, notas fiscais e outros documentos do projeto.
              </p>
              {!showUpload && (
                <button onClick={() => setShowUpload(true)} className="btn-primary mt-4 text-sm">
                  + Enviar Primeiro Documento
                </button>
              )}
            </>
          ) : (
            <p className="text-gray-400">Nenhum documento encontrado com os filtros aplicados.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="card group relative transition-shadow hover:shadow-md">
              {/* Type Badge */}
              <div className="mb-3 flex items-start justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    DOC_TYPE_COLORS[doc.doc_type]
                  }`}
                >
                  {DOC_TYPE_ICONS[doc.doc_type]} {DOC_TYPE_LABELS[doc.doc_type]}
                </span>
                <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
              </div>

              {/* Info */}
              <h4 className="font-semibold text-gray-900 line-clamp-1">{doc.name}</h4>
              {doc.description && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{doc.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                <span>{doc.file_name}</span>
                <span>•</span>
                <span>{formatFileSize(doc.file_size)}</span>
              </div>

              {/* Linked refs */}
              {(doc.payments || doc.installments || doc.suppliers) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {doc.payments?.description && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                      💳 {doc.payments.description}
                    </span>
                  )}
                  {doc.installments?.installment_number && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                      #{doc.installments.installment_number}
                    </span>
                  )}
                  {doc.suppliers?.name && (
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700">
                      🏢 {doc.suppliers.name}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                <button
                  onClick={() => handleView(doc)}
                  disabled={downloadingId === doc.id}
                  className="btn-ghost text-xs !px-2 !py-1.5 flex-1 disabled:opacity-50"
                >
                  {downloadingId === doc.id ? "..." : "👁️ Visualizar"}
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className="btn-ghost text-xs !px-2 !py-1.5 flex-1 text-navy disabled:opacity-50"
                >
                  {downloadingId === doc.id ? "..." : "⬇️ Download"}
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="btn-ghost text-xs !px-2 !py-1.5 text-red-500"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
