/**
 * Formulário de criação de projeto (obra) — Fluxo em etapas com design premium.
 * Etapa 1: Dados do projeto
 * Etapa 2: Seleção de cômodos
 * Etapa 3: Preview da planta baixa + confirmação
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, type ProjectFormData } from "@/lib/validations";
import { createClient } from "@/lib/supabaseClient";
import { createProject } from "@/services/projects";
import { createRoomsForProject, type RoomSelection } from "@/services/rooms";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloorPlanInteractive from "@/components/FloorPlanInteractive";
import type { InteractiveRoom } from "@/components/FloorPlanInteractive";
import FloorPlanFromPhoto from "@/components/FloorPlanFromPhoto";
import FloorPlanFreeDraw from "@/components/FloorPlanFreeDraw";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Home,
  Ruler,
  MapPin,
  Calendar,
  Type,
  FileText,
  ChevronRight,
  Pencil,
  Camera,
  Loader2,
  Rocket,
  Check,
  AlertCircle,
} from "lucide-react";

const STEPS = [
  { label: "Dados do Projeto", icon: ClipboardList },
  { label: "Cômodos", icon: Home },
  { label: "Planta Baixa", icon: Ruler },
];

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export default function NewProjectPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState<RoomSelection[]>([]);
  const [roomLayout, setRoomLayout] = useState<InteractiveRoom[]>([]);
  const [roomMode, setRoomMode] = useState<"photo" | "draw" | null>(null);
  const [bgImage, setBgImage] = useState<string | undefined>(undefined);

  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: "draft" },
  });

  async function goNextStep() {
    if (step === 0) {
      const valid = await trigger();
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = getValues();
      const project = await createProject(supabase, {
        ...data,
        description: data.description || null,
        address: data.address || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        owner_id: user.id,
      });

      if (selectedRooms.length > 0) {
        await createRoomsForProject(supabase, project.id, user.id, selectedRooms);
      }

      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto");
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar aos projetos
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">
              Novo Projeto
            </h1>
            <p className="mt-1 text-sm text-gray-500">Siga os passos abaixo para criar sua obra</p>
          </div>

          {/* Stepper */}
          <div className="mb-8 flex items-center justify-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all duration-300 ${
                      i === step
                        ? "bg-navy text-white shadow-glow"
                        : i < step
                          ? "bg-navy/10 text-navy hover:bg-navy/20"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i < step ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 flex items-center">
                      <div
                        className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${i < step ? "bg-navy" : "bg-gray-200"}`}
                      />
                      <ChevronRight
                        className={`h-3 w-3 -ml-1 ${i < step ? "text-navy" : "text-gray-300"}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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

          <AnimatePresence mode="wait">
            {/* Step 0: Dados do Projeto */}
            {step === 0 && (
              <motion.form
                key="step0"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  goNextStep();
                }}
                className="card-solid space-y-5"
              >
                <div>
                  <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Título *
                  </label>
                  <div className="relative">
                    <Type className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="title"
                      type="text"
                      {...register("title")}
                      className="input pl-10"
                      placeholder="Ex: Reforma Apartamento Centro"
                      aria-invalid={errors.title ? "true" : "false"}
                    />
                  </div>
                  {errors.title && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Descrição
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      id="description"
                      rows={3}
                      {...register("description")}
                      className="input pl-10"
                      placeholder="Detalhes sobre a obra..."
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Endereço
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="address"
                      type="text"
                      {...register("address")}
                      className="input pl-10"
                      placeholder="Rua, número, cidade"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="start_date"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Data de Início
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="start_date"
                        type="date"
                        {...register("start_date")}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="end_date"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Data de Término
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        id="end_date"
                        type="date"
                        {...register("end_date")}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>
                  <select id="status" {...register("status")} className="input">
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativo</option>
                    <option value="paused">Pausado</option>
                    <option value="done">Concluído</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button type="submit" className="btn-primary">
                    Próximo: Cômodos
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <Link href="/projects" className="btn-ghost">
                    Cancelar
                  </Link>
                </div>
              </motion.form>
            )}

            {/* Step 1: Seleção de Cômodos */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {!roomMode && (
                  <div className="card-solid space-y-5">
                    <h3 className="text-center text-sm font-semibold text-gray-700">
                      Como você quer definir os cômodos?
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setRoomMode("draw")}
                        className="group flex flex-col items-center rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-soft"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                          <Pencil className="h-6 w-6" />
                        </div>
                        <span className="mt-3 text-sm font-semibold text-emerald-600">
                          Desenhar Planta
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                          Desenhe os cômodos livremente no canvas
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomMode("photo")}
                        className="group flex flex-col items-center rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-orange-400 hover:bg-orange-50/50 hover:shadow-soft"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-transform group-hover:scale-110">
                          <Camera className="h-6 w-6" />
                        </div>
                        <span className="mt-3 text-sm font-semibold text-orange">
                          Enviar Planta Baixa
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                          Envie uma foto e identifique os cômodos
                        </span>
                      </button>
                    </div>
                    <div className="flex gap-3 pt-3 border-t border-gray-100">
                      <button type="button" onClick={goPrevStep} className="btn-ghost">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={goNextStep}
                        className="btn-ghost text-gray-500"
                      >
                        Pular cômodos
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {roomMode === "photo" && (
                  <div className="card-solid">
                    <FloorPlanFromPhoto
                      onComplete={(rooms, layout, imageUrl) => {
                        setSelectedRooms(rooms);
                        setRoomLayout(layout);
                        setBgImage(imageUrl);
                        setStep(2);
                      }}
                      onCancel={() => setRoomMode(null)}
                    />
                  </div>
                )}

                {roomMode === "draw" && (
                  <div className="card-solid">
                    <FloorPlanFreeDraw
                      onComplete={(rooms, layout) => {
                        setSelectedRooms(rooms);
                        setRoomLayout(layout);
                        setBgImage(undefined);
                        setStep(2);
                      }}
                      onCancel={() => setRoomMode(null)}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Preview Planta Baixa + Confirmação */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="card-solid">
                  <FloorPlanInteractive
                    rooms={selectedRooms}
                    initialLayout={roomLayout.length > 0 ? roomLayout : undefined}
                    onLayoutChange={setRoomLayout}
                    backgroundImage={bgImage}
                    editable
                    height={500}
                  />
                </div>

                <div className="card-solid space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <ClipboardList className="h-4 w-4 text-navy" />
                    Resumo do Projeto
                  </h3>
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-100 p-3">
                      <dt className="text-xs text-gray-500">Título</dt>
                      <dd className="mt-0.5 font-medium text-gray-900">{getValues("title")}</dd>
                    </div>
                    {getValues("description") && (
                      <div className="rounded-lg bg-surface-100 p-3">
                        <dt className="text-xs text-gray-500">Descrição</dt>
                        <dd className="mt-0.5 text-gray-700">{getValues("description")}</dd>
                      </div>
                    )}
                    {getValues("address") && (
                      <div className="rounded-lg bg-surface-100 p-3">
                        <dt className="text-xs text-gray-500">Endereço</dt>
                        <dd className="mt-0.5 text-gray-700">{getValues("address")}</dd>
                      </div>
                    )}
                    {getValues("start_date") && (
                      <div className="rounded-lg bg-surface-100 p-3">
                        <dt className="text-xs text-gray-500">Início</dt>
                        <dd className="mt-0.5 text-gray-700">
                          {formatDate(getValues("start_date")! + "T00:00:00")}
                        </dd>
                      </div>
                    )}
                    {getValues("end_date") && (
                      <div className="rounded-lg bg-surface-100 p-3">
                        <dt className="text-xs text-gray-500">Término</dt>
                        <dd className="mt-0.5 text-gray-700">
                          {formatDate(getValues("end_date")! + "T00:00:00")}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-lg bg-surface-100 p-3">
                      <dt className="text-xs text-gray-500">Cômodos</dt>
                      <dd className="mt-0.5 font-medium text-gray-700">
                        {selectedRooms.length > 0
                          ? `${selectedRooms.reduce((acc, r) => acc + r.quantity, 0)} cômodo(s)`
                          : "Nenhum selecionado"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={goPrevStep} className="btn-ghost">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="btn bg-gradient-to-r from-navy to-orange text-white shadow-glow hover:shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4" />
                    )}
                    {isLoading ? "Criando Projeto..." : "Criar Projeto"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
