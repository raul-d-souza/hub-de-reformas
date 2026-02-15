import type { Metadata } from "next";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hub de Reformas",
  description: "Gerencie suas obras, itens, fornecedores e cotações em um só lugar.",
};

/**
 * Root Layout — envolve todas as páginas.
 * Carrega a font Inter e aplica design system via globals.css.
 * Providers: QueryProvider (React Query) + AuthProvider (auth centralizada).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className="min-h-screen bg-surface-100 font-sans antialiased selection:bg-navy-100 selection:text-navy-900">
        <QueryProvider>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">{children}</div>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
