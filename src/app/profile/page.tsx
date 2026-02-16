/**
 * Página de Perfil — design premium com avatar, cards de info e ações.
 */
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Mail,
  User,
  Hash,
  LogOut,
  Shield,
  Loader2,
  HardHat,
  Briefcase,
  Building2,
  Wrench,
  MapPin,
  FileText,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { formatCnpj } from "@/lib/validations";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { profile, isSupplier, supplier, refetch } = useProfile();
  const supabase = createClient();
  const router = useRouter();

  // Editable fields state
  const [editing, setEditing] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEditing() {
    setEditCompanyName(profile?.company_name || "");
    setEditCnpj(profile?.cnpj || "");
    setEditSpecialty(profile?.specialty || "");
    setEditCity(profile?.city || "");
    setEditState(profile?.state || "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sanitizedCnpj = editCnpj.replace(/[^0-9]/g, "");

      // Atualizar profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          company_name: editCompanyName || null,
          cnpj: sanitizedCnpj || null,
          specialty: editSpecialty || null,
          city: editCity || null,
          state: editState || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Atualizar supplier.name com o nome fantasia
      if (supplier) {
        const { error: supplierError } = await supabase
          .from("suppliers")
          .update({
            name: editCompanyName || supplier.name,
            cnpj: sanitizedCnpj || null,
          })
          .eq("id", supplier.id);

        if (supplierError) throw supplierError;
      }

      await refetch();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="mb-8 text-2xl font-extrabold tracking-tight text-gray-900">Meu Perfil</h1>

          {/* Avatar + Name */}
          <div className="card-solid mb-6">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-600 text-2xl font-bold text-white shadow-glow">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.user_metadata?.full_name ?? "Não informado"}
                </h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">Conta verificada</span>
                  </div>
                  {profile?.role && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isSupplier ? "bg-orange-50 text-orange-700" : "bg-navy-50 text-navy"
                      }`}
                    >
                      {isSupplier ? (
                        <HardHat className="h-3 w-3" />
                      ) : (
                        <Briefcase className="h-3 w-3" />
                      )}
                      {isSupplier ? "Fornecedor" : "Cliente"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="card-solid mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Informações da Conta
            </h3>

            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50">
                <Mail className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Email</p>
                <p className="text-sm font-semibold text-gray-900">{user?.email ?? "—"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <User className="h-5 w-5 text-orange" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Nome</p>
                <p className="text-sm font-semibold text-gray-900">
                  {user?.user_metadata?.full_name ?? "Não informado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Hash className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">ID</p>
                <p className="font-mono text-xs text-gray-400">{user?.id}</p>
              </div>
            </div>

            {/* Supplier-specific fields */}
            {isSupplier && profile && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-4">
                    Dados do Fornecedor
                  </h3>
                  {!editing ? (
                    <button onClick={startEditing} className="btn-ghost text-xs gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(false)}
                        className="btn-ghost text-xs gap-1"
                        disabled={saving}
                      >
                        <X className="h-3.5 w-3.5" /> Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        className="btn-primary text-xs gap-1"
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Salvar
                      </button>
                    </div>
                  )}
                </div>

                {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}

                {/* Empresa / Nome Fantasia */}
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                    <Building2 className="h-5 w-5 text-orange" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Nome Fantasia</p>
                    {editing ? (
                      <input
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        className="input mt-1 text-sm"
                        placeholder="Nome da empresa"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        {profile.company_name || "Não informado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* CNPJ */}
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                    <FileText className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">CNPJ</p>
                    {editing ? (
                      <input
                        type="text"
                        value={editCnpj}
                        onChange={(e) => setEditCnpj(e.target.value)}
                        className="input mt-1 text-sm font-mono"
                        placeholder="00.000.000/0000-00"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        {profile.cnpj ? formatCnpj(profile.cnpj) : "Não informado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Especialidade */}
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Especialidade</p>
                    {editing ? (
                      <input
                        type="text"
                        value={editSpecialty}
                        onChange={(e) => setEditSpecialty(e.target.value)}
                        className="input mt-1 text-sm"
                        placeholder="Ex: eletricista, encanador..."
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        {profile.specialty || "Não informado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Localização */}
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500">Localização</p>
                    {editing ? (
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="input text-sm flex-1"
                          placeholder="Cidade"
                        />
                        <input
                          type="text"
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          className="input text-sm w-20"
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        {[profile.city, profile.state].filter(Boolean).join(", ") ||
                          "Não informado"}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="card-solid">
            <h3 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Ações
            </h3>
            <button onClick={handleSignOut} className="btn-danger w-full sm:w-auto">
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
