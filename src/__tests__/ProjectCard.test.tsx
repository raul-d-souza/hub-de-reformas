/**
 * Teste exemplo: verifica que o componente ProjectCard renderiza corretamente.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProjectCard from "@/components/ProjectCard";
import type { Project } from "@/types/database";

const mockProject: Project = {
  id: "test-uuid-1234",
  title: "Reforma Banheiro",
  description: "Troca de piso e louças do banheiro social",
  address: "Rua Teste, 100",
  start_date: "2026-03-01",
  end_date: "2026-04-15",
  status: "active",
  owner_id: "owner-uuid",
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

describe("ProjectCard", () => {
  it("renderiza o título do projeto", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("Reforma Banheiro")).toBeInTheDocument();
  });

  it("renderiza o badge de status", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("renderiza a descrição", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/Troca de piso/)).toBeInTheDocument();
  });

  it("renderiza o endereço", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(/Rua Teste, 100/)).toBeInTheDocument();
  });

  it("é um link para a página de detalhes", () => {
    render(<ProjectCard project={mockProject} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/projects/test-uuid-1234");
  });
});
