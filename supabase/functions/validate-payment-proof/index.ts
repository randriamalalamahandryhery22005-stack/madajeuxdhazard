// Auto-validation d'une preuve de paiement Mobile Money (Yas / Airtel / Orange).
// Body: { requestId: string, imageBase64: string }
// Auth: Bearer JWT de l'utilisateur (requis pour valider la propriété de la demande).
// Réponse: { validated: boolean, reason: string, extracted?: object }
//
// Politique:
//   - Le montant extrait doit être >= price_amount de la demande.
//   - Le destinataire doit correspondre au numéro connu de la méthode (Orange/Yas/Airtel).
//   - Une référence de transaction doit être présente et non déjà utilisée.
//   - Sinon on laisse la demande en attente (validation manuelle par l'admin).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RECEIVERS: Record<string, { number: string; label: string; aliases: string[] }> = {
  orange: { number: "0379594257", label: "Orange Money", aliases: ["orange", "orange money", "om"] },
  yas:    { number: "0383955105", label: "Yas Money",    aliases: ["yas", "yas money", "telma", "mvola"] },
  airtel: { number: "0336756185", label: "Airtel Money", aliases: ["airtel", "airtel money"] },
};

const normalizeNumber = (raw: string): string => (raw || "").replace(/\D+/g, "").replace(/^261/, "0").slice(-10);

async function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return reply({ validated: false, reason: "IA indisponible (clé manquante)" });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return reply({ validated: false, reason: "Non authentifié" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return reply({ validated: false, reason: "Session invalide" }, 401);
    const userId = userData.user.id;

    const { requestId, imageBase64 } = await req.json();
    if (!requestId || !imageBase64) return reply({ validated: false, reason: "Paramètres manquants" }, 400);

    // Charge la demande — doit appartenir à l'utilisateur et être en attente
    const { data: reqRow, error: reqErr } = await admin
      .from("game_access")
      .select("id,user_id,game_mode,price_amount,is_active,granted_by,expires_at")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return reply({ validated: false, reason: "Demande introuvable" }, 404);
    if (reqRow.user_id !== userId) return reply({ validated: false, reason: "Interdit" }, 403);
    if (reqRow.is_active && reqRow.granted_by) {
      return reply({ validated: true, reason: "Déjà activé" });
    }

    // Appel IA vision (Lovable Gateway)
    const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu es un extracteur OCR strict pour reçus Mobile Money Madagascar (Orange Money, Yas/Telma MVola, Airtel Money). " +
              "Analyse l'image et renvoie STRICTEMENT ce JSON:\n" +
              "{\"is_receipt\": boolean, \"provider\": \"orange\"|\"yas\"|\"airtel\"|\"unknown\", \"amount_ariary\": number|null, " +
              "\"recipient_number\": string|null, \"sender_number\": string|null, \"reference\": string|null, " +
              "\"status_success\": boolean, \"date\": string|null, \"reason\": string}\n" +
              "- amount_ariary: montant transféré en Ariary (nombre entier, sans espaces/devise).\n" +
              "- recipient_number: numéro du destinataire (format local 10 chiffres si possible, sinon tel qu'affiché).\n" +
              "- reference: ID/référence de la transaction affiché sur le reçu.\n" +
              "- status_success: true UNIQUEMENT si le reçu confirme un transfert réussi (mots 'Réussie', 'Successful', 'Confirmé', etc.).\n" +
              "- Si l'image n'est PAS un reçu Mobile Money lisible, is_receipt=false et remplis les autres champs à null/0/false.\n" +
              "- reason: courte explication en français (max 15 mots).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais les informations de ce reçu Mobile Money." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return reply({ validated: false, reason: "Analyse IA indisponible, validation manuelle en attente" });
    }

    const aiJson = await aiResp.json();
    let extracted: any = {};
    try {
      extracted = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}");
    } catch {
      return reply({ validated: false, reason: "Reçu illisible, validation manuelle en attente", extracted: {} });
    }

    const persistFailure = async (reason: string) => {
      await admin
        .from("game_access")
        .update({ auto_validation_reason: reason })
        .eq("id", requestId);
    };

    if (!extracted.is_receipt) {
      await persistFailure("Image non reconnue comme reçu");
      return reply({ validated: false, reason: "Image non reconnue comme reçu Mobile Money", extracted });
    }
    if (!extracted.status_success) {
      await persistFailure("Statut de transfert non confirmé");
      return reply({ validated: false, reason: "Le reçu n'indique pas un transfert réussi", extracted });
    }

    const provider = String(extracted.provider || "").toLowerCase();
    const receiver = RECEIVERS[provider];
    if (!receiver) {
      await persistFailure("Opérateur non identifié");
      return reply({ validated: false, reason: "Opérateur non identifié sur le reçu", extracted });
    }

    const recipient = normalizeNumber(String(extracted.recipient_number || ""));
    if (recipient !== receiver.number) {
      await persistFailure(`Destinataire ${recipient} ≠ ${receiver.number}`);
      return reply({
        validated: false,
        reason: `Numéro destinataire (${extracted.recipient_number ?? "?"}) ne correspond pas à ${receiver.label} ${receiver.number}`,
        extracted,
      });
    }

    const amount = Number(extracted.amount_ariary) || 0;
    const expected = Number(reqRow.price_amount) || 0;
    if (amount < expected) {
      await persistFailure(`Montant ${amount} < attendu ${expected}`);
      return reply({
        validated: false,
        reason: `Montant insuffisant: ${amount.toLocaleString("fr-FR")} Ar reçus, ${expected.toLocaleString("fr-FR")} Ar attendus`,
        extracted,
      });
    }

    const reference = String(extracted.reference || "").trim();
    if (!reference || reference.length < 4) {
      await persistFailure("Référence de transaction manquante");
      return reply({ validated: false, reason: "Référence de transaction introuvable sur le reçu", extracted });
    }

    // Anti-rejeu: vérifier qu'aucune autre demande n'a déjà utilisé cette référence
    const { data: dup } = await admin
      .from("game_access")
      .select("id,user_id")
      .eq("payment_reference", reference)
      .neq("id", requestId)
      .maybeSingle();
    if (dup) {
      await persistFailure("Référence déjà utilisée");
      return reply({ validated: false, reason: "Cette référence de transaction a déjà été utilisée", extracted });
    }

    // Activation automatique
    const { error: updErr } = await admin
      .from("game_access")
      .update({
        is_active: true,
        granted_by: "auto-ai-validator",
        granted_at: new Date().toISOString(),
        payment_reference: reference,
        payment_method: provider,
        auto_validated_at: new Date().toISOString(),
        auto_validation_reason: `Validé automatiquement (${amount} Ar, réf ${reference})`,
      } as any)
      .eq("id", requestId);

    if (updErr) {
      console.error("update failed", updErr);
      return reply({ validated: false, reason: "Erreur d'activation, réessayez", extracted });
    }

    // Message système visible dans le chat
    await admin.from("chat_messages").insert({
      user_id: userId,
      game_mode: reqRow.game_mode,
      message: `✅ Paiement validé automatiquement — ${amount.toLocaleString("fr-FR")} Ar reçus via ${receiver.label}. Référence: ${reference}. Votre accès Premium est activé.`,
      status: "approved",
      admin_response: null,
    } as any);

    return reply({ validated: true, reason: "Paiement validé automatiquement", extracted });
  } catch (e) {
    console.error(e);
    return reply({ validated: false, reason: "Erreur serveur" }, 500);
  }
});
