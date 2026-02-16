/**
 * Schemas Zod para validação de formulários.
 * Usados em conjunto com react-hook-form via @hookform/resolvers/zod.
 */
import { z } from "zod";

/* ─── Helpers ─── */

/** Remove pontuação de um CNPJ, retornando apenas dígitos */
export function sanitizeCnpj(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** Valida os dígitos verificadores de um CNPJ (apenas dígitos, 14 chars) */
export function isValidCnpj(raw: string): boolean {
  const cnpj = sanitizeCnpj(raw);
  if (cnpj.length !== 14) return false;
  // Rejeitar todos dígitos iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const digits = cnpj.split("").map(Number);

  const calcDigit = (weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (digits[12] !== calcDigit(weights1)) return false;
  if (digits[13] !== calcDigit(weights2)) return false;
  return true;
}

/** Formata CNPJ: 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const digits = sanitizeCnpj(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/* ─── Auth ─── */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm_password: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["client", "supplier"]).default("client"),
    company_name: z.string().optional(),
    specialty: z.string().optional(),
    cnpj: z
      .string()
      .optional()
      .refine((val) => !val || val.trim() === "" || isValidCnpj(val), { message: "CNPJ inválido" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Senhas não conferem",
    path: ["confirm_password"],
  });
export type SignupFormData = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/* ─── Projects ─── */
export const projectSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  address: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "done"]).default("draft"),
});
export type ProjectFormData = z.infer<typeof projectSchema>;

/* ─── Items ─── */
export const itemSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.enum(["material", "labor", "service", "other"]).default("material"),
  quantity: z.coerce.number().positive("Quantidade deve ser positiva"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  estimated_unit_price: z.coerce.number().min(0, "Preço deve ser >= 0"),
  room_id: z.string().uuid().optional().or(z.literal("")),
});
export type ItemFormData = z.infer<typeof itemSchema>;

/* ─── Suppliers ─── */
export const supplierSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(5).default(0),
  cnpj: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === "" || isValidCnpj(val), { message: "CNPJ inválido" }),
});
export type SupplierFormData = z.infer<typeof supplierSchema>;

/* ─── Quotes ─── */
export const quoteItemSchema = z.object({
  item_name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1),
  unit_price: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
});

export const quoteSchema = z.object({
  supplier_id: z.string().uuid("Selecione um fornecedor"),
  project_id: z.string().uuid(),
  total_price: z.coerce.number().min(0),
  items_json: z.array(quoteItemSchema).min(1, "Adicione pelo menos 1 item"),
  expires_at: z.string().optional(),
  note: z.string().optional(),
});
export type QuoteFormData = z.infer<typeof quoteSchema>;

/* ─── Payments ─── */
export const paymentSchema = z.object({
  description: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres"),
  category: z.enum(["material", "labor", "service", "other"]).default("material"),
  payment_method: z.enum([
    "credit_card",
    "debit_card",
    "pix",
    "boleto",
    "bank_transfer",
    "cash",
    "check",
    "auto_debit",
    "other",
  ]),
  total_amount: z.coerce.number().positive("Valor deve ser positivo"),
  is_installment: z.boolean().default(false),
  num_installments: z.coerce.number().int().min(1).default(1),
  has_interest: z.boolean().default(false),
  interest_rate: z.coerce.number().min(0).max(100).default(0),
  first_due_date: z.string().min(1, "Informe a data do primeiro vencimento"),
  item_id: z.string().uuid().optional().or(z.literal("")),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  quote_id: z.string().uuid().optional().or(z.literal("")),
  note: z.string().optional(),
});
export type PaymentFormData = z.infer<typeof paymentSchema>;

/* ─── Installment Update ─── */
export const installmentUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  paid_date: z.string().optional(),
  payment_method_used: z
    .enum([
      "credit_card",
      "debit_card",
      "pix",
      "boleto",
      "bank_transfer",
      "cash",
      "check",
      "auto_debit",
      "other",
    ])
    .optional(),
  note: z.string().optional(),
});
export type InstallmentUpdateFormData = z.infer<typeof installmentUpdateSchema>;
