-- Historico diario de estoque por produto+marca, pra sazonalidade
-- (evolucao no tempo, tipo grafico de bolsa, pra achar melhor epoca de
-- comprar/vender cada item). Captura automatica via pg_cron, independente
-- de "Nova Contagem" manual.

CREATE TABLE IF NOT EXISTS public.estoque_historico_diario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data DATE NOT NULL,
  produto TEXT NOT NULL,
  marca TEXT NOT NULL,
  total_caixas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (data, produto, marca)
);

CREATE INDEX IF NOT EXISTS idx_historico_diario_produto_marca
  ON public.estoque_historico_diario (produto, marca, data);

-- Soma total_caixas de estoque_registros entre todos os setores/tipos/
-- usuarios, agrupado so por produto+marca, e grava/atualiza o ponto de hoje.
CREATE OR REPLACE FUNCTION public.capturar_historico_diario()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.estoque_historico_diario (data, produto, marca, total_caixas)
  SELECT CURRENT_DATE, produto, marca, SUM(total_caixas)
  FROM public.estoque_registros
  GROUP BY produto, marca
  ON CONFLICT (data, produto, marca)
  DO UPDATE SET total_caixas = EXCLUDED.total_caixas;
END;
$$;

-- Se o CREATE EXTENSION falhar por permissao, habilite pg_cron primeiro em
-- Database > Extensions no painel do Supabase, depois rode este arquivo de novo.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- '59 2 * * *' em UTC = 23:59 horario de Brasilia (UTC-3, sem horario de verao).
SELECT cron.unschedule('captura-historico-diario')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'captura-historico-diario'
);

SELECT cron.schedule(
  'captura-historico-diario',
  '59 2 * * *',
  $$SELECT public.capturar_historico_diario();$$
);

ALTER TABLE public.estoque_historico_diario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS historico_diario_public_read ON public.estoque_historico_diario;

CREATE POLICY historico_diario_public_read
ON public.estoque_historico_diario
FOR SELECT
TO anon, authenticated
USING (TRUE);

GRANT SELECT ON public.estoque_historico_diario TO anon, authenticated;

-- Roda uma vez manualmente pra ja existir 1 ponto de dado sem esperar o cron:
SELECT public.capturar_historico_diario();
