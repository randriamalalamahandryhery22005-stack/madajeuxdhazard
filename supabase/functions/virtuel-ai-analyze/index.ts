// Edge function: Virtuel AI Analyze
// Modes:
//   - "market"  : analyse une capture d'écran d'un marché et renvoie un pronostic structuré
//   - "summary" : synthétise les 8 marchés en un résumé final
// Utilise Lovable AI Gateway (google/gemini-2.5-flash — vision multimodale).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Market =
  | "exact_score"
  | "ht_score"
  | "htft"
  | "total_goals"
  | "first_goal_minute"
  | "multi_goals"
  | "ht2_score"
  | "one_x_two";

interface MarketConfig {
  title: string;
  instructions: string;
  schemaDescription: string;
}

const MARKETS: Record<Market, MarketConfig> = {
  exact_score: {
    title: "Score Exact",
    instructions:
      "Lis TOUTES les cotes visibles du marché \"Score Exact\". Identifie les 3 scores avec les cotes les plus FAIBLES (les plus probables). Classe-les du plus probable au moins probable.",
    schemaDescription:
      "{ principal: string (score ex: '2-1'), alternative1: string, alternative2: string, confidence: number (0-100) }",
  },
  ht_score: {
    title: "Mi-temps Score Exact",
    instructions:
      "Lis toutes les cotes du marché \"Mi-temps Score Exact\". Trouve les 3 scores mi-temps avec les cotes les plus faibles.",
    schemaDescription:
      "{ principal: string, alternative1: string, alternative2: string, confidence: number }",
  },
  htft: {
    title: "HT/FT",
    instructions:
      "Lis toutes les cotes HT/FT (mi-temps/fin de temps). Classe les 3 combinaisons les plus probables (cotes les plus faibles). Format: '1/1', 'X/1', '1/X', etc.",
    schemaDescription:
      "{ principal: string, alternative1: string, alternative2: string, confidence: number }",
  },
  total_goals: {
    title: "Total de buts",
    instructions:
      "Analyse le marché \"Total de buts\". Détermine le nombre de buts le plus probable. Puis évalue: Plus de 1.5, Plus de 2.5, Moins de 3.5.",
    schemaDescription:
      "{ mostLikely: string (ex '3 buts'), over15: 'OUI'|'NON', over25: 'OUI'|'NON', under35: 'OUI'|'NON', confidence: number }",
  },
  first_goal_minute: {
    title: "Minute du premier but",
    instructions:
      "Analyse le marché \"Minute du premier but\". Détermine l'intervalle de minute le plus probable. Classe les 3 meilleurs. Utilise des intervalles standards: '1-15', '16-30', '31-45', '46-60', '61-75', '76-90'.",
    schemaDescription:
      "{ principal: string, alternative1: string, alternative2: string, confidence: number }",
  },
  multi_goals: {
    title: "Multi-buts",
    instructions:
      "Analyse le marché \"Multi-buts\". Détermine l'intervalle de buts attendu parmi: 0-1, 2-3, 4-5, 6+.",
    schemaDescription:
      "{ mostLikely: '0-1'|'2-3'|'4-5'|'6+', ranges: { \"0-1\": number (probabilité 0-100), \"2-3\": number, \"4-5\": number, \"6+\": number }, confidence: number }",
  },
  ht2_score: {
    title: "2ème Mi-temps Score Exact",
    instructions:
      "Lis toutes les cotes du marché \"2ème Mi-temps Score Exact\". Trouve les 3 scores les plus probables.",
    schemaDescription:
      "{ principal: string, alternative1: string, alternative2: string, confidence: number }",
  },
  one_x_two: {
    title: "1X2",
    instructions:
      "Analyse le marché 1X2. Compare victoire domicile (1), match nul (X), victoire extérieur (2). Détermine le résultat le plus probable, une alternative (Double Chance de préférence), la probabilité estimée.",
    schemaDescription:
      "{ principal: '1'|'X'|'2', alternative: string (ex '1X'), probability: number (0-100), confidence: number }",
  },
};

