/**
 * Footer — rodapé moderno com gradiente sutil e links organizados.
 */
import { Building2, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-4 w-4 text-navy-300" />
            <span>
              © {new Date().getFullYear()} Hub
              <span className="font-semibold text-navy">.Reformas</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden items-center gap-1 sm:inline-flex">
              Feito com <Heart className="h-3 w-3 text-red-400" /> no Brasil
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="transition-colors hover:text-navy">
              Termos de Uso
            </a>
            <a href="#" className="transition-colors hover:text-navy">
              Privacidade
            </a>
            <a href="#" className="transition-colors hover:text-navy">
              Suporte
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
