
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
    let userLabel = "Um usuário"
    try {
      const payload = await req.json()
      // O Supabase Webhook envia o registro em payload.record
      // Se for um teste manual, o payload pode ser diferente
      const record = payload?.record || payload
      
      if (record && record.user_email) {
        userLabel = record.user_email.split('@')[0] // Pega apenas o nome antes do @
      }
    } catch (e) {
      console.log("Payload não processado ou vazio, usando label padrão.")
    }

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
