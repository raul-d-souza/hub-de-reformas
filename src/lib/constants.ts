/**
 * Constantes compartilhadas — Hub de Reformas.
 * Labels, cores e configurações usadas em toda a aplicação.
 */

/* ─── Status de Projeto ─── */
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Em andamento",
  paused: "Pausado",
  done: "Concluído",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  done: "bg-blue-100 text-blue-700",
};

/* ─── Categorias de Item/Pagamento ─── */
export const CATEGORY_LABELS: Record<string, string> = {
  material: "Material",
  labor: "Mão de obra",
  service: "Serviço",
  other: "Outro",
};

export const CATEGORY_COLORS: Record<string, string> = {
  material: "bg-blue-100 text-blue-700",
  labor: "bg-orange-100 text-orange-700",
  service: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

/* ─── Status de Pagamento ─── */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

/* ─── Métodos de Pagamento ─── */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "Pix",
  boleto: "Boleto",
  bank_transfer: "Transferência",
  cash: "Dinheiro",
  check: "Cheque",
  auto_debit: "Débito Automático",
  other: "Outro",
};

/* ─── Status de Lance ─── */
export const BID_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Rejeitado",
  counter: "Contra-proposta",
};

export const BID_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  counter: "bg-purple-100 text-purple-700",
};

/* ─── Status de Convite ─── */
export const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Recusado",
};

export const INVITATION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

/* ─── Tipos de Documento ─── */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: "Contrato",
  receipt: "Comprovante",
  invoice: "Nota Fiscal",
  budget: "Orçamento",
  blueprint: "Planta",
  photo: "Foto",
  report: "Relatório",
  other: "Outro",
};

/* ─── Categorias de Serviço ─── */
export const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  service: "Serviço",
  material: "Material",
  labor: "Mão de obra",
};
