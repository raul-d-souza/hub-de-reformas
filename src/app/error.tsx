"use client";

/**
 * Error Boundary global — captura erros não tratados em rotas.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-2xl bg-white p-8 shadow-lg text-center max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h2>
        <p className="text-gray-600 text-sm mb-6">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
