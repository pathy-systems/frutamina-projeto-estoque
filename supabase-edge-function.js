
/**
 * CÓDIGO PARA SUPABASE EDGE FUNCTION (Deno)
 * Nome sugerido: push-notifications
 * 
 * Esta função deve ser implantada no Supabase.
 * Ela será disparada por um Webhook do banco de dados quando houver um INSERT na tabela de estoque.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.6"

const VAPID_PUBLIC_KEY = "BAjzR0T971QRQTTcQxMMt4QmJcpBPZpRLWMRDiqAPgD2Jvs2dvfEkrz217PgqfLK2dOVmea-718DAv95d-7_MS0"
const VAPID_PRIVATE_KEY = "BemWL3eHdPV9NwYyUAMARSwJ5ezIiz5kPJZFfD9zFLE"

// Configura as chaves VAPID
webpush.setVapidDetails(
  'mailto:contato@frutamina.com.br',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Recebe os dados do Webhook (o novo registro de estoque)
    const payload = await req.json()
    const record = payload.record
    
    // Busca o nome do usuário que fez o lançamento (opcional, se disponível no payload)
    // Aqui assumimos que o payload traz informações do registro inserido
    const userLabel = record.user_email || "Um usuário"

    // 1. Busca todas as assinaturas de push ativas
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')

    if (error) throw error

    // 2. Prepara a mensagem
    const notificationPayload = JSON.stringify({
      title: "Estoque Atualizado",
      body: `O estoque do CD foi atualizado por ${userLabel}`,
      url: "./visao-geral.html"
    })

    // 3. Envia para todos os dispositivos em paralelo
    const sendPromises = subscriptions.map((sub) => {
      return webpush.sendNotification(sub.subscription, notificationPayload)
        .catch(err => {
          console.error("Erro ao enviar para uma assinatura:", err)
          // Se o token expirou (404 ou 410), poderíamos deletar do banco aqui
        })
    })

    await Promise.all(sendPromises)

    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
