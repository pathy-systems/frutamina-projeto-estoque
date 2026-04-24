
-- =============================================================
-- Script de configuração das notificações push
-- Execute este script no SQL Editor do Supabase
-- =============================================================

-- Tabela para armazenar as assinaturas de push dos dispositivos dos usuários
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB     NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NOTA: A constraint UNIQUE(user_id, subscription) foi removida porque
-- colunas JSONB não podem ser indexadas com btree (necessário para UNIQUE).
-- A deduplicação por endpoint é feita no app.js antes de cada INSERT.

-- Índice para buscas por user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions (user_id);

-- Índice para buscas por endpoint (usado na deduplicação)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions ((subscription->>'endpoint'));

-- Habilitar RLS (Row Level Security)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas para recriar corretamente
DROP POLICY IF EXISTS "Usuários podem inserir suas próprias assinaturas" ON push_subscriptions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias assinaturas" ON push_subscriptions;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias assinaturas" ON push_subscriptions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias assinaturas" ON push_subscriptions;
DROP POLICY IF EXISTS "Service role pode gerenciar todas as assinaturas" ON push_subscriptions;

-- Política para usuários inserirem suas próprias assinaturas
CREATE POLICY "Usuários podem inserir suas próprias assinaturas"
ON push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para usuários verem suas próprias assinaturas
CREATE POLICY "Usuários podem ver suas próprias assinaturas"
ON push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para usuários deletarem suas próprias assinaturas
-- (necessária para a deduplicação por endpoint feita no app.js)
CREATE POLICY "Usuários podem deletar suas próprias assinaturas"
ON push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Garante que a função trigger de updated_at existe
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS set_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Permissões para usuários autenticados
GRANT SELECT, INSERT, DELETE ON push_subscriptions TO authenticated;
