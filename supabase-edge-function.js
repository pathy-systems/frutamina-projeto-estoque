
/**
 * CÓDIGO PARA SUPABASE EDGE FUNCTION (Deno)
 * Nome: push-notifications
 *
 * Como implantar:
 *   supabase functions deploy push-notifications
 *
 * Variáveis de ambiente necessárias (já injetadas pelo Supabase):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

const VAPID_PUBLIC_KEY = "BAjzR0T971QRQTTcQxMMt4QmJcpBPZpRLWMRDiqAPgD2Jvs2dvfEkrz217PgqfLK2dOVmea-718DAv95d-7_MS0"
const VAPID_PRIVATE_KEY = "BemWL3eHdPV9NwYyUAMARSwJ5ezIiz5kPJZFfD9zFLE"

webpush.setVapidDetails(
  "mailto:contato@frutamina.com.br",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Headers CORS completos exigidos pelo Supabase Edge Functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
}

Deno.serve(async (req) => {
  // Responde ao preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Lê o e-mail do usuário que disparou a atualização
    let userLabel = "Um usuário"
    try {
      const body = await req.json()
      const record = body?.record || body
      if (record?.user_email) {
        userLabel = record.user_email.split("@")[0]
      }
    } catch (_e) {
      console.log("Sem payload JSON ou erro ao ler.")
    }

    // 1. Busca todas as assinaturas ativas
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")

    if (error) throw error

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma assinatura encontrada." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // 2. Prepara o payload da notificação
    const notificationPayload = JSON.stringify({
      title: "Estoque Atualizado",
      body: `O estoque do CD foi atualizado por ${userLabel}`,
      url: "./visao-geral.html",
    })

    // 3. Envia as notificações e coleta assinaturas expiradas para remover
    const expiredIds = []
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload)
          return { id: sub.id, status: "fulfilled" }
        } catch (err) {
          // Código 410 (Gone) ou 404 indica assinatura expirada/cancelada
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredIds.push(sub.id)
          }
          return { id: sub.id, status: "rejected", reason: err.message }
        }
      })
    )

    // 4. Remove assinaturas expiradas
    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds)
      console.log(`Removidas ${expiredIds.length} assinatura(s) expirada(s).`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: subscriptions.length,
        sent: results.filter((r) => r.value?.status === "fulfilled").length,
        expired: expiredIds.length,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Erro na Edge Function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    )
  }
})
