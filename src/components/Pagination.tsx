/**
 * Componente de Paginação reutilizável
 */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const showEllipsis = totalPages > 7;

  if (showEllipsis) {
    // Sempre mostrar primeira página
    pages.push(1);

    if (currentPage > 3) {
      pages.push("...");
    }

    // Páginas ao redor da atual
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }

    // Sempre mostrar última página
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  }

  const startItem = (currentPage - 1) * (itemsPerPage || 0) + 1;
  const endItem = Math.min(currentPage * (itemsPerPage || 0), totalItems || 0);

  return (
    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-sm text-gray-500">
          Mostrando <span className="font-medium text-gray-900">{startItem}</span> a{" "}
          <span className="font-medium text-gray-900">{endItem}</span> de{" "}
          <span className="font-medium text-gray-900">{totalItems}</span> resultado
          {totalItems !== 1 ? "s" : ""}
        </p>
      )}

      <div className="flex items-center gap-2">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn-ghost !p-2 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost !p-2 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`min-w-[2.5rem] h-10 rounded-lg px-3 text-sm font-medium transition-all ${
                  page === currentPage
                    ? "bg-navy text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                aria-label={`Página ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost !p-2 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn-ghost !p-2 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