async function callAI(body: unknown): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI Gateway ${r.status}: ${t}`);
  }
  const json = await r.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  // Try to extract JSON
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response did not contain JSON: " + content);
  return JSON.parse(match[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const mode = payload.mode as "market" | "summary" | "extract_odds";

    if (mode === "extract_odds") {
      const { imageDataUrl } = payload as { imageDataUrl: string };
      if (!imageDataUrl?.startsWith("data:image/"))
        throw new Error("imageDataUrl must be a data:image/*;base64 URL");

      const systemPrompt = `Tu es un expert en lecture de cotes de paris sportifs virtuels.
Analyse la capture d'écran fournie et détecte TOUS les matchs visibles avec leurs cotes 1X2.
Pour chaque match, extrais:
- le nom de l'équipe à domicile (homeTeam)
- le nom de l'équipe à l'extérieur (awayTeam)
- la cote victoire domicile (homeOdd)
- la cote match nul (drawOdd)
- la cote victoire extérieur (awayOdd)

Règle: cote plus BASSE = probabilité plus ÉLEVÉE.
S'il n'y a qu'un seul match, retourne un tableau d'un seul élément.
S'il y en a plusieurs, retourne-les tous dans le tableau, dans l'ordre d'apparition.

Réponds UNIQUEMENT avec un objet JSON valide sans markdown, au schéma exact:
{ "matches": [ { "homeTeam": string, "awayTeam": string, "homeOdd": number, "drawOdd": number, "awayOdd": number } ] }
Les cotes doivent être des nombres décimaux (ex: 1.85, 3.40, 4.20).`;

      const userText = `Détecte tous les matchs et leurs cotes 1X2 dans cette capture. Retourne UNIQUEMENT le JSON.`;

      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (mode === "market") {
      const {
        market,
        imageDataUrl,
        homeTeam,
        awayTeam,
        leagueName,
      } = payload as {
        market: Market;
        imageDataUrl: string;
        homeTeam: string;
        awayTeam: string;
        leagueName?: string;
      };
      const cfg = MARKETS[market];
      if (!cfg) throw new Error(`Unknown market: ${market}`);
      if (!imageDataUrl?.startsWith("data:image/"))
        throw new Error("imageDataUrl must be a data:image/*;base64 URL");

      const systemPrompt = `Tu es un analyste expert de paris sportifs virtuels. Tu reçois une capture d'écran d'un marché de paris.
Analyse rigoureusement les cotes visibles. La règle: cote plus BASSE = probabilité plus ÉLEVÉE.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans balise markdown.
Schéma attendu: ${cfg.schemaDescription}
Confidence = pourcentage (0-100) de confiance dans le pronostic principal.`;

      const userText = `Match: ${homeTeam} vs ${awayTeam}${leagueName ? ` (${leagueName})` : ""}
Marché: ${cfg.title}
${cfg.instructions}
Retourne UNIQUEMENT le JSON.`;

      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      });

      return new Response(
        JSON.stringify({ market, title: cfg.title, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "summary") {
      const { homeTeam, awayTeam, leagueName, marketResults } = payload as {
        homeTeam: string;
        awayTeam: string;
        leagueName?: string;
        marketResults: Record<Market, any>;
      };

      const systemPrompt = `Tu es un analyste IA de paris sportifs virtuels. À partir des 8 analyses de marchés fournies, produis une synthèse finale cohérente.
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown), au schéma:
{
  "pronosticPrincipal": "1"|"X"|"2",
  "alternative": string (ex '1X', '12', 'X2'),
  "scoreExact": string (ex '2-1'),
  "miTemps": string (ex '1-0'),
  "htft": string (ex '1/1'),
  "totalButs": string (ex '3'),
  "premierBut": string (ex '16-30 min'),
  "multiButs": '0-1'|'2-3'|'4-5'|'6+',
  "confidence": number (0-100),
  "resume": string (1 phrase de synthèse en français)
}
Assure-toi que les valeurs soient COHÉRENTES entre elles (le score exact doit correspondre au 1X2 et au total de buts).`;

      const userText = `Match: ${homeTeam} vs ${awayTeam}${leagueName ? ` (${leagueName})` : ""}

Analyses par marché:
${JSON.stringify(marketResults, null, 2)}

Produis la synthèse JSON finale.`;

      const result = await callAI({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
      });

      return new Response(
        JSON.stringify({ summary: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("virtuel-ai-analyze error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
