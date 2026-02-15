/**
 * Página de Login — design premium com animações, glassmorphism e UX refinada.
 */
"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Wand2, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function LoginForm() {
  const { signIn, signInWithMagicLink } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    setError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      // Buscar perfil do usuário para redirecionar corretamente
      const supabase = (await import("@/lib/supabaseClient")).createClient();

      // Aguardar um momento para garantir que a sessão foi atualizada
      await new Promise((resolve) => setTimeout(resolve, 200));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error loading profile:", profileError);
          setError("Erro ao carregar perfil. Tente novamente.");
          setIsLoading(false);
          return;
        }

        // Determinar destino baseado no perfil
        let destination = "/projects"; // default para clientes

        if (profile?.role === "supplier") {
          destination = "/supplier-dashboard";
        }

        // Se tiver redirectTo específico (não "/" ou "/login"), usar ele
        if (redirectTo && redirectTo !== "/" && redirectTo !== "/login") {
          destination = redirectTo;
        }

        // Usar window.location para garantir refresh completo
        window.location.href = destination;
      } else {
        router.replace("/login");
      }
    }
  }

  async function handleMagicLink() {
    const email = getValues("email");
    if (!email) {
      setError("Informe o email para enviar o magic link.");
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy to-navy-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-extrabold text-white leading-tight xl:text-5xl">
              Gerencie suas
              <br />
              reformas com
              <br />
              <span className="text-orange-300">simplicidade.</span>
            </h2>
            <p className="mt-6 text-lg text-navy-200 max-w-md leading-relaxed">
              Projetos, cotações, fornecedores e finanças em um só lugar. Tenha o controle total da
              sua obra.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-navy-600 bg-gradient-to-br from-navy-300 to-navy-500"
                  />
                ))}
              </div>
              <p className="text-sm text-navy-200">
                <span className="font-semibold text-white">500+</span> profissionais confiam
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex w-full items-center justify-center bg-surface-100 px-4 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-gray-500">Entre na sua conta para continuar</p>
          </div>

          <div className="card-solid">
            {magicLinkSent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="alert-success mb-5 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                Magic link enviado! Verifique seu email.
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
                    autoComplete="current-password"
                    {...register("password")}
                    className="input pl-10"
                    placeholder="••••••••"
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {isLoading ? "Entrando..." : "Entrar com senha"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">ou</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button onClick={handleMagicLink} disabled={isLoading} className="btn-secondary w-full">
              <Wand2 className="h-4 w-4" />
              Enviar Magic Link
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Não tem conta?{" "}
            <Link
              href="/signup"
              className="font-semibold text-navy hover:text-navy-600 transition-colors"
            >
              Cadastre-se gratuitamente
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-navy" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
