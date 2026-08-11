-- Nome do operador visivel pra TODOS os usuarios/aparelhos, nao so pra quem
-- ja logou naquele aparelho especifico. Sem isso, "ultima atualizacao" e o
-- historico da Visao Geral mostram "usuario <id curto>" quando o operador
-- que fez a alteracao nunca logou no aparelho de quem esta vendo a tela
-- (cd_user_label_<id> hoje e so um cache local em localStorage).

CREATE TABLE IF NOT EXISTS public.usuarios_label (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.usuarios_label ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_label_public_read ON public.usuarios_label;
DROP POLICY IF EXISTS usuarios_label_self_insert ON public.usuarios_label;
DROP POLICY IF EXISTS usuarios_label_self_update ON public.usuarios_label;

CREATE POLICY usuarios_label_public_read
ON public.usuarios_label
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY usuarios_label_self_insert
ON public.usuarios_label
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY usuarios_label_self_update
ON public.usuarios_label
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.usuarios_label TO anon, authenticated;
GRANT INSERT, UPDATE ON public.usuarios_label TO authenticated;
