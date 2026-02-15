/**
 * Página de Cadastro — design premium com split layout e animações.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormData } from "@/lib/validations";
import { formatCnpj } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  HardHat,
  Building2,
  Link2,
} from "lucide-react";

export default function SignupPage() {
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hadCnpj, setHadCnpj] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "client" },
  });

  const selectedRole = watch("role");

  async function onSubmit(data: SignupFormData) {
    setIsLoading(true);
    setError(null);
    const cnpjProvided = !!(data.cnpj && data.cnpj.replace(/[^0-9]/g, "").length === 14);
    const { error } = await signUp(
      data.email,
      data.password,
      data.full_name,
      data.role,
      data.company_name,
      data.specialty,
      data.cnpj,
    );
    if (error) {
      setError(error.message);
    } else {
      setHadCnpj(cnpjProvided && data.role === "supplier");
      setSuccess(true);
    }
    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-solid w-full max-w-md text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-gray-900">Conta criada!</h1>
          <p className="text-gray-500">
            Verifique seu email para confirmar o cadastro e depois faça{" "}
            <Link
              href="/login"
              className="font-semibold text-navy hover:text-navy-600 transition-colors"
            >
              login
            </Link>
            .
          </p>
          {hadCnpj && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Link2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Vinculação automática por CNPJ
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Se algum cliente já cadastrou sua empresa pelo CNPJ, seus projetos, cotações e
                    convites serão automaticamente vinculados à sua conta após o login.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange to-orange-400 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-extrabold text-white leading-tight xl:text-5xl">
              Comece a<br />
              transformar sua
              <br />
              <span className="text-navy-900">reforma hoje.</span>
            </h2>
            <p className="mt-6 text-lg text-orange-100 max-w-md leading-relaxed">
              Cadastre-se gratuitamente e tenha acesso a todas as ferramentas para gerenciar sua
              obra com eficiência.
            </p>
            <div className="mt-10 space-y-3">
              {[
                "Gestão completa de projetos",
                "Controle financeiro detalhado",
                "Comparação de cotações",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                  <span className="text-sm font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center bg-surface-100 px-4 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Criar Conta</h1>
            <p className="mt-2 text-gray-500">Preencha os dados abaixo para começar</p>
          </div>

          <div className="card-solid">
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Role selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Eu sou</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("role", "client")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      selectedRole === "client"
                        ? "border-navy bg-navy-50 shadow-soft"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Briefcase
                      className={`h-6 w-6 ${selectedRole === "client" ? "text-navy" : "text-gray-400"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${selectedRole === "client" ? "text-navy" : "text-gray-600"}`}
                    >
                      Cliente
                    </span>
                    <span className="text-xs text-gray-400">Gerenciar minha obra</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("role", "supplier")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      selectedRole === "supplier"
                        ? "border-orange bg-orange-50 shadow-soft"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <HardHat
                      className={`h-6 w-6 ${selectedRole === "supplier" ? "text-orange" : "text-gray-400"}`}
                    />
                    <span
                      className={`text-sm font-semibold ${selectedRole === "supplier" ? "text-orange" : "text-gray-600"}`}
                    >
                      Fornecedor
                    </span>
                    <span className="text-xs text-gray-400">Oferecer serviços</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="full_name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="full_name"
                    type="text"
                    autoComplete="name"
                    {...register("full_name")}
                    className="input pl-10"
                    placeholder="Seu nome completo"
                    aria-invalid={errors.full_name ? "true" : "false"}
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Supplier-specific fields */}
              {selectedRole === "supplier" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label
                      htmlFor="company_name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Nome da empresa / nome fantasia
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="company_name"
                        type="text"
                        {...register("company_name")}
                        className="input pl-10"
                        placeholder="Minha Empresa Ltda"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="specialty"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Especialidade
                    </label>
                    <div className="relative">
                      <HardHat className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="specialty"
                        type="text"
                        {...register("specialty")}
                        className="input pl-10"
                        placeholder="Ex: Eletricista, Pedreiro, Encanador..."
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="cnpj"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
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
                    {errors.cnpj && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.cnpj.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Se informado, vinculamos automaticamente projetos já associados à sua empresa
                    </p>
                  </div>
                </motion.div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    className="input pl-10"
                    placeholder="seu@email.com"
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...register("password")}
                    className="input pl-10"
                    placeholder="Mínimo 6 caracteres"
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm_password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Confirmar senha
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    {...register("confirm_password")}
                    className="input pl-10"
                    placeholder="Repita a senha"
                    aria-invalid={errors.confirm_password ? "true" : "false"}
                  />
                </div>
                {errors.confirm_password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.confirm_password.message}</p>
                )}
              </div>

              <button type="submit" disabled={isLoading} className="btn-accent w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {isLoading ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-navy hover:text-navy-600 transition-colors"
            >
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
