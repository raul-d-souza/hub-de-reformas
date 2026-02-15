/**
 * Tipos TypeScript compatíveis com o schema SQL do Hub de Reformas.
 * Mantém sincronia 1:1 com as tabelas do banco.
 */

/* ─── Enums ─── */
export type ProjectStatus = "draft" | "active" | "paused" | "done";
export type UserRole = "client" | "supplier";
export type InvitationStatus = "pending" | "accepted" | "rejected";
export type BidStatus = "pending" | "accepted" | "rejected" | "counter";
export type BidType = "total" | "per_item";
export type ServiceCategory = "service" | "material" | "labor";

/* ─── Profiles ─── */
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  bio: string | null;
  company_name: string | null;
  specialty: string | null;
  city: string | null;
  state: string | null;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Projects ─── */
export interface Project {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<Omit<Project, "id" | "created_at" | "updated_at" | "owner_id">>;

/* ─── Items ─── */
export interface Item {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  estimated_total: number; // computed column
  category: PaymentCategory;
  room_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ItemInsert = Omit<
  Item,
  "id" | "created_at" | "updated_at" | "estimated_total" | "room_id"
> & { room_id?: string | null };

/* ─── Item with Payment Summary (computed, não é tabela) ─── */
export interface ItemPaymentSummary extends Item {
  totalPaid: number;
  totalPaymentAmount: number;
  paymentCount: number;
  paymentStatus: "unpaid" | "partial" | "paid";
}
export type ItemUpdate = Partial<
  Omit<Item, "id" | "created_at" | "updated_at" | "estimated_total" | "project_id">
>;

/* ─── Suppliers ─── */
export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number;
  owner_id: string;
  user_id: string | null;
  cnpj: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplierInsert = Omit<
  Supplier,
  "id" | "created_at" | "updated_at" | "user_id" | "cnpj"
> & { user_id?: string | null; cnpj?: string | null };
export type SupplierUpdate = Partial<
  Omit<Supplier, "id" | "created_at" | "updated_at" | "owner_id">
>;

/* ─── Item Suppliers (associação item ↔ fornecedor) ─── */
export interface ItemSupplier {
  id: string;
  item_id: string;
  supplier_id: string;
  unit_price: number;
  total_price: number; // computed column
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemSupplierWithDetails extends ItemSupplier {
  supplier: Supplier;
}

export type ItemSupplierInsert = Omit<
  ItemSupplier,
  "id" | "created_at" | "updated_at" | "total_price"
>;
export type ItemSupplierUpdate = Partial<Pick<ItemSupplier, "unit_price" | "note">>;

/* ─── Quote Item (dentro de items_json) ─── */
export interface QuoteItem {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

/* ─── Quotes ─── */
export interface Quote {
  id: string;
  supplier_id: string;
  project_id: string;
  total_price: number;
  items_json: QuoteItem[];
  created_at: string;
  expires_at: string | null;
  chosen: boolean;
  note: string | null;
  owner_id: string;
}

export type QuoteInsert = Omit<Quote, "id" | "created_at">;
export type QuoteUpdate = Partial<Omit<Quote, "id" | "created_at" | "owner_id">>;

/* ─── Payment Enums ─── */
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "pix"
  | "boleto"
  | "bank_transfer"
  | "cash"
  | "check"
  | "auto_debit"
  | "other";

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export type PaymentCategory = "material" | "labor" | "service" | "other";

/* ─── Payments ─── */
export interface Payment {
  id: string;
  project_id: string;
  owner_id: string;
  description: string;
  category: PaymentCategory;
  payment_method: PaymentMethod;
  total_amount: number;
  is_installment: boolean;
  num_installments: number;
  has_interest: boolean;
  interest_rate: number;
  total_with_interest: number | null;
  item_id: string | null;
  supplier_id: string | null;
  quote_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentInsert = Omit<Payment, "id" | "created_at" | "updated_at">;
export type PaymentUpdate = Partial<
  Omit<Payment, "id" | "created_at" | "updated_at" | "owner_id" | "project_id">
>;

/* ─── Installments (Parcelas) ─── */
export interface Installment {
  id: string;
  payment_id: string;
  owner_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  payment_method_used: PaymentMethod | null;
  receipt_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type InstallmentInsert = Omit<Installment, "id" | "created_at" | "updated_at">;
export type InstallmentUpdate = Partial<
  Omit<Installment, "id" | "created_at" | "updated_at" | "owner_id" | "payment_id">
>;

/* ─── Audit Logs ─── */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

/* ─── Document Enums ─── */
export type DocumentType =
  | "contract"
  | "receipt"
  | "invoice"
  | "budget"
  | "blueprint"
  | "photo"
  | "report"
  | "other";

/* ─── Documents ─── */
export interface Document {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  doc_type: DocumentType;
  payment_id: string | null;
  installment_id: string | null;
  supplier_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export type DocumentInsert = Omit<Document, "id" | "created_at" | "updated_at">;
export type DocumentUpdate = Partial<
  Omit<
    Document,
    | "id"
    | "created_at"
    | "updated_at"
    | "owner_id"
    | "project_id"
    | "file_path"
    | "file_name"
    | "file_size"
    | "mime_type"
  >
>;

/* ─── Room Enums ─── */
export type RoomType =
  | "sacada"
  | "varanda"
  | "quarto"
  | "suite"
  | "banheiro"
  | "lavabo"
  | "cozinha"
  | "sala_estar"
  | "sala_jantar"
  | "escritorio"
  | "lavanderia"
  | "area_servico"
  | "garagem"
  | "corredor"
  | "hall"
  | "despensa"
  | "closet"
  | "terraço"
  | "churrasqueira"
  | "piscina"
  | "jardim"
  | "outro";

/* ─── Project Rooms (Cômodos) ─── */
export interface ProjectRoom {
  id: string;
  project_id: string;
  owner_id: string;
  room_type: RoomType;
  custom_name: string | null;
  quantity: number;
  floor: number;
  area_m2: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectRoomInsert = Omit<ProjectRoom, "id" | "created_at" | "updated_at">;
export type ProjectRoomUpdate = Partial<
  Omit<ProjectRoom, "id" | "created_at" | "updated_at" | "owner_id" | "project_id">
>;

/* ─── Room Config (usado na UI, não é tabela) ─── */
export interface RoomConfig {
  type: RoomType;
  label: string;
  icon: string;
  color: string;
  defaultArea: number; // m² padrão para planta baixa
}

/* ─── Financial Summary (computed, não é tabela) ─── */
export interface FinancialSummary {
  totalCost: number; // Custo total da obra
  totalPaid: number; // Total já pago
  totalRemaining: number; // Quanto falta pagar
  percentPaid: number; // % pago
  nextDueDate: string | null; // Próximo vencimento
  overdueCount: number; // Parcelas vencidas
  monthsRemaining: number; // Meses até quitar
  lastDueDate: string | null; // Última parcela
}

/* ─── Supplier Services (catálogo) ─── */
export interface SupplierService {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  unit: string;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export type SupplierServiceInsert = Omit<SupplierService, "id" | "created_at" | "updated_at">;
export type SupplierServiceUpdate = Partial<
  Omit<SupplierService, "id" | "created_at" | "updated_at" | "supplier_id">
>;

/* ─── Project Invitations ─── */
export interface ProjectInvitation {
  id: string;
  project_id: string;
  supplier_id: string;
  invited_by: string;
  status: InvitationStatus;
  message: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvitationWithDetails extends ProjectInvitation {
  project?: Project;
  supplier?: Supplier;
}

export type ProjectInvitationInsert = Omit<
  ProjectInvitation,
  "id" | "created_at" | "updated_at" | "responded_at"
>;
export type ProjectInvitationUpdate = Partial<
  Pick<ProjectInvitation, "status" | "message" | "responded_at">
>;

/* ─── Project Bids (lances/propostas) ─── */
export interface BidItemDetail {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface ProjectBid {
  id: string;
  project_id: string;
  supplier_id: string;
  bid_type: BidType;
  total_price: number | null;
  items_detail: BidItemDetail[] | null;
  status: BidStatus;
  note: string | null;
  parent_bid_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectBidWithDetails extends ProjectBid {
  supplier?: Supplier;
  parent_bid?: ProjectBid;
}

export type ProjectBidInsert = Omit<ProjectBid, "id" | "created_at" | "updated_at">;
export type ProjectBidUpdate = Partial<
  Pick<ProjectBid, "status" | "note" | "total_price" | "items_detail">
>;

/* ─── Supplier Schedules (agenda) ─── */
export interface SupplierSchedule {
  id: string;
  project_id: string;
  supplier_id: string;
  start_date: string;
  end_date: string;
  deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierScheduleWithDetails extends SupplierSchedule {
  supplier?: Supplier;
  project?: Project;
}

export type SupplierScheduleInsert = Omit<SupplierSchedule, "id" | "created_at" | "updated_at">;
export type SupplierScheduleUpdate = Partial<
  Omit<SupplierSchedule, "id" | "created_at" | "updated_at" | "project_id" | "supplier_id">
>;

/* ─── Attendance Records (presença na obra) ─── */
export interface AttendanceRecord {
  id: string;
  project_id: string;
  supplier_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  note: string | null;
  created_at: string;
}

export type AttendanceRecordInsert = Omit<AttendanceRecord, "id" | "created_at">;
export type AttendanceRecordUpdate = Partial<
  Pick<AttendanceRecord, "check_in" | "check_out" | "note">
>;

/* ─── Supabase Database type helper ─── */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Profile>;
      };
      projects: { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate };
      items: { Row: Item; Insert: ItemInsert; Update: ItemUpdate };
      suppliers: { Row: Supplier; Insert: SupplierInsert; Update: SupplierUpdate };
      item_suppliers: { Row: ItemSupplier; Insert: ItemSupplierInsert; Update: ItemSupplierUpdate };
      quotes: { Row: Quote; Insert: QuoteInsert; Update: QuoteUpdate };
      payments: { Row: Payment; Insert: PaymentInsert; Update: PaymentUpdate };
      installments: { Row: Installment; Insert: InstallmentInsert; Update: InstallmentUpdate };
      documents: { Row: Document; Insert: DocumentInsert; Update: DocumentUpdate };
      project_rooms: { Row: ProjectRoom; Insert: ProjectRoomInsert; Update: ProjectRoomUpdate };
      supplier_services: {
        Row: SupplierService;
        Insert: SupplierServiceInsert;
        Update: SupplierServiceUpdate;
      };
      project_invitations: {
        Row: ProjectInvitation;
        Insert: ProjectInvitationInsert;
        Update: ProjectInvitationUpdate;
      };
      project_bids: { Row: ProjectBid; Insert: ProjectBidInsert; Update: ProjectBidUpdate };
      supplier_schedules: {
        Row: SupplierSchedule;
        Insert: SupplierScheduleInsert;
        Update: SupplierScheduleUpdate;
      };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: AttendanceRecordInsert;
        Update: AttendanceRecordUpdate;
      };
      audit_logs: { Row: AuditLog };
    };
  };
}
