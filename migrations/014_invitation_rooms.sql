-- ============================================================
-- Migration 014: Cômodos vinculados ao convite
--
-- Permite que o cliente selecione cômodos específicos ao
-- convidar um fornecedor para o projeto.
--
-- Execute no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitation_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id   UUID NOT NULL REFERENCES public.project_invitations(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES public.project_rooms(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invitation_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_rooms_invitation ON public.invitation_rooms(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_rooms_room ON public.invitation_rooms(room_id);

-- RLS
ALTER TABLE public.invitation_rooms ENABLE ROW LEVEL SECURITY;

-- Quem pode ver o convite pode ver os cômodos vinculados
CREATE POLICY "invitation_rooms_select" ON public.invitation_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_invitations pi
      WHERE pi.id = invitation_rooms.invitation_id
        AND (
          pi.invited_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.suppliers s
            WHERE s.id = pi.supplier_id AND s.user_id = auth.uid()
          )
        )
    )
  );

-- Cliente que criou o convite pode inserir cômodos
CREATE POLICY "invitation_rooms_insert" ON public.invitation_rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_invitations pi
      WHERE pi.id = invitation_rooms.invitation_id
        AND pi.invited_by = auth.uid()
    )
  );

-- Cliente que criou o convite pode deletar cômodos
CREATE POLICY "invitation_rooms_delete" ON public.invitation_rooms
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_invitations pi
      WHERE pi.id = invitation_rooms.invitation_id
        AND pi.invited_by = auth.uid()
    )
  );
