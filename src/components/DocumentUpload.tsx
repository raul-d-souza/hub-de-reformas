/**
 * DocumentUpload — componente reutilizável para upload de documentos.
 * Suporta drag & drop, preview de imagem, barra de progresso visual.
 * Pode ser usado na seção de documentos do projeto ou no comprovante de parcela.
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { uploadDocument } from "@/services/documents";
import type { DocumentType } from "@/types/database";

interface DocumentUploadProps {
  projectId: string;
  /** Tipo padrão do documento */
  defaultDocType?: DocumentType;
  /** Se informado, vincula ao pagamento */
  paymentId?: string;
  /** Se informado, vincula à parcela */
  installmentId?: string;
  /** Se informado, vincula ao fornecedor */
  supplierId?: string;
  /** Esconde seletor de tipo quando o tipo é fixo (ex: receipt) */
  hideTypeSelector?: boolean;
  /** Callback após upload com sucesso */
  onSuccess: () => void;
  /** Callback para cancelar/fechar */
  onCancel?: () => void;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  contract: "📄 Contrato",
  receipt: "🧾 Comprovante",
  invoice: "🧾 Nota Fiscal",
  budget: "💰 Orçamento",
  blueprint: "📐 Planta/Projeto",
  photo: "📷 Foto",
  report: "📊 Relatório",
  other: "📎 Outro",
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/plain",
  "text/csv",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUpload({
  projectId,
  defaultDocType = "other",
  paymentId,
  installmentId,
  supplierId,
  hideTypeSelector = false,
  onSuccess,
  onCancel,
}: DocumentUploadProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (selectedFile: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setError("Tipo de arquivo não suportado. Use PDF, imagens, Word, Excel ou texto.");
        return;
      }

      if (selectedFile.size > MAX_SIZE) {
        setError(`Arquivo muito grande. Máximo: ${formatSize(MAX_SIZE)}.`);
        return;
      }

      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^.]+$/, ""));
      }

      // Preview para imagens
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [name],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    if (!name.trim()) {
      setError("Informe um nome para o documento.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      await uploadDocument(supabase, file, {
        projectId,
        ownerId: userData.user.id,
        name: name.trim(),
        description: description.trim() || undefined,
        docType,
        paymentId,
        installmentId,
        supplierId,
      });

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    }

    setIsUploading(false);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h4 className="text-base font-semibold text-navy">📎 Enviar Documento</h4>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {/* Drop Zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            isDragOver
              ? "border-orange bg-orange-50"
              : "border-gray-300 bg-gray-50 hover:border-navy hover:bg-blue-50"
          }`}
        >
          <span className="text-3xl">📁</span>
          <p className="mt-2 text-sm font-medium text-gray-600">
            Arraste um arquivo ou{" "}
            <span className="text-navy underline">clique para selecionar</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">PDF, imagens, Word, Excel — máx. 50 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            {/* Preview / Ícone */}
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-2xl">
                {file.type === "application/pdf" ? "📄" : "📎"}
              </div>
            )}

            <div className="flex-1">
              <p className="font-medium text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-500">
                {formatSize(file.size)} • {file.type.split("/").pop()?.toUpperCase()}
              </p>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
              title="Remover arquivo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome do Documento *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Ex: Contrato com pedreiro"
        />
      </div>

      {/* Type */}
      {!hideTypeSelector && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="input"
          >
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Descrição (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input"
          placeholder="Observações sobre o documento..."
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isUploading || !file}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Enviando...
            </span>
          ) : (
            "Enviar Documento"
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
