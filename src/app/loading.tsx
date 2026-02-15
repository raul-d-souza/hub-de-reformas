/**
 * Loading fallback global — exibido durante Suspense boundaries.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-200 border-t-navy" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
