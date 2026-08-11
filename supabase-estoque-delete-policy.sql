-- Corrige duplicacao de estoque entre usuarios diferentes: uma "Nova Contagem"
-- salva por qualquer operador deve substituir TODAS as linhas do setor
-- contado (de qualquer usuario), nao so as do proprio usuario que salvou.
-- Sem isso, a policy de delete so deixa cada usuario apagar as proprias
-- linhas, e o codigo (que ja tenta apagar as linhas de todos os usuarios do
-- setor contado) e bloqueado silenciosamente pelo RLS.

DROP POLICY IF EXISTS estoque_user_delete ON public.estoque_registros;

CREATE POLICY estoque_user_delete
ON public.estoque_registros
FOR DELETE
TO authenticated
USING (TRUE);
