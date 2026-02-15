/**
 * Utilitários de formatação — Hub de Reformas.
 * Centraliza formatação de moeda, data e tamanho de arquivo.
 */

/**
 * Formata um número como moeda brasileira (R$).
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata uma string ISO para data pt-BR (dd/mm/aaaa).
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

/**
 * Formata data de string com fuso horário seguro (evita off-by-one).
 * Usa T00:00:00 para datas YYYY-MM-DD vindas do banco.
 */
export function formatDateSafe(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Formata data com dia da semana e hora.
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata data com dia da semana curto.
 */
export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

/**
 * Formata data completa com dia da semana.
 */
export function formatDateFull(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/**
 * Formata tamanho de arquivo para exibição.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
