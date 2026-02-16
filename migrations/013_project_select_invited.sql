-- ============================================================
-- Migration 013: Permitir fornecedores convidados ver projetos e cômodos
--
-- O fornecedor que recebeu um convite (project_invitations)
-- precisa ver os dados do projeto e seus cômodos para decidir se aceita.
--
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- Fornecedores convidados podem ver o projeto
CREATE POLICY "projects_select_invited_supplier" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_invitations pi
      JOIN public.suppliers s ON s.id = pi.supplier_id
      WHERE pi.project_id = projects.id
        AND s.user_id = auth.uid()
    )
  );

-- Fornecedores convidados podem ver os cômodos do projeto
CREATE POLICY "rooms_select_invited_supplier" ON public.project_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_invitations pi
      JOIN public.suppliers s ON s.id = pi.supplier_id
      WHERE pi.project_id = project_rooms.project_id
        AND s.user_id = auth.uid()
    )
  );
