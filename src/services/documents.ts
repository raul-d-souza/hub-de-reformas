/**
 * Serviço de Documents — upload, download, CRUD de documentos via Supabase Storage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document, DocumentInsert, DocumentUpdate } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

const BUCKET = "project-documents";

/* ─── Helpers ─── */

/**
 * Gera o path de storage: <user_id>/<project_id>/<uuid>_<filename>
 */
function buildFilePath(ownerId: string, projectId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueId = crypto.randomUUID().slice(0, 8);
  return `${ownerId}/${projectId}/${uniqueId}_${sanitized}`;
}

/**
 * Formata tamanho de arquivo para exibição.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Upload ─── */

/**
 * Faz upload de um arquivo para o Supabase Storage e registra no banco.
 */
export async function uploadDocument(
  supabase: Client,
  file: File,
  metadata: {
    projectId: string;
    ownerId: string;
    name: string;
    description?: string;
    docType: string;
    paymentId?: string;
    installmentId?: string;
    supplierId?: string;
  },
): Promise<Document> {
  const filePath = buildFilePath(metadata.ownerId, metadata.projectId, file.name);

  // 1. Upload para o Storage
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

  // 2. Registrar no banco
  const docInsert: DocumentInsert = {
    project_id: metadata.projectId,
    owner_id: metadata.ownerId,
    name: metadata.name,
    description: metadata.description || null,
    doc_type: metadata.docType as DocumentInsert["doc_type"],
    payment_id: metadata.paymentId || null,
    installment_id: metadata.installmentId || null,
    supplier_id: metadata.supplierId || null,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  };

  const { data, error: dbError } = await supabase
    .from("documents")
    .insert(docInsert)
    .select()
    .single();

  if (dbError) {
    // Rollback: remover arquivo se insert falhar
    await supabase.storage.from(BUCKET).remove([filePath]);
    throw new Error(`Erro ao salvar documento: ${dbError.message}`);
  }

  return data as Document;
}

/* ─── Download / View ─── */

/**
 * Gera URL temporária (signed) para download/visualização de um documento.
 * Válida por 1 hora.
 */
export async function getDocumentUrl(
  supabase: Client,
  filePath: string,
  expiresIn: number = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresIn);

  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}

/**
 * Download direto do arquivo (retorna Blob).
 */
export async function downloadDocument(supabase: Client, filePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error) throw new Error(`Erro no download: ${error.message}`);
  return data;
}

/* ─── CRUD ─── */

/**
 * Lista documentos de um projeto, com filtros opcionais.
 */
export async function getDocumentsByProject(
  supabase: Client,
  projectId: string,
  filters?: {
    docType?: string;
    paymentId?: string;
    installmentId?: string;
  },
) {
  let query = supabase
    .from("documents")
    .select("*, suppliers(name), payments(description), installments(installment_number)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filters?.docType) {
    query = query.eq("doc_type", filters.docType);
  }
  if (filters?.paymentId) {
    query = query.eq("payment_id", filters.paymentId);
  }
  if (filters?.installmentId) {
    query = query.eq("installment_id", filters.installmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Lista documentos vinculados a uma parcela específica.
 */
export async function getDocumentsByInstallment(supabase: Client, installmentId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("installment_id", installmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Document[];
}

/**
 * Lista documentos vinculados a um pagamento específico.
 */
export async function getDocumentsByPayment(supabase: Client, paymentId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("payment_id", paymentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Document[];
}

/**
 * Atualiza metadados de um documento (nome, descrição, tipo).
 */
export async function updateDocument(supabase: Client, id: string, updates: DocumentUpdate) {
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

/**
 * Exclui um documento (remove do Storage e do banco).
 */
export async function deleteDocument(supabase: Client, doc: { id: string; file_path: string }) {
  // 1. Remover do Storage
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.file_path]);

  if (storageError) {
    console.warn("Aviso: erro ao remover arquivo do storage:", storageError.message);
  }

  // 2. Remover do banco
  const { error: dbError } = await supabase.from("documents").delete().eq("id", doc.id);

  if (dbError) throw dbError;
}
