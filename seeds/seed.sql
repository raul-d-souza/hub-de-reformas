    -- ============================================================
    -- Hub de Reformas — Seed com dados de exemplo
    -- Aplique APÓS a migration: psql $DATABASE_URL < seeds/seed.sql
    --
    -- NOTA: Os UUIDs abaixo são fixos para facilitar testes locais.
    -- O owner_id deve corresponder a um usuário existente no auth.users.
    -- Substitua 'REPLACE_WITH_YOUR_USER_ID' pelo UUID real do seu usuário
    -- criado no Supabase Auth.
    -- ============================================================

    -- Variável de conveniência (substitua pelo ID real)
    -- Para usar: crie um usuário via /signup e copie o ID do dashboard do Supabase

    DO $$
    DECLARE
    v_owner_id UUID := '89f95dbf-ff62-4ea6-a3d8-eaaaa960a21e'; -- Substituir
    v_project_1 UUID := '11111111-1111-1111-1111-111111111111';
    v_project_2 UUID := '22222222-2222-2222-2222-222222222222';
    v_item_1 UUID := 'aaaa1111-1111-1111-1111-111111111111';
    v_item_2 UUID := 'aaaa2222-2222-2222-2222-222222222222';
    v_item_3 UUID := 'aaaa3333-3333-3333-3333-333333333333';
    v_item_4 UUID := 'aaaa4444-4444-4444-4444-444444444444';
    v_supplier_1 UUID := 'bbbb1111-1111-1111-1111-111111111111';
    v_supplier_2 UUID := 'bbbb2222-2222-2222-2222-222222222222';
    v_supplier_3 UUID := 'bbbb3333-3333-3333-3333-333333333333';
    BEGIN

    -- Garante que o perfil do usuário existe (necessário para FK)
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (v_owner_id, 'Usuário Teste', '(11) 99999-0000')
    ON CONFLICT (id) DO NOTHING;

    -- ===== PROJECTS =====
    INSERT INTO public.projects (id, title, description, address, start_date, end_date, status, owner_id)
    VALUES
        (v_project_1, 'Reforma Apartamento Centro', 'Reforma completa do apartamento de 80m² no centro de São Paulo, incluindo cozinha, banheiro e sala.', 'Rua Augusta, 1200, São Paulo - SP', '2026-03-01', '2026-06-30', 'active', v_owner_id),
        (v_project_2, 'Pintura Casa Praia', 'Pintura interna e externa da casa de praia em Ubatuba. 3 quartos, sala, cozinha e área externa.', 'Av. Beira Mar, 450, Ubatuba - SP', '2026-04-15', '2026-05-15', 'draft', v_owner_id)
    ON CONFLICT (id) DO NOTHING;

    -- ===== ITEMS =====
    INSERT INTO public.items (id, project_id, name, description, quantity, unit, estimated_unit_price)
    VALUES
        (v_item_1, v_project_1, 'Piso Porcelanato 60x60', 'Porcelanato retificado cinza claro para sala e cozinha', 45, 'm²', 89.90),
        (v_item_2, v_project_1, 'Mão de obra pedreiro', 'Serviço de assentamento de piso e revestimento', 30, 'diária', 250.00),
        (v_item_3, v_project_1, 'Tinta Acrílica Premium Branca 18L', 'Tinta lavável para paredes internas', 6, 'lata', 320.00),
        (v_item_4, v_project_2, 'Tinta Acrílica Exterior 18L', 'Tinta resistente a intempéries para fachada', 8, 'lata', 380.00)
    ON CONFLICT (id) DO NOTHING;

    -- ===== SUPPLIERS =====
    INSERT INTO public.suppliers (id, name, contact_name, phone, email, website, rating, owner_id)
    VALUES
        (v_supplier_1, 'Casa dos Pisos Ltda', 'Carlos Silva', '(11) 3333-1111', 'contato@casadospisos.com.br', 'https://casadospisos.com.br', 4.50, v_owner_id),
        (v_supplier_2, 'Tintas Express', 'Maria Santos', '(11) 3333-2222', 'vendas@tintasexpress.com.br', 'https://tintasexpress.com.br', 4.20, v_owner_id),
        (v_supplier_3, 'MãoDeObra SP', 'João Ferreira', '(11) 98888-3333', 'joao@maodeobrasp.com.br', NULL, 3.80, v_owner_id)
    ON CONFLICT (id) DO NOTHING;

    -- ===== QUOTES =====
    INSERT INTO public.quotes (supplier_id, project_id, total_price, items_json, expires_at, chosen, note, owner_id)
    VALUES
        -- Cotação 1: Casa dos Pisos para Projeto 1 (piso)
        (v_supplier_1, v_project_1, 3850.00,
        '[{"item_name":"Piso Porcelanato 60x60","quantity":45,"unit":"m²","unit_price":85.56,"total":3850.00}]'::jsonb,
        '2026-03-15', false, 'Entrega em 7 dias úteis. Frete incluso acima de R$2.000.', v_owner_id),

        -- Cotação 2: Tintas Express para Projeto 1 (tinta interna)
        (v_supplier_2, v_project_1, 1740.00,
        '[{"item_name":"Tinta Acrílica Premium Branca 18L","quantity":6,"unit":"lata","unit_price":290.00,"total":1740.00}]'::jsonb,
        '2026-03-20', true, 'Desconto de 10% no pagamento à vista.', v_owner_id),

        -- Cotação 3: MãoDeObra SP para Projeto 1 (pedreiro)
        (v_supplier_3, v_project_1, 7500.00,
        '[{"item_name":"Mão de obra pedreiro","quantity":30,"unit":"diária","unit_price":250.00,"total":7500.00}]'::jsonb,
        '2026-04-01', false, 'Inclui material de acabamento básico.', v_owner_id),

        -- Cotação 4: Tintas Express para Projeto 2 (tinta exterior)
        (v_supplier_2, v_project_2, 2880.00,
        '[{"item_name":"Tinta Acrílica Exterior 18L","quantity":8,"unit":"lata","unit_price":360.00,"total":2880.00}]'::jsonb,
        '2026-04-30', false, 'Cor sob consulta. Garantia de 5 anos.', v_owner_id),

        -- Cotação 5: Casa dos Pisos para Projeto 2 (tinta exterior — concorrente)
        (v_supplier_1, v_project_2, 3040.00,
        '[{"item_name":"Tinta Acrílica Exterior 18L","quantity":8,"unit":"lata","unit_price":380.00,"total":3040.00}]'::jsonb,
        '2026-04-25', false, 'Preço cheio — sem desconto para tintas.', v_owner_id);

    END $$;
