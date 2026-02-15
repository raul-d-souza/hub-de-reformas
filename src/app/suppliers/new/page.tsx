/**
 * Formulário de cadastro de fornecedor — design premium com ícones e feedback visual.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, type SupplierFormData, formatCnpj } from "@/lib/validations";
import { createClient } from "@/lib/supabaseClient";
import { createSupplier } from "@/services/suppliers";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Globe,
  Star,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";

export default function NewSupplierPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { rating: 0 },
  });

  async function onSubmit(data: SupplierFormData) {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      await createSupplier(supabase, {
        ...data,
        contact_name: data.contact_name || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        cnpj: data.cnpj ? data.cnpj.replace(/[^0-9]/g, "") : null,
        owner_id: user.id,
        user_id: null,
      });
      router.push("/suppliers");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar fornecedor");
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <Link
              href="/suppliers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar aos fornecedores
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">
              Novo Fornecedor
            </h1>
            <p className="mt-1 text-sm text-gray-500">Preencha os dados do fornecedor abaixo</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert-error mb-5 flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="card-solid space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Nome da Empresa *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="input pl-10"
                  placeholder="Ex: Casa dos Pisos Ltda"
                  aria-invalid={errors.name ? "true" : "false"}
                />
              </div>
              {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label
                htmlFor="contact_name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Nome do Contato
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="contact_name"
                  type="text"
                  {...register("contact_name")}
                  className="input pl-10"
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="input pl-10"
                    placeholder="(11) 99999-0000"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="input pl-10"
                    placeholder="contato@empresa.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="cnpj" className="mb-1.5 block text-sm font-medium text-gray-700">
                CNPJ
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="cnpj"
                  type="text"
                  {...register("cnpj")}
                  onChange={(e) => {
                    const formatted = formatCnpj(e.target.value);
                    setValue("cnpj", formatted);
                  }}
                  className="input pl-10"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  aria-invalid={errors.cnpj ? "true" : "false"}
                />
              </div>
              {errors.cnpj && <p className="mt-1.5 text-xs text-red-600">{errors.cnpj.message}</p>}
              <p className="mt-1 text-xs text-gray-400">
                Usado para vincular automaticamente com o cadastro do fornecedor
              </p>
            </div>

            <div>
              <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-gray-700">
                Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="website"
                  type="url"
                  {...register("website")}
                  className="input pl-10"
                  placeholder="https://empresa.com.br"
                />
              </div>
              {errors.website && (
                <p className="mt-1.5 text-xs text-red-600">{errors.website.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="rating" className="mb-1.5 block text-sm font-medium text-gray-700">
                Avaliação (0 a 5)
              </label>
              <div className="relative w-36">
                <Star className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="rating"
                  type="number"
                  step="0.5"
                  min="0"
                  max="5"
                  {...register("rating")}
                  className="input pl-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isLoading ? "Salvando..." : "Cadastrar Fornecedor"}
              </button>
              <Link href="/suppliers" className="btn-ghost">
                Cancelar
              </Link>
            </div>
          </form>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
