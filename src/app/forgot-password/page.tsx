/**
 * Página de Recuperação de Senha — design moderno com ícones e animações.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true);
    setError(null);
    const { error } = await resetPassword(data.email);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50">
            <KeyRound className="h-8 w-8 text-navy" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Recuperar Senha</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Informe seu email para receber um link de redefinição de senha.
          </p>
        </div>

        <div className="card-solid">
          {sent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert-success mb-5 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Email enviado! Verifique sua caixa de entrada.
            </motion.div>
          )}

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

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isLoading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-navy-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
